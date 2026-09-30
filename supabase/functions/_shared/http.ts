// Small helpers shared by the Edge Functions. No Deno or Supabase imports here, so the
// logic can be unit-tested under plain Node (see supabase/tests/functions.test.mjs).

export const TOKEN_RE = /^[a-f0-9]{64}$/;

/** Origins allowed to call the public functions from a browser. */
export function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const h: Record<string, string> = {
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
    "Access-Control-Max-Age": "600",
  };
  if (origin && allowed.includes(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

export function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });
}

/** Best-effort per-key sliding window limiter. In-memory: it protects one warm isolate, which is
 *  enough to blunt casual abuse; put a real limiter (WAF / DB counter) in front for more. */
export class RateLimiter {
  hits = new Map<string, number[]>();
  max: number;
  windowMs: number;
  now: () => number;
  constructor(max: number, windowMs: number, now: () => number = Date.now) {
    this.max = max; this.windowMs = windowMs; this.now = now;
  }
  allow(key: string): boolean {
    const t = this.now();
    const recent = (this.hits.get(key) ?? []).filter((x) => t - x < this.windowMs);
    if (recent.length >= this.max) { this.hits.set(key, recent); return false; }
    recent.push(t);
    this.hits.set(key, recent);
    if (this.hits.size > 5000) { // never grow without bound
      for (const [k, v] of this.hits) if (!v.some((x) => t - x < this.windowMs)) this.hits.delete(k);
    }
    return true;
  }
}

export function clientIp(req: Request): string {
  return (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
}

/** Reads a small JSON body; refuses anything big. */
export async function readSmallJson(req: Request, maxBytes = 4096): Promise<any | null> {
  const text = await req.text();
  if (text.length > maxBytes) return null;
  try { return JSON.parse(text); } catch { return null; }
}
