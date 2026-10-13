# PIN-locked notes (v0.8.4)

A locked note's words are encrypted in the browser before they are saved, synced or exported. This page says what that protects, what it does not, and how it works. It does not claim more than the design delivers.

Code: `js/lock.js` (cryptography, no DOM), the "PIN-locked notes" section of `js/app.js` (dialogs, rendering, re-sealing), `js/repo.js` (`Stick.repo.nodeLock`), `css/privacy.css`,
`supabase/migrations/20261011100000_node_locks.sql`. Tests: `supabase/tests/v084lock.test.mjs` (cryptography run for real, leakage checks) and the "PIN locks (node_locks)" group in `run-tests.mjs` (the server, attacked as five kinds of user).

## What the person sees
Right-click a plain note: **Lock with PIN…**. They choose a 4–8 digit PIN, type it again, and tick that they understand it can never be recovered. The note becomes a sealed letter (its colour and size are kept, a wax seal and a handwritten "Locked"). Clicking it, double-clicking it or pressing Enter on it asks for the PIN.
Menu: **Unlock…**, **Lock Again**, **Change PIN…**, **Remove PIN Lock…**. Selecting several notes offers one deliberate confirmation: they all open with the same PIN (each is still sealed on its own, with its own salt and key).

## How it works
1. **Key from the PIN.** One PBKDF2-SHA256 run (600,000 rounds, a fresh random 128-bit salt per note) produces 64 bytes. The first 32 are *key material* that never leaves the browser; the last 32 are a *proof* (hex) that is sent to the server on a signed-in board.
2. **Content key.** HKDF-SHA256 over the key material and, on a signed-in board, the server's secret for this note, into a **non-extractable AES-GCM 256** `CryptoKey`.
3. **Sealing.** The sealed fields (words, inline picture, task and due-date details) are JSON, padded to a multiple of 256 bytes, and encrypted with a **fresh random 96-bit IV every time**. The note's id is authenticated data, so the ciphertext cannot be moved onto another note.
4. **Storage.** The note keeps its position, colour, font and size in the clear and carries the envelope `lock = {v, m, kdf, it, salt, iv, ct}`. `serializeNote()` strips the sealed fields from **every** stored, synced, copied and undo-history form.
5. **Open.** The PIN is turned into the proof and key material again. On a signed-in board the server checks the proof and releases the note's secret (see below); then AES-GCM decrypts. The plaintext and key live only on the in-memory note while it is open; **Lock Again**, a refresh, a board switch and sign-out discard them.
6. **Edits while open** re-encrypt the note (same key, new IV) about 150 ms after each change; Lock Again waits for the last one. Until then the saved ciphertext is the previous version.

## The server's part (signed-in boards)
`node_locks(board_id, node_id, owner_id, verifier, verifier_next, secret, fails, locked_until)` has row-level security on and **no policy and no grant**: nobody reads or writes it directly. Five security-definer functions are the only way in:

| Function | Who | What |
|---|---|---|
| `create_node_lock(board, node, proof)` | an account (not a guest) who can edit the board | stores `sha256(proof)` and a random 256-bit secret, returns the secret; refuses to replace someone else's lock |
| `unlock_node(board, node, proof)` | anyone on the board | checks the proof and releases the secret; counts a wrong proof |
| `change_node_lock(board, node, old, new)` | the person who locked it | checks the old proof, records the new one beside it (both work until the new one is used once, so a crash cannot lock the note out) |
| `remove_node_lock(board, node, proof)` | the person who locked it | checks the proof and deletes the row |
| `node_lock_state(board, node)` | anyone on the board | the waiting time, nothing secret |

**Attempt limits.** Wrong proofs are counted *per note, across everyone*, so extra accounts do not buy extra guesses. Waiting time after the n-th wrong PIN in a row: 3 → 10 s, 4 → 30 s, 5 → 1 min, 6 → 5 min, 7 → 15 min, 8 → 1 h, 9 or more → 24 h. During a wait even the right PIN is refused and no secret is released. A test keeps the browser's table identical to `node_lock_wait()`.
**No bypass.** A board owner or administrator has the same access to a lock as any collaborator: none beyond the PIN. Only the person who created the lock can change or remove it. There is no master PIN, no recovery question and no support override, in the code or the database.

## What it protects
- The words and the inline picture from **other people on the board** (collaborators, viewers, owners, administrators), from **shared links, exports, prints and the clipboard**, and from anyone who obtains a copy of the stored note.
- On a signed-in board: from **offline guessing** by anyone who has the stored note but not the server's `node_locks` row. A 4–8 digit PIN has at most 10⁸ values, so without the server's half it could be guessed offline whatever the cipher; with it, every guess goes through the rate limit.

## What it does not protect (read this)
- **The database operator, or an attacker who has the whole database,** holds both the ciphertext and the server's secret, and can try PINs offline. 600,000 PBKDF2 rounds slow each try (roughly 15,000 tries a second on one current graphics card, an estimate from published benchmarks, not measured here), so a 4-digit PIN falls in seconds and even an 8-digit PIN in hours. Use an 8-digit PIN for anything that matters, and do not rely on the database operator being out of the picture.
- **Boards that only live on this device (guest / signed-out)** have no server half and no server-side limit. Only PBKDF2 slows guessing, and the on-screen wait is per device and can be skipped by anyone with the stored data.
- **That a locked note exists,** its position, colour, font, size, and a coarse idea of the length of its words (256-byte steps).
- A person with **edit rights can overwrite or delete** a sealed note (they cannot read it). Overwriting makes it unreadable (reported as LOCK-006).
- **A compromised device or browser** (malware, a malicious extension, someone using the unlocked note over your shoulder) sees the words while the note is open.
- **A forgotten PIN is permanent.** There is nothing to recover, by design.
- Argon2 is not available in Web Crypto, so the memory-hard option is not used; PBKDF2 is the hardened KDF the platform offers.

## Not supported yet (the menu says so, nothing is silently skipped)
Only plain notes (including checklists) can be locked. Photos, papers, recordings, videos, zones, piles and embeds cannot. On a signed-in board a note with any picture cannot be locked (and a picture cannot be added to a locked note): an uploaded picture file is not encrypted, and a picture sealed inline would not fit in a board row (256 KB). A sealed note larger than about 200 KB is refused with "too big to lock". On a device-only board an inline picture is sealed with the words. A locked note cannot be copied, duplicated, shared, or moved to another board (its server key belongs to that note on that board). Guest sessions that joined by link cannot create locks. Opening a server-protected lock needs a connection.

## Leak protection (what asks "is this concealed?")
`isConcealed(n)` is the single question; `isLockedNote(n)` is used where even an *open* locked note must not show words (board thumbnails).
Search (no match, no highlight), `itemText` (share text, print title, search hits), Done list and pile tops (`Locked note`), board thumbnails (grey card), clipboard (placeholder only, no private type, locked notes are not copied), print / PDF (a sealed or covered note prints as a seal or foil), share (locked notes cannot be shared), public previews (`toPublicNote`), undo history (cleared whenever a lock is created, changed or removed; snapshots of a locked note are sealed-only).

## Deployment
Apply `supabase/migrations/20261011100000_node_locks.sql` (forward-only; creates one table and six functions; touches no existing row). Until it is applied, locking on a signed-in board fails with a clear message and nothing is changed; locking on a device-only board works without it.
