/* The ONE place the owner's real business details live. Everything on the legal pages and in the app that needs a
 * name, address or contact reads it from here.
 *
 * EVERYTHING IN THIS FILE IS PUBLIC (it ships to every visitor and is printed on the legal pages).
 * DO NOT put invented values here. An empty string means "not decided yet": the legal pages then show a visible
 * draft notice, and nothing in the app pretends otherwise. See docs/legal/OWNER-ACTION-REQUIRED.md.
 */
(function (root) {
  var Stick = root.Stick = root.Stick || {};

  var legal = {
    operatorName: "",            // legal name of the person or company that runs Stick-It  [OWNER INPUT REQUIRED]
    tradingName: "Stick-It",     // the name shown to users
    supportEmail: "",            // [OWNER INPUT REQUIRED]
    privacyEmail: "",            // for privacy / data requests  [OWNER INPUT REQUIRED]
    copyrightEmail: "",          // for copyright notices  [OWNER INPUT REQUIRED]
    postalAddress: "",           // real physical mailing address (also required in every marketing e-mail)  [OWNER INPUT REQUIRED]
    jurisdiction: "",            // governing law / courts, only if chosen with legal advice  [OWNER INPUT REQUIRED]
    dmcaAgent: { name: "", organization: "", address: "", phone: "", email: "" },   // as registered with the U.S. Copyright Office  [OWNER INPUT REQUIRED]
    dmcaRegistered: false,       // set to true ONLY after the Copyright Office has accepted the designation
    copyrightFormEnabled: false, // show the copyright complaint form (also needs COPYRIGHT_INTAKE_ENABLED on the server)
    termsVersion: "draft-1",
    privacyVersion: "draft-1"
  };

  // what is still missing before the pages could be called final
  legal.missing = function () {
    var m = [];
    ["operatorName", "supportEmail", "privacyEmail", "copyrightEmail", "postalAddress"].forEach(function (k) { if (!String(legal[k] || "").trim()) m.push(k); });
    return m;
  };
  legal.isComplete = function () { return legal.missing().length === 0; };

  Stick.legal = legal;
})(typeof window !== "undefined" ? window : globalThis);
