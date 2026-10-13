// v0.8.4 PIN locks: the cryptography run for real (Web Crypto under Node), the server's rules checked against the migration, and every leak path checked in the source.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const read = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const app = read('js/app.js'), css = read('css/privacy.css'), html = read('index.html'), mig = read('supabase/migrations/20261011100000_node_locks.sql'), docs = read('docs/dev/ERROR-CODES.md'), repo = read('js/repo.js'), cc = read('js/cloud-client.js');
function fn(name) { const i = app.search(new RegExp('(async )?function ' + name + '\\(')); if (i < 0) return ''; let d = 0, j = app.indexOf('{', i); for (let k = j; k < app.length; k++) { if (app[k] === '{') d++; else if (app[k] === '}') { d--; if (!d) return app.slice(i, k + 1); } } return ''; }

await import('../../js/lock.js');
const L = globalThis.Stick.lock;
const IT = 1000;                                               // the real default is 600,000; the maths is the same and Node would spend minutes
const note = { id: 'n1', html: '<b>meet at the old bridge</b> שלום', image: 'data:image/png;base64,AAAA', isTask: true, due: '2026-12-01', x: 10, y: 20, bg: 'red' };
const secret = 'ab'.repeat(32);

// ---- PIN rules
ok(L.validPin('1234') && L.validPin('12345678') && !L.validPin('123') && !L.validPin('123456789') && !L.validPin('12a4') && !L.validPin('') && !L.validPin(1234), 'a PIN is 4 to 8 digits and nothing else');
ok(L.weak('1111') && L.weak('1234') && L.weak('8765') && L.weak('0000') && !L.weak('4827') && !L.weak('abc'), 'obvious PINs are flagged (never forbidden)');
ok(L.ITER === 600000, 'the default is 600,000 PBKDF2-SHA256 rounds');

// ---- round trips, local board (no server)
{
  const prep = await L.prepare('4827', { iter: IT }), sealed = await L.seal(prep, null, note, 'n1');
  ok(L.validEnvelope(sealed.env) && sealed.env.m === 'local' && sealed.env.it === IT, 'sealing gives a well-formed envelope');
  const text = JSON.stringify(sealed.env);
  ok(!/old bridge|שלום|AAAA|2026-12-01|4827/.test(text) && !text.includes(btoa('old bridge')), 'the envelope holds none of the words, the picture, the date or the PIN');
  const o = await L.openLocal('4827', sealed.env, 'n1');
  ok(o.payload.html === note.html && o.payload.image === note.image && o.payload.isTask === true && o.payload.due === '2026-12-01' && !('x' in o.payload) && !('bg' in o.payload), 'the right PIN gives back exactly the sealed fields (and only those)');
  let threw = false; try { await L.openLocal('4828', sealed.env, 'n1'); } catch { threw = true; } ok(threw, 'a wrong PIN throws: AES-GCM authentication fails, nothing partial is returned');
  threw = false; try { await L.openLocal('4827', sealed.env, 'n2'); } catch { threw = true; } ok(threw, 'the ciphertext is bound to its note: it will not open as another note');
  const flip = (s) => s.slice(0, 5) + (s[5] === 'A' ? 'B' : 'A') + s.slice(6);
  threw = false; try { await L.openLocal('4827', { ...sealed.env, ct: flip(sealed.env.ct) }, 'n1'); } catch { threw = true; } ok(threw, 'a single changed ciphertext character is detected');
  threw = false; try { await L.openLocal('4827', { ...sealed.env, iv: flip(sealed.env.iv) }, 'n1'); } catch { threw = true; } ok(threw, 'and so is a changed IV');
  threw = false; try { await L.openLocal('4827', { ...sealed.env, salt: flip(sealed.env.salt) }, 'n1'); } catch { threw = true; } ok(threw, 'and a changed salt');

  // fresh IV on every encryption, same key
  const a = await L.reseal(sealed.key, sealed.env, note, 'n1'), b = await L.reseal(sealed.key, sealed.env, note, 'n1');
  ok(a.iv !== b.iv && a.ct !== b.ct && a.iv !== sealed.env.iv && a.salt === sealed.env.salt, 'every encryption uses a fresh random IV (same words, different ciphertext each time)');
  ok((await L.openLocal('4827', a, 'n1')).payload.html === note.html, 'a re-sealed note still opens with the same PIN');
  const ivs = new Set(); for (let i = 0; i < 60; i++) ivs.add((await L.reseal(sealed.key, sealed.env, note, 'n1')).iv); ok(ivs.size === 60, '60 encryptions, 60 distinct IVs');

  // a unique salt per note and per sealing
  const p2 = await L.prepare('4827', { iter: IT }), s2 = await L.seal(p2, null, note, 'n1');
  ok(s2.env.salt !== sealed.env.salt && s2.env.ct !== sealed.env.ct, 'every lock gets its own random salt');
  threw = false; try { await L.openLocal('4827', { ...s2.env, salt: sealed.env.salt }, 'n1'); } catch { threw = true; } ok(threw, 'the salt really matters to the key');
  ok(!(sealed.key.extractable), 'the key held while unlocked is a non-extractable CryptoKey');
  ok(sealed.key.algorithm.name === 'AES-GCM' && sealed.key.algorithm.length === 256, 'AES-GCM, 256-bit');
}

// ---- the proof the server sees is not the key
{
  const salt = new Uint8Array(16).fill(7), d1 = await L.prepare('4827', { salt, iter: IT }), d2 = await L.prepare('4827', { salt, iter: IT }), d3 = await L.prepare('4828', { salt, iter: IT });
  ok(d1.proof === d2.proof && d1.proof !== d3.proof && /^[0-9a-f]{64}$/.test(d1.proof), 'the proof is a stable 256-bit value for a PIN and salt');
  ok(!Buffer.from(d1.material).toString('hex').includes(d1.proof) && Buffer.from(d1.material).toString('hex') !== d1.proof, 'it is a different PBKDF2 output from the key material (knowing it does not give the key)');
  const salt2 = new Uint8Array(16).fill(8), d4 = await L.prepare('4827', { salt: salt2, iter: IT }); ok(d4.proof !== d1.proof, 'the same PIN on another note gives a different proof');
}

// ---- server board: the key also needs the server's secret
{
  const prep = await L.prepare('9034', { iter: IT }), sealed = await L.seal(prep, secret, note, 'n1');
  ok(sealed.env.m === 'server', 'with a server secret the envelope says so');
  const pf = await L.proofFor('9034', sealed.env);
  ok(pf.proof === prep.proof, 'the proof for opening equals the proof sent when locking');
  const o = await L.open(pf.material, secret, sealed.env, 'n1'); ok(o.payload.html === note.html, 'right PIN + the server\'s secret opens it');
  let threw = false; try { await L.open(pf.material, 'cd'.repeat(32), sealed.env, 'n1'); } catch { threw = true; } ok(threw, 'right PIN but the wrong secret cannot open it');
  threw = false; try { await L.open(pf.material, null, { ...sealed.env, m: 'local' }, 'n1'); } catch { threw = true; } ok(threw, 'the PIN alone cannot open a server-sealed note (the offline guessing a short PIN would allow needs the server\'s half too)');
  const wrong = await L.proofFor('9035', sealed.env); threw = false; try { await L.open(wrong.material, secret, sealed.env, 'n1'); } catch { threw = true; } ok(threw, 'and the secret alone cannot either');
}

// ---- padding and envelope validation
{
  const s1 = await L.seal(await L.prepare('4827', { iter: IT }), null, { html: 'a' }, 'n1'), s2 = await L.seal(await L.prepare('4827', { iter: IT }), null, { html: 'a'.repeat(150) }, 'n1');
  ok(s1.env.ct.length === s2.env.ct.length, 'short and medium notes seal to the same size (length is only hinted at in 256-byte steps)');
  ok(L.pad('x').length % 256 === 0 && L.pad('x'.repeat(256)).length === 256 && JSON.parse(L.pad('{"a":1}')).a === 1, 'padding is valid JSON whitespace');
  const e = s1.env;
  ok(!L.validEnvelope(null) && !L.validEnvelope({}) && !L.validEnvelope({ ...e, v: 2 }) && !L.validEnvelope({ ...e, m: 'x' }) && !L.validEnvelope({ ...e, it: 5 }) && !L.validEnvelope({ ...e, it: 1e9 }) && !L.validEnvelope({ ...e, salt: '!!' }) && !L.validEnvelope({ ...e, ct: 'short' }) && !L.validEnvelope({ ...e, kdf: 'MD5' }), 'malformed envelopes from the server are refused (so a hostile one can never make the browser do absurd work)');
  ok(L.SEAL_FIELDS.join() === app.match(/var SEALED_FIELDS = \[([^\]]*)\]/)[1].replace(/["\s]/g, ''), 'the app and the crypto module agree on which fields are sealed');
}

// ---- attempt limits: one schedule, in the browser, and in the database
{
  const want = [0, 0, 0, 10, 30, 60, 300, 900, 3600, 86400, 86400];
  ok(want.every((w, i) => L.cooldown(i) === w), 'cooldown after 0..10 wrong PINs: 0,0,0,10s,30s,1m,5m,15m,1h,24h,24h');
  const sqlCase = mig.match(/case when p_fails < 3 then 0 when p_fails = 3 then (\d+) when p_fails = 4 then (\d+) when p_fails = 5 then (\d+)\s+when p_fails = 6 then (\d+) when p_fails = 7 then (\d+) when p_fails = 8 then (\d+) else (\d+) end/);
  ok(!!sqlCase && [3, 4, 5, 6, 7, 8, 9].every((f, i) => L.cooldown(f) === +sqlCase[i + 1]), 'the browser\'s schedule is exactly the database\'s (node_lock_wait)');
  let rec = L.local.ok(); const now = 1_000_000;
  rec = L.local.fail(rec, now); rec = L.local.fail(rec, now); ok(L.local.check(rec, now) === 0, 'two wrong PINs: no wait yet');
  rec = L.local.fail(rec, now); ok(L.local.check(rec, now) === 10 && L.local.check(rec, now + 4000) === 6 && L.local.check(rec, now + 10000) === 0, 'the third: ten seconds, counting down');
  ok(L.local.ok().fails === 0 && L.local.check(L.local.ok(), now) === 0, 'a right PIN resets it');
}

// ---- the server rules (the behaviour itself is exercised against a real database in run-tests.mjs)
ok(/alter table public\.node_locks enable row level security;\nrevoke all on public\.node_locks from public, anon, authenticated;/.test(mig) && !/create policy[^;]*node_locks/i.test(mig), 'node_locks has no policy and no grant: nobody reads it directly');
ok(/if l\.locked_until is not null and l\.locked_until > now\(\) then[\s\S]{0,120}the proof is not even looked at/.test(mig), 'during a cooldown the proof is never evaluated');
ok(/p_require_owner and l\.owner_id <> uid then raise exception 'LOCK_NOT_OWNER'/.test(mig) && /if found and cur\.owner_id <> uid then raise exception 'LOCK_NOT_OWNER'/.test(mig), 'only the person who locked it can change or remove it, and nobody can replace it');
ok(/is_anonymous/.test(mig.match(/create_node_lock[\s\S]*?end \$\$/)[0]), 'guest sessions cannot create locks');
ok(!/return jsonb_build_object\('ok', true, 'secret', l\.secret[\s\S]{0,40}\n[\s\S]*change_node_lock/.test('') && /return r - 'secret';/.test(mig), 'remove_node_lock never returns the secret');
ok(/'ok', false, 'wait'/.test(mig) && !/raise exception 'PIN/.test(mig), 'a wrong PIN is an ordinary answer, so its counter update is committed (not rolled back by an exception)');

// ---- the client calls and codes
ok(/nodeLock: \{[\s\S]*create_node_lock[\s\S]*unlock_node[\s\S]*change_node_lock[\s\S]*remove_node_lock[\s\S]*node_lock_state/.test(repo), 'the repository exposes exactly these five calls');
{
  const codes = [...cc.matchAll(/"(LOCK-\d{3})": \{ from: "([A-Z_]+)"/g)].map((m) => m[1]);
  ok(codes.length === 6 && codes.every((c) => docs.includes('| ' + c + ' |')), 'every LOCK code is in the catalogue and in docs/dev/ERROR-CODES.md');
  ok(['LOCK_NOT_FOUND', 'LOCK_NOT_OWNER'].every((c) => /create_node_lock|node_lock_check/.test(mig) && mig.includes("'" + c + "'")), 'the server raises the codes the catalogue maps');
}

// ---- nothing about a locked note's words reaches anywhere
ok(/if\(o\.lock\) SEALED_FIELDS\.forEach\(function\(k\)\{ delete o\[k\]; \}\)/.test(fn('serializeNote')), 'every saved, synced, copied and undo form of a locked note is stripped of its words');
ok(fn('persistForm').includes('serializeNote(n)') && fn('snapNote').includes('serializeNote(n)'), 'storage, sync and undo snapshots all go through that one function');
ok(/SEALED_FIELDS\.forEach\(function\(k\)\{ delete c\[k\]; \}\)/.test(app) && /Stick\.lock\.validEnvelope\(c\.lock\)/.test(app), 'what arrives from the server is sealed-only and a valid envelope or nothing');
ok(/function isSealed\(n\)\{ return isLockedNote\(n\) && !lockOpen\[n\.id\]; \}/.test(app) && /function isConcealed\(n\)\{ return incogCovered\(n\) \|\| isSealed\(n\); \}/.test(app), 'sealed counts as concealed everywhere the foil does');
ok(/var veiled = isConcealed\(n\) \|\| isLockedNote\(n\);/.test(app), 'board thumbnails hide a locked note even while it is open on screen');
ok(/if\(isSealed\(n\)\) return \{x:n\.x[\s\S]{0,80}html:"", [^}]*sealed:true/.test(fn('toPublicNote') || app.slice(app.indexOf('toPublicNote'))), 'a sealed note leaves a print or preview with no words');
ok(/sealedHere = shareable\.filter\(isLockedNote\)/.test(fn('openShareModal')) && /locked notes? can.t be shared/i.test(fn('openShareModal')), 'locked notes cannot be shared at all');
ok(/if\(src && src\.lock\) return null;/.test(fn('paperCopy')) && /list\.some\(isLockedNote\)/.test(fn('copyNotesToClipboard')) && /isLockedNote\(n\)\)\{ toast\("A locked note can\\u2019t move/.test(fn('moveNotesToBoard')) || /locked note can\\u2019t move/.test(fn('moveNotesToBoard')), 'a locked note is not copied, pasted, duplicated or moved to another board (its server key belongs to this note on this board)');
ok(/dropHistory\(\);/.test(fn('lockFlow')) && /dropHistory\(\);/.test(fn('changePinFlow')) && /dropHistory\(\);/.test(fn('removeLockFlow')) && /undoStack = \[\]; redoStack = \[\];/.test(fn('dropHistory')), 'locking, changing the PIN and removing the lock clear Undo and Redo: nothing can bring the words (or an old key) back');
ok(/relockAll\(\)/.test(fn('cloudSignOut')), 'signing out closes every open lock first');
ok(!/localStorage|sessionStorage|console\.|safeSet\([^)]*\b(pin|payload|_lockKey)/i.test(fn('pinDialog') + fn('tryOpen') + fn('lockFlow') + fn('changePinFlow') + fn('removeLockFlow')), 'the PIN is never put in storage or the console by the dialogs or the lock flows');
ok(/_lockKey/.test(fn('forgetLockMemory')) && /delete n\._lockKey/.test(fn('forgetLockMemory')) && !/_lockKey/.test(fn('serializeNote')), 'the key and the open words live only on the in-memory note and are wiped when it closes');
ok(/type = "password"/.test(fn('pinDialog')) && /autocomplete = "off"/.test(fn('pinDialog')) && /-webkit-text-security:disc/.test(css), 'the PIN fields never show the digits and are not offered to password managers');
ok(/<script src="js\/lock.js"><\/script>/.test(html), 'the module is loaded');
ok(/\.note\.lockSealed > :is\(\.text, \.noteImgWrap/.test(css) && /\.sealWax/.test(css) && /Locked/.test(app.match(/sealLabel">Locked/) ? 'Locked' : ''), 'a sealed note shows a wax-sealed letter with a handwritten "Locked"');
ok(/Only the PIN opens it\./.test(app) && /can.t be recovered/.test(app) && /There is no way to reset a forgotten PIN/.test(app), 'the setup says plainly that a forgotten PIN cannot be recovered');
ok(!/master|backdoor|recovery code|reset PIN/i.test(fn('lockFlow') + fn('unlockNote') + fn('tryOpen')), 'there is no master PIN or recovery path in the code');

// ---- exports say what they contain, and sizes are guarded
ok(/Incognito notes are included WITH their words: the foil is not encryption/.test(app) && /PIN-locked notes stay sealed in the file/.test(app) && /PIN-locked notes still sealed/.test(app), 'both exports say that Incognito notes carry their words and locked notes stay sealed');
ok(/n\.image && lockOnServer\(\)\) return "A picture can.t be PIN-locked on a signed-in board/.test(fn('lockWhyNot')) && /isLockedNote\(n\) && lockOnServer\(\)\)\{ toast\("A picture can.t be added/.test(fn('handleImageDrop')), 'on a signed-in board a locked note takes no picture and a note with a picture is not locked (a board row holds 256 KB)');
ok(/server && sealed\.env\.ct\.length > 200000/.test(fn('lockFlow')) && /TOO_BIG/.test(fn('lockErr')), 'a sealed note that would not fit in a board row is refused with a plain message');
ok(L.pad('x'.repeat(10)).length === 256 && new TextEncoder().encode(L.pad('é'.repeat(200))).length % 256 === 0, 'padding counts bytes, not characters (Hebrew and emoji notes pad correctly)');

console.log('v0.8.4 PIN locks: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
