# Short invite codes: design (not built in v0.8.3.4)

Goal: let a person type something like `PPR-4912` instead of pasting a link, **without** making invitations easier to guess.

## What exists today
* An invitation has a long random secret (two UUIDs, 64 hex characters). Only its SHA-256 hash is stored (`board_invites.token_hash`). The link is `#invite=<secret>`.
* "Join with invite link" already accepts a whole link or the bare 64-character code (`parseInviteInput` in `js/app.js`), so the dialog is ready for a second format.

## Why the secret must not be shortened
Anyone who knows an invitation's secret can join (unless it is tied to an e-mail). 64 hex characters is 256 bits; a six-character code is about 30 bits and could be guessed by trying codes. Shortening the real secret would be a security regression.

## Design
A **separate lookup code** that resolves server-side to the invitation, and is guarded against guessing:

* New table `board_invite_codes (code_hash text primary key, invite_id uuid references board_invites on delete cascade, created_at)`. The code is generated from a readable alphabet without look-alikes (no 0/O, 1/I), e.g. `PPR-4F92` (3 letters, dash, 4 characters), stored as a hash of the upper-cased code. It is not derived from any row id, so it is not sequential.
* Deleting or turning off the invitation turns the code off with it (`on delete cascade`, and the same `revoked_at` check in the lookup).
* `redeem_invite_code(p_code text)` (security definer) normalises the code, looks it up, and returns the invitation's secret **only to be used by `accept_invite` inside the same call** (the client never learns the long secret from a code). It must:
  * rate-limit per user and per IP (a small `invite_code_attempts` table; e.g. 10 wrong tries per hour, then a delay), because the code space is small;
  * answer a wrong, revoked and unknown code identically ("INVITE-001") so nothing leaks;
  * keep e-mail-bound invitations bound to their address.
* Codes are optional per invitation: the owner presses "Add a short code" on a link card (not on every link by default). Short codes are therefore a convenience for a chosen invitation, with a visible lifetime if wanted.
* The Join dialog tries the 64-hex path first, then the code path.

## Why it is not in v0.8.3.4
It needs a new table, a rate limiter and a new RPC, i.e. a new security surface. The hotfix is about not weakening anything, so this waits for v0.8.4.
