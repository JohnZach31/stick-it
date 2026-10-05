/* The physical-scrap object types: receipt, ticket, postcard, photo strip.
 * Pure data rules (no DOM): which fields each has, how text is cleaned, sizes, labels, and what text a search or a share
 * message should see. The app (index.html's js/app.js) draws them; this file is unit-tested under Node.
 *
 * Every text field is PLAIN text, always put on the page with textContent. Nothing here is ever treated as HTML.
 */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  var O = Stick.objects = {};

  O.KINDS = ["receipt", "ticket", "postcard", "photo_strip", "shopping", "newspaper", "clipping"];       // "shopping" is a list, its rules live in js/shopping.js
  O.isKind = function (t) { return O.KINDS.indexOf(t) !== -1; };

  var VARIANTS = {
    receipt: ["clean", "faded", "torn", "folded"],
    ticket: ["perforated", "rounded", "vintage", "stub"],
    postcard: ["classic", "airmail", "modern"],
    photo_strip: ["vertical", "film"],
    newspaper: ["broadsheet", "tabloid", "gazette", "evening", "telegraph", "courier", "herald", "modern"],
    clipping: ["web", "newspaper", "book"]
  };
  O.VARIANTS = VARIANTS;
  O.VARIANT_NAMES = {
    clean: "Clean thermal", faded: "Faded", torn: "Torn bottom", folded: "Fold crease",
    perforated: "Perforated", rounded: "Rounded", vintage: "Vintage", stub: "Event stub",
    classic: "Classic", airmail: "Airmail", modern: "Modern",
    vertical: "White strip", film: "Instant film",
    broadsheet: "Broadsheet", tabloid: "Tabloid", gazette: "Gazette", evening: "Evening paper", telegraph: "Telegraph", courier: "Typewritten", herald: "Herald", modern: "Modern",
    web: "Web clipping", book: "Book page"
  };
  O.LABELS = { receipt: "receipt", ticket: "ticket", postcard: "postcard", photo_strip: "photo strip", shopping: "shopping list", newspaper: "newspaper", clipping: "clipping" };
  O.STRIP_MIN = 2; O.STRIP_MAX = 6;
  O.WIDTH = { receipt: [170, 360, 260], ticket: [190, 480, 330], postcard: [220, 520, 320], photo_strip: [90, 460, 140], shopping: [230, 420, 290], newspaper: [220, 460, 310], clipping: [190, 420, 260] };

  // ---------------------------------------------------------------- text cleaning
  var CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f‪-‮⁦-⁩]/g;   // control characters and bidi overrides (text spoofing)
  function lines(v, maxChars, maxLines) {
    var t = String(v == null ? "" : v).replace(/\r\n?/g, "\n").replace(CONTROL, "").slice(0, maxChars).split("\n").slice(0, maxLines || 12);
    return t.map(function (l) { return l.replace(/[ \t]+$/g, ""); }).join("\n").replace(/^\n+|\n+$/g, "");
  }
  function one(v, max) { return String(v == null ? "" : v).replace(CONTROL, "").replace(/\s+/g, " ").trim().slice(0, max); }
  // a link a clipping may point to: http(s) only, no credentials, no markup. Anything else is not stored.
  function safeUrl(v) {
    v = String(v == null ? "" : v).trim();
    if (!v || v.length > 500 || /[\s<>"'\\]/.test(v)) return "";
    try { var u = new URL(v); return (u.protocol === "https:" || u.protocol === "http:") && !u.username && !u.password ? u.href : ""; } catch (e) { return ""; }
  }
  function domainOf(v) { var u = safeUrl(v); if (!u) return ""; try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return ""; } }
  O.clean = { lines: lines, one: one, url: safeUrl, domain: domainOf };
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
    if (t === "shopping") return Stick.shopping ? Stick.shopping.normalize(item, h) : null;
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
    } else if (t === "newspaper") {
      out.headline = one(item.headline, 100); out.sub = one(item.sub, 80); out.body = lines(item.body, 900, 18);
    } else if (t === "clipping") {
      out.quote = lines(item.quote, 900, 14); out.sourceTitle = one(item.sourceTitle, 100); out.sourceUrl = safeUrl(item.sourceUrl);
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
    if (o.type === "shopping") return Stick.shopping ? Stick.shopping.text(o) : "";
    var parts;
    if (o.type === "receipt") parts = [o.title, o.date, o.body, o.amount];
    else if (o.type === "ticket") parts = [o.title, o.dateTime, o.place, o.details];
    else if (o.type === "newspaper") parts = [o.headline, o.sub, o.body];
    else if (o.type === "clipping") parts = [o.quote, o.sourceTitle, domainOf(o.sourceUrl)];
    else if (o.type === "postcard") parts = [o.location, o.message, o.recipient];
    else if (o.type === "photo_strip") parts = [o.caption].concat((o.frames || []).map(function (f) { return f.cap; }));
    else parts = [];
    return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  };
  O.label = function (o) {
    if (o && o.type === "shopping") return Stick.shopping ? Stick.shopping.label(o) : "shopping list";
    var l = O.LABELS[o && o.type] || "object", t = o && (o.title || o.location || o.caption || o.headline || o.sourceTitle);
    return t ? l + ": " + t : l;
  };
  O.hasContent = function (o) {
    if (!o) return false;
    if (o.type === "photo_strip") return !!(o.frames && o.frames.length >= O.STRIP_MIN);
    if (o.type === "postcard") return !!(o.image || o.assetId || O.text(o));
    return true;
  };
  O.countAssets = function (o) { return o && o.type === "photo_strip" ? (o.frames || []).filter(function (f) { return f.assetId || f.image; }).length : (o && o.assetId ? 1 : 0); };

  // playful, generic sample lines for a new receipt (never anyone's real data). Edit or delete them straight away.
  O.SAMPLE_RECEIPTS = [
    { title: "Corner Cafe", body: "Coffee 3.50\nCroissant 2.80\nOat milk 0.60", amount: "6.90" },
    { title: "Fresh Bakery", body: "Bread 2.20\nRolls x4 3.00\nJam 2.40", amount: "7.60" },
    { title: "Hardware Hut", body: "Batteries 4.50\nTape 1.90\nScrews 2.30", amount: "8.70" },
    { title: "City Rail", body: "Train ticket 5.50\nSeat reservation 1.50", amount: "7.00" },
    { title: "Late Show Cinema", body: "Film 9.00\nPopcorn 4.00\nSoda 2.50", amount: "15.50" },
    { title: "Paper & Pen", body: "Notebook 3.80\nGel pens x3 4.50\nStickers 1.20", amount: "9.50" },
    { title: "Green Market", body: "Apples 3.10\nLemons 1.60\nHerbs 1.00", amount: "5.70" },
    { title: "Pizza Night", body: "Margherita 8.00\nGarlic bread 3.00\nLemonade 2.20", amount: "13.20" },
    { title: "Book Nook", body: "Paperback 7.50\nBookmark 0.90", amount: "8.40" },
    { title: "Laundry Lane", body: "Wash 4.00\nDry 3.00\nSoap 1.00", amount: "8.00" }
  ];
  O.sampleReceipt = function (rnd) { var l = O.SAMPLE_RECEIPTS; var r = l[Math.floor(((typeof rnd === "function" ? rnd() : Math.random()) % 1) * l.length)] || l[0]; return { title: r.title, body: r.body, amount: r.amount }; };
  O.randomVariant = function (kind, rnd) { var v = VARIANTS[kind] || []; return v[Math.floor(((typeof rnd === "function" ? rnd() : Math.random()) % 1) * v.length)] || (v[0] || ""); };

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
    if (t === "shopping" && Stick.shopping) return Stick.shopping.sizeEstimate(o);
    if (t === "receipt") { var n = ((o.body || "").split("\n").length || 1); return { w: w, h: Math.round(96 + n * 20 + (o.amount ? 28 : 0) + (o.variant === "torn" ? 14 : 0)) }; }
    if (t === "newspaper") { var nl = Math.max(1, Math.ceil(((o.body || "").length || 60) / Math.max(18, w / 8.5))); return { w: w, h: Math.round(96 + (o.sub ? 20 : 0) + nl * 17) }; }
    if (t === "clipping") { var ql = Math.max(2, Math.ceil(((o.quote || "").length || 60) / Math.max(16, w / 9))); return { w: w, h: Math.round(74 + ql * 21) }; }
    if (t === "ticket") return o.orient === "portrait" ? { w: w, h: Math.round(w * 1.55) } : { w: w, h: Math.round(w * 0.46) };
    if (t === "postcard") return { w: w, h: Math.round(w * (o.imgRatio || 0.667)) + 8 };
    if (t === "photo_strip") { var f = (o.frames || []).length || 3; return o.variant === "film" ? { w: w, h: Math.round(w / f * 0.9 + 44) } : { w: w, h: Math.round(f * (w * 0.78) + 40) }; }
    return { w: w, h: 120 };
  };
})(typeof window !== "undefined" ? window : globalThis);
