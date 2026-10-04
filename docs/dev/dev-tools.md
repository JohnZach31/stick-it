# Development tools (local only)

## Static server
```
node tools/dev-server.mjs 8124        # http://localhost:8124 (and 127.0.0.1:8124 as a second origin)
```
Use this instead of `python -m http.server`: Python serves `.mjs` as `text/plain` on Windows, which breaks ES-module imports used by ONNX Runtime Web. The server supports Range requests and no-cache headers.

## Fake Supabase (real migrations on PGlite)
```
cd supabase/tests && node --experimental-strip-types fake-supabase/server.mjs 54321
```
Point a local page at it: `localStorage.setItem('stickit.dev.config', JSON.stringify({SUPABASE_URL:'http://127.0.0.1:54321', SUPABASE_ANON_KEY:'<from /__admin/config>'}))` (only honoured on localhost). Restart it after adding a migration. It has no websockets, so Realtime presence is not available there (see `Stick.dev.startPresence`).

## `Stick.dev.*` helpers (exist only on localhost / 127.0.0.1 / `DEV_HOSTS`)
| Call | Effect |
|---|---|
| `resetAgeGate()`, `resetConsent()`, `showAgeFlow()` | age-step testing (`docs/dev/age-flow-testing.md`) |
| `setPremium(true/false/null)` | local-only entitlement override for Alphabet Soup; the **server still refuses** a free account |
| `presenceDemo(true)` / `startPresence('Ana')` | two tabs of one browser stand in for two people (BroadcastChannel transport) |
| `loader.show/done/fail/hide` | look at the Stick-It loader states |
| `ui.stripNeedsMore(n)`, `ui.stripPicker()`, `ui.doneTray()`, `ui.askReason()` | open the new dialogs without setting up a board for each |
| `ui.controlCenter(section)`, `ui.cleanUp()`, `ui.activeShares()` | open the Control Center at a section (`account`, `appearance`, `sharing`, `privacy`, `sounds`, `shortcuts`, `legal`), the Clean up dialog, or Active Shares |
| `ui.foot.start(text, delay)`, `.done(text)`, `.fail(text)`, `.end()` | look at the status slip at the foot of the canvas |

## Tests
```
cd supabase/tests && npm install
node run-tests.mjs                       # SQL/RLS on PGlite (migrations A-M)
node mutation-check.mjs                  # re-introduces security bugs; the suite must fail for each
node billing.test.mjs                    # repository guards (CSP, no analytics, legal, v0.8.0 rules)
node cutout.test.mjs                     # cutout maths (blur, guided filter, clean-up, refine)
node objects.test.mjs                    # receipt / ticket / postcard / strip rules
node collab.test.mjs                     # presence merge, staleness, note lock
node --experimental-strip-types client.test.mjs
node --experimental-strip-types fake-supabase.test.mjs
node --experimental-strip-types functions.test.mjs
```
`npm run test:all` runs them in order.

## Cutout engine experiments
The model evaluation (images, scripts, ONNX files) was done outside the repository; the numbers and decision are in `docs/cutout/provider-evaluation.md`. To try the engine on a photo: serve the site with the dev server, open the app, drop a photo, press the style button.

## Performance fixture
`tools/perf-fixture.js` builds a board of about 55 objects (large photos, soup notes, scraps, media) in this browser's own storage and measures DOM size, running animations, decoded picture memory and the cost of dragging a note:
```js
const s = document.createElement('script'); s.src = '/tools/perf-fixture.js'; document.head.appendChild(s);
await window.__perfFixture.build();      // then reload the page
await window.__perfFixture.measure();    // after the reload
```
Before/after numbers are in `docs/patch-notes/0.8.0-audit.md`.

## Experimental finer cutout model
Not shipped (see `docs/cutout/provider-evaluation.md`). To try it locally, put a model at `assets/models/silueta.onnx` (it is git-ignored) and set `localStorage.setItem('stickit.dev.config', JSON.stringify({FINER_MODEL: true}))` on localhost.

## Patch notes data
`docs/patch-notes/patch-notes.json` is the single structured source (highlights, added, improved, fixed, limitations per version). After editing it or `index.json`, run:
```
node tools/build-patch-data.mjs     # checks index.json against it and writes docs/patch-notes/patch-notes.js
```
The perf fixture also takes a multiplier: `await window.__perfFixture.build(5)` repeats the non-picture objects five times (offscreen cost checks).

## Patch tour / What's New (local only)
The update card and tour read `Stick.patchData` (generated into `js/patch-data.js` by `node tools/build-patch-data.mjs` from `docs/patch-notes/patch-notes.json`; `tourMode` is `full`, `summary` or `none`). On localhost:
```js
Stick.dev.patchTour.reset();    // forget "seen" on this device, then reload to get the update card again
Stick.dev.patchTour.replay();   // run the tour now
Stick.dev.patchTour.offer();    // show the update card now
```
Nothing like this exists on any other hostname. Signed in, "seen" is also stored in the account's `ui_prefs` (private, 8 kB cap).

## Command palette and shortcuts
`Stick.palette.open()`, `.close()`, `.actions()` list what the palette would show. Custom shortcuts are saved in the device settings (`shortcuts`) and, when signed in, in `profile_settings.ui_prefs.shortcuts`. Apply `supabase/migrations/20261003100000_ui_prefs.sql` before testing the account sync.

## Big-board diagnostics and stress test (local only)
```js
Stick.dev.perf()          // {active, donePile, domNodes, boardDomNodes, mountedMedia:{img,video,audio,canvas}, bootRenderMs, heapMB, level}
Stick.dev.perfRender()    // redraw every object once, with layout: {ms, objects}
Stick.dev.stress(500)     // add 500 simple notes (guest boards only; refuses signed-in boards)
Stick.dev.stressClear()   // remove the stress notes
```
`level` is the size warning level (0 below 500 objects, 1 from 500, 2 from 750, 3 from 1000). The safeguards themselves live in `js/boardguard.js` and are tested by `supabase/tests/boardguard.test.mjs`. Viewport rendering is a documented follow-up: `docs/dev/VIEWPORT-VIRTUALIZATION-FOLLOWUP.md`.
