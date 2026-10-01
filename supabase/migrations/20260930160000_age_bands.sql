-- =====================================================================
-- Age bands and parental consent (replaces the blanket "13+" rule of the previous migration)
--
-- Stick-It may be used by people younger than 13. What changes with age is what the SERVER lets an account do:
--   adult  (18+)    normal account
--   teen   (13-17)  normal account, conservative defaults (anonymous sharing, no marketing)
--   child  (<13)    no cloud features until a parent or guardian has approved (parental_consent_status = 'approved').
--                   Guest (local-only) use needs no account and is unaffected.
-- The birth month and year typed on the age screen are used once in the browser to pick a band and are never sent or
-- stored. The server keeps only: age_band, age_attested_at, parental_consent_status, terms_version, privacy_version.
-- Nobody (and no browser) can approve a child account except the service role, after a verification that the owner has
-- decided is legally sufficient. No such mechanism is switched on today. See docs/legal/children-and-parental-consent.md.
-- =====================================================================

alter table public.profiles
  add column age_band                text check (age_band in ('adult', 'teen', 'child')),
  add column parental_consent_status text not null default 'not_required'
                                       check (parental_consent_status in ('not_required', 'pending_parent_consent', 'approved', 'revoked')),
  add column terms_version           text check (terms_version is null or char_length(terms_version) <= 40),
  add column privacy_version         text check (privacy_version is null or char_length(privacy_version) <= 40);
-- (no client may write any of these: the profiles update grant lists its columns and none of them is on it)

-- ---- what a band may do ----------------------------------------------------------------------------
create or replace function public.require_age_attested() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid; p public.profiles;
begin
  if tg_table_name = 'boards' then uid := new.owner_id;
  elsif tg_table_name = 'assets' then uid := new.owner_id;
  elsif tg_table_name = 'shares' then uid := new.creator_id;
  else uid := new.user_id;                     -- board_members, profile_settings
  end if;
  select * into p from public.profiles where id = uid;
  if not found or p.age_band is null then
    raise exception 'AGE_NOT_CONFIRMED' using errcode = 'P0001';
  end if;
  if p.age_band = 'child' and p.parental_consent_status <> 'approved' then
    raise exception 'PARENT_CONSENT_REQUIRED' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- ---- recording the band (once) ---------------------------------------------------------------------
drop function if exists public.attest_age();

create function public.set_age_band(p_band text, p_terms_version text default null, p_privacy_version text default null)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); p public.profiles;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  if p_band is null or p_band not in ('adult', 'teen', 'child') then raise exception 'BAD_REQUEST' using errcode = '22023'; end if;
  perform public.ensure_profile();
  select * into p from public.profiles where id = uid for update;
  if p.age_band is not null then return p; end if;      -- set once: a later call can neither raise nor lower it
  update public.profiles
     set age_band = p_band,
         age_attested_at = now(),
         parental_consent_status = case when p_band = 'child' then 'pending_parent_consent' else 'not_required' end,
         terms_version = left(p_terms_version, 40),
         privacy_version = left(p_privacy_version, 40)
   where id = uid returning * into p;
  if p_band = 'teen' then      -- conservative starting point; every value can be changed later
    insert into public.profile_settings (user_id, share_default_identity, share_show_name, share_show_avatar, share_show_bio, marketing_opt_in)
    values (uid, 'anonymous', false, false, false, false) on conflict (user_id) do nothing;
  end if;
  return p;
end $$;

-- ---- no marketing to anyone who is not an adult -------------------------------------------------------
create or replace function public.marketing_stamp() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.marketing_opt_in and (tg_op = 'INSERT' or new.marketing_opt_in is distinct from old.marketing_opt_in) then
    if not exists (select 1 from public.profiles p where p.id = new.user_id and p.age_band = 'adult') then
      raise exception 'MARKETING_NOT_ALLOWED' using errcode = 'P0001';      -- policy: promotional e-mail is for adults who opted in
    end if;
  end if;
  if tg_op = 'INSERT' then
    if new.marketing_opt_in then new.marketing_opt_in_at := now(); new.marketing_opt_in_source := 'account_settings'; end if;
  elsif new.marketing_opt_in is distinct from old.marketing_opt_in then
    new.marketing_opt_in_at := now();
    new.marketing_opt_in_source := case when auth.uid() is null then 'unsubscribe_link' else 'account_settings' end;
  end if;
  return new;
end $$;

create or replace function public.marketing_audience() returns table (user_id uuid, email text)
language sql stable security definer set search_path = public as $$
  select s.user_id, u.email::text
    from public.profile_settings s
    join auth.users u on u.id = s.user_id
    join public.profiles p on p.id = s.user_id
   where s.marketing_opt_in and u.email is not null and p.age_band = 'adult'
$$;

-- ---- parental consent records (service role only) -----------------------------------------------------
create table public.parental_consents (
  id                   uuid primary key default gen_random_uuid(),
  child_id             uuid not null references public.profiles (id) on delete cascade,
  status               text not null check (status in ('pending_parent_consent', 'approved', 'revoked')),
  policy_version       text check (policy_version is null or char_length(policy_version) <= 40),
  verification_method  text check (verification_method is null or char_length(verification_method) <= 80),
  parent_contact       text check (parent_contact is null or char_length(parent_contact) <= 320),   -- only if the chosen method needs it
  requested_at         timestamptz not null default now(),
  approved_at          timestamptz,
  revoked_at           timestamptz
);
create index parental_consents_child_idx on public.parental_consents (child_id);
alter table public.parental_consents enable row level security;
alter table public.parental_consents force row level security;
revoke all on public.parental_consents from anon, authenticated;     -- no policies: a child cannot read, write or approve anything here

-- The ONLY way a child account becomes usable. Called by the service role (an Edge Function for a verified mechanism the
-- owner has chosen, or the owner in the dashboard after verifying out of band). Approving needs a named verification method.
create function public.parental_consent_set(p_child uuid, p_status text, p_method text default null,
                                            p_policy_version text default null, p_parent_contact text default null)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  if p_status not in ('pending_parent_consent', 'approved', 'revoked') then raise exception 'BAD_REQUEST' using errcode = '22023'; end if;
  if p_status = 'approved' and (p_method is null or btrim(p_method) = '') then raise exception 'VERIFICATION_METHOD_REQUIRED' using errcode = 'P0001'; end if;
  select * into p from public.profiles where id = p_child for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  if p.age_band is distinct from 'child' then raise exception 'NOT_A_CHILD_ACCOUNT' using errcode = 'P0001'; end if;
  insert into public.parental_consents (child_id, status, policy_version, verification_method, parent_contact, approved_at, revoked_at)
  values (p_child, p_status, p_policy_version, p_method, p_parent_contact,
          case when p_status = 'approved' then now() end, case when p_status = 'revoked' then now() end);
  update public.profiles set parental_consent_status = p_status where id = p_child returning * into p;
  return p;
end $$;

-- accounts that came through a sign-in but never completed the age screen and never made anything: candidates for the clean-up job
create function public.abandoned_accounts(p_older_than interval default interval '7 days') returns table (user_id uuid)
language sql stable security definer set search_path = public as $$
  select p.id from public.profiles p
   where p.age_band is null and p.created_at < now() - p_older_than
     and not exists (select 1 from public.boards b where b.owner_id = p.id)
     and not exists (select 1 from public.assets a where a.owner_id = p.id)
     and not exists (select 1 from public.board_members m where m.user_id = p.id)
$$;

-- ---- privileges ---------------------------------------------------------------------------------------
revoke execute on function public.set_age_band(text, text, text), public.parental_consent_set(uuid, text, text, text, text),
  public.abandoned_accounts(interval) from public, anon, authenticated;
grant execute on function public.set_age_band(text, text, text) to authenticated;
grant execute on function public.parental_consent_set(uuid, text, text, text, text), public.abandoned_accounts(interval) to service_role;
