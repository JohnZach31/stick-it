// Deploy:  supabase functions deploy report-copyright --no-verify-jwt
//          supabase secrets set COPYRIGHT_INTAKE_ENABLED=true     (only when the agent details are real and someone reads the reports)
import { createClient } from "npm:@supabase/supabase-js@2";
import { RateLimiter } from "../_shared/http.ts";
import { makeCopyrightHandler } from "./handler.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://johnzach31.github.io,http://127.0.0.1:8123,http://localhost:8123")
  .split(",").map((s) => s.trim()).filter(Boolean);

Deno.serve(makeCopyrightHandler({
  enabled: Deno.env.get("COPYRIGHT_INTAKE_ENABLED") === "true",
  allowedOrigins,
  limiter: new RateLimiter(3, 3_600_000),
  async insert(row) { const { error } = await admin.from("copyright_reports").insert(row); return !error; },
}));
