-- Owner allowlist: these accounts always carry the premium plan (limits, storage and cosmetics all read profiles.plan).
-- Matching is by VERIFIED e-mail on auth.users (Google sign-in verifies it), never by anything the browser sends, and case-insensitive.
-- The user id stays the real identity everywhere; the e-mail only decides the plan. An unverified sign-up with this address gets nothing.
-- The plan is re-asserted on every profile write, so a downgrade by mistake (or the service role) cannot stick for these accounts.
create table public.premium_allowlist (email text primary key check (email = lower(email)));
insert into public.premium_allowlist (email) values ('johnzachws@gmail.com');
alter table public.premium_allowlist enable row level security;      -- no policies: unreadable by clients
revoke all on public.premium_allowlist from anon, authenticated;

create function public.is_allowlisted(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from auth.users u join public.premium_allowlist a on a.email = lower(u.email)
                 where u.id = p_user and u.email_confirmed_at is not null)
$$;
revoke all on function public.is_allowlisted(uuid) from public, anon, authenticated;

create function public.profiles_owner_premium() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_allowlisted(new.id) then new.plan := 'premium'; end if;
  return new;
end $$;
create trigger profiles_owner_premium before insert or update on public.profiles
  for each row execute function public.profiles_owner_premium();
revoke all on function public.profiles_owner_premium() from public, anon, authenticated;

-- an account whose e-mail is confirmed (or changed) after the profile exists
create function public.auth_owner_premium() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_allowlisted(new.id) then update public.profiles set plan = 'premium' where id = new.id and plan <> 'premium'; end if;
  return new;
end $$;
create trigger on_auth_user_owner_premium after insert or update of email, email_confirmed_at on auth.users
  for each row execute function public.auth_owner_premium();
revoke all on function public.auth_owner_premium() from public, anon, authenticated;

-- existing account(s)
update public.profiles p set plan = 'premium' where p.plan <> 'premium' and public.is_allowlisted(p.id);
