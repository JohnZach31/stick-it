/* The page people land on from the "Unsubscribe" link in a marketing e-mail. No login. A human click on the button
 * sends the signed token to the unsubscribe function (a plain GET never changes anything, so link scanners can't
 * unsubscribe people by accident). The page and the function reveal nothing about the account. */
(function () {
  var cfg = (window.Stick && window.Stick.config) || {};
  var token = new URLSearchParams(location.search).get("t") || "";
  var msg = document.getElementById("msg"), go = document.getElementById("go");
  if (!/^[0-9a-f-]{36}\.[0-9a-f]{64}$/i.test(token)) { msg.textContent = "This link isn’t valid or has expired."; return; }
  msg.textContent = "Do you want to stop receiving marketing e-mails from Stick-It?";
  go.hidden = false;
  go.addEventListener("click", function () {
    go.disabled = true; msg.textContent = "One moment…";
    fetch(String(cfg.SUPABASE_URL || "").replace(/\/$/, "") + "/functions/v1/unsubscribe?t=" + encodeURIComponent(token), {
      method: "POST", headers: { apikey: cfg.SUPABASE_ANON_KEY || "", "content-type": "application/x-www-form-urlencoded" }, body: "List-Unsubscribe=One-Click"
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return r.ok && j.ok; }); })
      .then(function (ok) {
        if (ok) { msg.textContent = "You’ve been unsubscribed from marketing emails."; go.hidden = true; }
        else { msg.textContent = "We couldn’t complete that. The link may be invalid, or the service is busy. Please try again."; go.disabled = false; }
      }, function () { msg.textContent = "Couldn’t reach the service. Check your connection and try again."; go.disabled = false; });
  });
})();
