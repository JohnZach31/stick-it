/* The ONE place the public legal/business details live. Everything on the legal pages and in the app that needs a name or a
 * contact reads it from here (or from the generated legal pages, which are built from docs/legal).
 *
 * EVERYTHING IN THIS FILE IS PUBLIC (it ships to every visitor). Therefore:
 *   - NEVER put a home or other private address here. The owner's residential address is private and is not recorded anywhere
 *     in this repository.
 *   - null / "" means "not decided yet". Nothing in the app invents a value; the legal pages keep a visible DRAFT notice until
 *     the required contact fields are filled in and the owner approves publication (see docs/legal/OWNER-ACTION-REQUIRED.md).
 */
(function (root) {
  var Stick = root.Stick = root.Stick || {};

  var legal = {
    operatorName: "Jonathan Zachevsky",     // the individual who operates Stick-It (no company has been formed or is claimed)
    operatorCountry: "Israel",
    tradingName: "Stick-It",
    lastUpdated: "2026-10-01",
    governingLaw: "State of Israel",                          // PROPOSED: Israeli legal review recommended
    proposedVenue: "Tel Aviv-Jaffa district, Israel",         // PROPOSED: subject to mandatory consumer rules; Israeli legal review recommended

    // a deliberately chosen PUBLIC business/mailing address (office, PO box, agent), only if one becomes legally required.
    // Not configured. Never the owner's home address.
    publicPostalAddress: null,

    // one dedicated Stick-It mailbox may serve all three at first; not chosen yet, so nothing is invented
    supportEmail: null,
    privacyEmail: null,
    copyrightEmail: null,

    dmcaAgent: { name: "", organization: "", address: "", phone: "", email: "" },   // as registered with the U.S. Copyright Office (not done)
    dmcaRegistered: false,        // true ONLY after the Copyright Office has accepted a designation
    copyrightFormEnabled: false,  // also needs COPYRIGHT_INTAKE_ENABLED on the server

    parentConsentEnabled: false,  // true ONLY when a legally adequate, verified parent/guardian approval mechanism is live
    termsVersion: "2026-10-01-draft",
    privacyVersion: "2026-10-01-draft"
  };

  // contact fields still needed before the DRAFT notice may be removed
  legal.missing = function () {
    var m = [];
    ["supportEmail", "privacyEmail", "copyrightEmail"].forEach(function (k) { if (!String(legal[k] || "").trim()) m.push(k); });
    return m;
  };
  legal.isComplete = function () { return legal.missing().length === 0; };

  Stick.legal = legal;
})(typeof window !== "undefined" ? window : globalThis);
