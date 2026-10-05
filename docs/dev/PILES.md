# Piles and vertical stacks (phase 1)

Status: phase 1 built locally (not yet owner-verified on the live site). **No Fan view yet** — that waits until phase 1 has survived reload, sync, undo/redo, board switch, share/export and a large-board stress.

## What it is
- **Vertical Stack**: an arrangement only. The selected notes are laid out ~28px below one another (steps tighten for long stacks so everything stays on the board). Nothing about the notes changes. One undo entry.
- **Pile**: a small object (`type: "pile"`) that *references* its members. Collapsing hides the members; the board draws the top paper, three decorative edges and a count badge (about 11 DOM elements whether it holds 3 papers or 250).
- Pile menu: Unpile · Send the top paper to the back · Take the top paper out · Mark the top paper done · Pin · Delete the pile and its papers… Selection bar / group menu / command palette: Stack, Pile, Unpile.

## Data model
Pile row: `{id, type:"pile", x, y, w, rot, z, members:[id…] (top first), ox, oy, edges}`. `ox/oy` is where the pile was made; unpiling puts the papers back shifted by however far the pile was dragged (moved as one group, so spacing survives the board edges). Members keep **their own rows and all their content**, plus `pileId`. No nested piles. No content is copied into the pile. Server: ordinary `board_objects` rows (`type` is free-form, `data` is jsonb); no migration.

## Safety rules (sync is the non-negotiable part)
1. Collapsed members stay in `notes` and in `host.snapshot()`. A member is *not drawn*, never *absent*. `syncPileVisibility()` only removes/adds DOM elements.
2. A member is hidden only if its pile exists, lists it, and has ≥2 live members. A missing/damaged pile, or a pile row that has not arrived yet, leaves every member visible (`Stick.pile.isHidden`).
3. Never infer deletion from "no element".
4. Deleting a pile (Delete key, button, selection bar) means **Unpile**. Only "Delete the pile and its papers…" (separate, confirmed) deletes members, as one undo entry.
5. Done: only a member leaves the pile (state kept, goes to the existing Done pile, `pileId` dropped, pile count down; with one left the pile opens). A pile cannot be marked Done. A member finished on another device is released from its pile locally without deleting anything.
6. A pile never counts itself: board-size warnings and the count line use the logical count (members). Dev diagnostics show logical / piles / collapsed / rendered.
7. Imports, pastes and links never create piles and strip stray `pileId`s (`normalizeIncoming`); piles are not duplicated, moved to another board or shared in phase 1.
8. Empty-note cleanup never removes a pile (`noteHasContent`).

## Search / Clean Up / minimap
Search looks inside collapsed members; the pile lights up (ring + "N matches inside"); click it to select/open. Clean Up sees a pile as one footprint (hidden members have no element). The minimap and the board thumbnail skip hidden members.

## Known limits (phase 1)
- A pile holds up to 500 papers; notes, receipts and tickets only (not photos, media, zones, shopping lists, pinned or Done things).
- Concurrent edits to the same pile from two devices are last-write-wins on the pile row (member list). Members themselves keep their own rows and are never lost.
- Viewer / share-link pages show members as ordinary papers where ids were rewritten (safe degradation).
- Stack steps tighten to 2px for very long stacks (a 250-note stack is practically a heap; use Pile).

## Measurements (dev machine, Chromium pane, simple notes)
| Notes | Stack | Collapse into pile | Unpile | Board DOM nodes while piled |
| --- | --- | --- | --- | --- |
| 10 | 7 ms | 3 ms | 6 ms | 12 |
| 50 | 20 ms | 10 ms | 27 ms | 12 |
| 100 | 53 ms | 22 ms | 75 ms | 12 |
| 250 | 137 ms | 20–111 ms | 159–219 ms | 12 (vs ~5,800 unpiled) |

Dev helpers: `Stick.dev.stackAll()`, `pileAll()`, `unpileAll()` (see `docs/dev/dev-tools.md`).

## Tests
`supabase/tests/pile.test.mjs` (rules + code guards), and the sync-invariant block in `client.test.mjs` (collapse/Done/unpile delete nothing server-side, with a negative control proving the test can see the bug).

## Before Fan view
Two-device check (collapse on A, see it on B; Done on one device), signed-in reload, share/export, board switch, and the viewport-virtualization follow-up.
