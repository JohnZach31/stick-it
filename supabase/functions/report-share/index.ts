// Deploy:  supabase functions deploy report-share --no-verify-jwt
import { createClient } from "npm:@supabase/supabase-js@2";
import { RateLimiter } from "../_shared/http.ts";
import { makeReportHandler } from "./handler.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://johnzach31.github.io,http://127.0.0.1:8123,http://localhost:8123")
  .split(",").map((s) => s.trim()).filter(Boolean);

async function sha256Hex(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(makeReportHandler({
  allowedOrigins,
  limiter: new RateLimiter(5, 60_000),
  async report(token, reason) {
    const { data } = await admin.from("shares").select("id").eq("token_hash", await sha256Hex(token)).maybeSingle();
    if (!data) return false;
    const { error } = await admin.from("share_reports").insert({ share_id: data.id, reason });
    return !error;
  },
}));
