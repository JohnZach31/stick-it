/* Stick-It public configuration.
 *
 * EVERYTHING IN THIS FILE IS PUBLIC. It ships to every visitor of the GitHub Pages site.
 *   SUPABASE_URL       your project URL              (public)
 *   SUPABASE_ANON_KEY  the anon / publishable key    (public by design: security comes from Row Level Security)
 *
 * NEVER put any of these in this file or anywhere in git:
 *   service_role key, database password, Google OAuth client SECRET, GC_SECRET, any Edge Function secret.
 *
 * While SUPABASE_URL is empty the app runs exactly as before (guest / localStorage only).
 *
 * For local testing you can point a browser at another backend without editing this file:
 *   localStorage.setItem('stickit.dev.config', JSON.stringify({SUPABASE_URL:'http://127.0.0.1:54321', SUPABASE_ANON_KEY:'...'}))
 * (only honoured on localhost / 127.0.0.1).
 */
(function (root) {
  var Stick = root.Stick = root.Stick || {};

  var cfg = {
    SUPABASE_URL: "https://ndgybpkkjqydvttmiyot.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_RMonorbZOjWuBgmNmXxjNw_O2wjbhq3",

    // Boards per plan. UX only (to warn before a request): the server enforces the real limit.
    PLAN_LIMITS: { guest: { boards: 1 }, free: { boards: 2 }, premium: { boards: 6 } },

    // Upload limits, mirrored from the media_limits table so the UI can explain them early.
    // The server (create_asset / finalize_asset / the bucket) is authoritative.
    MEDIA_LIMITS: {
      image:       { maxBytes: 10 * 1024 * 1024 },
      board_cover: { maxBytes: 5 * 1024 * 1024 },
      avatar:      { maxBytes: 2 * 1024 * 1024 },
      audio:       { maxBytes: 25 * 1024 * 1024 },
      video:       { maxBytes: 50 * 1024 * 1024 }   // Supabase Free caps a single upload at 50 MB
    },

    SYNC: {
      debounceMs: 700,      // wait for edits to settle before writing
      maxWaitMs: 3000,      // ...but never hold a change longer than this
      pollMs: 20000,        // pull other devices' changes (until Realtime is enabled)
      batch: 100            // objects per sync request
    },

    // Where a signed-in user is sent back to after Google. Must be in Supabase's redirect allow-list.
    // Left empty = the page's own URL without hash/query (works for GitHub Pages and localhost).
    REDIRECT_URL: ""
  };

  // developer override, localhost only
  try {
    var host = root.location && root.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      var dev = JSON.parse(root.localStorage.getItem("stickit.dev.config") || "null");
      if (dev && typeof dev === "object") Object.keys(dev).forEach(function (k) { cfg[k] = dev[k]; });
    }
  } catch (e) { /* no storage: ignore */ }

  cfg.CLOUD_CONFIGURED = /^https?:\/\//.test(cfg.SUPABASE_URL) && cfg.SUPABASE_ANON_KEY.length > 20;
  Stick.config = cfg;
})(typeof window !== "undefined" ? window : globalThis);
