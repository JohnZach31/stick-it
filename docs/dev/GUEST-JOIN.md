# Joining a shared board without an account

An invite link now offers **Join without an account**. It uses Supabase's *anonymous sign-in*: a real but credential-less user, so every existing row-level-security rule, board membership and role works unchanged. `accept_invite` already works for any authenticated user.

## One-time setting (Supabase dashboard)
**Authentication → Sign In / Providers → Allow anonymous sign-ins: ON.** Until it is on, "Join without an account" tells the person it is not available yet and offers normal sign-in instead. Consider turning on CAPTCHA / rate limits for anonymous sign-ins to stop abuse.

## Behaviour
* The age check (`ensureAgeAttested`) still runs first, exactly as for an account. Under-13s are still stopped.
* An invitation tied to a specific e-mail address cannot be joined anonymously (no e-mail to match): the person is told to sign in with that address.
* Leaving (Sign out) asks first and explains there is nothing to sign back in to; a new invitation is needed. A Google / account link-up for guests can be added later with `linkIdentity`.
* Guests are ordinary board members with the role on the invitation (editor or viewer).

## Not covered
Cleaning up abandoned anonymous users (a scheduled job deleting anonymous users with no memberships after N days) is not set up.

## v0.8.3.4: turning a link off removes the access it gave

* **Model.** `board_members.granted_via_invite` marks members who came in through an invitation. `board_invite_uses (invite_id, user_id, board_id, alias)` records who joined through which link (and a stable friendly guest name such as "Leaflet #184", generated once per guest per board and kept when they return through another link).
* **Revoking** (`revoke_invite(invite)`, owner only): sets `revoked_at`, then `remove_invite_members()` deletes the membership rows of people whose ONLY valid grant was that link. Anyone who also came in through another still-valid link, anyone who is the owner, and anyone not marked `granted_via_invite` is untouched. Deleting the invite row does the same (BEFORE DELETE trigger). A revoked link answers `INVITE_REVOKED` (INVITE-003).
* **Enforcement is in the database.** Every read and write is checked against `board_members` by RLS and the RPCs, so the moment the row is gone the old tab can neither read new changes nor write, comment or upload. The page's reaction is courtesy, not security.
* **Live kick.** A trigger on `board_members` delete sends a content-free `access_changed` broadcast on the private channel `board:<id>` (no names, no ids). The page also re-checks its own membership when a write is refused, on focus, and every 30 s. Losing access hides and disables the board, shows "This board access was turned off by the owner." (BOARD-003), then leaves for another board or plain guest mode.
* **Realtime edits.** `board_objects` is already in the `supabase_realtime` publication (since the first migration, nothing new is published); the page subscribes to `objects:<board>` filtered by `board_id` (RLS decides who receives rows). A push only schedules the normal pull (debounced 250 ms); polling remains a safety net at a third of the speed while the channel is connected. Subscriptions are removed on `stop()` and never left behind by a board switch.
* **Copying a link again.** The server keeps only a hash of each token, so the owner's own device remembers the links it made (`localStorage`, `stickit.inviteTokens`); "Copy link" is offered only there.

Migration: `supabase/migrations/20261009100000_lock_it_down.sql`.

## v0.8.3.4 (collaboration management pass)

Three different questions, three different answers. They are kept apart on purpose:

| Question | Source | Where it shows |
| --- | --- | --- |
| Who is on the board **right now**? (presence) | the board's private presence channel (`Stick.collab.online()`); a closed tab drops out when the channel reports it, and a silent peer expires after 40 s | "On this board now" |
| Who **may open** the board? (authorization) | `board_members`, via `list_board_access()` (owner only) | "People with access" (owner / via invite / joined before tracking) |
| What can still **let someone in**, and its history? | `board_invites` + `board_invite_uses`, via `list_invites()` | "Links you made" cards |

* **Identity.** A signed-in account is shown by its profile display name; a guest by the generated friendly name stored in `board_invite_uses.alias` (stable per guest per board, including guests who joined before names existed). No e-mail address, provider data or private metadata is ever returned. A guest is never matched to a person by guesswork. Profile photos are not shown in these lists yet (a coloured initial is used) so that no photo-privacy setting can be bypassed.
* **History.** Turning a link off keeps the card (state "Turned off", join count, and the guests who used it, marked "access removed"). `delete_invite_history()` removes only that record, only for a link that is already off, and `remove_invite_members()` does nothing for a turned-off link, so deleting history can never change a membership.
* **Leaving.** When access is turned off the dialog offers "Go to my boards" (signed in) or "Continue as guest" / "Sign in or create account" (guest). Nothing opens by itself; sign-in appears only if chosen.
* **Settings.** Settings > Sharing counts public share links and collaboration invitations together (`my_active_invite_count()`), and "Manage shared links" opens Sharing & access with a tab for each kind.
* **Live speed.** `Stick.perf.collab()` returns, for edits made by others: wait (our 80 ms realtime debounce), pull (request and response), draw (applying), push (server commit to event; compares two clocks) and total. While another person is on the board a change is saved after 150 ms instead of 700 ms; alone, the 700 ms settle is unchanged.

Migration: `supabase/migrations/20261009110000_collab_management.sql` (also non-destructive to memberships).
