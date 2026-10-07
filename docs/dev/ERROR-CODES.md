# Stick-It error codes

Every operational failure a person can meet has a **stable code** (`NAMESPACE-NNN`), a **human message**, and a known meaning. The codes are defined in one place,
`Stick.errors.catalog` in `js/cloud-client.js`, and shown by `Stick.errorToast(err)` (a compact, dismissible message with the code as small print).
A test (`supabase/tests/v0834lock.test.mjs`) keeps this file and the catalogue in step: a code that is in one and not the other fails the test.

Rules: the message never contains a database detail, a token, an e-mail address or a stack trace. Codes are never reused or renumbered. New codes go at the end of their namespace.
`from` is the internal application code (what the server or the sync layer raises) that maps to the public code.

Namespaces: `AUTH` sign-in and age, `INVITE` invitation links, `SHARE` share links, `SYNC` saving and loading a board, `BOARD` boards and what is on them, `ASSET` uploads,
`PRINT` printing, `MEDIA` camera and microphone.

| Code | From | User message | Meaning for developers | Likely causes | Retry? | Safe user action |
|---|---|---|---|---|---|---|
| AUTH-001 | NOT_AUTHENTICATED | Please sign in again. | The request carried no valid session. | Session expired; signed out in another tab. | No | Sign in. |
| AUTH-002 | AUTH | Your sign-in has expired. Please sign in again. | The server rejected the token (401 / invalid JWT). | Refresh token revoked or expired. | No | Sign in. |
| AUTH-003 | ANONYMOUS_NOT_ALLOWED | That needs an account. Guests can work on the board they joined, but can’t do this. | An anonymous (guest) session tried to create a board, share, invitation or upload. Blocked by `deny_anonymous()`. | A guest used an account-only feature. | No | Sign in with an account. |
| AUTH-004 | AGE_NOT_CONFIRMED | Please confirm your age first. | `profiles.age_band` is empty, so joining a board is refused (`require_age_attested`). | The age screen was skipped or failed. | No | Answer the age screen. |
| AUTH-005 | PARENT_CONSENT_REQUIRED | Cloud features need a parent or guardian’s approval first. | Under-13 account without approval. | Child account. | No | Use Stick-It as a guest. |
| INVITE-001 | INVITE_NOT_FOUND | We couldn’t find that invitation. Check the link, or ask for a new one. | No invitation matches the token hash. | Mistyped or cut-off link; the owner deleted the link. | No | Ask for a new link. |
| INVITE-002 | INVITE_EXPIRED | That invitation has expired. Ask for a new one. | `expires_at` is set and in the past. New links never expire; only old rows can. | Very old link. | No | Ask for a new link. |
| INVITE-003 | INVITE_REVOKED | This board access was turned off by the owner. | The invitation was turned off (`revoked_at`), or the person’s access that came from it was removed. | The owner pressed Turn off. | No | Ask the owner for a new link. |
| INVITE-004 | INVITE_EMAIL_MISMATCH | That invitation is tied to a different e-mail address. Sign in with the address it was sent to. | The invitation is bound to an e-mail and the signed-in account has another (or none: guests). | Joined without an account, or with another Google account. | No | Sign in with the invited address. |
| INVITE-005 | INVITE_USED | That invitation was already used. | Legacy: single-use links before v0.8.3.4 raised this. Links are reusable now, so it should not occur. | Old build of the app. | No | Ask for a new link. |
| SHARE-001 | SHARE_LIMIT_REACHED | You’ve reached the limit of share links on your plan. | Plan limit on share links. | Free plan limit. | No | Remove an old share link. |
| SHARE-002 | NOTHING_TO_SHARE | There is nothing to share yet. | Share requested with no objects. | Empty selection or board. | No | Select something first. |
| SYNC-001 | OFFLINE | You appear to be offline. Changes are kept and sent when you’re back. | Network request failed. | No connection; server unreachable. | Yes | Wait, or check the connection. |
| SYNC-002 | FORBIDDEN | You don’t have permission to do that here. | RLS or a function refused the action. | Viewer tried to edit; access removed. | No | Ask the owner for edit access. |
| SYNC-003 | UNSAFE_HTML | That content couldn’t be saved because it isn’t allowed. | The server’s HTML sanitiser rejected the content. | Pasted markup with scripts or embeds. | No | Paste as plain text. |
| SYNC-999 | (anything else) | Something went wrong. Please try again. | Unclassified error; the real message is only in the console. | Unknown. | Yes | Try again; if it repeats, report the code. |
| BOARD-001 | BOARD_LIMIT_REACHED | You’ve reached your plan’s board limit. | Plan limit on boards. | Free plan limit. | No | Delete a board or upgrade. |
| BOARD-002 | OBJECT_LIMIT_REACHED | This board has reached its maximum number of items. | Per-board object cap. | A very large board. | No | Remove items. |
| BOARD-003 | ACCESS_REVOKED | This board access was turned off by the owner. | The signed-in user is no longer a member of the open board (detected by a push, a refused write, or the periodic check). The page leaves the board. | The owner turned off the invitation link the person joined through. | No | Ask the owner for a new link. |
| ASSET-001 | FILE_TOO_LARGE | That file is too large to upload. | Over the per-file limit. | Large photo or video. | No | Use a smaller file. |
| ASSET-002 | MIME_NOT_ALLOWED | That file type isn’t supported. | File type is not on the allow-list. | Unsupported format. | No | Convert the file. |
| ASSET-003 | STORAGE_QUOTA_EXCEEDED | Your account is out of storage space. | Account storage quota reached. | Many uploads. | No | Delete uploads. |
| ASSET-004 | UPLOAD_NOT_FOUND | That upload could not be found. Please try again. | The upload record was missing when finalising. | Interrupted upload. | Yes | Upload again. |
| PRINT-001 | PRINT_FAILED | Printing didn’t start. Try again, or use Save as PDF. | `window.print()` did not run or the print layout could not be built. | Blocked by the browser; empty selection. | Yes | Use Save as PDF. |
| MEDIA-001 | MEDIA_DENIED | The camera or microphone isn’t allowed. Check the browser’s permission for this site. | `getUserMedia` was refused. | Permission denied or no device. | No | Allow it in the browser’s site settings. |

## Adding a code

1. Add the entry to `Stick.errors.catalog` (next free number in its namespace).
2. Add a row here with the same code.
3. Show it with `Stick.errorToast("YOUR_APP_CODE")` (or a parsed error). Never put a database message or a secret in the user message.
