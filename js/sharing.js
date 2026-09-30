/* ShareService: server-backed short links for signed-in users, and resolving them for visitors.
 *
 *   #s=<token>   new links. Snapshot (note / selected group: frozen) or live board (always current).
 *   #sn= #sg= #sb=  legacy links carry their content in the URL; they keep working and are untouched.
 *
 * Classic script; attaches window.Stick.share. */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  var cfg = Stick.config || {};

  function db() { return Stick.cloud.load(); }
  function appUrl() { return (root.location.origin + root.location.pathname); }

  Stick.share = {
    TOKEN_RE: /^[a-f0-9]{64}$/,
    linkFor: function (token) { return appUrl() + "#s=" + token; },
    tokenFromHash: function (hash) { var m = /^#s=([a-f0-9]{64})$/i.exec(hash || ""); return m ? m[1].toLowerCase() : null; },

    // frozen copy of the chosen objects (they must already exist on the server: sync first)
    createSnapshot: function (boardId, objectIds, byName, ident) {
      return db().then(function (c) {
        return c.rpc("create_share", { p_type: objectIds.length === 1 ? "object_snapshot" : "group_snapshot", p_board: boardId, p_object_ids: objectIds, p_by_name: byName || null,
          p_show_avatar: !!(ident && ident.avatar), p_show_bio: !!(ident && ident.bio) });
      }).then(function (r) {
        if (r.error) throw Stick.errors.parse(r.error);
        return { id: r.data.id, token: r.data.token, url: Stick.share.linkFor(r.data.token) };
      });
    },
    // the board as it is now, and as it changes
    createLive: function (boardId, byName, ident) {
      return db().then(function (c) { return c.rpc("create_share", { p_type: "board_live", p_board: boardId, p_by_name: byName || null,
        p_show_avatar: !!(ident && ident.avatar), p_show_bio: !!(ident && ident.bio) }); })
        .then(function (r) {
          if (r.error) throw Stick.errors.parse(r.error);
          return { id: r.data.id, token: r.data.token, url: Stick.share.linkFor(r.data.token) };
        });
    },
    // my links (never includes the token: only its hash is stored)
    list: function () {
      return db().then(function (c) { return c.from("shares").select("id,share_type,board_id,by_name,is_active,created_at,disabled_at").order("created_at", { ascending: false }); })
        .then(function (r) { if (r.error) throw Stick.errors.parse(r.error); return r.data || []; });
    },
    disable: function (shareId) {
      return db().then(function (c) { return c.rpc("disable_share", { p_share: shareId }); })
        .then(function (r) { if (r.error) throw Stick.errors.parse(r.error); return !!r.data; });
    },

    // visitor side: no account, only the token. Goes through the resolve-share Edge Function.
    resolve: function (token) {
      if (!cfg.CLOUD_CONFIGURED) return Promise.resolve({ ok: false, reason: "unavailable" });
      return fetch(cfg.SUPABASE_URL.replace(/\/$/, "") + "/functions/v1/resolve-share", {
        method: "POST",
        headers: { "content-type": "application/json", apikey: cfg.SUPABASE_ANON_KEY, authorization: "Bearer " + cfg.SUPABASE_ANON_KEY },
        body: JSON.stringify({ token: token })
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          if (res.ok && j && j.ok) return j;
          return { ok: false, reason: (j && j.reason) || (res.status === 429 ? "rate_limited" : "not_found"), status: res.status };
        });
      }, function () { return { ok: false, reason: "unavailable" }; });
    },
    report: function (token, reason) {
      return fetch(cfg.SUPABASE_URL.replace(/\/$/, "") + "/functions/v1/report-share", {
        method: "POST", headers: { "content-type": "application/json", apikey: cfg.SUPABASE_ANON_KEY, authorization: "Bearer " + cfg.SUPABASE_ANON_KEY },
        body: JSON.stringify({ token: token, reason: reason || null })
      }).then(function () { return true; }, function () { return false; });
    },

    // resolved payload -> the app's own object shape, with signed media URLs filled in
    toClientObjects: function (resolved) {
      var assets = resolved.assets || {};
      return (resolved.objects || []).map(function (ro, i) {
        var o = Stick.repo.fromRow({ id: "s" + i, type: ro.type, x: ro.x, y: ro.y, width: ro.width, height: ro.height, rotation: ro.rotation, z_index: ro.z_index, data: ro.data });
        var main = o.assetId && assets[o.assetId], att = o.attachedAssetId && assets[o.attachedAssetId];
        if (o.type === "photo" && main) o.image = main.url;
        else if (!o.type && att) o.image = att.url;
        else if ((o.type === "audio" || o.type === "video") && main) o.mediaUrl = main.url;
        return o;
      });
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
