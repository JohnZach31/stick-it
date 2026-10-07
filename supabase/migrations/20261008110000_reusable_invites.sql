-- Invitation links no longer run out and are not single-use: anyone who holds the link can join (an invitation tied to an e-mail address only works for that
-- address), over and over, until the board's owner turns the link off (deletes it). Existing links become permanent too.
alter table public.board_invites alter column expires_at drop not null;
alter table public.board_invites alter column expires_at drop default;
alter table public.board_invites add column uses integer not null default 0;
update public.board_invites set expires_at = null;

create or replace function public.create_invite(p_board uuid, p_email text, p_role text default 'editor') returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); tok text; inv_id uuid;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'ANONYMOUS_NOT_ALLOWED' using errcode = '42501'; end if;
  if not public.is_board_owner(p_board) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_role not in ('editor', 'viewer') then raise exception 'BAD_REQUEST' using errcode = '22023'; end if;
  tok := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into public.board_invites (board_id, inviter_id, email, role, token_hash, expires_at)
  values (p_board, uid, nullif(lower(btrim(coalesce(p_email, ''))), ''), p_role,
          encode(sha256(convert_to(tok, 'utf8')), 'hex'), null)
  returning id into inv_id;
  return jsonb_build_object('id', inv_id, 'token', tok, 'expires_at', null);
end $$;

create or replace function public.accept_invite(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); inv public.board_invites; mail text;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  perform public.ensure_profile();
  select * into inv from public.board_invites
   where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'utf8')), 'hex') for update;
  if not found then raise exception 'INVITE_NOT_FOUND' using errcode = 'P0001'; end if;
  if inv.expires_at is not null and inv.expires_at < now() then raise exception 'INVITE_EXPIRED' using errcode = 'P0001'; end if;
  mail := lower(coalesce(auth.jwt() ->> 'email', ''));
  if inv.email is not null and inv.email <> mail then raise exception 'INVITE_EMAIL_MISMATCH' using errcode = 'P0001'; end if;

  insert into public.board_members (board_id, user_id, role) values (inv.board_id, uid, inv.role)
  on conflict (board_id, user_id) do nothing;
  update public.board_invites set accepted_at = now(), accepted_by = uid, uses = uses + 1 where id = inv.id;
  return inv.board_id;
end $$;
