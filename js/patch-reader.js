/* The in-app Patch Notes reader and the patch tour library.
 *
 * Everything shown here comes from Stick.patchHistory (js/patch-history.js), which tools/build-patch-data.mjs generates from the same canonical patch data the website
 * uses: there is no second, hand-written copy of any release. Opening, reading or replaying a patch never changes any release status or the "seen" version.
 *
 *   Stick.patchReader.init({layer: OV.layer, logo: fn, current: "0.8.3.2", actions: {openDone: fn, ...}})   once, from the app
 *   Stick.patchReader.open({version})        browse the history (optionally straight to one version)
 *   Stick.patchReader.openTour(version)      replay that patch's tour cards (a patch without a tour says so and shows its notes)
 *
 * Text is only ever put on the page with textContent. The few inline marks in the notes (**bold**, *italic*, `code`, [text](link)) are turned into elements here;
 * a link is shown as its text (no link in a patch note is followed from here).
 */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  var doc = root.document;
  var host = { layer: null, logo: null, current: "", actions: {} };
  var state = null, tour = null;

  function mk(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function H() { return Stick.patchHistory || { categories: [], versions: [] }; }
  function byVersion(v) { var l = H().versions; for (var i = 0; i < l.length; i++) if (l[i].version === v) return l[i]; return null; }
  function reduce() { return !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches) || (doc.documentElement && doc.documentElement.getAttribute("data-a11y-motion") === "reduce"); }
  function dateLabel(v) {
    if (v.status === "released" && v.date) { try { return "Released " + new Date(v.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return "Released " + v.date; } }
    return v.status === "development" ? "In development" : v.status;
  }

  // **bold**, *italic*, `code`, [text](link) -> elements (the link target is dropped, never followed)
  function inline(parent, text) {
    var re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)]+\))/g, last = 0, m;
    text = String(text == null ? "" : text);
    while ((m = re.exec(text))) {
      if (m.index > last) parent.appendChild(doc.createTextNode(text.slice(last, m.index)));
      var t = m[0], el;
      if (t.indexOf("**") === 0) { el = mk("strong", "", t.slice(2, -2)); }
      else if (t.charAt(0) === "`") { el = mk("code", "", t.slice(1, -1)); }
      else if (t.charAt(0) === "[") { el = doc.createTextNode(t.slice(1, t.indexOf("]"))); }
      else { el = mk("em", "", t.slice(1, -1)); }
      parent.appendChild(el); last = m.index + t.length;
    }
    if (last < text.length) parent.appendChild(doc.createTextNode(text.slice(last)));
  }
  function blocks(parent, list) {
    (list || []).forEach(function (b) {
      if (b.t === "ul") { var ul = mk("ul"); b.items.forEach(function (it) { var li = mk("li"); inline(li, it); ul.appendChild(li); }); parent.appendChild(ul); }
      else { var p = mk("p"); inline(p, b.text); parent.appendChild(p); }
    });
  }

  // does this version match the search words and the category?
  function matches(v, q, cat) {
    if (cat && cat !== "All" && v.tags.indexOf(cat) === -1) return false;
    if (!q) return true;
    var hay = [v.version, v.codename, v.title, v.summary, v.tags.join(" "), (v.highlights || []).join(" ")]
      .concat(v.notes.map(function (s) { return s.heading + " " + s.blocks.map(function (b) { return b.t === "ul" ? b.items.join(" ") : b.text; }).join(" ") + " " + (s.sub || []).map(function (x) { return x.heading + " " + x.blocks.map(function (b) { return b.t === "ul" ? b.items.join(" ") : b.text; }).join(" "); }).join(" "); })).join(" ").toLowerCase();
    return q.toLowerCase().split(/\s+/).filter(Boolean).every(function (w) { return hay.indexOf(w) !== -1; });
  }

  // ------------------------------------------------------------------ the reader
  function open(opts) {
    opts = opts || {};
    if (state) { select(opts.version || state.version); return state.root; }
    var all = H().versions; if (!all.length) return null;
    state = { version: (opts.version && byVersion(opts.version)) ? opts.version : all[0].version, q: "", cat: "All", opener: doc.activeElement, mobileDetail: !!opts.version };
    var backdrop = mk("div", "prBackdrop"), sheet = mk("div", "prSheet"); state.root = backdrop; state.sheet = sheet;
    sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true"); sheet.setAttribute("aria-label", "Patch notes"); sheet.tabIndex = -1;
    backdrop.appendChild(sheet);
    backdrop.addEventListener("mousedown", function (e) { if (e.target === backdrop) close(); });
    sheet.addEventListener("keydown", trap);
    doc.body.appendChild(backdrop);
    state.layer = host.layer ? host.layer("patch-reader", function () { close(); }, function () { return !!state; }) : null;
    if (state.layer) state.layer.open(); else doc.addEventListener("keydown", escFallback, true);
    build();
    var first = sheet.querySelector(".prSearch"); if (first) first.focus();
    return backdrop;
  }
  function escFallback(e) { if (e.key === "Escape" && state && !tour) { e.preventDefault(); close(); } }
  function close() {
    if (!state) return;
    var s = state; state = null;
    if (s.layer) s.layer.close();
    doc.removeEventListener("keydown", escFallback, true);
    s.root.remove();
    if (s.opener && s.opener.focus && doc.contains(s.opener)) { try { s.opener.focus(); } catch (e) { /* the opener went away */ } }
  }
  function trap(e) {
    if (e.key !== "Tab" || !state) return;
    var f = Array.prototype.filter.call(state.sheet.querySelectorAll("a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex='-1'])"), function (el) { return !el.hidden && el.offsetParent !== null; });
    if (!f.length) { e.preventDefault(); return; }
    var a = f[0], z = f[f.length - 1], inside = state.sheet.contains(doc.activeElement);
    if (e.shiftKey && (!inside || doc.activeElement === a || doc.activeElement === state.sheet)) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && (!inside || doc.activeElement === z)) { e.preventDefault(); a.focus(); }
  }

  function build() {
    var sheet = state.sheet, keepQ = state.q; sheet.textContent = "";
    sheet.classList.toggle("detail", !!state.mobileDetail);
    var head = mk("div", "prHead");
    var brand = mk("div", "prBrand"); var mark = mk("span", "prMark"); mark.innerHTML = host.logo ? host.logo() : ""; brand.appendChild(mark); brand.appendChild(mk("span", "prWord", "Stick-It")); head.appendChild(brand);
    head.appendChild(mk("span", "prTitle", "Patch notes"));
    var search = doc.createElement("input"); search.type = "search"; search.className = "prSearch"; search.placeholder = "Search patches"; search.setAttribute("aria-label", "Search patches"); search.value = keepQ; search.setAttribute("data-esc-clear", "1");
    search.addEventListener("input", function () { state.q = search.value.trim(); paintList(); });
    head.appendChild(search);
    var cb = mk("button", "prClose"); cb.type = "button"; cb.setAttribute("aria-label", "Close patch notes"); cb.title = "Close";
    cb.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'; cb.addEventListener("click", close);
    head.appendChild(cb); sheet.appendChild(head);
    var chips = mk("div", "prChips"); chips.setAttribute("role", "group"); chips.setAttribute("aria-label", "Show patches about");
    ["All"].concat(H().categories).forEach(function (c) {
      var b = mk("button", "prChip", c); b.type = "button"; b.setAttribute("aria-pressed", c === state.cat ? "true" : "false");
      b.addEventListener("click", function () { state.cat = c; Array.prototype.forEach.call(chips.children, function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); paintList(); });
      chips.appendChild(b);
    });
    sheet.appendChild(chips);
    var main = mk("div", "prMain"); state.list = mk("nav", "prList"); state.list.setAttribute("aria-label", "Versions"); state.detail = mk("article", "prDetail"); state.detail.tabIndex = 0;
    main.appendChild(state.list); main.appendChild(state.detail); sheet.appendChild(main);
    paintList(); paintDetail();
  }
  function paintList() {
    var list = state.list; list.textContent = "";
    var shown = H().versions.filter(function (v) { return matches(v, state.q, state.cat); });
    if (!shown.length) { var none = mk("p", "prNone", "No patch matches."); none.setAttribute("role", "status"); list.appendChild(none); return; }
    shown.forEach(function (v) {
      var b = mk("button", "prItem" + (v.version === state.version ? " on" : "")); b.type = "button"; if (v.version === state.version) b.setAttribute("aria-current", "true");
      var st = mk("span", "prSticker", "v" + v.version); b.appendChild(st);
      var tx = mk("span", "prItemText"); tx.appendChild(mk("strong", "", v.codename));
      var meta = mk("small", "", dateLabel(v) + (v.version === host.current ? " · this version" : "")); tx.appendChild(meta);
      tx.appendChild(mk("span", "prSum", v.summary)); b.appendChild(tx);
      b.addEventListener("click", function () { select(v.version, true); });
      list.appendChild(b);
    });
  }
  function select(version, detail) { if (!state || !byVersion(version)) return; state.version = version; if (detail) state.mobileDetail = true; state.sheet.classList.toggle("detail", !!state.mobileDetail); paintList(); paintDetail(); }
  function paintDetail() {
    var v = byVersion(state.version), d = state.detail; d.textContent = "";
    if (!v) return;
    var back = mk("button", "prBack", "‹ All patches"); back.type = "button"; back.addEventListener("click", function () { state.mobileDetail = false; state.sheet.classList.remove("detail"); var it = state.list.querySelector(".prItem.on"); if (it) it.focus(); }); d.appendChild(back);
    var top = mk("div", "prDHead"); top.appendChild(mk("span", "prSticker big", "v" + v.version));
    var tt = mk("div", "prDTitle"); var h = mk("h2", "", v.codename); tt.appendChild(h);
    var meta = mk("p", "prMeta"); meta.appendChild(mk("span", "prStatus " + v.status, dateLabel(v)));
    if (v.version === host.current) meta.appendChild(mk("span", "prNow", "You are on this version"));
    v.tags.forEach(function (t) { meta.appendChild(mk("span", "prTag", t)); });
    tt.appendChild(meta); top.appendChild(tt); d.appendChild(top);
    d.appendChild(mk("p", "prSummary", v.summary));
    var acts = mk("div", "prActs");
    var rb = mk("button", "prBtn primary", v.tour ? "Replay patch tour" : "No tour for this patch"); rb.type = "button";
    if (v.tour) rb.addEventListener("click", function () { openTour(v.version); }); else { rb.disabled = true; rb.title = "This patch has no tour. Its notes are below."; }
    acts.appendChild(rb);
    var nv = mk("div", "prNav");
    var newer = mk("button", "prBtn", "‹ Newer"), older = mk("button", "prBtn", "Older ›"); newer.type = older.type = "button";
    newer.disabled = !v.newer; older.disabled = !v.older;
    newer.addEventListener("click", function () { select(v.newer, true); focusDetail(); }); older.addEventListener("click", function () { select(v.older, true); focusDetail(); });
    nv.appendChild(newer); nv.appendChild(older); acts.appendChild(nv); d.appendChild(acts);
    var body = mk("div", "prBody");
    if (v.highlights && v.highlights.length && !v.notes.some(function (s) { return /highlights/i.test(s.heading); })) {
      var hs = mk("section", "prSec"); hs.appendChild(mk("h3", "", "Highlights")); var ul = mk("ul"); v.highlights.forEach(function (x) { var li = mk("li"); inline(li, x); ul.appendChild(li); }); hs.appendChild(ul); body.appendChild(hs);
    }
    v.notes.forEach(function (s) {
      var sec = mk("section", "prSec"); sec.appendChild(mk("h3", "", s.heading)); blocks(sec, s.blocks);
      (s.sub || []).forEach(function (x) { sec.appendChild(mk("h4", "", x.heading)); blocks(sec, x.blocks); });
      body.appendChild(sec);
    });
    var tp = mk("p", "prTopWrap"), tb = mk("button", "prBtn", "↑ Back to top"); tb.type = "button";
    tb.addEventListener("click", function () { try { d.scrollTo({ top: 0, behavior: reduce() ? "auto" : "smooth" }); } catch (e) { d.scrollTop = 0; } d.focus({ preventScroll: true }); });
    tp.appendChild(tb); body.appendChild(tp); d.appendChild(body); d.scrollTop = 0;
  }
  function focusDetail() { if (state && state.detail) state.detail.focus({ preventScroll: true }); }

  // ------------------------------------------------------------------ the tour library: one modal for every patch
  function editable(t) { return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); }
  function openTour(version) {
    var v = byVersion(version);
    if (!v) return null;
    if (!v.tour || !v.tour.cards.length) { if (host.toast) host.toast("That patch has no tour. Its notes are open instead."); open({ version: version }); return null; }
    closeTour();
    var cards = v.tour.cards, i = 0, usedKey = false;
    var back = mk("div", "ptrBackdrop"), card = mk("div", "ptrCard"); card.setAttribute("role", "dialog"); card.setAttribute("aria-modal", "true"); card.setAttribute("aria-label", "Patch tour: " + v.codename); card.tabIndex = -1;
    var head = mk("div", "ptrHead"); head.appendChild(mk("span", "prSticker", "v" + v.version)); head.appendChild(mk("span", "ptrName", v.codename));
    var x = mk("button", "prClose"); x.type = "button"; x.setAttribute("aria-label", "Close the tour"); x.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    x.addEventListener("click", closeTour); head.appendChild(x); card.appendChild(head);
    var body = mk("div", "ptrBody"), dots = mk("div", "ptrDots"), ind = mk("div", "ptrIndex"); ind.setAttribute("role", "status"); ind.setAttribute("aria-live", "polite");
    var acts = mk("div", "ptrActs"), prev = mk("button", "prBtn", "Previous"), next = mk("button", "prBtn primary", "Next"), show = mk("button", "prBtn show", "Show me"), hint = mk("p", "ptrHint"); hint.hidden = true;
    prev.type = next.type = show.type = "button";
    acts.appendChild(prev); acts.appendChild(show); acts.appendChild(next);
    card.appendChild(body); card.appendChild(dots); card.appendChild(ind); card.appendChild(acts); card.appendChild(hint); back.appendChild(card); doc.body.appendChild(back);
    var layer = host.layer ? host.layer("patch-tour", function () { closeTour(); }, function () { return !!tour; }) : null;
    tour = { root: back, opener: doc.activeElement, layer: layer, version: version };
    if (layer) layer.open();
    function paint() {
      var c = cards[i]; body.textContent = "";
      var ic = mk("div", "ptrIcon"); ic.setAttribute("aria-hidden", "true"); ic.textContent = String(i + 1); body.appendChild(ic);
      body.appendChild(mk("h2", "ptrTitle", c.title)); body.appendChild(mk("p", "ptrText", c.body));
      dots.textContent = ""; for (var k = 0; k < cards.length; k++) { var d = mk("span", "ptrDot" + (k === i ? " on" : "")); d.setAttribute("aria-hidden", "true"); dots.appendChild(d); }
      ind.textContent = (i + 1) + " / " + cards.length;
      prev.disabled = i === 0; next.textContent = i === cards.length - 1 ? "Done" : "Next";
      var act = c.action && host.actions && host.actions[c.action]; show.hidden = !act; show.textContent = "Show me";
      if (usedKey) { hint.hidden = false; hint.textContent = "Enter or → Next · Backspace or ← Previous · Esc Close"; }
      if (reduce()) card.classList.add("still");
    }
    function go(d) { var n = i + d; if (n < 0) return; if (n >= cards.length) { closeTour(); return; } i = n; paint(); }
    prev.addEventListener("click", function () { go(-1); }); next.addEventListener("click", function () { go(1); });
    show.addEventListener("click", function () { var a = host.actions[cards[i].action]; closeTour(); try { if (a) a(); } catch (e) { /* the shortcut is a convenience: never fatal */ } });
    back.addEventListener("mousedown", function (e) { if (e.target === back) closeTour(); });
    card.addEventListener("keydown", function (e) {
      if (editable(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      var key = e.key;
      if (key === "Tab") { var f = Array.prototype.filter.call(card.querySelectorAll("button"), function (b) { return !b.hidden && !b.disabled; }); if (!f.length) return; var a = f[0], z = f[f.length - 1]; if (e.shiftKey && doc.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && doc.activeElement === z) { e.preventDefault(); a.focus(); } return; }
      if ((key === "Enter" || key === "ArrowRight") && !(key === "Enter" && /^BUTTON$/.test(e.target.tagName) && e.target !== next)) { e.preventDefault(); usedKey = true; go(1); }
      else if (key === "ArrowLeft" || key === "Backspace" || key === "Delete") { e.preventDefault(); usedKey = true; go(-1); }
    });
    var sx = null;
    body.addEventListener("pointerdown", function (e) { sx = e.clientX; }); body.addEventListener("pointerup", function (e) { if (sx == null) return; var dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); });
    if (!layer) doc.addEventListener("keydown", tourEsc, true);
    paint(); next.focus();
    return back;
  }
  function tourEsc(e) { if (e.key === "Escape" && tour) { e.preventDefault(); closeTour(); } }
  function closeTour() {
    if (!tour) return;
    var t = tour; tour = null;
    if (t.layer) t.layer.close(); doc.removeEventListener("keydown", tourEsc, true);
    t.root.remove();
    if (t.opener && t.opener.focus && doc.contains(t.opener)) { try { t.opener.focus(); } catch (e) { /* gone */ } }
  }

  Stick.patchReader = {
    init: function (h) { host.layer = (h && h.layer) || null; host.logo = (h && h.logo) || null; host.current = (h && h.current) || ""; host.actions = (h && h.actions) || {}; host.toast = (h && h.toast) || null; },
    open: open, close: close, openTour: openTour, closeTour: closeTour,
    isOpen: function () { return !!state; }, isTourOpen: function () { return !!tour; },
    versions: function () { return H().versions.map(function (v) { return v.version; }); },
    matches: matches
  };
})(typeof window !== "undefined" ? window : globalThis);
