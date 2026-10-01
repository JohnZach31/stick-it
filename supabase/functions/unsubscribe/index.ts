// Deploy:  supabase functions deploy unsubscribe --no-verify-jwt
//          supabase secrets set UNSUBSCRIBE_SECRET=<long random string>
import { createClient } from "npm:@supabase/supabase-js@2";
import { RateLimiter } from "../_shared/http.ts";
import { makeUnsubscribeHandler } from "./handler.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://johnzach31.github.io,http://127.0.0.1:8123,http://localhost:8123")
  .split(",").map((s) => s.trim()).filter(Boolean);

Deno.serve(makeUnsubscribeHandler({
  secret: Deno.env.get("UNSUBSCRIBE_SECRET") ?? "",
  allowedOrigins,
  limiter: new RateLimiter(20, 60_000),
  async unsubscribe(userId) { const { error } = await admin.rpc("marketing_unsubscribe", { p_user: userId }); if (error) throw error; },
}));
