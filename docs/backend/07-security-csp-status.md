# Security review, CSP, honest status

## Guarantees that are enforced (and tested)
- RLS on every table; column-level grants; SECURITY DEFINER functions pin `search_path` and revoke PUBLIC execute (188 SQL assertions; 10 deliberate breakages ("mutations") are all caught by the suite).
- Membership in one board never exposes another; viewers can't write; non-owners can't share live/delete/leave-rewrite; plan is not client-writable.
- Storage policies mirror `assets`; share resolver never leaks paths; GC needs a secret.

## Secrets rule
Only `SUPABASE_URL` and the anon key appear in the repo. Never: service_role, DB password, Google client secret, `GC_SECRET`. `.gitignore` blocks `.env*`, `*.pem`, `supabase/.env`.

## CSP (reviewed, NOT enabled)
The app is a single large HTML file with inline `<script>`/`<style>` and inline event-free DOM code. A strict CSP would require `'unsafe-inline'` for both, which gives little protection, or moving to hashed/nonce'd inline blocks, which GitHub Pages (no response headers) can only do via a `<meta http-equiv>` tag. Recommended future step: extract inline script/style to files and add:
```
default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com;
font-src https://fonts.gstatic.com; img-src 'self' data: blob: https://<ref>.supabase.co;
media-src 'self' blob: https://<ref>.supabase.co; connect-src 'self' https://<ref>.supabase.co
```
Not shipped now because it would risk breaking the existing app. Decision recorded, not silently skipped.

## Not implemented (by request or by honesty)
- **Realtime/presence (phase 8)**: the migration enables the publication, but the client polls (20 s) and the local test double has no websockets, so it could not be verified. Not shipped as a claim.
- Comments/reminders: schema only. Billing, AI, CRDT, push: none.
- Moderation: reporting + link disabling only.
- Settings sync: account profile and sharing/personalization preferences are synced (see 08-account-settings.md); theme, font lock, cleanup and tutorial state stay device-local by design.
- Export/import: pictures are embedded in the export file; voice memos/videos are not (the dialog says so).
- Tested against a local stand-in only. **The live smoke test in 06-setup.md is still required.**
