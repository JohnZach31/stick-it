/* Development helpers. They exist ONLY when the page is served from localhost / 127.0.0.1 (or a host the owner has
 * deliberately listed in Stick.config.DEV_HOSTS). On any other hostname this file defines nothing: there is no
 * Stick.dev, no hidden menu, no query-string switch, and no password or IP check, because none of those is a real
 * security boundary. These helpers only change THIS browser's local state; they never touch server records.
 *
 *   Stick.dev.resetAgeGate()   forget the local age result so the "How old are you?" step shows again
 *   Stick.dev.resetConsent()   forget local mock parent-consent / child-test state
 *   Stick.dev.showAgeFlow()    open the age step now (signed-out browser)
 *
 * Server-side consent states (age_band, parental_consent_status) are changed only with SQL / the service role: see
 * docs/dev/age-flow-testing.md.
 */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  var host = (root.location && root.location.hostname) || "";
  var extra = (Stick.config && Stick.config.DEV_HOSTS) || [];
  var local = host === "localhost" || host === "127.0.0.1" || extra.indexOf(host) !== -1;
  if (!local) return;

  function drop(keys) { keys.forEach(function (k) { try { root.localStorage.removeItem(k); } catch (e) {} }); }
  function dropPrefix(prefix) {
    try { Object.keys(root.localStorage).forEach(function (k) { if (k.indexOf(prefix) === 0) root.localStorage.removeItem(k); }); } catch (e) {}
  }

  Stick.dev = {
    resetAgeGate: function () {
      drop(["stickit.age.ok", "stickit.age.blocked"]);          // blocked = the retired 24-hour block, cleared if an old browser still has it
      return "Local age state cleared. Open Sign in to see the age step again.";
    },
    resetConsent: function () {
      dropPrefix("stickit.dev.mock.");
      return "Local mock consent / child-test state cleared.";
    },
    showAgeFlow: function () {
      if (Stick.hooks && Stick.hooks.showAgeFlow) { Stick.hooks.showAgeFlow(); return "Age flow opened."; }
      return "Not available on this page.";
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
