/* The physical-scrap object types: receipt, ticket, postcard, photo strip.
 * Pure data rules (no DOM): which fields each has, how text is cleaned, sizes, labels, and what text a search or a share
 * message should see. The app (index.html's js/app.js) draws them; this file is unit-tested under Node.
 *
 * Every text field is PLAIN text, always put on the page with textContent. Nothing here is ever treated as HTML.
 */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  var O = Stick.objects = {};

  O.KINDS = ["receipt", "ticket", "postcard", "photo_strip"];
  O.isKind = function (t) { return O.KINDS.indexOf(t) !== -1; };

  var VARIANTS = {
    receipt: ["clean", "faded", "torn", "folded"],
    ticket: ["perforated", "rounded", "vintage", "stub"],
    postcard: ["classic", "airmail", "modern"],
    photo_strip: ["vertical", "film"]
  };
  O.VARIANTS = VARIANTS;
  O.VARIANT_NAMES = {
    clean: "Clean thermal", faded: "Faded", torn: "Torn bottom", folded: "Fold crease",
    perforated: "Perforated", rounded: "Rounded", vintage: "Vintage", stub: "Event stub",
    classic: "Classic", airmail: "Airmail", modern: "Modern",
    vertical: "White strip", film: "Instant film"
  };
  O.LABELS = { receipt: "receipt", ticket: "ticket", postcard: "postcard", photo_strip: "photo strip" };
  O.STRIP_MIN = 2; O.STRIP_MAX = 6;
  O.WIDTH = { receipt: [170, 360, 230], ticket: [190, 480, 330], postcard: [220, 520, 320], photo_strip: [90, 460, 140] };

  // ---------------------------------------------------------------- text cleaning
  var CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f‪-‮⁦-⁩]/g;   // control characters and bidi overrides (text spoofing)
  function lines(v, maxChars, maxLines) {
    var t = String(v == null ? "" : v).replace(/\r\n?/g, "\n").replace(CONTROL, "").slice(0, maxChars).split("\n").slice(0, maxLines || 12);
    return t.map(function (l) { return l.replace(/[ \t]+$/g, ""); }).join("\n").replace(/^\n+|\n+$/g, "");
  }
  function one(v, max) { return String(v == null ? "" : v).replace(CONTROL, "").replace(/\s+/g, " ").trim().slice(0, max); }
  O.clean = { lines: lines, one: one };
  function num(v, lo, hi, d) { v = Number(v); return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; }
  function pick(v, list, d) { return list.indexOf(v) !== -1 ? v : d; }
  function uuid(v) { return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? v.toLowerCase() : null; }

  O.defaultW = function (kindOrObj) { var k = typeof kindOrObj === "string" ? kindOrObj : kindOrObj && kindOrObj.type, r = O.WIDTH[k]; return r ? (k === "ticket" && kindOrObj.orient === "portrait" ? 200 : k === "photo_strip" && kindOrObj.style === "film" ? 380 : r[2]) : 220; };

  // ---------------------------------------------------------------- the clean model of one object
  // h = {safeImage(src)->src|null, fontOk(name)->bool}  (provided by the app; images are the app's business)
  O.normalize = function (item, h) {
    item = item || {}; h = h || {};
    var t = item.type;
    if (!O.isKind(t)) return null;
    var out = { type: t };
    var rng = O.WIDTH[t];
    out.w = Math.round(num(item.w, rng[0], rng[1], rng[2]));
    out.variant = pick(item.variant, VARIANTS[t], VARIANTS[t][0]);
    if (t === "receipt") {
      out.title = one(item.title, 60); out.date = one(item.date, 24); out.body = lines(item.body, 600, 14); out.amount = one(item.amount, 16);
    } else if (t === "ticket") {
      out.title = one(item.title, 60); out.dateTime = one(item.dateTime, 40); out.place = one(item.place, 60); out.details = lines(item.details, 160, 4);
      out.orient = pick(item.orient, ["landscape", "portrait"], "landscape");
      if (!item.w) out.w = out.orient === "portrait" ? 200 : rng[2];
    } else if (t === "postcard") {
      out.location = one(item.location, 40); out.message = lines(item.message, 300, 8); out.recipient = one(item.recipient, 40);
      out.font = h.fontOk && h.fontOk(item.font) ? item.font : undefined;
      out.imgRatio = num(item.imgRatio, 0.4, 2.5, 0.667);
      if (item.image) { var im = h.safeImage ? h.safeImage(item.image) : null; if (im) out.image = im; }
      var pa = uuid(item.assetId); if (pa) out.assetId = pa;
    } else if (t === "photo_strip") {
      out.caption = one(item.caption, 80);
      out.font = h.fontOk && h.fontOk(item.font) ? item.font : undefined;
      out.frames = (Array.isArray(item.frames) ? item.frames : []).slice(0, O.STRIP_MAX).map(function (f) {
        f = f || {};
        var fr = {};
        var im2 = f.image && h.safeImage ? h.safeImage(f.image) : null; if (im2) fr.image = im2;
        var a = uuid(f.assetId); if (a) fr.assetId = a;
        if (f.ratio != null) fr.ratio = num(f.ratio, 0.3, 3, 0.75);
        if (f.cap) fr.cap = one(f.cap, 40);
        return (fr.image || fr.assetId) ? fr : null;
      }).filter(Boolean);
      if (out.frames.length < O.STRIP_MIN) return null;
    }
    if (out.variant === VARIANTS[t][0] && t !== "photo_strip") { /* default variant is stored too: it keeps the look stable if defaults ever change */ }
    return out;
  };

  // Objects coming from the server (or a share): same field rules, but never any media bytes, and unknown fields are dropped.
  O.sanitize = function (o, h) {
    var c = O.normalize(Object.assign({}, o, { image: null, frames: (o.frames || []).map(function (f) { return { assetId: f && f.assetId, ratio: f && f.ratio, cap: f && f.cap }; }) }), h);
    if (!c) return null;
    c.id = o.id; c.x = o.x; c.y = o.y; c.z = o.z; c.rot = o.rot;
    if (o.mediaState !== undefined) c.mediaState = o.mediaState;
    return c;
  };

  // ---------------------------------------------------------------- derived facts
  O.text = function (o) {
    if (!o) return "";
    var parts;
    if (o.type === "receipt") parts = [o.title, o.date, o.body, o.amount];
    else if (o.type === "ticket") parts = [o.title, o.dateTime, o.place, o.details];
    else if (o.type === "postcard") parts = [o.location, o.message, o.recipient];
    else if (o.type === "photo_strip") parts = [o.caption].concat((o.frames || []).map(function (f) { return f.cap; }));
    else parts = [];
    return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  };
  O.label = function (o) {
    var l = O.LABELS[o && o.type] || "object", t = o && (o.title || o.location || o.caption);
    return t ? l + ": " + t : l;
  };
  O.hasContent = function (o) {
    if (!o) return false;
    if (o.type === "photo_strip") return !!(o.frames && o.frames.length >= O.STRIP_MIN);
    if (o.type === "postcard") return !!(o.image || o.assetId || O.text(o));
    return true;
  };
  O.countAssets = function (o) { return o && o.type === "photo_strip" ? (o.frames || []).filter(function (f) { return f.assetId || f.image; }).length : (o && o.assetId ? 1 : 0); };

  // decorative serial digits for a ticket/receipt: derived from the id, never scannable, never a real code
  O.serial = function (id, n) {
    var h = 2166136261, s = String(id || "x"), out = "";
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    for (var k = 0; k < (n || 10); k++) { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; out += String(h >>> 24).slice(-1); }
    return out;
  };

  // rough height for layout code before the element exists (minimap, arrange)
  O.sizeEstimate = function (o) {
    var w = (o && o.w) || O.defaultW(o && o.type), t = o && o.type;
    if (t === "receipt") { var n = ((o.body || "").split("\n").length || 1); return { w: w, h: Math.round(96 + n * 20 + (o.amount ? 28 : 0) + (o.variant === "torn" ? 14 : 0)) }; }
    if (t === "ticket") return o.orient === "portrait" ? { w: w, h: Math.round(w * 1.55) } : { w: w, h: Math.round(w * 0.46) };
    if (t === "postcard") return { w: w, h: Math.round(w * (o.imgRatio || 0.667)) + 8 };
    if (t === "photo_strip") { var f = (o.frames || []).length || 3; return o.variant === "film" ? { w: w, h: Math.round(w / f * 0.9 + 44) } : { w: w, h: Math.round(f * (w * 0.78) + 40) }; }
    return { w: w, h: 120 };
  };
})(typeof window !== "undefined" ? window : globalThis);
