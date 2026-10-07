-- Anonymous guests (Supabase "Allow anonymous sign-ins"): someone who opens an invite link can join the board without an account.
-- Supabase gives an anonymous user the ordinary `authenticated` role, so every existing policy treats them like any member: they can join a board
-- ONLY through accept_invite, and then work on it with the role on the invitation (editor / viewer). What an anonymous user must NOT be able to do is
-- create things that belong to nobody: boards, share links, invitations, or uploaded media (storage and abuse are tied to a real account).
-- The JWT carries `is_anonymous: true` for them.

create function public.deny_anonymous() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'ANONYMOUS_NOT_ALLOWED' using errcode = '42501', hint = 'Sign in with an account to do this.';
  end if;
  return new;
end $$;
revoke all on function public.deny_anonymous() from public, anon, authenticated;

create trigger boards_no_anonymous        before insert on public.boards        for each row execute function public.deny_anonymous();
create trigger shares_no_anonymous        before insert on public.shares        for each row execute function public.deny_anonymous();
create trigger board_invites_no_anonymous before insert on public.board_invites for each row execute function public.deny_anonymous();
create trigger assets_no_anonymous        before insert on public.assets        for each row execute function public.deny_anonymous();
