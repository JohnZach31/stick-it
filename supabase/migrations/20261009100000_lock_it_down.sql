-- NON-DESTRUCTIVE TO EXISTING ACCESS: this migration never deletes or changes a board_members row, never touches a token or an invitation's validity, and
-- adds nothing that can remove anyone by itself. People already on a board (legacy / "unattributed") stay on it until the OWNER presses Turn off on the
-- invitation that is the only way they hold access AND they were recorded as joining through it after this release. See docs/dev/GUEST-JOIN.md.
-- v0.8.3.4 "Lock it down": turning an invite link off now also removes the access that CAME FROM that link (server-side, not just in the page).
--  * board_members.granted_via_invite marks members who got in through an invitation (owners and anything else stay untouched)
--  * board_invite_uses remembers who joined through which link (and gives each guest a stable friendly name)
--  * revoke_invite(): the owner turns a link off; people who joined ONLY through it lose access at once, people with another valid link keep theirs
--  * deleting an invite row does the same (trigger), so there is no way to turn a link off and leave its guests behind
--  * a removed member's open page is told (a content-free broadcast ping; it re-checks its own membership)
alter table public.board_invites add column if not exists revoked_at timestamptz;
-- invitations that existed before this release did not record who joined through them: mark them legacy ("tracked" = false). New invitations are tracked.
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'board_invites' and column_name = 'tracked') then
    alter table public.board_invites add column tracked boolean;
    update public.board_invites set tracked = false;
    alter table public.board_invites alter column tracked set not null, alter column tracked set default true;
  end if;
end $$;
alter table public.board_members add column if not exists granted_via_invite boolean not null default false;

create table if not exists public.board_invite_uses (
  invite_id     uuid not null references public.board_invites (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  board_id      uuid not null references public.boards (id) on delete cascade,
  alias         text,                       -- friendly guest name ("Leaflet #184"); only for guests who joined without an account
  first_used_at timestamptz not null default now(),
  last_used_at  timestamptz not null default now(),
  primary key (invite_id, user_id)
);
create index if not exists board_invite_uses_board_idx on public.board_invite_uses (board_id, user_id);
alter table public.board_invite_uses enable row level security;      -- no client policy: only the security-definer functions below read or write it
revoke all on public.board_invite_uses from anon, authenticated;

-- People who joined before this release keep granted_via_invite = false ("legacy / unattributed"): the old data cannot say reliably which link let whom in
-- (a reusable link only remembered its last user), so we never guess. Such people are NEVER removed by Turn off. We only RECORD the last known user of each
-- old link so the owner can see them in the list; this changes nothing about their access.
insert into public.board_invite_uses (invite_id, user_id, board_id)
select i.id, i.accepted_by, i.board_id from public.board_invites i
 where i.accepted_by is not null and exists (select 1 from public.board_members m where m.board_id = i.board_id and m.user_id = i.accepted_by)
on conflict do nothing;

create or replace function public.guest_alias() returns text language sql volatile as $$
  select (array['Leaflet','Sticky','Paperclip','Scrap','Postcard','Clip','Tack','Pinboard','Bookmark','Ticket'])[1 + floor(random() * 10)::int]
         || ' #' || (1 + floor(random() * 998))::int
$$;

-- remove the members whose ONLY way in was this invitation
create or replace function public.remove_invite_members(p_invite uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare inv public.board_invites; n integer;
begin
  select * into inv from public.board_invites where id = p_invite;
  if not found then return 0; end if;
  delete from public.board_members m
   where m.board_id = inv.board_id and m.granted_via_invite and m.role <> 'owner'
     and exists (select 1 from public.board_invite_uses u where u.invite_id = p_invite and u.user_id = m.user_id)
     and not exists (select 1 from public.board_invite_uses u2 join public.board_invites i2 on i2.id = u2.invite_id
                      where u2.user_id = m.user_id and u2.board_id = inv.board_id and u2.invite_id <> p_invite and i2.revoked_at is null);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.remove_invite_members(uuid) from public, anon, authenticated;

create or replace function public.board_invites_before_delete() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.remove_invite_members(old.id); return old; end $$;
drop trigger if exists board_invites_revoke_on_delete on public.board_invites;
create trigger board_invites_revoke_on_delete before delete on public.board_invites for each row execute function public.board_invites_before_delete();

create or replace function public.revoke_invite(p_invite uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); inv public.board_invites; n integer;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  select * into inv from public.board_invites where id = p_invite for update;
  if not found then raise exception 'INVITE_NOT_FOUND' using errcode = 'P0001'; end if;
  if not public.is_board_owner(inv.board_id) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  update public.board_invites set revoked_at = coalesce(revoked_at, now()) where id = p_invite;
  n := public.remove_invite_members(p_invite);
  return jsonb_build_object('id', p_invite, 'removed', n);
end $$;
grant execute on function public.revoke_invite(uuid) to authenticated;

-- tell open pages that somebody's access changed (no names, no ids in the message: the page re-checks its own membership). Quietly does nothing where Realtime is not installed.
create or replace function public.board_members_notify() returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    if to_regprocedure('realtime.send(jsonb,text,text,boolean)') is not null then
      execute 'select realtime.send($1, $2, $3, true)' using '{}'::jsonb, 'access_changed', 'board:' || old.board_id::text;
    end if;
  exception when others then null;
  end;
  return old;
end $$;
drop trigger if exists board_members_notify_delete on public.board_members;
create trigger board_members_notify_delete after delete on public.board_members for each row execute function public.board_members_notify();

create or replace function public.accept_invite(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); inv public.board_invites; mail text; anon boolean; added integer; al text;
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
  -- remember the link they used (only people who got their access from an invitation, never an owner or an earlier member)
  -- (a member who was already on the board before this release is recorded as having used the link, but NOT marked as invitation-granted: their access stays theirs)
  if added > 0 or exists (select 1 from public.board_members m where m.board_id = inv.board_id and m.user_id = uid and m.role <> 'owner') then
    -- a guest keeps one name for the board, whichever link they come back through
    select u.alias into al from public.board_invite_uses u where u.board_id = inv.board_id and u.user_id = uid and u.alias is not null limit 1;
    if al is null and anon then al := public.guest_alias(); end if;
    insert into public.board_invite_uses (invite_id, user_id, board_id, alias) values (inv.id, uid, inv.board_id, al)
    on conflict (invite_id, user_id) do update set last_used_at = now();
  end if;
  update public.board_invites set accepted_at = now(), accepted_by = uid, uses = uses + 1 where id = inv.id;
  return inv.board_id;
end $$;

-- what the owner sees under "Links you made": each link, whether it is on, and who came in through it
create or replace function public.list_invites(p_board uuid) returns jsonb
language plpgsql security definer stable set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  if not public.is_board_owner(p_board) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(r order by (r ->> 'created_at') desc) from (
    select jsonb_build_object(
      'id', i.id, 'board_id', i.board_id, 'email', i.email, 'role', i.role, 'uses', i.uses, 'created_at', i.created_at, 'revoked_at', i.revoked_at, 'tracked', i.tracked,
      'people', coalesce((select jsonb_agg(jsonb_build_object(
          'name', coalesce(u.alias, p.display_name, 'Member'), 'guest', u.alias is not null,
          'legacy', not exists (select 1 from public.board_members m2 where m2.board_id = u.board_id and m2.user_id = u.user_id and m2.granted_via_invite),
          'active', exists (select 1 from public.board_members m where m.board_id = u.board_id and m.user_id = u.user_id)) order by u.first_used_at)
        from public.board_invite_uses u left join public.profiles p on p.id = u.user_id where u.invite_id = i.id), '[]'::jsonb)) as r
    from public.board_invites i where i.board_id = p_board) s), '[]'::jsonb);
end $$;
grant execute on function public.list_invites(uuid) to authenticated;

-- (Realtime needs no change here: board_objects, boards, board_members and comments were already added to the supabase_realtime publication by 20260930120400_realtime.sql.)

-- a guest asks what they are called on this board (their generated friendly name), so presence and the owner's list agree
create or replace function public.my_guest_alias(p_board uuid) returns text
language sql security definer stable set search_path = public as $$
  select u.alias from public.board_invite_uses u
   where u.board_id = p_board and u.user_id = auth.uid() and u.alias is not null
   order by u.first_used_at limit 1
$$;
grant execute on function public.my_guest_alias(uuid) to authenticated;
