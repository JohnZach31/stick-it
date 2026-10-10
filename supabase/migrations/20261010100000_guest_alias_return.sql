-- v0.8.3.4 reality fix: a guest who comes back (same browser, new session) can have their generated name back, even though the old session's record of it is still in the
-- board's access history. The name is refused only while ANOTHER person who is on the board right now has it. Forward-only; touches no membership.
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
      if want ~ '^[A-Z][a-z]{2,11} #[0-9]{1,4}$'
         and not exists (select 1 from public.board_invite_uses x join public.board_members m on m.board_id = x.board_id and m.user_id = x.user_id
                          where x.board_id = inv.board_id and x.alias = want and x.user_id <> uid) then al := want;
      else al := public.guest_alias(); end if;
    end if;
    insert into public.board_invite_uses (invite_id, user_id, board_id, alias) values (inv.id, uid, inv.board_id, al)
    on conflict (invite_id, user_id) do update set last_used_at = now();
  end if;
  update public.board_invites set accepted_at = now(), accepted_by = uid, uses = uses + 1 where id = inv.id;
  return inv.board_id;
end $$;
grant execute on function public.accept_invite(text, text) to authenticated;
