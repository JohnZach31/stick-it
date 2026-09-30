# Database, RLS, Storage and the security model

All SQL lives in `supabase/migrations/` (applied in filename order) and is exercised by
`supabase/tests/` (see "Tests" below).

| Migration | Contents |
|---|---|
| `20260930120000_core_schema.sql` | tables, constraints, indexes, triggers, authorisation helper functions |
| `20260930120100_rls.sql` | RLS on every table, revoke Supabase's default grants, column-level grants, policies |
| `20260930120200_functions.sql` | RPCs (`create_board`, `sync_objects`, assets, shares, invites, GC), signup trigger, function grants |
| `20260930120300_storage.sql` | private `media` bucket + storage policies |
| `20260930120400_realtime.sql` | adds tables to the `supabase_realtime` publication |

## Model

```
auth.users 1─1 profiles ─┬─< boards >─┬─< board_members (owner|editor|viewer)
                         │            ├─< board_objects (note|photo|audio|video|...) ─< object_assets >─ assets
                         │            ├─< board_invites          comments ─ object     reminders ─ object
                         │            └─< shares (board_live)
                         └─< assets (kind, storage_path, status, source_asset_id)
shares ─< share_items (frozen copies)   shares ─< share_assets >─ assets
```

* **`board_objects`**: common spatial columns (`x, y, width, height, rotation, z_index`) plus
  `data jsonb` for everything type-specific. New object types need **no** migration
  (`type` only has to match `^[a-z][a-z0-9_]{0,23}$`). `version` (bumped by a trigger) is the
  optimistic-concurrency token; `deleted_at` is a soft delete.
* **`assets`** are first-class: bytes in Storage, metadata in Postgres. Never base64 in rows.
  Derived files (`cutout`, `poster`, `thumbnail`) point at their original via `source_asset_id`.
* **`object_assets`** says which objects use which assets. It is maintained by `sync_objects()` from
  `data.assetId / attachedAssetId / posterAssetId / cutoutAssetId`, and drives both read access
  and garbage collection.
* **Limits are data**, not code: `plan_limits` (boards, storage bytes, objects per board) and
  `media_limits` (max size and allowed MIME types per asset kind). Guests (1 local board) never
  reach the server; that constant lives in `js/config.js`.

### Object JSON conventions (`board_objects.data`)

| Type | Notable `data` keys |
|---|---|
| note | `html, bg, font, fontManual, categoryIndex, isTask, done, due, dueTime, imgW, imgRatio, listHintOff, phys, legacyId, attachedAssetId` |
| photo | `photoStyle, caption, font, imgRatio, phys, cutoutAssetId, assetId, createdAt, legacyId` |
| audio | `caption, font, duration, mime, assetId, createdAt, phys, legacyId` |
| video | `caption, font, duration, mime, imgRatio, assetId, posterAssetId, createdAt, phys, legacyId` |

Client field ↔ column mapping: `w → width`, `rot → rotation`, `z → z_index`. Everything else is `data`.
`image`, `poster` and `cutout` data URLs are **not** stored in the cloud; they become assets.

## Roles and what they can do

| | owner | editor | viewer | non-member | anon |
|---|:-:|:-:|:-:|:-:|:-:|
| read board, objects, media | ✓ | ✓ | ✓ | ✗ | ✗ |
| create / move / edit / delete objects | ✓ | ✓ | ✗ | ✗ | ✗ |
| register uploads (assets) | ✓ | ✓ | ✗ | ✗ | ✗ |
| rename board, covers, delete board | ✓ | ✗ | ✗ | ✗ | ✗ |
| invite / change roles / remove members | ✓ | ✗ | ✗ | ✗ | ✗ |
| publish snapshot shares | ✓ | ✓ | ✗ | ✗ | ✗ |
| publish live board share | ✓ | ✗ | ✗ | ✗ | ✗ |

Membership is per board. Being a member of one board never reveals another board of the same
owner (tested: "membership in A1 does not expose A2").

Locked (`locked_at`) or archived boards are read-only for everyone, including the owner.

## Security decisions worth knowing

1. **RLS on every table; `anon` has no table access at all.** Supabase's default grants
   (`ALL` to `anon`/`authenticated`) are revoked and replaced by explicit, often column-level, grants.
   Clients can never write `plan`, `owner_id`, `version`, `created_by`, `updated_at`, `token_hash` …
2. **Inserts that need server judgement have no INSERT policy** and go through RPCs:
   boards (plan limit), assets (limits, quota, path), shares, invites, members (invite acceptance).
   This closes limit bypasses and "add a stranger to my board so it shows up in theirs" spam.
3. **Asset reference attack closed.** Read access to an asset can be derived from an object that
   references it, so referencing must be restricted: an object may only reference assets of its own
   board or ones the caller owns (`can_link_asset`). Same check for board covers.
4. **Storage access = asset rows.** Uploads only to a server-issued path for a `pending` asset owned
   by the caller on a board they can edit. No overwrites. Deletes only of your own failed/pending uploads.
   Paths are opaque (`a/<asset-id>/<file>`) so signed public URLs reveal no user or board ids.
5. **Share tokens** are 244 random bits, returned once, stored only as SHA-256. `share_items`,
   `share_assets`, `share_reports` have RLS on and no policies (service role only).
   `resolve_share()` is executable by `service_role` only; the `resolve-share` Edge Function
   validates and rate-limits, signs URLs, and never returns storage paths.
6. **Snapshots are frozen copies** (`share_items`) and pin their media (`share_assets`,
   `ON DELETE RESTRICT`) so editing or deleting the source, or the whole board, doesn't change them.
   Live board links show current content and die with the board.
7. **Soft delete + retention.** Deleting an object only sets `deleted_at`. Media referenced by
   soft-deleted objects, snapshots, covers or derived assets is never collected.
   `gc_purge_deleted_objects(30 days)` then `gc_claim_orphan_assets(14 days)` run from the `gc-assets` function.
8. **Nothing leaks on deletion.** Whenever an asset row disappears (GC or account deletion cascade) its
   file path lands in `storage_tombstones`; the GC function removes those files.
9. **Unsafe content.** Uploads: MIME allow-list (no SVG/HTML), size limits per kind, per-plan quota,
   verified against what Storage actually received in `finalize_asset()`. Object HTML: the client
   sanitises on every render; the database additionally refuses obvious active content
   (`<script>`, event-handler attributes, `javascript:` links). That check is defence in depth only.
10. **Function privileges are explicit.** New functions default to `EXECUTE` for everyone, so the last step
    of the functions migration revokes and re-grants. Repeat that pattern in every future migration.

## Cascade choices

* delete board → objects, members, invites, comments, reminders go; **assets and snapshot shares stay**
  (`assets.board_id` and `shares.board_id` are `ON DELETE SET NULL`).
* delete account → profile, boards, assets (tombstoned), shares go.
* `object_assets.asset_id` and `share_assets.asset_id` are `ON DELETE RESTRICT`: a bug in the GC
  can't delete media that something still references.

## Plans and downgrades

`profiles.plan` is `free|premium`, changed only with the service role / SQL editor for now:
```sql
update public.profiles set plan = 'premium' where id = '<user uuid>';
```
Fields for the future downgrade policy exist (`boards.locked_at`, `scheduled_delete_at`) but nothing sets
them: no board is ever deleted or locked automatically.

## Tests

```
cd supabase/tests
npm install
npm test                                     # 188 assertions on a real Postgres (PGlite): RLS, RPCs, storage, sharing, GC
node mutation-check.mjs                      # re-introduces 10 classic security bugs one by one; each must be caught
node --experimental-strip-types functions.test.mjs   # Edge Function handlers (rate limit, CORS, no path leakage, GC order)
```
`prelude.sql` recreates just the pieces of a Supabase project the migrations depend on
(`auth.users`, `auth.uid()`, roles, `storage.objects`, and Supabase's default grants).
These tests cannot exercise Supabase's own services (GoTrue, Storage API, Realtime), which
is why `docs/backend/06-setup.md` ends with a live smoke test to run against your real project.
