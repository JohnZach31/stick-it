/* Stick-It cutout engine: real subject/background removal that runs ON THE DEVICE.
 *
 *   photo -> small U²-Net family model (ONNX, WebAssembly) -> probability map
 *         -> guided filter against the full-resolution photo (edges snap to real edges)
 *         -> clean-up (stray blobs, tiny holes) -> alpha mask
 *
 * The photo never leaves the browser, there is no provider, no API key and nothing to rate-limit. The model files are
 * served from this site (assets/models/*) and fetched only when someone actually makes a cutout.
 *
 * The pure maths (blur, guided filter, resize, components, refine) has no DOM dependency and is unit-tested under Node.
 * Classic script; attaches to window.Stick.cutout.
 */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  var C = Stick.cutout = {};

  // ================================================================== pure maths
  var M = C.math = {};

  M.clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };

  // separable box blur with edge-normalised windows (so borders do not darken). src: Float32Array(w*h). returns a new array.
  M.boxBlur = function (src, w, h, r) {
    r = Math.max(0, Math.round(r));
    if (r === 0) return Float32Array.from(src);
    var tmp = new Float32Array(w * h), out = new Float32Array(w * h), x, y, i, acc, n;
    for (y = 0; y < h; y++) {                                       // horizontal running sum
      var row = y * w; acc = 0; n = 0;
      for (x = 0; x <= Math.min(r, w - 1); x++) { acc += src[row + x]; n++; }
      for (x = 0; x < w; x++) {
        tmp[row + x] = acc / n;
        var addX = x + r + 1, subX = x - r;
        if (addX < w) { acc += src[row + addX]; n++; }
        if (subX >= 0) { acc -= src[row + subX]; n--; }
      }
    }
    for (x = 0; x < w; x++) {                                       // vertical running sum
      acc = 0; n = 0;
      for (y = 0; y <= Math.min(r, h - 1); y++) { acc += tmp[y * w + x]; n++; }
      for (y = 0; y < h; y++) {
        out[y * w + x] = acc / n;
        var addY = y + r + 1, subY = y - r;
        if (addY < h) { acc += tmp[addY * w + x]; n++; }
        if (subY >= 0) { acc -= tmp[subY * w + x]; n--; }
      }
    }
    return out;
  };

  // bilinear resize of a single-channel float map
  M.resizeBilinear = function (src, sw, sh, dw, dh) {
    var out = new Float32Array(dw * dh), xr = sw / dw, yr = sh / dh;
    for (var y = 0; y < dh; y++) {
      var fy = Math.max(0, (y + 0.5) * yr - 0.5), y0 = Math.min(sh - 1, Math.floor(fy)), y1 = Math.min(sh - 1, y0 + 1), wy = fy - y0;
      for (var x = 0; x < dw; x++) {
        var fx = Math.max(0, (x + 0.5) * xr - 0.5), x0 = Math.min(sw - 1, Math.floor(fx)), x1 = Math.min(sw - 1, x0 + 1), wx = fx - x0;
        var a = src[y0 * sw + x0], b = src[y0 * sw + x1], c = src[y1 * sw + x0], d = src[y1 * sw + x1];
        out[y * dw + x] = (a * (1 - wx) + b * wx) * (1 - wy) + (c * (1 - wx) + d * wx) * wy;
      }
    }
    return out;
  };

  // He et al. guided filter: p (the rough mask) is re-fitted so that it follows the edges of `guide` (the photo's luminance)
  M.guidedFilter = function (guide, p, w, h, r, eps) {
    var n = w * h, ip = new Float32Array(n), ii = new Float32Array(n), i;
    for (i = 0; i < n; i++) { ip[i] = guide[i] * p[i]; ii[i] = guide[i] * guide[i]; }
    var mI = M.boxBlur(guide, w, h, r), mP = M.boxBlur(p, w, h, r), mIP = M.boxBlur(ip, w, h, r), mII = M.boxBlur(ii, w, h, r);
    var a = new Float32Array(n), b = new Float32Array(n);
    for (i = 0; i < n; i++) {
      var cov = mIP[i] - mI[i] * mP[i], vr = mII[i] - mI[i] * mI[i];
      a[i] = cov / (vr + eps); b[i] = mP[i] - a[i] * mI[i];
    }
    var mA = M.boxBlur(a, w, h, r), mB = M.boxBlur(b, w, h, r), q = new Float32Array(n);
    for (i = 0; i < n; i++) q[i] = mA[i] * guide[i] + mB[i];
    return q;
  };

  // Connected components of (mask > thr) on a coarse grid. Keeps components whose area is at least keepFrac of the largest
  // and fills small holes (background pockets smaller than holeFrac of the kept area). Works in place on alpha (Uint8Array).
  M.cleanMask = function (alpha, w, h, opts) {
    opts = opts || {};
    var f = Math.max(1, opts.grid || 4), keepFrac = opts.keepFrac == null ? 0.04 : opts.keepFrac, holeFrac = opts.holeFrac == null ? 0.004 : opts.holeFrac;
    var conf = opts.conf || null, holeConf = opts.holeConf == null ? 0.3 : opts.holeConf;     // conf: the model's own probability per pixel (0..1)
    var gw = Math.ceil(w / f), gh = Math.ceil(h / f), g = new Uint8Array(gw * gh), x, y, i;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (alpha[y * w + x] > 127) g[((y / f) | 0) * gw + ((x / f) | 0)] = 1;
    function label(want) {                       // label components of cells == want; returns {lab, sizes}
      var lab = new Int32Array(gw * gh), sizes = [0], next = 1, q = new Int32Array(gw * gh);
      for (var s = 0; s < gw * gh; s++) {
        if (g[s] !== want || lab[s]) continue;
        var qh = 0, qt = 0, cnt = 0; q[qt++] = s; lab[s] = next;
        while (qh < qt) {
          var c = q[qh++]; cnt++;
          var cx = c % gw, cy = (c / gw) | 0, nb;
          if (cx > 0 && g[nb = c - 1] === want && !lab[nb]) { lab[nb] = next; q[qt++] = nb; }
          if (cx < gw - 1 && g[nb = c + 1] === want && !lab[nb]) { lab[nb] = next; q[qt++] = nb; }
          if (cy > 0 && g[nb = c - gw] === want && !lab[nb]) { lab[nb] = next; q[qt++] = nb; }
          if (cy < gh - 1 && g[nb = c + gw] === want && !lab[nb]) { lab[nb] = next; q[qt++] = nb; }
        }
        sizes[next] = cnt; next++;
      }
      return { lab: lab, sizes: sizes };
    }
    var fg = label(1), big = 0;
    for (i = 1; i < fg.sizes.length; i++) if (fg.sizes[i] > big) big = fg.sizes[i];
    if (big === 0) return alpha;
    var keep = new Uint8Array(fg.sizes.length), keptArea = 0;
    for (i = 1; i < fg.sizes.length; i++) if (fg.sizes[i] >= big * keepFrac) { keep[i] = 1; keptArea += fg.sizes[i]; }
    // background pockets: components of 0-cells that never touch the border and are small
    var bg = label(0), touches = new Uint8Array(bg.sizes.length);
    for (x = 0; x < gw; x++) { touches[bg.lab[x]] = 1; touches[bg.lab[(gh - 1) * gw + x]] = 1; }
    for (y = 0; y < gh; y++) { touches[bg.lab[y * gw]] = 1; touches[bg.lab[y * gw + gw - 1]] = 1; }
    var fill = new Uint8Array(bg.sizes.length);
    var confSum = null;
    if (conf) {                                  // a pocket the model itself still half-believes in is an accident; one it is sure about is a real gap (a lattice, an arch, a handle)
      confSum = new Float64Array(bg.sizes.length);
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) { var cc = ((y / f) | 0) * gw + ((x / f) | 0); if (g[cc] === 0) confSum[bg.lab[cc]] += conf[y * w + x]; }
    }
    for (i = 1; i < bg.sizes.length; i++) {
      if (touches[i] || bg.sizes[i] > keptArea * holeFrac) continue;
      if (confSum && confSum[i] / (bg.sizes[i] * f * f) < holeConf) continue;
      fill[i] = 1;
    }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var c2 = ((y / f) | 0) * gw + ((x / f) | 0), k = y * w + x;
      if (g[c2] === 1) { if (!keep[fg.lab[c2]]) alpha[k] = 0; }
      else if (fill[bg.lab[c2]]) alpha[k] = 255;
    }
    return alpha;
  };

  // "Edge refine": soft 0..1 feathers the edge, trim -1..1 pulls it in (negative) or pushes it out (positive).
  M.refineAlpha = function (alpha, w, h, soft, trim, smooth) {
    soft = M.clamp01(soft || 0); trim = Math.max(-1, Math.min(1, trim || 0)); smooth = M.clamp01(smooth || 0);
    if (soft === 0 && trim === 0) return smooth ? M.antialias(Uint8Array.from(alpha), w, h, smooth) : Uint8Array.from(alpha);
    var n = w * h, a = new Float32Array(n), i, scale = Math.max(w, h) / 1000;
    for (i = 0; i < n; i++) a[i] = alpha[i] / 255;
    var r = Math.max(1, Math.round((soft * 5 + Math.abs(trim) * 4) * scale));
    var b = M.boxBlur(a, w, h, r), t = 0.5 - trim * 0.28, half = 0.05 + soft * 0.4, out = new Uint8Array(n);
    for (i = 0; i < n; i++) {
      var v = M.clamp01((b[i] - (t - half)) / (2 * half));
      out[i] = Math.round(v * v * (3 - 2 * v) * 255);
    }
    return smooth ? M.antialias(out, w, h, smooth) : out;
  };

  // Subtle anti-aliasing of the edge: a 3x3 average on edge pixels that belong to a SOLID area only. Thin structure (a lattice bar,
  // a whisker, a strand of hair) is left exactly as it was, so detail is never washed out. strength 0..1.
  M.antialias = function (alpha, w, h, strength) {
    strength = M.clamp01(strength == null ? 0.6 : strength);
    var n = w * h, a = new Float32Array(n), i;
    if (strength === 0) return alpha;
    for (i = 0; i < n; i++) a[i] = alpha[i] / 255;
    var b1 = M.boxBlur(a, w, h, 1), thick = M.boxBlur(a, w, h, Math.max(2, Math.round(Math.max(w, h) / 220)));
    var out = new Uint8Array(alpha);
    for (i = 0; i < n; i++) {
      var d = b1[i] - a[i];
      if (d === 0 || thick[i] < 0.34 || thick[i] > 0.9 && a[i] > 0.99) continue;           // not an edge pixel of a solid area
      out[i] = Math.round(M.clamp01(a[i] + d * strength) * 255);
    }
    return out;
  };
  // drop the faint haze the filter leaves around a mask: almost-nothing becomes nothing, almost-solid becomes solid
  M.snapExtremes = function (alpha, lo, hi) {
    lo = lo == null ? 7 : lo; hi = hi == null ? 248 : hi;
    for (var i = 0; i < alpha.length; i++) { var v = alpha[i]; if (v < lo) alpha[i] = 0; else if (v > hi) alpha[i] = 255; }
    return alpha;
  };

  M.bbox = function (alpha, w, h, thr) {
    thr = thr == null ? 8 : thr;
    var x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (alpha[y * w + x] > thr) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  };

  // model probabilities (small square) -> full-size alpha. guide = luminance of the working photo in [0,1].
  M.probToAlpha = function (prob, pw, ph, guide, w, h) {
    var up = M.resizeBilinear(prob, pw, ph, w, h), r = Math.max(3, Math.round(Math.max(w, h) / 160));
    var q = M.guidedFilter(guide, up, w, h, r, 0.004), out = new Uint8Array(w * h);
    for (var i = 0; i < out.length; i++) out[i] = Math.round(M.clamp01((q[i] - 0.5) * 4.5 + 0.5) * 255);
    M.snapExtremes(out);
    M.cleanMask(out, w, h, { conf: up });
    return M.antialias(out, w, h, 0.6);
  };

  // ================================================================== engines + model runtime (browser only)
  var script = root.document && root.document.currentScript;
  var BASE = (script && script.src ? script.src : "").replace(/[^\/]*$/, "");       // .../js/
  var SITE = BASE ? BASE.replace(/js\/$/, "") : "";
  // quick: the default (Apache-2.0 U²-Net-P, 4.6 MB). quick2: the same model run on the photo and its mirror image and averaged (Retry).
  // fine: a larger model whose weights' origin is not yet verified, so it is NOT shipped or offered unless the owner switches
  // Stick.config.FINER_MODEL on (and supplies the file). It is only fetched when someone explicitly picks it.
  C.engines = {
    quick: { id: "quick", file: "assets/models/u2netp.onnx", mb: 4.6, size: 320, tta: false, name: "Quick" },
    quick2: { id: "quick2", file: "assets/models/u2netp.onnx", mb: 4.6, size: 320, tta: true, name: "Second look" },
    fine:  { id: "fine",  file: "assets/models/silueta.onnx", mb: 44,  size: 320, tta: true,  name: "Finer edges (experimental)" }
  };
  C.finerEnabled = function () { return !!(Stick.config && Stick.config.FINER_MODEL); };
  C.MAX_SIDE = 1280;                          // working resolution: bounds memory and time; the original is kept untouched
  var ortP = null, sessions = {};

  function loadOrt() {
    if (ortP) return ortP;
    ortP = new Promise(function (resolve, reject) {
      if (root.ort) return resolve(root.ort);
      var s = root.document.createElement("script");
      s.src = BASE + "vendor/ort/ort.wasm.min.js";
      s.onload = function () {
        try {
          root.ort.env.wasm.wasmPaths = BASE + "vendor/ort/";
          root.ort.env.wasm.numThreads = root.crossOriginIsolated ? Math.min(4, root.navigator.hardwareConcurrency || 2) : 1;
          root.ort.env.wasm.proxy = false;
          resolve(root.ort);
        } catch (e) { reject(e); }
      };
      s.onerror = function () { ortP = null; reject(new Error("RUNTIME_LOAD_FAILED")); };
      root.document.head.appendChild(s);
    });
    return ortP;
  }

  // fetch with real byte progress (used for the one-off model download)
  function fetchBytes(url, onProgress) {
    return root.fetch(url).then(function (res) {
      if (!res.ok) throw new Error("MODEL_FETCH_FAILED");
      var total = Number(res.headers.get("content-length")) || 0;
      if (!res.body || !res.body.getReader || !onProgress) return res.arrayBuffer();
      var reader = res.body.getReader(), chunks = [], got = 0;
      return (function pump() {
        return reader.read().then(function (r) {
          if (r.done) {
            var out = new Uint8Array(got), o = 0;
            chunks.forEach(function (c) { out.set(c, o); o += c.length; });
            return out.buffer;
          }
          chunks.push(r.value); got += r.value.length;
          try { onProgress({ loaded: got, total: total }); } catch (e) {}
          return pump();
        });
      })();
    });
  }

  C.available = function () { return typeof root.WebAssembly === "object" && !!root.document; };
  C.isLoaded = function (id) { var e = C.engines[id]; return !!(e && sessions[e.file]); };
  C.session = function (id, onProgress) {
    var eng = C.engines[id] || C.engines.quick;
    if (eng.id === "fine" && !C.finerEnabled()) return Promise.reject(new Error("MODEL_NOT_AVAILABLE"));
    if (sessions[eng.file]) return sessions[eng.file];                      // engines that share a file share one loaded model
    sessions[eng.file] = loadOrt().then(function (ort) {
      return fetchBytes(SITE + eng.file, onProgress).then(function (buf) {
        return ort.InferenceSession.create(new Uint8Array(buf), { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
      });
    }).catch(function (e) { delete sessions[eng.file]; throw e; });
    return sessions[eng.file];
  };

  // ---- image helpers
  function makeCanvas(w, h) { var c = root.document.createElement("canvas"); c.width = w; c.height = h; return c; }
  C.makeCanvas = makeCanvas;
  // Decode an image (Blob or URL) to a canvas no larger than maxSide. Returns {canvas, w, h, scale}.
  C.prepareSource = function (src, maxSide) {
    maxSide = maxSide || C.MAX_SIDE;
    function fromImage(img, nw, nh) {
      var s = Math.min(1, maxSide / Math.max(nw, nh)), w = Math.max(1, Math.round(nw * s)), h = Math.max(1, Math.round(nh * s));
      var c = makeCanvas(w, h), x = c.getContext("2d");
      x.imageSmoothingQuality = "high"; x.drawImage(img, 0, 0, w, h);
      return { canvas: c, w: w, h: h, scale: s, natural: { w: nw, h: nh } };
    }
    if (src instanceof root.Blob && root.createImageBitmap) {
      return root.createImageBitmap(src, { imageOrientation: "from-image" }).then(function (bm) { var r = fromImage(bm, bm.width, bm.height); if (bm.close) bm.close(); return r; });
    }
    return new Promise(function (resolve, reject) {
      var img = new root.Image(), url = src instanceof root.Blob ? root.URL.createObjectURL(src) : src;
      img.onload = function () { try { resolve(fromImage(img, img.naturalWidth, img.naturalHeight)); } finally { if (src instanceof root.Blob) root.URL.revokeObjectURL(url); } };
      img.onerror = function () { reject(new Error("IMAGE_DECODE_FAILED")); };
      img.src = url;
    });
  };
  function luminance(canvas) {
    var w = canvas.width, h = canvas.height, d = canvas.getContext("2d").getImageData(0, 0, w, h).data, g = new Float32Array(w * h);
    for (var i = 0, p = 0; p < g.length; i += 4, p++) g[p] = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    return g;
  }
  function inputTensor(ort, canvas, size, flip) {
    var c = makeCanvas(size, size), x = c.getContext("2d");
    if (flip) { x.translate(size, 0); x.scale(-1, 1); }
    x.drawImage(canvas, 0, 0, size, size);
    var d = x.getImageData(0, 0, size, size).data, f = new Float32Array(3 * size * size), mx = 1e-6, i;
    for (i = 0; i < d.length; i += 4) { if (d[i] > mx) mx = d[i]; if (d[i + 1] > mx) mx = d[i + 1]; if (d[i + 2] > mx) mx = d[i + 2]; }
    var mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225], plane = size * size;
    for (i = 0; i < plane; i++) for (var k = 0; k < 3; k++) f[k * plane + i] = (d[i * 4 + k] / mx - mean[k]) / std[k];
    return new ort.Tensor("float32", f, [1, 3, size, size]);
  }
  function runOnce(ort, sess, canvas, size, flip) {
    return sess.run(((function () { var o = {}; o[sess.inputNames[0]] = inputTensor(ort, canvas, size, flip); return o; })())).then(function (out) {
      var raw = out[sess.outputNames[0]].data, n = size * size, p = new Float32Array(n), lo = Infinity, hi = -Infinity, i;
      for (i = 0; i < n; i++) { if (raw[i] < lo) lo = raw[i]; if (raw[i] > hi) hi = raw[i]; }
      var span = Math.max(hi - lo, 1e-6);
      for (i = 0; i < n; i++) p[i] = (raw[i] - lo) / span;
      if (flip) for (var y = 0; y < size; y++) for (var x = 0; x < size >> 1; x++) { var a = y * size + x, b = y * size + size - 1 - x, t = p[a]; p[a] = p[b]; p[b] = t; }
      return p;
    });
  }

  // The whole automatic pass. src: Blob | URL | the result of prepareSource. opts: {engine, onModelProgress}
  // Resolves {work: {canvas,w,h,natural}, alpha: Uint8Array(w*h), engine, ms}.
  C.segment = function (src, opts) {
    opts = opts || {};
    var eng = C.engines[opts.engine] || C.engines.quick, t0 = Date.now();
    var prep = src && src.canvas ? Promise.resolve(src) : C.prepareSource(src);
    return Promise.all([prep, C.session(eng.id, opts.onModelProgress), loadOrt()]).then(function (r) {
      var work = r[0], sess = r[1], ort = r[2];
      return runOnce(ort, sess, work.canvas, eng.size, false).then(function (p1) {
        if (!eng.tta) return p1;
        return runOnce(ort, sess, work.canvas, eng.size, true).then(function (p2) { for (var i = 0; i < p1.length; i++) p1[i] = (p1[i] + p2[i]) / 2; return p1; });
      }).then(function (prob) {
        var alpha = M.probToAlpha(prob, eng.size, eng.size, luminance(work.canvas), work.w, work.h);
        return { work: work, alpha: alpha, engine: eng.id, ms: Date.now() - t0 };
      });
    });
  };

  // ================================================================== output: the cutout image
  // Apply alpha to the working photo and crop to the subject. Returns a canvas (RGBA) and its box in working coordinates.
  C.compose = function (workCanvas, alpha, w, h, padFrac) {
    var box = M.bbox(alpha, w, h);
    if (!box) return null;
    var pad = Math.round(Math.max(box.w, box.h) * (padFrac == null ? 0.02 : padFrac));
    var x0 = Math.max(0, box.x - pad), y0 = Math.max(0, box.y - pad), x1 = Math.min(w, box.x + box.w + pad), y1 = Math.min(h, box.y + box.h + pad);
    var cw = x1 - x0, ch = y1 - y0, out = makeCanvas(cw, ch), ctx = out.getContext("2d");
    var img = workCanvas.getContext("2d").getImageData(x0, y0, cw, ch), d = img.data;
    for (var y = 0; y < ch; y++) for (var x = 0; x < cw; x++) d[(y * cw + x) * 4 + 3] = alpha[(y + y0) * w + (x + x0)];
    ctx.putImageData(img, 0, 0);
    return { canvas: out, box: { x: x0, y: y0, w: cw, h: ch } };
  };
  C.toBlob = function (canvas, type, quality) {
    return new Promise(function (resolve, reject) { canvas.toBlob(function (b) { b ? resolve(b) : reject(new Error("ENCODE_FAILED")); }, type || "image/png", quality); });
  };
})(typeof window !== "undefined" ? window : globalThis);
