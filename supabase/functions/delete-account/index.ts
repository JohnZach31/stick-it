// Deploy:  supabase functions deploy delete-account --no-verify-jwt
// (the gateway check is off because the handler verifies the caller's token itself with auth.getUser)
import { createClient } from "npm:@supabase/supabase-js@2";
import { RateLimiter } from "../_shared/http.ts";
import { makeDeleteHandler } from "./handler.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://johnzach31.github.io,http://127.0.0.1:8123,http://localhost:8123")
  .split(",").map((s) => s.trim()).filter(Boolean);

Deno.serve(makeDeleteHandler({
  allowedOrigins,
  limiter: new RateLimiter(5, 60_000),
  async userFromToken(jwt) {
    const { data, error } = await admin.auth.getUser(jwt);
    return error || !data?.user ? null : data.user.id;
  },
  async listAssetPaths(uid) {
    const { data, error } = await admin.from("assets").select("storage_path").eq("owner_id", uid);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.storage_path);
  },
  async purge(uid) { const { error } = await admin.rpc("purge_user_data", { p_user: uid }); if (error) throw error; },
  async deleteAuthUser(uid) { const { error } = await admin.auth.admin.deleteUser(uid); if (error) throw error; },
  async removeFiles(paths) { const { error } = await admin.storage.from("media").remove(paths); if (error) throw error; },
}));
