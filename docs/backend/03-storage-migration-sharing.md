# Storage/media, migration, sharing

## Media
- One private bucket `media`, opaque paths `a/<asset-id>/<file>` (no user or board ids leak in URLs).
- Upload = `create_asset` (server checks role, plan quota, kind/size/mime limits) → upload to the path → `finalize_asset` (server verifies the object exists and matches). Storage policies only allow reading/writing paths tied to an `assets` row the caller can access, so malicious direct uploads are rejected (tested).
- Limits: image 10 MB, cover 5 MB, audio 25 MB, video 50 MB (Supabase Free single-upload cap), storage quota per plan (free 200 MB, premium 5 GB). Change them in `plan_limits`/`media_limits` (server) and mirror in `js/config.js` (UX only).
- Viewing: signed URLs (short-lived) or the IndexedDB blob cache `asset:<id>`. Objects reference assets through `object_assets` (`ON DELETE RESTRICT`), so an asset in use, in undo history or in a share snapshot can never be garbage-collected.
- GC (`gc-assets` function → `gc_purge_deleted_objects`, `gc_claim_orphan_assets`, `gc_finish_assets`): purges objects soft-deleted for > retention, then claims orphan assets, deletes files, records `storage_tombstones`. Runs only with `x-cron-secret`.
- Not done: server-side thumbnails/transcoding/virus scanning. Thumbnails stay client-generated per device (`thumbnail_asset_id` is reserved).

## Migration (guest → account)
- Offered right after first sign-in when the device holds local boards; also from the account menu.
- Deterministic UUIDs derived from `local-<boardId>` + legacy ids + content hash → re-running or retrying after a crash never duplicates.
- Every board is **verified** (server count/hash of what was sent) before it may be marked migrated. Local data is **never deleted automatically**: after success you choose *Keep a copy here* or *Remove from this device* (only verified boards can be removed).
- A photo/recording that can't be read is imported without its media and reported; it never aborts the board. Plan board limits are checked up front and enforced by the server.

## Sharing
| link | what it is |
|---|---|
| `#s=<64 hex>` snapshot (note/group) | immutable copy taken at share time; later edits don't change it |
| `#s=<64 hex>` live board | read-only, always shows the current board; owner only; polled every 30 s |
| `#sn= #sg= #sb=` | legacy self-contained links; still decoded client-side, unchanged |

- Tokens are 256-bit random, stored only as hashes; the list of your links can't re-show a token, only turn it off.
- Resolution happens in the `resolve-share` Edge Function (rate-limited, CORS allow-list, returns signed media URLs, never storage paths). `resolve_share` is not callable by anon/authenticated at all.
- "Turn this link off" / per-board link list; "Report" writes to `share_reports` (moderation foundation only: **no automated moderation or NSFW detection exists**, and none is claimed).
- Guests keep the old link-carries-content sharing (no server).
