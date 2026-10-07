-- v0.8.3.4 (collaboration management pass). Builds on 20261009100000_lock_it_down.sql. Like it, this migration never deletes or changes a membership.
--  * turned-off invitations stay in the owner's history; "Delete from history" removes only the record (never access: members of a turned-off link were already dealt with when it was turned off)
--  * every anonymous guest has a stable friendly name, including guests who joined before names existed
--  * list_invites also says when each person joined; list_board_access() answers "who has access right now" (owner only, no e-mail addresses)
--  * my_active_invite_count() lets Settings count collaboration invitations next to public share links

-- A turned-off invitation never removes anyone again (neither by being turned off twice nor by being deleted from history).
create or replace function public.remove_invite_members(p_invite uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare inv public.board_invites; n integer;
begin
  select * into inv from public.board_invites where id = p_invite;
  if not found then return 0; end if;
  if inv.revoked_at is not null then return 0; end if;
  delete from public.board_members m
   where m.board_id = inv.board_id and m.granted_via_invite and m.role <> 'owner'
     and exists (select 1 from public.board_invite_uses u where u.invite_id = p_invite and u.user_id = m.user_id)
     and not exists (select 1 from public.board_invite_uses u2 join public.board_invites i2 on i2.id = u2.invite_id
                      where u2.user_id = m.user_id and u2.board_id = inv.board_id and u2.invite_id <> p_invite and i2.revoked_at is null);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.remove_invite_members(uuid) from public, anon, authenticated;

create or replace function public.revoke_invite(p_invite uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); inv public.board_invites; n integer := 0;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  select * into inv from public.board_invites where id = p_invite for update;
  if not found then raise exception 'INVITE_NOT_FOUND' using errcode = 'P0001'; end if;
  if not public.is_board_owner(inv.board_id) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if inv.revoked_at is null then
    n := public.remove_invite_members(p_invite);                 -- first (it ignores turned-off links), then mark the link as off
    update public.board_invites set revoked_at = now() where id = p_invite;
  end if;
  return jsonb_build_object('id', p_invite, 'removed', n);
end $$;
grant execute on function public.revoke_invite(uuid) to authenticated;

-- guests who joined before friendly names existed get one (only the name record changes; nobody's access does)
do $$
declare r record; a text;
begin
  for r in select distinct u.board_id, u.user_id from public.board_invite_uses u join auth.users au on au.id = u.user_id
            where u.alias is null and coalesce(au.is_anonymous, false) loop
    a := coalesce((select u2.alias from public.board_invite_uses u2 where u2.board_id = r.board_id and u2.user_id = r.user_id and u2.alias is not null limit 1), public.guest_alias());
    update public.board_invite_uses set alias = a where board_id = r.board_id and user_id = r.user_id and alias is null;
  end loop;
exception when undefined_column then null;     -- an auth.users without is_anonymous (old local stand-ins): nothing to do
end $$;

-- the owner's list of links, with who came in through each (names only: a guest's friendly name, or an account's display name; never an e-mail address)
create or replace function public.list_invites(p_board uuid) returns jsonb
language plpgsql security definer stable set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  if not public.is_board_owner(p_board) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(r order by (r ->> 'created_at') desc) from (
    select jsonb_build_object(
      'id', i.id, 'board_id', i.board_id, 'email', i.email, 'role', i.role, 'uses', i.uses, 'created_at', i.created_at, 'revoked_at', i.revoked_at, 'tracked', i.tracked,
      'people', coalesce((select jsonb_agg(jsonb_build_object(
          'name', coalesce(u.alias, p.display_name, 'Stick-It member'), 'guest', u.alias is not null, 'joined_at', u.first_used_at,
          'legacy', not exists (select 1 from public.board_members m2 where m2.board_id = u.board_id and m2.user_id = u.user_id and m2.granted_via_invite),
          'active', exists (select 1 from public.board_members m where m.board_id = u.board_id and m.user_id = u.user_id)) order by u.first_used_at)
        from public.board_invite_uses u left join public.profiles p on p.id = u.user_id where u.invite_id = i.id), '[]'::jsonb)) as r
    from public.board_invites i where i.board_id = p_board) s), '[]'::jsonb);
end $$;
grant execute on function public.list_invites(uuid) to authenticated;

-- who has access to the board right now (authorization, not presence). Owner only. user_id lets the page match this list to who is online.
create or replace function public.list_board_access(p_board uuid) returns jsonb
language plpgsql security definer stable set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  if not public.is_board_owner(p_board) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(x order by x ->> 'joined_at') from (
    select jsonb_build_object(
      'user_id', m.user_id, 'role', m.role, 'joined_at', m.created_at,
      'source', case when m.role = 'owner' then 'owner' when m.granted_via_invite then 'invite' else 'legacy' end,
      'guest', exists (select 1 from public.board_invite_uses u where u.board_id = m.board_id and u.user_id = m.user_id and u.alias is not null),
      'name', coalesce((select u.alias from public.board_invite_uses u where u.board_id = m.board_id and u.user_id = m.user_id and u.alias is not null order by u.first_used_at limit 1), p.display_name, 'Stick-It member')) as x
    from public.board_members m left join public.profiles p on p.id = m.user_id where m.board_id = p_board) s), '[]'::jsonb);
end $$;
grant execute on function public.list_board_access(uuid) to authenticated;

-- "Delete from history": removes the owner-facing record of a turned-off link. Only a link that is already off can be deleted this way, and it never touches a membership.
create or replace function public.delete_invite_history(p_invite uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare inv public.board_invites;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  select * into inv from public.board_invites where id = p_invite for update;
  if not found then raise exception 'INVITE_NOT_FOUND' using errcode = 'P0001'; end if;
  if not public.is_board_owner(inv.board_id) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if inv.revoked_at is null then raise exception 'BAD_REQUEST' using errcode = '22023'; end if;     -- turn it off first
  delete from public.board_invites where id = p_invite;                                            -- remove_invite_members() does nothing for a turned-off link
  return true;
end $$;
grant execute on function public.delete_invite_history(uuid) to authenticated;

-- how many collaboration invitations are on across the boards I own
create or replace function public.my_active_invite_count() returns integer
language sql security definer stable set search_path = public as $$
  select count(*)::int from public.board_invites i where i.revoked_at is null and public.is_board_owner(i.board_id)
$$;
grant execute on function public.my_active_invite_count() to authenticated;
