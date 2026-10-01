# Data export and deletion (audit)

## Export (Account settings → Data & privacy → Export my boards)
One JSON file. **Includes:** account (display name, e-mail, plan), profile (username, bio, avatar choice, fallback style/colour/emoji), preferences (sharing identity, photo/bio on shares, new-board-link mode, preferred font, default note colour, product-update e-mail choice), your memberships and roles, every board you can open with all its items (text, formatting, positions), pictures (embedded as data), and a list of your share links (type, board, created, active, how you appear: **without their secret addresses**). The file states what it includes and what it does not.
**Does not include:** voice-memo and video **files** (the items are listed, the recordings are not), the secret address of each share link (we store only a hash), comments (the app has none yet). It must never be called "all your data".
The per-board **Export board…** in Settings is a separate, round-trippable file for that board only.

## Deletion (Account settings → Delete account…, typed DELETE)
Server function `delete-account` verifies the caller's session and the exact confirmation, then `purge_user_data` runs in this order, then the sign-in account is deleted:

| Data | What happens |
|---|---|
| Share links created by the person, and any link to a board they own | **Deleted** (stop resolving at once, including frozen snapshots) |
| Boards they own, with all objects, memberships and invites on them | **Deleted** |
| Their uploaded files and avatar (assets) | Rows deleted; **files removed from storage immediately**; a tombstone queue + the clean-up job remove anything that failed |
| Derived assets (cut-out / poster / thumbnail) | Same (they are assets owned by the person; the cut-out provider does not exist yet) |
| Profile, settings, marketing preference, age flag | **Deleted** (cascade) |
| Their invitations | **Deleted** |
| Their membership in boards owned by others | **Removed** |
| Notes they added to **someone else's** board | **Stay** on that board (they belong to it); the author link is cleared so the notes no longer carry the person's identity |
| Comments by them on others' boards | Comments are not available in the app. In the schema the author link would be cleared and the comment stays |
| Reports they sent (`share_reports`) | Kept; the reporter link is cleared |
| Sign-in account (`auth.users`) | **Deleted** |
| Their Google / GitHub account and the app's permission | **Not touched** (revoke with the provider) |
| Provider logs, backups | **Not controlled by us** (Supabase / GitHub retention; owner to check the plan) |
| This device's local copy | The cloud cache and session are wiped; guest boards on the device are not touched |

Tests: `supabase/tests/run-tests.mjs` sections I and K (purge removes boards, shares, settings, invites; tombstones queued), `client.test.mjs` (account tests), browser run against the stand-in (data gone, session cleared).

## Still open
- **The clean-up job is not scheduled.** `gc-assets` removes notes deleted > 30 days ago and unused files after a 14-day grace. It needs a cron call with `x-cron-secret`. Until then, soft-deleted notes and orphan files stay.
- Backups / log retention: owner to read the Supabase plan.
- A privacy contact address for requests that cannot be done in the app: `privacyEmail` in `js/legal-config.js` (empty today; the app says so instead of inventing one).
