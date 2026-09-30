-- =====================================================================
-- Row Level Security + grants
--
-- Principles
--   * Every table has RLS enabled. Anything without a policy is closed.
--   * `anon` gets NOTHING on tables. Public shares are served by an Edge Function that
--     calls resolve_share() with the service role after validating the token.
--   * Supabase grants ALL to anon/authenticated on new tables by default: we revoke that
--     first and grant back only what is needed, column-by-column where it matters.
--   * Rows are created through RPCs where the server must enforce something
--     (plan limits, invites, shares, asset limits) - those tables have no INSERT policy.
-- =====================================================================

-- ---- lock everything down, then open deliberately -------------------
do $$
declare t text;
begin
  foreach t in array array[
    'plan_limits','media_limits','profiles','boards','board_members','assets','object_assets',
    'board_objects','shares','share_items','share_assets','share_reports','board_invites',
    'comments','reminders','storage_tombstones']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
revoke all on all sequences in schema public from anon, authenticated;

-- ---- reference tables: readable by signed-in users (UI can show limits) ----
grant select on public.plan_limits, public.media_limits to authenticated;
create policy plan_limits_read  on public.plan_limits  for select to authenticated using (true);
create policy media_limits_read on public.media_limits for select to authenticated using (true);

-- ---- profiles -------------------------------------------------------
-- read: yourself, and people you share a board with (name/avatar only are useful; no email lives here)
-- write: display_name / avatar_url only. `plan` can never be changed by a client.
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_board_with(id));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---- boards ---------------------------------------------------------
-- created only through create_board() (plan limit + idempotent migration key)
grant select on public.boards to authenticated;
grant update (name, subtitle, sort_order, cover_mode, cover_asset_id, thumbnail_asset_id, archived_at)
  on public.boards to authenticated;
grant delete on public.boards to authenticated;
create policy boards_select on public.boards for select to authenticated
  using (public.can_read_board(id));
create policy boards_update_owner on public.boards for update to authenticated
  using (public.is_board_owner(id) and locked_at is null) with check (public.is_board_owner(id));
create policy boards_delete_owner on public.boards for delete to authenticated
  using (public.is_board_owner(id));

-- a cover/thumbnail asset must belong to the board (or to the owner): nobody can point their
-- board at somebody else's asset to gain read access to it
create function public.boards_check_assets() returns trigger
language plpgsql security definer set search_path = public as $$
declare a record;
begin
  if new.cover_asset_id is not null and new.cover_asset_id is distinct from old.cover_asset_id then
    select owner_id, board_id into a from public.assets where id = new.cover_asset_id;
    if not found or not (a.owner_id = new.owner_id or a.board_id = new.id) then
      raise exception 'INVALID_ASSET' using errcode = 'insufficient_privilege';
    end if;
  end if;
  if new.thumbnail_asset_id is not null and new.thumbnail_asset_id is distinct from old.thumbnail_asset_id then
    select owner_id, board_id into a from public.assets where id = new.thumbnail_asset_id;
    if not found or not (a.owner_id = new.owner_id or a.board_id = new.id) then
      raise exception 'INVALID_ASSET' using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end $$;
create trigger boards_check_assets before update on public.boards
  for each row execute function public.boards_check_assets();

-- ---- board_members --------------------------------------------------
-- Members are added only by accepting an invite (accept_invite), so nobody can be dropped onto
-- someone else's board unasked. The owner can change roles or remove people; anyone may leave.
grant select on public.board_members to authenticated;
grant update (role) on public.board_members to authenticated;
grant delete on public.board_members to authenticated;
create policy board_members_select on public.board_members for select to authenticated
  using (public.can_read_board(board_id));
create policy board_members_update_owner on public.board_members for update to authenticated
  using (public.is_board_owner(board_id) and role <> 'owner')
  with check (public.is_board_owner(board_id) and role in ('editor','viewer'));
create policy board_members_delete on public.board_members for delete to authenticated
  using (role <> 'owner' and (public.is_board_owner(board_id) or user_id = (select auth.uid())));

-- ---- board_objects --------------------------------------------------
-- read: any member. write: owner/editor of an unlocked board. Deleting is a soft delete (UPDATE);
-- there is no DELETE grant, hard deletion is the purge job's business.
grant select, insert on public.board_objects to authenticated;
grant update (board_id, x, y, width, height, rotation, z_index, data, deleted_at)
  on public.board_objects to authenticated;
create policy board_objects_select on public.board_objects for select to authenticated
  using (public.can_read_board(board_id));
create policy board_objects_insert on public.board_objects for insert to authenticated
  with check (public.can_edit_board(board_id));
create policy board_objects_update on public.board_objects for update to authenticated
  using (public.can_edit_board(board_id)) with check (public.can_edit_board(board_id));

-- ---- assets ---------------------------------------------------------
-- created/finalised only through create_asset()/finalize_asset()
grant select on public.assets to authenticated;
create policy assets_select on public.assets for select to authenticated
  using (public.can_read_asset(id));

-- ---- object_assets --------------------------------------------------
grant select, insert, delete on public.object_assets to authenticated;
create policy object_assets_select on public.object_assets for select to authenticated
  using (exists (select 1 from public.board_objects o
                  where o.id = object_id and public.can_read_board(o.board_id)));
create policy object_assets_insert on public.object_assets for insert to authenticated
  with check (public.can_link_asset(object_id, asset_id));
create policy object_assets_delete on public.object_assets for delete to authenticated
  using (exists (select 1 from public.board_objects o
                  where o.id = object_id and public.can_edit_board(o.board_id)));

-- ---- shares ---------------------------------------------------------
-- creators can list their own links; creating/disabling goes through RPCs.
-- share_items / share_assets / share_reports have RLS on and NO policies: service role only.
grant select on public.shares to authenticated;
create policy shares_select_own on public.shares for select to authenticated
  using (creator_id = (select auth.uid()));

-- ---- invites --------------------------------------------------------
grant select, delete on public.board_invites to authenticated;
create policy board_invites_select on public.board_invites for select to authenticated
  using (public.is_board_owner(board_id));
create policy board_invites_delete on public.board_invites for delete to authenticated
  using (public.is_board_owner(board_id));

-- ---- comments (schema only; no UI yet) --------------------------------
grant select, insert on public.comments to authenticated;
grant update (body, deleted_at) on public.comments to authenticated;
create policy comments_select on public.comments for select to authenticated
  using (public.can_read_board(board_id));
create policy comments_insert on public.comments for insert to authenticated
  with check (author_id = (select auth.uid())
              and public.board_role(board_id) in ('owner','editor')
              and exists (select 1 from public.board_objects o where o.id = object_id and o.board_id = comments.board_id));
create policy comments_update on public.comments for update to authenticated
  using (author_id = (select auth.uid()) or public.is_board_owner(board_id))
  with check (author_id = (select auth.uid()) or public.is_board_owner(board_id));

-- ---- reminders ------------------------------------------------------
grant select, insert, update, delete on public.reminders to authenticated;
create policy reminders_select on public.reminders for select to authenticated
  using (user_id = (select auth.uid()));
create policy reminders_insert on public.reminders for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_read_board(board_id)
              and exists (select 1 from public.board_objects o where o.id = object_id and o.board_id = reminders.board_id));
create policy reminders_update on public.reminders for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy reminders_delete on public.reminders for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---- function privileges ---------------------------------------------
-- Functions are executable by PUBLIC by default. Close that, then open per function
-- (see the functions migration for the RPCs).
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.board_role(uuid), public.can_read_board(uuid), public.can_edit_board(uuid),
  public.is_board_owner(uuid), public.shares_board_with(uuid),
  public.can_read_asset(uuid), public.can_link_asset(uuid, uuid)
  to authenticated;
