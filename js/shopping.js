/* Shopping List: the pure rules (no DOM), so they can be tested under Node.
 *
 * One node for every kind of "things to buy": groceries, an electric toothbrush, souvenirs from Athens. The base is just
 *   [ ] Item
 * and everything else is optional, per list, and only shows on an item that actually has a value.
 *
 * A list (Stick.objects kind "shopping") looks like:
 *   { type, w, title, fields:["qty","price"], cur:"EUR", createdFromPreset:"trip", items:[ {id,t,c,ct,u,q,n,p,l,g} ] }
 * An item:
 *   id  string, unique inside the list           t  the words (required, plain text, <= 120)
 *   c   0 = to buy, 1 = in the cart              ct when it went into the cart (ms), null while it is to buy
 *   u   when this item last changed (ms)         (kept on every item so a later live merge can work item by item)
 *   q   quantity text ("2", "500 g")             n  a short note       p  price in MINOR units (4990 = 49.90), never a float
 *   l   link (http/https only)                   g  a free tag
 *
 * Ticking an item is NOT the same as marking the whole list Done. The list's Done state belongs to the board, not to this file.
 */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  var S = Stick.shopping = {};

  S.MAX_ITEMS = 100;
  S.LIMITS = { title: 60, text: 120, note: 120, qty: 24, tag: 24, link: 300, price: 99999999 };
  S.FIELDS = ["qty", "note", "price", "link", "tag"];
  S.FIELD_KEY = { qty: "q", note: "n", price: "p", link: "l", tag: "g" };
  S.FIELD_LABEL = { qty: "Quantity", note: "Subtext", price: "Price", link: "Link", tag: "Tag" };          // "note" is stored as n; people see it as a line of subtext under the item
  S.WIDTH = [230, 460, 340];                 // min, max, default (a little roomier than before: prices, quantities and right-to-left rows need the space)
  S.PAPER_MAX_H = 400;                       // the item area scrolls after this

  // A preset only chooses which optional fields start switched on. It is a creation template, never a different kind of list.
  S.PRESETS = {
    blank: { label: "Blank", fields: [], title: "" },
    groceries: { label: "Groceries", fields: ["qty"], title: "Groceries" },
    trip: { label: "Trip / shopping abroad", fields: ["price", "link", "note"], title: "Shopping" }
  };

  S.CURRENCIES = [["ILS", "₪", "Israeli shekel"], ["EUR", "€", "Euro"], ["USD", "$", "US dollar"], ["GBP", "£", "Pound sterling"],
    ["CAD", "$", "Canadian dollar"], ["AUD", "$", "Australian dollar"], ["CHF", "CHF", "Swiss franc"], ["JPY", "¥", "Japanese yen"], ["TRY", "₺", "Turkish lira"]];
  var CUR_OK = {}; S.CURRENCIES.forEach(function (c) { CUR_OK[c[0]] = 1; });

  var CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f‪-‮⁦-⁩]/g;      // control characters and bidi overrides
  function one(v, max) { return String(v == null ? "" : v).replace(CONTROL, "").replace(/\s+/g, " ").trim().slice(0, max); }
  function num(v, lo, hi, d) { v = Number(v); return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; }

  // ---------------------------------------------------------------- currency
  var EURO = "AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MC MT NL PT SI SK SM VA AD ME XK".split(" ");
  // The device's guess for a new list: the region of the browser language, else the time zone. Only a suggestion; each list can change it.
  S.defaultCurrency = function (lang, tz) {
    var m = /[-_]([A-Za-z]{2})\b/.exec(String(lang || "")), region = m ? m[1].toUpperCase() : "";
    if (!region) {
      var z = String(tz || "");
      if (/^Asia\/(Jerusalem|Tel_Aviv)$/.test(z)) region = "IL";
      else if (/^Europe\/(London|Belfast|Jersey|Guernsey|Isle_of_Man)$/.test(z)) region = "GB";
      else if (/^Europe\/(Zurich|Vaduz)$/.test(z)) region = "CH";
      else if (/^Europe\/(Istanbul)$/.test(z)) region = "TR";
      else if (/^Asia\/Tokyo$/.test(z)) region = "JP";
      else if (/^Australia\//.test(z)) region = "AU";
      else if (/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina)$/.test(z)) region = "CA";
      else if (/^Europe\/(Athens|Berlin|Paris|Madrid|Rome|Amsterdam|Brussels|Vienna|Lisbon|Dublin|Helsinki|Tallinn|Riga|Vilnius|Luxembourg|Malta|Bratislava|Ljubljana|Zagreb|Nicosia)$/.test(z)) region = "DE";
      else if (/^America\//.test(z)) region = "US";
    }
    if (region === "IL") return "ILS";
    if (region === "GB" || region === "UK") return "GBP";
    if (region === "CH" || region === "LI") return "CHF";
    if (region === "JP") return "JPY";
    if (region === "TR") return "TRY";
    if (region === "CA") return "CAD";
    if (region === "AU") return "AUD";
    if (EURO.indexOf(region) !== -1) return "EUR";
    return "USD";
  };
  S.validCurrency = function (c) { return typeof c === "string" && !!CUR_OK[c]; };

  // how many digits after the point this currency has (yen: none), so "minor units" are always whole numbers
  S.minorDigits = function (cur) {
    try { var d = new Intl.NumberFormat("en", { style: "currency", currency: cur }).resolvedOptions().maximumFractionDigits; return d === 0 ? 0 : d; } catch (e) { return cur === "JPY" ? 0 : 2; }
  };
  // 4990 + EUR -> "€49.90" in the reader's own number style
  S.formatPrice = function (minor, cur, locale) {
    if (minor == null || !isFinite(minor)) return "";
    var d = S.minorDigits(cur), v = minor / Math.pow(10, d);
    try { return new Intl.NumberFormat(locale || undefined, { style: "currency", currency: cur, minimumFractionDigits: d, maximumFractionDigits: d }).format(v); }
    catch (e) { return (cur || "") + " " + v.toFixed(d); }
  };
  // what a person types -> whole minor units, or null when it is not a price. Accepts 2.5, 2,50, 1,234.50, 1.234,50, "€3", "3 ₪".
  S.parsePrice = function (text, cur) {
    var d = S.minorDigits(cur), t = String(text == null ? "" : text).replace(/[^\d.,]/g, "");
    if (!/\d/.test(t)) return null;
    var lastDot = t.lastIndexOf("."), lastComma = t.lastIndexOf(","), sep = Math.max(lastDot, lastComma), intPart, frac = "";
    if (sep === -1) intPart = t;
    else {
      var after = t.slice(sep + 1), other = lastDot > lastComma ? "," : ".", both = t.indexOf(other) !== -1, many = (t.split(t.charAt(sep)).length - 1) > 1;
      var isDecimal = !many && (both || (after.length >= 1 && after.length <= Math.max(d, 1) && d > 0) || (d > 0 && after.length !== 3));
      if (d === 0) isDecimal = false;
      if (isDecimal) { intPart = t.slice(0, sep); frac = after; } else intPart = t;
    }
    intPart = intPart.replace(/[.,]/g, ""); frac = frac.replace(/[.,]/g, "");
    if (!/^\d*$/.test(intPart) || !/^\d*$/.test(frac)) return null;
    while (frac.length < d) frac += "0";
    frac = frac.slice(0, d);
    var minor = parseInt((intPart || "0") + frac, 10);
    if (!isFinite(minor) || minor < 0 || minor > S.LIMITS.price) return null;
    return minor;
  };

  // ---------------------------------------------------------------- items
  function id4() { return "i" + Math.random().toString(36).slice(2, 7) + Date.now().toString(36).slice(-3); }
  S.newItem = function (text, now) {
    var t = now || Date.now();
    return { id: id4(), t: one(text, S.LIMITS.text), c: 0, ct: null, u: t };
  };
  function cleanItem(it, now, safeHref) {
    if (!it || typeof it !== "object") return null;
    var o = { id: /^[\w-]{1,24}$/.test(String(it.id || "")) ? String(it.id) : id4(), t: one(it.t, S.LIMITS.text) };
    if (it.d === 1 || it.d === true) { o.c = 0; o.ct = null; o.u = num(it.u, 0, 1e14, now); o.d = 1; return o; }          // a divider: a label on a rule, never ticked, priced or counted
    o.c = it.c === 1 || it.c === true ? 1 : 0;
    o.ct = o.c === 1 ? (num(it.ct, 0, 1e14, now) || now) : null;          // the pick-up time exists only while the item is in the cart
    o.u = num(it.u, 0, 1e14, now);
    var q = one(it.q, S.LIMITS.qty); if (q) o.q = q;
    var n = one(it.n, S.LIMITS.note); if (n) o.n = n;
    var g = one(it.g, S.LIMITS.tag); if (g) o.g = g;
    if (it.p != null && it.p !== "") {
      var p = Number(it.p);
      if (isFinite(p) && p >= 0 && p <= S.LIMITS.price) o.p = Math.round(p);          // whole minor units, never a fraction
    }
    var l = it.l ? String(it.l).replace(CONTROL, "").trim().slice(0, S.LIMITS.link) : "";
    if (l) { var safe = safeHref ? safeHref(l) : (/^https?:\/\//i.test(l) ? l : ""); if (safe) o.l = safe; }
    return o;
  }

  // helpers = {safeHref(url) -> url|null, locale, tz}. Always returns a clean list; never null for type "shopping".
  S.normalize = function (item, h) {
    item = item || {}; h = h || {};
    if (item.type !== "shopping") return null;
    var now = Date.now(), out = { type: "shopping" };
    out.w = Math.round(num(item.w, S.WIDTH[0], S.WIDTH[1], S.WIDTH[2]));
    out.title = one(item.title, S.LIMITS.title);
    var f = Array.isArray(item.fields) ? item.fields : [], seen = {};
    out.fields = S.FIELDS.filter(function (k) { return f.indexOf(k) !== -1 && !seen[k] && (seen[k] = 1); });
    out.cur = S.validCurrency(item.cur) ? item.cur : S.defaultCurrency(h.locale, h.tz);
    if (typeof item.createdFromPreset === "string" && S.PRESETS[item.createdFromPreset]) out.createdFromPreset = item.createdFromPreset;
    var ids = {};
    out.items = (Array.isArray(item.items) ? item.items : []).slice(0, S.MAX_ITEMS).map(function (it) { return cleanItem(it, now, h.safeHref); }).filter(function (it) {
      if (!it || (!it.t && !it.q && !it.n && it.p == null && !it.l && !it.g)) return false;               // an item with nothing in it is not kept
      if (ids[it.id]) it.id = id4();
      ids[it.id] = 1; return true;
    });
    return out;
  };
  S.sanitize = function (o, h) {
    var c = S.normalize(Object.assign({}, o), h);
    if (!c) return null;
    c.id = o.id; c.x = o.x; c.y = o.y; c.z = o.z; c.rot = o.rot;
    return c;
  };

  // ---------------------------------------------------------------- derived facts
  S.counts = function (items) {
    var toBuy = 0, inCart = 0;
    (items || []).forEach(function (it) { if (it.d === 1) return; if (it.c === 1) inCart++; else toBuy++; });
    return { toBuy: toBuy, inCart: inCart, all: toBuy + inCart, allPicked: toBuy === 0 && inCart > 0 };
  };
  // the line under the title: "7 to buy · 3 in cart", "7 in cart · All picked ✓", "Nothing to buy yet"
  S.summary = function (items) {
    var c = S.counts(items);
    if (!c.all) return "Nothing to buy yet";
    if (c.allPicked) return c.inCart + " in cart · All picked ✓";
    return c.toBuy + " to buy" + (c.inCart ? " · " + c.inCart + " in cart" : "");
  };
  // prices are summed as entered: no multiplying by the free-text quantity
  S.totals = function (items) {
    var all = 0, cart = 0, priced = 0;
    (items || []).forEach(function (it) { if (it.p != null) { priced++; all += it.p; if (it.c === 1) cart += it.p; } });
    return { all: all, cart: cart, priced: priced };
  };
  S.toBuyItems = function (items) { return (items || []).filter(function (it) { return it.c !== 1; }); };
  // the cart section is ordered by when things were picked up
  S.cartItems = function (items) {
    return (items || []).filter(function (it) { return it.c === 1; }).map(function (it, i) { return { it: it, i: i }; })
      .sort(function (a, b) { return (a.it.ct || 0) - (b.it.ct || 0) || a.i - b.i; }).map(function (x) { return x.it; });
  };

  // ---------------------------------------------------------------- the changes a list can go through (each returns a NEW items array)
  function touch(it, now) { it.u = now; return it; }
  S.add = function (items, text, now) {
    if ((items || []).length >= S.MAX_ITEMS) return null;
    return items.concat([S.newItem(text, now)]);
  };
  S.setCart = function (items, id, inCart, now) {
    now = now || Date.now();
    return items.map(function (it) {
      if (it.id !== id) return it;
      var c = Object.assign({}, it);
      c.c = inCart ? 1 : 0; c.ct = inCart ? now : null;              // check: a fresh time; uncheck: cleared; check again: another fresh time
      return touch(c, now);
    });
  };
  S.update = function (items, id, patch, now) {
    now = now || Date.now();
    return items.map(function (it) {
      if (it.id !== id) return it;
      var c = Object.assign({}, it, patch);
      Object.keys(patch || {}).forEach(function (k) { if (patch[k] === undefined || patch[k] === null) delete c[k]; });
      return touch(c, now);
    });
  };
  // a divider is an item with d:1 whose text is its label (it may be empty: then it is just a rule)
  S.addDivider = function (items, label, now) {
    if ((items || []).length >= S.MAX_ITEMS) return null;
    var it = S.newItem(label, now); it.d = 1; return items.concat([it]);
  };
  S.remove = function (items, id) { return items.filter(function (it) { return it.id !== id; }); };
  S.clearBought = function (items) { return items.filter(function (it) { return it.c !== 1; }); };
  S.boughtCount = function (items) { return (items || []).filter(function (it) { return it.c === 1; }).length; };

  // ---------------------------------------------------------------- for search, sharing, export, the Done pile
  S.text = function (o) {
    if (!o) return "";
    var parts = [o.title];
    (o.items || []).forEach(function (it) {
      if (it.d === 1) { if (it.t) parts.push("\u2014 " + it.t + " \u2014"); return; }
      var bits = [it.t]; if (it.q) bits.push("×" + it.q);
      if (it.p != null) bits.push(S.formatPrice(it.p, o.cur));
      if (it.n) bits.push("(" + it.n + ")"); if (it.g) bits.push("#" + it.g);
      parts.push(bits.join(" ") + (it.c === 1 ? " [x]" : ""));
    });
    return parts.filter(Boolean).join(", ").replace(/\s+/g, " ").trim();
  };
  // Text direction from the first strong letter (any right-to-left script: Hebrew, Arabic, Persian, Syriac, Thaana, N'Ko, Adlam, ...; everything else with letters is left-to-right).
  // Returns "rtl", "ltr", or null when there is no letter to decide on. New languages need no change here.
  var RTL_CH = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF\u{10800}-\u{10FFF}\u{1E800}-\u{1EFFF}]/u, LETTER = /\p{L}/u;
  S.textDir = function (s) {
    var str = String(s == null ? "" : s);
    for (var ch of str) { if (RTL_CH.test(ch)) return "rtl"; if (LETTER.test(ch)) return "ltr"; }
    return null;
  };
  // the direction of the whole list: whichever script most of its words (title included) are written in
  S.listDir = function (o) {
    var rtl = 0, ltr = 0, count = function (t) { var d = S.textDir(t); if (d === "rtl") rtl++; else if (d === "ltr") ltr++; };
    if (!o) return "ltr"; count(o.title); (o.items || []).forEach(function (it) { count(it.t); });
    if (rtl !== ltr) return rtl > ltr ? "rtl" : "ltr";
    return S.textDir(o.title) || "ltr";          // a tie goes to the title
  };
  // ---- quantities: "30 g", "2 L", "500 מ״ל", "3". Stored as the text the person chose (so a Hebrew list keeps its Hebrew unit); shown as a number and a unit.
  // parseQty splits a leading number (1, 2.5, 2,5, 1/2) from the rest; anything else is shown as plain text.
  S.parseQty = function (q) {
    var s = String(q == null ? "" : q).trim(), m = /^(\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?)\s*(.*)$/.exec(s);
    if (!m) return { n: "", u: s, plain: !!s };
    return { n: m[1].replace(/\s+/g, ""), u: m[2].trim(), plain: false };
  };
  S.joinQty = function (n, u) { n = String(n == null ? "" : n).replace(/\s+/g, "").slice(0, 10); u = String(u == null ? "" : u).replace(/\s+/g, " ").trim(); return one((n + (n && u ? " " : "") + u), S.LIMITS.qty); };
  // unit suggestions (a datalist: any text is still allowed). The set follows the script the list is written in; Latin units are always offered too.
  var UNIT_SETS = {
    he: ["\u05d2\u05e8\u05dd", "\u05e7\u05f4\u05d2", "\u05de\u05f4\u05dc", "\u05dc\u05d9\u05d8\u05e8", "\u05d9\u05d7\u05f3", "\u05d7\u05d1\u05d9\u05dc\u05d4", "\u05d1\u05e7\u05d1\u05d5\u05e7", "\u05e9\u05e7\u05d9\u05ea"],
    ar: ["\u063a", "\u0643\u063a", "\u0645\u0644", "\u0644\u062a\u0631", "\u0642\u0637\u0639\u0629", "\u0639\u0644\u0628\u0629", "\u0632\u062c\u0627\u062c\u0629"],
    latin: ["g", "kg", "ml", "L", "pcs", "pack", "bottle", "can", "box", "bag", "oz", "lb"]
  };
  S.unitSuggestions = function (sample) {
    var t = String(sample || ""), set = /[\u0590-\u05FF]/.test(t) ? "he" : /[\u0600-\u06FF\u0750-\u077F]/.test(t) ? "ar" : null;
    return (set ? UNIT_SETS[set] : []).concat(UNIT_SETS.latin);
  };
  S.label = function (o) { return o && o.title ? "Shopping list: " + o.title : "Shopping list"; };
  S.sizeEstimate = function (o) {
    var w = (o && o.w) || S.WIDTH[2], n = ((o && o.items) || []).length, rows = Math.min(n || 1, 12);
    return { w: w, h: Math.round(Math.min(S.PAPER_MAX_H, 74 + rows * 30) + 70) };
  };
})(typeof window !== "undefined" ? window : globalThis);
