-- Collaboration: who is here, and object-attached review.
--
-- 1. Realtime Authorization. Presence (who is on the board, which note someone is editing) runs on a PRIVATE realtime channel named
--    board:<board id>. Without a policy any signed-in project user could join any channel; these policies let only members of that
--    board send or receive on it. (A Supabase project already has the realtime.messages table; the guard keeps this file harmless
--    anywhere it does not exist.)
-- 2. object_reviews: the lightweight review state of one object. none (no row) -> changes_requested -> ready_for_review -> none.
--    Written only through set_review_state(), which knows who is allowed to do which step. Nothing else (no priority, assignee, due date).
-- The migration role of a hosted project does not own realtime.messages, so creating the policies here can fail with
-- "must be owner of table messages". When that happens this step is skipped with a notice and the same policies are applied once,
-- from the dashboard SQL editor, using supabase/ops/realtime-policies.sql (see docs/legal/OWNER-ACTION-REQUIRED.md, section F).
do $$
begin
  if to_regclass('realtime.messages') is not null then
    begin
      execute 'alter table realtime.messages enable row level security';
      execute $p$create policy board_channel_read on realtime.messages for select to authenticated
        using (case when realtime.topic() ~ '^board:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                    then public.can_read_board(substr(realtime.topic(), 7)::uuid) else false end)$p$;
      execute $p$create policy board_channel_write on realtime.messages for insert to authenticated
        with check (case when realtime.topic() ~ '^board:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                    then public.can_read_board(substr(realtime.topic(), 7)::uuid) else false end)$p$;
    exception when insufficient_privilege then
      raise notice 'realtime.messages policies not created (not the table owner): run supabase/ops/realtime-policies.sql in the SQL editor';
    end;
  end if;
end $$;

create table public.object_reviews (
  object_id  uuid primary key references public.board_objects (id) on delete cascade,
  board_id   uuid not null references public.boards (id) on delete cascade,
  state      text not null check (state in ('changes_requested', 'ready_for_review')),
  reason     text check (reason is null or char_length(reason) <= 300),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index object_reviews_board_idx on public.object_reviews (board_id);
alter table public.object_reviews enable row level security;
revoke all on public.object_reviews from anon, authenticated;
grant select on public.object_reviews to authenticated;
create policy object_reviews_select on public.object_reviews for select to authenticated
  using (public.can_read_board(board_id));

create function public.set_review_state(p_object uuid, p_state text, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid  uuid := auth.uid();
  o    public.board_objects;
  role text;
  cur  text;
  why  text := nullif(btrim(left(coalesce(p_reason, ''), 300)), '');
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  if p_state is null or p_state not in ('none', 'changes_requested', 'ready_for_review') then
    raise exception 'BAD_REQUEST' using errcode = '22023';
  end if;
  select * into o from public.board_objects where id = p_object and deleted_at is null;
  if not found then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  role := public.board_role(o.board_id);
  if role is null then raise exception 'FORBIDDEN' using errcode = '42501'; end if;        -- not a member: indistinguishable from "no such object"
  select state into cur from public.object_reviews where object_id = p_object;

  if p_state = 'ready_for_review' then
    if role not in ('owner', 'editor') or not public.can_edit_board(o.board_id) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  else                                                                                       -- requesting changes and resolving belong to the owner
    if role <> 'owner' then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  end if;

  if p_state = 'none' then
    delete from public.object_reviews where object_id = p_object;
    return jsonb_build_object('state', 'none');
  end if;
  insert into public.object_reviews (object_id, board_id, state, reason, updated_by, updated_at)
  values (p_object, o.board_id, p_state, case when p_state = 'changes_requested' then why else null end, uid, now())
  on conflict (object_id) do update
     set state = excluded.state, reason = excluded.reason, updated_by = excluded.updated_by, updated_at = excluded.updated_at;
  return jsonb_build_object('state', p_state, 'reason', case when p_state = 'changes_requested' then why else null end);
end $$;
revoke all on function public.set_review_state(uuid, text, text) from public, anon;
grant execute on function public.set_review_state(uuid, text, text) to authenticated;

-- one request for the small badges on a board: how many comments each object has, and every review state
create function public.board_collab_summary(p_board uuid) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object(
    'comments', coalesce((select jsonb_agg(jsonb_build_object('object_id', c.object_id, 'count', c.n, 'last_at', c.last_at))
                            from (select object_id, count(*)::int n, max(created_at) last_at
                                    from public.comments where board_id = p_board and deleted_at is null group by object_id) c), '[]'::jsonb),
    'reviews', coalesce((select jsonb_agg(jsonb_build_object('object_id', r.object_id, 'state', r.state, 'reason', r.reason, 'updated_at', r.updated_at))
                           from public.object_reviews r where r.board_id = p_board), '[]'::jsonb))
$$;
revoke all on function public.board_collab_summary(uuid) from public, anon;
grant execute on function public.board_collab_summary(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.object_reviews; exception when duplicate_object then null; end;
  end if;
end $$;
