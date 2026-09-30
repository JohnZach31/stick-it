/* BoardRepository + ObjectRepository: talk to Supabase, map between the app's object shape and rows.
 * Classic script; attaches to window.Stick.repo. Pure mapping functions are unit-tested under Node. */
(function (root) {
  var Stick = root.Stick = root.Stick || {};

  // ------------------------------------------------------------------ mapping
  // Client objects (what the app keeps in `notes`) <-> board_objects rows.
  //   w -> width, rot -> rotation, z -> z_index; everything else lives in `data`.
  // Media never goes into `data`: images/cutouts become assets (data.assetId / attachedAssetId),
  // audio/video keep their local `mediaId` (cache key) plus data.assetId once uploaded.
  var COLS = { id: 1, type: 1, x: 1, y: 1, w: 1, rot: 1, z: 1 };
  var POSTER_MAX = 32000;   // small client-made poster JPEGs stay inline; anything bigger is dropped

  function num(v, d) { v = Number(v); return isFinite(v) ? v : d; }

  function toRow(o) {
    var data = {};
    Object.keys(o).forEach(function (k) {
      if (COLS[k]) return;
      var v = o[k];
      if (v === undefined || typeof v === "function") return;
      if (k === "image" || k === "cutout") return;                       // -> assets
      if (k === "poster") { if (typeof v === "string" && v.length <= POSTER_MAX) data.poster = v; return; }
      data[k] = v;
    });
    return {
      id: o.id,
      type: o.type || "note",
      x: num(o.x, 0),
      y: num(o.y, 0),
      width: o.w == null ? null : num(o.w, null),
      height: null,
      rotation: o.rot == null ? null : num(o.rot, 0),
      z_index: Math.round(num(o.z, 0)),
      data: data
    };
  }

  function fromRow(r) {
    var o = {};
    var d = r.data || {};
    Object.keys(d).forEach(function (k) { o[k] = d[k]; });
    o.id = r.id;
    if (r.type && r.type !== "note") o.type = r.type; else delete o.type;   // notes stay type-less, like before
    o.x = r.x; o.y = r.y;
    if (r.width != null) o.w = r.width;
    o.rot = r.rotation == null ? 0 : r.rotation;
    o.z = r.z_index;
    return o;
  }

  // order-independent serialisation, so jsonb key reordering on the server never looks like a change
  function canon(v) {
    if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
    if (v && typeof v === "object") {
      return "{" + Object.keys(v).sort().filter(function (k) { return v[k] !== undefined; })
        .map(function (k) { return JSON.stringify(k) + ":" + canon(v[k]); }).join(",") + "}";
    }
    return JSON.stringify(v === undefined ? null : v);
  }
  // cyrb53: fast 53-bit string hash
  function hashStr(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  function hashRow(row) {
    return hashStr(canon({ type: row.type, x: row.x, y: row.y, width: row.width == null ? null : row.width,
      height: row.height == null ? null : row.height, rotation: row.rotation == null ? null : row.rotation,
      z_index: row.z_index, data: row.data }));
  }

  // ------------------------------------------------------------------ plumbing
  function db() { return Stick.cloud.load(); }
  function unwrap(r) {
    if (r && r.error) throw Stick.errors.parse(r.error);
    return r ? r.data : null;
  }
  function guard(p) {
    // network failures inside the client can also surface as rejections
    return p.then(unwrap, function (e) { throw (e && e.code && e.message !== undefined && e.offline !== undefined) ? e : Stick.errors.parse(e); });
  }

  var BOARD_COLS = "id,owner_id,name,subtitle,sort_order,cover_mode,cover_asset_id,thumbnail_asset_id,archived_at,locked_at,content_updated_at,created_at,updated_at";
  var OBJ_COLS = "id,board_id,type,x,y,width,height,rotation,z_index,data,version,deleted_at,updated_at";

  Stick.repo = {
    toRow: toRow, fromRow: fromRow, hashRow: hashRow, hashStr: hashStr, canon: canon,

    // ---- boards ------------------------------------------------------
    // Every board the user can open (their own and ones they were invited to), each with their role.
    listBoards: function () {
      var uid = Stick.auth.user() && Stick.auth.user().id;
      return db().then(function (c) {
        return Promise.all([
          guard(c.from("boards").select(BOARD_COLS).is("archived_at", null).order("sort_order", { ascending: true }).order("created_at", { ascending: true })),
          guard(c.from("board_members").select("board_id,role").eq("user_id", uid))
        ]);
      }).then(function (res) {
        var roles = {};
        (res[1] || []).forEach(function (m) { roles[m.board_id] = m.role; });
        return (res[0] || []).map(function (b) { b.role = roles[b.id] || "viewer"; return b; });
      });
    },
    createBoard: function (name, subtitle, migrationKey) {
      return db().then(function (c) {
        return guard(c.rpc("create_board", { p_name: name, p_subtitle: subtitle || null, p_migration_key: migrationKey || null }));
      });
    },
    updateBoard: function (id, patch) {
      return db().then(function (c) { return guard(c.from("boards").update(patch).eq("id", id).select(BOARD_COLS)); })
        .then(function (rows) { if (!rows || !rows.length) throw { code: "FORBIDDEN", message: "FORBIDDEN", offline: false, retryable: false }; return rows[0]; });
    },
    deleteBoard: function (id) {
      return db().then(function (c) { return guard(c.from("boards").delete().eq("id", id).select("id")); })
        .then(function (rows) { return !!(rows && rows.length); });
    },

    // ---- objects -----------------------------------------------------
    // live objects of a board (full load)
    fetchObjects: function (boardId) {
      return db().then(function (c) {
        return guard(c.from("board_objects").select(OBJ_COLS).eq("board_id", boardId).is("deleted_at", null).order("z_index", { ascending: true }).limit(1000));
      });
    },
    // everything that changed since a server timestamp, deletions included
    fetchChanges: function (boardId, sinceIso) {
      return db().then(function (c) {
        return guard(c.from("board_objects").select(OBJ_COLS).eq("board_id", boardId).gte("updated_at", sinceIso).order("updated_at", { ascending: true }).limit(1000));
      });
    },
    syncObjects: function (boardId, upserts, deletes) {
      return db().then(function (c) {
        return guard(c.rpc("sync_objects", { p_board: boardId, p_upserts: upserts || [], p_deletes: deletes || [] }));
      });
    },

    // ---- membership / invites (no UI yet, wired for the collaboration step) --------
    createInvite: function (boardId, email, role) {
      return db().then(function (c) { return guard(c.rpc("create_invite", { p_board: boardId, p_email: email || null, p_role: role || "editor" })); });
    },
    acceptInvite: function (token) {
      return db().then(function (c) { return guard(c.rpc("accept_invite", { p_token: token })); });
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
