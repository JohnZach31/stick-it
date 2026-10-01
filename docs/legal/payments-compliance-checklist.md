# Payments compliance checklist (future)

**Status: payments are not implemented.** There is no payment provider, no Subscribe or Upgrade button, no price shown anywhere, and the Plan row in Account settings says "Premium is coming later. Nothing to buy yet." This document lists what must be decided and built **before** any paid feature launches. No refund policy is invented here.

## Decisions the owner must make (and record)
| Topic | Decision needed |
|---|---|
| Billing interval(s) | monthly / yearly / both |
| Price and currency | per region? tax-inclusive or exclusive? |
| Free trial | yes/no, length, whether a card is taken up front, what the price is after |
| Renewal | automatic until cancelled? how and when the person is reminded |
| Cancellation | takes effect at end of period or immediately? (must be doable **in the app**) |
| Refunds | rules, time limits, statutory rights in each region (some regions give withdrawal rights) |
| Taxes | VAT / sales tax registration, who collects, invoices |
| Downgrade | what happens to boards/storage over the free limits (the server already enforces limits; define the user experience and any grace period) |
| Failed payments | retry schedule, grace period, notice, what is restricted and when |
| Regional consumer law | review of auto-renewal, cooling-off and price-display rules in the countries served |
| Processor | Stripe or other; a data-processing agreement; PCI scope (use hosted checkout so card data never touches Stick-It) |

## Hard requirements for the frontend (contract, enforced in code)
`js/billing.js` provides `Stick.billing.checkoutBlock(plan)`. It **refuses to render** (throws `BillingDisclosureError`) unless the plan has a name, price, ISO currency, billing interval, and cancellation path (and, for trials, the trial length and a statement of when the first charge happens). The block shows, **immediately above the button**:

```
Premium — $X/month
Renews automatically each month until cancelled.
Cancel any time from Account settings > Plan > Manage subscription.
[Subscribe]
```
and for a trial:
```
Free for 7 days, then $X/month.
<when the first charge happens>
Renews automatically each month until cancelled.
Cancel any time from Account settings > Plan > Manage subscription.
[Start free trial]
```
Rules: no pre-checked boxes; no countdowns or fake urgency; no hidden fees (the displayed price is what is charged, or says what is added); the terms are not buried in the Terms of Service. **Do not launch a payment flow until this is wired to the real purchase button.**

## Record of what was shown (build with the backend, not before)
A `subscription_consents` record per purchase: user id, plan, displayed price, currency, interval, trial terms, the exact lines shown, timestamp, Terms/Privacy version shown, checkout session id. Do not create fake rows before payments exist.

## Cancellation (requirement)
Account settings → Plan → Manage subscription / Cancel. Not by e-mail, phone or an unrelated page. Cancelling must be as easy as subscribing; confirm what happens next (access until period end, no further charges) on screen and by receipt e-mail.

## Before launch
Legal review of Terms section 10, Privacy Policy (payment data processor), refund text, tax setup, test purchases and cancellations in the provider's test mode.
