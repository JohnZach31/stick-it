# Stick-It handoff (after the v0.8.2 validation pass)

## Where things are
- Version: **0.8.2 "Get a Grip"**, status **development** (`js/config.js`, `docs/patch-notes/index.json`).
- Repo: `JohnZach31/stick-it`, branch `master`. Live: https://johnzach31.github.io/stick-it/ (GitHub Pages deploys every push to master). Local folder `D:\stick-it`.
- Both Supabase migrations of this patch are applied to the real project (`npx supabase migration list` shows all 15 local = remote). The CLI is already linked (`supabase/.temp/project-ref`).
- Never commit: the owner's residential address, secrets or service keys. No payments, analytics or ads. Don't disable RLS. The legal pages stay DRAFT until the owner approves. Trailer on commits: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Don't push unless asked.

## Architecture in one page
- Static site: `index.html`, `css/app.css`, `js/app.js` (one large IIFE, ~10k lines), small classic scripts on `window.Stick.*` (`config`, `a11y`, `keys`, `lang`, `patch-data`, `cloud-client`, `repo`, `assets`, `sync`, `sharing`, `account`, `billing`, `cutout*`, `collab`, `objects`). No build step.
- Supabase: Postgres with RLS and SECURITY DEFINER RPCs (`supabase/migrations`), Storage, Realtime, Edge functions (`supabase/functions`). Browser code only has the public anon key.
- Objects are rows in `notes` arrays (local) / `board_objects` (cloud, `type` is free text matching `^[a-z][a-z0-9_]{0,23}$`, so new types need no migration). Notes, photos, audio/video, paper kinds (`js/objects.js`), soup, **zones** (`type:"zone"`).
- Key internal pieces: `openControlCenter` (settings shell), `openModal`, overlay stack `OV.layer(id, close, isOpen)` (Esc closes the top layer), **action registry** `defineAction` (drives shortcuts, the palette and the Shortcuts pane; pure key rules in `js/keys.js`), `startTour(steps)`, `MediaStore` (IndexedDB blobs + object URLs), `PreviewCache`, `cleanSnapshot/applyClean` (Clean up), pin (`PIN_JS` section), zones, spatial history (`VH`), bookmarks.
- Settings and preferences: device `settings` object; signed in, `profile_settings.ui_prefs` (jsonb, 8 kB) carries custom shortcuts and the "seen update" flag (`Stick.account.saveUiPrefs`).
- Patch data: `docs/patch-notes/patch-notes.json` is the single source. `node tools/build-patch-data.mjs` writes `docs/patch-notes/patch-notes.js` and `js/patch-data.js` (used by the app's update card and tour). Legal pages are generated: `python tools/build-legal.py` from `docs/legal/*.md`.

## Migrations (newest last)
`20260930120000` core schema … `20261001150000_owner_premium`, then **`20261002100000_comment_delete`** (`delete_comment()` + `comments_guard` trigger) and **`20261003100000_ui_prefs`** (`profile_settings.ui_prefs`).

## What is actually validated
Local (stand-in backend, real SQL under PGlite, in-app browser):
- All suites pass: SQL/RLS 391 (with mutation check: all caught), billing/guards 228, client 142, fake backend 41, functions 89, cutout 26, objects 24, collab 18, v0.8.1 guards 49, v0.8.2 DOM and key rules 38, v0.8.2 guards 36, share errors 30. Run `cd supabase/tests && npm run test:all`.
- Browser-verified: palette, rebinder (reserved/duplicate/Replace, Esc), pin, zones (carry), Clean up (counts, pinned and zone handling, no overlaps, undo), Fit/Rip, spatial history, patch tour (0.8.1 → 0.8.2 card, Show me, Not now, replay, reset), legal reading options and globe, Esc stack, 375 px layout, automated name/label check clean.
- Memory (local, Chromium, JS heap and DOM counts): notes, zones, palette, Settings, tour, 20 photos, 4 videos, 5 voice memos, delete/undo three times: DOM returns to baseline, heap flat. One leak found and fixed: deleted media kept its object URL (`MediaStore.release`).
Real project:
- Migrations applied; `delete_comment` exists and refuses signed-out callers; `profile_settings` refuses anonymous reads.
- Live site (signed out) smoke: loads as 0.8.2, create/edit note, search, Settings, palette, pin, bookmark dialog, What's New, no console errors.

## Not validated yet (owner action or a second account needed)
- Signed in on the real project: Control Center sections, plan popover, storage bar, crown, username check, preference persistence (appearance, sound, shortcuts) after reload.
- Comment delete with real accounts: author, board owner, other collaborator (must fail), viewer (must fail). The SQL tests cover it; the UI/DB agreement is untested live.
- Done pile across two sessions; real Realtime (presence, edit lock, comments, review) with two accounts.
- Physical phone (375/390/430 widths only inspected at 375 in an emulated pane), screen reader.
- Memory: decoded-image memory, cutout model lifetime and live collaboration were not measured; the browser pane cannot report decoded bitmap memory.
- Signed-in OAuth cannot be driven by the assistant; the owner signs in.

## Public share failure report (RESOLVED: CORS)
Root cause: the owner opened the link from `http://localhost:8124`, but the functions only allowed `localhost:8123`, so the browser blocked the request (shown as Code: network). Fix: `_shared/http.ts` now allows `http://localhost` and `http://127.0.0.1` on any port, plus the origins in `ALLOWED_ORIGINS`; `resolve-share` and `report-share` were redeployed (other functions pick it up at their next deploy). The original report below is kept for the record.
Owner saw "Couldn't reach the server" opening a shared board in a private window on the live site. Not reproduced: live-board, snapshot, revoked (410), unknown (404) and malformed links all resolved correctly signed out with empty storage; CORS allows the Pages origin; `resolve-share` v9 is deployed; anon cannot read any table or storage object directly. Remedy shipped: `Stick.share.resolve` now returns a `kind`, the page shows distinct messages with Try again, a code appears under the message (network, timeout, 502, 404, 410). Ask the owner for that code if it recurs. Edge function latency is 1.6-2.3 s per resolve (signing assets); caching resolved assets is a possible later improvement. GitHub Pages caches scripts up to 10 min, so right after a deploy old and new files can briefly mix.

## Known limitations
- Bookmarks are per device. Zones have no "arrange inside". Pins aren't carried through duplicate/paste/import. App is English only (the language registry `js/lang.js` is ready). Legal text is a draft. Heredocs in this environment collapse double backslashes: write JS/regex files with the Write/Edit tools, not shell heredocs.

## Owner checklist for the remaining real-project checks
1. Sign in on the live site; open Settings; check Account (photo, crown, plan chip hover, storage bar), edit Bio (avatar must not flicker), Save (stays on the section, says Saved), reload, confirm Appearance, Sounds and any changed shortcut persisted.
2. With a second account on a shared board: comment as B; B deletes own (works); a third collaborator tries to delete B's (must not); the owner deletes B's (works); a viewer has no delete.
3. Open the same board on two devices: mark a note Done on one, check the other, restore it.
4. On a phone: Control Center, palette (Ctrl/Cmd+K needs a keyboard; use the Settings → Shortcuts list), bookmarks, What's New, Clean up, zones, voice and video controls.

## Next planned patch
**v0.8.3 — Stick Around.** Not started. Do not start it until the owner says so.
