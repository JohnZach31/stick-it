/* Print layout planning (no DOM, testable under Node). Given the size and place of the objects someone chose to print, decide how to set them on paper:
 *   single   one object, centred, enlarged so it is readable (never past 2.4x), or at natural size across pages if it is taller than a page
 *   spatial  several objects whose arrangement fits one page: the same relative layout, scaled to the page
 *   flow     several objects that would make a mostly blank or absurdly large page: a compact reading-order flow (top to bottom in bands, left to right in a band),
 *            each object kept whole on a page where it can be
 * Sizes are CSS pixels; PAGE is a conservative A4 / Letter content area after margins. */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  var P = Stick.printLayout = {};
  P.PAGE = { w: 680, h: 940 };
  P.MAX_UP = 2.4;           // a lone small note is enlarged at most this much
  P.MIN_SPATIAL = 0.55;     // below this scale the arrangement is not worth keeping: flow instead
  P.BAND = 140;             // objects whose tops are within this many px read as one row

  function rotBox(it) {
    var a = Math.abs((it.rot || 0) * Math.PI / 180), w = it.w || 1, h = it.h || 1;
    return { w: w * Math.cos(a) + h * Math.sin(a), h: w * Math.sin(a) + h * Math.cos(a) };
  }
  P.rotBox = rotBox;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  // items: [{x, y, w, h, rot}] in board px (w/h = the object's own size). Returns the plan; the caller sets the DOM from it.
  P.plan = function (items, page) {
    page = page || P.PAGE; var n = items.length;
    if (!n) return { mode: "none", scale: 1, boxes: [], width: 0, height: 0 };
    var rb = items.map(rotBox);
    if (n === 1) {
      var tall = rb[0].h > page.h * 0.95, s = tall ? Math.min(1, page.w / rb[0].w) : clamp(Math.min(page.w * 0.7 / rb[0].w, page.h * 0.8 / rb[0].h, P.MAX_UP), 0.5, P.MAX_UP);
      return { mode: "single", scale: s, spans: tall && rb[0].h * s > page.h, boxes: [{ index: 0, left: 0, top: 0, scale: s }], width: Math.round(rb[0].w * s), height: Math.round(rb[0].h * s) };
    }
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    items.forEach(function (it, i) { var x = it.x || 0, y = it.y || 0; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x + rb[i].w); maxY = Math.max(maxY, y + rb[i].h); });
    var W = maxX - minX, H = maxY - minY, s2 = Math.min(1.5, page.w / W, page.h / H);
    if (s2 >= P.MIN_SPATIAL) {
      return { mode: "spatial", scale: s2, boxes: items.map(function (it, i) { return { index: i, left: ((it.x || 0) - minX) * s2, top: ((it.y || 0) - minY) * s2, scale: s2 }; }), width: Math.ceil(W * s2), height: Math.ceil(H * s2) };
    }
    var order = items.map(function (it, i) { return i; }).sort(function (a, b) { return (items[a].y || 0) - (items[b].y || 0); }), bands = [];
    order.forEach(function (i) { var b = bands[bands.length - 1]; if (b && (items[i].y || 0) - b.y0 <= P.BAND) b.list.push(i); else bands.push({ y0: items[i].y || 0, list: [i] }); });
    var flat = []; bands.forEach(function (b) { b.list.sort(function (p, q) { return (items[p].x || 0) - (items[q].x || 0); }); flat = flat.concat(b.list); });
    return { mode: "flow", scale: 1, order: flat, boxes: flat.map(function (i) { var sc = Math.min(1, page.w / rb[i].w); return { index: i, scale: sc, width: Math.ceil(rb[i].w * sc), height: Math.ceil(rb[i].h * sc), whole: rb[i].h * sc <= page.h }; }), width: page.w, height: 0 };
  };
})(typeof window !== "undefined" ? window : globalThis);
