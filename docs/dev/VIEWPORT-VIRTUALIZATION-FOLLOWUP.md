# Follow-up: viewport-based rendering (partial virtualization)

Origin: a stress test that duplicated notes to about 660 objects and got badly slow. The hotfix added layered safeguards (duplicate/paste burst slowing, soft size warnings at 500/750/1000, a projected-size confirmation for bulk operations, dev diagnostics). This task is the long-term answer; it is **not** part of the hotfix.

## Where the cost is today
Measured on the dev machine (Chromium in the app's browser pane), simple one-line notes, guest board, see `Stick.dev.perf()` in `docs/dev/dev-tools.md`:

| Active objects | Board DOM nodes | Board draw + layout at load | Redraw all | JS heap |
| --- | --- | --- | --- | --- |
| 100 | 2,300 | 88 ms | 41 ms | 7.1 MB |
| 250 | 5,750 | 137 ms | 115 ms | 9.4 MB |
| 500 | 11,500 | 275 ms | 330 ms | 7.8 MB |
| 750 | 17,250 | 311 ms | 631 ms | 8.7 MB |
| 1000 | 23,000 | 333 ms | 597 ms | 8.4 MB |

Two facts stand out: **a simple note is about 23 DOM nodes**, and the JS heap is small while the DOM grows linearly, so the pressure is the browser's own DOM, style and layout memory, not our data. Select-all at 1000 objects took about 440 ms. (Numbers are from one machine and one run; treat them as the shape, not a benchmark.)

## Direction
1. **Mount by viewport.** Fully render objects inside the viewport plus an overscan margin. Objects outside stay in board state (`notes`) but have no or a very cheap DOM.
2. **Force-mount** anything selected, found by search, being dragged or focused, anything with an open editor, comment slip or menu, and anything a pending sync or undo step needs the element of.
3. **Cheap geometry for the minimap** (rectangles from position and size), never cloned or full nodes. `cleanItem`/`objSize` need a position-and-size path that does not read the DOM.
4. **Release expensive resources offscreen** where safe: decoded photo previews (`PreviewCache`), video/audio elements, object URLs (`MediaStore.release` already exists), canvases.
5. **Cut the per-note node count first.** 23 nodes for a one-line note is the cheapest win: lazily build the controls (the `...` button, quick-done, resize handles, edges, tape, paper effects) on hover or selection instead of at render.
6. **Piles are a user-controlled form of the same idea** (see the pile spec): a collapsed pile renders one top object and a few decorative edges while the members stay in board state.

## Hard safety constraints (from the 2026-10-04 incident)
- An object that is **not mounted is still present**. The sync snapshot (`host.snapshot`) must keep returning every object, mounted or not, or the diff will read the unmounted ones as deletions. Mount state must never be inferred from, or reflected in, `notes` membership.
- No code path may treat "no element" as "does not exist".
- Add a regression test that unmounts most of a board and proves that a sync flush sends **no** deletes.

## Acceptance
- A 1000-object board loads in the same time as a 250-object one today and keeps typing, dragging and scrolling smooth.
- Select-all, Clean up, search, minimap and undo still cover unmounted objects.
- The incident regressions in `supabase/tests/client.test.mjs` stay green, plus the unmount-sync test above.
