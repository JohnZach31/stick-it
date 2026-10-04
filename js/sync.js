/* SyncService: keeps the local cache and the server in step, without ever making the UI wait.
 *
 * Design
 *  - The app edits its own objects instantly and calls notesChanged(). Nothing is queued explicitly:
 *    at flush time we DIFF the live objects against `known` (id -> server version + content hash of what
 *    the server last acknowledged). New ids = creates, changed hashes = updates, missing ids = deletes.
 *    So the outgoing "queue" can be rebuilt after a crash or reload from just (cache, known).
 *  - Writes go through the sync_objects RPC with the version we last saw. If someone else changed the same
 *    object we get a conflict back and resolve it without losing text (see resolveConflict).
 *  - Media (photos, note images, audio, video) is uploaded in the background as assets; the object is
 *    written first with mediaState:"uploading" and gets its assetId when the upload is verified.
 *  - Other devices' changes are pulled (poll, focus, online) and applied through the host without undo entries.
 *
 * The host (index.html) provides the small set of functions in `deps.host`.
 * Classic script; attaches window.Stick.createSync(deps). */
(function (root) {
  var Stick = root.Stick = root.Stick || {};

  // ------------------------------------------------------------------ util
  var util = Stick.util = Stick.util || {};
  // deterministic UUID (v5-style, from SHA-256): retries after a crash produce the same ids,
  // so a half-finished upload or migration can be resumed instead of duplicated.
  util.uuidFrom = util.uuidFrom || function (str) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(str))).then(function (d) {
      var b = new Uint8Array(d).slice(0, 16);
      b[6] = (b[6] & 0x0f) | 0x50; b[8] = (b[8] & 0x3f) | 0x80;
      var h = Array.prototype.map.call(b, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
      return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
    });
  };
  function plain(o) {
    if (!o) return "";
    if (o.type === "photo" || o.type === "audio" || o.type === "video") return String(o.caption || "");
    return String(o.html || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  }
  function isDataUrl(s) { return typeof s === "string" && s.indexOf("data:") === 0; }

  Stick.createSync = function (deps) {
    var repo = deps.repo || Stick.repo;
    var assets = deps.assets || Stick.assets;
    var host = deps.host;
    var cfg = deps.config || Stick.config.SYNC || {};
    var store = deps.storage;                  // localStorage-like
    var keys = deps.keys;                      // {sync(id), meta(), notes(id), boards(), cover(id)}
    var toRow = repo.toRow, fromRow = repo.fromRow, hashRow = repo.hashRow;
    var online = deps.online || function () { return typeof navigator === "undefined" || navigator.onLine !== false; };

    var S = {};
    var boardId = null;
    var known = {};              // id -> {v, h, d?}
    var watermark = null;        // ISO time of the newest server row we have applied
    var blocked = {};            // id -> hash the server refused (don't resend the same thing forever)
    var statusVal = "saved", statusNote = "";
    var listeners = [];
    var flushTimer = null, firstDirty = 0, inflight = null, again = false;
    var retryTimer = null, retryN = 0;
    var jobs = {};               // media job key -> "running" | "failed"
    var pollTimer = null, started = false;
    var readOnlyMode = false;    // viewers: pull only, never write

    // ------------------------------------------------------------ status
    function setStatus(s, note) {
      if (s === statusVal && (note || "") === statusNote) return;
      statusVal = s; statusNote = note || "";
      listeners.slice().forEach(function (fn) { try { fn(s, statusNote); } catch (e) {} });
    }
    function refreshStatus() {
      if (statusVal === "problem" || statusVal === "offline") return;
      var busy = inflight || flushTimer || Object.keys(jobs).some(function (k) { return jobs[k] === "running"; });
      setStatus(busy ? "saving" : "saved");
    }
    S.status = function () { return { state: statusVal, note: statusNote }; };
    S.onStatus = function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; };

    // ------------------------------------------------------------ persistence of `known`
    function loadKnown() {
      known = {}; watermark = null;
      try {
        var raw = JSON.parse(store.getItem(keys.sync(boardId)) || "null");
        if (raw && raw.known) Object.keys(raw.known).forEach(function (id) {
          var e = raw.known[id]; known[id] = e[2] ? { v: e[0], h: e[1], d: true } : { v: e[0], h: e[1] };
        });
        if (raw && raw.watermark) watermark = raw.watermark;
      } catch (e) {}
    }
    function saveKnown() {
      var out = {};
      Object.keys(known).forEach(function (id) { var k = known[id]; out[id] = k.d ? [k.v, k.h, 1] : [k.v, k.h]; });
      try { store.setItem(keys.sync(boardId), JSON.stringify({ known: out, watermark: watermark })); } catch (e) {}
    }

    // ------------------------------------------------------------ diff
    function needsUpload(o) {
      if (o.type === "photo") return (isDataUrl(o.image) && !o.assetId) || needsCutoutUpload(o);
      if (o.type === "postcard") return isDataUrl(o.image) && !o.assetId;
      if (o.type === "photo_strip") return frameToUpload(o) >= 0;
      if (o.type === "audio" || o.type === "video") return !!o.mediaId && !o.assetId && o.mediaState !== "failed";
      return isDataUrl(o.image) && !o.attachedAssetId;             // sticky note with an attached photo
    }
    function frameToUpload(o) { var f = o.frames || []; for (var i = 0; i < f.length; i++) if (isDataUrl(f[i].image) && !f[i].assetId) return i; return -1; }
    // a finished cutout made on this device (blob under cutoutKey) that has no asset yet
    function needsCutoutUpload(o) { return o.type === "photo" && !!o.cutoutKey && !o.cutoutAssetId && o.mediaState !== "failed"; }
    function rowFor(o) {
      var row = toRow(o);
      if (needsUpload(o)) row.data.mediaState = "uploading";     // other devices see "uploading" instead of a broken photo
      return row;
    }
    function computeDiff() {
      var snap = host.snapshot();
      var cur = {}, ups = [], dels = [];
      snap.forEach(function (o) {
        var row = rowFor(o), h = hashRow(row);
        cur[o.id] = true;
        var k = known[o.id];
        if (blocked[o.id] === h) return;
        if (!k) ups.push({ id: o.id, row: row, h: h, base: null });
        else if (k.d) ups.push({ id: o.id, row: row, h: h, base: k.v });        // undo of a delete: bring it back
        else if (k.h !== h) ups.push({ id: o.id, row: row, h: h, base: k.v });
      });
      var prot = (host.protectedIds && host.protectedIds()) || {};          // objects this device could not read are present, just not drawn
      Object.keys(prot).forEach(function (id) { cur[id] = true; });
      Object.keys(known).forEach(function (id) { if (!cur[id] && !known[id].d) dels.push(id); });
      return { snap: snap, ups: ups, dels: dels };
    }
    S.hasPending = function () {
      if (!boardId || readOnlyMode) return false;
      var d = computeDiff();
      return d.ups.length > 0 || d.dels.length > 0 || Object.keys(jobs).some(function (k) { return jobs[k] === "running"; });
    };

    // ------------------------------------------------------------ conflicts
    function resolveConflict(id, server, entry) {
      var row = { type: server.type, x: server.x, y: server.y, width: server.width, height: server.height,
                  rotation: server.rotation, z_index: server.z_index, data: server.data };
      var sh = hashRow(row);
      if (sh === entry.h) { known[id] = { v: server.version, h: sh }; return "adopted"; }
      if (server.deleted_at) {                                   // deleted elsewhere, edited here: the edit wins
        known[id] = { v: server.version, h: null, d: true };
        return "resurrect";
      }
      var local = host.getObject(id);
      // never lose typed text: keep this device's version as a copy next to the server's
      if (local && plain(local) && plain(local) !== plain(fromRow(server))) host.addConflictCopy(local);
      known[id] = { v: server.version, h: sh };
      host.applyRemote({ upserts: [fromRow(server)] });
      hydrate(fromRow(server));
      return "server";
    }

    // ------------------------------------------------------------ push
    async function pushOnce() {
      var d = computeDiff();
      scanMedia(d.snap);
      if (!d.ups.length && !d.dels.length) return false;
      var rerun = false, problem = null;
      for (var i = 0; i < d.ups.length; i += (cfg.batch || 100)) {
        var chunk = d.ups.slice(i, i + (cfg.batch || 100));
        var res = await repo.syncObjects(boardId, chunk.map(function (u) { var r = Object.assign({}, u.row); r.base_version = u.base; return r; }), []);
        (res.results || []).forEach(function (r) {
          var u = chunk.filter(function (c) { return c.id === r.id; })[0];
          if (!u) return;
          if (r.status === "ok") { known[r.id] = { v: r.version, h: u.h }; delete blocked[r.id]; }
          else if (r.status === "conflict") { if (resolveConflict(r.id, r.server, u) === "resurrect") rerun = true; }
          else if (r.status === "denied") { blocked[r.id] = u.h; problem = "You don't have permission to change this board."; }
          else { blocked[r.id] = u.h; problem = "Some items couldn't be saved."; }
        });
      }
      if (d.dels.length) {
        for (var j = 0; j < d.dels.length; j += 500) {
          var ids = d.dels.slice(j, j + 500);
          var dr = await repo.syncObjects(boardId, [], ids);
          var done = {}; (dr.deleted || []).forEach(function (id) { done[id] = true; });
          ids.forEach(function (id) {
            if (done[id]) known[id] = { v: ((known[id] && known[id].v) || 0) + 1, h: null, d: true };
            else delete known[id];                               // already gone on the server
          });
        }
      }
      saveKnown();
      if (problem) setStatus("problem", problem);
      return rerun || true;
    }

    S.flush = function () {
      if (!boardId || readOnlyMode) return Promise.resolve();
      clearTimeout(flushTimer); flushTimer = null; firstDirty = 0;
      if (inflight) { again = true; return inflight; }
      if (!online()) { setStatus("offline"); return Promise.resolve(); }
      setStatus(statusVal === "problem" ? "problem" : "saving", statusNote);
      inflight = (async function () {
        try {
          var n = 0;
          do {
            again = false;
            var changed = await pushOnce();
            n++;
            if (!changed && !again) break;
          } while ((again || n < 3) && n < 6);
          retryN = 0; clearTimeout(retryTimer);
          if (statusVal !== "problem") { statusVal = "saving"; setStatus("saved"); }
        } catch (e) {
          var err = e && e.code ? e : Stick.errors.parse(e);
          if (err.code === "AUTH") { setStatus("problem", "Please sign in again."); if (host.onAuthLost) host.onAuthLost(); }
          else if (err.offline || err.retryable) { setStatus("offline"); scheduleRetry(); }
          else { setStatus("problem", Stick.errors.friendly(err)); }
        } finally { inflight = null; if (again) { again = false; S.flush(); } }
      })();
      return inflight;
    };

    function scheduleRetry() {
      clearTimeout(retryTimer);
      retryN = Math.min(retryN + 1, 6);
      retryTimer = setTimeout(function () { statusVal = "saving"; S.flush(); pullQuiet(); }, Math.min(30000, 1000 * Math.pow(2, retryN)));
    }

    // called by the app after any change to its objects
    S.notesChanged = function () {
      if (!boardId || readOnlyMode) return;
      if (!firstDirty) firstDirty = Date.now();
      clearTimeout(flushTimer);
      var wait = Math.min(cfg.debounceMs || 700, Math.max(0, (cfg.maxWaitMs || 3000) - (Date.now() - firstDirty)));
      flushTimer = setTimeout(function () { S.flush(); }, wait);
      if (statusVal === "saved") setStatus("saving");
    };
    S.setReadOnly = function (on) { readOnlyMode = !!on; };
    // Resolves true once everything (including background uploads) is on the server, false on timeout/failure.
    // Used before creating a share link, so the link can't point at objects that aren't there yet.
    S.settle = async function (timeoutMs) {
      var end = Date.now() + (timeoutMs || 60000);
      while (Date.now() < end) {
        await S.flush();
        var running = Object.keys(jobs).some(function (k) { return jobs[k] === "running"; });
        if (!running && !S.hasPending() && statusVal !== "offline" && statusVal !== "problem") return true;
        if (statusVal === "offline" || statusVal === "problem") return false;
        await new Promise(function (r) { setTimeout(r, 150); });
      }
      return false;
    };
    S.retryAll = function () {
      blocked = {}; retryN = 0;
      Object.keys(jobs).forEach(function (k) { if (jobs[k] === "failed") delete jobs[k]; });
      setStatus("saving");
      return S.flush().then(function () { return pullQuiet(); });
    };

    // ------------------------------------------------------------ media uploads
    function scanMedia(snap) {
      snap.forEach(function (o) {
        if (!needsUpload(o)) return;
        var field = o.type === "photo" ? ((isDataUrl(o.image) && !o.assetId) ? "image" : "cutout") : o.type === "postcard" ? "image" : o.type === "photo_strip" ? "frame:" + frameToUpload(o) : (o.type === "audio" || o.type === "video") ? "media" : "attached";
        if (field === "cutout" && isDataUrl(o.image) && !o.assetId) return;                // the original goes up first, so the cutout can point at it
        var key = o.id + ":" + field;
        if (jobs[key]) return;
        jobs[key] = "running";
        runJob(o, field, key).then(function () { delete jobs[key]; refreshStatus(); }, function () { /* handled inside */ });
      });
    }
    async function runJob(o, field, key) {
      try {
        var blob, kind, meta = {};
        if (field === "media") {
          blob = await host.mediaBlob(o.mediaId);
          if (!blob) throw { code: "MISSING_LOCAL_MEDIA", message: "local media is gone", offline: false, retryable: false };
          kind = o.type; meta.duration = o.duration || null;
          meta.filename = (o.type === "audio" ? "recording" : "video") + "." + (assets.normMime(blob.type).split("/")[1] || "bin").replace(/[^a-z0-9]/g, "");
        } else if (field.indexOf("frame:") === 0) {
          var fi = Number(field.slice(6)), fr = (host.getObject(o.id) || o).frames[fi];
          blob = assets.dataUrlToBlob(fr.image); kind = "image"; meta.filename = "strip." + (assets.normMime(blob.type).split("/")[1] || "jpg");
        } else if (field === "cutout") {
          blob = await host.mediaBlob(o.cutoutKey);
          if (!blob) throw { code: "MISSING_LOCAL_MEDIA", message: "local cutout is gone", offline: false, retryable: false };
          kind = "cutout"; meta.filename = "cutout.png"; if (o.assetId) meta.sourceId = o.assetId;
        } else {
          blob = assets.dataUrlToBlob(o.image); kind = "image"; meta.filename = "image." + (assets.normMime(blob.type).split("/")[1] || "jpg");
        }
        // content-addressed id: a retry (or a second tab) resumes the same asset instead of making another
        var digest = repo.hashStr(field === "media" ? o.mediaId : field === "cutout" ? o.cutoutKey : field.indexOf("frame:") === 0 ? o.frames[Number(field.slice(6))].image : o.image);
        meta.assetId = await util.uuidFrom(boardId + "|" + o.id + "|" + field + "|" + digest);
        var asset = await assets.upload(boardId, kind, blob, meta);
        assets.rememberBlob(asset.id, blob);
        var live = host.getObject(o.id);
        if (!live) return;                                             // deleted while uploading: the asset is garbage-collected later
        if (field.indexOf("frame:") === 0) {
          var idx = Number(field.slice(6)), cur = (live.frames || []).map(function (f) { return Object.assign({}, f); });
          if (cur[idx]) { cur[idx].assetId = asset.id; host.patch(o.id, { frames: cur }); }
          return;
        }
        host.patch(o.id, field === "attached" ? { attachedAssetId: asset.id, mediaState: "ready" } : field === "cutout" ? { cutoutAssetId: asset.id, mediaState: "ready" } : { assetId: asset.id, mediaState: "ready" });
      } catch (e) {
        var err = e && e.code ? e : Stick.errors.parse(e);
        if (err.offline || err.retryable) { jobs[key] = "failed"; setStatus("offline"); scheduleRetry(); delete jobs[key]; return; }
        jobs[key] = "failed";
        host.patch(o.id, { mediaState: "failed" });
        setStatus("problem", err.code === "MISSING_LOCAL_MEDIA" ? "Some media wasn't available on this device." : Stick.errors.friendly(err));
        if (host.toast) host.toast(Stick.errors.friendly(err));
      }
    }

    // ------------------------------------------------------------ pull
    function isDirty(id) {
      var k = known[id];
      var live = host.getObject(id);
      if (!live) return !!(k && !k.d);
      if (!k || k.d) return true;
      return hashRow(rowFor(live)) !== k.h;
    }
    function applyServerRow(row, out) {
      var k = known[row.id];
      if (row.deleted_at) {
        if (k && !k.d) {
          if (!isDirty(row.id)) out.removes.push(row.id);       // else: our edit will conflict on the next push and win
          known[row.id] = { v: row.version, h: null, d: true };
        } else if (!k) known[row.id] = { v: row.version, h: null, d: true };
        return;
      }
      if (k && !k.d && k.v >= row.version) return;
      var payload = { type: row.type, x: row.x, y: row.y, width: row.width, height: row.height, rotation: row.rotation, z_index: row.z_index, data: row.data };
      var h = hashRow(payload);
      if (k && !k.d && k.h === h) { k.v = row.version; return; }
      if (k && !k.d && isDirty(row.id)) return;                 // local edit pending: resolved on push
      out.upserts.push(fromRow(row));
      known[row.id] = { v: row.version, h: h };
    }
    async function pull(full) {
      if (!boardId) return false;
      var out = { upserts: [], removes: [] };
      var rows, newMark = watermark;
      if (full || !watermark) {
        rows = await repo.fetchObjects(boardId);
        var seen = {};
        rows.forEach(function (r) { seen[r.id] = true; applyServerRow(r, out); if (!newMark || r.updated_at > newMark) newMark = r.updated_at; });
        Object.keys(known).forEach(function (id) {
          if (seen[id] || known[id].d) return;
          if (!host.getObject(id)) { delete known[id]; return; }
          if (!isDirty(id)) { out.removes.push(id); delete known[id]; }
        });
        if (!newMark) newMark = new Date().toISOString();
      } else {
        var since = new Date(new Date(watermark).getTime() - 2000).toISOString();     // small overlap for in-flight commits
        rows = await repo.fetchChanges(boardId, since);
        rows.forEach(function (r) { applyServerRow(r, out); if (r.updated_at > newMark) newMark = r.updated_at; });
      }
      watermark = newMark;
      saveKnown();
      if (out.upserts.length || out.removes.length) {
        host.applyRemote(out);
        out.upserts.forEach(hydrate);
        return true;
      }
      return false;
    }
    function pullQuiet() {
      return pull(false).catch(function (e) {
        var err = Stick.errors.parse(e);
        if (err.offline) setStatus("offline");
        else if (err.code === "AUTH") { setStatus("problem", "Please sign in again."); if (host.onAuthLost) host.onAuthLost(); }
      });
    }
    S.pull = function (full) { return pull(!!full); };

    // load image assets for objects that reference them (runtime only; blob URLs are never persisted)
    function hydrate(o) {
      var want = [];
      if ((o.type === "photo" || o.type === "postcard") && o.assetId && !o.image) want.push(["image", o.assetId]);
      if (o.type === "photo_strip") (o.frames || []).forEach(function (f, i) { if (f.assetId && !f.image) want.push(["frame:" + i, f.assetId]); });
      if (!o.type && o.attachedAssetId && !o.image) want.push(["image", o.attachedAssetId]);
      want.forEach(function (w) {
        assets.blobUrl(w[1]).then(function (url) {
          if (!url) return;
          if (w[0].indexOf("frame:") === 0) {
            var live = host.getObject(o.id); if (!live || !live.frames) return;
            var fr = live.frames.map(function (f) { return Object.assign({}, f); }), i = Number(w[0].slice(6));
            if (fr[i] && !fr[i].image) { fr[i].image = url; host.setRuntime(o.id, { frames: fr }); }
          } else host.setRuntime(o.id, { image: url });
        });
      });
    }
    S.hydrateAll = function () { host.snapshot().forEach(hydrate); };

    // ------------------------------------------------------------ lifecycle
    // A page that is only showing someone's shared link must never be attached to a board: its in-memory objects are the shared copies, and
    // the diff against what this account already knows would read every real object as "removed" and soft-delete it on the server.
    S.attach = function (id) {
      if (host.isShareView && host.isShareView()) { boardId = null; return; }
      boardId = id; blocked = {}; loadKnown();
    };
    S.boardId = function () { return boardId; };
    S.start = async function () {
      if (started || !boardId) return;
      started = true;
      S.hydrateAll();
      try { await pull(true); } catch (e) { var er = Stick.errors.parse(e); if (er.offline) setStatus("offline"); else if (er.code === "AUTH") { if (host.onAuthLost) host.onAuthLost(); } }
      await S.flush();
      S.hydrateAll();
      if (typeof root.addEventListener === "function") {
        root.addEventListener("online", function () { retryN = 0; S.flush(); pullQuiet(); });
        root.addEventListener("offline", function () { setStatus("offline"); });
        root.addEventListener("focus", function () { pullQuiet(); });
        if (root.document) root.document.addEventListener("visibilitychange", function () {
          if (root.document.visibilityState === "visible") pullQuiet(); else if (S.hasPending()) S.flush();
        });
        root.addEventListener("beforeunload", function (e) { if (S.hasPending()) { e.preventDefault(); e.returnValue = ""; } });
      }
      pollTimer = setInterval(function () {
        if (root.document && root.document.visibilityState === "hidden") return;
        if (online()) { pullQuiet(); if (statusVal === "offline") S.flush(); }
      }, cfg.pollMs || 20000);
    };
    S.stop = function () { clearInterval(pollTimer); clearTimeout(flushTimer); clearTimeout(retryTimer); started = false; };

    // ------------------------------------------------------------ board metadata (name, subtitle, cover)
    function loadMeta() { try { return JSON.parse(store.getItem(keys.meta()) || "{}"); } catch (e) { return {}; } }
    function saveMeta(m) { try { store.setItem(keys.meta(), JSON.stringify(m)); } catch (e) {} }
    S.boardMetaChanged = function (id, patch) {
      var m = loadMeta();
      m[id] = Object.assign(m[id] || {}, patch);
      saveMeta(m);
      return S.flushMeta();
    };
    var metaBusy = null;
    S.flushMeta = function () {
      if (metaBusy) return metaBusy;
      metaBusy = (async function () {
        try {
          var m = loadMeta(), ids = Object.keys(m);
          for (var i = 0; i < ids.length; i++) {
            var id = ids[i], p = Object.assign({}, m[id]), row = {};
            if (p.name !== undefined) row.name = p.name;
            if (p.subtitle !== undefined) row.subtitle = p.subtitle;
            if (p.cover !== undefined) {
              if (p.cover === null) { row.cover_mode = "automatic"; row.cover_asset_id = null; }
              else {
                var blob = assets.dataUrlToBlob(p.cover.url);
                var aid = await util.uuidFrom(id + "|cover|" + repo.hashStr(p.cover.url));
                var a = await assets.upload(id, "board_cover", blob, { assetId: aid, filename: "cover.jpg" });
                row.cover_mode = p.cover.mode === "view" ? "view" : "upload"; row.cover_asset_id = a.id;
              }
            }
            if (Object.keys(row).length) await repo.updateBoard(id, row);
            var again = loadMeta();
            // keep anything that changed while we were sending
            Object.keys(p).forEach(function (k) { if (JSON.stringify(again[id] && again[id][k]) === JSON.stringify(p[k])) delete again[id][k]; });
            if (again[id] && !Object.keys(again[id]).length) delete again[id];
            saveMeta(again);
          }
        } catch (e) {
          var err = e && e.code ? e : Stick.errors.parse(e);
          if (err.offline || err.retryable) setStatus("offline"); else setStatus("problem", Stick.errors.friendly(err));
        } finally { metaBusy = null; }
      })();
      return metaBusy;
    };

    // ------------------------------------------------------------ cache fill (first sign-in on a device, board switches)
    // Writes the user's boards, and the given board's objects, into the local cache in the app's own format.
    S.refreshBoards = async function () {
      var list = await repo.listBoards();
      var boards = list.map(function (b) {
        return { id: b.id, name: b.name, subtitle: b.subtitle || undefined, access: b.role, ownerId: b.owner_id, locked: !!b.locked_at, cloud: true, updatedAt: b.content_updated_at };
      });
      store.setItem(keys.boards(), JSON.stringify(boards));
      // covers: bring the picture along when the board has a custom one
      for (var i = 0; i < list.length; i++) {
        var b = list[i], cur = null;
        try { cur = JSON.parse(store.getItem(keys.cover(b.id)) || "null"); } catch (e) {}
        if (b.cover_mode === "automatic" || !b.cover_asset_id) { if (cur) store.removeItem(keys.cover(b.id)); continue; }
        if (cur && cur.assetId === b.cover_asset_id) continue;
        try {
          var blob = await assets.blob(b.cover_asset_id);
          if (blob) store.setItem(keys.cover(b.id), JSON.stringify({ mode: b.cover_mode === "view" ? "view" : "upload", url: await assets.blobToDataUrl(blob), ts: Date.now(), assetId: b.cover_asset_id }));
        } catch (e) {}
      }
      return boards;
    };
    S.fillBoardCache = async function (id) {
      var rows = await repo.fetchObjects(id);
      var objs = rows.map(fromRow);
      var k = {}, mark = null;
      rows.forEach(function (r) {
        k[r.id] = [r.version, hashRow({ type: r.type, x: r.x, y: r.y, width: r.width, height: r.height, rotation: r.rotation, z_index: r.z_index, data: r.data })];
        if (!mark || r.updated_at > mark) mark = r.updated_at;
      });
      store.setItem(keys.notes(id), JSON.stringify(objs));
      store.setItem(keys.sync(id), JSON.stringify({ known: k, watermark: mark || new Date().toISOString() }));
      return objs.length;
    };

    // for tests / diagnostics
    S._known = function () { return known; };
    S._computeDiff = computeDiff;
    return S;
  };
})(typeof window !== "undefined" ? window : globalThis);
