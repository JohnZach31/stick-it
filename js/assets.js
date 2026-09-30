/* AssetService: uploads media to Supabase Storage through the register -> upload -> finalize flow,
 * and serves it back (blob cache in IndexedDB for images, signed URLs for audio/video streaming).
 * Classic script; attaches to window.Stick.assets. */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  var cfg = Stick.config || {};

  var infoCache = {};       // assetId -> row
  var urlCache = {};        // assetId -> object URL
  var pending = {};         // assetId -> in-flight promise

  function db() { return Stick.cloud.load(); }
  function normMime(t) { return String(t || "").toLowerCase().split(";")[0].trim(); }

  // ---- data URL <-> Blob (no network, byte-exact) ------------------------
  function dataUrlToBlob(u) {
    var m = /^data:([^;,]*)((?:;[^;,]*)*?)(;base64)?,([\s\S]*)$/.exec(u || "");
    if (!m) throw new Error("not a data URL");
    var type = m[1] || "application/octet-stream";
    var bytes;
    if (m[3]) {
      var bin = root.atob(m[4]);
      bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else {
      bytes = new TextEncoder().encode(decodeURIComponent(m[4]));
    }
    return new Blob([bytes], { type: type });
  }
  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
      r.readAsDataURL(blob);
    });
  }

  // ---- IndexedDB blob cache (same database the app already uses for local audio/video) ----
  var idbp = null;
  function idb() {
    if (typeof indexedDB === "undefined") return Promise.reject(new Error("no indexedDB"));
    if (!idbp) idbp = new Promise(function (resolve, reject) {
      var req = indexedDB.open("stickit-media", 1);
      req.onupgradeneeded = function () { if (!req.result.objectStoreNames.contains("media")) req.result.createObjectStore("media"); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return idbp;
  }
  function cacheGet(key) {
    return idb().then(function (d) {
      return new Promise(function (resolve) {
        var r = d.transaction("media", "readonly").objectStore("media").get(key);
        r.onsuccess = function () { resolve(r.result || null); };
        r.onerror = function () { resolve(null); };
      });
    }, function () { return null; });
  }
  function cachePut(key, blob) {
    return idb().then(function (d) {
      return new Promise(function (resolve) {
        var t = d.transaction("media", "readwrite");
        t.objectStore("media").put(blob, key);
        t.oncomplete = function () { resolve(true); };
        t.onerror = t.onabort = function () { resolve(false); };
      });
    }, function () { return false; });
  }
  function cacheDelete(keys) {
    return idb().then(function (d) {
      return new Promise(function (resolve) {
        var t = d.transaction("media", "readwrite"), st = t.objectStore("media");
        keys.forEach(function (k) { st.delete(k); });
        t.oncomplete = t.onerror = t.onabort = function () { resolve(); };
      });
    }, function () {});
  }
  // every cached cloud image (used to clear a shared computer on sign-out)
  function cacheClearAssets() {
    return idb().then(function (d) {
      return new Promise(function (resolve) {
        var t = d.transaction("media", "readwrite"), st = t.objectStore("media");
        var req = st.getAllKeys();
        req.onsuccess = function () { (req.result || []).forEach(function (k) { if (String(k).indexOf("asset:") === 0) st.delete(k); }); };
        t.oncomplete = t.onerror = t.onabort = function () { resolve(); };
      });
    }, function () {});
  }

  Stick.assets = {
    normMime: normMime,
    dataUrlToBlob: dataUrlToBlob,
    blobToDataUrl: blobToDataUrl,
    cacheClear: cacheClearAssets,

    limitFor: function (kind) { return (cfg.MEDIA_LIMITS || {})[kind] || (cfg.MEDIA_LIMITS || {}).image || { maxBytes: 10485760 }; },
    // early, friendly check (the server checks again)
    check: function (kind, blob) {
      var lim = Stick.assets.limitFor(kind);
      if (blob.size > lim.maxBytes) {
        return { code: "FILE_TOO_LARGE", message: "FILE_TOO_LARGE", offline: false, retryable: false, maxBytes: lim.maxBytes };
      }
      return null;
    },

    // register -> upload -> finalize. Safe to call again with the same opts.assetId after a failure:
    // an existing ready asset is returned as is, a pending one continues where it stopped.
    upload: function (boardId, kind, blob, o) {
      o = o || {};
      var mime = normMime(blob.type || o.mime);
      var bad = Stick.assets.check(kind, blob);
      if (bad) return Promise.reject(bad);
      return db().then(function (c) {
        return c.rpc("create_asset", {
          p_board: boardId, p_kind: kind, p_mime: mime, p_size: blob.size, p_filename: o.filename || null,
          p_width: o.width || null, p_height: o.height || null, p_duration: o.duration || null,
          p_source: o.sourceId || null, p_id: o.assetId || null
        }).then(function (r) {
          if (r.error) throw Stick.errors.parse(r.error);
          var asset = r.data;
          infoCache[asset.id] = asset;
          if (asset.status === "ready") return asset;
          if (asset.status !== "pending") throw { code: "UNKNOWN", message: "asset is " + asset.status, offline: false, retryable: false };
          var body = blob.type === mime ? blob : new Blob([blob], { type: mime });
          return c.storage.from("media").upload(asset.storage_path, body, { contentType: mime, upsert: false }).then(function (up) {
            if (up.error) {
              var m = String(up.error.message || "") + " " + String(up.error.statusCode || "");
              // an earlier attempt already delivered the bytes: just finish the job
              if (!/already exists|Duplicate|409/i.test(m)) throw Stick.errors.parse(up.error);
            }
            return c.rpc("finalize_asset", { p_asset: asset.id });
          }).then(function (f) {
            if (f.error) throw Stick.errors.parse(f.error);
            if (!f.data || !f.data.ok) throw { code: (f.data && f.data.error) || "UNKNOWN", message: (f.data && f.data.error) || "finalize failed", offline: false, retryable: false };
            infoCache[asset.id] = f.data.asset;
            return f.data.asset;
          });
        });
      }, function (e) { throw Stick.errors.parse(e); }).catch(function (e) { throw (e && e.code && e.offline !== undefined) ? e : Stick.errors.parse(e); });
    },

    // metadata for many assets in one request
    info: function (ids) {
      var need = ids.filter(function (id) { return id && !infoCache[id]; });
      var load = need.length ? db().then(function (c) {
        return c.from("assets").select("id,storage_path,mime_type,kind,byte_size,width,height,duration,status").in("id", need);
      }).then(function (r) {
        if (r.error) throw Stick.errors.parse(r.error);
        (r.data || []).forEach(function (a) { infoCache[a.id] = a; });
      }) : Promise.resolve();
      return load.then(function () {
        var out = {};
        ids.forEach(function (id) { if (infoCache[id]) out[id] = infoCache[id]; });
        return out;
      });
    },

    // an object URL for an image asset (memory -> IndexedDB -> download). null when it can't be had.
    blobUrl: function (assetId) {
      if (urlCache[assetId]) return Promise.resolve(urlCache[assetId]);
      if (pending[assetId]) return pending[assetId];
      var p = cacheGet("asset:" + assetId).then(function (blob) {
        if (blob) return blob;
        return Stick.assets.info([assetId]).then(function (m) {
          var a = m[assetId];
          if (!a || a.status !== "ready") return null;
          return db().then(function (c) { return c.storage.from("media").download(a.storage_path); }).then(function (r) {
            if (r.error || !r.data) return null;
            cachePut("asset:" + assetId, r.data);
            return r.data;
          });
        });
      }).then(function (blob) {
        delete pending[assetId];
        if (!blob) return null;
        return (urlCache[assetId] = URL.createObjectURL(blob));
      }, function () { delete pending[assetId]; return null; });
      pending[assetId] = p;
      return p;
    },
    // the bytes themselves (for export)
    blob: function (assetId) {
      return cacheGet("asset:" + assetId).then(function (blob) {
        if (blob) return blob;
        return Stick.assets.info([assetId]).then(function (m) {
          var a = m[assetId]; if (!a || a.status !== "ready") return null;
          return db().then(function (c) { return c.storage.from("media").download(a.storage_path); }).then(function (r) { return r.error ? null : r.data; });
        });
      });
    },
    // short-lived URL for streaming audio/video
    signedUrl: function (assetId, seconds) {
      return Stick.assets.info([assetId]).then(function (m) {
        var a = m[assetId]; if (!a || a.status !== "ready") return null;
        return db().then(function (c) { return c.storage.from("media").createSignedUrl(a.storage_path, seconds || 3600); })
          .then(function (r) { return r.error ? null : r.data.signedUrl; });
      });
    },
    // remember a blob under its asset id so the device that uploaded it never has to download it
    rememberBlob: function (assetId, blob) { return cachePut("asset:" + assetId, blob); },
    forget: function (assetIds) {
      assetIds.forEach(function (id) { delete infoCache[id]; delete urlCache[id]; });
      return cacheDelete(assetIds.map(function (id) { return "asset:" + id; }));
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
