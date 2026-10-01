# Payments checklist (Israel) - draft, nothing is live

Stick-It has **no paid plan and takes no payment.** Do not launch billing until each item is decided with counsel. **UNVERIFIED: statute details need confirmation.**

| Topic | Point to check |
|---|---|
| Consumer Protection Law 5741-1981 | Prices shown clearly and including VAT for consumers; no misleading claims |
| **Distance transactions** (ss.14C-14D) | Written disclosure of the key terms before purchase; right to cancel within 14 days of the transaction or receipt of the disclosure, with an exception for some digital services already supplied; cancellation fees capped |
| **Recurring / automatic renewal** | Clear disclosure of renewal, price and cancellation route before signing up; easy online cancellation; reminder before renewal where required |
| Tax | VAT registration/invoicing as an individual or business; an invoice or receipt for each payment |
| Payment processing | Use a licensed processor (card data never touches Stick-It); record the processor as a sub-processor in the inventory |
| Refunds | Written policy shown next to the button |
| Minors | No purchases by under-18s without a parent/guardian; billing off for teens and children |
| Hebrew | Disclosure in Hebrew for Israeli consumers |

The app already contains a disclosure-contract scaffold (`js/billing.js`) that refuses to enable checkout unless price, period, renewal, cancellation and refund text are all provided. It is not enabled.
