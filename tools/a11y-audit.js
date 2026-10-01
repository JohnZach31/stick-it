// Paste into the browser console (or run through the browser tool) on a Stick-It page. A small, honest automated check:
// it finds controls with no accessible name, form fields with no label, images without an alt attribute, dialogs without a
// name, and positive tabindex values. It does NOT replace testing with the keyboard and a screen reader.
(function () {
  function visible(el) { return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length); }
  function name(el) {
    var l = el.getAttribute("aria-label"); if (l && l.trim()) return l.trim();
    var lb = el.getAttribute("aria-labelledby");
    if (lb) { var t = lb.split(/\s+/).map(function (id) { var n = document.getElementById(id); return n ? n.textContent : ""; }).join(" ").trim(); if (t) return t; }
    if (el.id) { var lab = document.querySelector('label[for="' + el.id + '"]'); if (lab && lab.textContent.trim()) return lab.textContent.trim(); }
    var wrap = el.closest("label"); if (wrap && wrap.textContent.trim()) return wrap.textContent.trim();
    var t2 = (el.textContent || "").trim(); if (t2) return t2;
    if (el.title) return el.title;
    if (el.placeholder) return "(placeholder only) " + el.placeholder;
    return "";
  }
  var problems = [];
  function add(kind, el, extra) { problems.push(kind + ": <" + el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : "") + "> " + (extra || "")); }
  document.querySelectorAll("button, [role=button], a[href], summary").forEach(function (el) { if (visible(el) && !name(el)) add("no accessible name", el); });
  document.querySelectorAll("input:not([type=hidden]), select, textarea").forEach(function (el) {
    if (!visible(el)) return;
    var n = name(el);
    if (!n) add("form field without a label", el); else if (n.indexOf("(placeholder only)") === 0) add("label is only a placeholder", el, n);
  });
  document.querySelectorAll("img").forEach(function (el) { if (visible(el) && !el.hasAttribute("alt")) add("img without alt attribute", el); });
  document.querySelectorAll("[role=dialog]").forEach(function (el) { if (visible(el) && !name(el)) add("dialog without a name", el); });
  document.querySelectorAll("[tabindex]").forEach(function (el) { if (parseInt(el.getAttribute("tabindex"), 10) > 0) add("positive tabindex", el); });
  var ids = {}; document.querySelectorAll("[id]").forEach(function (el) { if (ids[el.id]) add("duplicate id", el, el.id); ids[el.id] = 1; });
  return problems;
})();
