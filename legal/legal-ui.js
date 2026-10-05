/* Legal pages: a language chooser (globe) and reading options. Both are plain buttons that open small panels; without scripts the
 * page still shows the ordinary language link and reads fine. Needs js/a11y.js and js/lang.js. Nothing is sent anywhere. */
(function () {
  var A = window.StickA11y, LG = window.Stick && window.Stick.lang;
  var he = document.documentElement.getAttribute("lang") === "he";
  var T = he
    ? { language: "שפה", options: "אפשרויות קריאה", size: "גודל טקסט", small: "קטן", def: "רגיל", large: "גדול", contrast: "ניגודיות גבוהה", motion: "פחות תנועה", theme: "מראה", beige: "בז׳", dark: "כהה", close: "סגירה", current: "(נוכחי)" }
    : { language: "Language", options: "Reading options", size: "Text size", small: "Small", def: "Default", large: "Large", contrast: "High contrast", motion: "Reduce motion", theme: "Appearance", beige: "Beige", dark: "Dark", close: "Close", current: "(current)" };
  var nav = document.querySelector(".top nav");
  if (!nav) return;
  var tools = document.createElement("div"); tools.className = "legalTools";
  var open = null;                                           // the one panel that is open

  function closeOpen(focus) { if (!open) return; var o = open; open = null; o.panel.hidden = true; o.btn.setAttribute("aria-expanded", "false"); if (focus) o.btn.focus(); }
  function toggle(btn, panel) {
    if (open && open.btn === btn) { closeOpen(true); return; }
    closeOpen(false);
    panel.hidden = false; btn.setAttribute("aria-expanded", "true"); open = { btn: btn, panel: panel };
    var first = panel.querySelector("a,button,input"); if (first) first.focus();
  }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  function toolButton(label, svg, id) {
    var b = mk("button", "toolBtn"); b.type = "button"; b.id = id; b.setAttribute("aria-haspopup", "true"); b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-controls", id + "Panel");
    b.innerHTML = svg; var s = mk("span", "toolLbl", label); b.appendChild(s); b.title = label; return b;
  }

  // ---- the globe: only languages whose legal pages are complete
  var langs = LG ? LG.complete("legal") : [];
  if (langs.length > 1) {
    var globe = LG.iconSvg ? LG.iconSvg(20) : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>';
    var gb = toolButton(T.language, globe, "langBtn"), gp = mk("div", "toolPanel"); gp.id = "langBtnPanel"; gp.hidden = true; gp.setAttribute("role", "menu"); gp.setAttribute("aria-label", T.language);
    var cur = LG.current().code, other = document.querySelector(".langSwitch");
    langs.forEach(function (l) {
      var isCur = l.code === cur, a = mk(isCur ? "span" : "a", "langItem" + (isCur ? " on" : ""));
      a.setAttribute("role", "menuitem"); a.lang = l.code; a.dir = l.dir;
      a.textContent = l.native; if (isCur) { a.setAttribute("aria-current", "true"); a.appendChild(mk("small", "", " " + T.current)); }
      else if (other && other.getAttribute("hreflang") === l.code) a.href = other.getAttribute("href");
      else a.href = "#";
      gp.appendChild(a);
    });
    gb.addEventListener("click", function () { toggle(gb, gp); });
    tools.appendChild(gb); tools.appendChild(gp);
    if (other) other.remove();
  }

  // ---- reading options
  if (A) {
    var gear = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>';
    var rb = toolButton(T.options, gear, "readBtn"), rp = mk("div", "toolPanel readPanel"); rp.id = "readBtnPanel"; rp.hidden = true; rp.setAttribute("role", "group"); rp.setAttribute("aria-label", T.options);
    function seg(name, label, opts, get, set) {
      var f = mk("fieldset", "readRow"), lg = mk("legend", "", label); f.appendChild(lg);
      opts.forEach(function (o) {
        var id = "ro-" + name + "-" + o[0], lab = mk("label", "segOpt"), inp = document.createElement("input");
        inp.type = "radio"; inp.name = "ro-" + name; inp.value = o[0]; inp.id = id; inp.checked = get() === o[0];
        inp.addEventListener("change", function () { set(o[0]); });
        lab.appendChild(inp); lab.appendChild(mk("span", "", o[1])); f.appendChild(lab);
      });
      return f;
    }
    function sw(label, get, set) {
      var lab = mk("label", "readSwitch"), inp = document.createElement("input"); inp.type = "checkbox"; inp.checked = get();
      inp.addEventListener("change", function () { set(inp.checked); });
      lab.appendChild(inp); lab.appendChild(mk("span", "", label)); return lab;
    }
    rp.appendChild(seg("size", T.size, [["small", T.small], ["default", T.def], ["large", T.large]], function () { return A.get().textSize; }, function (v) { A.set({ textSize: v }); }));
    rp.appendChild(seg("theme", T.theme, [["light", T.beige], ["dark", T.dark]], function () { return A.get().theme; }, function (v) { A.set({ theme: v }); }));
    rp.appendChild(sw(T.contrast, function () { return A.get().contrast; }, function (v) { A.set({ contrast: v }); }));
    rp.appendChild(sw(T.motion, function () { return A.get().motion === "reduce"; }, function (v) { A.set({ motion: v ? "reduce" : "system" }); }));
    rb.addEventListener("click", function () { toggle(rb, rp); });
    tools.appendChild(rb); tools.appendChild(rp);
  }

  nav.insertAdjacentElement("afterend", tools);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && open) { e.preventDefault(); closeOpen(true); } });
  document.addEventListener("mousedown", function (e) { if (open && !tools.contains(e.target)) closeOpen(false); });
  document.addEventListener("focusin", function (e) { if (open && !tools.contains(e.target)) closeOpen(false); });
})();
