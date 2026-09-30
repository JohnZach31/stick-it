-- Username availability check for the Account settings form ("available / already taken" while typing).
-- The unique index on profile_settings.handle stays the only authority: this just answers early.
-- It reveals nothing but a yes/no for one handle the caller typed (handles are meant to be public), and
-- treats the caller's own current handle as available.
create function public.handle_available(p_handle text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  h   text := lower(btrim(coalesce(p_handle, '')));
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  if h !~ '^[a-z0-9_]{3,20}$' then return false; end if;
  return not exists (select 1 from public.profile_settings s where s.handle = h and s.user_id <> uid);
end $$;

revoke execute on function public.handle_available(text) from public, anon, authenticated;
grant execute on function public.handle_available(text) to authenticated;
