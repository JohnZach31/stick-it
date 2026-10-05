/* Languages Stick-It is available in. One small registry the legal pages use today and the app can use later.
 *
 * `complete: true` means every page of that surface is translated in full. The chooser only ever lists complete languages, so a half-done
 * translation never appears as a choice. Adding a language is: write the pages, add a row here with complete: true.
 */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  var LANGS = [
    { code: "en", name: "English", native: "English", dir: "ltr", complete: { legal: true, app: true } },
    { code: "he", name: "Hebrew", native: "עברית", dir: "rtl", complete: { legal: true, app: false } }
  ];
  function complete(surface) { return LANGS.filter(function (l) { return l.complete && l.complete[surface]; }); }
  function byCode(code) { for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === code) return LANGS[i]; return null; }
  // The Stick-It language icon: a small sticky note with a few writing systems on it. A vector with real text glyphs (no emoji); it follows the
  // surrounding text colour, so it works in light and dark. Written for the legal reader today and reusable for a whole-app language control later.
  function iconSvg(size) {
    size = size || 20;
    return '<svg class="langIcon" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" aria-hidden="true" focusable="false">' +
      '<g transform="rotate(-4 12 12)"><path d="M3.5 3.5h13l4 4v13h-17z" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>' +
      '<path d="M16.5 3.5v4h4" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></g>' +
      '<g fill="currentColor" font-family="Sora, Heebo, Noto Sans Arabic, Noto Sans SC, system-ui, sans-serif" font-weight="700" text-anchor="middle">' +
      '<text x="8.2" y="11.4" font-size="6.4">A</text><text x="15.6" y="11.6" font-size="6.2">א</text>' +
      '<text x="8.2" y="18.6" font-size="6.2">中</text><text x="15.6" y="18.4" font-size="6.2">ع</text></g></svg>';
  }
  Stick.lang = {
    iconSvg: iconSvg,
    LANGS: LANGS,
    complete: complete,
    byCode: byCode,
    // the language of the page that is open (the <html lang> attribute), falling back to English
    current: function () { var c = (root.document && root.document.documentElement.getAttribute("lang")) || "en"; return byCode(c) || LANGS[0]; }
  };
})(typeof window !== "undefined" ? window : globalThis);
