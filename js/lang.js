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
  Stick.lang = {
    LANGS: LANGS,
    complete: complete,
    byCode: byCode,
    // the language of the page that is open (the <html lang> attribute), falling back to English
    current: function () { var c = (root.document && root.document.documentElement.getAttribute("lang")) || "en"; return byCode(c) || LANGS[0]; }
  };
})(typeof window !== "undefined" ? window : globalThis);
