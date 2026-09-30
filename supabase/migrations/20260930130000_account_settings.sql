-- =====================================================================
-- Account settings: who you are in Stick-It and how you appear when you share.
--
--   profiles          (readable by people you share a board with)  name + avatar only
--   profile_settings  (PRIVATE: owner only)  bio, @handle, sharing defaults, preferred font/colour
--
-- Avatars are ordinary assets (kind 'avatar', no board) in the private media bucket: the profile
-- row stores an asset id, never image bytes. A share may carry a FROZEN copy of the creator's
-- name / avatar / bio, chosen at share time; e-mail and the private settings never leave the DB.
-- =====================================================================

-- ---- profile columns --------------------------------------------------
alter table public.profiles
  add column avatar_source   text not null default 'provider' check (avatar_source in ('provider','custom','none')),
  add column avatar_asset_id uuid references public.assets (id) on delete set null,
  add column avatar_style    text not null default 'initials' check (avatar_style in ('initials','emoji')),
  add column avatar_color    text check (avatar_color is null or avatar_color ~ '^#[0-9a-fA-F]{6}$'),
  add column avatar_emoji    text check (avatar_emoji is null or char_length(avatar_emoji) between 1 and 8);

-- a browser can no longer point avatar_url at an arbitrary URL (it would be fetched by collaborators)
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_source, avatar_style, avatar_color, avatar_emoji) on public.profiles to authenticated;

-- ---- avatars are assets --------------------------------------------------
alter table public.assets       drop constraint assets_kind_check;
alter table public.assets       add  constraint assets_kind_check check (kind in
  ('image','audio','video','board_cover','thumbnail','cutout','poster','other','avatar'));
alter table public.media_limits drop constraint media_limits_kind_check;
alter table public.media_limits add  constraint media_limits_kind_check check (kind in
  ('image','audio','video','board_cover','thumbnail','cutout','poster','other','avatar'));
insert into public.media_limits (kind, max_bytes, allowed_mime_types)
values ('avatar', 2097152, array['image/jpeg','image/png','image/webp']);

-- upload: a profile photo may be written by its owner (no board involved)
drop policy media_insert on storage.objects;
create policy media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media'
              and exists (select 1 from public.assets a
                           where a.storage_path = name
                             and a.owner_id = (select auth.uid())
                             and a.status = 'pending'
                             and ((a.kind = 'avatar' and a.board_id is null)
                                  or (a.board_id is not null and public.can_edit_board(a.board_id)))));

-- people you share a board with can see your profile photo (that is what a profile is for)
create or replace function public.can_read_asset(p_asset uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.assets a
     where a.id = p_asset
       and a.status <> 'deleted'
       and (
         a.owner_id = (select auth.uid())
         or (a.board_id is not null and public.can_read_board(a.board_id))
         or (a.kind = 'avatar' and public.shares_board_with(a.owner_id)
             and exists (select 1 from public.profiles p where p.id = a.owner_id and p.avatar_asset_id = a.id))
         or exists (select 1
                      from public.object_assets oa
                      join public.board_objects o on o.id = oa.object_id
                     where oa.asset_id = a.id and public.can_read_board(o.board_id))
       ))
$$;

-- ---- private settings ----------------------------------------------------
create table public.profile_settings (
  user_id                  uuid primary key references public.profiles (id) on delete cascade,
  bio                      text check (bio is null or char_length(bio) <= 120),
  handle                   text check (handle is null or handle ~ '^[a-z0-9_]{3,20}$'),
  share_show_name          boolean not null default true,
  share_show_avatar        boolean not null default false,
  share_show_bio           boolean not null default false,
  share_default_identity   text not null default 'named' check (share_default_identity in ('named','anonymous')),
  share_default_board_mode text not null default 'view'  check (share_default_board_mode in ('view','ask')),
  preferred_font           text check (preferred_font is null or char_length(preferred_font) <= 60),
  default_note_color       text check (default_note_color is null or char_length(default_note_color) <= 40),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create unique index profile_settings_handle_key on public.profile_settings (handle) where handle is not null;
create trigger profile_settings_updated_at before update on public.profile_settings
  for each row execute function public.set_updated_at();

alter table public.profile_settings enable row level security;
alter table public.profile_settings force row level security;
-- default privileges hand every new table to anon/authenticated: take it all back, then grant exactly what is needed
revoke all on public.profile_settings from anon, authenticated;
grant select on public.profile_settings to authenticated;
grant insert (user_id, bio, handle, share_show_name, share_show_avatar, share_show_bio, share_default_identity,
              share_default_board_mode, preferred_font, default_note_color) on public.profile_settings to authenticated;
grant update (bio, handle, share_show_name, share_show_avatar, share_show_bio, share_default_identity,
              share_default_board_mode, preferred_font, default_note_color) on public.profile_settings to authenticated;
create policy profile_settings_select on public.profile_settings for select to authenticated
  using (user_id = (select auth.uid()));
create policy profile_settings_insert on public.profile_settings for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy profile_settings_update on public.profile_settings for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---- frozen identity on shares -------------------------------------------
alter table public.shares
  add column by_avatar_asset_id uuid references public.assets (id) on delete set null,
  add column by_bio             text check (by_bio is null or char_length(by_bio) <= 120);

-- ---- RPCs ----------------------------------------------------------------
create function public.set_avatar_asset(p_asset uuid) returns public.profiles
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); a public.assets; p public.profiles;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  perform public.ensure_profile();
  select * into a from public.assets where id = p_asset;
  if not found or a.owner_id <> uid or a.kind <> 'avatar' or a.board_id is not null or a.status <> 'ready' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.profiles set avatar_asset_id = a.id, avatar_source = 'custom' where id = uid returning * into p;
  return p;
end $$;

-- back to the sign-in provider's photo ('provider') or to initials/emoji ('none')
create function public.clear_avatar(p_to text default 'provider') returns public.profiles
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); p public.profiles;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  if p_to not in ('provider', 'none') then raise exception 'BAD_REQUEST' using errcode = '22023'; end if;
  perform public.ensure_profile();
  update public.profiles set avatar_asset_id = null, avatar_source = p_to where id = uid returning * into p;
  return p;
end $$;

-- practical numbers for the account page; only the caller's own
create function public.my_usage() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); p public.profiles; pl public.plan_limits; out jsonb;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  select * into p from public.profiles where id = uid;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  select * into pl from public.plan_limits where plan = p.plan;
  out := jsonb_build_object(
    'plan', p.plan,
    'member_since', p.created_at,
    'boards', (select count(*) from public.boards b where b.owner_id = uid and b.archived_at is null),
    'boards_limit', pl.max_boards,
    'objects', (select count(*) from public.board_objects o join public.boards b on b.id = o.board_id
                 where b.owner_id = uid and o.deleted_at is null),
    'storage_used', (select coalesce(sum(byte_size), 0) from public.assets where owner_id = uid and status in ('pending','ready')),
    'storage_quota', pl.max_storage_bytes,
    'active_shares', (select count(*) from public.shares where creator_id = uid and is_active));
  return out;
end $$;

-- Account deletion (service role only, called by the delete-account Edge Function, which then
-- removes the auth user). Order matters: shares first (they hold RESTRICT references to assets),
-- then boards, then assets (each deleted asset leaves a tombstone so its file gets removed).
create function public.purge_user_data(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.shares
   where creator_id = p_user
      or board_id in (select id from public.boards where owner_id = p_user)
      or id in (select sa.share_id from public.share_assets sa join public.assets a on a.id = sa.asset_id where a.owner_id = p_user);
  update public.profiles set avatar_asset_id = null where id = p_user;
  delete from public.boards where owner_id = p_user;
  delete from public.assets where owner_id = p_user;
  delete from public.profiles where id = p_user;
end $$;

create or replace function public.create_asset(
  p_board uuid, p_kind text, p_mime text, p_size bigint, p_filename text default null,
  p_width int default null, p_height int default null, p_duration double precision default null,
  p_source uuid default null, p_id uuid default null)
returns public.assets
language plpgsql security definer set search_path = public as $$
declare
  uid   uuid := auth.uid();
  prof  public.profiles;
  lim   public.media_limits;
  mime  text := split_part(lower(coalesce(p_mime, '')), ';', 1);
  used  bigint;
  quota bigint;
  aid   uuid := coalesce(p_id, gen_random_uuid());
  fname text;
  a     public.assets;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  prof := public.ensure_profile();
  if p_kind = 'avatar' then
    if p_board is not null then raise exception 'FORBIDDEN' using errcode = '42501'; end if;   -- a profile photo belongs to the person
  elsif p_board is null or not public.can_edit_board(p_board) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- retry of an earlier registration (same id): hand back the same row instead of a duplicate
  select * into a from public.assets where id = aid;
  if found then
    if a.owner_id <> uid then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
    if a.status <> 'deleted' then return a; end if;
    raise exception 'ASSET_DELETED' using errcode = 'P0001';
  end if;

  select * into lim from public.media_limits where kind = p_kind;
  if not found then raise exception 'BAD_KIND' using errcode = '22023'; end if;
  if not (mime = any (lim.allowed_mime_types)) then
    raise exception 'MIME_NOT_ALLOWED' using errcode = 'P0001', detail = mime;
  end if;
  if p_size is null or p_size <= 0 or p_size > lim.max_bytes then
    raise exception 'FILE_TOO_LARGE' using errcode = 'P0001', detail = format('max=%s', lim.max_bytes);
  end if;
  if p_source is not null and not public.can_read_asset(p_source) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(sum(byte_size), 0) into used
    from public.assets where owner_id = uid and status in ('pending','ready');
  select pl.max_storage_bytes into quota from public.plan_limits pl where pl.plan = prof.plan;
  if used + p_size > quota then
    raise exception 'STORAGE_QUOTA_EXCEEDED' using errcode = 'P0001', detail = format('used=%s quota=%s', used, quota);
  end if;

  fname := left(regexp_replace(coalesce(nullif(p_filename, ''), 'file'), '[^A-Za-z0-9._-]', '_', 'g'), 80);
  insert into public.assets (id, owner_id, board_id, kind, storage_path, mime_type, byte_size,
                             width, height, duration, original_filename, source_asset_id)
  values (aid, uid, p_board, p_kind,
          format('a/%s/%s', aid, fname),        -- opaque on purpose: signed public URLs must not reveal user or board ids
          mime, p_size, p_width, p_height, p_duration, left(p_filename, 200), p_source)
  returning * into a;
  return a;
end $$;

create function public.create_share(p_type text, p_board uuid, p_object_ids uuid[] default null, p_by_name text default null,
  p_show_avatar boolean default false, p_show_bio boolean default false)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid   uuid := auth.uid();
  v_role text;
  sid   uuid;
  tok   text;
  n     int;
  active int;
  prof  public.profiles;
  v_bio text;
  v_av  uuid;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  prof := public.ensure_profile();
  v_role := public.board_role(p_board);
  if p_type = 'board_live' then
    if v_role is distinct from 'owner' then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  elsif p_type in ('object_snapshot', 'group_snapshot') then
    if v_role is null or v_role not in ('owner', 'editor') then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
    if p_object_ids is null or coalesce(array_length(p_object_ids, 1), 0) = 0 or array_length(p_object_ids, 1) > 100 then
      raise exception 'NOTHING_TO_SHARE' using errcode = 'P0001';
    end if;
    if p_type = 'object_snapshot' and array_length(p_object_ids, 1) <> 1 then
      raise exception 'BAD_REQUEST' using errcode = '22023';
    end if;
  else
    raise exception 'BAD_REQUEST' using errcode = '22023';
  end if;

  select count(*) into active from public.shares where creator_id = uid and is_active;
  if active >= 500 then raise exception 'SHARE_LIMIT_REACHED' using errcode = 'P0001'; end if;

  tok := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');   -- 244 random bits
  -- identity shown with the link is a FROZEN copy taken now, and only what the creator switched on
  if p_show_avatar and prof.avatar_source = 'custom' and prof.avatar_asset_id is not null then
    select a.id into v_av from public.assets a where a.id = prof.avatar_asset_id and a.status = 'ready';
  end if;
  if p_show_bio then
    select nullif(btrim(s.bio), '') into v_bio from public.profile_settings s where s.user_id = uid;
  end if;

  insert into public.shares (token_hash, creator_id, board_id, share_type, by_name, by_avatar_asset_id, by_bio)
  values (encode(sha256(convert_to(tok, 'utf8')), 'hex'), uid, p_board, p_type, left(p_by_name, 60), v_av, v_bio)
  returning id into sid;
  if v_av is not null then
    insert into public.share_assets (share_id, asset_id) values (sid, v_av) on conflict do nothing;   -- keeps the photo alive for this link
  end if;

  if p_type <> 'board_live' then
    insert into public.share_items (share_id, position, type, x, y, width, height, rotation, z_index, data)
    select sid, (row_number() over (order by o.z_index, o.created_at))::int,
           o.type, o.x, o.y, o.width, o.height, o.rotation, o.z_index, o.data
      from public.board_objects o
     where o.board_id = p_board and o.id = any (p_object_ids) and o.deleted_at is null;
    get diagnostics n = row_count;
    if n = 0 or (p_type = 'object_snapshot' and n <> 1) then
      raise exception 'NOTHING_TO_SHARE' using errcode = 'P0001';     -- rolls the whole share back
    end if;

    -- the snapshot keeps its media alive even if the source object or board is deleted later
    insert into public.share_assets (share_id, asset_id)
    select distinct sid, oa.asset_id
      from public.object_assets oa
      join public.board_objects o on o.id = oa.object_id
      join public.assets a on a.id = oa.asset_id and a.status = 'ready'
     where o.board_id = p_board and o.id = any (p_object_ids) and o.deleted_at is null;
  end if;

  return jsonb_build_object('id', sid, 'token', tok);
end $$;

create or replace function public.resolve_share(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  s      public.shares;
  b      public.boards;
  objs   jsonb;
  assets jsonb;
begin
  if p_token is null or char_length(p_token) not between 20 and 200 then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  select * into s from public.shares where token_hash = encode(sha256(convert_to(p_token, 'utf8')), 'hex');
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not s.is_active or s.disabled_at is not null then return jsonb_build_object('ok', false, 'reason', 'disabled'); end if;
  if s.moderation_status not in ('not_checked', 'approved') then return jsonb_build_object('ok', false, 'reason', 'blocked'); end if;
  if s.expires_at is not null and s.expires_at < now() then return jsonb_build_object('ok', false, 'reason', 'expired'); end if;

  if s.share_type = 'board_live' then
    if s.board_id is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
    select * into b from public.boards where id = s.board_id and archived_at is null;
    if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
    select coalesce(jsonb_agg(jsonb_build_object(
             'type', o.type, 'x', o.x, 'y', o.y, 'width', o.width, 'height', o.height,
             'rotation', o.rotation, 'z_index', o.z_index, 'data', o.data) order by o.z_index, o.created_at), '[]'::jsonb)
      into objs
      from public.board_objects o where o.board_id = s.board_id and o.deleted_at is null;
    select coalesce(jsonb_object_agg(a.id::text, jsonb_build_object(
             'path', a.storage_path, 'mime', a.mime_type, 'kind', a.kind,
             'width', a.width, 'height', a.height, 'duration', a.duration)), '{}'::jsonb)
      into assets
      from public.assets a
     where a.status = 'ready' and a.moderation_status not in ('flagged', 'blocked')
       and (a.id = s.by_avatar_asset_id
            or a.id in (select oa.asset_id from public.object_assets oa
                          join public.board_objects o on o.id = oa.object_id
                         where o.board_id = s.board_id and o.deleted_at is null));
    return jsonb_build_object('ok', true, 'type', s.share_type, 'by_name', s.by_name, 'by_bio', s.by_bio, 'by_avatar', s.by_avatar_asset_id, 'created_at', s.created_at,
                              'board', jsonb_build_object('name', b.name, 'subtitle', b.subtitle),
                              'objects', objs, 'assets', assets);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'type', i.type, 'x', i.x, 'y', i.y, 'width', i.width, 'height', i.height,
           'rotation', i.rotation, 'z_index', i.z_index, 'data', i.data) order by i.position), '[]'::jsonb)
    into objs from public.share_items i where i.share_id = s.id;
  select coalesce(jsonb_object_agg(a.id::text, jsonb_build_object(
           'path', a.storage_path, 'mime', a.mime_type, 'kind', a.kind,
           'width', a.width, 'height', a.height, 'duration', a.duration)), '{}'::jsonb)
    into assets
    from public.share_assets sa join public.assets a on a.id = sa.asset_id
   where sa.share_id = s.id and a.status = 'ready' and a.moderation_status not in ('flagged', 'blocked');
  return jsonb_build_object('ok', true, 'type', s.share_type, 'by_name', s.by_name, 'by_bio', s.by_bio, 'by_avatar', s.by_avatar_asset_id, 'created_at', s.created_at,
                            'board', null, 'objects', objs, 'assets', assets);
end $$;

create or replace function public.gc_claim_orphan_assets(p_grace interval default interval '14 days')
returns table (id uuid, storage_path text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  update public.assets a
     set status = 'deleted', deleted_at = now()
   where a.status in ('pending', 'ready', 'failed')
     and a.created_at < now() - p_grace
     and not exists (select 1 from public.object_assets oa where oa.asset_id = a.id)
     and not exists (select 1 from public.share_assets sa where sa.asset_id = a.id)
     and not exists (select 1 from public.boards b where b.cover_asset_id = a.id or b.thumbnail_asset_id = a.id)
     and not exists (select 1 from public.profiles p where p.avatar_asset_id = a.id)
     and not exists (select 1 from public.shares sh where sh.by_avatar_asset_id = a.id)
     and not exists (select 1 from public.assets d where d.source_asset_id = a.id and d.status <> 'deleted')
  returning a.id, a.storage_path;
end $$;

-- GitHub sign-in: its display name may be empty, so fall back to the username
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'user_name', ''), 60), ''),
    nullif(left(coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', ''), 500), '')
  )
  on conflict (id) do nothing;      -- never overwrite an existing (possibly customised) profile
  return new;
end $$;

create or replace function public.ensure_profile() returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  p   public.profiles;
  meta jsonb;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  select * into p from public.profiles where id = uid;
  if found then return p; end if;
  select u.raw_user_meta_data into meta from auth.users u where u.id = uid;
  insert into public.profiles (id, display_name, avatar_url)
  values (uid,
          nullif(left(coalesce(meta ->> 'full_name', meta ->> 'name', meta ->> 'user_name', ''), 60), ''),
          nullif(left(coalesce(meta ->> 'avatar_url', meta ->> 'picture', ''), 500), ''))
  on conflict (id) do nothing;
  select * into p from public.profiles where id = uid;
  return p;
end $$;

-- the old 4-argument create_share is replaced by the 6-argument one above
drop function public.create_share(text, uuid, uuid[], text);

-- ---- who may call what (new functions only; older grants are untouched) --------------------
revoke execute on function
  public.set_avatar_asset(uuid), public.clear_avatar(text), public.my_usage(),
  public.purge_user_data(uuid), public.create_share(text, uuid, uuid[], text, boolean, boolean)
  from public, anon, authenticated;
grant execute on function
  public.set_avatar_asset(uuid), public.clear_avatar(text), public.my_usage(),
  public.create_share(text, uuid, uuid[], text, boolean, boolean)
  to authenticated;
grant execute on function public.purge_user_data(uuid) to service_role;
