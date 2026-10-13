/* Supabase client bootstrap, error normalisation and authentication (AuthService).
 * Classic script; attaches to window.Stick. Needs js/config.js first. */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  var cfg = Stick.config || {};
  var AUTH_KEY = "stickit.auth";
  var baseUrl = "";
  try { baseUrl = (root.document && root.document.currentScript && root.document.currentScript.src || "").replace(/[^\/]*$/, ""); } catch (e) {}

  // ------------------------------------------------------------------ errors
  var KNOWN = ["BOARD_LIMIT_REACHED", "STORAGE_QUOTA_EXCEEDED", "FILE_TOO_LARGE", "MIME_NOT_ALLOWED", "NOT_AUTHENTICATED",
    "FORBIDDEN", "OBJECT_LIMIT_REACHED", "UNSAFE_HTML", "INVITE_NOT_FOUND", "INVITE_USED", "INVITE_EXPIRED",
    "INVITE_EMAIL_MISMATCH", "INVITE_REVOKED", "ANONYMOUS_NOT_ALLOWED", "AGE_NOT_CONFIRMED", "PARENT_CONSENT_REQUIRED", "MARKETING_NOT_ALLOWED", "CODE_INVALID", "CODE_RATE_LIMIT", "PREMIUM_REQUIRED", "HANDLE_TAKEN", "NOTHING_TO_SHARE", "SHARE_LIMIT_REACHED", "UPLOAD_NOT_FOUND", "BAD_REQUEST"];
  Stick.errors = {
    // Turns whatever a Supabase call threw/returned into {code, message, offline, retryable}
    parse: function (e) {
      if (!e) return { code: "UNKNOWN", message: "Unknown error", offline: false, retryable: false };
      var msg = String(e.message || e.error_description || e.error || e);
      var code = "UNKNOWN";
      for (var i = 0; i < KNOWN.length; i++) if (msg.indexOf(KNOWN[i]) !== -1) { code = KNOWN[i]; break; }
      if (/profile_settings_handle_key/.test(msg)) code = "HANDLE_TAKEN";
      var offline = e instanceof TypeError || /Failed to fetch|NetworkError|Load failed|network|fetch failed|ECONNREFUSED/i.test(msg);
      if (offline) code = "OFFLINE";
      var status = e.status || e.statusCode;
      var auth = status === 401 || /JWT|not authenticated|invalid token/i.test(msg);
      if (auth && code === "UNKNOWN") code = "AUTH";
      var retryable = offline || status >= 500 || status === 429 || status === 408;
      return { code: code, message: msg, offline: offline, retryable: retryable, status: status };
    },
    // friendly text for the codes people can actually hit
    friendly: function (err) {
      var c = err && err.code;
      var lim = cfg.PLAN_LIMITS || {};
      if (c === "BOARD_LIMIT_REACHED") return "You've reached your plan's board limit (" + ((lim.free || {}).boards || 2) + " on the free plan).";
      if (c === "STORAGE_QUOTA_EXCEEDED") return "Your account is out of storage space.";
      if (c === "FILE_TOO_LARGE") return "That file is too large to upload.";
      if (c === "MIME_NOT_ALLOWED") return "That file type isn't supported.";
      if (c === "OBJECT_LIMIT_REACHED") return "This board has reached its maximum number of items.";
      if (c === "AGE_NOT_CONFIRMED") return "Please confirm your age first.";
      if (c === "PARENT_CONSENT_REQUIRED") return "Cloud features need a parent or guardian’s approval first.";
      if (c === "MARKETING_NOT_ALLOWED") return "Promotional e-mail isn’t available for this account.";
      if (c === "PREMIUM_REQUIRED") return "That is a Premium extra.";
      if (c === "HANDLE_TAKEN") return "That username is already taken.";
      if (c === "OFFLINE") return "You appear to be offline.";
      if (c === "CODE_INVALID") return "That code didn’t work. Check it, or ask for a new one.";
      if (c === "CODE_RATE_LIMIT") return "Please wait a little before asking for another code.";
      if (c === "FORBIDDEN") return "You don't have permission to do that here.";
      var d = Stick.errors.describe(err); if (d && d.known) return d.message;
      return err && err.message ? err.message : "Something went wrong.";
    },
    // The stable, documented application codes (docs/dev/ERROR-CODES.md lists every one; a test keeps the two in step).
    // id = what people may quote, message = what they read (never a database detail), retry = trying again can help, severity = how loud the message is.
    catalog: {
      "AUTH-001": { from: "NOT_AUTHENTICATED", message: "Please sign in again.", retry: false, severity: "warn" },
      "AUTH-002": { from: "AUTH", message: "Your sign-in has expired. Please sign in again.", retry: false, severity: "warn" },
      "AUTH-003": { from: "ANONYMOUS_NOT_ALLOWED", message: "That needs an account. Guests can work on the board they joined, but can’t do this.", retry: false, severity: "info" },
      "AUTH-004": { from: "AGE_NOT_CONFIRMED", message: "Please confirm your age first.", retry: false, severity: "info" },
      "AUTH-005": { from: "PARENT_CONSENT_REQUIRED", message: "Cloud features need a parent or guardian’s approval first.", retry: false, severity: "info" },
      "INVITE-001": { from: "INVITE_NOT_FOUND", message: "We couldn’t find that invitation. Check the link, or ask for a new one.", retry: false, severity: "warn" },
      "INVITE-002": { from: "INVITE_EXPIRED", message: "That invitation has expired. Ask for a new one.", retry: false, severity: "warn" },
      "INVITE-003": { from: "INVITE_REVOKED", message: "This board access was turned off by the owner.", retry: false, severity: "warn" },
      "INVITE-004": { from: "INVITE_EMAIL_MISMATCH", message: "That invitation is tied to a different e-mail address. Sign in with the address it was sent to.", retry: false, severity: "warn" },
      "INVITE-005": { from: "INVITE_USED", message: "That invitation was already used.", retry: false, severity: "warn" },
      "SHARE-001": { from: "SHARE_LIMIT_REACHED", message: "You’ve reached the limit of share links on your plan.", retry: false, severity: "info" },
      "SHARE-002": { from: "NOTHING_TO_SHARE", message: "There is nothing to share yet.", retry: false, severity: "info" },
      "SYNC-001": { from: "OFFLINE", message: "You appear to be offline. Changes are kept and sent when you’re back.", retry: true, severity: "info" },
      "SYNC-002": { from: "FORBIDDEN", message: "You don’t have permission to do that here.", retry: false, severity: "warn" },
      "SYNC-003": { from: "UNSAFE_HTML", message: "That content couldn’t be saved because it isn’t allowed.", retry: false, severity: "warn" },
      "BOARD-001": { from: "BOARD_LIMIT_REACHED", message: "You’ve reached your plan’s board limit.", retry: false, severity: "info" },
      "BOARD-002": { from: "OBJECT_LIMIT_REACHED", message: "This board has reached its maximum number of items.", retry: false, severity: "info" },
      "BOARD-003": { from: "ACCESS_REVOKED", message: "This board access was turned off by the owner.", retry: false, severity: "warn" },
      "ASSET-001": { from: "FILE_TOO_LARGE", message: "That file is too large to upload.", retry: false, severity: "info" },
      "ASSET-002": { from: "MIME_NOT_ALLOWED", message: "That file type isn’t supported.", retry: false, severity: "info" },
      "ASSET-003": { from: "STORAGE_QUOTA_EXCEEDED", message: "Your account is out of storage space.", retry: false, severity: "info" },
      "ASSET-004": { from: "UPLOAD_NOT_FOUND", message: "That upload could not be found. Please try again.", retry: true, severity: "warn" },
      "LOCK-001": { from: "LOCK_PIN_WRONG", message: "That PIN didn\u2019t open the note.", retry: true, severity: "info" },
      "LOCK-002": { from: "LOCK_COOLDOWN", message: "Too many wrong PINs. Please wait a little before trying again.", retry: true, severity: "warn" },
      "LOCK-003": { from: "LOCK_NOT_FOUND", message: "This note\u2019s lock record is missing, so it can\u2019t be opened here.", retry: false, severity: "warn" },
      "LOCK-004": { from: "LOCK_NOT_OWNER", message: "Only the person who locked this note can change or remove its lock.", retry: false, severity: "info" },
      "LOCK-005": { from: "LOCK_UNSUPPORTED", message: "That can\u2019t be PIN-locked yet.", retry: false, severity: "info" },
      "LOCK-006": { from: "LOCK_DAMAGED", message: "This locked note is damaged and can\u2019t be opened.", retry: false, severity: "warn" },
      "PRINT-001": { from: "PRINT_FAILED", message: "Printing didn’t start. Try again, or use Save as PDF.", retry: true, severity: "warn" },
      "MEDIA-001": { from: "MEDIA_DENIED", message: "The camera or microphone isn’t allowed. Check the browser’s permission for this site.", retry: false, severity: "warn" }
    },
    // {id, message, severity, retry, known} for an application error code or a parsed Supabase error; unknown things get a generic, secret-free message
    describe: function (err) {
      var c = typeof err === "string" ? err : (err && err.code), cat = Stick.errors.catalog, ids = Object.keys(cat);
      for (var i = 0; i < ids.length; i++) if (cat[ids[i]].from === c) return { id: ids[i], message: cat[ids[i]].message, severity: cat[ids[i]].severity, retry: cat[ids[i]].retry, known: true };
      return { id: "SYNC-999", message: "Something went wrong. Please try again.", severity: "warn", retry: true, known: false };
    }
  };

  // ------------------------------------------------------------------ mode (decided synchronously at page load)
  function cachedSession() {
    try { var s = JSON.parse(root.localStorage.getItem(AUTH_KEY) || "null"); return s && s.user && s.user.id ? s : null; }
    catch (e) { return null; }
  }
  var sess = cfg.CLOUD_CONFIGURED ? cachedSession() : null;
  Stick.mode = {
    cloud: !!sess,
    uid: sess ? sess.user.id : null,
    // localStorage key namespace: guests keep the original keys, signed-in users get their own
    ns: sess ? "cloud." + sess.user.id + "." : ""
  };

  // ------------------------------------------------------------------ client loading
  var clientPromise = null;
  Stick.cloud = {
    configured: !!cfg.CLOUD_CONFIGURED,
    client: null,
    // tests can hand in a ready-made client
    useClient: function (c) { Stick.cloud.client = c; clientPromise = Promise.resolve(c); return c; },
    load: function () {
      if (Stick.cloud.client) return Promise.resolve(Stick.cloud.client);
      if (!cfg.CLOUD_CONFIGURED) return Promise.reject(new Error("Cloud sync is not configured"));
      if (clientPromise) return clientPromise;
      clientPromise = new Promise(function (resolve, reject) {
        function make() {
          try {
            var c = root.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
              auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: AUTH_KEY, storage: root.localStorage },
              global: { headers: { "x-client-info": "stick-it-web" } }
            });
            Stick.cloud.client = c;
            resolve(c);
          } catch (e) { reject(e); }
        }
        if (root.supabase && root.supabase.createClient) return make();
        var s = root.document.createElement("script");
        s.src = baseUrl + "vendor/supabase.js";
        s.onload = make;
        s.onerror = function () { clientPromise = null; reject(new Error("Couldn't load the sync library")); };
        root.document.head.appendChild(s);
      });
      return clientPromise;
    }
  };

  // ------------------------------------------------------------------ auth
  var listeners = [];
  var lastSession = null;
  var cachedProfile = null;
  var inited = null;

  // Where Google (via Supabase) should send the person back to. It is ALWAYS the page they started from: on localhost / 127.0.0.1 that is the local origin and
  // port (so a sign-in started on a local build comes back to that build), on GitHub Pages it is the Pages URL. A configured REDIRECT_URL (a production value) is
  // ignored on a loopback host, so it can never pull a local sign-in over to the live site. Nothing is hardcoded.
  function isLoopback() { var h = root.location && root.location.hostname; return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1"; }
  function redirectUrl() {
    var own = root.location.origin + root.location.pathname;
    return isLoopback() ? own : (cfg.REDIRECT_URL || own);
  }
  // localhost-only diagnostics ([auth] lines in the console); nothing is logged in production and no token is ever printed
  function authLog() { if (!isLoopback() || !root.console) return; try { root.console.info.apply(root.console, ["[auth]"].concat([].slice.call(arguments))); } catch (e) { /* no console */ } }
  Stick.authDiag = { redirectUrl: redirectUrl, isLoopback: isLoopback, log: authLog };
  if (isLoopback() && root.location) {
    var q = root.location.search || "", h = root.location.hash || "";
    authLog("page", root.location.origin + root.location.pathname, "| returning from sign-in:", /[?&]code=/.test(q) ? "yes (?code present)" : /[?&]error/.test(q) ? "error: " + q.slice(0, 120) : "no", "| cached session:", !!cachedSession());
    if (/access_token=|refresh_token=/.test(h)) authLog("unexpected: tokens in the URL hash (implicit flow). This build uses PKCE.");
  }

  Stick.auth = {
    // true right after Google sends the visitor back with ?code=...
    callbackPending: !!(cfg.CLOUD_CONFIGURED && root.location && /[?&](code|error_description)=/.test(root.location.search || "")),

    staleSession: false,
    // forget a cached login the server rejected (the account's boards stay in this browser's cache; signing in again brings them back)
    dropStale: function () { try { root.localStorage.removeItem(AUTH_KEY); } catch (e) { /* storage blocked */ } },
    cachedUser: function () { var s = cachedSession(); return s ? s.user : null; },
    user: function () { return (lastSession && lastSession.user) || Stick.auth.cachedUser(); },
    session: function () { return lastSession; },

    // loads the client, restores the session, and starts listening for changes
    init: function () {
      if (inited) return inited;
      inited = Stick.cloud.load().then(function (c) {
        c.auth.onAuthStateChange(function (event, session) {
          lastSession = session || null;
          listeners.slice().forEach(function (fn) { try { fn(event, session); } catch (e) {} });
        });
        return c.auth.getSession().then(function (r) {
          lastSession = (r && r.data && r.data.session) || null;
          // a cached login that the server no longer accepts (an invalid / revoked refresh token) is STALE; a network hiccup is not
          var er = r && r.error;
          Stick.auth.staleSession = !!(!lastSession && er && !/Retryable|fetch|network/i.test((er.name || "") + " " + (er.message || "")) && /refresh.?token|invalid.*(grant|jwt|token)|not found|expired/i.test(er.message || er.code || ""));
          authLog("session restored:", !!lastSession, er ? "| error: " + (er.name || "") + " " + String(er.message || "").slice(0, 100) : "", Stick.auth.staleSession ? "| STALE cached session" : "");
          return lastSession;
        });
      });
      return inited;
    },
    onChange: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },

    // provider: "google" | "github" (must be enabled in the Supabase dashboard)
    signInWithProvider: function (provider) {
      return Stick.cloud.load().then(function (c) {
        var redirectTo = redirectUrl();
        authLog("starting", provider, "sign-in; redirectTo =", redirectTo, "(this exact URL must be in Supabase > Authentication > URL Configuration > Redirect URLs, otherwise Supabase falls back to its Site URL, which is the GitHub Pages site)");
        return c.auth.signInWithOAuth({ provider: provider, options: { redirectTo: redirectTo } });
      }).then(function (r) { if (r && r.error) throw r.error; return r; });
    },
    // joining a shared board without an account: Supabase "anonymous sign-in" (a real but credential-less user; needs "Allow anonymous sign-ins" switched on in the dashboard)
    signInAnonymously: function () {
      return Stick.cloud.load().then(function (c) { authLog("anonymous sign-in (joining a shared board without an account)"); return c.auth.signInAnonymously(); })
        .then(function (r) { if (r && r.error) throw r.error; return r; });
    },
    isAnonymous: function () { var u = Stick.auth.user(); return !!(u && (u.is_anonymous === true || (u.app_metadata && u.app_metadata.provider === "anonymous"))); },
    signInWithGoogle: function () { return Stick.auth.signInWithProvider("google"); },

    // passwordless e-mail code (Supabase Auth one-time password). Nothing about the code is stored or generated here.
    // The reply is the same whether or not the address already has an account (no account enumeration).
    sendEmailCode: function (email) {
      return Stick.cloud.load().then(function (c) {
        return c.auth.signInWithOtp({ email: String(email || "").trim(), options: { shouldCreateUser: true } });
      }).then(function (r) {
        if (r && r.error) {
          var m = String(r.error.message || ""), st = r.error.status;
          if (st === 429 || /rate limit|too many|seconds/i.test(m)) throw new Error("CODE_RATE_LIMIT");
          throw r.error;
        }
        return true;
      });
    },
    verifyEmailCode: function (email, code) {
      return Stick.cloud.load().then(function (c) {
        return c.auth.verifyOtp({ email: String(email || "").trim(), token: String(code || "").replace(/\s+/g, ""), type: "email" });
      }).then(function (r) {
        if (r && r.error) throw new Error(r.error.status === 429 ? "CODE_RATE_LIMIT" : "CODE_INVALID");
        return (r && r.data && r.data.session) || null;
      });
    },

    // sign-in methods attached to this account, and adding another (needs "manual linking" enabled in Supabase)
    identities: function () {
      return Stick.cloud.load().then(function (c) { return c.auth.getUserIdentities(); }).then(function (r) {
        if (r.error) throw Stick.errors.parse(r.error);
        return (r.data && r.data.identities) || [];
      });
    },
    linkProvider: function (provider) {
      return Stick.cloud.load().then(function (c) {
        var redirectTo = redirectUrl();
        return c.auth.linkIdentity({ provider: provider, options: { redirectTo: redirectTo } });
      }).then(function (r) { if (r && r.error) throw Stick.errors.parse(r.error); return r; });
    },

    // scope: "local" (this device, default) | "global" (every device)
    signOut: function (scope) {
      return Stick.cloud.load().then(function (c) { return c.auth.signOut({ scope: scope || "local" }); }).then(function () { lastSession = null; cachedProfile = null; });
    },

    // The account row. Created on sign-up by a database trigger; ensure_profile() covers the rare miss.
    profile: function (force) {
      if (cachedProfile && !force) return Promise.resolve(cachedProfile);
      return Stick.cloud.load().then(function (c) { return c.rpc("ensure_profile"); }).then(function (r) {
        if (r.error) throw Stick.errors.parse(r.error);
        cachedProfile = r.data;
        return cachedProfile;
      });
    },
    updateDisplayName: function (name) {
      var user = Stick.auth.user();
      name = String(name || "").replace(/\s+/g, " ").trim().slice(0, 60);
      if (!user || !name) return Promise.resolve(null);
      return Stick.cloud.load().then(function (c) {
        return c.from("profiles").update({ display_name: name }).eq("id", user.id).select().single();
      }).then(function (r) {
        if (r.error) throw Stick.errors.parse(r.error);
        cachedProfile = r.data;
        return cachedProfile;
      });
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
