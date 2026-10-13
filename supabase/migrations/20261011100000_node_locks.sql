-- v0.8.4 PIN-locked notes. Forward-only: nothing already applied is edited, and nothing here touches an existing row, membership or object.
--
-- WHAT THIS IS FOR. A locked note's words are encrypted in the browser (AES-GCM, key from the PIN with PBKDF2) before they are ever saved, so the ciphertext in
-- board_objects.data is all the database, a collaborator or a board owner can read. A 4-8 digit PIN has few possible values, so encryption alone would let anyone
-- who copied the ciphertext try every PIN offline. This table adds a second, server-held ingredient: the key is also mixed with a random per-note secret that the
-- server hands out ONLY for a correct PIN proof, and only a few wrong guesses at a time (growing cooldowns, counted per note, not per person, so extra accounts
-- do not buy extra guesses). The server never sees the PIN or the key: it stores a hash of a proof derived from the PIN, and a random secret.
--
-- WHAT THIS DOES NOT DO (see docs/dev/LOCKED-NOTES.md): someone who can read this whole table AND the ciphertext (the database operator, or an attacker who has
-- the database) can still try PINs offline, because they hold both ingredients. A board owner or collaborator has neither: node_locks has no policy and no grant,
-- so it can only be reached through the functions below.

create table if not exists public.node_locks (
  board_id      uuid not null references public.boards (id) on delete cascade,
  node_id       text not null check (node_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  verifier      text not null check (verifier ~ '^[0-9a-f]{64}$'),        -- sha256 of the PIN proof (the proof itself is derived in the browser; the PIN never leaves it)
  verifier_next text check (verifier_next is null or verifier_next ~ '^[0-9a-f]{64}$'),    -- a PIN change in flight: both PINs work until the new one is used once, so a crash can never lock the note out
  secret        text not null check (secret ~ '^[0-9a-f]{64}$'),           -- the server-held half of the key; stays the same across a PIN change
  fails         integer not null default 0,
  locked_until  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (board_id, node_id)
);
alter table public.node_locks enable row level security;
revoke all on public.node_locks from public, anon, authenticated;
-- (no policy on purpose: every read and write goes through the security-definer functions below)

-- seconds to wait after the n-th wrong PIN in a row (the same table is in js/lock.js and is tested against it)
create or replace function public.node_lock_wait(p_fails integer) returns integer
language sql immutable as $$
  select case when p_fails < 3 then 0 when p_fails = 3 then 10 when p_fails = 4 then 30 when p_fails = 5 then 60
              when p_fails = 6 then 300 when p_fails = 7 then 900 when p_fails = 8 then 3600 else 86400 end
$$;

create or replace function public.create_node_lock(p_board uuid, p_node text, p_proof text) returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); sec text; cur public.node_locks;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'ANONYMOUS_NOT_ALLOWED' using errcode = '42501'; end if;
  if not public.can_edit_board(p_board) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_node is null or p_node !~ '^[A-Za-z0-9_-]{1,64}$' or p_proof is null or p_proof !~ '^[0-9a-f]{64}$' then raise exception 'BAD_REQUEST' using errcode = '22023'; end if;
  select * into cur from public.node_locks where board_id = p_board and node_id = p_node for update;
  if found and cur.owner_id <> uid then raise exception 'LOCK_NOT_OWNER' using errcode = '42501'; end if;     -- someone else's lock is never replaced
  sec := encode(sha256(convert_to(gen_random_uuid()::text || gen_random_uuid()::text, 'utf8')), 'hex');
  insert into public.node_locks (board_id, node_id, owner_id, verifier, secret)
  values (p_board, p_node, uid, encode(sha256(convert_to(p_proof, 'utf8')), 'hex'), sec)
  on conflict (board_id, node_id) do update
    set verifier = excluded.verifier, verifier_next = null, secret = excluded.secret, fails = 0, locked_until = null, updated_at = now();
  return sec;
end $$;

-- the shared "check a proof, count a miss" step used by unlock / change / remove. Returns {ok, wait, fails, secret?, next?}
create or replace function public.node_lock_check(p_board uuid, p_node text, p_proof text, p_require_owner boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); l public.node_locks; h text; w integer;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  if p_proof is null or p_proof !~ '^[0-9a-f]{64}$' then raise exception 'BAD_REQUEST' using errcode = '22023'; end if;
  if p_require_owner then
    if not public.can_edit_board(p_board) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  elsif not public.can_read_board(p_board) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select * into l from public.node_locks where board_id = p_board and node_id = p_node for update;
  if not found then raise exception 'LOCK_NOT_FOUND' using errcode = 'P0001'; end if;
  if p_require_owner and l.owner_id <> uid then raise exception 'LOCK_NOT_OWNER' using errcode = '42501'; end if;
  if l.locked_until is not null and l.locked_until > now() then      -- cooling down: the proof is not even looked at
    return jsonb_build_object('ok', false, 'wait', ceil(extract(epoch from (l.locked_until - now())))::int, 'fails', l.fails);
  end if;
  h := encode(sha256(convert_to(p_proof, 'utf8')), 'hex');
  if h = l.verifier or (l.verifier_next is not null and h = l.verifier_next) then
    if l.verifier_next is not null and h = l.verifier_next then      -- the new PIN has now been used: it replaces the old one
      update public.node_locks set verifier = verifier_next, verifier_next = null, fails = 0, locked_until = null, updated_at = now() where board_id = p_board and node_id = p_node;
    else
      update public.node_locks set fails = 0, locked_until = null, updated_at = now() where board_id = p_board and node_id = p_node;
    end if;
    return jsonb_build_object('ok', true, 'secret', l.secret, 'wait', 0, 'fails', 0);
  end if;
  w := public.node_lock_wait(l.fails + 1);
  update public.node_locks set fails = l.fails + 1, locked_until = case when w > 0 then now() + make_interval(secs => w) else null end, updated_at = now()
   where board_id = p_board and node_id = p_node;
  return jsonb_build_object('ok', false, 'wait', w, 'fails', l.fails + 1);
end $$;
revoke all on function public.node_lock_check(uuid, text, text, boolean) from public, anon, authenticated;

create or replace function public.unlock_node(p_board uuid, p_node text, p_proof text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  return public.node_lock_check(p_board, p_node, p_proof, false);
end $$;

-- starts a PIN change: the OLD proof must be right (and is counted like any other guess). Both PINs work until the new one is used once.
create or replace function public.change_node_lock(p_board uuid, p_node text, p_old_proof text, p_new_proof text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if p_new_proof is null or p_new_proof !~ '^[0-9a-f]{64}$' then raise exception 'BAD_REQUEST' using errcode = '22023'; end if;
  r := public.node_lock_check(p_board, p_node, p_old_proof, true);
  if (r ->> 'ok')::boolean then
    update public.node_locks set verifier_next = encode(sha256(convert_to(p_new_proof, 'utf8')), 'hex'), updated_at = now() where board_id = p_board and node_id = p_node;
  end if;
  return r;
end $$;

create or replace function public.remove_node_lock(p_board uuid, p_node text, p_proof text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  r := public.node_lock_check(p_board, p_node, p_proof, true);
  if (r ->> 'ok')::boolean then delete from public.node_locks where board_id = p_board and node_id = p_node; end if;
  return r - 'secret';
end $$;

-- how long to wait before the next guess (so the dialog can say so before anyone types); reveals nothing about the PIN
create or replace function public.node_lock_state(p_board uuid, p_node text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare l public.node_locks;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  if not public.can_read_board(p_board) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select * into l from public.node_locks where board_id = p_board and node_id = p_node;
  if not found then return jsonb_build_object('exists', false, 'wait', 0, 'fails', 0, 'mine', false); end if;
  return jsonb_build_object('exists', true, 'fails', l.fails, 'mine', l.owner_id = auth.uid(),
    'wait', case when l.locked_until is not null and l.locked_until > now() then ceil(extract(epoch from (l.locked_until - now())))::int else 0 end);
end $$;

revoke all on function public.create_node_lock(uuid, text, text), public.unlock_node(uuid, text, text), public.change_node_lock(uuid, text, text, text),
  public.remove_node_lock(uuid, text, text), public.node_lock_state(uuid, text), public.node_lock_wait(integer) from public, anon;
grant execute on function public.create_node_lock(uuid, text, text), public.unlock_node(uuid, text, text), public.change_node_lock(uuid, text, text, text),
  public.remove_node_lock(uuid, text, text), public.node_lock_state(uuid, text), public.node_lock_wait(integer) to authenticated;
