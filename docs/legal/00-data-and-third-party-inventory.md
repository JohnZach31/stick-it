# Data and third-party inventory

Written from the code and the deployed configuration as of this commit (not from assumptions). "Verified" = checked in the repository or against the running app. "Unknown" = depends on the provider's own settings or on a decision the owner has not made; it is labelled, not guessed.

## 1. What Stick-It stores about people

### 1.1 On the person's own device (no network needed)
| Where | Key / name | What | Needed for | Removed when |
|---|---|---|---|---|
| localStorage | `stickyboard.boards.v1`, `stickyboard.notes.*`, `stickyboard.cover.*`, `stickyboard.thumb.*`, `stickyboard.zoom.*`, `stickyboard.view.*`, `stickyboard.clipboard.v1`, `stickyboard.activeBoard.v1` | Guest boards, notes (text, formatting, position), covers, thumbnails, view state | The product itself (guest mode) | Person clears site data / "Clear board" |
| localStorage | `stickyboard.settings.v1` | Device preferences (theme, font lock, clean-up), a copy of the account name/photo/preferences when signed in, tutorial state | Product | Sign-out clears the signed-in part |
| localStorage | `stickyboard.anonId` | Random "Anon-1234" label used on shares by guests | Product | Clearing site data |
| localStorage | `stickyboard.cloud.<user id>.*` | A cached copy of the signed-in account's boards (so it works offline) | Product | Wiped on sign-out and account deletion |
| localStorage | `stickit.auth` (+ `stickit.auth-code-verifier` during sign-in) | Supabase session: access/refresh tokens and the user object (e-mail, provider name/avatar URL) | Staying signed in | Sign-out |
| localStorage | `stickyboard.migrated.<board id>`, `stickit.migration.declined.<user id>` | "This guest board was already imported" / "don't ask again" | Import flow | Clearing site data |
| localStorage | `stickit.age.ok`, `stickit.age.blocked` | A timestamp that the age screen was passed (1 h) / failed (24 h). **No birth date.** | Age screen | Expire; clearing site data |
| localStorage | `stickit.dev.config` | Developer override; only honoured on localhost | Development | n/a |
| IndexedDB | `stickit-media` | Voice memos, videos and cached pictures (guest media; downloaded copies of account media) **and finished cutouts** (key `co-...`: a transparent PNG made on the device) | Product (media storage) | Sign-out wipes account media; clearing site data |
| localStorage | `stickit.cutout.hint`, `stickit.rcUsed`, `stickit.age.known` | "You have seen the cutout tips", "you have used the right-click menu", the 90-day age-band hint (band only, never a date) | Product | Clearing site data |
| Cookies | none set by Stick-It (verified: no `document.cookie` use) | | | |

### 1.2 In the Supabase project (only for signed-in people)
| Table / bucket | Fields | Purpose | Notes |
|---|---|---|---|
| `auth.users` (Supabase Auth) | e-mail, provider user id, provider profile payload (name, picture URL, locale...), created/last sign-in, IP in Auth logs | Sign-in | Managed by Supabase; we cannot remove fields from the provider payload |
| `profiles` | display name (+ flag if customised), provider avatar URL, avatar choice (provider/custom/none), fallback style/colour/emoji, `plan`, `age_attested_at`, created/updated | Identity in the app | `age_attested_at` is a timestamp only; no birth date anywhere |
| `profile_settings` | bio, username, sharing defaults, preferred font, default note colour, **marketing e-mail opt-in (default off) + when + where** | Preferences | Readable only by the account (RLS) |
| `boards`, `board_members`, `board_invites` | names, ownership, roles, invite e-mail (optional) + token hash | The product; collaboration | |
| `board_objects` | every note/photo/memo/video: position, formatting, **text content** (JSON), soft-delete flag | The product | The user's own content |
| `assets` + private bucket `media` | image/audio/video/avatar files, size, type, dimensions | The product | Private; delivered with short-lived signed URLs |
| `shares`, `share_items`, `share_assets` | token **hash** (not the token), copy of shared items, identity shown (name, bio, photo) frozen at creation, active flag | Share links | Public to anyone with the link |
| `share_reports` | reason text, reporter id if signed in | Abuse reports | |
| `copyright_reports` | reporter name, e-mail, address (optional), description, URL, statements, signature | Copyright complaints (**intake switched off until the owner enables it**) | Service role only |
| `comments` | text (up to 2,000 characters; the app caps it lower), author, time, the object it is attached to, soft-delete flag | Comments attached to objects (v0.8.0). Never free-floating | Visible to board members; written by editors/owners |
| `object_reviews` | state (changes requested / ready for review), optional reason (300 chars), who, when | The lightweight review step | Visible to board members; written only through `set_review_state` |
| `reminders` | schema only | Not used by any screen yet | |
| Realtime channel `board:<id>` (private, members only) | display name, which object a person is editing/moving, a heartbeat | "Who is here" and the soft edit lock | **Not stored**: it exists only while the page is open (presence state is dropped when the person leaves) |
| `assets` kind `cutout` | a transparent PNG made on the device, with `source_asset_id` pointing at the original photo | Real cutouts | Same privacy and deletion rules as any picture |
| `storage_tombstones` | storage path of a deleted file | Makes sure deleted files are removed | |

### 1.3 Logs and technical data (provider-side)
| Provider | What they see | Controlled by us? |
|---|---|---|
| GitHub Pages (hosting) | Every visitor's IP address, user agent, requested URL | No. GitHub's own policy applies to all visitors, including guests |
| Supabase (API gateway, Auth, Edge Functions, Storage) | Request metadata including IP, authenticated user id, function logs | Partly: our functions log nothing about content (verified: no `console.*` calls in `supabase/functions` or `js/`) |
| Google / GitHub (sign-in) | That the person signs in to Stick-It, their IP, whatever they choose to approve | No |
| Edge Function rate limiter | IP address held **in memory only**, not stored | Yes |

## 2. Third-party services and code

| Service / library | Purpose | Data sent, and when | User-visible? | Essential? | Cookies / storage | Consent likely needed? | Terms / privacy links | Secret or public key | Delete / export implications |
|---|---|---|---|---|---|---|---|---|---|
| **GitHub Pages** (hosting) | Serves the site | IP + request headers on every page/asset load (all visitors) | No | Essential for the hosted site | none by Stick-It | No (necessary delivery) [legal review] | docs.github.com/site-policy/privacy-policies | none | Not part of the account |
| **Supabase** (Postgres, Auth, Storage, Edge Functions) | Accounts, sync, media, share links | Account and content data when signed in; the anon (publishable) key is public | Yes (sign-in) | Essential for accounts | `stickit.auth` in localStorage | No for essential session storage [legal review] | supabase.com/privacy, supabase.com/legal/dpa | `SUPABASE_URL` + publishable key = PUBLIC; service_role, DB password, `GC_SECRET`, `UNSUBSCRIBE_SECRET` = SECRET (never in browser) | Deleted by the delete-account function (see data-export-and-deletion.md); Supabase backups: **unknown, owner to check plan** |
| **Google Sign-In** (OAuth) | "Continue with Google" | Redirect to Google; returns name, e-mail, picture URL | Yes | Optional sign-in method | none by Stick-It | No (user-initiated) | policies.google.com/privacy | OAuth client ID public-ish; **client secret SECRET (only in Supabase)** | Account deletion does not delete the Google account or its app grant; person can revoke at myaccount.google.com |
| **GitHub OAuth** | "Continue with GitHub" | Redirect to GitHub; returns name/username, e-mail, avatar URL | Yes | Optional | none by Stick-It | No | docs.github.com/site-policy/privacy-policies | client secret SECRET (only in Supabase) | Person can revoke in GitHub settings |
| **Google / GitHub avatar image hosts** (`lh3.googleusercontent.com`, `avatars.githubusercontent.com`) | Show the provider profile photo if the person kept it | The browser requests the image: IP + UA go to Google/GitHub | Yes (their own photo) | Optional (they can pick another photo) | none | No [legal review: it is a third-party request] | as above | n/a | Choosing "Remove photo"/uploading a photo stops the request |
| **Google Calendar** link | "Add to calendar" on a note with a date | Only when the person clicks: the note's title/details are put in the URL opened at calendar.google.com | Yes | Optional, user-initiated | none | No (user-initiated navigation) | policies.google.com/privacy | n/a | n/a |
| **Fonts** | Handwriting fonts | **Nothing.** Self-hosted from `assets/fonts/` (no request to Google Fonts) | No | Essential | none | n/a | licences: docs/fonts-licenses.md | n/a | n/a |
| **supabase-js 2.x** (`js/vendor/supabase.js`) | Talks to Supabase | Same as Supabase row | No | Essential | localStorage (auth) | n/a | MIT | uses the public key | n/a |
| **html2canvas 1.4.1** (`js/vendor/html2canvas.min.js`, self-hosted since this patch; was loaded from cdnjs) | Board thumbnails/images | Nothing leaves the browser | No | Essential | none | n/a | MIT | n/a | n/a |
| Analytics / error reporting / session replay | **None present** (searched the whole repository) | | | | | | | | |
| E-mail provider | **None present** (Stick-It sends no e-mail; Supabase Auth is used with OAuth only) | | | | | | | | |
| Payment provider (Stripe etc.) | **None present** | | | | | | | | |
| Image cut-out provider | **None**. Cutouts are computed on the device by a bundled model (ONNX Runtime Web + U²-Net family); no photo is sent anywhere for this, no key exists | | | | | | | | |
| **ONNX Runtime Web 1.22.0** + model files (`js/vendor/ort/`, `assets/models/`) | On-device cutout | Nothing leaves the browser. The runtime and model are downloaded from Stick-It's own site the first time a cutout is made (4.6 MB, or 44 MB for "Finer edges") | Only the loader/progress | Optional feature | browser HTTP cache | n/a | MIT / Apache-2.0 | n/a | n/a |
| Embeds, social-sharing widgets, advertising, tracking pixels | **None present** | | | | | | | | |

## 3. Network origins observed
See `docs/legal/network-privacy-check.md` (measured in a browser, per scenario).
