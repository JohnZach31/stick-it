# E-mail compliance

## What Stick-It sends today
**No e-mail of any kind.** Sign-in is by Google/GitHub (Supabase Auth's e-mail features are not used), there are no receipts (no payments), no invitation e-mails (invites are links), no newsletters. So there are currently **no marketing e-mails and no transactional e-mails** to make compliant.

## Categories (keep them separate)
| Category | Examples | Rules in Stick-It |
|---|---|---|
| Transactional / security | sign-in or security notices, an invitation the person asked to send, receipts later | Sent regardless of the marketing preference. No unsubscribe needed (but still truthful sender/subject). Must not contain promotion. |
| Marketing | product announcements, promotions, newsletters, re-engagement | Only to people who **opted in**; each message has a working one-click unsubscribe, the sender's identity and the **real postal address**; truthful subject/from. |

## What was built (foundation only; nothing sends)
- **Preference:** Account settings → Data & privacy → "Product updates by e-mail": **off by default**, never bundled with account creation. The database records `marketing_opt_in`, when it changed (`marketing_opt_in_at`) and where (`account_settings` or `unsubscribe_link`). The person cannot edit the record of consent.
- **Audience:** `marketing_audience()` (service role only) returns **only** opted-in people with an e-mail address. A sender that uses it cannot reach anyone who is off or unsubscribed.
- **Unsubscribe, no login:** `supabase/functions/unsubscribe`. POST with a signed token `<user id>.<HMAC-SHA256>` (secret `UNSUBSCRIBE_SECRET`, server-side only). RFC 8058 one-click compatible. It switches the preference off, returns only `{ok:true}`, and never reveals whose token it was or anything else. A GET never unsubscribes anyone (so link scanners do not). The human page is `unsubscribe.html` ("You've been unsubscribed from marketing emails.") and is public, with no login.
- **Template guard:** `supabase/functions/_shared/marketing-email.ts` → `buildMarketingEmail(env, message)`. It **throws** unless all of these exist: `LEGAL_POSTAL_ADDRESS` (not a placeholder), `LEGAL_SENDER_NAME`, `UNSUBSCRIBE_SECRET`, `UNSUBSCRIBE_PAGE_URL`, `UNSUBSCRIBE_API_URL`. It adds the unsubscribe link (text and HTML), the postal address, the sender identity and the `List-Unsubscribe` / `List-Unsubscribe-Post` headers; it refuses an empty or "Re:"/"Fwd:" subject. A mis-configured deployment therefore **cannot** produce a marketing message without an unsubscribe link or postal address. Tests: `supabase/tests/functions.test.mjs`, `run-tests.mjs` (section K).

## What is NOT built
A sender: no e-mail provider is connected and no job sends anything. Any future sender must (1) read the audience only through `marketing_audience()`, (2) build every message with `buildMarketingEmail`, (3) record sends if the owner wants an audit trail.

## Owner action
1. Decide the **sender's legal name and real postal address** (`LEGAL_SENDER_NAME`, `LEGAL_POSTAL_ADDRESS`). Do not use a P.O. box or a made-up address unless the rules of your jurisdiction allow it. [LEGAL REVIEW: CAN-SPAM, PECR/GDPR e-privacy, CASL, etc.]
2. Set the secrets: `npx supabase secrets set UNSUBSCRIBE_SECRET=<long random string>` (SECRET) and the other four values, and deploy `unsubscribe`.
3. Fill `postalAddress`, `operatorName`, `privacyEmail` in `js/legal-config.js`.
4. Choose an e-mail provider and a consent wording; keep transactional mail on a separate stream.

## Update 2026-10-01
Marketing e-mail needs a **public** postal address (never a private/home address). Without one the guard refuses to build any message; the placeholder `[PUBLIC POSTAL ADDRESS NOT CONFIGURED]` is refused too. Israeli rules (Communications Law s.30A) are summarised in `israel-marketing-email.md`. Only adults who opted in can be in the audience.
