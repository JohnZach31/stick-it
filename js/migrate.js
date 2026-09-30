/* Guest -> account migration.
 *
 * Safety rules (all enforced here, tested against a real backend):
 *   - NOTHING local is ever deleted by run(). Removing the local copy is a separate, explicit step
 *     (removeLocal) that the UI only offers after verification succeeded.
 *   - Retrying is safe: the cloud board is found again by its migration key, every object and asset id is
 *     derived deterministically from (local board, local object, content), so a second attempt resumes
 *     instead of duplicating boards, objects or uploads.
 *   - One missing photo/recording never fails the board: that object migrates with mediaState:"missing"
 *     and is reported at the end.
 *   - Nothing is merged into an existing cloud board; every local board becomes its own cloud board,
 *     and only if the plan has room (otherwise the user chooses, and the rest stay local).
 * Classic script; attaches window.Stick.migrate. */
(function (root) {
  var Stick = root.Stick = root.Stick || {};

  function j(store, key, dflt) { try { var v = JSON.parse(store.getItem(key) || "null"); return v == null ? dflt : v; } catch (e) { return dflt; } }
  function isDataUrl(s) { return typeof s === "string" && s.indexOf("data:") === 0; }
  var GUEST = { boards: "stickyboard.boards.v1", notes: function (id) { return "stickyboard.notes." + id; },
                cover: function (id) { return "stickyboard.cover." + id; }, thumb: function (id) { return "stickyboard.thumb." + id; },
                view: function (id) { return "stickyboard.view." + id; }, zoom: function (id) { return "stickyboard.zoom." + id; } };

  // an untouched seed note (the three "how to" notes a brand new board starts with) isn't worth migrating
  function meaningful(n) { return !(typeof n.id === "string" && n.id.indexOf("seed-") === 0); }

  Stick.migrate = {
    migrationKey: function (localId) { return "local-" + localId; },

    // What could be brought along? (reads guest data only)
    inspectLocal: function (store) {
      var boards = j(store, GUEST.boards, []);
      return boards.map(function (b) {
        var notes = j(store, GUEST.notes(b.id), []);
        var objs = notes.filter(meaningful);
        var media = objs.filter(function (n) { return n.type === "audio" || n.type === "video"; }).length;
        var images = objs.filter(function (n) { return n.type === "photo" || isDataUrl(n.image); }).length;
        return { id: b.id, name: b.name || "My Board", subtitle: b.subtitle || "", objects: objs.length, images: images, media: media,
                 hasCover: !!j(store, GUEST.cover(b.id), null), migrated: j(store, "stickyboard.migrated." + b.id, null) };
      }).filter(function (b) { return b.objects > 0 && !b.migrated; });
    },

    /* run({store, boardIds, mediaBlob(mediaId) -> Promise<Blob|null>, onProgress(p)})
     * -> {boards:[{localId, cloudId, name, expected, migrated, existing, failed, images, mediaUploaded, mediaMissing, verified, error?}], ok} */
    run: async function (o) {
      var store = o.store, repo = Stick.repo, assets = Stick.assets, util = Stick.util;
      var prog = o.onProgress || function () {};
      var out = { boards: [], ok: true };
      var localBoards = j(store, GUEST.boards, []).filter(function (b) { return o.boardIds.indexOf(b.id) !== -1; });

      for (var bi = 0; bi < localBoards.length; bi++) {
        var lb = localBoards[bi], key = Stick.migrate.migrationKey(lb.id);
        var rep = { localId: lb.id, name: lb.name, cloudId: null, expected: 0, migrated: 0, existing: 0, failed: 0, images: 0, mediaUploaded: 0, mediaMissing: 0, verified: false };
        out.boards.push(rep);
        try {
          prog({ phase: "board", board: lb.name, index: bi, of: localBoards.length });
          var cloud = await repo.createBoard(lb.name || "My Board", lb.subtitle || null, key);
          rep.cloudId = cloud.id;

          var notes = j(store, GUEST.notes(lb.id), []).filter(meaningful);
          rep.expected = notes.length;
          var prepared = [], assetIds = [];

          for (var i = 0; i < notes.length; i++) {
            var n = JSON.parse(JSON.stringify(notes[i]));
            var newId = await util.uuidFrom(key + "|obj|" + n.id);
            n.legacyId = n.id; n.id = newId;
            prog({ phase: "objects", board: lb.name, done: i, total: notes.length, label: "Preparing " + (n.type || "note") });

            if ((n.type === "photo" || !n.type) && isDataUrl(n.image)) {
              var blob = assets.dataUrlToBlob(n.image);                     // the exact stored bytes: no recompression
              var aid = await util.uuidFrom(key + "|img|" + lb.id + "|" + n.legacyId + "|" + repo.hashStr(n.image));
              prog({ phase: "media", board: lb.name, label: "Uploading photo " + (rep.images + 1), done: i, total: notes.length });
              try {
                var asset = await assets.upload(cloud.id, "image", blob, { assetId: aid, filename: "image." + (assets.normMime(blob.type).split("/")[1] || "jpg") });
                assets.rememberBlob(asset.id, blob);
                if (n.type === "photo") n.assetId = asset.id; else n.attachedAssetId = asset.id;
                n.mediaState = "ready";
                assetIds.push(asset.id); rep.images++;
              } catch (e2) {
                var ie = e2 && e2.code ? e2 : Stick.errors.parse(e2);
                if (ie.offline || ie.retryable || ie.code === "STORAGE_QUOTA_EXCEEDED") throw ie;   // stop: the user can retry / needs space
                n.mediaState = "failed"; rep.failed++;                     // e.g. one photo too large: the rest still migrates
                if (n.type === "photo") continue;                          // a photo object without its photo has nothing to show
              }
            } else if (n.type === "audio" || n.type === "video") {
              var mb = n.mediaId ? await o.mediaBlob(n.mediaId) : null;
              if (!mb) { n.mediaState = "missing"; rep.mediaMissing++; }
              else {
                var maid = await util.uuidFrom(key + "|media|" + lb.id + "|" + n.legacyId + "|" + n.mediaId);
                prog({ phase: "media", board: lb.name, label: "Uploading " + n.type, done: i, total: notes.length });
                try {
                  var ma = await assets.upload(cloud.id, n.type, mb, { assetId: maid, duration: n.duration || null, filename: (n.type === "audio" ? "recording" : "video") + "." + ((assets.normMime(mb.type).split("/")[1] || "bin").replace(/[^a-z0-9]/g, "")) });
                  assets.rememberBlob(ma.id, mb);
                  n.assetId = ma.id; n.mediaState = "ready"; assetIds.push(ma.id); rep.mediaUploaded++;
                } catch (e) {
                  var pe = e && e.code ? e : Stick.errors.parse(e);
                  if (pe.offline || pe.retryable) throw pe;                  // connection trouble: stop, the user can retry
                  n.mediaState = "failed"; rep.failed++;                     // e.g. file too large: keep the object, say so
                }
              }
            }
            delete n.image; delete n.cutout;
            prepared.push(n);
          }

          // write objects (existing rows from an earlier attempt are left alone)
          var rows = prepared.map(function (n) { return Object.assign(repo.toRow(n), { base_version: null }); });
          for (var s = 0; s < rows.length; s += 100) {
            var res = await repo.syncObjects(cloud.id, rows.slice(s, s + 100), []);
            (res.results || []).forEach(function (r) {
              if (r.status === "ok") rep.migrated++;
              else if (r.status === "conflict") rep.existing++;
              else rep.failed++;
            });
          }

          // cover + subtitle
          var cover = j(store, GUEST.cover(lb.id), null);
          if (cover && isDataUrl(cover.url)) {
            var cb = assets.dataUrlToBlob(cover.url);
            var caid = await util.uuidFrom(key + "|cover|" + repo.hashStr(cover.url));
            var ca = await assets.upload(cloud.id, "board_cover", cb, { assetId: caid, filename: "cover.jpg" });
            await repo.updateBoard(cloud.id, { cover_mode: cover.mode === "view" ? "view" : "upload", cover_asset_id: ca.id });
          }

          // verify what the server holds before claiming success
          prog({ phase: "verify", board: lb.name });
          var serverRows = await repo.fetchObjects(cloud.id);
          var have = {}; serverRows.forEach(function (r) { have[r.id] = true; });
          var missing = prepared.filter(function (n) { return !have[n.id]; }).length;
          var okAssets = true;
          if (assetIds.length) {
            var info = await assets.info(assetIds);
            okAssets = assetIds.every(function (id) { return info[id] && info[id].status === "ready"; });
          }
          // "verified" gates the offer to remove the local copy, so it must mean: everything arrived.
          // (A recording that was already missing on this device has nothing to lose: it doesn't block.)
          rep.verified = missing === 0 && okAssets && rep.failed === 0 && prepared.length === rep.expected;
          if (rep.verified) store.setItem("stickyboard.migrated." + lb.id, JSON.stringify({ cloudId: cloud.id, at: Date.now(), objects: prepared.length, mediaMissing: rep.mediaMissing }));
          else {
            rep.error = rep.failed ? rep.failed + " item(s) couldn't be uploaded (your local copy is untouched)."
                      : missing ? "Some items didn't arrive." : "Some photos didn't finish uploading.";
            out.ok = false;
          }
        } catch (e) {
          var err = e && e.code ? e : Stick.errors.parse(e);
          rep.error = err; out.ok = false;
          if (err.code === "BOARD_LIMIT_REACHED") break;                     // later boards can't succeed either
        }
      }
      return out;
    },

    // explicit, after verification: forget the local copy of a migrated board
    removeLocal: function (store, localIds) {
      var boards = j(store, GUEST.boards, []);
      localIds.forEach(function (id) {
        if (!j(store, "stickyboard.migrated." + id, null)) return;            // only ever remove what was verified
        [GUEST.notes(id), GUEST.cover(id), GUEST.thumb(id), GUEST.view(id), GUEST.zoom(id)].forEach(function (k) { store.removeItem(k); });
        boards = boards.filter(function (b) { return b.id !== id; });
      });
      store.setItem(GUEST.boards, JSON.stringify(boards));
      var active = j(store, "stickyboard.activeBoard.v1", null);
      if (active && !boards.some(function (b) { return b.id === active; })) store.removeItem("stickyboard.activeBoard.v1");
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
