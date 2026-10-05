# Before the local beta (fewer than 50 users)

v0.8.2.1 improves the paperwork and the shell. It does **not** replace any of the reviews below, and none of them has been done by this patch. Each needs a dedicated pass before real people outside the owner use the live product:

- [ ] **Legal / privacy**: lawyer review of Privacy, Terms, Storage, Young People (the reviewed wording in v0.8.2.1 is a drafting improvement, not legal advice). Hebrew new wording needs a native / legal read.
- [ ] **DMCA readiness**: designated-agent registration, counter-notice and repeat-infringer policy, intake form (still disabled).
- [ ] **Accessibility**: screen-reader testing (NVDA / JAWS / VoiceOver), keyboard-only arrangement, zoom to 400%, physical phones; new surfaces (legal reader, pile browser, embedded video) are developer-checked only.
- [ ] **Supabase / backend / storage**: RLS review against the live project, plan, region, retention, backups, point-in-time recovery.
- [ ] **Security**: CSP review (v0.8.2.1 adds `frame-src` for the two video providers), dependency review, secrets, abuse and rate limits.
- [ ] **Backups and recovery**: a rehearsed restore (the 2026-10-04 incident recovery was manual).
- [ ] **Destructive sync behaviour**: the data-safety follow-up (explicit deletion intent / tombstones, fully-loaded requirement, bulk-delete guard) in `docs/dev/DATA-SAFETY-FOLLOWUP.md` is a pre-beta blocker.
- [ ] **Logging and error monitoring**: none exists today.
- [ ] **Transactional e-mail / OTP**: production e-mail provider, sender domain, templates (OTP is currently disabled in production).
- [ ] **Analytics**: not live. If introduced, update Privacy + Storage the same day; never collect content (notes, comments, searches, private media).
- [ ] **Domain and hosting**: custom domain, TLS, hosting terms (currently GitHub Pages).
- [ ] **Business / public contact details**: public postal address decision (never the owner's home address), operator identity.
- [ ] **Business, tax and invoicing**.
- [ ] **Payment readiness**: payment provider, receipts, refunds, consumer-law checklist (`docs/legal/israel-payments-checklist.md`). No payments exist today.
