# Legal risk report

Scope: the Stick-It repository at this commit. **This report does not say that everything is resolved.** It separates what was changed in code, what was written down, what only the owner can decide or do, what does not currently apply, and what needs a professional.

## FIXED IN CODE
| # | Item | What changed | Evidence |
|---|---|---|---|
| 19 | Google Fonts requests | **All 82 font families self-hosted** (`assets/fonts/`, WOFF2, per-family licence files, only supported scripts/weights). `fonts.googleapis.com`/`fonts.gstatic.com` removed from `index.html` and `404.html` | Browser: 0 requests to either host; Latin, Hebrew, Cyrillic, Arabic, CJK files load from the own origin; `billing.test.mjs` asserts no Google Fonts reference in any page |
| 8 | Third-party scripts | `html2canvas` is now self-hosted (was cdnjs); the Google Identity script (`accounts.google.com/gsi/client`, loaded on every visit, unused with the backend) **removed** | Guest first load contacts **only the own origin** |
| 37 | CSP | A Content-Security-Policy on every page (see `csp.md`); no remote scripts/styles/fonts/frames | Tested in browser; billing test asserts presence |
| 17/21 | Age screen | Neutral birth-month/year screen **before** Google and GitHub; nothing stored but a timestamp; under-age → no account (and an account made through a bypass is deleted); **server refuses boards, uploads, share links, memberships and bio/username until attested** | `run-tests.mjs` section K (+ mutation), `client.test.mjs`, browser run of all three paths |
| 32 | Signup acknowledgement | "By creating an account, you agree to the Terms and acknowledge the Privacy Policy." with links; not combined with marketing consent | Browser |
| 6/39 | Marketing consent | Separate, **off by default** switch with when/where recorded; the record cannot be edited by the user | Tests |
| 18/40/41 | Marketing e-mail | Unsubscribe endpoint (signed token, no login, one-click, reveals nothing); suppression-safe audience function; a template guard that **refuses** to build a message without an unsubscribe link and a real postal address | `functions.test.mjs`, `run-tests.mjs` |
| 24/25 | Subscription terms beside the button | `js/billing.js` contract: no button without price, currency, period, auto-renewal, trial terms and cancel path rendered immediately above it; no checkbox | `billing.test.mjs` |
| 30 | Copyright reports | `copyright_reports` table + `report-copyright` function (OFF until enabled) | Tests |
| 22 | Export | Now includes account, profile, preferences, memberships, share-link list (no secrets) and states what is **not** included | Browser |
| 23 | Deletion | Audited end to end and documented; tests extended (invites, settings, marketing preference) | `data-export-and-deletion.md` |
| 13–15, 42, 43 | Accessibility | Keyboard note creation (`N`), dialog focus trap/restore, focus rings, skip link, labels, contrast fixes, reduced motion, honest image alt text | `accessibility.md` |
| 11/12 | Claims | Removed "premium coming soon" promises; narrowed provider-permission wording | `ux-and-marketing-audit.md` |
| 34 | Public sharing warning | The first line of every share dialog now says plainly who can see it | Browser |
| 36 | Logging | No `console.*` and no content logging in functions or scripts (verified by search) | |
| 21 | Session replay | **Not present**, none added | Repository search; test asserts no analytics/replay SDK |

## DOCUMENTED (drafts; not final)
`privacy-policy-draft.md`, `terms-draft.md`, `copyright-page-draft.md` (+ built pages `legal/privacy.html`, `terms.html`, `copyright.html`, all with a visible DRAFT banner and highlighted placeholders), `00-data-and-third-party-inventory.md`, `01-cookies-and-storage.md`, `email-compliance.md`, `age-gate.md`, `data-export-and-deletion.md`, `payments-compliance-checklist.md`, `dmca-readiness.md`, `third-party-licenses.md`, `docs/fonts-licenses.md`, `csp.md`, `accessibility.md`, `ux-and-marketing-audit.md`, `network-privacy-check.md`.

## OWNER ACTION REQUIRED
See `OWNER-ACTION-REQUIRED.md`: operator name, postal address, contact mailboxes, minimum age and countries, governing law, retention, DMCA registration (not done), deployment of the new migration/functions, scheduling the clean-up job, a real-project network trace and smoke test.

## NOT CURRENTLY APPLICABLE
- **Cookie consent banner**: no cookies and no optional trackers exist (`01-cookies-and-storage.md`). None was added.
- **Refund / cancellation policy, hidden fees, subscription consent records**: no payments exist; only the future-ready contract and checklist.
- **Marketing e-mail unsubscribe requirements**: no e-mail is sent; the guard exists for when it is.
- **Session replay consent/masking**: no replay exists.
- **Analytics payload scrubbing**: no analytics exists.
- **Fake reviews / testimonials**: none present.
- **Image cut-out provider / AI provider licences**: none present.

## NEEDS PROFESSIONAL LEGAL REVIEW
Minimum age and the adequacy of the age screen for the regions served (COPPA, UK Children's Code, GDPR Art. 8); legal bases and rights language; international transfers; whether local storage needs consent in specific countries (the app's storage is believed to be strictly necessary); DMCA safe-harbor conditions including the repeat-infringer policy and counter-notice process; Terms limitation/disclaimer and governing law; intermediary/notice-and-takedown duties outside the U.S. (e.g. EU DSA); consumer-law rules once payments exist; the third-party brand marks.

## Residual risks the owner should know about
1. **The age screen is easy to defeat** by lying (by design neutral screens cannot stop that). The server gate only proves a screen was passed.
2. **The clean-up job is not scheduled**, so "deleted after 30 days" is not yet true in practice; the Privacy Policy draft says so.
3. **Provider profile photos load from Google/GitHub servers** (disclosed; the person can switch to an uploaded photo).
4. **`'unsafe-inline'` in the CSP** weakens script-injection protection until inline script is moved out.
5. **Existing accounts** (the owner's) are asked the age screen at the next sign-in.
6. Everything was verified against a local stand-in for Supabase except the earlier real-project checks; the new flows need a real-project smoke test.
7. Notes a collaborator added to someone else's board stay on that board after the collaborator deletes their account (disclosed).

## Update 2026-10-01 (Israel / age bands / owner details)

- **Superseded:** the 13+ block and 24-hour refusal. Replaced by adult/teen/child bands; children are guest-only until verified parental consent exists (it does not exist yet and is not faked).
- **Operator:** Jonathan Zachevsky, individual, Israel. Public postal address and all three contact e-mails are **not configured**; the pages stay DRAFT. The owner's residential address is not stored anywhere in the repository or its history (audited).
- **Governing law / venue** are proposals (State of Israel, Tel Aviv-Jaffa district), flagged for legal review.
- **Israeli baseline:** `israel-compliance-audit.md`. Registration/DPO/security-level conclusions are provisional and marked UNVERIFIED where a source could not be read directly.
- **Open risks:** the cleanup job is not scheduled (retention promises avoided in the policy); no verified consent process; teen consent under Israeli law unconfirmed; no DMCA agent (not claimed); marketing disabled and fails closed without a public address; accessibility not audited; CSP still allows `style="..."` attributes (`style-src-attr`).
- **Not claimed anywhere:** full legal compliance, accessibility certification, DMCA registration, legal review.
