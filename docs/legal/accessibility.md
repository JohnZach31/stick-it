# Accessibility pass

Guidance used: WCAG 2.2 (level AA as the technical target). **This is not a conformance claim.** Stick-It has been checked with automation plus manual keyboard testing in a desktop browser; it has not been tested with screen readers or by disabled users, and a physical corkboard canvas has inherent limits (notes are positioned freely by dragging).

## Fixed in this patch
| Area | Change |
|---|---|
| **Keyboard: creating a note** | The board could only start a note by double-click. **`N` now creates a note** in the middle of the screen, focused and ready to type (listed in the shortcuts popover). |
| **Keyboard: dialogs** | Every dialog (`openModal`, Account settings) now traps Tab inside itself, restores focus to what opened it, names itself (`aria-labelledby` / `aria-label`), and handles Esc one layer at a time (a dialog opened over another closes first). Tested: Tab from the last control wraps to the first; Esc closes the cropper/confirm before Account settings; focus returns to the opener. |
| **Keyboard: focus visible** | Many controls reset their own styling and lost the browser focus ring. A global `:focus-visible` rule gives every link, button, field and `tabindex` element a 2 px ring (`--focus`: 5.8:1 light, 9.6:1 dark). Verified with a real Tab key press. |
| **Skip link** | "Skip to the board" is the first Tab stop (hidden until focused; removed on public note pages where there is no board). |
| **Labels** | Automated audit (`tools/a11y-audit.js`) on the main view, Settings and the sign-in dialog: the only problem was the search field with a placeholder-only label; fixed (`aria-label`). The nickname field also has a label. After the fix: 0 findings. |
| **Colour contrast** | Measured the real tokens. Failures fixed while keeping the pastel look: white on the amber primary button **2.9:1 → 5.3:1** (new `--accent-strong`); amber link text on cream **2.9:1 → 5.2:1**; dark-mode primary button white-on-amber **1.8:1 → 9.6:1** (dark text); helper text `--ink-soft` raised slightly (now ≥ 4.9:1 even on the soft-amber surfaces); text fields and switches now have a boundary of **3.5:1** (`--edge`, WCAG 1.4.11). Note colours are unchanged (dark ink on pastel is 10:1). |
| **Reduced motion** | `prefers-reduced-motion: reduce` turns off the paper wobble, pops, fades, transitions and smooth scrolling; state changes still show. |
| **Images** | Decorative textures are CSS (not in the accessibility tree). User pictures: alt text is the caption when there is one, otherwise an honest "Picture (no description added)"; **no description is invented** because no image-description feature exists. |
| **Public share page** | Real links (Privacy, Terms, Copyright), a Report button, the picture alt rule above, no keyboard trap. |

## Known gaps (not fixed)
- Notes are moved by dragging; there is a keyboard nudge for a selected note (arrow keys), but selecting a note without a pointer is limited (Tab reaches a note's text; Esc/Enter behave as listed in the shortcuts). A fully keyboard-operable board (select, move, reorder) is a larger design task.
- Voice-memo/video controls were not tested with assistive technology.
- Colour is used for some states (sync pill dot); the text label is always present.
- Screen-reader announcements for sync status and toasts are limited (`aria-live` is used in Account settings; not every toast).
- Not audited: tour/onboarding overlay beyond focus trapping; print styles; zoom beyond 200 %.
- Automated checks do not find everything; manual review with NVDA/VoiceOver is recommended before public launch.
