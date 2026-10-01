# E-mail sign-in: built, deferred

**Status: not offered in production.** The sign-in dialog shows Google, GitHub and Guest only. There is no disabled or "coming soon" e-mail button.

## Why it is deferred
Supabase Auth e-mail codes need an outgoing mail path that really delivers. The built-in Supabase mailer is rate limited to a few messages an hour and is meant for testing, and a personal Gmail sender is not a dependable production sender. A real launch needs a domain you own with a verified sending provider.

## Where the working implementation lives
- **Commit `4908795`** on `master` (and `legal`) contains the complete, tested feature. It is already pushed.
- **Branch `feature/email-otp-auth`** points at that exact commit (kept locally; push it if you want it on GitHub: `git push origin feature/email-otp-auth`).
- On `master` the code is still present but **switched off by one flag**: `EMAIL_AUTH: false` in `js/config.js`. With the flag off, `js/app.js` renders no e-mail button and registers no handler. The shared sign-in code used by Google and GitHub was not touched.
- Pieces: `Stick.auth.sendEmailCode / verifyEmailCode` in `js/cloud-client.js`; the age-then-email-then-code screens (`renderEmailEnter`, `renderEmailCode`) in `js/app.js`; OTP endpoints in the local test double (`supabase/tests/fake-supabase/server.mjs`); tests in `supabase/tests/fake-supabase.test.mjs` and `billing.test.mjs`.

## Before it can be turned on
1. **Own a domain** (for example `stick-it.app`).
2. **Verify the domain with a sending provider** (Resend or similar): SPF, DKIM and, ideally, DMARC records.
3. **Production SMTP** in Supabase (Authentication, Emails, SMTP Settings) with a sender on that domain, e.g. `login@yourdomain`.
4. **Supabase templates**: edit **Magic Link** and **Confirm signup** so they contain `{{ .Token }}` (a six-digit code). The default templates send a link, which the code screen cannot use. Check OTP length and expiry.
5. **Live delivery test** with several real mailboxes (Gmail, Outlook, iCloud): arrival time, spam folder, code works once, resend cooldown, wrong code message.
6. Update the Privacy Policy if the new mail provider is a sub-processor (it will be), and `docs/legal/00-data-and-third-party-inventory.md`.

## Re-enabling
Set `EMAIL_AUTH: true` in `js/config.js`, rebuild nothing (it is a static flag), run the test suites, deploy. If `master` has moved far, either keep the flag approach (no merge needed) or `git merge feature/email-otp-auth`. Re-run the browser check: Account, Continue with email, age step, code, signed in.
