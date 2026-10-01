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

## C. DMCA designated agent (optional, government registration only you can do)
Israel has no DMCA-style safe harbour; registering with the U.S. Copyright Office is optional and only useful if you want U.S. safe-harbour protection. Steps and the workflow: `dmca-readiness.md`. **Nothing has been submitted.** The agent address would be public, so use a business/PO address, not your home.

## D. Before any public commercial launch
Lawyer review; `israel-payments-checklist.md` before charging money; a screen-reader and disabled-user accessibility review; confirm you are comfortable that the age step is self-declaration only.

## E. Git history
If the owner address was ever committed to this repository's history it is not rewritten automatically. The audit found no occurrence in the tracked files; if you find one elsewhere, tell me and I will propose a history-rewrite plan for you to approve first.
