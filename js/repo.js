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
      if (k === "frames") { data.frames = (Array.isArray(v) ? v : []).map(function (f) { var o2 = {}; if (f.assetId) o2.assetId = f.assetId; if (f.ratio != null) o2.ratio = f.ratio; if (f.cap) o2.cap = f.cap; if (!f.assetId && f.image) o2.pending = true; return o2; }); return; }   // strip pictures live in assets, never in the row
      if (k === "cutoutKey") return;                                     // this device's copy of a cutout blob: meaningless elsewhere
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
    // a member (not the owner) leaving a board they were invited to
    leaveBoard: function (id) {
      var uid = Stick.auth.user() && Stick.auth.user().id;
      return db().then(function (c) { return guard(c.from("board_members").delete().eq("board_id", id).eq("user_id", uid).select("board_id")); })
        .then(function (rows) { return !!(rows && rows.length); });
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
    // the links this board's owner has made (the secret itself is never stored, so only who/what/how often); and turning one off
    // The owner's collaboration invitations for one board (a different thing from public share links, which live in `shares`).
    // If the server has not got the v0.8.3.4 functions yet, fall back to reading the table directly (owner-only by row-level security): the links still show, just without who joined.
    listInvites: function (boardId) {
      return db().then(function (c) {
        return c.rpc("list_invites", { p_board: boardId }).then(function (r) {
          if (!r.error) return r.data || [];
          if (/list_invites|PGRST202|Could not find the function|schema cache/i.test(String(r.error.message || "") + String(r.error.code || ""))) {
            return c.from("board_invites").select("id,board_id,email,role,uses,created_at").eq("board_id", boardId).order("created_at", { ascending: false }).then(function (t) {
              if (t.error) throw Stick.errors.parse(t.error);
              return (t.data || []).map(function (x) { x.revoked_at = null; x.tracked = false; x.people = []; return x; });
            });
          }
          throw Stick.errors.parse(r.error);
        });
      });
    },
    // turns the link off AND removes the people who got in only through it (the server does both)
    revokeInvite: function (id) {
      return db().then(function (c) {
        return c.rpc("revoke_invite", { p_invite: id }).then(function (r) {
          if (!r.error) return r.data;
          if (/revoke_invite|PGRST202|Could not find the function|schema cache/i.test(String(r.error.message || "") + String(r.error.code || ""))) {
            return c.from("board_invites").delete().eq("id", id).then(function (t) { if (t.error) throw Stick.errors.parse(t.error); return { id: id, removed: 0 }; });
          }
          throw Stick.errors.parse(r.error);
        });
      });
    },
    // who has access to a board right now (owner only). null when the server does not have the function yet.
    listBoardAccess: function (boardId) {
      return db().then(function (c) {
        return c.rpc("list_board_access", { p_board: boardId }).then(function (r) { return r.error ? null : (r.data || []); });
      });
    },
    // remove a TURNED-OFF link from the owner's history (never touches anyone's access)
    deleteInviteHistory: function (id) {
      return db().then(function (c) { return guard(c.rpc("delete_invite_history", { p_invite: id })); });
    },
    // how many collaboration invitations are on across the boards I own; null when unknown
    myActiveInviteCount: function () {
      return db().then(function (c) { return c.rpc("my_active_invite_count").then(function (r) { return r.error ? null : Number(r.data) || 0; }); });
    },
    myGuestAlias: function (boardId) {
      return db().then(function (c) { return guard(c.rpc("my_guest_alias", { p_board: boardId })); });
    },
    // alias: the generated guest name this browser already had ("Leaflet #77"); the server keeps it only if nobody else on that board has it.
    acceptInvite: function (token, alias) {
      return db().then(function (c) {
        var args = { p_token: token }; if (alias) args.p_alias = alias;
        return c.rpc("accept_invite", args).then(function (r) {
          if (r.error && alias && /PGRST202|Could not find the function|schema cache/i.test(String(r.error.message || "") + String(r.error.code || ""))) return guard(c.rpc("accept_invite", { p_token: token }));    // older server: no alias argument
          return guard(Promise.resolve(r));
        });
      });
    },
    // a guest's chosen display name (anonymous sessions only); empty string goes back to the generated name
    setGuestName: function (name) {
      return db().then(function (c) { return guard(c.rpc("set_guest_name", { p_name: name == null ? "" : name })); });
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
