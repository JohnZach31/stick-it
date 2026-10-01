/* Legal pages: fills real business details from js/legal-config.js (only when the owner has set them) and shows the draft
 * banner while anything is missing. No analytics, no third-party requests. */
(function () {
  var L = (window.Stick && window.Stick.legal) || {};
  var page = document.body.getAttribute("data-page");
  var missing = L.missing ? L.missing() : ["operatorName"];
  var he = document.body.getAttribute("data-lang") === "he";
  var banner = document.getElementById("draftBanner");
  var notFinal = missing.length > 0 || (page === "copyright" && !L.dmcaRegistered);
  if (banner && notFinal) {
    banner.hidden = false;
    banner.textContent = he
      ? (page === "copyright" && !L.dmcaRegistered
        ? "דף לפיתוח בלבד. לא נרשם סוכן DMCA והפרטים בדף הם מצייני מקום. אין להסתמך על הדף."
        : "טיוטה. הטקסט לא נבדק על ידי עורך דין ואינו סופי; פריטים מסומנים עדיין דורשים פרטים מהבעלים.")
      : (page === "copyright" && !L.dmcaRegistered
        ? "Development-only page. No DMCA designated agent has been registered yet, and the details below are placeholders. Do not rely on this page."
        : "Draft. This text has not been finalised or reviewed by a lawyer, and highlighted items still need the owner's details.");
  }

  // replace a highlighted placeholder with the real value when we have one
  var map = [
    [/privacy e-?mail/i, "privacyEmail"], [/support e-?mail/i, "supportEmail"], [/security contact/i, "privacyEmail"], [/copyright e-?mail/i, "copyrightEmail"],
    [/דוא"ל פרטיות|איש קשר לאבטחה/, "privacyEmail"], [/דוא"ל תמיכה|דוא"ל נגישות/, "supportEmail"], [/דוא"ל זכויות יוצרים/, "copyrightEmail"],
    [/legal name of the (person or company|operator)/i, "operatorName"]
  ];
  // [PUBLIC POSTAL ADDRESS NOT CONFIGURED] is replaced ONLY by a deliberately configured public address; never anything else.
  if (L.publicPostalAddress) map.push([/PUBLIC POSTAL ADDRESS NOT CONFIGURED|כתובת דואר ציבורית לא הוגדרה/, "publicPostalAddress"]);
  Array.prototype.forEach.call(document.querySelectorAll("mark.todo"), function (m) {
    var t = m.textContent;
    if (/,/.test(t.replace(/^\[[^:]*:/, ""))) return;               // combined placeholders stay visible
    for (var i = 0; i < map.length; i++) {
      if (map[i][0].test(t) && L[map[i][1]]) { m.replaceWith(document.createTextNode(L[map[i][1]])); return; }
    }
  });

  // the registered agent table (copyright page) shows real values only once registered
  if (page === "copyright" && L.dmcaRegistered && L.dmcaAgent) {
    var rows = { "Service provider": L.operatorName, "Name / role": L.dmcaAgent.name, "Organization": L.dmcaAgent.organization,
                 "Mailing address": L.dmcaAgent.address, "Telephone": L.dmcaAgent.phone, "E-mail": L.dmcaAgent.email };
    Array.prototype.forEach.call(document.querySelectorAll("tbody tr"), function (tr) {
      var k = tr.cells[0] && tr.cells[0].textContent.trim();
      if (k && rows[k] && tr.cells[1]) tr.cells[1].textContent = rows[k];
    });
  }

  // complaint form: only when registered AND switched on
  var form = document.getElementById("copyrightForm");
  if (form && L.dmcaRegistered && L.copyrightFormEnabled) form.hidden = false;
  var f = document.getElementById("cfForm");
  if (f) f.addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = document.getElementById("cfMsg");
    var cfg = (window.Stick && window.Stick.config) || {};
    var body = { name: val("cfName"), email: val("cfEmail"), address: val("cfAddr"), work: val("cfWork"), url: val("cfUrl"),
                 goodFaith: document.getElementById("cfGood").checked, accuracy: document.getElementById("cfAcc").checked, signature: val("cfSig") };
    if (!body.name || !body.email || !body.work || !body.url || !body.signature || !body.goodFaith || !body.accuracy) { msg.textContent = "Please complete every required field and both statements."; return; }
    msg.textContent = "Sending…";
    fetch(String(cfg.SUPABASE_URL || "").replace(/\/$/, "") + "/functions/v1/report-copyright", { method: "POST", headers: { "content-type": "application/json", apikey: cfg.SUPABASE_ANON_KEY || "" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok && j.ok, status: r.status }; }); })
      .then(function (r) { msg.textContent = r.ok ? "Thank you. Your notice was received." : (r.status === 503 ? "Notices can't be accepted through this form right now." : "Something went wrong. Please try again."); if (r.ok) f.reset(); },
            function () { msg.textContent = "Couldn't send. Check your connection and try again."; });
  });
  function val(id) { return (document.getElementById(id).value || "").trim(); }
})();
