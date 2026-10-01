/* Billing disclosure CONTRACT. Payments are NOT implemented: there is no Subscribe button anywhere in Stick-It and this file
 * does not create one. It exists so that when billing is built, a subscription call-to-action can only be drawn together
 * with the terms a person must see right next to it (price, currency, billing period, automatic renewal, trial conversion,
 * when the first charge happens, how to cancel). If any of that is missing, nothing is rendered and an error is thrown.
 *
 *   var el = Stick.billing.checkoutBlock(plan, {onSubscribe: fn});   // throws BillingDisclosureError if incomplete
 *
 * plan = { name, price: "4.99", currency: "USD", interval: "month"|"year", trialDays: 7, trialPrice: 0,
 *          firstChargeNote: "...", cancelPath: "Account settings > Plan > Manage subscription", limits: ["..."] }
 * Rules that stay true for every future paid CTA: no pre-checked boxes, no fake urgency, cancellation as easy as
 * subscribing (in the app, no e-mail/phone), and the displayed terms are recorded with the purchase.
 * See docs/legal/payments-compliance-checklist.md. */
(function (root) {
  var Stick = root.Stick = root.Stick || {};

  function BillingDisclosureError(missing) {
    this.name = "BillingDisclosureError";
    this.missing = missing;
    this.message = "Subscription terms are incomplete: " + missing.join(", ");
  }
  BillingDisclosureError.prototype = Object.create(Error.prototype);

  var INTERVALS = { month: "month", year: "year", week: "week" };
  var CURRENCY = /^[A-Z]{3}$/;

  // the list of things that must be known before a subscribe button may exist
  function problems(plan) {
    var m = [];
    if (!plan || typeof plan !== "object") return ["plan"];
    if (!String(plan.name || "").trim()) m.push("name");
    if (!/^\d+(\.\d{1,2})?$/.test(String(plan.price == null ? "" : plan.price))) m.push("price");
    if (!CURRENCY.test(String(plan.currency || ""))) m.push("currency");
    if (!INTERVALS[plan.interval]) m.push("interval");
    if (!String(plan.cancelPath || "").trim()) m.push("cancelPath");
    if (plan.trialDays != null) {
      if (!(plan.trialDays > 0)) m.push("trialDays");
      if (!String(plan.firstChargeNote || "").trim()) m.push("firstChargeNote");   // when exactly the first charge happens
    }
    return m;
  }

  function money(plan) {
    try { return new Intl.NumberFormat(undefined, { style: "currency", currency: plan.currency }).format(Number(plan.price)); }
    catch (e) { return plan.price + " " + plan.currency; }
  }

  // The sentences that must sit immediately next to the button.
  function terms(plan) {
    var bad = problems(plan);
    if (bad.length) throw new BillingDisclosureError(bad);
    var per = INTERVALS[plan.interval];
    var lines = [];
    lines.push(plan.name + " — " + money(plan) + "/" + per);
    if (plan.trialDays != null) {
      lines.push("Free for " + plan.trialDays + " day" + (plan.trialDays === 1 ? "" : "s") + ", then " + money(plan) + "/" + per + ".");
      lines.push(plan.firstChargeNote);
    }
    lines.push("Renews automatically each " + per + " until cancelled.");
    lines.push("Cancel any time from " + plan.cancelPath + ".");
    (plan.limits || []).forEach(function (l) { lines.push(l); });
    return lines;
  }

  // Returns a block with the disclosure ABOVE the button. There is deliberately no checkbox and no countdown.
  function checkoutBlock(plan, opts) {
    var lines = terms(plan);
    opts = opts || {};
    var box = document.createElement("div");
    box.className = "checkoutBlock";
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", "Subscription terms");
    lines.forEach(function (l, i) {
      var p = document.createElement(i === 0 ? "strong" : "p");
      p.textContent = l;
      box.appendChild(p);
    });
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pillBtn primary";
    btn.textContent = plan.trialDays != null ? "Start free trial" : "Subscribe";
    btn.addEventListener("click", function () { if (opts.onSubscribe) opts.onSubscribe({ plan: plan, shown: lines.slice(), shownAt: new Date().toISOString() }); });
    box.appendChild(btn);
    return box;
  }

  Stick.billing = {
    BillingDisclosureError: BillingDisclosureError,
    problems: problems,
    terms: terms,
    checkoutBlock: checkoutBlock,
    // there is no payment provider yet; code can check this instead of guessing
    enabled: false
  };
})(typeof window !== "undefined" ? window : globalThis);
