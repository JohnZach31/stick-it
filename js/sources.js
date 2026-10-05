/* Where a link comes from: a small, extensible registry of familiar sites plus the fallback order for showing a site's identity. Pure rules (no DOM), testable under Node.
 *
 *   Stick.sources.identify(url) -> { host, domain, known: {id, name, color, glyph} | null, letter, color, label }
 *   Stick.sources.iconPlan(url) -> ["registry" | "favicon" | "badge" | "generic"]   the order to try; the app draws the first that works
 *
 * Fallback order (A..D):  A. a known-site entry (name, brand colour and mark)  B. a favicon, only where a favicon service has been configured  C. a generated
 * letter badge from the domain  D. a plain link icon. Nothing here ever fetches anything; a failed lookup is remembered so it is not repeated.
 * The registry holds NAMES and COLOURS only: no hand-drawn copies of anybody's logo. Add a site by adding a row.
 */
(function (root) {
  var Stick = root.Stick = root.Stick || {};
  var S = Stick.sources = {};

  S.REGISTRY = [
    { id: "chatgpt", name: "ChatGPT", hosts: ["chatgpt.com", "chat.openai.com"], color: "#10a37f", glyph: "C" },
    { id: "openai", name: "OpenAI", hosts: ["openai.com"], color: "#202123", glyph: "O" },
    { id: "gemini", name: "Gemini", hosts: ["gemini.google.com"], color: "#4b6cf0", glyph: "G" },
    { id: "google", name: "Google", hosts: ["google.com", "google.co.il"], color: "#4285f4", glyph: "G" },
    { id: "youtube", name: "YouTube", hosts: ["youtube.com", "youtu.be", "youtube-nocookie.com"], color: "#d62d20", glyph: "Y" },
    { id: "bbc", name: "BBC", hosts: ["bbc.com", "bbc.co.uk"], color: "#b80000", glyph: "B" },
    { id: "github", name: "GitHub", hosts: ["github.com", "githubusercontent.com"], color: "#24292f", glyph: "G" },
    { id: "reddit", name: "Reddit", hosts: ["reddit.com", "redd.it"], color: "#ff4500", glyph: "R" },
    { id: "wikipedia", name: "Wikipedia", hosts: ["wikipedia.org", "wikimedia.org"], color: "#5b5b5b", glyph: "W" }
  ];
  var BADGE = ["#c0584a", "#4a7fc0", "#4a9a6a", "#a06ac0", "#c08a2e", "#4a9aa6", "#8a8a4a"];

  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  // the host of an http(s) link, lower-case, without a leading "www."; "" for anything else
  S.host = function (url) {
    var v = String(url == null ? "" : url).trim();
    if (!v || v.length > 600 || /[\s<>"'\\]/.test(v)) return "";
    try { var u = new URL(v); if (u.protocol !== "https:" && u.protocol !== "http:") return ""; if (u.username || u.password) return ""; return u.hostname.toLowerCase().replace(/\.$/, "").replace(/^www\./, ""); } catch (e) { return ""; }
  };
  // a host belongs to a registry row when it is that host or a subdomain of it ("en.m.wikipedia.org" -> wikipedia.org); a look-alike ("evilwikipedia.org") does not
  S.lookup = function (host) {
    host = String(host || "").toLowerCase();
    if (!host) return null;
    for (var i = 0; i < S.REGISTRY.length; i++) {
      var hs = S.REGISTRY[i].hosts;
      for (var j = 0; j < hs.length; j++) if (host === hs[j] || host.slice(-(hs[j].length + 1)) === "." + hs[j]) return S.REGISTRY[i];
    }
    return null;
  };
  // the registrable-looking part shown to people ("news.bbc.co.uk" -> "bbc.co.uk" for known sites, the host itself otherwise)
  S.domain = function (url) {
    var host = S.host(url); if (!host) return "";
    var k = S.lookup(host);
    if (k) for (var i = 0; i < k.hosts.length; i++) if (host === k.hosts[i] || host.slice(-(k.hosts[i].length + 1)) === "." + k.hosts[i]) return k.hosts[i];
    return host;
  };
  S.identify = function (url) {
    var host = S.host(url);
    if (!host) return { host: "", domain: "", known: null, letter: "?", color: "#9a9484", label: "" };
    var k = S.lookup(host), dom = S.domain(url);
    return { host: host, domain: dom, known: k ? { id: k.id, name: k.name, color: k.color, glyph: k.glyph } : null, letter: (k ? k.glyph : dom.charAt(0).toUpperCase()) || "?", color: k ? k.color : BADGE[hash(dom) % BADGE.length], label: k ? k.name : dom };
  };
  // favicon addresses come only from a configured service (none by default: asking one would tell it which sites you keep clippings of). {host} is replaced.
  S.faviconUrl = function (host, service) {
    service = service || (Stick.config && Stick.config.FAVICON_SERVICE) || "";
    if (!service || !/^https:\/\/\S+$/.test(service) || service.split("{host}").length !== 2) return "";
    if (!/^[a-z0-9.-]{1,253}$/.test(host || "")) return "";
    return service.replace("{host}", host);
  };
  S.iconPlan = function (url, service) {
    var host = S.host(url), plan = [];
    if (!host) return ["generic"];
    if (S.lookup(host)) plan.push("registry");
    if (S.faviconUrl(host, service)) plan.push("favicon");
    plan.push("badge");
    plan.push("generic");
    return plan;
  };
  // a tiny memory of what worked and what did not, so a failed lookup is never tried again on every draw. store: {getItem,setItem} (localStorage) or nothing (memory only).
  S.createCache = function (store, key, now) {
    var mem = {}, KEY = key || "stickit.sourceIcons", TTL_OK = 30 * 86400000, TTL_BAD = 3 * 86400000;
    function load() { try { var j = store && store.getItem(KEY); var o = j ? JSON.parse(j) : {}; return o && typeof o === "object" ? o : {}; } catch (e) { return {}; } }
    function save(o) { try { if (store) store.setItem(KEY, JSON.stringify(o)); } catch (e) { /* storage full or unavailable: memory only */ } }
    function t() { return (now || Date.now)(); }
    return {
      get: function (host) {
        var m = mem[host]; var o = load(); var r = m || o[host];
        if (!r) return null;
        if (t() - r.t > (r.ok ? TTL_OK : TTL_BAD)) return null;
        return { ok: !!r.ok };
      },
      set: function (host, ok) { var r = { ok: !!ok, t: t() }; mem[host] = r; var o = load(); o[host] = r; var ks = Object.keys(o); if (ks.length > 200) ks.sort(function (a, b) { return o[a].t - o[b].t; }).slice(0, ks.length - 200).forEach(function (k) { delete o[k]; }); save(o); }
    };
  };
})(typeof window !== "undefined" ? window : globalThis);
