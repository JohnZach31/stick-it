# Incident 2026-10-04: opening a share link soft-deleted a board

Status: hotfix deployed (see "Fix"); recovery of the affected rows tracked at the end of this note. **Referenced by the pre-beta data-safety review** (`docs/dev/DATA-SAFETY-FOLLOWUP.md`).

## Trigger
A signed-in person opened a share link (`#s=<token>`, or the legacy `#sb=`). In the reported case: the owner shared one note, then opened the link in the same signed-in browser, and the Main Board then looked completely empty (the board name and "Saved" still showed).

## Root cause
A page opened from a share link started the normal account sync. The only objects in memory on that page were the shared copy, so the sync layer compared the shared copy with what the account already knew.

## Destructive mechanism
`computeDiff()` in `js/sync.js` treats "an object this client knows about on the server but that is not in the current in-memory list" as a deletion (`dels`). With only the shared copy in memory, every real object of the board looked removed, and one flush sent them all as soft-deletes (`sync_objects`, `p_deletes`). Any other open tab of the same account then pulled those deletions and showed an empty board with "Saved".

This applied to **any** signed-in person opening **any** `#s=` or `#sb=` link (the visitor's own board, not the sharer's). The boot logic for share pages had not changed since short links were introduced; it was not caused by Ctrl+U, batch Mark Done, or Shopping List.

## Evidence
- Same Supabase project in the app, the CLI link and the dashboard (`ndgybpkkjqydvttmiyot`).
- Main Board `71cf4e91-2fee-4a3b-8d28-cb87921f7715`: 72 rows, none physically deleted, all soft-deleted.
- One transaction at `2026-10-04 22:50:43.242044+00` soft-deleted 12 live objects (6 notes incl. the Done note, 3 photos, 3 shopping lists); a second batch at `22:51:15.837038+00` soft-deleted 3 more shopping lists.
- Reproduced on a local Supabase test double: share one note, open that link in a second signed-in tab, 7 of 7 objects soft-deleted in one batch. Sharing itself changed nothing.

## Impact
Main Board objects soft-deleted (15 in the two incident batches).

## Data loss
None physical. Every row still exists with its data; restoring is clearing `deleted_at`.

## Related defect found while reproducing
Any signed-in user whose cached board contained a **zone** crashed at page load (`Cannot read properties of undefined (reading 'some')` in `cloudSanitize`): the zone constants were declared after the boot step that sanitises the cached board. The page then showed an empty board. Fixed in the same hotfix.

## Fix (hotfix `hotfix/share-sync`)
- A share-link page never starts the account sync (`SHARE_LINK_PAGE`), never attaches to the account's board (the sync layer refuses via `host.isShareView`), and never overwrites the cached board.
- Zone constants are declared before the boot-time sanitising.
- Boot and remote loading sanitise and draw one object at a time (`sanitizeSafely`, try/catch around `renderNote`), so one unreadable object cannot abort loading of the rest.
- An object this device could not read is recorded as "present" (`protectedIds`) so the sync diff can never infer a deletion from it.

## Regression coverage
`supabase/tests/client.test.mjs` (real sync code against a database):
- incident: the board starts with 5 live objects
- incident: a share-link page refuses to attach to a board
- incident: a share-link page never deletes anything (5 of 5 live)
- incident: no row was soft-deleted
- control: without the guard the same situation deletes the whole board (the test can see the bug)
- control: housekeeping restore
- incident: an object this device could not read is never deleted
- control: without protection a missing object is deleted
- incident: opening someone else's share link never touches the visitor's own board

`supabase/tests/v082.guards.test.mjs` (source guards): share page identified once; share page never starts the sync; the sync layer refuses to attach from a share page; no cache overwrite; zone constants before boot sanitising and declared once; per-object sanitising; unreadable objects protected; per-object drawing isolated; the old all-or-nothing sanitising is gone.

## Still open
The architectural hazard behind it (deletion inferred from absence) is tracked in `docs/dev/DATA-SAFETY-FOLLOWUP.md` and is a **pre-public-beta blocker**.
