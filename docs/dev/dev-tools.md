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
