/* Cutout Maker: the small editor that turns a photo into a cutout.
 *   Stick.cutoutMaker.open({source: Blob|URL}) -> Promise resolving
 *     {blob, ratio, w, h, engine, edited, border}   the cutout (PNG, cropped to the subject) and the border the person chose
 *     {useOriginal: true}                            the person chose to keep the plain photo
 *     null                                           cancelled
 * The original image is never touched: this only reads it. Brush strokes live in a local undo stack that ends when the dialog
 * closes; board-wide undo starts only once the finished cutout is applied by the caller.
 * Layout: one big working canvas, and a tool shelf of small grouped panels (Tools, Brush, View, History, Border). The detected subject
 * is fitted to the canvas, so a tower in the corner of a wide photo is not a speck in a big empty frame.
 * Needs Stick.cutout (engine) and Stick.ui (helpers exposed by the app). */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  var doc = root.document;
  var HINT_KEY = "stickit.cutout.hint";
  var UNDO_MAX = 25;
  var ZOOM_MAX = 10;

  function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function btn(label, cls, title) { var b = el("button", cls || "pillBtn"); b.type = "button"; if (label != null) b.textContent = label; if (title) b.title = title; return b; }
  function mb(n) { return (n / 1048576).toFixed(n >= 10485760 ? 0 : 1); }
  var SVG = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
  var ICON = {
    erase: SVG('<path d="M7 17l-3-3 9-9 6 6-6 6z"/><path d="M10 20h10"/><path d="M8 11l6 6"/>'),
    restore: SVG('<path d="M4 20c4-1 6-3 8-7l3-3 3 3-3 3c-4 2-6 4-7 4z"/><path d="M14 6l4-4 4 4-4 4"/>'),
    refine: SVG('<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="9" cy="7" r="2.2" fill="currentColor"/><circle cx="15" cy="17" r="2.2" fill="currentColor"/>'),
    move: SVG('<path d="M8 12V6a1.5 1.5 0 0 1 3 0v5"/><path d="M11 11V4.5a1.5 1.5 0 0 1 3 0V11"/><path d="M14 11V6a1.5 1.5 0 0 1 3 0v8c0 4-2 6-5 6s-5-1-6.5-4L4 13a1.5 1.5 0 0 1 2.5-1.5L8 13"/>'),
    undo: SVG('<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),
    redo: SVG('<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>'),
    fitSubject: SVG('<path d="M4 9V5a1 1 0 0 1 1-1h4"/><path d="M20 9V5a1 1 0 0 0-1-1h-4"/><path d="M4 15v4a1 1 0 0 0 1 1h4"/><path d="M20 15v4a1 1 0 0 1-1 1h-4"/><circle cx="12" cy="12" r="3"/>'),
    fitAll: SVG('<rect x="4" y="5" width="16" height="14" rx="1.5"/>')
  };

  function open(opts) {
    opts = opts || {};
    var UI = Stick.ui, CUT = Stick.cutout;
    return new Promise(function (resolve) {
      var state = { prep: null, W: 0, H: 0, engine: "quick", runs: 0, edited: false, tool: "erase", brush: 56, zoom: 1, tx: 0, ty: 0, busy: false, hasMask: false, undo: [], redo: [], closed: false, compare: false, border: "thin", autoFit: false };
      var maskC = null, srcCanvas = null, view = null, vctx = null, base = null;     // base: mask kept while previewing Refine

      // ---------------------------------------------------------------- DOM
      var backdrop = el("div", "cmkBackdrop");
      var card = el("div", "cmkCard"); card.setAttribute("role", "dialog"); card.setAttribute("aria-modal", "true"); card.setAttribute("aria-labelledby", "cmkTitle"); card.tabIndex = -1;
      backdrop.appendChild(card);

      var head = el("div", "cmkHead");
      var title = el("h3", "", "Cut it out"); title.id = "cmkTitle";
      var seg = el("div", "cmkSeg cmkViewSeg"); seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "What to show");
      var sCut = btn("Cutout", "cmkSegBtn on", "Show the cutout"), sOrig = btn("Original", "cmkSegBtn", "Show your original photo (unchanged)");
      sCut.setAttribute("aria-pressed", "true"); sOrig.setAttribute("aria-pressed", "false"); seg.appendChild(sCut); seg.appendChild(sOrig);
      var closeBtn = el("button", "acctClose cmkClose"); closeBtn.type = "button"; closeBtn.setAttribute("aria-label", "Close"); closeBtn.innerHTML = UI.ICONS.close;
      head.appendChild(title); head.appendChild(seg); head.appendChild(closeBtn);

      var hint = el("p", "cmkHint"); hint.setAttribute("role", "note");

      var main = el("div", "cmkMain");
      var stageWrap = el("div", "cmkStageWrap");
      var stage = el("div", "cmkStage"); stage.tabIndex = 0; stage.setAttribute("aria-label", "Cutout preview. Use Erase and Restore to tidy it.");
      var viewport = el("div", "cmkView"); view = el("canvas", "cmkCanvas"); viewport.appendChild(view); stage.appendChild(viewport);
      var ring = el("div", "cmkRing"); ring.hidden = true; stage.appendChild(ring);
      var status = el("p", "cmkStatus"); status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
      var fail = el("div", "cmkFail"); fail.hidden = true; fail.setAttribute("role", "alert");
      var failTitle = el("h4", "", "Couldn’t make a clean cutout");
      var failMsg = el("p", "", "Your original photo is unchanged. You can try again, keep the plain photo, or cancel.");
      var fRow = el("div", "cmkFailBtns"); var fRetry = btn("Try again", "pillBtn primary"), fOrig = btn("Use original", "pillBtn"), fCancel = btn("Cancel", "pillBtn");
      fRow.appendChild(fRetry); fRow.appendChild(fOrig); fRow.appendChild(fCancel); fail.appendChild(failTitle); fail.appendChild(failMsg); fail.appendChild(fRow);
      stageWrap.appendChild(stage); stageWrap.appendChild(status); stageWrap.appendChild(fail);

      // ---- the tool shelf: small grouped paper panels
      var shelf = el("aside", "cmkShelf"); shelf.setAttribute("aria-label", "Cutout tools");
      function group(label) { var g = el("section", "cmkGroup"); if (label) { var l = el("h4", "cmkGroupLabel", label); g.appendChild(l); } shelf.appendChild(g); return g; }
      function toolBtn(icon, label, title, cls) { var b = el("button", "cmkToolBtn" + (cls ? " " + cls : "")); b.type = "button"; b.title = title; b.innerHTML = '<span class="cmkIc">' + icon + '</span><span class="cmkLb"></span>'; b.querySelector(".cmkLb").textContent = label; return b; }

      var gTools = group("Tools"); var toolGrid = el("div", "cmkToolGrid"); toolGrid.setAttribute("role", "group"); toolGrid.setAttribute("aria-label", "Cutout tools");
      var tErase = toolBtn(ICON.erase, "Erase", "Paint parts out (E)"), tRestore = toolBtn(ICON.restore, "Restore", "Paint parts of the photo back in (R)"),
        tRefine = toolBtn(ICON.refine, "Refine", "Smooth, soften or trim the edge"), tMove = toolBtn(ICON.move, "Move", "Drag to move the picture (H)");
      [tErase, tRestore, tRefine, tMove].forEach(function (b) { b.setAttribute("aria-pressed", "false"); toolGrid.appendChild(b); });
      gTools.appendChild(toolGrid);

      var gBrush = group("Brush");
      var sizeRow = el("label", "cmkSizeRow"); var size = el("input"); size.type = "range"; size.min = "10"; size.max = "200"; size.value = String(state.brush); size.setAttribute("aria-label", "Brush size");
      var dot = el("span", "cmkDot"); dot.setAttribute("aria-hidden", "true"); sizeRow.appendChild(size); sizeRow.appendChild(dot); gBrush.appendChild(sizeRow);

      var gRefine = group("Refine edge"); gRefine.classList.add("cmkRefine"); gRefine.hidden = true;
      gRefine.insertAdjacentHTML("beforeend",
        '<label class="cmkSlide"><span>Smooth</span><input type="range" min="0" max="100" value="0" id="cmkSmooth"></label>' +
        '<label class="cmkSlide"><span>Soften</span><input type="range" min="0" max="100" value="0" id="cmkSoft"></label>' +
        '<label class="cmkSlide"><span>Trim <small>tighter … looser</small></span><input type="range" min="-100" max="100" value="0" id="cmkTrim"></label>');
      var rBtns = el("div", "cmkRefineBtns"); var eReset = btn("Reset", "pillBtn cmkSmall"), eApply = btn("Apply", "pillBtn primary cmkSmall"); rBtns.appendChild(eReset); rBtns.appendChild(eApply); gRefine.appendChild(rBtns);
      var smooth = gRefine.querySelector("#cmkSmooth"), soft = gRefine.querySelector("#cmkSoft"), trim = gRefine.querySelector("#cmkTrim");

      var gView = group("View"); var viewRow = el("div", "cmkRow");
      var bMinus = btn("−", "pillBtn cmkSmall cmkSq", "Zoom out"), bPlus = btn("+", "pillBtn cmkSmall cmkSq", "Zoom in");
      var bFitSubject = toolBtn(ICON.fitSubject, "Fit subject", "Zoom to the subject (F)", "cmkWide"), bFitAll = toolBtn(ICON.fitAll, "Fit original", "Show the whole photo (0)", "cmkWide");
      viewRow.appendChild(bMinus); viewRow.appendChild(bPlus); gView.appendChild(viewRow);
      var fitRow = el("div", "cmkRow"); fitRow.appendChild(bFitSubject); fitRow.appendChild(bFitAll); gView.appendChild(fitRow);

      var gHist = group("History"); var histRow = el("div", "cmkRow");
      var bUndo = toolBtn(ICON.undo, "Undo", "Undo (Ctrl+Z)", "cmkWide"), bRedo = toolBtn(ICON.redo, "Redo", "Redo (Ctrl+Shift+Z)", "cmkWide"); histRow.appendChild(bUndo); histRow.appendChild(bRedo); gHist.appendChild(histRow);

      var gBorder = group("Border"); var bseg = el("div", "cmkSeg"); bseg.setAttribute("role", "group"); bseg.setAttribute("aria-label", "White border");
      var bdBtns = {}; [["none", "None"], ["thin", "Thin"], ["medium", "Medium"]].forEach(function (p) { var b = btn(p[1], "cmkSegBtn", p[1] === "None" ? "No border" : p[1] + " white border"); b.dataset.v = p[0]; b.setAttribute("aria-pressed", "false"); bdBtns[p[0]] = b; bseg.appendChild(b); }); gBorder.appendChild(bseg);

      main.appendChild(stageWrap); main.appendChild(shelf);

      var foot = el("div", "cmkFoot");
      var bCancel = btn("Cancel", "pillBtn cmkCancel"), bRetry = btn("Retry", "pillBtn cmkRetry", "Run the automatic cutout again"), bUse = btn("Use cutout", "pillBtn primary cmkUse");
      foot.appendChild(bCancel); foot.appendChild(el("span", "cmkSpacer")); foot.appendChild(bRetry); foot.appendChild(bUse);

      card.appendChild(head); card.appendChild(hint); card.appendChild(main); card.appendChild(foot);

      var hintSeen = false; try { hintSeen = !!root.localStorage.getItem(HINT_KEY); } catch (e) {}
      if (!hintSeen) hint.textContent = "Erase takes parts away, Restore brings them back, Refine tidies the edge. Retry runs the automatic cutout again.";
      else hint.hidden = true;

      var opener = doc.activeElement;
      doc.body.appendChild(backdrop);
      setTimeout(function () { try { stage.focus(); } catch (e) {} }, 30);

      // ---------------------------------------------------------------- helpers
      function say(t) { status.textContent = t || ""; status.classList.toggle("on", !!t); clearTimeout(say.t); if (t) say.t = setTimeout(function () { status.classList.remove("on"); }, 4200); }
      var busyTargets = [tErase, tRestore, tRefine, tMove, bUndo, bRedo, bRetry, bUse, size, bMinus, bPlus, bFitSubject, bFitAll, sCut, sOrig, bdBtns.none, bdBtns.thin, bdBtns.medium];
      function setBusyUI(b) {
        state.busy = b;
        busyTargets.forEach(function (n) { n.disabled = b; });
        card.classList.toggle("busy", b);
      }
      function updateButtons() {
        var t = state.tool;
        [["erase", tErase], ["restore", tRestore], ["refine", tRefine], ["move", tMove]].forEach(function (p) { p[1].setAttribute("aria-pressed", String(t === p[0])); p[1].classList.toggle("on", t === p[0]); });
        gBrush.hidden = t === "refine" || t === "move";
        gRefine.hidden = t !== "refine";
        if (!state.busy) { bUndo.disabled = !state.undo.length; bRedo.disabled = !state.redo.length; }
        stage.style.cursor = t === "move" ? "grab" : t === "refine" ? "default" : "none";
        Object.keys(bdBtns).forEach(function (k) { bdBtns[k].classList.toggle("on", state.border === k); bdBtns[k].setAttribute("aria-pressed", String(state.border === k)); });
        sCut.classList.toggle("on", !state.compare); sOrig.classList.toggle("on", state.compare); sCut.setAttribute("aria-pressed", String(!state.compare)); sOrig.setAttribute("aria-pressed", String(state.compare));
        var px = Math.max(6, Math.min(34, state.brush / 6)); dot.style.width = dot.style.height = px + "px";
      }
      function maskAlpha() {
        var d = maskC.getContext("2d").getImageData(0, 0, state.W, state.H).data, a = new Uint8Array(state.W * state.H);
        for (var i = 0, p = 0; p < a.length; i += 4, p++) a[p] = d[i + 3];
        return a;
      }
      function setMask(alpha) {
        var ctx = maskC.getContext("2d"), img = ctx.createImageData(state.W, state.H), d = img.data;
        for (var i = 0, p = 0; p < alpha.length; i += 4, p++) { d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = alpha[p]; }
        ctx.putImageData(img, 0, 0);
      }
      var raf = 0;
      function redraw() { if (raf) return; raf = root.requestAnimationFrame(function () { raf = 0; paint(); }); }
      function paint() {
        if (!srcCanvas) return;
        var c = vctx;
        c.clearRect(0, 0, state.W, state.H);
        if (state.compare) { c.drawImage(srcCanvas, 0, 0); return; }
        if (state.tool === "restore") { c.globalAlpha = 0.3; c.drawImage(srcCanvas, 0, 0); c.globalAlpha = 1; }     // Restore only: a faint ghost of what was removed, so you can see what to bring back
        var t = tmp || (tmp = CUT.makeCanvas(state.W, state.H)), tc = t.getContext("2d");
        tc.globalCompositeOperation = "source-over"; tc.clearRect(0, 0, state.W, state.H); tc.drawImage(srcCanvas, 0, 0);
        tc.globalCompositeOperation = "destination-in"; tc.drawImage(maskC, 0, 0); tc.globalCompositeOperation = "source-over";
        c.drawImage(t, 0, 0);
      }
      var tmp = null;
      function pushUndo() { state.undo.push(maskAlpha()); if (state.undo.length > UNDO_MAX) state.undo.shift(); state.redo = []; state.edited = true; updateButtons(); }
      function doUndo() { if (!state.undo.length || state.busy) return; state.redo.push(maskAlpha()); setMask(state.undo.pop()); redraw(); updateButtons(); say("Undone."); }
      function doRedo() { if (!state.redo.length || state.busy) return; state.undo.push(maskAlpha()); setMask(state.redo.pop()); redraw(); updateButtons(); say("Redone."); }

      // the white border, previewed with a plain outline filter (the real contour is drawn when the cutout is placed on the board)
      function borderPreview() {
        var f = state.border === "none" ? "" : state.border === "medium" ? 2.1 : 1, px = f ? Math.max(1, Math.max(fit.w, fit.h) * 0.011 * f * state.zoom) / state.zoom : 0;
        view.style.filter = f ? "drop-shadow(" + px + "px 0 0 #fff) drop-shadow(-" + px + "px 0 0 #fff) drop-shadow(0 " + px + "px 0 #fff) drop-shadow(0 -" + px + "px 0 #fff)" : "";
      }

      // ---------------------------------------------------------------- layout, zoom, pan
      var fit = { w: 0, h: 0 };
      function layout() {
        if (!state.W) return;
        var sw = stage.clientWidth, sh = stage.clientHeight; if (!sw || !sh) return;
        var s = Math.min(sw / state.W, sh / state.H); fit.w = state.W * s; fit.h = state.H * s;
        view.style.width = fit.w + "px"; view.style.height = fit.h + "px";
        if (state.autoFit && maskC) fitSubject(); else applyView();      // a window or phone rotation re-frames the subject unless the person has taken over the view
      }
      // pan limits: always keep at least a quarter of the picture in view, so the subject can be centred even when it sits in a corner
      function clampView() {
        var sw = stage.clientWidth, sh = stage.clientHeight, w = fit.w * state.zoom, h = fit.h * state.zoom;
        state.tx = Math.min(sw - w * 0.25, Math.max(-w * 0.75, state.tx));
        state.ty = Math.min(sh - h * 0.25, Math.max(-h * 0.75, state.ty));
        if (state.zoom <= 1.0001 && w <= sw) state.tx = (sw - w) / 2;
        if (state.zoom <= 1.0001 && h <= sh) state.ty = (sh - h) / 2;
      }
      function applyView() { clampView(); viewport.style.transform = "translate(" + state.tx + "px," + state.ty + "px) scale(" + state.zoom + ")"; borderPreview(); }
      function zoomAt(f, cx, cy) {
        state.autoFit = false;
        var nz = Math.min(ZOOM_MAX, Math.max(1, state.zoom * f)); f = nz / state.zoom;
        state.tx = cx - (cx - state.tx) * f; state.ty = cy - (cy - state.ty) * f; state.zoom = nz; applyView(); updateRing();
      }
      // Fit subject: frame the detected subject's bounding box (viewing only: the picture's own coordinates never change)
      function fitSubject() {
        if (!maskC || !state.W) return;
        var box = CUT.math.bbox(maskAlpha(), state.W, state.H, 24);
        if (!box) { fitAll(); return; }
        var sw = stage.clientWidth, sh = stage.clientHeight, s0 = fit.w / state.W, pad = 0.07;
        var z = Math.min(sw / (box.w * s0 * (1 + 2 * pad)), sh / (box.h * s0 * (1 + 2 * pad)));
        state.zoom = Math.min(ZOOM_MAX, Math.max(1, z));
        state.tx = sw / 2 - (box.x + box.w / 2) * s0 * state.zoom; state.ty = sh / 2 - (box.y + box.h / 2) * s0 * state.zoom;
        state.autoFit = true; applyView(); updateRing();
      }
      function fitAll() { state.autoFit = false; state.zoom = 1; applyView(); updateRing(); }
      function stagePoint(e) { var r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
      function toImage(e) { var r = view.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * state.W, y: (e.clientY - r.top) / r.height * state.H }; }
      function brushPx() { return state.brush / (fit.w * state.zoom / state.W); }     // brush diameter in image pixels
      function updateRing(e) {
        if (!e || state.tool === "move" || state.tool === "refine" || state.busy) { ring.hidden = true; return; }
        var p = stagePoint(e); ring.hidden = false; ring.style.width = ring.style.height = state.brush + "px"; ring.style.left = p.x + "px"; ring.style.top = p.y + "px";
      }

      // ---------------------------------------------------------------- brush
      var stroke = null, touches = {}, pinch = null, panning = null, spaceDown = false;
      function stamp(ctx, x, y, d, erase) {
        var r = d / 2, g = ctx.createRadialGradient(x, y, r * 0.55, x, y, r);
        g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.globalCompositeOperation = erase ? "destination-out" : "source-over"; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
      }
      function strokeTo(p) {
        var ctx = maskC.getContext("2d"), d = brushPx(), step = Math.max(1, d / 4), dx = p.x - stroke.last.x, dy = p.y - stroke.last.y, len = Math.hypot(dx, dy), n = Math.max(1, Math.ceil(len / step));
        for (var i = 1; i <= n; i++) stamp(ctx, stroke.last.x + dx * i / n, stroke.last.y + dy * i / n, d, state.tool === "erase");
        stroke.last = p; redraw();
      }
      stage.addEventListener("pointerdown", function (e) {
        if (state.busy || e.button === 2) return;
        stage.setPointerCapture(e.pointerId);
        if (e.pointerType === "touch") { touches[e.pointerId] = stagePoint(e); }
        var nTouch = Object.keys(touches).length;
        if (nTouch >= 2) {                                         // two fingers: pan / pinch, never paint
          if (stroke) { setMask(stroke.before); stroke = null; redraw(); }
          var ids = Object.keys(touches), a = touches[ids[0]], b = touches[ids[1]];
          pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
          return;
        }
        if (state.tool === "move" || spaceDown || e.button === 1) { panning = { x: e.clientX, y: e.clientY, tx: state.tx, ty: state.ty }; stage.style.cursor = "grabbing"; return; }
        if (state.compare || state.tool === "refine") return;
        pushUndo();
        stroke = { last: toImage(e), before: state.undo[state.undo.length - 1] };
        strokeTo(stroke.last);
      });
      stage.addEventListener("pointermove", function (e) {
        updateRing(e.pointerType === "mouse" || e.pointerType === "pen" ? e : null);
        if (e.pointerType === "touch" && touches[e.pointerId]) touches[e.pointerId] = stagePoint(e);
        if (pinch && Object.keys(touches).length >= 2) {
          var ids = Object.keys(touches), a = touches[ids[0]], b = touches[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
          state.tx += cx - pinch.cx; state.ty += cy - pinch.cy; zoomAt(d / pinch.d, cx, cy);
          pinch = { d: d, cx: cx, cy: cy }; return;
        }
        if (panning) { state.autoFit = false; state.tx = panning.tx + e.clientX - panning.x; state.ty = panning.ty + e.clientY - panning.y; applyView(); return; }
        if (stroke) {
          var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
          (evs.length ? evs : [e]).forEach(function (ev) { strokeTo(toImage(ev)); });
        }
      });
      function endPointer(e) {
        delete touches[e.pointerId];
        if (Object.keys(touches).length < 2) pinch = null;
        if (panning) { panning = null; stage.style.cursor = state.tool === "move" ? "grab" : "none"; }
        if (stroke) { stroke = null; say(state.tool === "erase" ? "Erased." : "Restored."); }
      }
      stage.addEventListener("pointerup", endPointer); stage.addEventListener("pointercancel", endPointer);
      stage.addEventListener("pointerleave", function () { ring.hidden = true; });
      stage.addEventListener("wheel", function (e) { e.preventDefault(); var p = stagePoint(e); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y); }, { passive: false });
      stage.addEventListener("contextmenu", function (e) { e.preventDefault(); });

      // ---------------------------------------------------------------- tools and buttons
      function setTool(t) {
        if (t !== "refine" && !gRefine.hidden) closeRefine(true);
        state.tool = t; updateButtons(); redraw();
        if (t === "refine") { openRefine(); } else if (t !== "move") { try { stage.focus(); } catch (e) {} }
      }
      tErase.addEventListener("click", function () { setTool("erase"); });
      tRestore.addEventListener("click", function () { setTool("restore"); });
      tRefine.addEventListener("click", function () { if (state.tool === "refine") setTool("erase"); else setTool("refine"); });
      tMove.addEventListener("click", function () { setTool("move"); });
      size.addEventListener("input", function () { state.brush = Number(size.value); updateButtons(); });
      bUndo.addEventListener("click", doUndo); bRedo.addEventListener("click", doRedo);
      bPlus.addEventListener("click", function () { zoomAt(1.4, stage.clientWidth / 2, stage.clientHeight / 2); });
      bMinus.addEventListener("click", function () { zoomAt(1 / 1.4, stage.clientWidth / 2, stage.clientHeight / 2); });
      bFitSubject.addEventListener("click", fitSubject); bFitAll.addEventListener("click", fitAll);
      function showCompare(on) { state.compare = !!on; updateButtons(); redraw(); say(on ? "Showing the original photo." : "Showing the cutout."); }
      sCut.addEventListener("click", function () { showCompare(false); }); sOrig.addEventListener("click", function () { showCompare(true); });
      Object.keys(bdBtns).forEach(function (k) { bdBtns[k].addEventListener("click", function () { state.border = k; updateButtons(); borderPreview(); say(k === "none" ? "No border." : k === "thin" ? "Thin border." : "Medium border."); }); });

      // Refine: live preview from a saved base, committed with Apply
      function openRefine() { base = maskAlpha(); smooth.value = "0"; soft.value = "0"; trim.value = "0"; try { smooth.focus(); } catch (e) {} }
      function previewRefine() { setMask(CUT.math.refineAlpha(base, state.W, state.H, Number(soft.value) / 100, Number(trim.value) / 100, Number(smooth.value) / 100)); redraw(); }
      smooth.addEventListener("input", previewRefine); soft.addEventListener("input", previewRefine); trim.addEventListener("input", previewRefine);
      function closeRefine(revert) { if (revert && base) { setMask(base); redraw(); } base = null; }
      eReset.addEventListener("click", function () { smooth.value = "0"; soft.value = "0"; trim.value = "0"; previewRefine(); });
      eApply.addEventListener("click", function () {
        var after = maskAlpha(); setMask(base); pushUndo(); setMask(after); base = null; state.tool = "erase"; updateButtons(); redraw(); say("Edge updated.");
      });

      // ---------------------------------------------------------------- automatic cutout
      function showFail(on) { fail.hidden = !on; foot.hidden = on; shelf.hidden = on; stage.classList.toggle("dim", on); if (on) { try { fRetry.focus(); } catch (e) {} } }
      function run(engineId) {
        showFail(false); setBusyUI(true); if (!gRefine.hidden) { closeRefine(false); state.tool = "erase"; }
        var eng = CUT.engines[engineId] || CUT.engines.quick, heavy = eng.mb > 20 && !CUT.isLoaded(engineId);
        UI.loader.show(heavy ? "Getting the finer model…" : "Cutting it out…");
        state.runs++;
        return CUT.segment(state.prep || opts.source, {
          engine: engineId,
          onModelProgress: function (p) {
            if (heavy && p.total) UI.loader.show("Getting the finer model… " + mb(p.loaded) + " of " + mb(p.total) + " MB");
          }
        }).then(function (res) {
          state.engine = res.engine;
          if (!state.prep) {
            state.prep = res.work; state.W = res.work.w; state.H = res.work.h; srcCanvas = res.work.canvas;
            maskC = CUT.makeCanvas(state.W, state.H); view.width = state.W; view.height = state.H; vctx = view.getContext("2d");
          } else { pushUndo(); }                                  // Retry replaces the mask, so it is undoable
          var area = 0; for (var i = 0; i < res.alpha.length; i += 7) if (res.alpha[i] > 127) area++;
          if (area * 7 < res.alpha.length * 0.004) throw new Error("NO_SUBJECT");
          setMask(res.alpha); state.hasMask = true; state.tool = "erase"; layout(); redraw(); updateButtons();
          setBusyUI(false); updateButtons(); UI.loader.done("Cutout ready."); fitSubject();
          say("Cutout ready.");
          try { stage.focus(); } catch (e) {}
          if (!hintSeen) { hintSeen = true; try { root.localStorage.setItem(HINT_KEY, "1"); } catch (e) {} setTimeout(function () { hint.hidden = true; }, 12000); }
        }).catch(function (err) {
          UI.loader.hide(); setBusyUI(false);
          if (!state.hasMask) { showFail(true); say(""); }
          else { say("Couldn’t make a clean cutout this time. The previous cutout is still here."); UI.toast("Couldn’t make a clean cutout. Your original photo is unchanged."); }
          updateButtons();
        });
      }
      // first try: the quick model. Retry: a second look with the same model (flip-averaged). Only if the experimental finer model is switched on does a later Retry use it.
      function retry() {
        var seq = ["quick", "quick2"].concat(CUT.finerEnabled && CUT.finerEnabled() ? ["fine"] : []);
        run(seq[state.runs % seq.length]);
      }
      bRetry.addEventListener("click", retry); fRetry.addEventListener("click", retry);

      // ---------------------------------------------------------------- finish
      function cleanup() {
        if (state.closed) return; state.closed = true;
        root.removeEventListener("resize", layout); doc.removeEventListener("keydown", onKey, true);
        UI.loader.hide(); backdrop.remove();
        if (opener && opener.focus && doc.contains(opener)) { try { opener.focus(); } catch (e) {} }
      }
      function finish(result) { cleanup(); resolve(result); }
      function cancel() {
        if (state.closed) return;
        if (state.edited && !state.busy) { UI.confirm({ title: "Discard your changes?", body: "Your original photo stays as it is.", confirm: "Discard", danger: true }).then(function (ok) { if (ok) finish(null); }); return; }
        finish(null);
      }
      function use() {
        if (state.busy || !maskC) return;
        if (state.tool === "refine" && base) { closeRefine(true); state.tool = "erase"; updateButtons(); }
        setBusyUI(true); say("Making your cutout…");
        var alpha = maskAlpha(), comp = CUT.compose(srcCanvas, alpha, state.W, state.H, 0.02);
        if (!comp) { setBusyUI(false); UI.toast("There’s nothing left of the cutout. Use Restore to bring something back."); return; }
        CUT.toBlob(comp.canvas, "image/png").then(function (blob) {
          finish({ blob: blob, w: comp.canvas.width, h: comp.canvas.height, ratio: comp.canvas.height / comp.canvas.width, engine: state.engine, edited: state.edited, border: state.border, work: { w: state.W, h: state.H } });
        }, function () { setBusyUI(false); UI.toast("Couldn’t save the cutout. Please try again."); });
      }
      bCancel.addEventListener("click", cancel); closeBtn.addEventListener("click", cancel); fCancel.addEventListener("click", function () { finish(null); });
      fOrig.addEventListener("click", function () { finish({ useOriginal: true }); });
      bUse.addEventListener("click", use);
      backdrop.addEventListener("mousedown", function (e) { if (e.target === backdrop) { e.preventDefault(); } });      // never lose work to a stray click

      function onKey(e) {
        var t = e.target, typing = t && (t.tagName === "INPUT" && t.type !== "range" || t.tagName === "TEXTAREA");
        if (e.key === "Escape") { e.stopPropagation(); if (state.tool === "refine") { closeRefine(true); setTool("erase"); return; } cancel(); return; }
        if (e.key === " " && !typing && t === stage) { spaceDown = true; e.preventDefault(); return; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.stopPropagation(); e.shiftKey ? doRedo() : doUndo(); return; }
        if (typing || state.busy) { UI.trapTab(e, backdrop, card); return; }
        if (e.ctrlKey || e.metaKey || e.altKey) { UI.trapTab(e, backdrop, card); return; }
        if (e.key === "e" || e.key === "E") setTool("erase");
        else if (e.key === "r" || e.key === "R") setTool("restore");
        else if (e.key === "h" || e.key === "H") setTool("move");
        else if (e.key === "f" || e.key === "F") fitSubject();
        else if (e.key === "0") fitAll();
        else if (e.key === "[") { size.value = Math.max(10, Number(size.value) - 8); state.brush = Number(size.value); updateButtons(); }
        else if (e.key === "]") { size.value = Math.min(200, Number(size.value) + 8); state.brush = Number(size.value); updateButtons(); }
        else UI.trapTab(e, backdrop, card);
      }
      doc.addEventListener("keydown", onKey, true);
      doc.addEventListener("keyup", function ku(e) { if (e.key === " ") spaceDown = false; if (state.closed) doc.removeEventListener("keyup", ku); });
      root.addEventListener("resize", layout);

      // dev-only inspection hook for the browser test harness
      if (Stick.dev) Stick.cutoutMaker._state = function () { return { state: state, maskAlpha: state.W ? maskAlpha() : null, ctrl: { setTool: setTool, doUndo: doUndo, doRedo: doRedo, use: use, retry: retry, fitSubject: fitSubject, fitAll: fitAll, stamp: function (x, y, d, erase) { pushUndo(); stamp(maskC.getContext("2d"), x, y, d, erase); redraw(); }, setMask: setMask } }; };

      updateButtons(); setBusyUI(true);
      run("quick");
    });
  }

  Stick.cutoutMaker = Stick.cutoutMaker || {};
  Stick.cutoutMaker.open = open;
})(typeof window !== "undefined" ? window : globalThis);
