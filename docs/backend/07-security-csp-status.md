# Security review, CSP, honest status

## Guarantees that are enforced (and tested)
- RLS on every table; column-level grants; SECURITY DEFINER functions pin `search_path` and revoke PUBLIC execute (188 SQL assertions; 10 deliberate breakages ("mutations") are all caught by the suite).
- Membership in one board never exposes another; viewers can't write; non-owners can't share live/delete/leave-rewrite; plan is not client-writable.
- Storage policies mirror `assets`; share resolver never leaks paths; GC needs a secret.

## Secrets rule
Only `SUPABASE_URL` and the anon key appear in the repo. Never: service_role, DB password, Google client secret, `GC_SECRET`. `.gitignore` blocks `.env*`, `*.pem`, `supabase/.env`.

## CSP
A Content-Security-Policy is now delivered as a meta tag on every page; the directives, what they allow and the known weaknesses (`'unsafe-inline'`, no `frame-ancestors` in a meta tag) are in `docs/legal/csp.md`. It was tested against sign-in, sync, uploads, sharing and the fonts (which are now self-hosted).

## Not implemented (by request or by honesty)
- **Realtime/presence (phase 8)**: the migration enables the publication, but the client polls (20 s) and the local test double has no websockets, so it could not be verified. Not shipped as a claim.
- Comments/reminders: schema only. Billing, AI, CRDT, push: none.
- Moderation: reporting + link disabling only.
- Settings sync: account profile and sharing/personalization preferences are synced (see 08-account-settings.md); theme, font lock, cleanup and tutorial state stay device-local by design.
- Export/import: pictures are embedded in the export file; voice memos/videos are not (the dialog says so).
- Tested against a local stand-in only. **The live smoke test in 06-setup.md is still required.**
