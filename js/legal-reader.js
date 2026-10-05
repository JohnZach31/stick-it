/* The in-app Legal reader: reads the legal documents inside Stick-It, without leaving the page.
 *
 * It renders exactly the text in js/legal-content.js, which tools/build-legal.py generates from the same Markdown drafts (docs/legal) as the
 * standalone pages in legal/. There is no second copy of any legal text to drift. Placeholders and the DRAFT notice come from js/legal-fill.js,
 * the same rules the standalone pages use.
 *
 *   Stick.legalReader.init({layer: OV.layer, logo: function(){ return svgString; }})   once, from the app
 *   Stick.legalReader.open("privacy" | "terms" | "young" | "storage" | "accessibility" | "copyright", {lang: "en" | "he"})
 *
 * Only languages whose legal documents are complete are offered (js/lang.js). Reading options (text size, contrast, motion) apply to the reader only.
 */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  var doc = root.document;
  var KEY_LANG = "stickit.legal.lang", KEY_READ = "stickit.legal.read";
  var host = { layer: null, logo: null };
  var TXT = {
    en: { title: "Legal", close: "Close", doc: "Document", language: "Language", options: "Reading options", standalone: "Open standalone page", top: "Back to top",
          size: "Text size", small: "Small", def: "Default", large: "Large", contrast: "High contrast", off: "Off", on: "On", motion: "Reduced motion", system: "System", nav: "Legal documents", cur: "(current)" },
    he: { title: "משפטי", close: "סגירה", doc: "מסמך", language: "שפה", options: "אפשרויות קריאה", standalone: "פתיחה כדף עצמאי", top: "חזרה לראש העמוד",
          size: "גודל טקסט", small: "קטן", def: "רגיל", large: "גדול", contrast: "ניגודיות גבוהה", off: "כבוי", on: "פעיל", motion: "הפחתת תנועה", system: "לפי המערכת", nav: "מסמכים משפטיים", cur: "(נוכחי)" }
  };
  var short = { en: { privacy: "Privacy", terms: "Terms", copyright: "Copyright / DMCA", young: "Young people & parents", storage: "Storage", accessibility: "Accessibility" },
                he: { privacy: "פרטיות", terms: "תנאים", copyright: "זכויות יוצרים", young: "צעירים והורים", storage: "אחסון", accessibility: "נגישות" } };

  function get(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { root.localStorage.setItem(k, v); } catch (e) { /* storage unavailable: the choice just is not remembered */ } }
  function mk(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function reduceSystem() { return !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function readPrefs() { var p = {}; try { p = JSON.parse(get(KEY_READ) || "{}") || {}; } catch (e) { p = {}; } return { size: ["small", "large"].indexOf(p.size) !== -1 ? p.size : "def", contrast: p.contrast === true, motion: p.motion === "on" ? "on" : "system" }; }
  function content() { return Stick.legalContent || { order: [], docs: {} }; }
  function langs() { var all = Stick.lang ? Stick.lang.complete("legal") : [{ code: "en", native: "English", dir: "ltr" }]; return all.filter(function (l) { return content().docs[l.code]; }); }
  function startLang() { var s = get(KEY_LANG); var ok = langs().map(function (l) { return l.code; }); return ok.indexOf(s) !== -1 ? s : "en"; }

  var state = null;                        // the open reader, if any

  function open(id, opts) {
    opts = opts || {};
    if (state) { show(id, opts.lang || state.lang); return state.root; }
    var C = content();
    if (!C.order.length) return null;
    var prefs = readPrefs();
    state = { id: C.order.indexOf(id) !== -1 ? id : C.order[0], lang: opts.lang || startLang(), prefs: prefs, opener: doc.activeElement, pop: null };
    var backdrop = mk("div", "lrBackdrop"); state.root = backdrop;
    var sheet = mk("div", "lrSheet"); sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true"); sheet.tabIndex = -1; state.sheet = sheet;
    backdrop.appendChild(sheet);
    backdrop.addEventListener("mousedown", function (e) { if (e.target === backdrop) close(); });
    sheet.addEventListener("keydown", trap);
    doc.body.appendChild(backdrop);
    state.layer = host.layer ? host.layer("legal-reader", function () { if (state && state.pop) closePop(true); else close(); }, function () { return !!state; }) : null;
    if (state.layer) state.layer.open();
    if (!host.layer) doc.addEventListener("keydown", escFallback, true);
    show(state.id, state.lang);
    var first = sheet.querySelector(".lrDoc[aria-current='page']") || sheet.querySelector("button"); if (first) first.focus();
    return backdrop;
  }
  function escFallback(e) { if (e.key === "Escape" && state) { e.preventDefault(); if (state.pop) closePop(true); else close(); } }

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
    var f = Array.prototype.filter.call(state.sheet.querySelectorAll("a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex='-1'])"), function (el) { return !el.hidden && el.offsetParent !== null; });
    if (!f.length) { e.preventDefault(); return; }
    var a = f[0], z = f[f.length - 1], inside = state.sheet.contains(doc.activeElement);
    if (e.shiftKey && (!inside || doc.activeElement === a || doc.activeElement === state.sheet)) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && (!inside || doc.activeElement === z)) { e.preventDefault(); a.focus(); }
  }

  function closePop(focusBtn) {
    if (!state || !state.pop) return;
    var p = state.pop; state.pop = null; p.panel.hidden = true; p.btn.setAttribute("aria-expanded", "false");
    if (focusBtn) p.btn.focus();
  }
  function togglePop(btn, panel) {
    if (state.pop && state.pop.btn === btn) { closePop(true); return; }
    closePop(false);
    panel.hidden = false; btn.setAttribute("aria-expanded", "true"); state.pop = { btn: btn, panel: panel };
    var f = panel.querySelector("button,input,a"); if (f) f.focus();
  }

  function applyPrefs() {
    var s = state.sheet, p = state.prefs;
    s.setAttribute("data-size", p.size); s.classList.toggle("lrContrast", !!p.contrast); s.classList.toggle("lrCalm", p.motion === "on" || reduceSystem());
  }

  // (re)draw everything that depends on the document or language
  function show(id, lang) {
    var C = content(), L = C.docs[lang] ? lang : "en", T = TXT[L], d = C.docs[L][id];
    if (!d) return;
    state.id = id; state.lang = L;
    var sheet = state.sheet; sheet.textContent = "";
    sheet.setAttribute("dir", L === "he" ? "rtl" : "ltr"); sheet.setAttribute("lang", L);
    sheet.setAttribute("aria-label", T.title + ": " + d.title);
    applyPrefs();

    // header: brand, title, tools
    var head = mk("div", "lrHead");
    var brand = mk("div", "lrBrand"); brand.setAttribute("role", "img"); brand.setAttribute("aria-label", "Stick-It");
    var mark = mk("span", "lrMark"); mark.innerHTML = host.logo ? host.logo() : ""; brand.appendChild(mark); brand.appendChild(mk("span", "lrWord", "Stick-It"));
    head.appendChild(brand);
    head.appendChild(mk("span", "lrTitle", T.title));
    var tools = mk("div", "lrTools");
    var all = langs();
    if (all.length > 1) {
      var lb = mk("button", "lrBtn"); lb.type = "button"; lb.setAttribute("aria-haspopup", "true"); lb.setAttribute("aria-expanded", "false"); lb.title = T.language;
      lb.innerHTML = Stick.lang ? Stick.lang.iconSvg(20) : ""; lb.appendChild(mk("span", "lrLbl", T.language));
      var lp = mk("div", "lrPop"); lp.hidden = true; lp.setAttribute("role", "menu"); lp.setAttribute("aria-label", T.language);
      all.forEach(function (l) {
        var b = mk("button", "lrItem" + (l.code === L ? " on" : ""), l.native); b.type = "button"; b.setAttribute("role", "menuitemradio"); b.setAttribute("aria-checked", l.code === L ? "true" : "false"); b.lang = l.code; b.dir = l.dir;
        b.addEventListener("click", function () { put(KEY_LANG, l.code); closePop(false); show(state.id, l.code); var f = state.sheet.querySelector(".lrTools .lrBtn"); if (f) f.focus(); });
        lp.appendChild(b);
      });
      lb.addEventListener("click", function () { togglePop(lb, lp); });
      var lw = mk("div", "lrToolWrap"); lw.appendChild(lb); lw.appendChild(lp); tools.appendChild(lw);
    }
    var ob = mk("button", "lrBtn lrIconBtn"); ob.type = "button"; ob.setAttribute("aria-haspopup", "true"); ob.setAttribute("aria-expanded", "false"); ob.title = T.options; ob.setAttribute("aria-label", T.options);
    ob.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
    var op = mk("div", "lrPop lrOpts"); op.hidden = true; op.setAttribute("role", "group"); op.setAttribute("aria-label", T.options);
    function seg(name, label, opts2, cur, set) {
      var fs = mk("fieldset", "lrRow"); fs.appendChild(mk("legend", "", label));
      opts2.forEach(function (o) {
        var lab = mk("label", "lrSeg"), inp = doc.createElement("input"); inp.type = "radio"; inp.name = "lr-" + name; inp.value = o[0]; inp.checked = cur === o[0];
        inp.addEventListener("change", function () { set(o[0]); });
        lab.appendChild(inp); lab.appendChild(mk("span", "", o[1])); fs.appendChild(lab);
      });
      return fs;
    }
    function save() { put(KEY_READ, JSON.stringify(state.prefs)); applyPrefs(); }
    op.appendChild(seg("size", T.size, [["small", T.small], ["def", T.def], ["large", T.large]], state.prefs.size, function (v) { state.prefs.size = v; save(); }));
    op.appendChild(seg("contrast", T.contrast, [["off", T.off], ["on", T.on]], state.prefs.contrast ? "on" : "off", function (v) { state.prefs.contrast = v === "on"; save(); }));
    op.appendChild(seg("motion", T.motion, [["system", T.system], ["on", T.on]], state.prefs.motion, function (v) { state.prefs.motion = v; save(); }));
    ob.addEventListener("click", function () { togglePop(ob, op); });
    var ow = mk("div", "lrToolWrap"); ow.appendChild(ob); ow.appendChild(op); tools.appendChild(ow);
    var sa = mk("a", "lrBtn lrLinkBtn", T.standalone); sa.href = (L === "he" ? "legal/he/" : "legal/") + d.file; sa.target = "_blank"; sa.rel = "noopener"; tools.appendChild(sa);
    var cb = mk("button", "lrBtn lrIconBtn lrClose"); cb.type = "button"; cb.title = T.close; cb.setAttribute("aria-label", T.close); cb.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    cb.addEventListener("click", close); tools.appendChild(cb);
    head.appendChild(tools);
    sheet.appendChild(head);

    // document navigation
    var nav = mk("nav", "lrNav"); nav.setAttribute("aria-label", T.nav);
    C.order.forEach(function (pid) {
      var b = mk("button", "lrDoc", short[L][pid] || C.docs[L][pid].title); b.type = "button"; if (pid === id) b.setAttribute("aria-current", "page");
      b.addEventListener("click", function () { show(pid, state.lang); var n = state.sheet.querySelector(".lrDoc[aria-current='page']"); if (n) n.focus(); });
      nav.appendChild(b);
    });
    sheet.appendChild(nav);

    // the document itself
    var body = mk("div", "lrBody"); body.tabIndex = 0; body.setAttribute("role", "region"); body.setAttribute("aria-label", d.title);
    var banner = Stick.legalFill ? Stick.legalFill.bannerText(id, L === "he") : "";
    if (banner) { var bn = mk("div", "lrBanner", banner); bn.setAttribute("role", "note"); body.appendChild(bn); }
    var art = mk("article", "lrArticle"); art.lang = L; art.dir = L === "he" ? "rtl" : "ltr"; art.innerHTML = d.html;
    if (Stick.legalFill) Stick.legalFill.apply(art, id);
    // links to the other legal documents open here; anything else behaves normally (mail and external links open outside)
    Array.prototype.forEach.call(art.querySelectorAll("a[href]"), function (a) {
      var href = a.getAttribute("href"), m = /^([a-z-]+)\.html$/.exec(href || "");
      if (m) { var target = null; C.order.forEach(function (pid) { if (C.docs[L][pid].file === href) target = pid; }); if (target) a.addEventListener("click", function (e) { e.preventDefault(); show(target, state.lang); }); }
      else if (/^https?:/.test(href)) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
    });
    var topWrap = mk("p", "lrTopWrap"), tb = mk("button", "lrTop", "↑ " + T.top); tb.type = "button";
    tb.addEventListener("click", function () { var smooth = !(state.prefs.motion === "on" || reduceSystem()); try { body.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" }); } catch (e) { body.scrollTop = 0; } body.focus({ preventScroll: true }); });
    topWrap.appendChild(tb); art.appendChild(topWrap);
    // a few tiny paper scraps in the margin: decoration only, never in the way of the text
    var decor = mk("div", "lrScraps"); decor.setAttribute("aria-hidden", "true"); decor.innerHTML = '<i class="s1"></i><i class="s2"></i><i class="s3"></i>';
    body.appendChild(art); body.appendChild(decor);
    sheet.appendChild(body);
    body.scrollTop = 0;
  }

  Stick.legalReader = {
    init: function (h) { host.layer = (h && h.layer) || null; host.logo = (h && h.logo) || null; },
    open: open, close: close, isOpen: function () { return !!state; },
    docs: function () { return content().order.slice(); }
  };
})(typeof window !== "undefined" ? window : globalThis);
