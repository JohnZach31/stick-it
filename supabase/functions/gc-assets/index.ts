// Deploy:  supabase functions deploy gc-assets --no-verify-jwt
// Secret:  supabase secrets set GC_SECRET=<long random string>     (never put this in git)
// Schedule (Dashboard -> Integrations -> Cron, or pg_cron + pg_net): POST daily with header x-cron-secret.
import { createClient } from "npm:@supabase/supabase-js@2";
import { makeGcHandler } from "./handler.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

Deno.serve(makeGcHandler({
  secret: Deno.env.get("GC_SECRET") ?? "",
  async purgeObjects() { const { data, error } = await admin.rpc("gc_purge_deleted_objects"); if (error) throw error; return data as number; },
  async claimAssets() { const { data, error } = await admin.rpc("gc_claim_orphan_assets"); if (error) throw error; return data ?? []; },
  async tombstones(limit) { const { data, error } = await admin.from("storage_tombstones").select("storage_path").limit(limit); if (error) throw error; return (data ?? []).map((r) => r.storage_path); },
  async removeFiles(paths) { const { error } = await admin.storage.from("media").remove(paths); if (error) throw error; },
  async clearTombstones(paths) { const { error } = await admin.from("storage_tombstones").delete().in("storage_path", paths); if (error) throw error; },
  async finishAssets(ids) { const { data, error } = await admin.rpc("gc_finish_assets", { p_ids: ids }); if (error) throw error; return data as number; },
}));
