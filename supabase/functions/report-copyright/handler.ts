// Copyright complaint intake. Public (rights holders have no account). Writes one row to copyright_reports with the
// service role; nothing is published and nothing is removed automatically: a person reviews each report.
// DISABLED until the owner sets COPYRIGHT_INTAKE_ENABLED=true (do that only once the DMCA agent details are real and
// somebody is reading the reports: see docs/legal/dmca-readiness.md).
import { RateLimiter, clientIp, corsHeaders, json, readSmallJson } from "../_shared/http.ts";

export interface CopyrightDeps {
  enabled: boolean;
  insert(row: Record<string, unknown>): Promise<boolean>;
  allowedOrigins: string[];
  limiter: RateLimiter;
}

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function makeCopyrightHandler(deps: CopyrightDeps) {
  return async function handle(req: Request): Promise<Response> {
    const cors = corsHeaders(req.headers.get("origin"), deps.allowedOrigins);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") return json(405, { ok: false }, cors);
    if (!deps.enabled) return json(503, { ok: false, reason: "not_enabled" }, cors);
    if (!deps.limiter.allow(clientIp(req))) return json(429, { ok: false, reason: "rate_limited" }, { ...cors, "retry-after": "3600" });
    const b = await readSmallJson(req, 12000);
    if (!b) return json(400, { ok: false, reason: "bad_request" }, cors);
    const row = {
      reporter_name: str(b.name, 200), reporter_email: str(b.email, 320), reporter_address: str(b.address, 500) || null,
      work_description: str(b.work, 4000), infringing_url: str(b.url, 2000),
      good_faith: b.goodFaith === true, accuracy_perjury: b.accuracy === true, signature: str(b.signature, 200),
    };
    if (!row.reporter_name || !EMAIL.test(row.reporter_email) || !row.work_description || !row.infringing_url || !row.signature
        || !row.good_faith || !row.accuracy_perjury) return json(400, { ok: false, reason: "incomplete" }, cors);
    try { if (!(await deps.insert(row))) return json(502, { ok: false, reason: "unavailable" }, cors); }
    catch { return json(502, { ok: false, reason: "unavailable" }, cors); }
    return json(200, { ok: true }, cors);
  };
}
