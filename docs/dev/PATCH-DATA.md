# Patch data: one source, three readers

Stick-It's patch information has **one canonical source**. The in-app Patch Notes, the Patch Spotlight / tutorials, and the public website's patch page all read from it. Nothing is written twice.

## The source (edit these)

| File | What it holds |
| --- | --- |
| `docs/patch-notes/patch-notes.json` | Per version: `version`, `codename`, `title`, `date` (`null` until released), `status` (`development` / `released`), `tldr`, `tags`, `highlights`, and the replayable `tour` cards (`title`, `body`, optional `feature` + `action`). |
| `docs/patch-notes/<version>.md` | The full user-facing notes. Each `## Heading` is a section. |
| `docs/patch-notes/index.json` | Ordered list of versions and their `.md` file. Newest first. |

Rules: tags come from the fixed list in `tools/build-patch-data.mjs`; a version with no `tour` gets one **derived** from its notes (section headings and first bullets), so old patches never invent features; `date` stays `null` and `status` stays `development` until the owner approves a release.

## The generated files (do not edit by hand)

Run `node tools/build-patch-data.mjs` (add `--check` to verify without writing).

| Output | Used by |
| --- | --- |
| `js/patch-history.js` | In-app history reader, full notes, tour replay (`js/patch-reader.js`) |
| `js/patch-data.js` | The "Stick-It updated" Spotlight for the current version |
| `docs/patch-notes/patch-history.json` | Website export: complete machine-readable history |
| `docs/patch-notes/patch-notes.js` | Website helper (same data as a script) |

`--check` fails when a generated file is out of date, so CI and `supabase/tests/v0832.test.mjs` catch a forgotten rebuild.

## In-app behaviour

* Settings → Legal & About → What's New opens the history. Search, category chips, Newer/Older, "Replay patch tour".
* A tour card's "Show me" only runs a safe action from a fixed list (`openDone`, `openTrash`, `openLegal`, `openShortcuts`, `openSounds`, `openPatchNotes`, `openPalette`). Unknown actions do nothing.
* Replaying a tour **does not** change the "seen version" state or the release status.
* Tour keyboard: Enter / Right = next; Backspace / Delete / Left = previous; Esc closes. Never intercepted while typing in an editable field.

## Website mapping (no website build here)

The website needs no build step from this repo. To show patches it can fetch `docs/patch-notes/patch-history.json` (or load `patch-notes.js`) and render each version's `title`, `date`, `status`, `tldr`, `tags`, and `sections[]`. The `.md` files are the same text for readers who prefer Markdown. Show only versions whose `status` is `released` on the public site; development entries are for the in-app history.

## Adding a patch

1. Add the entry to the top of `patch-notes.json` and `index.json`.
2. Write `<version>.md`.
3. `node tools/build-patch-data.mjs`, then `node supabase/tests/v0832.test.mjs`.
4. Bump `js/config.js` (`APP_VERSION`, `APP_CODENAME`, `APP_STATUS`).
