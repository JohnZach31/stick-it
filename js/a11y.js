/* Shared reading preferences for the app and the legal / info pages (one small file, no dependencies).
 *   textSize: "small" | "default" | "large"   contrast: false | true   motion: "system" | "reduce"   theme: "light" (beige) | "dark"
 * The app mirrors its own light/dark choice into theme, so the legal pages open in the look the person already chose.
 * Stored on this device only (localStorage "stickit.a11y.v1"). It is applied as attributes on <html> so plain CSS can react:
 *   html[data-a11y-size], html[data-a11y-contrast="on"], html[data-a11y-motion="reduce"].
 * The legal pages build their little "Reading options" control from it; the app's Appearance section uses the same switches for
 * high-contrast text and reduced decorative motion, so a choice made in one place holds in the other.
 */
(function (root) {
  var KEY = "stickit.a11y.v1", DEFAULTS = { textSize: "default", contrast: false, motion: "system", theme: "light" };
  var SIZES = ["small", "default", "large"];
  function read() {
    var v = {};
    try { v = JSON.parse(root.localStorage.getItem(KEY) || "{}") || {}; } catch (e) { v = {}; }
    return {
      textSize: SIZES.indexOf(v.textSize) !== -1 ? v.textSize : DEFAULTS.textSize,
      contrast: v.contrast === true,
      motion: v.motion === "reduce" ? "reduce" : "system",
      theme: v.theme === "dark" ? "dark" : "light"
    };
  }
  function apply() {
    var p = read(), h = root.document && root.document.documentElement;
    if (!h) return p;
    h.setAttribute("data-a11y-size", p.textSize);
    h.setAttribute("data-a11y-theme", p.theme);
    if (p.contrast) h.setAttribute("data-a11y-contrast", "on"); else h.removeAttribute("data-a11y-contrast");
    if (p.motion === "reduce") h.setAttribute("data-a11y-motion", "reduce"); else h.removeAttribute("data-a11y-motion");
    return p;
  }
  function set(partial) {
    var p = read();
    if (partial.textSize && SIZES.indexOf(partial.textSize) !== -1) p.textSize = partial.textSize;
    if (partial.contrast !== undefined) p.contrast = !!partial.contrast;
    if (partial.theme) p.theme = partial.theme === "dark" ? "dark" : "light";
    if (partial.motion) p.motion = partial.motion === "reduce" ? "reduce" : "system";
    try { root.localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* private mode: applies for this page only */ }
    apply();
    try { root.dispatchEvent(new root.CustomEvent("stickit:a11y", { detail: p })); } catch (e) {}
    return p;
  }
  root.StickA11y = { get: read, set: set, apply: apply, KEY: KEY, SIZES: SIZES };
  apply();
})(typeof window !== "undefined" ? window : globalThis);
