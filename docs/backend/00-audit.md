# Phase 0 – Audit of the pre-backend app

Checkpoint: git tag `pre-backend-mobile-capture` (commit `26a0f0e`), already pushed.
The app is a static page (`index.html`, ~7000 lines, one classic `<script>` IIFE) served
from GitHub Pages. Everything below was verified by running the app and reading storage.

## 1. Where data lives today

### localStorage (all keys)

| Key | Content |
|---|---|
| `stickyboard.boards.v1` | `[{id, name, subtitle?}]`. `id` is `b<base36>`. |
| `stickyboard.activeBoard.v1` | active board id (string) |
| `stickyboard.notes.<boardId>` | array of board objects (see below), images/posters inline as data URLs |
| `stickyboard.cover.<boardId>` | `{mode:"view"|"upload", url:<data URL>, ts}`; absent = Automatic |
| `stickyboard.thumb.<boardId>` | automatic thumbnail `{url:<data URL>, theme, ts, count}` (regenerable) |
| `stickyboard.view.<boardId>` | `{cx}` last horizontal view centre (device-local) |
| `stickyboard.zoom.<boardId>` | number, board zoom (device-local) |
| `stickyboard.settings.v1` | `{lockFont, fontName, displayName, account, guestConfirmed, theme, cleanupEmpty}` |
| `stickyboard.anonId` | `Anon-NNNN` guest display name |
| `stickyboard.clipboard.v1` | note copy/paste buffer (device-local, transient) |
| `stickyboard.notes.v2` | legacy single-board notes (migrated into the first board on first run) |

### IndexedDB

`stickit-media` (version 1), object store `media`, out-of-line keys: `mediaId` (string) → `Blob`
(`audio/webm;codecs=opus`, `video/webm`, ...). Only audio/video objects use it. Photos and
in-note images are still data URLs inside the notes array.

### Board object shapes (client, as saved)

All objects share `id, x, y, z, rot`. **Objects without `type` are sticky notes.**

* **note**: `w, html, bg, font, fontManual, categoryIndex, isTask, done, due, dueTime, image (data URL|null), imgW, imgRatio, listHintOff, phys{tape,tr,tx,tw,to,pin,pc,wr,wa,wp,wt,wx,hole}`
* **photo** (`type:"photo"`): `w, imgRatio, image (data URL), cutout (reserved), photoStyle (polaroid|cutout|mounted), caption, font, createdAt, phys{cut,bx,by,br,lr}`
* **audio** (`type:"audio"`): `caption, font, createdAt, mediaId, duration, mime, phys{}`
* **video** (`type:"video"`): `w, imgRatio, caption, font, createdAt, mediaId, duration, mime, poster (small JPEG data URL), phys{}`

Ids are client strings (`n<time><seq><rand>`), **not UUIDs**. Cloud ids must be UUIDs, so
migration keeps a local-id → uuid map (and stores the old id in `data.legacyId`).

### Runtime-only (never persisted)

`el, textEl, captionEl, badgeEl` DOM references; undo/redo stacks (30 steps, in memory);
selection; search highlights; sync-irrelevant UI state.

## 2. Account / guest today

`settings.account` is filled by decoding a Google ID token **in the browser** (Google Identity
Services). It is display-only: no server session, nothing is verified, notes never leave the
device. `GOOGLE_CLIENT_ID` is a placeholder. Guests use `stickyboard.anonId` as a display name.
This is replaced by Supabase Auth; the modal UI is reused.

## 3. Sharing today (must keep working forever)

| Hash | Meaning | Encoding |
|---|---|---|
| `#sn=<b64>` | one note (v1) | `btoa(encodeURIComponent(JSON))` of `{html,bg,font,rot,isTask,done,due,dueTime,byName}` |
| `#sn=z.<b64url>` | one note/photo (v2) | deflate-raw JSON `{v:2, byName, ...object}` |
| `#sg=z.<b64url>` | selected group | deflate-raw JSON `{v:2, byName, notes:[...]}` |
| `#sb=<b64>` / `#sb=z.<b64url>` | whole board, read-only | JSON array of objects |

Rendering sanitises all HTML and validates images/colours (`normalizeIncoming`). Audio/video are
excluded from links (no media in URLs). These formats are frozen: new server-backed links use a
different hash (`#s=<token>`) so old links never change meaning.

## 4. Other behaviours the backend must not break

* Guest use needs no signup; guest board = localStorage + IndexedDB.
* Undo/redo is client-side and field-level (`TRACK_FIELDS`), including "delete" (object is
  re-inserted). A server delete is therefore a **soft delete**, and assets referenced by a
  deleted object must survive until the object is purged.
* Thumbnails/covers: automatic thumbnail regenerates from data (debounced 2.5 s);
  custom covers override it.
* `saveNotes()` is called from ~60 places and persists the whole array. The cloud layer hooks
  this single function (diff-based) instead of touching every caller.
* Photos and in-note images are downscaled JPEGs (≤1000 px / ≤480 px) already.
* Legacy public links use no server; guests can keep using them.

## 5. Consequences for the backend design

1. `board_objects` with common spatial columns + `data jsonb`; type-specific data in JSON.
2. Client ids → UUIDs; map kept for migration idempotency.
3. Inline images/posters become `assets` (Storage) referenced by id; runtime keeps blob/data URLs.
4. Soft delete + version column (undo, realtime, conflict detection).
5. Migration must be resumable and never delete local data before verification.
