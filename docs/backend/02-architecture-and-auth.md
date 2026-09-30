# Architecture, sessions and auth

```
GitHub Pages (static)  ──►  supabase-js (js/vendor)  ──►  Supabase
 index.html + /js               Auth (Google, PKCE)          Postgres + RLS + RPCs
 window.Stick.*                 REST / RPC                   Storage (private `media`)
                                Functions (public share)     Edge Functions
```

## Client modules (`/js`, classic scripts on `window.Stick`)
| file | role |
|---|---|
| `config.js` | PUBLIC config, plan/media limits (UX mirrors only), sync tunables |
| `cloud-client.js` | lazy supabase-js load, `Stick.mode`, `Stick.auth`, error mapping |
| `repo.js` | boards/objects data access, row mapping, content hashing |
| `assets.js` | upload → finalize, signed URLs, IndexedDB blob cache |
| `sync.js` | diff-based queue, retry/backoff, conflict handling, polling pull, status |
| `sharing.js` | snapshot / live-board links, resolver, report |
| `migrate.js` | guest → account import (idempotent, verified) |

The app never talks to Postgres directly outside those modules. Supabase-js is only downloaded when a backend is configured, so guests pay nothing.

## Modes and storage keys
- **Guest**: keys `stickyboard.*` in localStorage/IndexedDB, exactly as before.
- **Signed in**: `stickyboard.cloud.<uid>.*` (a per-account cache of the server state). The mode is decided synchronously at startup from the stored session, so there is no flash of the wrong data.
- **Sign out**: the cloud cache and session are wiped on that device; guest data is untouched and returns.

## Auth
- Google via Supabase Auth, **PKCE** redirect flow (`flowType: 'pkce'`, storage key `stickit.auth`). The app redirects to `location.origin + location.pathname` (GitHub Pages and localhost both work; both must be in the Supabase redirect allow-list, see 06-setup).
- Hash routes (`#s=…`, legacy `#sn=/#sg=/#sb=`) are not touched by auth (PKCE returns `?code=`), so a shared link opened while signing in still works.
- The profile row (`profiles`) is created by the `ensure_profile` RPC; `plan` and `role` columns are **not** writable by the client (column-level grants).
- A lost session mid-use switches the sync pill to *Sync problem* and offers sign-in; local edits are kept and re-queued.

## Sync in one paragraph
Each object has a server `version`. The client keeps `known[id] = {version, hash}`; on every change it hashes the canonical row and queues only differences (rebuildable after a reload, so nothing is lost if the tab closes). Writes go through `sync_objects` (per-row results: ok / conflict / denied / invalid). On conflict the server wins and the local text is kept as a *conflict copy* so nothing is silently lost. Deleted-remotely-but-edited-locally resurrects. Pull is a watermark poll (20 s, 2 s overlap). Offline retries with backoff. Status pill: Saved · Saving… · Offline · Sync problem.
