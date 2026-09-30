-- =====================================================================
-- Realtime
--
-- Realtime "postgres_changes" respects RLS: a subscriber only receives rows it could SELECT.
-- Deletes are soft (UPDATE with deleted_at), so subscribers get the full row and can filter on
-- board_id; plain DELETE events carry only the primary key and can't be filtered.
-- =====================================================================
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['board_objects', 'boards', 'board_members', 'comments'] loop
      begin
        execute format('alter publication supabase_realtime add table public.%I', t);
      exception when duplicate_object then null;   -- already published
      end;
    end loop;
  end if;
end $$;
