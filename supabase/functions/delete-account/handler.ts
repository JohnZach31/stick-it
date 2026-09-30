// Permanent account deletion. The caller proves who they are with their own session token, and must
// send {"confirm":"DELETE"}. Nothing here trusts a user id sent by the browser.
//
// Order: remember the user's file paths -> purge_user_data (shares, boards, assets, profile; every
// deleted asset queues its file in storage_tombstones) -> delete the auth user -> remove the files now
// (anything that fails is picked up later by the gc-assets job through the tombstones).
import { RateLimiter, clientIp, corsHeaders, json, readSmallJson } from "../_shared/http.ts";

export interface DeleteDeps {
  /** verify the bearer token, return the user id or null */
  userFromToken(jwt: string): Promise<string | null>;
  listAssetPaths(userId: string): Promise<string[]>;
  purge(userId: string): Promise<void>;
  deleteAuthUser(userId: string): Promise<void>;
  removeFiles(paths: string[]): Promise<void>;
  allowedOrigins: string[];
  limiter: RateLimiter;
}

export function makeDeleteHandler(deps: DeleteDeps) {
  return async function handle(req: Request): Promise<Response> {
    const cors = corsHeaders(req.headers.get("origin"), deps.allowedOrigins);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") return json(405, { ok: false, reason: "method_not_allowed" }, cors);
    if (!deps.limiter.allow(clientIp(req))) return json(429, { ok: false, reason: "rate_limited" }, { ...cors, "retry-after": "60" });

    const auth = req.headers.get("authorization") ?? "";
    const jwt = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    if (!jwt) return json(401, { ok: false, reason: "not_authenticated" }, cors);
    let uid: string | null = null;
    try { uid = await deps.userFromToken(jwt); } catch { return json(502, { ok: false, reason: "unavailable" }, cors); }
    if (!uid) return json(401, { ok: false, reason: "not_authenticated" }, cors);

    const body = await readSmallJson(req);
    if (body?.confirm !== "DELETE") return json(400, { ok: false, reason: "confirmation_required" }, cors);

    try {
      const paths = await deps.listAssetPaths(uid);
      await deps.purge(uid);
      await deps.deleteAuthUser(uid);
      try { for (let i = 0; i < paths.length; i += 50) await deps.removeFiles(paths.slice(i, i + 50)); }
      catch { /* the tombstones let the garbage collector finish the job */ }
    } catch {
      return json(500, { ok: false, reason: "failed" }, cors);      // nothing was half-reported as success
    }
    return json(200, { ok: true }, cors);
  };
}
