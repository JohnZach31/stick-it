-- v0.8.3.4 (identity + history pass). Forward-only: 20261009100000 and 20261009110000 are already applied and are not edited.
-- Like them, this never deletes or changes a membership.
--  * a guest can choose a display name (set_guest_name); owners see it everywhere, next to the guest's generated name
--  * a guest who joins again from the same browser asks to keep their generated name (accept_invite's optional p_alias): it is kept only if nobody else on that board has it
--  * "Delete from history" on a turned-off link now HIDES it (archived_at); the record, and the names of the people who used it, stay in the database as the board's access log
--  * people lists never fall back to a bare "Member": signed-in accounts show their profile name; guests their name; anyone else is "Unknown member"

alter table public.board_invites add column if not exists archived_at timestamptz;

-- a guest's chosen name (accounts keep using their profile settings; this is only for anonymous sessions)
create or replace function public.set_guest_name(p_name text) returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); nm text := nullif(btrim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]', '', 'g')), '');
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  if not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  perform public.ensure_profile();
  if nm is null then
    update public.profiles set display_name = null, display_name_custom = false where id = uid;     -- back to the generated name
    return null;
  end if;
  nm := left(nm, 40);
  update public.profiles set display_name = nm, display_name_custom = true where id = uid;
  return nm;
end $$;
grant execute on function public.set_guest_name(text) to authenticated;

-- accept_invite keeps working for every existing caller (p_alias is optional)
drop function if exists public.accept_invite(text);
create or replace function public.accept_invite(p_token text, p_alias text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); inv public.board_invites; mail text; anon boolean; added integer; al text; want text := nullif(btrim(coalesce(p_alias, '')), '');
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  perform public.ensure_profile();
  select * into inv from public.board_invites
   where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'utf8')), 'hex') for update;
  if not found then raise exception 'INVITE_NOT_FOUND' using errcode = 'P0001'; end if;
  if inv.revoked_at is not null then raise exception 'INVITE_REVOKED' using errcode = 'P0001'; end if;
  if inv.expires_at is not null and inv.expires_at < now() then raise exception 'INVITE_EXPIRED' using errcode = 'P0001'; end if;
  mail := lower(coalesce(auth.jwt() ->> 'email', ''));
  if inv.email is not null and inv.email <> mail then raise exception 'INVITE_EMAIL_MISMATCH' using errcode = 'P0001'; end if;
  anon := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);

  insert into public.board_members (board_id, user_id, role, granted_via_invite) values (inv.board_id, uid, inv.role, true)
  on conflict (board_id, user_id) do nothing;
  get diagnostics added = row_count;
  if added > 0 or exists (select 1 from public.board_members m where m.board_id = inv.board_id and m.user_id = uid and m.role <> 'owner') then
    select u.alias into al from public.board_invite_uses u where u.board_id = inv.board_id and u.user_id = uid and u.alias is not null limit 1;
    if al is null and anon then
      -- a returning guest may ask for the generated name they already had in this browser; it is granted only in the usual shape and only if nobody else on this board has it
      if want ~ '^[A-Z][a-z]{2,11} #[0-9]{1,4}$' and not exists (select 1 from public.board_invite_uses x where x.board_id = inv.board_id and x.alias = want and x.user_id <> uid) then al := want;
      else al := public.guest_alias(); end if;
    end if;
    insert into public.board_invite_uses (invite_id, user_id, board_id, alias) values (inv.id, uid, inv.board_id, al)
    on conflict (invite_id, user_id) do update set last_used_at = now();
  end if;
  update public.board_invites set accepted_at = now(), accepted_by = uid, uses = uses + 1 where id = inv.id;
  return inv.board_id;
end $$;
grant execute on function public.accept_invite(text, text) to authenticated;

-- one way to name a person in these lists
create or replace function public.person_label(p_alias text, p_display text, p_custom boolean, p_role text) returns text
language sql immutable as $$
  select case
    when p_alias is not null and p_custom and p_display is not null then p_display        -- a guest who chose a name
    when p_alias is not null then p_alias                                                  -- a guest with the generated name
    when p_display is not null then p_display                                              -- a signed-in account: its profile name
    when p_role = 'owner' then 'Owner'
    else 'Unknown member' end
$$;

create or replace function public.list_invites(p_board uuid) returns jsonb
language plpgsql security definer stable set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  if not public.is_board_owner(p_board) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(r order by (r ->> 'created_at') desc) from (
    select jsonb_build_object(
      'id', i.id, 'board_id', i.board_id, 'email', i.email, 'role', i.role, 'uses', i.uses, 'created_at', i.created_at, 'revoked_at', i.revoked_at, 'tracked', i.tracked,
      'people', coalesce((select jsonb_agg(jsonb_build_object(
          'name', public.person_label(u.alias, p.display_name, p.display_name_custom, null), 'alias', u.alias, 'guest', u.alias is not null, 'joined_at', u.first_used_at,
          'legacy', not exists (select 1 from public.board_members m2 where m2.board_id = u.board_id and m2.user_id = u.user_id and m2.granted_via_invite),
          'active', exists (select 1 from public.board_members m where m.board_id = u.board_id and m.user_id = u.user_id)) order by u.first_used_at)
        from public.board_invite_uses u left join public.profiles p on p.id = u.user_id where u.invite_id = i.id), '[]'::jsonb)) as r
    from public.board_invites i where i.board_id = p_board and i.archived_at is null) s), '[]'::jsonb);
end $$;
grant execute on function public.list_invites(uuid) to authenticated;

create or replace function public.list_board_access(p_board uuid) returns jsonb
language plpgsql security definer stable set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  if not public.is_board_owner(p_board) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(x order by x ->> 'joined_at') from (
    select jsonb_build_object(
      'user_id', m.user_id, 'role', m.role, 'joined_at', m.created_at,
      'source', case when m.role = 'owner' then 'owner' when m.granted_via_invite then 'invite' else 'legacy' end,
      'guest', al.alias is not null, 'alias', al.alias,
      'name', public.person_label(al.alias, p.display_name, p.display_name_custom, m.role)) as x
    from public.board_members m
    left join public.profiles p on p.id = m.user_id
    left join lateral (select u.alias from public.board_invite_uses u where u.board_id = m.board_id and u.user_id = m.user_id and u.alias is not null order by u.first_used_at limit 1) al on true
    where m.board_id = p_board) s), '[]'::jsonb);
end $$;
grant execute on function public.list_board_access(uuid) to authenticated;

-- "Delete from history" hides a TURNED-OFF link from the owner's list. The row and the names of the people who used it stay (the board's access log);
-- no membership is touched, and a hidden link cannot be used (it is already off).
create or replace function public.delete_invite_history(p_invite uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare inv public.board_invites;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  select * into inv from public.board_invites where id = p_invite for update;
  if not found then raise exception 'INVITE_NOT_FOUND' using errcode = 'P0001'; end if;
  if not public.is_board_owner(inv.board_id) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if inv.revoked_at is null then raise exception 'BAD_REQUEST' using errcode = '22023'; end if;     -- turn it off first
  update public.board_invites set archived_at = coalesce(archived_at, now()) where id = p_invite;
  return true;
end $$;
grant execute on function public.delete_invite_history(uuid) to authenticated;
