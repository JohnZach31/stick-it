# Owner action required

Only things the code and this assistant cannot truthfully decide or do. Nothing here has been invented or filled in.

## A. Decide and provide (then fill `js/legal-config.js` and rebuild the legal pages with `python tools/build-legal.py`)
1. **Who operates Stick-It**: legal name of the person or company; trading name if different.
2. **A real physical mailing address** (needed in the Privacy Policy, the DMCA registration, and every marketing e-mail).
3. **Contact e-mail addresses**: support, privacy/data requests, copyright notices (a monitored mailbox each).
4. **Who may use Stick-It**: confirm the minimum age (`AGE_MIN_YEARS`, currently 13 in `index.html`) and the countries you serve, with legal advice. The age screen is one control, not compliance with children's-privacy law.
5. **Governing law and disputes** for the Terms (no jurisdiction is chosen), and the liability / warranty wording (marked `[LEGAL REVIEW]`).
6. **Legal bases and data-subject rights** wording for the Privacy Policy for the regions you serve (GDPR / UK GDPR / US state laws); data-transfer mechanism; where the Supabase project is hosted; whether you need a data-processing agreement with Supabase.
7. **Retention**: how long to keep copyright and abuse reports; provider log/backup retention for your Supabase plan.
8. **Default sharing identity**: currently a new account shares **as its name** (photo and bio off). Say if you prefer anonymous-by-default.
9. **Brand marks**: confirm the Google and GitHub sign-in buttons follow their brand guidelines.

## B. Do in the dashboards / terminal (secrets never go in git)
| Step | Command / place |
|---|---|
| Apply the database changes | `npx supabase db push` (applies `20260930150000_legal_compliance.sql`). **Order: push the new frontend first, then run this.** The new site tolerates a project without the migration; the old site would not let existing accounts create boards after it |
| Deploy the new functions | `npx supabase functions deploy unsubscribe --no-verify-jwt` and `npx supabase functions deploy report-copyright --no-verify-jwt`; redeploy `delete-account` is **not** needed |
| Schedule the clean-up job | Call `gc-assets` daily with header `x-cron-secret: <GC_SECRET>` (Supabase cron or any scheduler). Until then deleted notes and unused files are not purged |
| Marketing e-mail (only if you will send any) | `supabase secrets set UNSUBSCRIBE_SECRET=<long random>` (SECRET), `LEGAL_POSTAL_ADDRESS`, `LEGAL_SENDER_NAME`, `UNSUBSCRIBE_PAGE_URL=https://johnzach31.github.io/stick-it/unsubscribe.html`, `UNSUBSCRIBE_API_URL=https://<ref>.supabase.co/functions/v1/unsubscribe` |
| Copyright intake (only after DMCA registration) | `supabase secrets set COPYRIGHT_INTAKE_ENABLED=true`; set `dmcaRegistered` and `copyrightFormEnabled` to `true` in `js/legal-config.js` |
| Record a real-project network trace | Open the live site signed in, DevTools → Network, confirm only your Supabase project, `*.googleusercontent.com`/`avatars.githubusercontent.com` (if you kept a provider photo) and your own site |
| Real-project smoke test of the new flows | Age screen (adult and under-age), delete a **throwaway** account, sign out of all devices, unsubscribe link once a sender exists |

## C. DMCA designated agent (government registration: only you can do this)
1. Decide the service provider's legal name and street address.
2. Decide who the designated agent is (a person or an organization/role).
3. Prepare: provider legal name; provider street address; alternate names/URLs/app names ("Stick-It", the site address); agent name/organization; agent mailing address; phone; e-mail.
4. Create / log in to your account in the U.S. Copyright Office **DMCA Designated Agent Directory**.
5. Submit the electronic designation.
6. Pay the current filing fee.
7. Publish the **same** details on Stick-It: fill `dmcaAgent`, `operatorName`, `postalAddress`, `copyrightEmail` in `js/legal-config.js`, set `dmcaRegistered: true`, rebuild/push.
8. Keep the website and the Copyright Office record identical and current.
9. Renew the designation within the required period.
Details and the takedown workflow: `docs/legal/dmca-readiness.md`. **Nothing has been submitted for you.**

## D. Before any public commercial launch
- Have a lawyer review the Privacy Policy, Terms, DMCA text, age screen and the marketing/e-mail rules for your regions.
- Before charging money: `payments-compliance-checklist.md` (price display, auto-renewal, cancellation, refunds, taxes).
- A screen-reader / disabled-user accessibility review (`accessibility.md` lists the known gaps).
