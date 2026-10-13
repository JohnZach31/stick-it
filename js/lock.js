/* Stick-It PIN locks: the cryptography for a sealed note (v0.8.4). Pure Web Crypto; no DOM, so it runs the same in the browser and under Node (the tests).
 *
 * WHAT IS PROTECTED. A locked note's words (and its picture, if it carries one inline) are turned into one AES-GCM ciphertext before they are saved, synced or
 * shared. The key is made from the PIN with PBKDF2-SHA256 (600,000 rounds, a fresh random salt per note) and, on a signed-in board, from a random secret that
 * only the server holds and releases for a correct PIN proof, a few wrong guesses at a time (supabase/migrations/20261011100000_node_locks.sql).
 * Every encryption uses a fresh random 96-bit IV. The PIN, the key and the plaintext are never written anywhere: the key lives in memory as a non-extractable
 * CryptoKey only while the note is unlocked.
 *
 * WHAT IS NOT PROTECTED (docs/dev/LOCKED-NOTES.md says all of it): a 4-8 digit PIN has at most 100 million values. Encryption alone therefore only slows
 * guessing down. The server-held secret closes that for everyone who is not the database operator; on a guest/local board (no server) the only brake is the
 * PBKDF2 cost and a per-device attempt delay, which anyone with the stored data can bypass. There is no recovery: a forgotten PIN means the words are gone.
 *
 * Envelope (what is stored in note.lock, base64url throughout):
 *   {v:1, m:"server"|"local", kdf:"PBKDF2-SHA256", it:600000, salt, iv, ct}
 * Payload (what is sealed): the sensitive fields of the note, as JSON, padded with spaces to a multiple of 256 bytes (so the stored size only hints at the length).
 */
(function(root){
  "use strict";
  var Stick = root.Stick = root.Stick || {};
  var subtle = function(){ var c = root.crypto || (typeof globalThis !== "undefined" && globalThis.crypto); if(!c || !c.subtle) throw new Error("NO_CRYPTO"); return c; };
  var ITER = 600000, PAD = 256, VERSION = 1;
  var te = new TextEncoder(), td = new TextDecoder();

  // the fields of a plain note that are sealed. Everything else (position, colour, font, size, id, rotation, reactions, pin, zone membership) stays readable:
  // it is layout, and the board needs it to draw the sealed note where it belongs.
  var SEAL_FIELDS = ["html", "image", "imgW", "imgRatio", "imgSize", "imgFit", "imgMode", "halftone", "isTask", "done", "due", "dueTime", "doneAt", "doneBy"];

  // ---------- encoding ----------
  function b64u(bytes){ var s = "", a = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes); for(var i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function unb64u(str){ var s = String(str).replace(/-/g, "+").replace(/_/g, "/"); while(s.length % 4) s += "="; var bin = atob(s), a = new Uint8Array(bin.length); for(var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function hex(bytes){ var a = new Uint8Array(bytes), s = ""; for(var i = 0; i < a.length; i++) s += (a[i] < 16 ? "0" : "") + a[i].toString(16); return s; }
  function unhex(h){ var a = new Uint8Array(h.length / 2); for(var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; }
  function rand(n){ return subtle().getRandomValues(new Uint8Array(n)); }

  // ---------- the PIN ----------
  var PIN_RE = /^\d{4,8}$/;
  function validPin(p){ return typeof p === "string" && PIN_RE.test(p); }
  // not forbidden, just flagged in the dialog: all one digit, a run (1234, 8765) or a short list of the usual suspects
  var COMMON = ["0000", "1111", "1212", "1234", "2000", "2580", "4321", "6969", "1004", "7777", "12345", "123456", "1234567", "12345678", "00000000", "11223344", "123123", "654321", "112233", "696969"];
  function weak(p){
    if(!validPin(p)) return false;
    if(/^(\d)\1+$/.test(p) || COMMON.indexOf(p) !== -1) return true;
    var up = true, down = true; for(var i = 1; i < p.length; i++){ if(+p[i] !== +p[i - 1] + 1) up = false; if(+p[i] !== +p[i - 1] - 1) down = false; }
    return up || down;
  }

  // ---------- attempts: the same schedule as node_lock_wait() in the migration ----------
  var WAITS = [0, 0, 0, 10, 30, 60, 300, 900, 3600];                  // seconds to wait after the n-th wrong PIN in a row; 9 or more: a day
  function cooldown(fails){ fails = Math.max(0, Math.floor(Number(fails) || 0)); return fails < WAITS.length ? WAITS[fails] : 86400; }
  // a device-only limiter, for boards with no server (never claimed to be a defence against someone who holds the stored data)
  var local = {
    check: function(rec, now){ now = now || Date.now(); return rec && rec.until > now ? Math.ceil((rec.until - now) / 1000) : 0; },
    fail: function(rec, now){ now = now || Date.now(); var f = (rec && rec.fails || 0) + 1, w = cooldown(f); return {fails: f, until: w ? now + w * 1000 : 0}; },
    ok: function(){ return {fails: 0, until: 0}; }
  };

  // ---------- key derivation ----------
  // One PBKDF2 run gives 64 bytes: the first 32 are key material that never leaves the browser, the last 32 are the "proof" sent to the server (hex).
  // Knowing the proof does not give the key material (they are different outputs of the PRF), and the server only keeps a hash of it.
  async function derive(pin, saltBytes, iter){
    if(!validPin(pin)) throw new Error("BAD_PIN");
    var c = subtle(), base = await c.subtle.importKey("raw", te.encode(pin), "PBKDF2", false, ["deriveBits"]);
    var bits = new Uint8Array(await c.subtle.deriveBits({name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: iter || ITER}, base, 512));
    return {material: bits.slice(0, 32), proof: hex(bits.slice(32))};
  }
  // the AES key: HKDF over the PIN material and (on a server board) the server's secret, so neither ingredient alone is enough
  async function contentKey(material, secretHex, mode){
    var c = subtle(), sec = secretHex ? unhex(secretHex) : new Uint8Array(0), ikm = new Uint8Array(material.length + sec.length);
    ikm.set(material, 0); ikm.set(sec, material.length);
    var base = await c.subtle.importKey("raw", ikm, "HKDF", false, ["deriveKey"]);
    return c.subtle.deriveKey({name: "HKDF", hash: "SHA-256", salt: te.encode("stickit-lock-v1"), info: te.encode("note-seal|" + (mode || "local"))}, base, {name: "AES-GCM", length: 256}, false, ["encrypt", "decrypt"]);
  }

  // ---------- sealing ----------
  function aadFor(nodeId){ return te.encode("stickit-lock-v1|" + String(nodeId)); }          // binds the ciphertext to its note: it cannot be moved onto another note
  function pad(json){ var n = te.encode(json).length, extra = (PAD - (n % PAD)) % PAD; return json + " ".repeat(extra); }
  function pick(note){ var o = {}; SEAL_FIELDS.forEach(function(k){ if(note[k] !== undefined && note[k] !== null && note[k] !== "") o[k] = note[k]; }); return o; }
  // encrypt a payload with an existing key: a fresh IV every single time
  async function encrypt(key, payload, nodeId){
    var iv = rand(12), c = subtle(), data = te.encode(pad(JSON.stringify(payload)));
    var ct = new Uint8Array(await c.subtle.encrypt({name: "AES-GCM", iv: iv, additionalData: aadFor(nodeId), tagLength: 128}, key, data));
    return {iv: b64u(iv), ct: b64u(ct)};
  }
  async function decrypt(key, env, nodeId){
    var c = subtle(), pt = await c.subtle.decrypt({name: "AES-GCM", iv: unb64u(env.iv), additionalData: aadFor(nodeId), tagLength: 128}, key, unb64u(env.ct));
    return JSON.parse(td.decode(pt));
  }
  function validEnvelope(e){
    return !!e && typeof e === "object" && e.v === VERSION && (e.m === "server" || e.m === "local") && e.kdf === "PBKDF2-SHA256" && Number.isInteger(e.it) && e.it >= 1000 && e.it <= 5000000
      && typeof e.salt === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(e.salt) && typeof e.iv === "string" && /^[A-Za-z0-9_-]{16,24}$/.test(e.iv)
      && typeof e.ct === "string" && /^[A-Za-z0-9_-]{22,}$/.test(e.ct) && e.ct.length <= 4000000;
  }
  // first-time seal for a PIN: returns the envelope, the in-memory key and the proof for the server (the server, when there is one, has already given `secretHex`
  // for THIS proof; so on a server board call prepare() first, send proof to create_node_lock, then finish with the returned secret)
  async function prepare(pin, opts){
    opts = opts || {}; var salt = opts.salt || rand(16), it = opts.iter || ITER, d = await derive(pin, salt, it);
    return {salt: salt, it: it, material: d.material, proof: d.proof};
  }
  async function seal(prep, secretHex, note, nodeId){
    var mode = secretHex ? "server" : "local", key = await contentKey(prep.material, secretHex, mode), enc = await encrypt(key, pick(note), nodeId);
    return {env: {v: VERSION, m: mode, kdf: "PBKDF2-SHA256", it: prep.it, salt: b64u(prep.salt), iv: enc.iv, ct: enc.ct}, key: key};
  }
  // re-encrypt after an edit: same key, fresh IV
  async function reseal(key, env, note, nodeId){
    var enc = await encrypt(key, pick(note), nodeId);
    return {v: env.v, m: env.m, kdf: env.kdf, it: env.it, salt: env.salt, iv: enc.iv, ct: enc.ct};
  }
  // step 1 of opening: the proof for this envelope (what the server is asked to check)
  async function proofFor(pin, env){ if(!validEnvelope(env)) throw new Error("BAD_ENVELOPE"); var d = await derive(pin, unb64u(env.salt), env.it); return {proof: d.proof, material: d.material}; }
  // step 2: with the server's secret (or none on a local board) make the key and read the note. A wrong key or a damaged envelope throws.
  async function open(material, secretHex, env, nodeId){
    var key = await contentKey(material, secretHex, env.m), payload = await decrypt(key, env, nodeId);
    return {payload: payload, key: key};
  }
  // everything in one go for a local board
  async function openLocal(pin, env, nodeId){ var p = await proofFor(pin, env); return open(p.material, null, env, nodeId); }

  Stick.lock = {
    VERSION: VERSION, ITER: ITER, PIN_RE: PIN_RE, SEAL_FIELDS: SEAL_FIELDS, WAITS: WAITS,
    validPin: validPin, weak: weak, cooldown: cooldown, local: local, validEnvelope: validEnvelope,
    prepare: prepare, seal: seal, reseal: reseal, proofFor: proofFor, open: open, openLocal: openLocal, decryptWith: decrypt, pick: pick, pad: pad,
    _b64u: b64u, _unb64u: unb64u
  };
})(typeof window !== "undefined" ? window : globalThis);
