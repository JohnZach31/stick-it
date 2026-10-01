/* Cutout Maker: the small editor that turns a photo into a cutout.
 *   Stick.cutoutMaker.open({source: Blob|URL}) -> Promise resolving
 *     {blob, ratio, w, h, engine, edited}   the cutout (PNG, cropped to the subject)
 *     {useOriginal: true}                    the person chose to keep the plain photo
 *     null                                   cancelled
 * The original image is never touched: this only reads it. Brush strokes live in a local undo stack that ends when the dialog
 * closes; board-wide undo starts only once the finished cutout is applied by the caller.
 * Needs Stick.cutout (engine) and Stick.ui (helpers exposed by the app). */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  var doc = root.document;
  var HINT_KEY = "stickit.cutout.hint";
  var UNDO_MAX = 25;

  function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function btn(label, cls, title) { var b = el("button", cls || "pillBtn"); b.type = "button"; b.textContent = label; if (title) b.title = title; return b; }
  function mb(n) { return (n / 1048576).toFixed(n >= 10485760 ? 0 : 1); }

  function open(opts) {
    opts = opts || {};
    var UI = Stick.ui, CUT = Stick.cutout;
    return new Promise(function (resolve) {
      var state = { prep: null, W: 0, H: 0, engine: "quick", runs: 0, edited: false, tool: "erase", brush: 56, zoom: 1, tx: 0, ty: 0, busy: false, hasMask: false, undo: [], redo: [], closed: false, compare: false };
      var maskC = null, srcCanvas = null, view = null, vctx = null, base = null;     // base: mask kept while previewing Edges

      // ---------------------------------------------------------------- DOM
      var backdrop = el("div", "cmkBackdrop");
      var card = el("div", "cmkCard"); card.setAttribute("role", "dialog"); card.setAttribute("aria-modal", "true"); card.setAttribute("aria-labelledby", "cmkTitle"); card.tabIndex = -1;
      backdrop.appendChild(card);
      var head = el("div", "cmkHead");
      var title = el("h3", "", "Cut it out"); title.id = "cmkTitle";
      var closeBtn = el("button", "acctClose cmkClose"); closeBtn.type = "button"; closeBtn.setAttribute("aria-label", "Close"); closeBtn.innerHTML = UI.ICONS.close;
      head.appendChild(title); head.appendChild(closeBtn);
      var hint = el("p", "cmkHint"); hint.setAttribute("role", "note");
      var body = el("div", "cmkBody");
      var stage = el("div", "cmkStage"); stage.tabIndex = 0; stage.setAttribute("aria-label", "Cutout preview. Use the tools below to erase or restore parts.");
      var viewport = el("div", "cmkView"); view = el("canvas", "cmkCanvas"); viewport.appendChild(view); stage.appendChild(viewport);
      var ring = el("div", "cmkRing"); ring.hidden = true; stage.appendChild(ring);
      var orig = el("div", "cmkOrig"); var origLabel = el("span", "", "Original"); var origImg = el("img"); origImg.alt = "Your original photo (unchanged)"; origImg.draggable = false; orig.appendChild(origLabel); orig.appendChild(origImg);
      body.appendChild(stage); body.appendChild(orig);
      var status = el("p", "cmkStatus"); status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");

      var tools = el("div", "cmkTools"); tools.setAttribute("role", "toolbar"); tools.setAttribute("aria-label", "Cutout tools");
      var tErase = btn("Erase", "pillBtn cmkTool", "Paint parts out (E)"), tRestore = btn("Restore", "pillBtn cmkTool", "Paint parts of the photo back in (R)"), tMove = btn("Move", "pillBtn cmkTool", "Drag to move the picture (H)");
      var tEdges = btn("Edges", "pillBtn cmkTool", "Soften or trim the edge");
      [tErase, tRestore, tMove].forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      var sizeWrap = el("label", "cmkSize"); sizeWrap.appendChild(el("span", "", "Brush")); var size = el("input"); size.type = "range"; size.min = "10"; size.max = "200"; size.value = String(state.brush); size.setAttribute("aria-label", "Brush size"); sizeWrap.appendChild(size);
      var bUndo = btn("Undo", "pillBtn cmkSmall", "Undo (Ctrl+Z)"), bRedo = btn("Redo", "pillBtn cmkSmall", "Redo (Ctrl+Shift+Z)");
      var bMinus = btn("−", "pillBtn cmkSmall cmkSq", "Zoom out"), bPlus = btn("+", "pillBtn cmkSmall cmkSq", "Zoom in"), bFit = btn("Fit", "pillBtn cmkSmall", "Fit to window");
      var bCompare = btn("Original", "pillBtn cmkSmall cmkCompare", "Show the original photo"); bCompare.setAttribute("aria-pressed", "false");
      [tErase, tRestore, tMove, tEdges, sizeWrap, bUndo, bRedo, bMinus, bPlus, bFit, bCompare].forEach(function (n) { tools.appendChild(n); });

      var edgePop = el("div", "cmkEdges"); edgePop.hidden = true; edgePop.setAttribute("role", "group"); edgePop.setAttribute("aria-label", "Edge refine");
      edgePop.innerHTML = '<label><span>Softness</span><input type="range" min="0" max="100" value="0" id="cmkSoft"></label><label><span>Trim (tighter ← → looser)</span><input type="range" min="-100" max="100" value="0" id="cmkTrim"></label>';
      var edgeBtns = el("div", "cmkEdgeBtns"); var eApply = btn("Apply", "pillBtn primary cmkSmall"), eReset = btn("Reset", "pillBtn cmkSmall");
      edgeBtns.appendChild(eReset); edgeBtns.appendChild(eApply); edgePop.appendChild(edgeBtns);
      var soft = edgePop.querySelector("#cmkSoft"), trim = edgePop.querySelector("#cmkTrim");

      var foot = el("div", "cmkFoot");
      var bCancel = btn("Cancel", "pillBtn"), bRetry = btn("Retry automatic cutout", "pillBtn"), bUse = btn("Use cutout", "pillBtn primary");
      foot.appendChild(bCancel); foot.appendChild(bRetry); foot.appendChild(bUse);
      var fail = el("div", "cmkFail"); fail.hidden = true; fail.setAttribute("role", "alert");
      var failMsg = el("p", "", "Couldn’t make a clean cutout. Your original photo is unchanged.");
      var fRow = el("div", "cmkFailBtns"); var fRetry = btn("Retry", "pillBtn primary"), fOrig = btn("Use original", "pillBtn"), fCancel = btn("Cancel", "pillBtn");
      fRow.appendChild(fRetry); fRow.appendChild(fOrig); fRow.appendChild(fCancel); fail.appendChild(failMsg); fail.appendChild(fRow);

      card.appendChild(head); card.appendChild(hint); card.appendChild(body); card.appendChild(status); card.appendChild(tools); card.appendChild(edgePop); card.appendChild(fail); card.appendChild(foot);

      var hintSeen = false; try { hintSeen = !!root.localStorage.getItem(HINT_KEY); } catch (e) {}
      if (!hintSeen) hint.textContent = "Erase removes parts. Restore brings them back. Retry runs the automatic cutout again (with finer edges after the first try).";
      else hint.hidden = true;

      var opener = doc.activeElement;
      doc.body.appendChild(backdrop);
      setTimeout(function () { try { stage.focus(); } catch (e) {} }, 30);

      // ---------------------------------------------------------------- helpers
      function say(t) { status.textContent = t || ""; }
      function setBusyUI(b) {
        state.busy = b;
        [tErase, tRestore, tMove, tEdges, bUndo, bRedo, bRetry, bUse, size, bMinus, bPlus, bFit, bCompare].forEach(function (n) { n.disabled = b; });
        card.classList.toggle("busy", b);
      }
      function updateButtons() {
        tErase.setAttribute("aria-pressed", String(state.tool === "erase")); tRestore.setAttribute("aria-pressed", String(state.tool === "restore")); tMove.setAttribute("aria-pressed", String(state.tool === "move"));
        tErase.classList.toggle("on", state.tool === "erase"); tRestore.classList.toggle("on", state.tool === "restore"); tMove.classList.toggle("on", state.tool === "move");
        if (!state.busy) { bUndo.disabled = !state.undo.length; bRedo.disabled = !state.redo.length; }
        stage.style.cursor = state.tool === "move" ? "grab" : "none";
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

      // ---------------------------------------------------------------- layout, zoom, pan
      var fit = { w: 0, h: 0 };
      function layout() {
        if (!state.W) return;
        var sw = stage.clientWidth, sh = stage.clientHeight; if (!sw || !sh) return;
        var s = Math.min(sw / state.W, sh / state.H); fit.w = state.W * s; fit.h = state.H * s;
        view.style.width = fit.w + "px"; view.style.height = fit.h + "px";
        applyView();
      }
      function clampView() {
        var sw = stage.clientWidth, sh = stage.clientHeight, w = fit.w * state.zoom, h = fit.h * state.zoom;
        state.tx = w <= sw ? (sw - w) / 2 : Math.min(0, Math.max(sw - w, state.tx));
        state.ty = h <= sh ? (sh - h) / 2 : Math.min(0, Math.max(sh - h, state.ty));
      }
      function applyView() { clampView(); viewport.style.transform = "translate(" + state.tx + "px," + state.ty + "px) scale(" + state.zoom + ")"; }
      function zoomAt(f, cx, cy) {
        var nz = Math.min(8, Math.max(1, state.zoom * f)); f = nz / state.zoom;
        state.tx = cx - (cx - state.tx) * f; state.ty = cy - (cy - state.ty) * f; state.zoom = nz; applyView(); updateRing();
      }
      function stagePoint(e) { var r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
      function toImage(e) { var r = view.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * state.W, y: (e.clientY - r.top) / r.height * state.H }; }
      function brushPx() { return state.brush / (fit.w * state.zoom / state.W); }     // brush diameter in image pixels
      function updateRing(e) {
        if (!e || state.tool === "move" || state.busy) { ring.hidden = true; return; }
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
        if (state.compare) return;
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
        if (panning) { state.tx = panning.tx + e.clientX - panning.x; state.ty = panning.ty + e.clientY - panning.y; applyView(); return; }
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
      function setTool(t) { state.tool = t; updateButtons(); redraw(); if (t !== "move") { try { stage.focus(); } catch (e) {} } }
      tErase.addEventListener("click", function () { setTool("erase"); });
      tRestore.addEventListener("click", function () { setTool("restore"); });
      tMove.addEventListener("click", function () { setTool("move"); });
      size.addEventListener("input", function () { state.brush = Number(size.value); });
      bUndo.addEventListener("click", doUndo); bRedo.addEventListener("click", doRedo);
      bPlus.addEventListener("click", function () { zoomAt(1.4, stage.clientWidth / 2, stage.clientHeight / 2); });
      bMinus.addEventListener("click", function () { zoomAt(1 / 1.4, stage.clientWidth / 2, stage.clientHeight / 2); });
      bFit.addEventListener("click", function () { state.zoom = 1; applyView(); });
      bCompare.addEventListener("click", function () { state.compare = !state.compare; bCompare.setAttribute("aria-pressed", String(state.compare)); bCompare.classList.toggle("on", state.compare); bCompare.textContent = state.compare ? "Cutout" : "Original"; redraw(); say(state.compare ? "Showing the original photo." : "Showing the cutout."); });

      // Edges: live preview from a saved base, committed with Apply
      tEdges.addEventListener("click", function () {
        if (edgePop.hidden) { base = maskAlpha(); soft.value = "0"; trim.value = "0"; edgePop.hidden = false; tEdges.classList.add("on"); tEdges.setAttribute("aria-expanded", "true"); soft.focus(); }
        else closeEdges(true);
      });
      function previewEdges() { setMask(Stick.cutout.math.refineAlpha(base, state.W, state.H, Number(soft.value) / 100, Number(trim.value) / 100)); redraw(); }
      soft.addEventListener("input", previewEdges); trim.addEventListener("input", previewEdges);
      function closeEdges(revert) { if (revert && base) { setMask(base); redraw(); } base = null; edgePop.hidden = true; tEdges.classList.remove("on"); tEdges.removeAttribute("aria-expanded"); }
      eReset.addEventListener("click", function () { soft.value = "0"; trim.value = "0"; previewEdges(); });
      eApply.addEventListener("click", function () {
        var after = maskAlpha(); setMask(base); pushUndo(); setMask(after); base = null; edgePop.hidden = true; tEdges.classList.remove("on"); tEdges.removeAttribute("aria-expanded"); redraw(); say("Edges updated.");
      });

      // ---------------------------------------------------------------- automatic cutout
      function showFail(on) { fail.hidden = !on; foot.hidden = on; tools.hidden = on; body.classList.toggle("dim", on); if (on) { try { fRetry.focus(); } catch (e) {} } }
      function run(engineId) {
        showFail(false); setBusyUI(true); closeEdges(false);
        UI.loader.show(engineId === "fine" && !CUT.isLoaded("fine") ? "Getting the finer model…" : "Cutting it out…");
        state.runs++;
        return CUT.segment(state.prep || opts.source, {
          engine: engineId,
          onModelProgress: function (p) {
            if (engineId === "fine" && p.total) UI.loader.show("Getting the finer model… " + mb(p.loaded) + " of " + mb(p.total) + " MB");
          }
        }).then(function (res) {
          state.engine = res.engine;
          if (!state.prep) {
            state.prep = res.work; state.W = res.work.w; state.H = res.work.h; srcCanvas = res.work.canvas;
            maskC = CUT.makeCanvas(state.W, state.H); view.width = state.W; view.height = state.H; vctx = view.getContext("2d");
            origImg.src = srcCanvas.toDataURL("image/jpeg", 0.8);
          } else { pushUndo(); }                                  // Retry replaces the mask, so it is undoable
          var area = 0; for (var i = 0; i < res.alpha.length; i += 7) if (res.alpha[i] > 127) area++;
          if (area * 7 < res.alpha.length * 0.004) throw new Error("NO_SUBJECT");
          setMask(res.alpha); state.hasMask = true; layout(); redraw(); updateButtons();
          setBusyUI(false); updateButtons(); UI.loader.done("Cutout ready."); say("Cutout ready. Use Erase and Restore to tidy it, or choose Use cutout.");
          try { stage.focus(); } catch (e) {}
          if (!hintSeen) { hintSeen = true; try { root.localStorage.setItem(HINT_KEY, "1"); } catch (e) {} setTimeout(function () { hint.hidden = true; }, 12000); }
        }).catch(function (err) {
          UI.loader.hide(); setBusyUI(false);
          if (!state.hasMask) { showFail(true); say("Couldn’t make a clean cutout. Your original photo is unchanged."); }
          else { say("Couldn’t make a clean cutout this time. The previous cutout is still here."); UI.toast("Couldn’t make a clean cutout. Your original photo is unchanged."); }
          updateButtons();
        });
      }
      // first try uses the quick model; Retry moves to the finer one (a different answer is the point of retrying)
      function retry() { run(state.runs >= 1 ? "fine" : "quick"); }
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
        setBusyUI(true); say("Making your cutout…");
        var alpha = maskAlpha(), comp = CUT.compose(srcCanvas, alpha, state.W, state.H, 0.02);
        if (!comp) { setBusyUI(false); UI.toast("There’s nothing left of the cutout. Use Restore to bring something back."); return; }
        CUT.toBlob(comp.canvas, "image/png").then(function (blob) {
          finish({ blob: blob, w: comp.canvas.width, h: comp.canvas.height, ratio: comp.canvas.height / comp.canvas.width, engine: state.engine, edited: state.edited, work: { w: state.W, h: state.H } });
        }, function () { setBusyUI(false); UI.toast("Couldn’t save the cutout. Please try again."); });
      }
      bCancel.addEventListener("click", cancel); closeBtn.addEventListener("click", cancel); fCancel.addEventListener("click", function () { finish(null); });
      fOrig.addEventListener("click", function () { finish({ useOriginal: true }); });
      bUse.addEventListener("click", use);
      backdrop.addEventListener("mousedown", function (e) { if (e.target === backdrop) { e.preventDefault(); } });      // never lose work to a stray click

      function onKey(e) {
        var t = e.target, typing = t && (t.tagName === "INPUT" && t.type !== "range" || t.tagName === "TEXTAREA");
        if (e.key === "Escape") { e.stopPropagation(); if (!edgePop.hidden) { closeEdges(true); return; } cancel(); return; }
        if (e.key === " " && !typing && t === stage) { spaceDown = true; e.preventDefault(); return; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.stopPropagation(); e.shiftKey ? doRedo() : doUndo(); return; }
        if (typing || state.busy) { UI.trapTab(e, backdrop, card); return; }
        if (e.key === "e" || e.key === "E") setTool("erase");
        else if (e.key === "r" || e.key === "R") setTool("restore");
        else if (e.key === "h" || e.key === "H") setTool("move");
        else if (e.key === "[") { size.value = Math.max(10, Number(size.value) - 8); state.brush = Number(size.value); }
        else if (e.key === "]") { size.value = Math.min(200, Number(size.value) + 8); state.brush = Number(size.value); }
        else UI.trapTab(e, backdrop, card);
      }
      doc.addEventListener("keydown", onKey, true);
      doc.addEventListener("keyup", function ku(e) { if (e.key === " ") spaceDown = false; if (state.closed) doc.removeEventListener("keyup", ku); });
      root.addEventListener("resize", layout);

      // dev-only inspection hook for the browser test harness
      if (Stick.dev) Stick.cutoutMaker._state = function () { return { state: state, maskAlpha: state.W ? maskAlpha() : null, ctrl: { setTool: setTool, doUndo: doUndo, doRedo: doRedo, use: use, retry: retry, stamp: function (x, y, d, erase) { pushUndo(); stamp(maskC.getContext("2d"), x, y, d, erase); redraw(); }, setMask: setMask } }; };

      updateButtons(); setBusyUI(true);
      run("quick");
    });
  }

  Stick.cutoutMaker = Stick.cutoutMaker || {};
  Stick.cutoutMaker.open = open;
})(typeof window !== "undefined" ? window : globalThis);
