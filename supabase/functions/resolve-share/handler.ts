// Public share resolver. The browser sends a share token; we return ONLY what that share may show,
// with short-lived signed URLs for its media. Storage paths (which contain user ids) never leave here.
import { TOKEN_RE, clientIp, corsHeaders, json, readSmallJson, RateLimiter } from "../_shared/http.ts";

export interface ResolveDeps {
  /** rpc resolve_share(token) with the service role */
  resolve(token: string): Promise<any>;
  /** create signed download URLs, keyed by storage path */
  sign(paths: string[], expiresInSeconds: number): Promise<Record<string, string>>;
  allowedOrigins: string[];
  limiter: RateLimiter;
}

const STATUS: Record<string, number> = { not_found: 404, blocked: 404, disabled: 410, expired: 410 };

export function makeResolveHandler(deps: ResolveDeps) {
  return async function handle(req: Request): Promise<Response> {
    const cors = corsHeaders(req.headers.get("origin"), deps.allowedOrigins);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") return json(405, { ok: false, reason: "method_not_allowed" }, cors);
    if (!deps.limiter.allow(clientIp(req))) return json(429, { ok: false, reason: "rate_limited" }, { ...cors, "retry-after": "60" });

    const body = await readSmallJson(req);
    const token = typeof body?.token === "string" ? body.token.trim().toLowerCase() : "";
    if (!TOKEN_RE.test(token)) return json(404, { ok: false, reason: "not_found" }, cors);

    let res: any;
    try { res = await deps.resolve(token); }
    catch { return json(502, { ok: false, reason: "unavailable" }, cors); }
    if (!res?.ok) return json(STATUS[res?.reason] ?? 404, { ok: false, reason: res?.reason ?? "not_found" }, cors);

    // sign exactly the assets this share includes
    const assets: Record<string, any> = res.assets ?? {};
    const paths = Object.values(assets).map((a: any) => a.path).filter(Boolean);
    let urls: Record<string, string> = {};
    try { if (paths.length) urls = await deps.sign(paths, 3600); }
    catch { return json(502, { ok: false, reason: "unavailable" }, cors); }

    const outAssets: Record<string, any> = {};
    for (const [id, a] of Object.entries(assets) as [string, any][]) {
      const url = urls[a.path];
      if (!url) continue;
      outAssets[id] = { url, mime: a.mime, kind: a.kind, width: a.width, height: a.height, duration: a.duration };
    }
    return json(200, {
      ok: true, type: res.type, by_name: res.by_name, created_at: res.created_at,
      by_bio: res.by_bio ?? null,
      // only meaningful if the avatar could be signed; the id is not a secret, the URL is short-lived
      by_avatar: res.by_avatar && outAssets[res.by_avatar] ? res.by_avatar : null,
      board: res.board ?? null, objects: res.objects ?? [], assets: outAssets,
    }, { ...cors, "cache-control": "private, max-age=60" });
  };
}
