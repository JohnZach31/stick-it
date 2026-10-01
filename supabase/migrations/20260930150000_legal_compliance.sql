-- =====================================================================
-- Legal / privacy hardening
--
--  1. Age attestation. Everyone who creates content must have passed the neutral age screen. Only the FACT
--     (a timestamp) is stored, never a birth date. The server refuses to create boards, uploads, share links,
--     memberships or personal settings for an account that has not attested, so skipping the screen in the
--     browser (e.g. calling the OAuth endpoints directly) gets an empty account that cannot hold any content.
--  2. Marketing-email preference (off by default) with when/where it was set, and a suppression-safe audience
--     function for a future sender.
--  3. copyright_reports: a small table for copyright complaints (written by an Edge Function only).
-- =====================================================================

-- ---- 1. age attestation ----------------------------------------------------------------
alter table public.profiles add column age_attested_at timestamptz;   -- not writable by clients (column grants unchanged)

create function public.attest_age() returns timestamptz
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); t timestamptz;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  perform public.ensure_profile();
  update public.profiles set age_attested_at = coalesce(age_attested_at, now()) where id = uid returning age_attested_at into t;
  return t;
end $$;

create function public.require_age_attested() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  -- (plain IF branches: a CASE expression would make PL/pgSQL look for every column on every table)
  if tg_table_name = 'boards' then uid := new.owner_id;
  elsif tg_table_name = 'assets' then uid := new.owner_id;
  elsif tg_table_name = 'shares' then uid := new.creator_id;
  else uid := new.user_id;                     -- board_members, profile_settings
  end if;
  if not exists (select 1 from public.profiles p where p.id = uid and p.age_attested_at is not null) then
    raise exception 'AGE_NOT_CONFIRMED' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger boards_age_check           before insert on public.boards           for each row execute function public.require_age_attested();
create trigger assets_age_check           before insert on public.assets           for each row execute function public.require_age_attested();
create trigger shares_age_check           before insert on public.shares           for each row execute function public.require_age_attested();
create trigger board_members_age_check    before insert on public.board_members    for each row execute function public.require_age_attested();
create trigger profile_settings_age_check before insert or update on public.profile_settings for each row execute function public.require_age_attested();

-- ---- 2. marketing preference -----------------------------------------------------------------
alter table public.profile_settings
  add column marketing_opt_in        boolean not null default false,
  add column marketing_opt_in_at     timestamptz,
  add column marketing_opt_in_source text check (marketing_opt_in_source is null or marketing_opt_in_source in ('account_settings', 'unsubscribe_link'));
grant insert (marketing_opt_in) on public.profile_settings to authenticated;
grant update (marketing_opt_in) on public.profile_settings to authenticated;

create function public.marketing_stamp() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.marketing_opt_in then new.marketing_opt_in_at := now(); new.marketing_opt_in_source := 'account_settings'; end if;
  elsif new.marketing_opt_in is distinct from old.marketing_opt_in then
    new.marketing_opt_in_at := now();
    new.marketing_opt_in_source := case when auth.uid() is null then 'unsubscribe_link' else 'account_settings' end;
  end if;
  return new;
end $$;
create trigger profile_settings_marketing before insert or update on public.profile_settings
  for each row execute function public.marketing_stamp();

-- One-click unsubscribe (called by the unsubscribe Edge Function with the service role; the caller has no login).
create function public.marketing_unsubscribe(p_user uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.profile_settings set marketing_opt_in = false where user_id = p_user and marketing_opt_in;
  get diagnostics n = row_count;
  return n > 0;
end $$;

-- The ONLY list a marketing sender should read: people who opted in and have not unsubscribed.
create function public.marketing_audience() returns table (user_id uuid, email text)
language sql stable security definer set search_path = public as $$
  select s.user_id, u.email::text
    from public.profile_settings s join auth.users u on u.id = s.user_id
   where s.marketing_opt_in and u.email is not null
$$;

-- ---- 3. copyright complaints ------------------------------------------------------------------
create table public.copyright_reports (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  reporter_name      text not null check (char_length(reporter_name) between 1 and 200),
  reporter_email     text not null check (char_length(reporter_email) between 3 and 320),
  reporter_address   text check (reporter_address is null or char_length(reporter_address) <= 500),
  work_description   text not null check (char_length(work_description) between 1 and 4000),
  infringing_url     text not null check (char_length(infringing_url) between 1 and 2000),
  good_faith         boolean not null check (good_faith),          -- statement of good-faith belief
  accuracy_perjury   boolean not null check (accuracy_perjury),    -- accuracy + authority, under penalty of perjury
  signature          text not null check (char_length(signature) between 1 and 200),
  status             text not null default 'new' check (status in ('new', 'reviewing', 'actioned', 'rejected', 'counter_notice')),
  internal_notes     text check (internal_notes is null or char_length(internal_notes) <= 4000),
  share_id           uuid references public.shares (id) on delete set null
);
alter table public.copyright_reports enable row level security;
alter table public.copyright_reports force row level security;
revoke all on public.copyright_reports from anon, authenticated;     -- no policies: only the service role (Edge Function / you in the dashboard)

-- ---- privileges for the new functions -----------------------------------------------------------
revoke execute on function public.attest_age(), public.require_age_attested(), public.marketing_stamp(),
  public.marketing_unsubscribe(uuid), public.marketing_audience() from public, anon, authenticated;
grant execute on function public.attest_age() to authenticated;
grant execute on function public.marketing_unsubscribe(uuid), public.marketing_audience() to service_role;
