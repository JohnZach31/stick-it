# Account settings

Two dialogs, two questions:
- **Settings** (gear): how Stick-It looks and behaves on *this device* (dark mode, handwriting lock, clean-up, import/export of a board).
- **Account settings** (avatar button, signed in): *who you are*, how you appear when you share, and what belongs to your account. Guests never see it.

## What it contains
| section | fields | stored in |
|---|---|---|
| Profile | photo (upload / replace / remove / use provider photo), fallback style (initials or emoji + colour), display name, username (optional, unique), bio (max 120) | `profiles` (name, avatar), `profile_settings` (bio, username) |
| Sharing | share as **Me** or **Anonymous**; show photo; show bio; new board links: read only or ask first | `profile_settings` |
| Personalization | preferred handwriting, default new-note colour | `profile_settings` |
| Account | provider(s), e-mail (display only), plan, boards / items / storage / member since, link another sign-in | read-only, from `my_usage()` and Auth |
| Data & privacy | export all boards, manage active links, sign out everywhere | actions |
| Danger zone | delete account | Edge Function |

Save / Cancel stage everything in the first four sections. Sign out, export, manage links, sign-out-everywhere and delete are immediate and never staged.

"Show my name on shares" and "default share identity" are one control: a person either shares as themselves or anonymously. (Both database columns are kept in step.)

## Decisions
- **Avatar** is an ordinary `assets` row (`kind='avatar'`, no board) in the private bucket. The profile stores an asset id, never image data. The browser crops to a square, shrinks to 256 px and re-encodes as WebP/JPEG before upload, so an uploaded file is always a fresh image (SVG is refused by the server as well). Limit 2 MB. People you share a board with can read your avatar; strangers cannot.
- **Public identity is frozen at share time.** `create_share` copies name / avatar / bio into the share (only what you switched on). Changing your bio later does not change an existing link; deleting your account deletes your links. E-mail, username, user id and private settings are never in a share.
- **Private vs public columns:** `profiles` is readable by co-members (name, avatar only). Bio, username, sharing defaults and preferences are in `profile_settings`, readable only by you.
- **Username:** lowercase `a-z 0-9 _`, 3-20, unique (partial unique index). It is not shown anywhere publicly yet; it exists so future mentions/invites have a stable handle. The server decides uniqueness; the UI reports "already taken".
- **Preferred font / note colour** are preferences. A font that can't draw the text's script falls back to a suitable one. The device's own "keep new notes in one font" lock still wins.
- **Plan** is display-only. The browser cannot change `plan` (column grants; a mutation test proves it). Premium: nothing to buy yet, the card says so.
- **Provider photo:** the URL from Google/GitHub is kept at sign-up; the browser cannot change `profiles.avatar_url`.
- **Not stored in the account (device-local on purpose):** theme, handwriting lock, clean-up, tutorial state.

## Account deletion (what really happens)
`delete-account` Edge Function: verifies the caller's session token, requires `{"confirm":"DELETE"}`, then `purge_user_data` (their share links, boards with everything on them, assets, profile) and deletes the Auth user. Every deleted asset leaves a `storage_tombstones` row; the function removes the files immediately and `gc-assets` finishes any it couldn't.
- Every link the person created **stops working**, snapshots included. (Snapshots are immutable copies, but they belong to the account that made them; they are removed with it.)
- Boards they own disappear for collaborators. Boards they only joined are unaffected apart from losing their membership.
- Guest boards on the device are untouched.

## Sign-in providers
Google and GitHub both use the same redirect (`https://<ref>.supabase.co/auth/v1/callback`). See 06-setup.md for GitHub. "Link Google/GitHub" in Account settings needs *Enable manual linking* in Supabase → Authentication → Sign In / Providers; without it the button explains that linking isn't switched on.

## Deferred
- Session list ("these devices"): Supabase doesn't expose it cleanly; only "sign out of all devices" is offered.
- Full-media export: pictures are embedded; voice memos and videos are not. The all-boards file is an archive: the app imports one board at a time.
- Showing collaborators' names/photos in the UI: the data path exists (profiles readable by co-members) but there is no member list yet.
- Billing / plan changes.
