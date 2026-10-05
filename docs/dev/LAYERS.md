# Layer scale

Every full-screen surface takes its `z-index` from one scale (`css/app.css`, the "Central layer scale" block), so a dialog can never again sit under a system space (the cause of the "Empty Trash confirmation under Trash" bug: dialogs were 10030, the Done / Trash sheet 10045).

Order, lowest to highest:

1. canvas background
2. zones (no z-index of their own: only the title rail rises, `z-index: 9999`)
3. objects (`z-index` = the object's layer)
4. object chrome (tabs, handles) and selection
5. floating board controls (the Done / Trash dock, minimap)
6. toasts / status pills — `--z-toast: 10029`
7. system-space chrome (Done, Trash, pile browser) — `--z-system: 10045`
8. modal backdrop + modal (Settings, share, collaboration, confirmations) — `--z-modal: 10070`
9. readers opened from Settings (Patch Notes, Legal) — `--z-reader: 10075` (their tour 10076). A dialog opened while a reader or a system space is open gets class `critical` automatically, so it is above them.
10. the first-run tutorial — `--z-tutorial: 10080`
11. critical confirmation — `--z-critical: 10090` (add class `critical` to the backdrop)

New surfaces must use a variable, not a number. Escape handling is separate: `OV.layer(...)` keeps a stack so Esc closes the top-most surface only.
