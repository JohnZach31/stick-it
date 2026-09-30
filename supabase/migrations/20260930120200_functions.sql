-- =====================================================================
-- RPC functions
--
-- SECURITY INVOKER (default) unless stated: RLS then applies to whatever the function does.
-- SECURITY DEFINER functions all
--   * pin search_path,
--   * check auth.uid() / roles themselves,
--   * only do what their name says.
-- Nothing here is executable by `anon`. Public share resolution is service_role only.
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles: created on signup, and re-creatable if the trigger ever failed
-- ---------------------------------------------------------------------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 60), ''),
    nullif(left(coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', ''), 500), '')
  )
  on conflict (id) do nothing;      -- never overwrite an existing (possibly customised) profile
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.ensure_profile() returns public.profiles
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
          nullif(left(coalesce(meta ->> 'full_name', meta ->> 'name', ''), 60), ''),
          nullif(left(coalesce(meta ->> 'avatar_url', meta ->> 'picture', ''), 500), ''))
  on conflict (id) do nothing;
  select * into p from public.profiles where id = uid;
  return p;
end $$;

-- ---------------------------------------------------------------------
-- boards: creation enforces the plan limit and is idempotent per migration key
-- ---------------------------------------------------------------------
create function public.create_board(p_name text, p_subtitle text default null, p_migration_key text default null)
returns public.boards
language plpgsql security definer set search_path = public as $$
declare
  uid   uuid := auth.uid();
  prof  public.profiles;
  lim   int;
  have  int;
  b     public.boards;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  prof := public.ensure_profile();

  -- serialise per user so two simultaneous requests cannot both slip under the limit
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));

  if p_migration_key is not null then
    select * into b from public.boards where owner_id = uid and migration_key = p_migration_key;
    if found then return b; end if;      -- retry of a half-finished guest migration
  end if;

  select pl.max_boards into lim from public.plan_limits pl where pl.plan = prof.plan;
  select count(*) into have from public.boards where owner_id = uid and archived_at is null;
  if have >= lim then
    raise exception 'BOARD_LIMIT_REACHED' using errcode = 'P0001',
      detail = format('plan=%s limit=%s', prof.plan, lim);
  end if;

  insert into public.boards (owner_id, name, subtitle, migration_key, sort_order)
  values (uid,
          left(btrim(coalesce(nullif(p_name, ''), 'My Board')), 80),
          nullif(left(btrim(coalesce(p_subtitle, '')), 80), ''),
          p_migration_key,
          coalesce((select max(sort_order) + 1 from public.boards where owner_id = uid), 0))
  returning * into b;
  return b;
end $$;

-- ---------------------------------------------------------------------
-- objects: batch sync with per-object version checks (SECURITY INVOKER: RLS decides who may write)
--
-- p_upserts: [{id, type, x, y, width?, height?, rotation?, z_index?, data?, base_version?}]
--   new object:      base_version null
--   existing object: base_version = the version the client last saw
-- Returns {results:[{id, status, version?, server?}], deleted:[ids]}
--   status ok        written, `version` is the new version
--   status conflict  someone else changed it first; `server` holds their copy
--   status denied    not allowed (viewer, foreign board, foreign asset)
--   status invalid   bad values / unsafe content / limits
-- ---------------------------------------------------------------------
create function public.sync_objects(p_board uuid, p_upserts jsonb default '[]'::jsonb, p_deletes jsonb default '[]'::jsonb)
returns jsonb
language plpgsql set search_path = public as $$
declare
  item    jsonb;
  oid     uuid;
  cur     public.board_objects;
  base    bigint;
  newv    bigint;
  d       jsonb;
  results jsonb := '[]'::jsonb;
  deleted jsonb := '[]'::jsonb;
  delid   uuid;
  n       int;
  roles   text[] := array['primary','attached','poster','cutout'];
  keys    text[] := array['assetId','attachedAssetId','posterAssetId','cutoutAssetId'];
  i       int;
  ref     text;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  if jsonb_typeof(p_upserts) is distinct from 'array' or jsonb_array_length(p_upserts) > 200
     or jsonb_typeof(p_deletes) is distinct from 'array' or jsonb_array_length(p_deletes) > 500 then
    raise exception 'BAD_REQUEST' using errcode = '22023';
  end if;

  for item in select value from jsonb_array_elements(p_upserts) loop
    oid := null;
    begin
      oid  := (item ->> 'id')::uuid;
      base := nullif(item ->> 'base_version', '')::bigint;
      d    := coalesce(item -> 'data', '{}'::jsonb);

      select * into cur from public.board_objects where id = oid;    -- RLS: only rows on readable boards

      if not found then
        insert into public.board_objects (id, board_id, type, x, y, width, height, rotation, z_index, data)
        values (oid, p_board, item ->> 'type',
                (item ->> 'x')::double precision, (item ->> 'y')::double precision,
                nullif(item ->> 'width', '')::double precision,
                nullif(item ->> 'height', '')::double precision,
                nullif(item ->> 'rotation', '')::double precision,
                coalesce(nullif(item ->> 'z_index', '')::int, 0), d)
        returning version into newv;
      elsif base is null or cur.version <> base then
        results := results || jsonb_build_array(jsonb_build_object(
          'id', oid, 'status', 'conflict', 'version', cur.version,
          'server', jsonb_build_object(
            'id', cur.id, 'board_id', cur.board_id, 'type', cur.type, 'x', cur.x, 'y', cur.y,
            'width', cur.width, 'height', cur.height, 'rotation', cur.rotation, 'z_index', cur.z_index,
            'data', cur.data, 'version', cur.version, 'deleted_at', cur.deleted_at, 'updated_at', cur.updated_at)));
        continue;
      else
        update public.board_objects
           set board_id  = p_board,
               x         = (item ->> 'x')::double precision,
               y         = (item ->> 'y')::double precision,
               width     = nullif(item ->> 'width', '')::double precision,
               height    = nullif(item ->> 'height', '')::double precision,
               rotation  = nullif(item ->> 'rotation', '')::double precision,
               z_index   = coalesce(nullif(item ->> 'z_index', '')::int, 0),
               data      = d,
               deleted_at = null                 -- writing an object brings it back (undo of a delete)
         where id = oid
        returning version into newv;
        get diagnostics n = row_count;
        if n = 0 then                             -- RLS filtered the row: the caller may not edit it
          results := results || jsonb_build_array(jsonb_build_object('id', oid, 'status', 'denied'));
          continue;
        end if;
      end if;

      -- keep the object -> asset references in step with the object's data
      delete from public.object_assets where object_id = oid;
      for i in 1 .. array_length(keys, 1) loop
        ref := d ->> keys[i];
        if ref is not null and ref <> '' then
          insert into public.object_assets (object_id, asset_id, role) values (oid, ref::uuid, roles[i])
          on conflict do nothing;
        end if;
      end loop;

      results := results || jsonb_build_array(jsonb_build_object('id', oid, 'status', 'ok', 'version', newv));
    exception
      when insufficient_privilege or unique_violation or foreign_key_violation then
        results := results || jsonb_build_array(jsonb_build_object('id', oid, 'status', 'denied'));
      when check_violation or data_exception or invalid_text_representation or not_null_violation then
        results := results || jsonb_build_array(jsonb_build_object('id', oid, 'status', 'invalid', 'error', sqlerrm));
    end;
  end loop;

  for delid in select value::uuid from jsonb_array_elements_text(p_deletes) loop
    update public.board_objects set deleted_at = now()
     where id = delid and board_id = p_board and deleted_at is null;
    get diagnostics n = row_count;
    if n > 0 then deleted := deleted || to_jsonb(delid); end if;
  end loop;

  return jsonb_build_object('results', results, 'deleted', deleted);
end $$;

-- ---------------------------------------------------------------------
-- assets: register -> upload to the returned path -> finalize
-- ---------------------------------------------------------------------
create function public.create_asset(
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
  if p_board is null or not public.can_edit_board(p_board) then
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

-- Confirms the bytes really arrived (and are what was declared) before the asset counts as ready.
create function public.finalize_asset(p_asset uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid   uuid := auth.uid();
  a     public.assets;
  lim   public.media_limits;
  meta  jsonb;
  size  bigint;
  mime  text;
  used  bigint;
  quota bigint;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  select * into a from public.assets where id = p_asset and owner_id = uid for update;
  if not found then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if a.status = 'ready' then return jsonb_build_object('ok', true, 'asset', to_jsonb(a)); end if;
  if a.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'ASSET_' || upper(a.status)); end if;

  select o.metadata into meta from storage.objects o where o.bucket_id = 'media' and o.name = a.storage_path;
  if meta is null then return jsonb_build_object('ok', false, 'error', 'UPLOAD_NOT_FOUND'); end if;

  size := (meta ->> 'size')::bigint;
  mime := split_part(lower(coalesce(meta ->> 'mimetype', '')), ';', 1);
  select * into lim from public.media_limits where kind = a.kind;
  select pl.max_storage_bytes into quota from public.plan_limits pl
    join public.profiles p on p.plan = pl.plan where p.id = uid;
  select coalesce(sum(byte_size), 0) into used
    from public.assets where owner_id = uid and status in ('pending','ready') and id <> a.id;

  if not (mime = any (lim.allowed_mime_types)) or size > lim.max_bytes or used + size > quota then
    update public.assets set status = 'failed' where id = a.id;
    insert into public.storage_tombstones (storage_path) values (a.storage_path) on conflict do nothing;
    return jsonb_build_object('ok', false, 'error',
      case when not (mime = any (lim.allowed_mime_types)) then 'MIME_NOT_ALLOWED'
           when size > lim.max_bytes then 'FILE_TOO_LARGE' else 'STORAGE_QUOTA_EXCEEDED' end);
  end if;

  update public.assets set status = 'ready', byte_size = size, mime_type = mime where id = a.id
  returning * into a;
  return jsonb_build_object('ok', true, 'asset', to_jsonb(a));
end $$;

-- ---------------------------------------------------------------------
-- sharing
-- ---------------------------------------------------------------------
-- Creates a short link. The token is returned ONCE; only its hash is stored.
--   object_snapshot / group_snapshot: frozen copy of the chosen objects (owner or editor)
--   board_live: always shows the board as it currently is (owner only)
create function public.create_share(p_type text, p_board uuid, p_object_ids uuid[] default null, p_by_name text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid   uuid := auth.uid();
  v_role text;
  sid   uuid;
  tok   text;
  n     int;
  active int;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  perform public.ensure_profile();
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
  insert into public.shares (token_hash, creator_id, board_id, share_type, by_name)
  values (encode(sha256(convert_to(tok, 'utf8')), 'hex'), uid, p_board, p_type, left(p_by_name, 60))
  returning id into sid;

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

create function public.disable_share(p_share uuid, p_reason text default 'creator') returns boolean
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n int;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  update public.shares s
     set is_active = false, disabled_at = now(), disabled_reason = left(p_reason, 200)
   where s.id = p_share and s.is_active
     and (s.creator_id = uid or (s.board_id is not null and public.is_board_owner(s.board_id)));
  get diagnostics n = row_count;
  return n > 0;
end $$;

-- Public resolver. ONLY the Edge Function (service role) may call this: it validates the token,
-- and returns just what the share is allowed to show, never membership, e-mail or other boards.
create function public.resolve_share(p_token text) returns jsonb
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
       and a.id in (select oa.asset_id from public.object_assets oa
                      join public.board_objects o on o.id = oa.object_id
                     where o.board_id = s.board_id and o.deleted_at is null);
    return jsonb_build_object('ok', true, 'type', s.share_type, 'by_name', s.by_name, 'created_at', s.created_at,
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
  return jsonb_build_object('ok', true, 'type', s.share_type, 'by_name', s.by_name, 'created_at', s.created_at,
                            'board', null, 'objects', objs, 'assets', assets);
end $$;

-- ---------------------------------------------------------------------
-- invites (one board per invite; accepting creates the membership)
-- ---------------------------------------------------------------------
create function public.create_invite(p_board uuid, p_email text, p_role text default 'editor') returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); tok text; inv_id uuid; exp timestamptz;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  if not public.is_board_owner(p_board) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_role not in ('editor', 'viewer') then raise exception 'BAD_REQUEST' using errcode = '22023'; end if;
  tok := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into public.board_invites (board_id, inviter_id, email, role, token_hash)
  values (p_board, uid, nullif(lower(btrim(coalesce(p_email, ''))), ''), p_role,
          encode(sha256(convert_to(tok, 'utf8')), 'hex'))
  returning id, expires_at into inv_id, exp;
  return jsonb_build_object('id', inv_id, 'token', tok, 'expires_at', exp);
end $$;

create function public.accept_invite(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); inv public.board_invites; mail text;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  perform public.ensure_profile();
  select * into inv from public.board_invites
   where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'utf8')), 'hex') for update;
  if not found then raise exception 'INVITE_NOT_FOUND' using errcode = 'P0001'; end if;
  if inv.accepted_at is not null then raise exception 'INVITE_USED' using errcode = 'P0001'; end if;
  if inv.expires_at < now() then raise exception 'INVITE_EXPIRED' using errcode = 'P0001'; end if;
  mail := lower(coalesce(auth.jwt() ->> 'email', ''));
  if inv.email is not null and inv.email <> mail then raise exception 'INVITE_EMAIL_MISMATCH' using errcode = 'P0001'; end if;

  insert into public.board_members (board_id, user_id, role) values (inv.board_id, uid, inv.role)
  on conflict (board_id, user_id) do nothing;
  update public.board_invites set accepted_at = now(), accepted_by = uid where id = inv.id;
  return inv.board_id;
end $$;

-- ---------------------------------------------------------------------
-- garbage collection (service role only, run by the gc-assets Edge Function / a scheduled job)
--
-- An asset may only be removed when NOTHING durable refers to it:
--   board objects (including soft-deleted ones, so Undo keeps working), share snapshots,
--   board covers/thumbnails, and derived assets (cutout/poster made from it).
-- ---------------------------------------------------------------------
create function public.gc_purge_deleted_objects(p_older_than interval default interval '30 days') returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from public.board_objects where deleted_at is not null and deleted_at < now() - p_older_than;
  get diagnostics n = row_count;
  return n;
end $$;

-- step 1: pick unreferenced assets past the grace period, mark them deleted, return their paths
create function public.gc_claim_orphan_assets(p_grace interval default interval '14 days')
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
     and not exists (select 1 from public.assets d where d.source_asset_id = a.id and d.status <> 'deleted')
  returning a.id, a.storage_path;
end $$;

-- step 2 (after the files are removed from Storage): forget the rows. Tombstones make sure the
-- files are retried if step 2 ever runs before Storage deletion succeeded.
create function public.gc_finish_assets(p_ids uuid[]) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from public.assets where id = any (p_ids) and status = 'deleted';
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- who may call what
--
-- New functions are executable by PUBLIC (and, on Supabase, by anon/authenticated through default
-- privileges). Close all of that, then grant back exactly what is intended.
-- REPEAT THIS PATTERN IN EVERY FUTURE MIGRATION THAT ADDS A FUNCTION.
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function                      -- authorisation helpers used inside RLS policies
  public.board_role(uuid), public.can_read_board(uuid), public.can_edit_board(uuid),
  public.is_board_owner(uuid), public.shares_board_with(uuid),
  public.can_read_asset(uuid), public.can_link_asset(uuid, uuid)
  to authenticated;

grant execute on function
  public.ensure_profile(),
  public.create_board(text, text, text),
  public.sync_objects(uuid, jsonb, jsonb),
  public.create_asset(uuid, text, text, bigint, text, int, int, double precision, uuid, uuid),
  public.finalize_asset(uuid),
  public.create_share(text, uuid, uuid[], text),
  public.disable_share(uuid, text),
  public.create_invite(uuid, text, text),
  public.accept_invite(text)
  to authenticated;

-- service role (Edge Functions / cron) only
grant execute on function
  public.resolve_share(text),
  public.gc_purge_deleted_objects(interval),
  public.gc_claim_orphan_assets(interval),
  public.gc_finish_assets(uuid[])
  to service_role;
grant select, delete on public.storage_tombstones to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
