-- OWNER-RUN, NOT APPLIED AUTOMATICALLY. Nothing in this repository schedules the cleanup job: until you run this (or create an
-- equivalent schedule in the Supabase dashboard) the garbage collector does NOT run and nothing is cleaned up on its own.
--
-- What the job does (supabase/functions/gc-assets):
--   * removes orphaned media files and their rows
--   * removes abandoned sign-ups: accounts that never completed the age step, own no boards/media, and are older than 7 days
-- Under-13 accounts that DID complete the age step are never touched by this job.
--
-- Prerequisites (do these by hand; never commit the values):
--   1. supabase functions deploy gc-assets --no-verify-jwt
--   2. supabase secrets set GC_SECRET=<long random string>
--   3. Enable the pg_cron and pg_net extensions (Dashboard -> Database -> Extensions)
--   4. Store the same secret and your project URL in Vault (SQL editor):
--        select vault.create_secret('<the GC_SECRET value>', 'gc_secret');
--        select vault.create_secret('https://<your-project-ref>.supabase.co', 'project_url');
--
-- Then run:
select cron.schedule(
  'stickit-gc-daily',
  '17 3 * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/gc-assets',
    headers := jsonb_build_object('x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'gc_secret'))
  );
  $$
);

-- To stop it:  select cron.unschedule('stickit-gc-daily');
