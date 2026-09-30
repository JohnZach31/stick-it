/* Account: who you are in Stick-It (profile, avatar, sharing identity, preferences) and account-level actions.
 * Classic script; attaches to window.Stick.account. Everything here talks to the server through RLS-guarded
 * tables and RPCs; the browser never sets its own plan, id or avatar URL. */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  var cfg = Stick.config || {};

  var DEFAULT_SETTINGS = {
    bio: "", handle: "",
    shareShowName: true, shareShowAvatar: false, shareShowBio: false,
    shareDefaultIdentity: "named", shareDefaultBoardMode: "view",
    preferredFont: "", defaultNoteColor: ""
  };
  var AVATAR_COLORS = ["#4a7c59", "#b5651d", "#8a5a83", "#3b6ea5", "#a34a4a", "#5f6b73", "#c9a227", "#2e7d6f"];
  var HANDLE_RE = /^[a-z0-9_]{3,20}$/;

  function db() { return Stick.cloud.load(); }
  function unwrap(r) { if (r && r.error) throw Stick.errors.parse(r.error); return r ? r.data : null; }
  function guard(p) { return p.then(unwrap, function (e) { throw (e && e.code && e.offline !== undefined) ? e : Stick.errors.parse(e); }); }

  function fromSettingsRow(r) {
    var d = {};
    Object.keys(DEFAULT_SETTINGS).forEach(function (k) { d[k] = DEFAULT_SETTINGS[k]; });
    if (!r) return d;
    d.bio = r.bio || ""; d.handle = r.handle || "";
    d.shareShowName = r.share_show_name !== false;
    d.shareShowAvatar = !!r.share_show_avatar; d.shareShowBio = !!r.share_show_bio;
    d.shareDefaultIdentity = r.share_default_identity || "named";
    d.shareDefaultBoardMode = r.share_default_board_mode || "view";
    d.preferredFont = r.preferred_font || ""; d.defaultNoteColor = r.default_note_color || "";
    return d;
  }
  function toSettingsRow(s) {
    var named = s.shareDefaultIdentity !== "anonymous";
    return {
      bio: String(s.bio || "").trim() || null,
      handle: String(s.handle || "").trim().toLowerCase() || null,
      share_show_name: named,                                   // "show my name" and "default identity" are one choice
      share_show_avatar: !!s.shareShowAvatar && named,
      share_show_bio: !!s.shareShowBio && named,
      share_default_identity: named ? "named" : "anonymous",
      share_default_board_mode: s.shareDefaultBoardMode === "ask" ? "ask" : "view",
      preferred_font: String(s.preferredFont || "").slice(0, 60) || null,
      default_note_color: String(s.defaultNoteColor || "").slice(0, 40) || null
    };
  }

  // Client-side checks (the database enforces the same rules)
  function validate(v) {
    var name = String(v.displayName || "").replace(/\s+/g, " ").trim();
    if (!name) return { field: "name", message: "Please enter a display name." };
    if (name.length > 60) return { field: "name", message: "Display names can be up to 60 characters." };
    var bio = String(v.bio || "").trim();
    if (bio.length > 120) return { field: "bio", message: "Keep your bio under 120 characters." };
    var h = String(v.handle || "").trim().toLowerCase();
    if (h && !HANDLE_RE.test(h)) return { field: "handle", message: "Usernames are 3–20 letters, numbers or underscores." };
    return null;
  }

  // Center-crop (with optional zoom/offset) to a square. dx/dy are in units of the crop window.
  function drawCrop(canvas, img, view, size) {
    canvas.width = canvas.height = size;
    var g = canvas.getContext("2d");
    var base = Math.min(img.naturalWidth, img.naturalHeight) / (view.zoom || 1);
    var sx = Math.max(0, Math.min(img.naturalWidth - base, (img.naturalWidth - base) / 2 + (view.dx || 0) * base));
    var sy = Math.max(0, Math.min(img.naturalHeight - base, (img.naturalHeight - base) / 2 + (view.dy || 0) * base));
    g.fillStyle = "#fff"; g.fillRect(0, 0, size, size);
    g.drawImage(img, sx, sy, base, base, 0, 0, size, size);
  }
  // Output is always a fresh WebP/JPEG made by the browser's own decoder, so whatever the original
  // file was (even a disguised one) never reaches storage.
  function cropToBlob(img, view, size) {
    var c = document.createElement("canvas");
    drawCrop(c, img, view, size);
    return new Promise(function (resolve) {
      c.toBlob(function (b) {
        if (b && b.size > 0 && /^image\/(webp|jpeg)$/.test(b.type)) return resolve(b);
        c.toBlob(resolve, "image/jpeg", 0.85);
      }, "image/webp", 0.85);
    });
  }

  var cache = null;      // {profile, settings}

  Stick.account = {
    DEFAULTS: DEFAULT_SETTINGS, AVATAR_COLORS: AVATAR_COLORS, HANDLE_RE: HANDLE_RE,
    validate: validate, drawCrop: drawCrop, cropToBlob: cropToBlob, fromSettingsRow: fromSettingsRow, toSettingsRow: toSettingsRow,
    cached: function () { return cache; },

    // profile (public part) + private settings, from the server
    load: function () {
      var uid = Stick.auth.user() && Stick.auth.user().id;
      return Stick.auth.profile(true).then(function (profile) {
        return db().then(function (c) {
          return guard(c.from("profile_settings").select("*").eq("user_id", uid).maybeSingle());
        }).then(function (row) {
          cache = { profile: profile, settings: fromSettingsRow(row) };
          return cache;
        });
      });
    },

    // Save staged changes. `v` = {displayName, avatarStyle, avatarColor, avatarEmoji, ...settings fields}.
    // The avatar photo is handled first (upload -> adopt), then the rows.
    // `avatar` = {action: "keep"|"upload"|"provider"|"none", blob}
    save: function (v, avatar) {
      var bad = validate(v);
      if (bad) return Promise.reject({ code: "INVALID", message: bad.message, field: bad.field, offline: false, retryable: false });
      var user = Stick.auth.user();
      var step = Promise.resolve();
      if (avatar && avatar.action === "upload" && avatar.blob) {
        step = Stick.assets.upload(null, "avatar", avatar.blob, { filename: "avatar.jpg" }).then(function (asset) {
          return db().then(function (c) { return guard(c.rpc("set_avatar_asset", { p_asset: asset.id })); });
        });
      } else if (avatar && (avatar.action === "provider" || avatar.action === "none")) {
        step = db().then(function (c) { return guard(c.rpc("clear_avatar", { p_to: avatar.action })); });
      }
      return step.then(function () {
        return db();
      }).then(function (c) {
        var prof = {
          display_name: String(v.displayName).replace(/\s+/g, " ").trim().slice(0, 60),
          avatar_style: v.avatarStyle === "emoji" ? "emoji" : "initials",
          avatar_color: v.avatarColor || null,
          avatar_emoji: v.avatarStyle === "emoji" && v.avatarEmoji ? String(v.avatarEmoji).slice(0, 8) : null
        };
        var row = toSettingsRow(v); row.user_id = user.id;
        return guard(c.from("profiles").update(prof).eq("id", user.id).select().single()).then(function (p) {
          // update first (user_id is never written by an update); create the row only the first time
          var patch = {}; Object.keys(row).forEach(function (k) { if (k !== "user_id") patch[k] = row[k]; });
          return guard(c.from("profile_settings").update(patch).eq("user_id", user.id).select()).then(function (rows) {
            if (rows && rows.length) return rows[0];
            return guard(c.from("profile_settings").insert(row).select().single());
          }).then(function (s) {
            return Stick.auth.profile(true).then(function (fresh) {
              cache = { profile: fresh || p, settings: fromSettingsRow(s) };
              return cache;
            });
          });
        });
      });
    },

    // numbers for the account page (own data only)
    usage: function () { return db().then(function (c) { return guard(c.rpc("my_usage")); }); },

    // the picture to show: an object URL for a custom photo, the provider's URL, or null (initials/emoji)
    avatarUrl: function (profile, user) {
      if (!profile) return Promise.resolve(null);
      if (profile.avatar_source === "custom" && profile.avatar_asset_id) return Stick.assets.blobUrl(profile.avatar_asset_id);
      if (profile.avatar_source === "provider") {
        var m = (user && user.user_metadata) || {};
        return Promise.resolve(profile.avatar_url || m.avatar_url || m.picture || null);
      }
      return Promise.resolve(null);
    },

    // permanent deletion: server-side, needs the typed confirmation, and is not staged
    deleteAccount: function () {
      var s = Stick.auth.session();
      if (!s || !s.access_token) return Promise.reject({ code: "AUTH", message: "Please sign in again first.", offline: false, retryable: false });
      return fetch(cfg.SUPABASE_URL.replace(/\/$/, "") + "/functions/v1/delete-account", {
        method: "POST",
        headers: { "content-type": "application/json", "authorization": "Bearer " + s.access_token, "apikey": cfg.SUPABASE_ANON_KEY },
        body: JSON.stringify({ confirm: "DELETE" })
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (b) {
          if (r.ok && b.ok) return true;
          throw { code: r.status === 401 ? "AUTH" : "UNKNOWN", message: b.reason === "rate_limited" ? "Too many tries. Please wait a minute." : "Couldn't delete the account. Nothing was reported as deleted; try again.", offline: false, retryable: r.status >= 500 };
        });
      }, function (e) { throw Stick.errors.parse(e); });
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
