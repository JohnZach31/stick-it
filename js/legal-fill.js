/* Legal text fill-in rules, shared by the standalone legal pages and the in-app Legal reader (so they can never disagree):
 *   bannerText(page, he)  the DRAFT notice that applies (or "" when nothing is unresolved)
 *   apply(root, page)     replaces highlighted placeholders with real values from js/legal-config.js, only when the owner has set them.
 * Nothing here invents a value. */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  function L() { return Stick.legal || {}; }
  function bannerText(page, he) {
    var l = L(), missing = l.missing ? l.missing() : ["operatorName"];
    var notFinal = l.draft !== false || missing.length > 0 || (page === "copyright" && !l.dmcaRegistered);
    if (!notFinal) return "";
    if (page === "copyright" && !l.dmcaRegistered) return he
      ? "דף לפיתוח בלבד. לא נרשם סוכן DMCA והפרטים בדף הם מצייני מקום. אין להסתמך על הדף."
      : "Development-only page. No DMCA designated agent has been registered yet, and the details below are placeholders. Do not rely on this page.";
    return he
      ? "טיוטה. הטקסט לא נבדק על ידי עורך דין ואינו סופי; פריטים מסומנים עדיין דורשים פרטים מהבעלים."
      : "Draft. This text has not been finalised or reviewed by a lawyer, and highlighted items still need the owner's details.";
  }
  function apply(scope, page) {
    var l = L();
    var map = [
      [/privacy e-?mail/i, "privacyEmail"], [/support e-?mail/i, "supportEmail"], [/security contact/i, "privacyEmail"], [/copyright e-?mail/i, "copyrightEmail"],
      [/דוא"ל פרטיות|איש קשר לאבטחה/, "privacyEmail"], [/דוא"ל תמיכה|דוא"ל נגישות/, "supportEmail"], [/דוא"ל זכויות יוצרים/, "copyrightEmail"],
      [/legal name of the (person or company|operator)/i, "operatorName"]
    ];
    // [PUBLIC POSTAL ADDRESS NOT CONFIGURED] is replaced ONLY by a deliberately configured public address; never anything else.
    if (l.publicPostalAddress) map.push([/PUBLIC POSTAL ADDRESS NOT CONFIGURED|כתובת דואר ציבורית לא הוגדרה/, "publicPostalAddress"]);
    Array.prototype.forEach.call(scope.querySelectorAll("mark.todo"), function (m) {
      var t = m.textContent;
      if (/,/.test(t.replace(/^\[[^:]*:/, ""))) return;               // combined placeholders stay visible
      for (var i = 0; i < map.length; i++) {
        if (map[i][0].test(t) && l[map[i][1]]) { m.replaceWith(scope.ownerDocument ? scope.ownerDocument.createTextNode(l[map[i][1]]) : document.createTextNode(l[map[i][1]])); return; }
      }
    });
    // the registered agent table (copyright page) shows real values only once registered
    if (page === "copyright" && l.dmcaRegistered && l.dmcaAgent) {
      var rows = { "Service provider": l.operatorName, "Name / role": l.dmcaAgent.name, "Organization": l.dmcaAgent.organization,
                   "Mailing address": l.dmcaAgent.address, "Telephone": l.dmcaAgent.phone, "E-mail": l.dmcaAgent.email };
      Array.prototype.forEach.call(scope.querySelectorAll("tbody tr"), function (tr) {
        var k = tr.cells[0] && tr.cells[0].textContent.trim();
        if (k && rows[k] && tr.cells[1]) tr.cells[1].textContent = rows[k];
      });
    }
  }
  Stick.legalFill = { bannerText: bannerText, apply: apply };
})(typeof window !== "undefined" ? window : globalThis);
