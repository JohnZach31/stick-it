// One-click unsubscribe from marketing e-mail. No login. POST ?t=<signed token> (RFC 8058 one-click, and the
// confirmation page on the Stick-It site calls it the same way). It turns the person's marketing preference OFF
// and returns only {ok:true}: it never reveals whose account the token belongs to, whether the account exists,
// or anything else. Transactional e-mail is a different category and is not affected.
// (Supabase serves HTML from functions as plain text, so the human-facing confirmation is a static page: unsubscribe.html)
import { RateLimiter, clientIp, corsHeaders, json } from "../_shared/http.ts";
import { verifyUnsubscribeToken } from "../_shared/unsubscribe-token.ts";

export interface UnsubDeps {
  secret: string;
  unsubscribe(userId: string): Promise<void>;
  allowedOrigins: string[];
  limiter: RateLimiter;
}

export function makeUnsubscribeHandler(deps: UnsubDeps) {
  return async function handle(req: Request): Promise<Response> {
    const cors = corsHeaders(req.headers.get("origin"), deps.allowedOrigins);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") return json(405, { ok: false }, cors);
    if (!deps.limiter.allow(clientIp(req))) return json(429, { ok: false, reason: "rate_limited" }, { ...cors, "retry-after": "60" });
    const url = new URL(req.url);
    let token = url.searchParams.get("t") ?? "";
    if (!token) {
      try { const b = await req.clone().text(); token = new URLSearchParams(b).get("t") ?? (JSON.parse(b || "{}").t ?? ""); } catch { /* none */ }
    }
    const uid = await verifyUnsubscribeToken(deps.secret, String(token));
    if (!uid) return json(400, { ok: false, reason: "invalid_link" }, cors);
    try { await deps.unsubscribe(uid); } catch { return json(502, { ok: false, reason: "unavailable" }, cors); }
    return json(200, { ok: true }, cors);
  };
}
