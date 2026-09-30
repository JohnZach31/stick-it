// Deploy:  supabase functions deploy resolve-share --no-verify-jwt
// Runs with the service role that Supabase injects (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY):
// no secret ever lives in the frontend or in git.
import { createClient } from "npm:@supabase/supabase-js@2";
import { RateLimiter } from "../_shared/http.ts";
import { makeResolveHandler } from "./handler.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://johnzach31.github.io,http://127.0.0.1:8123,http://localhost:8123")
  .split(",").map((s) => s.trim()).filter(Boolean);

Deno.serve(makeResolveHandler({
  allowedOrigins,
  limiter: new RateLimiter(60, 60_000),
  async resolve(token) {
    const { data, error } = await admin.rpc("resolve_share", { p_token: token });
    if (error) throw error;
    return data;
  },
  async sign(paths, expiresIn) {
    const { data, error } = await admin.storage.from("media").createSignedUrls(paths, expiresIn);
    if (error) throw error;
    const out: Record<string, string> = {};
    for (const row of data ?? []) if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
    return out;
  },
}));
