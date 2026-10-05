/* Video links that can become embedded video: the pure rules (no DOM), so they can be tested under Node.
 *
 * Only an explicit allowlist of providers is ever embedded, and the embed address is BUILT here from a validated video id. The address a person
 * pasted is never used as an iframe source. Anything else (another site, an unusual path, http:, credentials, a port, a bad id) is not a video
 * link and stays an ordinary link.
 *
 *   Stick.embed.parse(url)  ->  { provider, id, start, embedUrl, watchUrl, source } | null
 *
 * Providers today: YouTube (embedded through youtube-nocookie.com) and Vimeo (player.vimeo.com, do-not-track).
 */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  var E = Stick.embed = {};

  E.PROVIDERS = {
    youtube: { label: "YouTube", frame: "https://www.youtube-nocookie.com" },
    vimeo: { label: "Vimeo", frame: "https://player.vimeo.com" }
  };
  var YT_HOSTS = { "youtube.com": 1, "www.youtube.com": 1, "m.youtube.com": 1, "youtu.be": 1, "www.youtu.be": 1 };
  var YT_ID = /^[A-Za-z0-9_-]{11}$/, VM_ID = /^\d{1,12}$/;

  function secs(v) {
    if (v == null || v === "") return 0;
    var m = /^(?:(\d{1,3})h)?(?:(\d{1,3})m)?(?:(\d{1,5})s?)?$/.exec(String(v));
    if (!m || (!m[1] && !m[2] && !m[3])) return 0;
    var t = (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
    return t > 0 && t < 86400 ? t : 0;
  }

  E.parse = function (input) {
    var raw = String(input == null ? "" : input).trim();
    if (!raw || raw.length > 2048 || /[\s<>"'\\]/.test(raw)) return null;
    var u;
    try { u = new URL(raw); } catch (e) { return null; }
    if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return null;
    var host = u.hostname.toLowerCase(), parts = u.pathname.split("/").filter(Boolean), id = null, provider = null, start = 0;
    if (YT_HOSTS[host]) {
      provider = "youtube";
      if (host.indexOf("youtu.be") !== -1) id = parts[0];
      else if (parts[0] === "watch") id = u.searchParams.get("v");
      else if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") id = parts[1];
      if (!id || !YT_ID.test(id)) return null;
      start = secs(u.searchParams.get("t") || u.searchParams.get("start"));
    } else if (host === "vimeo.com" || host === "www.vimeo.com") {
      provider = "vimeo"; id = parts[0];
      if (!id || !VM_ID.test(id) || parts.length > 2) return null;
    } else if (host === "player.vimeo.com" && parts[0] === "video") {
      provider = "vimeo"; id = parts[1];
      if (!id || !VM_ID.test(id)) return null;
    } else return null;
    var embedUrl = provider === "youtube"
      ? "https://www.youtube-nocookie.com/embed/" + id + "?rel=0&modestbranding=1&playsinline=1" + (start ? "&start=" + start : "")
      : "https://player.vimeo.com/video/" + id + "?dnt=1";
    var watchUrl = provider === "youtube" ? "https://www.youtube.com/watch?v=" + id + (start ? "&t=" + start + "s" : "") : "https://vimeo.com/" + id;
    return { provider: provider, id: id, start: start, embedUrl: embedUrl, watchUrl: watchUrl, source: raw };
  };

  // the stored form of an embed object (what a person can rely on after a reload / sync): always re-derived, never trusted
  E.normalize = function (item) {
    item = item || {};
    var info = E.parse(item.url);
    if (!info) return null;
    var w = Number(item.w);
    return { type: "embed", url: info.source, provider: info.provider, vid: info.id, start: info.start, w: isFinite(w) ? Math.round(Math.min(640, Math.max(220, w))) : 340 };
  };
})(typeof window !== "undefined" ? window : globalThis);
