# Incognito notes (v0.8.4)

A scratch-off foil laid over a plain note. **It is a visual cover, not security.** The words are stored, synced and shared exactly like any other note's. The interface never calls it encrypted, locked or secure; for that, use a PIN lock ([LOCKED-NOTES.md](LOCKED-NOTES.md)).

Code: `js/incognito.js` (the foil and the scratching, no app knowledge), the "Incognito" section of `js/app.js` (state, menus, leak guards), `css/privacy.css`. Tests: `supabase/tests/v084incognito.test.mjs`.

## Behaviour
- **Menu:** Make Incognito / Reveal / Cover Again / Remove Incognito, in the note menu and (Make / Remove) in the multi-select menu. One undo step each.
- **Foil:** a canvas of silver metal (gradient, grain tile, brushed streaks, scuffs, flecks, a sheen), a handwritten "Scratch to reveal" and an eye printed on it, and a curled corner. The foil starts below the note's drag tab, so the tab still moves the note.
- **Scratching:** pointer events with pointer capture and coalesced samples; a soft radial brush stamped along the stroke with jitter (an organic, scraped streak, not a rigid circle); tiny foil flakes fly from a single shared overlay. A scratch never starts a note drag, a board pan, a selection or a caret (`touch-action:none`, `preventDefault`, `stopPropagation`).
- **Coordinates:** the pointer's `offsetX/Y` is mapped by the canvas's *layout* size, which ignores CSS transforms, so scratching is correct at any board zoom and any note rotation.
- **Threshold:** coverage is measured on a 40×40 shrink of the canvas; at **60%** cleared the rest lifts off by itself. Reduced-motion users get no flakes and no lift animation.
- **Keyboard / screen reader:** the foil is a focusable `role="button"`; Enter or Space reveals it. The words under it are `visibility:hidden` until it is gone, so find-in-page and screen readers do not see them.
- **State:** `incog: true` is saved and synced with the note. *Whether it has been scratched* is never saved: a refresh covers every Incognito note again. Once scratched it stays open for the session; the small eye on an open note (or Cover Again) puts the foil back.
- **Shared copy:** sharing an Incognito note first says plainly that the foil is not privacy. The viewer sees the foil and can scratch it.

## Leak protection
A covered note shows no words in search (dimmed, never matched), `itemText` (share text, print title), the Done list and pile tops, board thumbnails (a grey card), the system clipboard (the placeholder `[Incognito note]`, and the private clipboard type that carries the words is not offered), print / PDF (foil only) and previews. Once the foil has been scratched away on purpose, the note behaves normally.

## Performance
The canvas is capped at 1.5× device pixels. A pristine foil that is far off screen gives its pixels back (IntersectionObserver) and repaints identically when it returns. Measured with 150 foils mounted on one page: ~1 s to build all of them, ~1.4 ms per scratch stamp, ~25 MB of canvas at a 0.67 pixel ratio (about 5× that at 1.5×). The off-screen release could not be observed in the automated browser (it does not deliver IntersectionObserver callbacks); with it off, memory is the figure above.

## Limits
Plain notes (including checklists) only. Photos, papers, recordings, zones, piles and embeds cannot be Incognito. Touch scratching uses the same pointer-event path as the mouse and has not been tried on a physical phone or tablet.
