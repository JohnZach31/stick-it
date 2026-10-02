/* Physical finishing for cutouts: the thin white scissor contour of a sticker, or the same cutout glued onto a scrap of card.
 * Everything is drawn on a canvas from the cutout's own alpha, so the contour follows the real subject (people, dogs, buildings).
 *
 *   Stick.sticker.compose(source, {mode: "sticker"|"mounted", material, seed}) -> Promise<{blob, url, ratio, w, h}>
 *
 * `source` is an image URL (blob:/data:) of the transparent cutout. Results are cached by the caller.
 */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  var S = Stick.sticker = {};
  var doc = root.document;

  S.MATERIALS = [
    { id: "cardboard", name: "Light cardboard" },
    { id: "kraft", name: "Kraft cardboard" },
    { id: "paper", name: "White paper" },
    { id: "notebook", name: "Notebook paper" },
    { id: "graph", name: "Graph paper" }
  ];
  S.materialName = function (id) { for (var i = 0; i < S.MATERIALS.length; i++) if (S.MATERIALS[i].id === id) return S.MATERIALS[i].name; return S.MATERIALS[0].name; };
  S.isMaterial = function (id) { return S.MATERIALS.some(function (m) { return m.id === id; }); };

  function rngFrom(seed) {                       // small seeded generator so a given object always looks the same
    var s = (seed >>> 0) || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function hashStr(str) { var h = 2166136261; str = String(str); for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  S.hashStr = hashStr;
  function canvas(w, h) { var c = doc.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

  function loadImage(url) {
    return new Promise(function (resolve, reject) {
      var img = new root.Image();
      if (/^https?:/i.test(url)) img.crossOrigin = "anonymous";       // a signed storage URL: needs CORS so the canvas can be read (storage sends it); otherwise the plain cutout is shown
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("IMAGE_DECODE_FAILED")); };
      img.src = url;
    });
  }

  // The cutout's silhouette grown by r pixels, with a slightly wavering edge (a pair of scissors never cuts a perfect circle).
  function dilate(img, W, H, M, r, seed) {
    var sil = canvas(img.naturalWidth, img.naturalHeight), sx = sil.getContext("2d");
    sx.drawImage(img, 0, 0); sx.globalCompositeOperation = "source-in"; sx.fillStyle = "#fff"; sx.fillRect(0, 0, sil.width, sil.height);
    var out = canvas(W, H), ox = out.getContext("2d"), rng = rngFrom(seed), ph1 = rng() * 6.28, ph2 = rng() * 6.28, ph3 = rng() * 6.28;
    var N = 40;
    for (var ring = 1; ring <= 3; ring++) {
      for (var k = 0; k < N; k++) {
        var a = (k / N) * 6.2832, wob = 0.88 + 0.12 * Math.sin(a * 2 + ph1) + 0.06 * Math.sin(a * 5 + ph2) + 0.05 * Math.sin(a * 9 + ph3), rr = r * (ring / 3) * wob;
        ox.drawImage(sil, M + Math.cos(a) * rr, M + Math.sin(a) * rr);
      }
    }
    ox.drawImage(sil, M, M);
    return out;
  }

  // soften a hard silhouette into a clean, rounded cut (blur then threshold on the alpha channel)
  function smooth(cv, radius) {
    var cx = cv.getContext("2d"), w = cv.width, h = cv.height, img = cx.getImageData(0, 0, w, h), d = img.data, n = w * h, a = new Float32Array(n), i;
    for (i = 0; i < n; i++) a[i] = d[i * 4 + 3] / 255;
    var b = Stick.cutout.math.boxBlur(a, w, h, radius);
    for (i = 0; i < n; i++) { var v = Math.min(1, Math.max(0, (b[i] - 0.35) / 0.3)); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255; d[i * 4 + 3] = Math.round(v * v * (3 - 2 * v) * 255); }
    cx.putImageData(img, 0, 0);
    return cv;
  }

  function fiberNoise(ctx, w, h, rng, color, count, len, alpha) {
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(0.6, w / 900);
    for (var i = 0; i < count; i++) {
      var x = rng() * w, y = rng() * h, a = rng() * 6.28, l = len * (0.4 + rng());
      ctx.globalAlpha = alpha * (0.4 + rng() * 0.6);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // restrained paper and card textures, drawn procedurally (no image files, nothing to download)
  function paintMaterial(ctx, w, h, material, rng) {
    var u = Math.max(w, h) / 1000;
    function base(c1, c2) { var g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
    if (material === "kraft") {
      base("#b78d5c", "#a37b4c");
      fiberNoise(ctx, w, h, rng, "#6f4d28", 1800, 22 * u + 6, 0.16); fiberNoise(ctx, w, h, rng, "#d9b98a", 900, 26 * u + 6, 0.14);
    } else if (material === "paper") {
      base("#f7f4ea", "#ece7d8"); fiberNoise(ctx, w, h, rng, "#b9b09a", 500, 12 * u + 4, 0.1);
    } else if (material === "notebook") {
      base("#fbf8ec", "#f1ecdb");
      var gap = 34 * u + 14, y;
      ctx.strokeStyle = "rgba(92,134,184,0.45)"; ctx.lineWidth = Math.max(1, 1.6 * u);
      for (y = gap; y < h; y += gap) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      ctx.strokeStyle = "rgba(200,92,92,0.5)"; ctx.beginPath(); ctx.moveTo(w * 0.14, 0); ctx.lineTo(w * 0.14, h); ctx.stroke();
      fiberNoise(ctx, w, h, rng, "#b9b09a", 300, 12 * u + 4, 0.08);
    } else if (material === "graph") {
      base("#f6f4e8", "#ebe8d6");
      var step = 22 * u + 10, x2;
      ctx.strokeStyle = "rgba(96,140,120,0.32)"; ctx.lineWidth = Math.max(0.8, 1.2 * u);
      for (x2 = step; x2 < w; x2 += step) { ctx.beginPath(); ctx.moveTo(x2, 0); ctx.lineTo(x2, h); ctx.stroke(); }
      for (y = step; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      fiberNoise(ctx, w, h, rng, "#b9b09a", 250, 12 * u + 4, 0.07);
    } else {                                                   // light cardboard
      base("#d6c19a", "#c9b389");
      fiberNoise(ctx, w, h, rng, "#8a6b3c", 1500, 20 * u + 6, 0.13); fiberNoise(ctx, w, h, rng, "#efe0bf", 700, 24 * u + 6, 0.16);
    }
    var sh = ctx.createLinearGradient(0, 0, w * 0.4, h);                // a hint of light falling across the card
    sh.addColorStop(0, "rgba(255,255,255,0.16)"); sh.addColorStop(1, "rgba(0,0,0,0.07)"); ctx.fillStyle = sh; ctx.fillRect(0, 0, w, h);
  }

  S.compose = function (source, opts) {
    opts = opts || {};
    var mode = opts.mode === "mounted" ? "mounted" : "sticker", seed = opts.seed == null ? 1 : opts.seed;
    var border = opts.border === "none" || opts.border === "medium" ? opts.border : "thin", bf = border === "medium" ? 2.1 : 1;       // the white scissor border: none | thin (default) | medium
    return loadImage(source).then(function (img) {
      var iw = img.naturalWidth, ih = img.naturalHeight, big = Math.max(iw, ih);
      var r = mode === "mounted" ? Math.max(8, big * 0.075) : border === "none" ? 0 : Math.max(2.5, big * 0.013 * bf);
      var M = Math.ceil(r * 1.25) + 3, W = iw + 2 * M, H = ih + 2 * M, cv = canvas(W, H), cx = cv.getContext("2d");
      var rng = rngFrom(hashStr(seed + "|" + (opts.material || "")));
      if (mode === "mounted") {
        var back = smooth(dilate(img, W, H, M, r, hashStr(seed + "b")), Math.max(2, Math.round(r * 0.35)));
        var tex = canvas(W, H); paintMaterial(tex.getContext("2d"), W, H, S.isMaterial(opts.material) ? opts.material : "cardboard", rng);
        var tx = tex.getContext("2d"); tx.globalCompositeOperation = "destination-in"; tx.drawImage(back, 0, 0);
        cx.drawImage(tex, 0, 0);
        cx.globalCompositeOperation = "source-atop"; cx.strokeStyle = "rgba(0,0,0,0.0)";
        cx.globalCompositeOperation = "source-over";
        if (border !== "none") {
          var rim = smooth(dilate(img, W, H, M, Math.max(2.5, big * 0.011 * bf), hashStr(seed + "s")), 2);       // thin white scissor line round the print itself
          var rx = rim.getContext("2d"); rx.globalCompositeOperation = "source-in"; rx.fillStyle = "#fdfcf8"; rx.fillRect(0, 0, W, H);
          cx.drawImage(rim, 0, 0);
        }
      } else if (border !== "none") {
        var edge = smooth(dilate(img, W, H, M, r, hashStr(seed + "e")), Math.max(1, Math.round(r * 0.3)));
        var ex = edge.getContext("2d"); ex.globalCompositeOperation = "source-in"; ex.fillStyle = "#fdfcf8"; ex.fillRect(0, 0, W, H);
        cx.drawImage(edge, 0, 0);
      }
      cx.drawImage(img, M, M);
      return new Promise(function (resolve, reject) {
        cv.toBlob(function (blob) {
          if (!blob) return reject(new Error("ENCODE_FAILED"));
          resolve({ blob: blob, url: root.URL.createObjectURL(blob), ratio: H / W, w: W, h: H });
        }, "image/png");
      });
    });
  };
})(typeof window !== "undefined" ? window : globalThis);
