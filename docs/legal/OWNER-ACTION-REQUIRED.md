# Owner action required

Only things the code and this assistant cannot truthfully decide or do. Nothing here has been invented or filled in. **The legal pages stay DRAFT until items 1-3 below are done, every placeholder is resolved, you approve the text, and legal review has been completed or knowingly accepted.**

Known and already configured (public): operator name Jonathan Zachevsky (individual, Israel), last-updated 2026-10-01, proposed governing law State of Israel, proposed venue Tel Aviv-Jaffa district courts (subject to mandatory consumer protections; legal review recommended). **Your residential address is not recorded anywhere in this repository and must never be added to any public page, config or e-mail.**

## A. The ten decisions only you can make
1. ~~Dedicated mailbox~~ **Done 2026-10-01:** `support.stickit@gmail.com` serves support, privacy and copyright (set in `js/legal-config.js`, built into the pages). Consider later moving to a custom domain address. It does **not** by itself remove DRAFT status (`draft: true`).
2. **Whether to publish a public postal address.** Only a deliberately chosen business address or PO box (`publicPostalAddress`). Never your home. Until set, marketing e-mail cannot be sent.
3. **Approve the legal text** (English and Hebrew Terms, Privacy, Copyright, Young people, Storage, Accessibility) and remove the DRAFT status by resolving every `[OWNER INPUT REQUIRED]` / `[LEGAL REVIEW RECOMMENDED]` marker.
4. **Which language version governs** if they differ (Terms section 20).
5. **Israeli legal review** of: registration/DPO conclusions, minors and guardian consent for teens, cross-border basis, governing law and venue, liability wording, accessibility duties. See `israel-compliance-audit.md`.
6. **Supabase region** and whether you need a data-processing agreement; record it in Privacy section 10.
7. **Retention** of copyright/abuse reports and provider logs/backups.
8. **Parental consent**: decide whether to build a verified process. Until then children are guest-only (`parentConsentEnabled: false`).
9. **Accessibility coordinator** and accessibility contact (`israel-accessibility.md`).
10. **Default sharing identity** (currently shares as the display name; photo and bio off) and Google/GitHub button brand check.

## B. Do in the dashboards / terminal (secrets never go in git)
| Step | Command / place |
|---|---|
| Apply database changes | `npx supabase db push` (includes `20260930160000_age_bands.sql`). Push the new frontend **first**, then run this |
| Deploy changed functions | `npx supabase functions deploy gc-assets --no-verify-jwt` (adds abandoned-account cleanup); unsubscribe and report-copyright as before |
| ~~Schedule the clean-up job~~ | **Done and verified 2026-10-01** (daily 03:17 UTC; function deployed with `--no-verify-jwt`; Vault secret matches). If `GC_SECRET` is ever exposed, rotate it in the function secrets and in Vault together |
| Marketing e-mail (only if you will ever send any) | `UNSUBSCRIBE_SECRET`, `LEGAL_SENDER_NAME`, `LEGAL_POSTAL_ADDRESS` (public address), `UNSUBSCRIBE_PAGE_URL`, `UNSUBSCRIBE_API_URL` |
| Copyright intake (only after a real DMCA registration, if you choose one) | `COPYRIGHT_INTAKE_ENABLED=true`; `dmcaRegistered` and `copyrightFormEnabled` to `true` |
| Record a real-project network trace | Live site signed in; DevTools Network: only your Supabase project, provider avatars, your site |
| Real-project smoke test | Age step (adult, teen, child), delete a throwaway account, unsubscribe link once a sender exists |

## B2. E-mail sign-in is DEFERRED (not offered in production)
See `docs/auth/email-auth-deferred.md` for what must happen first (own domain, verified sender, SMTP, templates). The steps below are the Supabase side, for later.
1. **Authentication, Providers, Email:** make sure the Email provider is **enabled**. "Confirm email" can stay on. Leave **password** sign-in unused (the app never asks for one).
2. **Authentication, Emails (templates):** edit the **Magic Link** template **and** the **Confirm signup** template so each shows the six-digit code. Put `{{ .Token }}` in the body, for example: `Your Stick-It code is {{ .Token }}`. With the default template Supabase sends a link instead of a code, and the code screen will have nothing to type.
3. **Authentication, Providers, Email:** check **OTP length** (the app accepts 6 to 12 digits; 6 is the default) and **OTP expiry** (default one hour; shorter is fine).
4. **SMTP:** the built-in Supabase mailer is rate limited to a handful of e-mails per hour and is for testing. For real use set **Custom SMTP** (Authentication, Emails, SMTP Settings) with a sender such as `support.stickit@gmail.com` or, better, an address on your own domain. A Gmail account needs an app password for SMTP; keep it in the Supabase dashboard only.
5. **Authentication, Rate Limits:** keep e-mail sending limits low; the app also enforces a 30-second resend wait.
6. Try it once with a throwaway address on the live site: Continue with email, age step, code from the e-mail, signed in.
No code, password or token is stored by Stick-It; Supabase Auth issues and checks the code.

## C. DMCA designated agent (optional, government registration only you can do)
Israel has no DMCA-style safe harbour; registering with the U.S. Copyright Office is optional and only useful if you want U.S. safe-harbour protection. Steps and the workflow: `dmca-readiness.md`. **Nothing has been submitted.** The agent address would be public, so use a business/PO address, not your home.

## D. Before any public commercial launch
Lawyer review; `israel-payments-checklist.md` before charging money; a screen-reader and disabled-user accessibility review; confirm you are comfortable that the age step is self-declaration only.

## E. Git history
If the owner address was ever committed to this repository's history it is not rewritten automatically. The audit found no occurrence in the tracked files; if you find one elsewhere, tell me and I will propose a history-rewrite plan for you to approve first.

## F. v0.8.0 "Cut It Out": before it goes live
1. **Apply the three new migrations** (after the frontend is pushed): `npx supabase db push`. They are `20261001120000_paper_objects.sql` (strip pictures count as an object's assets), `20261001130000_premium_cosmetics.sql` (Alphabet Soup is Premium-only, checked by the database) and `20261001140000_collab.sql` (private presence channels, review states, comment summary). No function needs redeploying.
2. **Realtime policies.** If `supabase db push` printed "realtime.messages policies not created" (or failed with "must be owner of table messages"), paste `supabase/ops/realtime-policies.sql` into the dashboard SQL editor and run it once. **Check Realtime Authorization** in the Supabase dashboard (Realtime, then Policies): `realtime.messages` should list `board_channel_read` and `board_channel_write`. Then open one shared board in two browsers signed in as two different accounts and confirm that the initials appear and that a note one person is editing is blocked for the other. This path (Supabase Realtime) was tested locally only with a stand-in transport.
3. **Decide on the "Finer edges" model** (`assets/models/silueta.onnx`, 44 MB): its weights come from a reduced U²-Net distributed by the `rembg` project and the provenance is less explicit than the official u2netp. Keep it only if you and counsel are comfortable; deleting the file and the `fine` entry in `js/cutout.js` leaves a working one-model feature. See `docs/cutout/provider-evaluation.md`.
4. **Premium has no payment path.** To try Alphabet Soup on a real account, set the plan in the SQL editor: `update public.profiles set plan = 'premium' where id = '<user id>';` (only the service role / SQL editor can). Do not do this for real users until billing exists.
5. **Privacy Policy and storage notice** now mention comments, review, presence and on-device cutouts (English and Hebrew). They remain DRAFT: re-read the new rows.
6. **Real phone test**: make a cutout with a finger, two-finger pan and pinch. It is the one touch path not yet tried on a physical device.
7. Patch notes: `docs/patch-notes/0.8.0.md` stays "development" until you decide to release.
