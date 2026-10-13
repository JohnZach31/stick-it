/* Stick-It Incognito: a scratch-off coating laid over a note (v0.8.4).
 *
 * THIS IS A VISUAL CONCEALMENT, NOT SECURITY. The words are still stored, synced and shared like any other note; the coating only
 * keeps them from being read at a glance. Anything that must stay private belongs behind a PIN lock (js/lock.js).
 *
 * Stick.incognito.mount(noteEl, opts) lays a canvas of silver foil over the note (the drag tab stays uncovered) and returns a handle.
 *   opts.seed        any string: the foil's flecks and scuffs are the same every time for the same note
 *   opts.label       the handwritten line printed on the foil
 *   opts.onReveal()  called once the foil is gone (scratched past the threshold, or revealed by keyboard / menu)
 *   opts.noScratch   true on a read-only page that may still scratch (a shared note): nothing else changes
 * Pure helpers (core.*) are exported for the tests: the coverage maths, the brush stamps and the pointer mapping.
 */
(function(){
  "use strict";
  var THRESHOLD = 0.6;                       // scratch away this much of the coating and the rest lifts off by itself
  var SAMPLE = 40;                           // coverage is measured on a 40x40 shrink of the canvas: cheap, and good to a percent or two
  var MAX_DPR = 1.5;                         // a foil is soft by nature; more pixels would only cost memory with many notes on the board

  // ---------- pure helpers ----------
  function hash(str){ var h = 2166136261; str = String(str || ""); for(var i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed){ var s = seed >>> 0 || 1; return function(){ s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  // fraction of the coating that is gone, from the alpha channel of the shrunken canvas (RGBA bytes)
  function cleared(rgba){
    var n = rgba.length / 4, sum = 0;
    for(var i = 3; i < rgba.length; i += 4) sum += rgba[i];
    return n ? 1 - sum / (255 * n) : 0;
  }
  // a point in the canvas's own pixels from an event's offset inside a (possibly scaled, rotated) element: the layout size is untransformed, so this holds at any zoom or tilt
  function mapPoint(offsetX, offsetY, layoutW, layoutH, canvasW, canvasH){
    return {x: offsetX * (canvasW / Math.max(1, layoutW)), y: offsetY * (canvasH / Math.max(1, layoutH))};
  }
  // stamps along a segment, spaced by a fraction of the radius, with a little jitter so a stroke looks scraped rather than drawn
  function stamps(x0, y0, x1, y1, radius, rand){
    var dx = x1 - x0, dy = y1 - y0, dist = Math.sqrt(dx * dx + dy * dy), step = Math.max(1, radius * 0.35), n = Math.max(1, Math.ceil(dist / step)), out = [];
    for(var i = 1; i <= n; i++){
      var t = i / n;
      out.push({x: x0 + dx * t + (rand() - 0.5) * radius * 0.35, y: y0 + dy * t + (rand() - 0.5) * radius * 0.35, r: radius * (0.8 + rand() * 0.45)});
    }
    return out;
  }
  var core = {THRESHOLD: THRESHOLD, hash: hash, rng: rng, cleared: cleared, mapPoint: mapPoint, stamps: stamps};

  // ---------- shared pieces (one grain tile and one particle layer for the whole page) ----------
  var grain = null;
  function grainTile(){
    if(grain) return grain;
    var c = document.createElement("canvas"); c.width = c.height = 96;
    var g = c.getContext("2d"), img = g.createImageData(96, 96), r = rng(7);
    for(var i = 0; i < img.data.length; i += 4){ var v = 110 + Math.floor(r() * 120); img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0); grain = c; return c;
  }
  var fx = null, flakes = [], fxRaf = 0;
  function fxLayer(){
    if(fx) return fx;
    fx = document.createElement("canvas"); fx.className = "incogFx"; fx.setAttribute("aria-hidden", "true");
    document.body.appendChild(fx); return fx;
  }
  function fxSize(){ var c = fxLayer(); if(c.width !== window.innerWidth || c.height !== window.innerHeight){ c.width = window.innerWidth; c.height = window.innerHeight; } return c; }
  function spit(x, y, count){
    if(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for(var i = 0; i < count && flakes.length < 60; i++){
      var a = Math.random() * 6.283, v = 0.6 + Math.random() * 1.8;
      flakes.push({x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.8, life: 1, s: 1 + Math.random() * 1.8, tone: Math.random() < 0.5 ? "#e6e9ee" : "#aeb4bd"});
    }
    if(!fxRaf) fxRaf = requestAnimationFrame(tickFx);
  }
  function tickFx(){
    fxRaf = 0;
    var c = fxSize(), g = c.getContext("2d");
    g.clearRect(0, 0, c.width, c.height);
    flakes = flakes.filter(function(f){ return f.life > 0; });
    flakes.forEach(function(f){
      f.x += f.vx; f.y += f.vy; f.vy += 0.09; f.life -= 0.035;
      g.globalAlpha = Math.max(0, f.life); g.fillStyle = f.tone; g.fillRect(f.x, f.y, f.s, f.s * 0.7);
    });
    g.globalAlpha = 1;
    if(flakes.length) fxRaf = requestAnimationFrame(tickFx);
    else g.clearRect(0, 0, c.width, c.height);
  }

  // ---------- the foil ----------
  function paintFoil(g, w, h, seed, label, dpr){
    var r = rng(hash(seed));
    var grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#d4d7dc"); grad.addColorStop(0.32, "#a9aeb6"); grad.addColorStop(0.55, "#cfd2d8"); grad.addColorStop(0.8, "#9ca1aa"); grad.addColorStop(1, "#c3c7cd");
    g.globalCompositeOperation = "source-over"; g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.save(); g.globalAlpha = 0.34; g.globalCompositeOperation = "multiply"; g.fillStyle = g.createPattern(grainTile(), "repeat"); g.fillRect(0, 0, w, h); g.restore();
    // brushed streaks
    for(var i = 0; i < Math.round(h / 3); i++){
      var y = r() * h; g.globalAlpha = 0.05 + r() * 0.08; g.fillStyle = r() < 0.5 ? "#ffffff" : "#6d727b"; g.fillRect(r() * w * 0.2, y, w * (0.4 + r() * 0.6), Math.max(1, dpr * 0.8));
    }
    // scuffs and flecks
    for(var k = 0; k < 14; k++){ g.globalAlpha = 0.07 + r() * 0.1; g.strokeStyle = r() < 0.5 ? "#59606a" : "#ffffff"; g.lineWidth = dpr * (0.6 + r()); g.beginPath(); var sx = r() * w, sy = r() * h; g.moveTo(sx, sy); g.lineTo(sx + (r() - 0.5) * 36 * dpr, sy + (r() - 0.5) * 14 * dpr); g.stroke(); }
    for(var f = 0; f < Math.round(w * h / 900); f++){ g.globalAlpha = 0.25 + r() * 0.4; g.fillStyle = r() < 0.6 ? "#ffffff" : "#7a808a"; g.fillRect(r() * w, r() * h, dpr * (0.6 + r() * 1.2), dpr * (0.6 + r() * 1.2)); }
    // a soft diagonal sheen
    var sh = g.createLinearGradient(0, h * 0.1, w, h * 0.9); sh.addColorStop(0, "rgba(255,255,255,0)"); sh.addColorStop(0.42, "rgba(255,255,255,0.28)"); sh.addColorStop(0.5, "rgba(255,255,255,0.05)"); sh.addColorStop(1, "rgba(255,255,255,0)");
    g.globalAlpha = 1; g.fillStyle = sh; g.fillRect(0, 0, w, h);
    // the handwritten line and a little eye, both printed ON the foil so scratching takes them away with it
    var fs = Math.max(14 * dpr, Math.min(w * 0.13, 30 * dpr));
    g.save(); g.translate(w / 2, h / 2); g.rotate(-0.045);
    g.font = fs + "px 'Caveat', 'Kalam', cursive"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "rgba(255,255,255,0.55)"; g.fillText(label, 1, fs * 0.55 + 1);
    g.fillStyle = "rgba(52,57,66,0.78)"; g.fillText(label, 0, fs * 0.55);
    g.strokeStyle = "rgba(52,57,66,0.72)"; g.lineWidth = Math.max(1.4, dpr * 1.6); g.lineCap = "round";
    var ey = -fs * 0.62, ew = fs * 0.78;
    g.beginPath(); g.moveTo(-ew, ey); g.quadraticCurveTo(0, ey - ew * 0.82, ew, ey); g.quadraticCurveTo(0, ey + ew * 0.82, -ew, ey); g.stroke();
    g.beginPath(); g.arc(0, ey, ew * 0.28, 0, 6.283); g.stroke();
    g.restore();
    g.globalAlpha = 1;
  }

  function sampleCleared(canvas, probe){
    var pg = probe.getContext("2d", {willReadFrequently: true});
    pg.clearRect(0, 0, SAMPLE, SAMPLE); pg.drawImage(canvas, 0, 0, SAMPLE, SAMPLE);
    return cleared(pg.getImageData(0, 0, SAMPLE, SAMPLE).data);
  }

  var live = [];                                                  // the foils currently on the page (the tests and the dev console look here)
  function mount(noteEl, opts){
    opts = opts || {};
    var label = opts.label || "Scratch to reveal";
    var wrap = document.createElement("div"); wrap.className = "incogWrap"; wrap.tabIndex = 0; wrap.setAttribute("role", "button");
    wrap.setAttribute("aria-label", "Incognito note, covered. Press Enter to reveal it.");
    var canvas = document.createElement("canvas"); canvas.className = "incogCanvas"; canvas.setAttribute("aria-hidden", "true");
    var curl = document.createElement("span"); curl.className = "incogCurl"; curl.setAttribute("aria-hidden", "true");
    wrap.appendChild(canvas); wrap.appendChild(curl);
    noteEl.appendChild(wrap);
    noteEl.classList.add("incogCovered");

    var probe = document.createElement("canvas"); probe.width = probe.height = SAMPLE;
    var state = {open: false, scratched: false, last: null, pointer: null, strokes: 0, gone: false, painted: false};
    var rand = rng(hash(opts.seed) ^ 0x5bd1e995);

    function size(){
      var w = wrap.clientWidth, h = wrap.clientHeight; if(!w || !h) return false;
      var dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR), cw = Math.max(2, Math.round(w * dpr)), ch = Math.max(2, Math.round(h * dpr));
      if(canvas.width === cw && canvas.height === ch && state.painted) return true;
      var keep = null;
      if(state.painted && state.scratched){ keep = document.createElement("canvas"); keep.width = canvas.width; keep.height = canvas.height; keep.getContext("2d").drawImage(canvas, 0, 0); }
      canvas.width = cw; canvas.height = ch;
      var g = canvas.getContext("2d"); paintFoil(g, cw, ch, opts.seed, label, dpr); state.painted = true;
      if(keep){ g.globalCompositeOperation = "destination-in"; g.drawImage(keep, 0, 0, cw, ch); g.globalCompositeOperation = "source-over"; }   // a resized note keeps what was scratched, stretched with it
      return true;
    }
    // a pristine foil that is far off screen gives its pixels back; it is repainted (identically) when it comes near again
    var io = null;
    if(window.IntersectionObserver){
      io = new IntersectionObserver(function(es){
        es.forEach(function(e){
          if(state.open || state.gone) return;
          if(e.isIntersecting){ if(!state.painted) size(); }
          else if(!state.scratched && state.painted){ canvas.width = canvas.height = 1; state.painted = false; }
        });
      }, {rootMargin: "400px"});
      io.observe(wrap);
    }
    var ro = null;
    if(window.ResizeObserver){ ro = new ResizeObserver(function(){ if(!state.open && !state.gone && (state.painted || !io)) size(); }); ro.observe(wrap); }
    size();

    function brush(x, y, r){
      var g = canvas.getContext("2d");
      var rg = g.createRadialGradient(x, y, r * 0.2, x, y, r);
      rg.addColorStop(0, "rgba(0,0,0,1)"); rg.addColorStop(0.6, "rgba(0,0,0,0.85)"); rg.addColorStop(1, "rgba(0,0,0,0)");
      g.globalCompositeOperation = "destination-out"; g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.globalCompositeOperation = "source-over";
    }
    function reveal(animate){
      if(state.open) return;
      state.open = true; state.gone = true;
      if(io) io.disconnect(); if(ro) ro.disconnect();
      wrap.classList.add("lifting");
      wrap.setAttribute("aria-label", "Incognito note, revealed.");
      noteEl.classList.remove("incogCovered");
      var done = function(){ if(wrap.parentNode) wrap.remove(); canvas.width = canvas.height = 1; };
      if(animate === false || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) done();
      else { wrap.addEventListener("transitionend", done, {once: true}); setTimeout(done, 700); }
      if(opts.onReveal) opts.onReveal();
    }
    function destroy(){ state.open = true; state.gone = true; if(io) io.disconnect(); if(ro) ro.disconnect(); if(wrap.parentNode) wrap.remove(); canvas.width = canvas.height = 1; noteEl.classList.remove("incogCovered"); }

    var evalT = 0;
    function check(){
      evalT = 0; if(state.open) return;
      if(sampleCleared(canvas, probe) >= THRESHOLD) reveal(true);
    }
    function at(e){ return mapPoint(e.offsetX, e.offsetY, wrap.clientWidth, wrap.clientHeight, canvas.width, canvas.height); }
    function stamp(p, from){
      if(!state.painted) size();
      var r = Math.max(10, Math.min(canvas.width, canvas.height) * 0.09);
      var list = from ? stamps(from.x, from.y, p.x, p.y, r, rand) : [{x: p.x, y: p.y, r: r}];
      list.forEach(function(s){ brush(s.x, s.y, s.r); });
      state.scratched = true;
    }
    wrap.addEventListener("pointerdown", function(e){
      if(e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault(); e.stopPropagation();                         // never starts a note drag, a pan, a selection or a text caret
      if(state.pointer !== null) return;
      if(opts.onPress) opts.onPress(e);                                // the note under the foil becomes the selected one (so its menu and Delete work)
      state.pointer = e.pointerId; try{ wrap.setPointerCapture(e.pointerId); }catch(x){}
      state.last = at(e); stamp(state.last, null); wrap.classList.add("scratching");
      spit(e.clientX, e.clientY, 3);
    });
    wrap.addEventListener("pointermove", function(e){
      if(state.pointer !== e.pointerId) return;
      e.preventDefault(); e.stopPropagation();
      var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      if(!evs.length) evs = [e];
      evs.forEach(function(ev){
        var p = mapPoint(ev.offsetX, ev.offsetY, wrap.clientWidth, wrap.clientHeight, canvas.width, canvas.height);
        stamp(p, state.last); state.last = p;
      });
      state.strokes++; if(state.strokes % 3 === 0) spit(e.clientX, e.clientY, 1);
      if(!evalT) evalT = setTimeout(check, 90);
    });
    function up(e){
      if(state.pointer !== e.pointerId) return;
      state.pointer = null; state.last = null; wrap.classList.remove("scratching");
      try{ wrap.releasePointerCapture(e.pointerId); }catch(x){}
      clearTimeout(evalT); evalT = 0; check();
    }
    wrap.addEventListener("pointerup", up); wrap.addEventListener("pointercancel", up);
    // nothing under the foil may react: no focus mode on double-click, no caret, no board gestures. (A right-click still reaches the board's own menu.)
    ["click", "dblclick", "touchstart"].forEach(function(t){ wrap.addEventListener(t, function(e){ e.stopPropagation(); }, {passive: true}); });
    wrap.addEventListener("mousedown", function(e){ e.stopPropagation(); e.preventDefault(); });
    wrap.addEventListener("keydown", function(e){
      if(e.key === "Enter" || e.key === " "){ e.preventDefault(); e.stopPropagation(); reveal(true); }
    });
    var handle = {wrap: wrap, canvas: canvas, reveal: reveal, destroy: destroy, isOpen: function(){ return state.open; }, coverage: function(){ return state.painted ? sampleCleared(canvas, probe) : 0; }, _stamp: function(x, y){ stamp({x: x, y: y}, null); check(); }};
    live.push(handle); return handle;
  }

  window.Stick = window.Stick || {};
  Stick.incognito = {mount: mount, core: core, THRESHOLD: THRESHOLD, live: function(){ live = live.filter(function(h){ return h.wrap.isConnected; }); return live.slice(); }};
})();
