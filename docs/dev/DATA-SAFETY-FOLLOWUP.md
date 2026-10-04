# Data-safety follow-up: stop inferring deletions from absence

Origin: `docs/incidents/2026-10-04-share-link-deleted-board.md`. **Pre-public-beta blocker.** Not part of the emergency hotfix.

## The hazard
`js/sync.js` `computeDiff()` decides "the user deleted this" when an object that this client knows exists on the server is **not in the current in-memory list**. Absence is not intent. A partial list can come from: a share or viewer page, a failed or interrupted load, a malformed or unreadable object, a stale tab, a partial cache, a filtering or rendering bug, a future migration. Any of these, combined with one flush, soft-deletes real data.

The hotfix closes the one trigger that happened and adds two backstops (a share page never attaches; unreadable objects count as present). Nothing yet stops a *different* partial state from doing the same thing.

## Target model
Deletion originates from an **explicit user action** and travels as an explicit **tombstone**, never as the difference between two lists.
- The app records a delete intent (id, time, device) at the moment the person deletes (single, group, clear bought, move to another board, Done is not a delete).
- The sync layer sends only recorded intents as deletes. Absence from the list never produces one.
- Reconciliation (the diff for creates and updates) runs only after the board is **fully loaded** from the server for this session (a "loaded" flag that a failed or partial load cannot set).

## Work items to investigate and decide
1. **Explicit deletion intent and tombstones.** Where the client records them (storage key per board), how they survive reloads and offline, how they are cleared after the server acknowledges. Interaction with Undo (undo of a delete must cancel the pending tombstone or re-create).
2. **Fully-loaded-board requirement.** No create/update/delete reconciliation until the first successful full pull for the board in this session; define "fully loaded" precisely (all pages fetched, no error, board id matches).
3. **Suspicious bulk-deletion guard.** If one flush would delete more than a small number of objects (suggest > 5, or > 25% of the board) and those deletes did not come from explicit intents recorded in the last few seconds, refuse, show a calm message, and keep the objects.
4. **No destructive reconciliation from viewer, share or partial states.** `readOnlyMode`, `isShareView` and "not fully loaded" must each independently block deletes (belt and braces).
5. **Server-side guard.** Consider rejecting a `sync_objects` call whose `p_deletes` exceed a threshold unless it carries an explicit "bulk" flag, and stamping `deleted_by` / `deleted_via` so anomalies can be found afterwards.
6. **Logging and telemetry (privacy-safe).** Count, size and reason of deletion batches; flag unusual ones (for example 12 or 50 objects in one call) for the owner without sending any content. Keep to the project rules: no analytics service, no ads.
7. **Recovery path.** A supported "restore recently deleted" view, so a bad batch is undone in the app and not with SQL. (Soft-delete already keeps rows for 30 days before `gc_purge_deleted_objects`.)
8. **Migration safety.** Any change that alters how objects are read or sanitised must prove that unreadable-or-changed objects are kept, not dropped.

## Acceptance for closing this task
- A test that builds an arbitrary partial in-memory state (empty, subset, disjoint, malformed) and proves **no delete is sent** unless an explicit intent exists.
- A test that a failed or partial load cannot reach the reconciliation step.
- A test for the bulk guard (refuses, then allows when the deletes are explicit).
- The incident regressions in `client.test.mjs` still pass unchanged.

Do not start before the owner confirms the incident recovery. Do not redesign the whole sync layer; change what deletes are derived from.
