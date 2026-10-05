/* Legal pages: fills real business details from js/legal-config.js (only when the owner has set them) and shows the draft
 * banner while anything is missing. The rules live in js/legal-fill.js, which the in-app reader uses too. No analytics, no third-party requests. */
(function () {
  var L = (window.Stick && window.Stick.legal) || {};
  var page = document.body.getAttribute("data-page");
  var he = document.body.getAttribute("data-lang") === "he";
  var banner = document.getElementById("draftBanner");
  var F = window.Stick && window.Stick.legalFill;
  if (F) {
    var text = F.bannerText(page, he);
    if (banner && text) { banner.hidden = false; banner.textContent = text; }
    F.apply(document, page);
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
