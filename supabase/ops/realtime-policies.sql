-- Run ONCE in the Supabase dashboard SQL editor (role: postgres) if `supabase db push` printed
-- "realtime.messages policies not created". Safe to re-run. Lets only members of a board join/send on its private channel board:<id>.
drop policy if exists board_channel_read on realtime.messages;
drop policy if exists board_channel_write on realtime.messages;
create policy board_channel_read on realtime.messages for select to authenticated
  using (case when realtime.topic() ~ '^board:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then public.can_read_board(substr(realtime.topic(), 7)::uuid) else false end);
create policy board_channel_write on realtime.messages for insert to authenticated
  with check (case when realtime.topic() ~ '^board:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then public.can_read_board(substr(realtime.topic(), 7)::uuid) else false end);
