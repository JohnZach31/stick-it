# System spaces: Done and Trash (v0.8.3)

Status: built (development). Not yet verified with two real devices or a signed-in account.

## Model
- Done and Trash are **views of this board's own objects**. An object is *done* when it has `doneAt`, *trashed* when it has `trashedAt` (plus `doneBy` / `trashedBy`). It stays a normal row in the board's object list: it syncs, exports and reloads like everything else.
- In the app, `notes` is what is drawn on the board; `donePile` and `trashPile` hold the done / trashed objects. **The sync snapshot is `notes + donePile + trashPile`** (and so is every save). An object is therefore never "missing" because it is done, in Trash, piled, offscreen or filtered.
- Boot and `applyRemote` sort objects by their own markers.
- **Delete** (the user's explicit act) = `trashNotes`: the object moves to Trash with its content, position, layer, angle, pin and reactions. One undo step. Only a quiet clean-up of an unused blank note (`deleteNotes(..., {silent:true})`) is still a real deletion. A pile object itself is removed (it only references papers); its members go to Trash.
- **Restore** puts the object back at its original position, on top. **Delete forever** removes it from the lists, which is the one thing that makes the sync layer soft-delete the row (server cleanup after that is the existing 30-day job). Always confirmed; Empty Trash is confirmed with the count.
- Done items can be put back, or moved to Trash (never straight to oblivion).

## Not shareable
Done and Trash are not boards. A public live share filters out objects with `doneAt` / `trashedAt`. Snapshot shares only include the objects the owner selected on the board.

## Collaboration (needs an owner decision before it changes)
Existing Done semantics are kept: the marker is on the object's row, so it is a **board-level** state. A collaborator who trashes or finishes something does it for the board, exactly as deleting always did. A per-user Done / Trash that spans boards would be a new data model (and a new RLS surface); that is a follow-up and was deliberately not done here.

## Follow-ups
- Per-user, cross-board Done and Trash (and "search all boards").
- Trash retention policy (today Trash keeps things until Delete forever).
- Completion-effects preference (Off / Subtle / Full).
- Server regression test of Delete forever against the real Supabase project.

## Tests
`supabase/tests/v083.test.mjs` runs the real `trashNotes`, `restoreFromTrash`, `deleteForever` and `doneToTrash` against an in-memory board and asserts the snapshot never loses an object; `client.test.mjs` proves against the database that Trash and Done leave rows live (with a negative control) and Delete forever deletes.
