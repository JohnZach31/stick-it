# Setting up your Supabase project (manual steps)

Everything below is something only you can do: it needs your Supabase and Google accounts.
Each value is labelled **PUBLIC** (fine in frontend code / git) or **SECRET** (never in the browser, never in git).
Until step 5 is done the app keeps running exactly as before (guest mode, localStorage).

## 1. Create the project
1. https://supabase.com/dashboard → New project (region near your users). Save the **database password** in a password manager. **SECRET**, you never need to paste it anywhere in this repo.
2. Project Settings → API. Note:
   - **Project URL** `https://<ref>.supabase.co`: PUBLIC
   - **anon / publishable key**: PUBLIC (safe because Row Level Security guards every table)
   - **service_role key**: SECRET. Do not copy it anywhere. Nothing in this repo needs it (Edge Functions receive it from the platform automatically).

## 2. Apply the database
Install the Supabase CLI, then from the repo root:
```bash
supabase login
supabase link --project-ref <ref>
supabase db push
```
This runs the five files in `supabase/migrations` in order (schema, RLS, functions, storage, realtime).
Never disable RLS in the dashboard; the migrations enable it and the tests in `supabase/tests` prove it.

## 3. Google sign-in
1. Google Cloud Console → APIs & Services → Credentials → OAuth client ID (type *Web application*).
2. Authorized redirect URI: `https://<ref>.supabase.co/auth/v1/callback`. (No JavaScript origins are needed for the redirect flow.)
3. Copy the **Client ID**: PUBLIC-ish (identifies your app), and the **Client secret**: **SECRET**.
4. Supabase dashboard → Authentication → Providers → Google → enable, paste both. The secret lives only in the Supabase dashboard.
5. Authentication → URL Configuration:
   - **Site URL**: `https://johnzach31.github.io/stick-it/`
   - **Redirect URLs** (allow-list): `https://johnzach31.github.io/stick-it/**` and, for local testing, `http://127.0.0.1:8123/**` and `http://localhost:8123/**`.
6. Turn *off* "Allow new users to sign up" only if you want an invite-only launch (leave it on otherwise).

## 4. Deploy the Edge Functions
```bash
supabase functions deploy resolve-share --no-verify-jwt
supabase functions deploy report-share  --no-verify-jwt
supabase functions deploy gc-assets     --no-verify-jwt
supabase secrets set GC_SECRET=<a long random string>      # SECRET
```
`--no-verify-jwt` is intentional: share links are public (anyone with a token). The functions validate the token format, rate-limit, and never return storage paths. `gc-assets` refuses anything without `x-cron-secret: <GC_SECRET>`.
Schedule the cleanup (Dashboard → Integrations → Cron, or any external cron) to POST `https://<ref>.supabase.co/functions/v1/gc-assets` daily with header `x-cron-secret`. Keep the secret in the cron job's own settings, not in this repo.

## 5. Point the frontend at it
Edit `js/config.js` and fill in **only the two public values**:
```js
SUPABASE_URL: "https://<ref>.supabase.co",
SUPABASE_ANON_KEY: "<anon/publishable key>",
```
Commit and push when you are ready. Guests are unaffected; the "Continue with Google" button starts working.

## 6. Live smoke test (required; the local test double is not the real thing)
Everything was verified against a local stand-in that runs the real migrations on Postgres-in-WASM plus a fake Google/Storage/Functions server. Please repeat these on the real project:
1. Sign in with Google on the deployed site; the guest board is offered for import; import it.
2. Open the site on a second device/browser, sign in: board, photos and voice memos appear.
3. Edit a note on one device; it appears on the other within ~20 s. Turn off Wi-Fi, edit (pill: *Offline*), turn on: it flushes.
4. Share a note; open the link in a private window (no account): it renders. "Turn this link off": reload shows it's gone.
5. Publish a live board link; edit the board; the private window updates within ~30 s.
6. Try a second board, a third (free plan blocks the third with a clear message).
7. Storage: upload a photo; in the dashboard the object is at `media/a/<uuid>/...` and cannot be opened without a signed URL.
8. Sign out: the cloud cache on that device is wiped, guest mode returns.

## Optional
- Enable Realtime on `board_objects` is already in migration 5; the client polls today (see 07-security-csp-status).
- Pricing/plans: `profiles.plan` is set by you (SQL) until billing exists; nothing in the client can change it.

## Account settings update (migration 6 + delete-account + GitHub)

After pulling this update:
```bash
npx supabase db push                                   # applies 20260930130000_account_settings.sql and 20260930140000_handle_available.sql
npx supabase functions deploy delete-account --no-verify-jwt
npx supabase functions deploy resolve-share --no-verify-jwt   # now also returns the sharer's frozen bio/avatar
```
`delete-account` needs no new secret (the platform provides the service role to the function). Deploy it only when you want people to be able to delete their account; until then the button reports an error.

### GitHub sign-in (optional)
1. GitHub -> Settings -> Developer settings -> OAuth Apps -> **New OAuth App**.
2. Homepage URL: `https://johnzach31.github.io/stick-it/`. **Authorization callback URL:** `https://<ref>.supabase.co/auth/v1/callback`.
3. Create it, then **Generate a new client secret**. Client ID = PUBLIC-ish; **Client secret = SECRET** (paste only into Supabase).
4. Supabase -> Authentication -> Sign In / Providers -> **GitHub** -> enable, paste ID and secret, Save.
Nothing else changes: the same redirect allow-list is used. Until GitHub is enabled, the GitHub button starts sign-in and Supabase answers with a "provider is not enabled" error.

### Linking a second sign-in to one account (optional)
Authentication -> Sign In / Providers -> turn on **Allow manual linking**. Accounts with the same verified e-mail are already merged automatically by Supabase when they sign in with the second provider.
