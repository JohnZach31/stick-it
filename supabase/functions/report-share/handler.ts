// "Report this content": stores an abuse report for a share. Public, rate limited, tiny payloads.
import { TOKEN_RE, clientIp, corsHeaders, json, readSmallJson, RateLimiter } from "../_shared/http.ts";

export interface ReportDeps {
  /** find the share id for a token and record the report; false if the token is unknown */
  report(token: string, reason: string | null): Promise<boolean>;
  allowedOrigins: string[];
  limiter: RateLimiter;
}

export function makeReportHandler(deps: ReportDeps) {
  return async function handle(req: Request): Promise<Response> {
    const cors = corsHeaders(req.headers.get("origin"), deps.allowedOrigins);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") return json(405, { ok: false }, cors);
    if (!deps.limiter.allow(clientIp(req))) return json(429, { ok: false, reason: "rate_limited" }, cors);
    const body = await readSmallJson(req);
    const token = typeof body?.token === "string" ? body.token.trim().toLowerCase() : "";
    if (!TOKEN_RE.test(token)) return json(404, { ok: false }, cors);
    const reason = typeof body?.reason === "string" ? body.reason.slice(0, 1000) : null;
    await deps.report(token, reason).catch(() => false);
    // same answer whether or not the token exists, so this can't be used to probe tokens
    return json(200, { ok: true }, cors);
  };
}
