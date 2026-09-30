-- =====================================================================
-- Stick-It core schema
--
--  * plan_limits / media_limits   centralised limits (one place to change)
--  * profiles                     1:1 with auth.users
--  * boards, board_members        ownership + roles (owner / editor / viewer)
--  * board_objects                every physical object on a board (note, photo, audio, video, ...)
--  * assets, object_assets        media in Storage + who references it
--  * shares, share_items, share_assets   public links (snapshots + live boards)
--  * board_invites, comments, reminders, share_reports
--  * storage_tombstones           storage files whose asset row was deleted (cleanup queue)
--
-- Row Level Security is enabled in the next migration; nothing here is
-- reachable by clients until the grants/policies there are applied.
-- =====================================================================

-- ---------------------------------------------------------------------
-- generic helpers
-- ---------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- centralised limits
-- ---------------------------------------------------------------------
-- Guests (1 local board) never reach the server; that limit lives in js/config.js.
create table public.plan_limits (
  plan                  text primary key check (plan in ('free', 'premium')),
  max_boards            int    not null check (max_boards >= 0),
  max_storage_bytes     bigint not null check (max_storage_bytes >= 0),
  max_objects_per_board int    not null default 1000 check (max_objects_per_board > 0)
);
insert into public.plan_limits (plan, max_boards, max_storage_bytes, max_objects_per_board) values
  ('free',     2,   209715200, 1000),   -- 2 boards, 200 MB
  ('premium',  6,  5368709120, 1000);   -- 6 boards, 5 GB

-- Per-kind upload rules. Supabase Free caps any single upload at 50 MB, so video is capped there.
create table public.media_limits (
  kind               text primary key check (kind in
                       ('image','audio','video','board_cover','thumbnail','cutout','poster','other')),
  max_bytes          bigint not null check (max_bytes > 0),
  allowed_mime_types text[] not null
);
insert into public.media_limits (kind, max_bytes, allowed_mime_types) values
  ('image',       10485760, array['image/jpeg','image/png','image/webp','image/gif']),
  ('board_cover',  5242880, array['image/jpeg','image/png','image/webp']),
  ('thumbnail',    1048576, array['image/jpeg','image/png','image/webp']),
  ('cutout',      10485760, array['image/png','image/webp']),
  ('poster',       2097152, array['image/jpeg','image/png','image/webp']),
  ('audio',       26214400, array['audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav','audio/aac','audio/x-m4a']),
  ('video',       52428800, array['video/mp4','video/webm','video/quicktime']),
  ('other',        5242880, array['image/jpeg','image/png','image/webp']);
-- NOTE: SVG, HTML and anything executable are deliberately not allowed anywhere.

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  display_name        text check (display_name is null or char_length(display_name) between 1 and 60),
  display_name_custom boolean not null default false,  -- true once the user edited it; never overwritten by sign-in
  avatar_url          text check (avatar_url is null or char_length(avatar_url) <= 500),
  plan                text not null default 'free' references public.plan_limits (plan),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- once a user changes their own name, remember it (a later Google login must not overwrite it)
create function public.profile_name_flag() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.display_name is distinct from old.display_name and auth.uid() is not null then
    new.display_name_custom := true;
  end if;
  return new;
end $$;
create trigger profiles_name_flag before update on public.profiles
  for each row execute function public.profile_name_flag();

-- ---------------------------------------------------------------------
-- boards + members
-- ---------------------------------------------------------------------
create table public.boards (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null references public.profiles (id) on delete cascade,
  name                 text not null check (char_length(name) between 1 and 80),
  subtitle             text check (subtitle is null or char_length(subtitle) <= 80),
  sort_order           int  not null default 0,
  cover_mode           text not null default 'automatic' check (cover_mode in ('automatic','view','upload')),
  cover_asset_id       uuid,            -- FK added after assets exists
  thumbnail_asset_id   uuid,            -- automatic thumbnail image (regenerable)
  migration_key        text check (migration_key is null or char_length(migration_key) between 8 and 120),
  archived_at          timestamptz,
  locked_at            timestamptz,     -- read-only (e.g. over the plan limit after a downgrade)
  scheduled_delete_at  timestamptz,     -- future downgrade policy (14-day retention); never set automatically yet
  content_updated_at   timestamptz not null default now(),  -- last object change (throttled), for "edited 3 min ago"
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
  -- a custom cover whose asset is gone simply renders as Automatic (no CHECK: the FK is ON DELETE SET NULL)
);
create trigger boards_updated_at before update on public.boards
  for each row execute function public.set_updated_at();
create index boards_owner_id_idx on public.boards (owner_id);
-- idempotent guest migration: the same local board can only ever create one cloud board per owner
create unique index boards_owner_migration_key_uidx on public.boards (owner_id, migration_key)
  where migration_key is not null;

create table public.board_members (
  board_id   uuid not null references public.boards (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       text not null check (role in ('owner','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);
create index board_members_user_id_idx  on public.board_members (user_id);
create index board_members_board_id_idx on public.board_members (board_id);
create unique index board_members_one_owner_uidx on public.board_members (board_id) where role = 'owner';

-- every board has exactly one owner row, created with the board
create function public.board_owner_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.board_members (board_id, user_id, role) values (new.id, new.owner_id, 'owner');
  return new;
end $$;
create trigger boards_owner_member after insert on public.boards
  for each row execute function public.board_owner_member();

-- ---------------------------------------------------------------------
-- assets (media metadata; bytes live in Storage bucket "media")
-- ---------------------------------------------------------------------
create table public.assets (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references public.profiles (id) on delete cascade,
  board_id          uuid references public.boards (id) on delete set null,   -- survives board deletion (snapshots may need it)
  kind              text not null check (kind in
                      ('image','audio','video','board_cover','thumbnail','cutout','poster','other')),
  storage_path      text not null unique,
  mime_type         text not null,
  byte_size         bigint not null check (byte_size >= 0),
  width             int check (width  is null or width  > 0),
  height            int check (height is null or height > 0),
  duration          double precision check (duration is null or duration >= 0),
  original_filename text check (original_filename is null or char_length(original_filename) <= 200),
  checksum          text,
  status            text not null default 'pending' check (status in ('pending','ready','failed','deleted')),
  source_asset_id   uuid references public.assets (id) on delete set null,  -- cutout/poster/thumbnail derived from an original
  moderation_status text not null default 'not_checked'
                      check (moderation_status in ('not_checked','pending','approved','flagged','blocked')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create trigger assets_updated_at before update on public.assets
  for each row execute function public.set_updated_at();
create index assets_owner_id_idx on public.assets (owner_id);
create index assets_board_id_idx on public.assets (board_id);
create index assets_source_idx   on public.assets (source_asset_id) where source_asset_id is not null;

alter table public.boards
  add constraint boards_cover_asset_fk     foreign key (cover_asset_id)     references public.assets (id) on delete set null,
  add constraint boards_thumbnail_asset_fk foreign key (thumbnail_asset_id) references public.assets (id) on delete set null;

-- Whenever an asset row disappears (GC, cascade from a deleted account), remember its storage
-- file so a server job can remove the actual bytes. Deleting rows must never silently leak files.
create table public.storage_tombstones (
  storage_path text primary key,
  created_at   timestamptz not null default now()
);
create function public.asset_tombstone() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.storage_tombstones (storage_path) values (old.storage_path) on conflict do nothing;
  return old;
end $$;
create trigger assets_tombstone after delete on public.assets
  for each row execute function public.asset_tombstone();

-- ---------------------------------------------------------------------
-- board objects
-- ---------------------------------------------------------------------
create table public.board_objects (
  id          uuid primary key default gen_random_uuid(),
  board_id    uuid not null references public.boards (id) on delete cascade,
  type        text not null check (type ~ '^[a-z][a-z0-9_]{0,23}$'),   -- note | photo | audio | video | (future types need no migration)
  x           double precision not null check (x between -1e7 and 1e7),
  y           double precision not null check (y between -1e7 and 1e7),
  width       double precision check (width  is null or width  between 0 and 100000),
  height      double precision check (height is null or height between 0 and 100000),
  rotation    double precision check (rotation is null or rotation between -360 and 360),
  z_index     int not null default 0,
  data        jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 262144),
  created_by  uuid references public.profiles (id) on delete set null,
  updated_by  uuid references public.profiles (id) on delete set null,
  version     bigint not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz          -- soft delete: undo, realtime delete events, and asset retention
);
create index board_objects_board_id_idx   on public.board_objects (board_id);
create index board_objects_updated_at_idx on public.board_objects (board_id, updated_at);

-- server-owned columns: the browser can't spoof authorship, version or timestamps
create function public.board_objects_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cap int;
  n   int;
  html text;
begin
  if tg_op = 'INSERT' then
    new.version    := 1;
    new.created_at := now();
    new.updated_at := now();
    if auth.uid() is not null then
      new.created_by := auth.uid();
      new.updated_by := auth.uid();
    end if;
    select pl.max_objects_per_board into cap
      from public.boards b
      join public.profiles p on p.id = b.owner_id
      join public.plan_limits pl on pl.plan = p.plan
     where b.id = new.board_id;
    select count(*) into n from public.board_objects o where o.board_id = new.board_id and o.deleted_at is null;
    if cap is not null and n >= cap then
      raise exception 'OBJECT_LIMIT_REACHED' using errcode = 'check_violation';
    end if;
  else
    new.id         := old.id;
    new.type       := old.type;
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.version    := old.version + 1;
    new.updated_at := now();
    if auth.uid() is not null then new.updated_by := auth.uid(); end if;
  end if;

  -- defence in depth only: the client sanitises HTML on every render. This just refuses payloads
  -- that plainly contain active content so it can never be served to other people.
  html := coalesce(new.data ->> 'html', '');
  if html ~* '<\s*(script|iframe|object|embed|svg|math|style|link|meta|base|form)\y'
     or html ~* '<[^>]*\son[a-z]+\s*='
     or html ~* 'href\s*=\s*["'']?\s*(javascript|data|vbscript):' then
    raise exception 'UNSAFE_HTML' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger board_objects_guard before insert or update on public.board_objects
  for each row execute function public.board_objects_guard();

-- board "last edited" (throttled so a burst of edits is one board update, not hundreds)
create function public.board_objects_touch_board() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.boards set content_updated_at = now()
   where id = new.board_id and content_updated_at < now() - interval '20 seconds';
  return null;
end $$;
create trigger board_objects_touch after insert or update on public.board_objects
  for each row execute function public.board_objects_touch_board();

-- which assets an object references. Maintained by sync_objects(); drives access rules and GC.
create table public.object_assets (
  object_id  uuid not null references public.board_objects (id) on delete cascade,
  asset_id   uuid not null references public.assets (id) on delete restrict,
  role       text not null check (role in ('primary','attached','poster','cutout','thumbnail')),
  sort_order int  not null default 0,
  primary key (object_id, asset_id, role)
);
create index object_assets_asset_id_idx on public.object_assets (asset_id);

-- ---------------------------------------------------------------------
-- sharing
-- ---------------------------------------------------------------------
create table public.shares (
  id                uuid primary key default gen_random_uuid(),
  token_hash        text not null unique,                 -- sha256 of the token; the token itself is never stored
  creator_id        uuid not null references public.profiles (id) on delete cascade,
  board_id          uuid references public.boards (id) on delete set null,
  share_type        text not null check (share_type in ('object_snapshot','group_snapshot','board_live')),
  permission        text not null default 'view' check (permission in ('view')),
  by_name           text check (by_name is null or char_length(by_name) <= 60),
  is_active         boolean not null default true,
  moderation_status text not null default 'not_checked'
                      check (moderation_status in ('not_checked','pending','approved','flagged','blocked')),
  expires_at        timestamptz,                           -- NULL by default: shared notes do not expire
  disabled_at       timestamptz,
  disabled_reason   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger shares_updated_at before update on public.shares
  for each row execute function public.set_updated_at();
create index shares_board_id_idx   on public.shares (board_id);
create index shares_creator_id_idx on public.shares (creator_id);

-- A snapshot is a frozen copy of the shared objects, so later edits or deletion of the source
-- never change what the recipient sees.
create table public.share_items (
  id        bigint generated always as identity primary key,
  share_id  uuid not null references public.shares (id) on delete cascade,
  position  int not null,
  type      text not null,
  x double precision not null, y double precision not null,
  width double precision, height double precision, rotation double precision,
  z_index   int not null default 0,
  data      jsonb not null default '{}'::jsonb
);
create index share_items_share_id_idx on public.share_items (share_id);

-- assets a snapshot still needs (blocks garbage collection while the share exists)
create table public.share_assets (
  share_id uuid not null references public.shares (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete restrict,
  primary key (share_id, asset_id)
);
create index share_assets_asset_id_idx on public.share_assets (asset_id);

create table public.share_reports (
  id          bigint generated always as identity primary key,
  share_id    uuid references public.shares (id) on delete cascade,
  reporter_id uuid references public.profiles (id) on delete set null,
  reason      text check (reason is null or char_length(reason) <= 1000),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- invites, comments, reminders
-- ---------------------------------------------------------------------
create table public.board_invites (
  id          uuid primary key default gen_random_uuid(),
  board_id    uuid not null references public.boards (id) on delete cascade,
  inviter_id  uuid not null references public.profiles (id) on delete cascade,
  email       text check (email is null or char_length(email) <= 320),   -- stored lower-case; NULL = anyone holding the link
  role        text not null check (role in ('editor','viewer')),
  token_hash  text not null unique,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index board_invites_board_id_idx on public.board_invites (board_id);

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references public.boards (id) on delete cascade,
  object_id  uuid not null references public.board_objects (id) on delete cascade,
  author_id  uuid references public.profiles (id) on delete set null,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger comments_updated_at before update on public.comments
  for each row execute function public.set_updated_at();
create index comments_object_id_idx on public.comments (object_id);
create index comments_board_id_idx  on public.comments (board_id);

create table public.reminders (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete cascade,
  board_id            uuid not null references public.boards (id) on delete cascade,
  object_id           uuid not null references public.board_objects (id) on delete cascade,
  due_at              timestamptz not null,
  timezone            text,
  status              text not null default 'pending' check (status in ('pending','sent','dismissed','cancelled')),
  external_provider   text,
  external_event_id   text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger reminders_updated_at before update on public.reminders
  for each row execute function public.set_updated_at();
create index reminders_user_due_idx on public.reminders (user_id, due_at);

-- ---------------------------------------------------------------------
-- authorisation helpers. SECURITY DEFINER so policies can use them without recursing into
-- board_members' own policies; each only ever answers questions about the *caller*.
-- ---------------------------------------------------------------------
create function public.board_role(p_board uuid) returns text
language sql stable security definer set search_path = public as $$
  select m.role from public.board_members m
   where m.board_id = p_board and m.user_id = (select auth.uid())
$$;

create function public.can_read_board(p_board uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.board_members m
                  where m.board_id = p_board and m.user_id = (select auth.uid()))
$$;

-- editors and owners, and only while the board is neither locked nor archived
create function public.can_edit_board(p_board uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1
                   from public.board_members m
                   join public.boards b on b.id = m.board_id
                  where m.board_id = p_board
                    and m.user_id = (select auth.uid())
                    and m.role in ('owner','editor')
                    and b.locked_at is null and b.archived_at is null)
$$;

create function public.is_board_owner(p_board uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.board_members m
                  where m.board_id = p_board and m.user_id = (select auth.uid()) and m.role = 'owner')
$$;

-- do two people share at least one board? (lets members see each other's name/avatar, nothing else)
create function public.shares_board_with(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1
                   from public.board_members a
                   join public.board_members b on b.board_id = a.board_id
                  where a.user_id = (select auth.uid()) and b.user_id = p_user)
$$;

-- May the caller read this asset? Owner, member of its board, or member of a board that has an
-- object referencing it. object_assets rows can only be created by can_link_asset() below.
create function public.can_read_asset(p_asset uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.assets a
     where a.id = p_asset
       and a.status <> 'deleted'
       and (
         a.owner_id = (select auth.uid())
         or (a.board_id is not null and public.can_read_board(a.board_id))
         or exists (select 1
                      from public.object_assets oa
                      join public.board_objects o on o.id = oa.object_id
                     where oa.asset_id = a.id and public.can_read_board(o.board_id))
       ))
$$;

-- An object may only reference assets that belong to the same board or to the caller. This is what
-- stops "attach someone else's asset id to my object to read it".
create function public.can_link_asset(p_object uuid, p_asset uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.board_objects o
      join public.assets a on a.id = p_asset
     where o.id = p_object
       and public.can_edit_board(o.board_id)
       and a.status <> 'deleted'
       and (a.owner_id = (select auth.uid()) or a.board_id = o.board_id))
$$;
