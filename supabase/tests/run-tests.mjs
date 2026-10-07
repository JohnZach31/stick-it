// Runs every migration on a fresh Postgres (PGlite) and then attacks it as different users.
//   cd supabase/tests && npm install && npm test
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const migDir = process.env.MIG_DIR || path.join(here, '..', 'migrations');   // MIG_DIR lets the mutation checks run against modified copies
const db = new PGlite();

// ---------------------------------------------------------------- setup
await db.exec(fs.readFileSync(path.join(here, 'prelude.sql'), 'utf8'));
for (const f of fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort()) {
  try { await db.exec(fs.readFileSync(path.join(migDir, f), 'utf8')); }
  catch (e) { console.error(`Migration ${f} failed: ${e.message}`); process.exit(1); }
}
console.log('migrations applied cleanly\n');

let pass = 0, fail = 0;
const failures = [];
let section = '';
function group(name) { section = name; console.log(name); }
function ok(cond, msg) {
  if (cond) { pass++; } else { fail++; failures.push(`${section}: ${msg}`); console.log('  FAIL  ' + msg); }
}
const uuid = () => crypto.randomUUID();

// run SQL as: 'su' (superuser), 'anon', 'service', or a user {id,email}
async function run(actor, sql, params = []) {
  await db.query('begin');
  try {
    if (actor === 'anon') await db.query('set local role anon');
    else if (actor === 'service') await db.query('set local role service_role');
    else if (actor !== 'su') {
      await db.query('set local role authenticated');
      await db.query("select set_config('request.jwt.claims', $1, true)",
        [JSON.stringify({ sub: actor.id, role: 'authenticated', email: actor.anonymous ? undefined : actor.email, is_anonymous: !!actor.anonymous })]);
    }
    const r = await db.query(sql, params);
    await db.query('commit');
    return { rows: r.rows, count: r.affectedRows };
  } catch (e) {
    await db.query('rollback');
    return { error: String(e.message), rows: [] };
  }
}
const denied = (r) => !!r.error && /permission denied|row-level security|violates|not allowed|FORBIDDEN|NOT_AUTHENTICATED/i.test(r.error);
const errIs = (r, re) => !!r.error && re.test(r.error);

// ---------------------------------------------------------------- users
const attest = (id) => run('su', "update public.profiles set age_band = 'adult', age_attested_at = now() where id = $1", [id]);
const mk = (name, plan = 'free') => ({ id: uuid(), email: `${name}@example.com`, name, plan });
const alice = mk('alice'), bob = mk('bob'), carol = mk('carol'), dave = mk('dave'), erin = mk('erin', 'premium'), mallory = mk('mallory');
for (const u of [alice, bob, carol, dave, erin, mallory]) {
  await run('su', 'insert into auth.users (id, email, raw_user_meta_data) values ($1,$2,$3::jsonb)',
    [u.id, u.email, JSON.stringify({ full_name: `${u.name} Example`, avatar_url: `https://img.example/${u.name}.png` })]);
  if (u.plan === 'premium') await run('su', "update public.profiles set plan='premium' where id=$1", [u.id]);
  await attest(u.id);
}

const board = async (u, name, key = null) => {
  const r = await run(u, 'select id, name, owner_id from public.create_board($1,$2,$3)', [name, null, key]);
  return r.error ? r : r.rows[0];
};
const sync = async (u, boardId, ups = [], dels = []) => {
  const r = await run(u, 'select public.sync_objects($1, $2::jsonb, $3::jsonb) as r', [boardId, JSON.stringify(ups), JSON.stringify(dels)]);
  return r.error ? { error: r.error } : r.rows[0].r;
};
const obj = (o = {}) => ({ id: uuid(), type: 'note', x: 10, y: 20, width: 250, rotation: 1, z_index: 1, data: { html: 'hello', bg: 'hsl(50,90%,80%)' }, ...o });

// ================================================================ A. profiles
group('A. profiles');
{
  const p = await run(alice, 'select id, display_name, plan, display_name_custom from public.profiles');
  ok(p.rows.length === 1 && p.rows[0].id === alice.id, 'alice sees only her own profile');
  ok(p.rows[0].display_name === 'alice Example', 'profile initialised from Google metadata');
  ok(p.rows[0].display_name_custom === false, 'name not flagged custom yet');
  ok(denied(await run(alice, "update public.profiles set plan='premium' where id=$1", [alice.id])), 'a user cannot change their own plan');
  ok(denied(await run(alice, 'insert into public.profiles (id, display_name) values ($1, $2)', [uuid(), 'fake'])), 'cannot insert profiles');
  const up = await run(alice, "update public.profiles set display_name='Ali' where id=$1 returning display_name_custom", [alice.id]);
  ok(up.rows[0] && up.rows[0].display_name_custom === true, 'editing the name marks it custom');
  const mine = await run(alice, "update public.profiles set display_name='Hacked' where id=$1 returning id", [bob.id]);
  ok(mine.rows.length === 0, "cannot edit someone else's profile");
  ok((await run(dave, 'select id from public.profiles where id=$1', [alice.id])).rows.length === 0, 'strangers cannot read profiles');
  const login = await run('su', "update auth.users set raw_user_meta_data = raw_user_meta_data || '{\"full_name\":\"Changed At Google\"}' where id=$1", [alice.id]);
  ok((await run('su', 'select display_name from public.profiles where id=$1', [alice.id])).rows[0].display_name === 'Ali', 'later Google changes never overwrite the customised name');
}

// ================================================================ B. boards + plan limits
group('B. boards and plan limits');
let A1, A2;
{
  A1 = await board(alice, 'Alice one', 'local-board-1');
  A2 = await board(alice, 'Alice two');
  ok(A1.id && A2.id, 'free user can create 2 boards');
  const third = await board(alice, 'Alice three');
  ok(errIs(third, /BOARD_LIMIT_REACHED/), 'third board rejected on the free plan (server side)');
  const again = await board(alice, 'Alice one (retry)', 'local-board-1');
  ok(again.id === A1.id, 'same migration key returns the SAME board, even at the limit (idempotent retry)');
  const n = await run('su', 'select count(*)::int c from public.boards where owner_id=$1', [alice.id]);
  ok(n.rows[0].c === 2, 'retry created no duplicate');
  ok(denied(await run(alice, "insert into public.boards (owner_id, name) values ($1, 'sneaky')", [alice.id])), 'boards cannot be inserted directly (limit bypass)');
  ok((await run('su', 'select role from public.board_members where board_id=$1 and user_id=$2', [A1.id, alice.id])).rows[0]?.role === 'owner', 'owner membership row created with the board');
  ok(denied(await run(alice, 'update public.boards set owner_id=$1 where id=$2', [bob.id, A1.id])), 'owner_id cannot be reassigned by a client');
  ok((await run(alice, "update public.boards set name='Renamed', subtitle='Athens' where id=$1 returning id", [A1.id])).rows.length === 1, 'owner can rename / set subtitle');

  let made = 0; for (let i = 0; i < 6; i++) { const b = await board(erin, `E${i}`); if (b.id) made++; }
  ok(made === 6, 'premium user can create 6 boards');
  ok(errIs(await board(erin, 'E7'), /BOARD_LIMIT_REACHED/), 'seventh board rejected on premium');
  await run('su', "update public.plan_limits set max_boards=3 where plan='free'");
  const extra = await board(alice, 'Alice three');
  ok(!!extra.id, 'raising the limit in the central plan_limits table takes effect immediately');
  await run('su', "update public.plan_limits set max_boards=2 where plan='free'");
  await run('su', 'delete from public.boards where owner_id=$1 and name=$2', [alice.id, 'Alice three']);
}

// ================================================================ C. membership + invites
group('C. invites, roles and board isolation');
let inviteBob, inviteCarol;
{
  const ib = await run(alice, 'select public.create_invite($1,$2,$3) as r', [A1.id, 'bob@example.com', 'editor']);
  inviteBob = ib.rows[0].r;
  const ic = await run(alice, 'select public.create_invite($1,$2,$3) as r', [A1.id, 'carol@example.com', 'viewer']);
  inviteCarol = ic.rows[0].r;
  ok(inviteBob.token.length >= 60 && inviteBob.token !== inviteCarol.token, 'invite tokens are long and random');
  const stored = await run('su', 'select token_hash from public.board_invites where id=$1', [inviteBob.id]);
  ok(stored.rows[0].token_hash !== inviteBob.token, 'only a hash of the token is stored');

  ok(errIs(await run(dave, 'select public.accept_invite($1)', [inviteBob.token]), /INVITE_EMAIL_MISMATCH/), 'invite for bob cannot be used by dave');
  ok(!(await run(bob, 'select public.accept_invite($1) as b', [inviteBob.token])).error, 'bob accepts as editor');
  ok(errIs(await run(bob, 'select public.accept_invite($1)', [inviteBob.token]), /INVITE_USED/), 'an invite is single-use');
  ok(!(await run(carol, 'select public.accept_invite($1)', [inviteCarol.token])).error, 'carol accepts as viewer');
  ok(errIs(await run(dave, 'select public.accept_invite($1)', ['x'.repeat(64)]), /INVITE_NOT_FOUND/), 'unknown token rejected');
  const expired = (await run(alice, 'select public.create_invite($1,null,$2) as r', [A1.id, 'viewer'])).rows[0].r;
  await run('su', "update public.board_invites set expires_at = now() - interval '1 hour' where id=$1", [expired.id]);
  ok(errIs(await run(dave, 'select public.accept_invite($1)', [expired.token]), /INVITE_EXPIRED/), 'expired invite rejected');

  ok(errIs(await run(bob, 'select public.create_invite($1,null,$2)', [A1.id, 'editor']), /FORBIDDEN/), 'editor cannot invite');
  ok(denied(await run(alice, 'insert into public.board_members (board_id,user_id,role) values ($1,$2,$3)', [A1.id, dave.id, 'viewer'])), 'nobody can be added to a board without accepting an invite');

  // THE key isolation property
  const bobBoards = await run(bob, 'select id from public.boards order by name');
  ok(bobBoards.rows.length === 1 && bobBoards.rows[0].id === A1.id, "editor sees the ONE board they were invited to, not the owner's other board");
  ok((await run(bob, 'select id from public.boards where id=$1', [A2.id])).rows.length === 0, "membership in A1 does not expose A2 (same owner)");
  ok((await run(dave, 'select id from public.boards')).rows.length === 0, 'non-member sees no boards');

  ok((await run(bob, 'update public.boards set name=$2 where id=$1 returning id', [A1.id, 'bob renamed'])).rows.length === 0, 'editor cannot rename the board');
  ok((await run(bob, 'delete from public.boards where id=$1 returning id', [A1.id])).rows.length === 0, 'editor cannot delete the board');
  ok((await run(carol, 'update public.boards set name=$2 where id=$1 returning id', [A1.id, 'x'])).rows.length === 0, 'viewer cannot rename the board');
  ok((await run(bob, "update public.board_members set role='owner' where board_id=$1 and user_id=$2 returning user_id", [A1.id, bob.id])).rows.length === 0 ||
     denied(await run(bob, "update public.board_members set role='owner' where board_id=$1 and user_id=$2", [A1.id, bob.id])), 'editor cannot promote themselves');
  const members = await run(bob, 'select user_id, role from public.board_members where board_id=$1', [A1.id]);
  ok(members.rows.length === 3, 'members can see who is on their board');
  ok((await run(bob, 'select display_name from public.profiles where id=$1', [alice.id])).rows.length === 1, 'co-members can see each other\'s name');
  ok((await run(bob, 'select id from public.profiles where id=$1', [dave.id])).rows.length === 0, 'but not strangers');
  ok((await run(alice, "update public.board_members set role='viewer' where board_id=$1 and user_id=$2 returning user_id", [A1.id, bob.id])).rows.length === 1, 'owner can change a role');
  await run(alice, "update public.board_members set role='editor' where board_id=$1 and user_id=$2", [A1.id, bob.id]);
  ok((await run(alice, "delete from public.board_members where board_id=$1 and user_id=$2 returning user_id", [A1.id, alice.id])).rows.length === 0, 'owner row cannot be removed');
}

// ================================================================ D. objects
group('D. board objects: roles, versions, direct-write attacks');
const o1 = obj({ data: { html: 'first', bg: 'hsl(1,50%,80%)' } }), o2 = obj({ x: 300 }), o3 = obj({ type: 'photo', data: { photoStyle: 'polaroid', caption: 'Lucy' } });
let v1;
{
  const r = await sync(alice, A1.id, [o1, o2, o3]);
  ok(r.results?.length === 3 && r.results.every(x => x.status === 'ok' && x.version === 1), 'owner creates 3 objects (note + photo)');
  const upd = await sync(alice, A1.id, [{ ...o1, x: 99, base_version: 1 }]);
  ok(upd.results[0].status === 'ok' && upd.results[0].version === 2, 'update with the right base version bumps the version');
  const stale = await sync(bob, A1.id, [{ ...o1, x: 5, base_version: 1 }]);
  ok(stale.results[0].status === 'conflict' && stale.results[0].server.x === 99, 'stale base version returns a conflict with the server copy');
  const bobEdit = await sync(bob, A1.id, [{ ...o1, x: 123, base_version: 2 }, obj({ x: 700 })]);
  ok(bobEdit.results.every(x => x.status === 'ok'), 'editor can update and create');
  const who = await run('su', 'select created_by, updated_by from public.board_objects where id=$1', [o1.id]);
  ok(who.rows[0].created_by === alice.id && who.rows[0].updated_by === bob.id, 'authorship is set by the server');

  const carolWrite = await sync(carol, A1.id, [obj()]);
  ok(carolWrite.results?.[0]?.status === 'denied', 'viewer cannot create objects');
  const carolEdit = await sync(carol, A1.id, [{ ...o2, x: 1, base_version: 1 }]);
  ok(carolEdit.results?.[0]?.status === 'denied', 'viewer cannot edit objects');
  const carolDel = await sync(carol, A1.id, [], [o2.id]);
  ok((carolDel.deleted || []).length === 0, 'viewer cannot delete objects');
  const daveWrite = await sync(dave, A1.id, [obj()]);
  ok(daveWrite.results?.[0]?.status === 'denied', 'non-member cannot create objects');
  ok((await run(dave, 'select id from public.board_objects')).rows.length === 0, 'non-member reads nothing');
  ok((await run(carol, 'select id from public.board_objects where board_id=$1', [A1.id])).rows.length >= 4, 'viewer can read the board');

  // malicious: hijack an existing object by reusing its id from my own board
  const M1 = await board(mallory, 'Mallory board');
  const steal = await sync(mallory, M1.id, [{ ...o1, x: 1, base_version: 3 }]);
  ok(steal.results?.[0]?.status === 'denied', "cannot pull someone else's object into my board by id");
  const steal2 = await sync(mallory, M1.id, [{ ...o1, base_version: null }]);
  ok(steal2.results?.[0]?.status === 'denied', 'cannot overwrite an object id that exists on a board I cannot see');
  ok((await run('su', 'select board_id from public.board_objects where id=$1', [o1.id])).rows[0].board_id === A1.id, 'object never left its board');

  // direct table access
  ok(denied(await run(bob, 'update public.board_objects set version=999 where id=$1', [o1.id])), 'version is not client-writable');
  ok(denied(await run(bob, 'update public.board_objects set created_by=$1 where id=$2', [bob.id, o1.id])), 'created_by is not client-writable');
  ok(denied(await run(bob, 'delete from public.board_objects where id=$1', [o1.id])), 'no hard deletes from the client');
  const spoof = await run(bob, 'insert into public.board_objects (id,board_id,type,x,y,created_by,version) values ($1,$2,$3,1,1,$4,50) returning created_by, version', [uuid(), A1.id, 'note', alice.id]);
  ok(spoof.rows[0]?.created_by === bob.id && Number(spoof.rows[0]?.version) === 1, 'inserted rows cannot spoof author or version');
  ok(denied(await run(carol, "update public.board_objects set x=5 where board_id=$1", [A1.id])) || (await run(carol, "update public.board_objects set x=5 where board_id=$1 returning id", [A1.id])).rows.length === 0, 'viewer direct UPDATE changes nothing');
  ok(denied(await run(bob, "update public.board_objects set type='photo' where id=$1", [o1.id])), 'object type is immutable');

  // content safety + limits
  const bad1 = await sync(alice, A1.id, [obj({ data: { html: '<script>alert(1)</script>' } })]);
  ok(bad1.results[0].status === 'invalid', 'script tags refused');
  const bad2 = await sync(alice, A1.id, [obj({ data: { html: '<img src=x onerror=alert(1)>' } })]);
  ok(bad2.results[0].status === 'invalid', 'inline event handlers refused');
  const bad3 = await sync(alice, A1.id, [obj({ data: { html: '<a href="javascript:alert(1)">x</a>' } })]);
  ok(bad3.results[0].status === 'invalid', 'javascript: links refused');
  const fine = await sync(alice, A1.id, [obj({ data: { html: 'I typed onclick= and <b>bold</b>' } })]);
  ok(fine.results[0].status === 'ok', 'ordinary text containing "onclick=" is fine');
  const huge = await sync(alice, A1.id, [obj({ data: { html: 'x'.repeat(300000) } })]);
  ok(huge.results[0].status === 'invalid', 'oversized payload refused');
  const badnum = await sync(alice, A1.id, [obj({ x: 'nope' })]);
  ok(badnum.results[0].status === 'invalid', 'garbage coordinates refused without failing the batch');
  const mixed = await sync(alice, A1.id, [obj({ x: 'nope' }), obj({ x: 5 })]);
  ok(mixed.results[0].status === 'invalid' && mixed.results[1].status === 'ok', 'one bad object does not block the others');
  ok(errIs(await run(alice, "select public.sync_objects($1, '{}'::jsonb, '[]'::jsonb)", [A1.id]), /BAD_REQUEST/), 'malformed request rejected');

  // soft delete + undo
  const del = await sync(bob, A1.id, [], [o2.id]);
  ok(del.deleted.length === 1, 'editor can delete (soft)');
  ok((await run('su', 'select deleted_at from public.board_objects where id=$1', [o2.id])).rows[0].deleted_at !== null, 'delete is soft (row kept for undo / realtime)');
  const cur = (await run('su', 'select version from public.board_objects where id=$1', [o2.id])).rows[0].version;
  const undo = await sync(bob, A1.id, [{ ...o2, base_version: Number(cur) }]);
  ok(undo.results[0].status === 'ok', 'writing a deleted object brings it back (undo)');
  ok((await run('su', 'select deleted_at from public.board_objects where id=$1', [o2.id])).rows[0].deleted_at === null, 'object is live again');

  // object cap
  await run('su', "update public.plan_limits set max_objects_per_board = 5 where plan='free'");
  const cap = await sync(alice, A2.id, Array.from({ length: 7 }, () => obj()));
  ok(cap.results.filter(x => x.status === 'ok').length === 5 && cap.results.some(x => x.status === 'invalid'), 'per-board object cap is enforced');
  await run('su', "update public.plan_limits set max_objects_per_board = 1000 where plan='free'");

  // locked board (future downgrade handling): read-only for everyone, still deletable
  await run('su', 'update public.boards set locked_at = now() where id=$1', [A2.id]);
  ok((await sync(alice, A2.id, [obj()])).results[0].status === 'denied', 'a locked board is read-only even for its owner');
  ok((await run(alice, 'select id from public.board_objects where board_id=$1 limit 1', [A2.id])).rows.length === 1, 'locked board can still be read');
  ok((await run(alice, "update public.boards set name='x' where id=$1 returning id", [A2.id])).rows.length === 0, 'locked board cannot be renamed');
  await run('su', 'update public.boards set locked_at = null where id=$1', [A2.id]);
}

// ================================================================ E. assets + storage
group('E. assets and storage');
let assetA, assetB;
const meta = (size, mimetype) => JSON.stringify({ size, mimetype });
{
  const ca = await run(alice, 'select * from public.create_asset($1,$2,$3,$4,$5,$6,$7)', [A1.id, 'image', 'image/jpeg', 120000, 'Beach Photo (1).jpg', 800, 500]);
  assetA = ca.rows[0];
  ok(assetA && assetA.status === 'pending' && assetA.storage_path.startsWith(`a/${assetA.id}/`) && !assetA.storage_path.includes(alice.id) && !assetA.storage_path.includes(A1.id), 'server issues an opaque storage path (no user or board id in it)');
  ok(!/[ ()]/.test(assetA.storage_path.split('/').pop()), 'file name is sanitised');
  ok(errIs(await run(alice, 'select * from public.create_asset($1,$2,$3,$4)', [A1.id, 'image', 'image/svg+xml', 1000]), /MIME_NOT_ALLOWED/), 'SVG uploads are refused');
  ok(errIs(await run(alice, 'select * from public.create_asset($1,$2,$3,$4)', [A1.id, 'image', 'text/html', 1000]), /MIME_NOT_ALLOWED/), 'HTML uploads are refused');
  ok(errIs(await run(alice, 'select * from public.create_asset($1,$2,$3,$4)', [A1.id, 'image', 'image/jpeg', 99999999]), /FILE_TOO_LARGE/), 'oversized image refused');
  ok(errIs(await run(alice, 'select * from public.create_asset($1,$2,$3,$4)', [A1.id, 'video', 'video/mp4', 60 * 1024 * 1024]), /FILE_TOO_LARGE/), 'video over 50 MB refused');
  ok(!(await run(alice, 'select * from public.create_asset($1,$2,$3,$4)', [A1.id, 'audio', 'audio/webm;codecs=opus', 34000])).error, 'audio/webm;codecs=opus accepted (codec suffix ignored)');
  ok(errIs(await run(carol, 'select * from public.create_asset($1,$2,$3,$4)', [A1.id, 'image', 'image/png', 1000]), /FORBIDDEN/), 'viewer cannot register uploads');
  ok(errIs(await run(dave, 'select * from public.create_asset($1,$2,$3,$4)', [A1.id, 'image', 'image/png', 1000]), /FORBIDDEN/), 'non-member cannot register uploads');
  const idem = await run(alice, 'select * from public.create_asset($1,$2,$3,$4,null,null,null,null,null,$5)', [A1.id, 'image', 'image/jpeg', 120000, assetA.id]);
  ok(idem.rows[0]?.id === assetA.id, 'retrying create_asset with the same id returns the same asset');
  ok(errIs(await run(mallory, 'select * from public.create_asset($1,$2,$3,$4,null,null,null,null,null,$5)', [(await run('su', 'select id from public.boards where owner_id=$1', [mallory.id])).rows[0].id, 'image', 'image/jpeg', 1000, assetA.id]), /FORBIDDEN/), "cannot claim someone else's asset id");

  // uploads
  ok(!(await run(alice, "insert into storage.objects (bucket_id,name,owner,metadata) values ('media',$1,$2,$3::jsonb)", [assetA.storage_path, alice.id, meta(120000, 'image/jpeg')])).error, 'owner uploads to the issued path');
  ok(denied(await run(alice, "insert into storage.objects (bucket_id,name,owner,metadata) values ('media','users/x/random.jpg',$1,$2::jsonb)", [alice.id, meta(1, 'image/jpeg')])), 'cannot upload to a path the server did not issue');
  const asB = (await run(bob, 'select * from public.create_asset($1,$2,$3,$4)', [A1.id, 'image', 'image/png', 5000])).rows[0];
  assetB = asB;
  ok(!!asB, 'editor can register an upload on the shared board');
  ok(denied(await run(carol, "insert into storage.objects (bucket_id,name,owner,metadata) values ('media',$1,$2,$3::jsonb)", [asB.storage_path, carol.id, meta(5000, 'image/png')])), "viewer cannot upload to an editor's pending path");
  ok(denied(await run(alice, "insert into storage.objects (bucket_id,name,owner,metadata) values ('media',$1,$2,$3::jsonb)", [asB.storage_path, alice.id, meta(5000, 'image/png')])), "cannot upload against someone else's asset");
  ok(!(await run(bob, "insert into storage.objects (bucket_id,name,owner,metadata) values ('media',$1,$2,$3::jsonb)", [asB.storage_path, bob.id, meta(5000, 'image/png')])).error, 'editor uploads to their own issued path');
  ok(denied(await run(bob, "update storage.objects set metadata='{}'::jsonb where name=$1", [asB.storage_path])) || (await run(bob, "update storage.objects set metadata='{}'::jsonb where name=$1 returning id", [asB.storage_path])).rows.length === 0, 'existing files cannot be overwritten');

  // finalise
  const fin = await run(alice, 'select public.finalize_asset($1) as r', [assetA.id]);
  ok(fin.rows[0].r.ok === true && fin.rows[0].r.asset.status === 'ready', 'finalize marks the asset ready');
  ok(errIs(await run(bob, 'select public.finalize_asset($1)', [assetA.id]), /FORBIDDEN/), "only the owner finalises an asset");
  const wrong = (await run(bob, 'select * from public.create_asset($1,$2,$3,$4)', [A1.id, 'image', 'image/png', 4000])).rows[0];
  await run(bob, "insert into storage.objects (bucket_id,name,owner,metadata) values ('media',$1,$2,$3::jsonb)", [wrong.storage_path, bob.id, meta(4000, 'text/html')]);
  const bad = await run(bob, 'select public.finalize_asset($1) as r', [wrong.id]);
  ok(bad.rows[0].r.ok === false && bad.rows[0].r.error === 'MIME_NOT_ALLOWED', 'finalize rejects a file whose real type is not allowed');
  ok((await run('su', 'select 1 from public.storage_tombstones where storage_path=$1', [wrong.storage_path])).rows.length === 1, 'the rejected file is queued for deletion');
  const missing = (await run(bob, 'select * from public.create_asset($1,$2,$3,$4)', [A1.id, 'image', 'image/png', 4000])).rows[0];
  ok((await run(bob, 'select public.finalize_asset($1) as r', [missing.id])).rows[0].r.error === 'UPLOAD_NOT_FOUND', 'finalize notices a missing upload');

  // reads
  ok((await run(alice, 'select name from storage.objects where name=$1', [assetA.storage_path])).rows.length === 1, 'owner reads own file');
  ok((await run(bob, 'select name from storage.objects where name=$1', [assetA.storage_path])).rows.length === 1, 'board member can read board media');
  ok((await run(carol, 'select name from storage.objects where name=$1', [assetA.storage_path])).rows.length === 1, 'viewer can read board media');
  ok((await run(dave, 'select name from storage.objects where name=$1', [assetA.storage_path])).rows.length === 0, 'non-member cannot read media');
  ok((await run('anon', 'select name from storage.objects where name=$1', [assetA.storage_path])).rows.length === 0, 'anonymous cannot read media');
  ok((await run(dave, 'select id from public.assets')).rows.length === 0, 'non-member cannot list assets');

  // reference an asset from an object, then check the attack
  const withAsset = obj({ type: 'photo', data: { photoStyle: 'polaroid', assetId: assetA.id } });
  const good = await sync(alice, A1.id, [withAsset]);
  ok(good.results[0].status === 'ok', 'object referencing its own board asset is accepted');
  ok((await run('su', 'select role from public.object_assets where object_id=$1', [withAsset.id])).rows[0]?.role === 'primary', 'object_assets row maintained from data.assetId');
  const M1id = (await run('su', 'select id from public.boards where owner_id=$1', [mallory.id])).rows[0].id;
  const attack = await sync(mallory, M1id, [obj({ type: 'photo', data: { assetId: assetA.id } })]);
  ok(attack.results[0].status === 'denied', "cannot reference someone else's asset from my own object");
  ok((await run(mallory, 'select id from public.assets where id=$1', [assetA.id])).rows.length === 0, 'so the asset stays invisible to the attacker');
  ok((await run(mallory, 'select name from storage.objects where name=$1', [assetA.storage_path])).rows.length === 0, 'and its file stays unreadable');
  ok(denied(await run(mallory, 'insert into public.object_assets (object_id, asset_id, role) values ($1,$2,$3)', [withAsset.id, assetA.id, 'primary'])), 'direct object_assets insert cannot grant access either');
  ok(denied(await run(mallory, 'update public.boards set cover_asset_id=$1, cover_mode=$2 where id=$3', [assetA.id, 'upload', M1id])) || (await run(mallory, "update public.boards set cover_asset_id=$1, cover_mode='upload' where id=$2 returning id", [assetA.id, M1id])).rows.length === 0, "cannot set someone else's asset as my board cover");
  ok((await run(alice, "update public.boards set cover_asset_id=$1, cover_mode='upload' where id=$2 returning id", [assetA.id, A1.id])).rows.length === 1, 'owner can use a board asset as the cover');

  // storage quota
  await run('su', "update public.plan_limits set max_storage_bytes = 130000 where plan='free'");
  ok(errIs(await run(alice, 'select * from public.create_asset($1,$2,$3,$4)', [A1.id, 'image', 'image/png', 50000]), /STORAGE_QUOTA_EXCEEDED/), 'per-user storage quota enforced by plan');
  await run('su', "update public.plan_limits set max_storage_bytes = 209715200 where plan='free'");
}

// ================================================================ F. sharing
group('F. sharing');
let snap, live, tokens = {};
{
  const shot = await run(alice, 'select public.create_share($1,$2,$3::uuid[],$4) as r', ['object_snapshot', A1.id, `{${o1.id}}`, 'Alice']);
  snap = shot.rows[0].r;
  ok(snap.token && snap.token.length >= 60, 'note share returns a long random token');
  const rows = await run('su', 'select token_hash, share_type from public.shares where id=$1', [snap.id]);
  ok(rows.rows[0].token_hash !== snap.token && rows.rows[0].share_type === 'object_snapshot', 'token itself is not stored');

  ok(denied(await run(alice, 'select public.resolve_share($1)', [snap.token])), 'signed-in users cannot call the resolver');
  ok(denied(await run('anon', 'select public.resolve_share($1)', [snap.token])), 'anonymous cannot call the resolver directly');
  ok(denied(await run('anon', 'select * from public.shares')), 'anonymous cannot read shares');
  ok(denied(await run(alice, 'select * from public.share_items')), 'clients cannot read snapshot storage directly');
  ok(denied(await run(alice, "insert into public.shares (token_hash, creator_id, share_type) values ('x', $1, 'board_live')", [alice.id])), 'shares cannot be inserted directly');
  ok(denied(await run(alice, 'update public.shares set is_active=true where id=$1', [snap.id])), 'shares cannot be updated directly');

  let res = (await run('service', 'select public.resolve_share($1) as r', [snap.token])).rows[0].r;
  ok(res.ok && res.type === 'object_snapshot' && res.objects.length === 1 && res.objects[0].data.html === 'first', 'service role resolves the snapshot');
  ok(res.by_name === 'Alice', 'shows who shared it');
  const asStr = JSON.stringify(res);
  ok(!asStr.includes(alice.id) && !asStr.includes('example.com') && !asStr.includes(A1.id), 'payload contains no user id, e-mail or board id');
  ok(res.objects[0].board_id === undefined && res.objects[0].created_by === undefined, 'payload carries no internal columns');

  // immutability
  const cur = Number((await run('su', 'select version from public.board_objects where id=$1', [o1.id])).rows[0].version);
  await sync(alice, A1.id, [{ ...o1, data: { html: 'EDITED AFTER SHARING' }, base_version: cur }]);
  res = (await run('service', 'select public.resolve_share($1) as r', [snap.token])).rows[0].r;
  ok(res.objects[0].data.html === 'first', 'a note snapshot does not change when the source is edited');
  await sync(alice, A1.id, [], [o1.id]);
  res = (await run('service', 'select public.resolve_share($1) as r', [snap.token])).rows[0].r;
  ok(res.ok && res.objects[0].data.html === 'first', 'nor when the source is deleted');

  // group snapshot: relative layout preserved, media retained
  const withAsset = (await run('su', "select o.id from public.board_objects o join public.object_assets oa on oa.object_id=o.id limit 1")).rows[0].id;
  const grp = (await run(alice, 'select public.create_share($1,$2,$3::uuid[],$4) as r', ['group_snapshot', A1.id, `{${o3.id},${withAsset}}`, 'Alice'])).rows[0].r;
  const gres = (await run('service', 'select public.resolve_share($1) as r', [grp.token])).rows[0].r;
  ok(gres.objects.length === 2 && Object.keys(gres.assets).length === 1, 'group snapshot keeps both objects and the media it needs');
  ok(gres.assets[assetA.id]?.mime === 'image/jpeg', 'asset metadata is included for signing');

  // roles
  ok(errIs(await run(carol, 'select public.create_share($1,$2,$3::uuid[])', ['group_snapshot', A1.id, `{${o3.id}}`]), /FORBIDDEN/), 'viewer cannot publish shares');
  ok(errIs(await run(dave, 'select public.create_share($1,$2)', ['board_live', A1.id]), /FORBIDDEN/), 'non-member cannot publish shares');
  ok(errIs(await run(bob, 'select public.create_share($1,$2)', ['board_live', A1.id]), /FORBIDDEN/), 'editor cannot publish a live board link');
  ok(!(await run(bob, 'select public.create_share($1,$2,$3::uuid[])', ['object_snapshot', A1.id, `{${o3.id}}`])).error, 'editor can share a snapshot');
  const M1id = (await run('su', 'select id from public.boards where owner_id=$1', [mallory.id])).rows[0].id;
  ok(errIs(await run(mallory, 'select public.create_share($1,$2,$3::uuid[])', ['object_snapshot', M1id, `{${o3.id}}`]), /NOTHING_TO_SHARE/), "cannot snapshot an object that is not on my board");
  ok(errIs(await run(alice, 'select public.create_share($1,$2,$3::uuid[])', ['object_snapshot', A1.id, `{${o3.id},${o2.id}}`]), /BAD_REQUEST/), 'a single-object share takes exactly one object');

  // live board
  live = (await run(alice, 'select public.create_share($1,$2,null,$3) as r', ['board_live', A1.id, 'Alice'])).rows[0].r;
  let lres = (await run('service', 'select public.resolve_share($1) as r', [live.token])).rows[0].r;
  const liveBefore = lres.objects.length;
  ok(lres.ok && lres.board.name === 'Renamed' && liveBefore >= 3, 'live board share shows the board');
  ok(!JSON.stringify(lres).includes('Alice two') && !JSON.stringify(lres).includes(A2.id), "live share exposes nothing from the owner's other board");
  await sync(alice, A1.id, [obj({ data: { html: 'added later' } })]);
  lres = (await run('service', 'select public.resolve_share($1) as r', [live.token])).rows[0].r;
  ok(lres.objects.length === liveBefore + 1, 'live share reflects later changes');
  ok(!(lres.objects.some(o => o.data.html === 'EDITED AFTER SHARING')), 'deleted objects vanish from the live board');

  // states
  const garbage = (await run('service', 'select public.resolve_share($1) as r', ['nope'])).rows[0].r;
  ok(garbage.ok === false && garbage.reason === 'not_found', 'invalid token -> not_found');
  ok((await run('service', 'select public.resolve_share($1) as r', ['a'.repeat(64)])).rows[0].r.reason === 'not_found', 'unknown token -> not_found');
  await run('su', "update public.shares set moderation_status='blocked' where id=$1", [snap.id]);
  ok((await run('service', 'select public.resolve_share($1) as r', [snap.token])).rows[0].r.reason === 'blocked', 'blocked share is not served');
  await run('su', "update public.shares set moderation_status='approved' where id=$1", [snap.id]);
  ok((await run('service', 'select public.resolve_share($1) as r', [snap.token])).rows[0].r.ok === true, 'approved share is served');
  await run('su', "update public.shares set expires_at = now() - interval '1 minute' where id=$1", [snap.id]);
  ok((await run('service', 'select public.resolve_share($1) as r', [snap.token])).rows[0].r.reason === 'expired', 'expired share is not served');
  await run('su', 'update public.shares set expires_at = null where id=$1', [snap.id]);
  ok((await run(carol, 'select public.disable_share($1) as d', [live.id])).rows[0].d === false, "another user cannot disable someone's share");
  ok((await run(alice, 'select public.disable_share($1) as d', [live.id])).rows[0].d === true, 'creator can disable a share');
  ok((await run('service', 'select public.resolve_share($1) as r', [live.token])).rows[0].r.reason === 'disabled', 'disabled share is not served');
  ok((await run(alice, 'select id from public.shares')).rows.length >= 3 && (await run(bob, 'select id from public.shares')).rows.length === 1, 'people see only their own shares');
  ok((await run(alice, 'select token_hash from public.shares limit 1')).rows[0].token_hash !== undefined, '(hash only ever visible to its owner)');

  // snapshot survives deleting the whole board
  const snap2 = (await run(alice, 'select public.create_share($1,$2,$3::uuid[]) as r', ['object_snapshot', A1.id, `{${withAsset}}`])).rows[0].r;
  ok((await run(alice, 'delete from public.boards where id=$1 returning id', [A1.id])).rows.length === 1, 'owner can delete the board');
  const after = (await run('service', 'select public.resolve_share($1) as r', [snap2.token])).rows[0].r;
  ok(after.ok && after.objects.length === 1 && after.assets[assetA.id], 'a snapshot (and its media) survives the source board being deleted');
  const liveGone = (await run('service', 'select public.resolve_share($1) as r', [live.token])).rows[0].r;
  ok(liveGone.ok === false, 'a live board link stops working when the board is gone');
  ok((await run('su', 'select status from public.assets where id=$1', [assetA.id])).rows[0].status === 'ready', 'the media row is kept while a snapshot needs it');
  tokens.snap2 = snap2;
}

// ================================================================ G. garbage collection
group('G. garbage collection');
{
  ok(denied(await run(alice, 'select * from public.gc_claim_orphan_assets()')), 'clients cannot run GC');
  ok(denied(await run(alice, 'select public.gc_purge_deleted_objects()')), 'clients cannot purge objects');
  await run('su', "update public.assets set created_at = now() - interval '30 days'");
  const claimed = (await run('service', 'select id from public.gc_claim_orphan_assets()')).rows.map(r => r.id);
  ok(!claimed.includes(assetA.id), 'an asset kept alive by a snapshot is NOT collected');
  ok(claimed.includes(assetB.id), 'an unreferenced old asset is collected');
  const finish = await run('service', 'select public.gc_finish_assets($1::uuid[]) as n', [`{${claimed.join(',')}}`]);
  ok(Number(finish.rows[0].n) === claimed.length, 'claimed rows are removed');
  ok((await run('su', 'select 1 from public.storage_tombstones where storage_path=$1', [assetB.storage_path])).rows.length === 1, 'their files are queued for deletion from Storage');

  // undo-safety: assets used by a soft-deleted object survive until the object is purged
  const B3 = await board(bob, 'Bob board');
  const a3 = (await run(bob, 'select * from public.create_asset($1,$2,$3,$4)', [B3.id, 'image', 'image/png', 3000])).rows[0];
  const ob = obj({ type: 'photo', data: { assetId: a3.id } });
  await sync(bob, B3.id, [ob]);
  await sync(bob, B3.id, [], [ob.id]);
  await run('su', "update public.assets set created_at = now() - interval '30 days' where id=$1", [a3.id]);
  ok(!(await run('service', 'select id from public.gc_claim_orphan_assets()')).rows.some(r => r.id === a3.id), 'media of a soft-deleted object is kept (undo still possible)');
  await run('service', "select public.gc_purge_deleted_objects(interval '0 seconds')");
  ok((await run('su', 'select 1 from public.board_objects where id=$1', [ob.id])).rows.length === 0, 'purge hard-deletes long-deleted objects');
  ok((await run('service', 'select id from public.gc_claim_orphan_assets()')).rows.some(r => r.id === a3.id), 'once the object is gone its media becomes collectable');
}

// ================================================================ H. comments, reminders, anon, cascade
group('H. comments, reminders, anonymous access, account deletion');
{
  const C = await board(carol, 'Carol board');
  const co = obj();
  await sync(carol, C.id, [co]);
  const link = (await run(carol, 'select public.create_invite($1,$2,$3) as r', [C.id, 'dave@example.com', 'viewer'])).rows[0].r;
  await run(dave, 'select public.accept_invite($1)', [link.token]);
  ok(!(await run(carol, 'insert into public.comments (board_id, object_id, author_id, body) values ($1,$2,$3,$4)', [C.id, co.id, carol.id, 'nice'])).error, 'owner can comment');
  ok(denied(await run(dave, 'insert into public.comments (board_id, object_id, author_id, body) values ($1,$2,$3,$4)', [C.id, co.id, dave.id, 'hi'])), 'viewer cannot comment (policy is a deliberate default)');
  ok(denied(await run(carol, 'insert into public.comments (board_id, object_id, author_id, body) values ($1,$2,$3,$4)', [C.id, co.id, dave.id, 'as dave'])), 'cannot comment in someone else\'s name');
  ok((await run(dave, 'select id from public.comments where board_id=$1', [C.id])).rows.length === 1, 'members read comments');
  ok(!(await run(carol, "insert into public.reminders (user_id, board_id, object_id, due_at, timezone) values ($1,$2,$3, now() + interval '1 day', 'Asia/Jerusalem')", [carol.id, C.id, co.id])).error, 'reminder on my own board object');
  ok(denied(await run(mallory, "insert into public.reminders (user_id, board_id, object_id, due_at) values ($1,$2,$3, now())", [mallory.id, C.id, co.id])), 'no reminders on boards I cannot read');
  ok((await run(dave, 'select id from public.reminders')).rows.length === 0, 'reminders are private to their owner');

  for (const t of ['profiles', 'boards', 'board_objects', 'assets', 'shares', 'board_members', 'comments', 'reminders', 'board_invites', 'plan_limits']) {
    ok(denied(await run('anon', `select 1 from public.${t} limit 1`)), `anon has no access to ${t}`);
  }
  ok(denied(await run('anon', 'select * from public.create_board($1)', ['x'])), 'anon cannot create boards');
  ok(denied(await run('anon', 'select public.ensure_profile()')), 'anon cannot call RPCs');
  ok(errIs(await run({ email: 'nobody@example.com' }, "select * from public.create_board('x')"), /NOT_AUTHENTICATED/), 'authenticated role without a user id is rejected');

  // deleting an account leaves no orphaned files
  const before = (await run('su', 'select count(*)::int c from public.storage_tombstones')).rows[0].c;
  const doomed = mk('doomed');
  await run('su', 'insert into auth.users (id,email) values ($1,$2)', [doomed.id, doomed.email]);
  await attest(doomed.id);
  const DB = await board(doomed, 'Doomed');
  const da = (await run(doomed, 'select * from public.create_asset($1,$2,$3,$4)', [DB.id, 'image', 'image/png', 2000])).rows[0];
  const del = await run('su', 'delete from auth.users where id=$1', [doomed.id]);
  ok(!del.error, 'a user can be deleted');
  ok((await run('su', 'select 1 from public.boards where owner_id=$1', [doomed.id])).rows.length === 0, 'their boards are gone');
  ok((await run('su', 'select count(*)::int c from public.storage_tombstones')).rows[0].c === before + 1, 'their storage files are queued for removal');
}

// ================================================================ I. account settings
group('I. account settings, avatars, frozen share identity, account deletion');
{
  const meta2 = (size, mime) => JSON.stringify({ size, mimetype: mime });
  const up = (u, path, size, mime) => run(u, "insert into storage.objects (bucket_id,name,owner,metadata) values ('media',$1,$2,$3::jsonb)", [path, u.id, meta2(size, mime)]);
  const u1 = mk('iris'), u2 = mk('jack'), u3 = mk('kate');
  for (const u of [u1, u2, u3]) await run('su', 'insert into auth.users (id,email,raw_user_meta_data) values ($1,$2,$3::jsonb)', [u.id, u.email, JSON.stringify({ full_name: u.name, avatar_url: 'https://img.example/' + u.name })]);
  for (const u of [u1, u2, u3]) await attest(u.id);

  // --- profile columns
  ok(!(await run(u1, "update public.profiles set avatar_style='emoji', avatar_emoji='🎸', avatar_color='#4a7c59' where id=$1", [u1.id])).error, 'owner edits fallback avatar style');
  ok(!!(await run(u1, "update public.profiles set avatar_color='red' where id=$1", [u1.id])).error, 'bad colour is rejected');
  ok(denied(await run(u1, "update public.profiles set avatar_url='https://evil.example/pixel.gif' where id=$1", [u1.id])), 'a browser cannot point avatar_url anywhere');
  ok(denied(await run(u1, "update public.profiles set avatar_asset_id=$2 where id=$1", [u1.id, uuid()])), 'avatar_asset_id can only change through set_avatar_asset');
  ok(denied(await run(u1, "update public.profiles set plan='premium' where id=$1", [u1.id])), 'plan still not writable');

  // --- private settings
  ok(!(await run(u1, "insert into public.profile_settings (user_id, bio, handle) values ($1,'Musician, designer','iris_j')", [u1.id])).error, 'owner creates settings');
  ok(denied(await run(u2, "insert into public.profile_settings (user_id, handle) values ($1,'x_user')", [u1.id])), 'cannot create settings for someone else');
  ok((await run(u2, 'select * from public.profile_settings')).rows.length === 0, 'settings are invisible to other users');
  ok(denied(await run('anon', 'select 1 from public.profile_settings')), 'anon has no access to settings');
  ok(!(await run(u2, "insert into public.profile_settings (user_id, handle) values ($1,'jack_z')", [u2.id])).error, 'second user creates settings');
  ok(errIs(await run(u2, "update public.profile_settings set handle='iris_j' where user_id=$1", [u2.id]), /duplicate key|unique/i), 'handles are unique on the server');
  ok(!!(await run(u2, "update public.profile_settings set handle='Has Space' where user_id=$1", [u2.id])).error, 'handle format enforced');
  ok(!!(await run(u2, "update public.profile_settings set bio=repeat('x',121) where user_id=$1", [u2.id])).error, 'bio capped at 120');
  ok(!!(await run(u2, "update public.profile_settings set share_default_identity='everyone' where user_id=$1", [u2.id])).error, 'enum values enforced');
  ok(!!(await run(u2, 'update public.profile_settings set user_id=$1 where user_id=$2', [u1.id, u2.id])).error, 'settings cannot be re-assigned to another user');
  ok(!(await run(u1, "update public.profile_settings set bio='שלום 你好 مرحبا' where user_id=$1", [u1.id])).error, 'bio accepts RTL and CJK text');

  // --- interface preferences (custom shortcuts) follow the account, privately
  ok(!(await run(u1, `update public.profile_settings set ui_prefs='{"shortcuts":{"newNote":"M"}}'::jsonb where user_id=$1`, [u1.id])).error, 'owner saves interface preferences');
  ok((await run(u1, 'select ui_prefs from public.profile_settings where user_id=$1', [u1.id])).rows[0].ui_prefs.shortcuts.newNote === 'M', 'owner reads them back');
  ok((await run(u2, 'select ui_prefs from public.profile_settings where user_id=$1', [u1.id])).rows.length === 0, 'another user cannot read them');
  ok(!!(await run(u2, `update public.profile_settings set ui_prefs='[]'::jsonb where user_id=$1`, [u2.id])).error, 'ui_prefs must be a JSON object');
  ok(!!(await run(u2, `update public.profile_settings set ui_prefs=jsonb_build_object('x', repeat('y', 9000)) where user_id=$1`, [u2.id])).error, 'ui_prefs is capped at 8 kB');
  ok((await run(u2, `update public.profile_settings set ui_prefs='{"a":1}'::jsonb where user_id=$1 returning 1`, [u1.id])).rows.length === 0, 'nobody can write anyone else’s preferences');
  // --- avatar upload: owner only, no board, size/mime checked, readable by collaborators
  const asA = (await run(u1, "select * from public.create_asset(null,'avatar','image/jpeg',90000)")).rows[0];
  ok(asA && asA.board_id === null && asA.kind === 'avatar', 'avatar asset created without a board');
  ok(errIs(await run(u1, "select * from public.create_asset(null,'image','image/jpeg',900)"), /FORBIDDEN/), 'other kinds still need a board');
  const B1 = await board(u1, 'Iris board');
  ok(errIs(await run(u1, "select * from public.create_asset($1,'avatar','image/jpeg',900)", [B1.id]), /FORBIDDEN/), 'an avatar cannot be attached to a board');
  ok(errIs(await run(u1, "select * from public.create_asset(null,'avatar','image/svg+xml',900)"), /MIME_NOT_ALLOWED/), 'SVG avatars are refused');
  ok(errIs(await run(u1, "select * from public.create_asset(null,'avatar','image/jpeg',3000000)"), /FILE_TOO_LARGE/), 'avatars over 2 MB are refused');
  ok(denied(await up(u2, asA.storage_path, 90000, 'image/jpeg')), 'another user cannot upload to my avatar path');
  ok(!(await up(u1, asA.storage_path, 90000, 'image/jpeg')).error, 'owner uploads the avatar file');
  ok(errIs(await run(u2, 'select * from public.set_avatar_asset($1)', [asA.id]), /FORBIDDEN/), "cannot adopt someone else's avatar asset");
  ok(errIs(await run(u1, 'select * from public.set_avatar_asset($1)', [asA.id]), /FORBIDDEN/), 'a pending (unverified) upload cannot be adopted');
  ok((await run(u1, 'select public.finalize_asset($1) as r', [asA.id])).rows[0].r.ok === true, 'avatar finalised');
  const setp = await run(u1, 'select * from public.set_avatar_asset($1)', [asA.id]);
  ok(setp.rows[0] && setp.rows[0].avatar_source === 'custom' && setp.rows[0].avatar_asset_id === asA.id, 'set_avatar_asset switches to the custom photo');
  ok((await run(u3, 'select name from storage.objects where name=$1', [asA.storage_path])).rows.length === 0, 'strangers cannot read my avatar file');
  const inv = (await run(u1, 'select public.create_invite($1,$2,$3) as r', [B1.id, u3.email, 'viewer'])).rows[0].r;
  ok(!(await run(u3, 'select public.accept_invite($1)', [inv.token])).error, 'kate joins the board');
  ok((await run(u3, 'select name from storage.objects where name=$1', [asA.storage_path])).rows.length === 1, 'a collaborator can read my profile photo');
  ok(errIs(await run(u3, 'select * from public.set_avatar_asset($1)', [asA.id]), /FORBIDDEN/), 'a collaborator cannot take my photo as theirs');
  const cl = await run(u1, "select * from public.clear_avatar('provider')");
  ok(cl.rows[0].avatar_source === 'provider' && cl.rows[0].avatar_asset_id === null, 'revert to the provider photo');
  ok(!!(await run(u1, "select * from public.clear_avatar('custom')")).error, 'clear_avatar only accepts provider/none');
  ok((await run(u3, 'select name from storage.objects where name=$1', [asA.storage_path])).rows.length === 0, 'after removal the collaborator loses access');
  await run(u1, 'select * from public.set_avatar_asset($1)', [asA.id]);

  // --- frozen identity on shares
  const so = obj({ data: { html: 'shared' } });
  await sync(u1, B1.id, [so]);
  const sh = (await run(u1, 'select public.create_share($1,$2,$3::uuid[],$4,$5,$6) as r', ['object_snapshot', B1.id, [so.id], 'Iris', true, true])).rows[0].r;
  let rs = (await run('service', 'select public.resolve_share($1) as r', [sh.token])).rows[0].r;
  ok(rs.by_name === 'Iris' && rs.by_bio === 'שלום 你好 مرحبا' && rs.by_avatar === asA.id, 'share carries the name, bio and avatar the creator switched on');
  ok(!!rs.assets[asA.id], 'and the avatar file is signable through the share');
  ok(!JSON.stringify(rs).includes('example.com') && !JSON.stringify(rs).includes(u1.id) && !JSON.stringify(rs).includes('iris_j'), 'no e-mail, user id or handle leaks');
  const sh2 = (await run(u1, 'select public.create_share($1,$2,$3::uuid[],$4) as r', ['object_snapshot', B1.id, [so.id], null])).rows[0].r;
  rs = (await run('service', 'select public.resolve_share($1) as r', [sh2.token])).rows[0].r;
  ok(rs.by_avatar === null && rs.by_bio === null && rs.by_name === null, 'default shares stay anonymous');
  await run(u1, "update public.profile_settings set bio='changed later' where user_id=$1", [u1.id]);
  rs = (await run('service', 'select public.resolve_share($1) as r', [sh.token])).rows[0].r;
  ok(rs.by_bio === 'שלום 你好 مرحبا', 'the identity on an existing link is frozen');
  const shLive = (await run(u1, 'select public.create_share($1,$2,null,$3,$4,$5) as r', ['board_live', B1.id, 'Iris', true, false])).rows[0].r;
  rs = (await run('service', 'select public.resolve_share($1) as r', [shLive.token])).rows[0].r;
  ok(rs.by_avatar === asA.id && !!rs.assets[asA.id] && rs.by_bio === null, 'live board link shows the avatar but not the bio when only the avatar is on');
  ok(denied(await run('anon', "select public.create_share('board_live',$1,null,'x',true,true)", [B1.id])), 'anon cannot create shares');
  ok(denied(await run(u1, 'select public.resolve_share($1)', [sh.token])), 'users still cannot call the resolver');
  ok(denied(await run(u1, 'select public.purge_user_data($1)', [u1.id])), 'users cannot call purge_user_data');
  ok(denied(await run('anon', 'select public.my_usage()')), 'anon cannot read usage');

  // --- avatars survive garbage collection while used, and are collected after they are replaced
  await run('su', "update public.assets set created_at = now() - interval '60 days'");
  let claimed = (await run('service', 'select * from public.gc_claim_orphan_assets()')).rows.map(r => r.id);
  ok(!claimed.includes(asA.id), 'GC never claims a profile photo that is in use');
  const asB = (await run(u1, "select * from public.create_asset(null,'avatar','image/png',5000)")).rows[0];
  await up(u1, asB.storage_path, 5000, 'image/png');
  await run(u1, 'select public.finalize_asset($1)', [asB.id]);
  await run(u1, 'select * from public.set_avatar_asset($1)', [asB.id]);
  await run('su', "update public.assets set created_at = now() - interval '60 days'");
  claimed = (await run('service', 'select * from public.gc_claim_orphan_assets()')).rows.map(r => r.id);
  ok(!claimed.includes(asA.id), 'the old avatar is kept while a share still uses it');
  await run('su', 'delete from public.shares where id = $1 or id = $2 or id = $3', [sh.id, sh2.id, shLive.id]);
  claimed = (await run('service', 'select * from public.gc_claim_orphan_assets()')).rows.map(r => r.id);
  ok(claimed.includes(asA.id) && !claimed.includes(asB.id), 'a replaced avatar is collected once nothing uses it; the current one stays');

  // --- usage
  const use = (await run(u1, 'select public.my_usage() as r')).rows[0].r;
  ok(use.plan === 'free' && use.boards === 1 && use.boards_limit === 2 && use.objects === 1 && use.storage_used > 0 && use.storage_quota > 0, 'my_usage reports plan, boards, objects and storage');
  ok(!('email' in use), 'usage exposes no e-mail');

  // --- account deletion
  const shD = (await run(u1, 'select public.create_share($1,$2,$3::uuid[],$4,$5,$6) as r', ['object_snapshot', B1.id, [so.id], 'Iris', true, false])).rows[0].r;
  const before = (await run('su', 'select count(*)::int c from public.storage_tombstones')).rows[0].c;
  const pd = await run('service', 'select public.purge_user_data($1)', [u1.id]);
  ok(!pd.error, 'purge_user_data runs for a user with boards, shares and a profile photo: ' + (pd.error || ''));
  ok((await run('su', 'select 1 from public.boards where owner_id=$1', [u1.id])).rows.length === 0, 'boards deleted');
  ok((await run('su', 'select 1 from public.shares where creator_id=$1', [u1.id])).rows.length === 0, 'their public links are deleted with them');
  ok((await run('service', 'select public.resolve_share($1) as r', [shD.token])).rows[0].r.reason === 'not_found', 'and stop resolving');
  ok((await run('su', 'select 1 from public.profile_settings where user_id=$1', [u1.id])).rows.length === 0, 'private settings deleted');
  ok((await run('su', 'select count(*)::int c from public.storage_tombstones')).rows[0].c > before, 'their files are queued for removal');
  ok((await run('su', 'select 1 from public.board_members where user_id=$1', [u1.id])).rows.length === 0, 'membership gone');
  ok((await run(u3, 'select 1 from public.boards where id=$1', [B1.id])).rows.length === 0, 'collaborators lose the deleted board');
}

// ================================================================ J. username availability
group('J. username availability check');
{
  const a = mk('jay1'), b = mk('jay2');
  for (const u of [a, b]) { await run('su', 'insert into auth.users (id,email) values ($1,$2)', [u.id, u.email]); await attest(u.id); }
  await run(a, "insert into public.profile_settings (user_id, handle) values ($1,'taken_name')", [a.id]);
  const chk = async (u, h) => (await run(u, 'select public.handle_available($1) as r', [h])).rows[0]?.r;
  ok((await chk(b, 'free_name')) === true, 'an unused username is available');
  ok((await chk(b, 'taken_name')) === false, "someone else's username is not available");
  ok((await chk(b, 'TAKEN_NAME')) === false, 'the check is case-insensitive');
  ok((await chk(a, 'taken_name')) === true, 'your own current username counts as available');
  ok((await chk(b, 'no')) === false && (await chk(b, 'has space')) === false && (await chk(b, null)) === false, 'malformed usernames are never available');
  ok(denied(await run('anon', "select public.handle_available('x_y_z')")), 'anon cannot call it');
  ok(errIs(await run({ email: 'x@example.com' }, "select public.handle_available('abc')"), /NOT_AUTHENTICATED/), 'a role without a user id is rejected');
  ok(errIs(await run(b, "insert into public.profile_settings (user_id, handle) values ($1,'taken_name')", [b.id]), /duplicate key|unique/i), 'the unique index still refuses a taken username');
}

// ================================================================ K. legal: age bands, parental consent, marketing preference, copyright reports
group('K. age bands, parental consent, marketing preference, copyright reports');
{
  const fresh = mk('fresh'), kid = mk('kidacct'), teen = mk('teenacct'), adult = mk('adult'), owner = mk('kowner');
  for (const u of [fresh, kid, teen, adult, owner]) await run('su', 'insert into auth.users (id,email) values ($1,$2)', [u.id, u.email]);
  await attest(owner.id);
  const B = await board(owner, 'Owner board');
  const inv = (await run(owner, 'select public.create_invite($1,$2,$3) as r', [B.id, fresh.email, 'editor'])).rows[0].r;

  // --- a signed-in account with NO band yet can hold no content, even through the API
  ok(errIs(await run(fresh, "select * from public.create_board('x')"), /AGE_NOT_CONFIRMED/), 'no band: no board');
  ok(errIs(await run(fresh, "select * from public.create_asset(null,'avatar','image/jpeg',900)"), /AGE_NOT_CONFIRMED/), 'no band: no upload');
  ok(errIs(await run(fresh, "insert into public.profile_settings (user_id, bio) values ($1,'hi')", [fresh.id]), /AGE_NOT_CONFIRMED/), 'no band: no bio or settings');
  ok(errIs(await run(fresh, 'select public.accept_invite($1)', [inv.token]), /AGE_NOT_CONFIRMED/), 'no band: cannot join a board');
  ok(errIs(await run(fresh, "select public.create_share('board_live',$1,null,'x')", [B.id]), /FORBIDDEN|AGE_NOT_CONFIRMED/), 'no band: no share links');

  // --- nothing about age can be written by a browser
  for (const col of ["age_band='adult'", 'age_attested_at = now()', "parental_consent_status='approved'", "terms_version='x'", "privacy_version='x'"]) {
    ok(denied(await run(fresh, `update public.profiles set ${col} where id=$1`, [fresh.id])), `a browser cannot write ${col.split('=')[0].trim()}`);
  }
  ok(denied(await run('anon', "select public.set_age_band('adult')")), 'anon cannot set a band');
  ok(!!(await run(fresh, "select public.set_age_band('senior')")).error, 'unknown bands are refused');

  // --- the band is recorded once, and only the band + timestamp + versions are stored
  const a1 = (await run(adult, "select * from public.set_age_band('adult','terms-1','privacy-1')")).rows[0];
  ok(a1.age_band === 'adult' && !!a1.age_attested_at && a1.parental_consent_status === 'not_required' && a1.terms_version === 'terms-1' && a1.privacy_version === 'privacy-1', 'adult: band, timestamp, versions; no consent needed');
  const a2 = (await run(adult, "select * from public.set_age_band('child')")).rows[0];
  ok(a2.age_band === 'adult' && String(a2.age_attested_at) === String(a1.age_attested_at), 'a second call cannot lower the band or move the timestamp');
  const cols = (await run('su', "select column_name from information_schema.columns where table_schema='public' and table_name in ('profiles','profile_settings','parental_consents') and (column_name ilike '%birth%' or column_name ilike '%dob%' or column_name ilike '%born%' or column_name ilike '%age%year%')")).rows;
  ok(cols.length === 0, 'no birth date, birth year or birthday column exists anywhere');
  ok(!(await run(adult, "select * from public.create_board('Adult board')")).error, 'adult: boards work');

  // --- teen: normal account, conservative defaults
  const t1 = (await run(teen, "select * from public.set_age_band('teen','terms-1','privacy-1')")).rows[0];
  ok(t1.age_band === 'teen' && t1.parental_consent_status === 'not_required', 'teen: no parental consent state');
  const ts = (await run(teen, 'select share_default_identity, share_show_avatar, share_show_bio, marketing_opt_in from public.profile_settings')).rows[0];
  ok(ts.share_default_identity === 'anonymous' && !ts.share_show_avatar && !ts.share_show_bio && !ts.marketing_opt_in, 'teen: shares anonymously, no photo/bio, no marketing by default');
  ok(!(await run(teen, "select * from public.create_board('Teen board')")).error, 'teen: boards work');
  ok(errIs(await run(teen, 'update public.profile_settings set marketing_opt_in = true'), /MARKETING_NOT_ALLOWED/), 'teen: cannot opt in to promotional e-mail');

  // --- child: no cloud use until a parent/guardian approves; nobody but the service role can approve
  const c1 = (await run(kid, "select * from public.set_age_band('child','terms-1','privacy-1')")).rows[0];
  ok(c1.age_band === 'child' && c1.parental_consent_status === 'pending_parent_consent', 'child: pending parent consent');
  ok(errIs(await run(kid, "select * from public.create_board('x')"), /PARENT_CONSENT_REQUIRED/), 'child: no board while pending');
  ok(errIs(await run(kid, "select * from public.create_asset(null,'avatar','image/jpeg',900)"), /PARENT_CONSENT_REQUIRED/), 'child: no upload while pending');
  ok(errIs(await run(kid, "insert into public.profile_settings (user_id, bio) values ($1,'hi')", [kid.id]), /PARENT_CONSENT_REQUIRED/), 'child: no bio/username while pending');
  const invK = (await run(owner, 'select public.create_invite($1,$2,$3) as r', [B.id, kid.email, 'viewer'])).rows[0].r;
  ok(errIs(await run(kid, 'select public.accept_invite($1)', [invK.token]), /PARENT_CONSENT_REQUIRED/), 'child: cannot join a board while pending');
  ok(denied(await run(kid, "select public.parental_consent_set($1,'approved','self')", [kid.id])), 'the child cannot approve themself');
  ok(denied(await run(adult, "select public.parental_consent_set($1,'approved','x')", [kid.id])), 'nor can any other signed-in user');
  ok(denied(await run('anon', "select public.parental_consent_set($1,'approved','x')", [kid.id])), 'nor anon');
  ok(denied(await run(kid, 'select * from public.parental_consents')) && denied(await run('anon', 'select * from public.parental_consents')), 'consent records are unreadable to browsers (parent details stay private)');
  ok(errIs(await run('service', "select public.parental_consent_set($1,'approved')", [kid.id]), /VERIFICATION_METHOD_REQUIRED/), 'approval needs a named verification method');
  ok(errIs(await run('service', "select public.parental_consent_set($1,'approved','x')", [adult.id]), /NOT_A_CHILD_ACCOUNT/), 'consent can only be recorded for a child account');
  const ap = (await run('service', "select * from public.parental_consent_set($1,'approved','manual_review_by_owner','privacy-1','parent@example.org')", [kid.id])).rows[0];
  ok(ap.parental_consent_status === 'approved', 'the service role can approve (after a verification the owner has chosen)');
  ok(!(await run(kid, "select * from public.create_board('Kid board')")).error, 'child: after approval the account works');
  ok(!(await run(kid, "select public.create_share('board_live', (select id from public.boards where owner_id=$1 limit 1), null, 'x')", [kid.id])).error, '...including links the child chooses to make');
  const cr = (await run('service', "select parent_contact, verification_method, approved_at is not null a from public.parental_consents where child_id=$1 order by requested_at desc limit 1", [kid.id])).rows[0];
  ok(cr && cr.verification_method === 'manual_review_by_owner' && cr.a === true && cr.parent_contact === 'parent@example.org', 'the consent record keeps method, time and (only if needed) the contact');
  ok(!JSON.stringify((await run(kid, 'select * from public.profiles')).rows).includes('parent@example.org'), 'parent contact never appears in the child profile');
  ok(errIs(await run(kid, 'insert into public.profile_settings (user_id, marketing_opt_in) values ($1, true)', [kid.id]), /MARKETING_NOT_ALLOWED/), 'child: never promotional e-mail, even after approval');
  const rv = (await run('service', "select * from public.parental_consent_set($1,'revoked','manual_review_by_owner')", [kid.id])).rows[0];
  ok(rv.parental_consent_status === 'revoked', 'consent can be revoked');
  ok(errIs(await run(kid, "select * from public.create_board('after revoke')"), /PARENT_CONSENT_REQUIRED/), 'after revocation the account stops working again');

  // --- marketing preference: adults only, off by default, timestamped, suppressed by unsubscribe
  await run(adult, 'insert into public.profile_settings (user_id) values ($1)', [adult.id]);
  let ps = (await run(adult, 'select marketing_opt_in, marketing_opt_in_at, marketing_opt_in_source from public.profile_settings')).rows[0];
  ok(ps.marketing_opt_in === false && ps.marketing_opt_in_at === null, 'marketing e-mail is OFF by default');
  ok((await run('service', 'select count(*)::int c from public.marketing_audience()')).rows[0].c === 0, 'nobody is in the marketing audience by default');
  await run(adult, 'update public.profile_settings set marketing_opt_in = true where user_id=$1', [adult.id]);
  ps = (await run(adult, 'select marketing_opt_in, marketing_opt_in_at, marketing_opt_in_source from public.profile_settings')).rows[0];
  ok(ps.marketing_opt_in === true && !!ps.marketing_opt_in_at && ps.marketing_opt_in_source === 'account_settings', 'an adult opting in records when and where');
  ok(denied(await run(adult, 'update public.profile_settings set marketing_opt_in_at = null where user_id=$1', [adult.id])), 'the record of consent cannot be edited by the user');
  const aud = (await run('service', 'select * from public.marketing_audience()')).rows;
  ok(aud.length === 1 && aud[0].email === adult.email, 'only the opted-in adult is in the audience (not the teen, not the child)');
  ok(denied(await run(adult, 'select * from public.marketing_audience()')) && denied(await run('anon', 'select * from public.marketing_audience()')), 'only the service role can read the audience');
  await run('su', 'alter table public.profile_settings disable trigger profile_settings_marketing');      // simulate bad data written around the trigger
  await run('su', "update public.profile_settings set marketing_opt_in = true where user_id=$1", [teen.id]);
  await run('su', 'alter table public.profile_settings enable trigger profile_settings_marketing');
  ok((await run('service', 'select count(*)::int c from public.marketing_audience()')).rows[0].c === 1, 'even a teen row flagged opted-in would not reach the audience');
  ok((await run('service', 'select public.marketing_unsubscribe($1) as r', [adult.id])).rows[0].r === true, 'unsubscribe works without a login');
  ok((await run('service', 'select count(*)::int c from public.marketing_audience()')).rows[0].c === 0, 'an unsubscribed person is suppressed');
  ps = (await run(adult, 'select marketing_opt_in, marketing_opt_in_source from public.profile_settings')).rows[0];
  ok(ps.marketing_opt_in === false && ps.marketing_opt_in_source === 'unsubscribe_link', 'withdrawal is recorded with its source');
  ok(denied(await run(adult, 'select public.marketing_unsubscribe($1)', [adult.id])), 'a signed-in user cannot call the service-only unsubscribe function');

  // --- abandoned accounts (never finished the age screen, never made anything)
  await run('su', "update public.profiles set created_at = now() - interval '30 days' where id = $1", [fresh.id]);
  const ab = (await run('service', 'select user_id from public.abandoned_accounts()')).rows.map(r => r.user_id);
  ok(ab.includes(fresh.id) && !ab.includes(adult.id) && !ab.includes(kid.id), 'the clean-up list holds only old, band-less, empty accounts');
  ok(denied(await run(adult, 'select * from public.abandoned_accounts()')), 'and only the service role can read it');

  // --- copyright reports: nobody but the service role
  const rep = { n: 'Rights Holder', e: 'rh@example.org', d: 'My photograph', u: 'https://example.org/#s=x', s: 'R. Holder' };
  const ins = (actor, over = {}) => run(actor, 'insert into public.copyright_reports (reporter_name, reporter_email, work_description, infringing_url, good_faith, accuracy_perjury, signature) values ($1,$2,$3,$4,$5,$6,$7)',
    [rep.n, rep.e, rep.d, rep.u, over.gf ?? true, over.acc ?? true, rep.s]);
  ok(denied(await ins('anon')) && denied(await ins(adult)), 'browsers cannot write or read copyright reports');
  ok(!(await ins('service')).error, 'the service role can record a report');
  ok(!!(await ins('service', { gf: false })).error && !!(await ins('service', { acc: false })).error, 'a report without the required statements is refused');
  ok(denied(await run(adult, 'select * from public.copyright_reports')) && denied(await run('anon', 'select * from public.copyright_reports')), 'reports are unreadable to browsers');

  // --- deleting an account removes preferences, parental-consent records and invites
  await run(owner, 'select public.create_invite($1,$2,$3)', [B.id, 'x@example.com', 'viewer']);
  await run('service', 'select public.purge_user_data($1)', [owner.id]);
  ok((await run('su', 'select 1 from public.board_invites where inviter_id=$1', [owner.id])).rows.length === 0, 'invite links made by a deleted account are gone');
  await run('service', 'select public.purge_user_data($1)', [adult.id]);
  ok((await run('su', 'select 1 from public.profile_settings where user_id=$1', [adult.id])).rows.length === 0, 'preferences are deleted with the account');
  await run('su', 'delete from auth.users where id=$1', [kid.id]);
  ok((await run('su', 'select 1 from public.parental_consents where child_id=$1', [kid.id])).rows.length === 0, 'parental-consent records (and the parent contact) are deleted with the child account');
}

// ================================================================ L. paper objects (photo strips, postcards, real cutouts)
group('L. photo strips and cutouts: asset references, sharing, garbage collection');
{
  const u = mk('lena'), v = mk('liam'), x = mk('lars');
  for (const p of [u, v, x]) { await run('su', 'insert into auth.users (id,email) values ($1,$2)', [p.id, p.email]); await attest(p.id); }
  const B = await board(u, 'Scraps');
  const asset = async (owner, board_id, kind = 'image', mime = 'image/jpeg', size = 4000, source = null) => {
    const id = uuid();
    await run('su', "insert into public.assets (id, owner_id, board_id, kind, storage_path, mime_type, byte_size, status, source_asset_id) values ($1,$2,$3,$4,$5,$6,$7,'ready',$8)",
      [id, owner.id, board_id, kind, `a/${id}/f`, mime, size, source]);
    return id;
  };
  const p1 = await asset(u, B.id), p2 = await asset(u, B.id), p3 = await asset(u, B.id), cut = await asset(u, B.id, 'cutout', 'image/png', 3000, p1);
  const objs = [uuid(), uuid(), uuid(), uuid()];                                // photo, strip, postcard, cutout-photo
  const up = (list) => run(u, 'select public.sync_objects($1,$2::jsonb,$3::jsonb) as r', [B.id, JSON.stringify(list), '[]']);
  const photoRow = (id, assetId, extra = {}) => ({ id, type: 'photo', x: 10, y: 10, width: 220, rotation: 0, z_index: 1, data: { assetId, photoStyle: 'polaroid', ...extra } });
  const stripRow = { id: objs[1], type: 'photo_strip', x: 300, y: 10, width: 140, rotation: 1, z_index: 2, data: { variant: 'vertical', caption: 'Trip', frames: [{ assetId: p1, ratio: 0.75 }, { assetId: p2, ratio: 0.66 }, { assetId: p3 }] } };
  const postRow = { id: objs[2], type: 'postcard', x: 20, y: 300, width: 320, rotation: -2, z_index: 3, data: { assetId: p3, location: 'Lisbon', message: 'Hello', variant: 'classic' } };
  const cutRow = photoRow(objs[3], p1, { photoStyle: 'cutout', cutoutAssetId: cut, cutoutRatio: 1.3 });
  const r1 = await up([photoRow(objs[0], p1), stripRow, postRow, cutRow]);
  ok(!r1.error && r1.rows[0].r.results.every((x) => x.status === 'ok'), 'strip, postcard and cutout objects are accepted like any other object type (no schema change per type)');
  const refs = (id) => run('su', 'select asset_id, role, sort_order from public.object_assets where object_id=$1 order by role, sort_order', [id]);
  const sr = (await refs(objs[1])).rows;
  ok(sr.length === 3 && sr.every((x) => x.role === 'attached') && sr.map((x) => x.sort_order).join() === '1,2,3', 'each picture in a strip is an "attached" asset reference, in strip order');
  ok((await refs(objs[2])).rows.some((x) => x.role === 'primary' && x.asset_id === p3), 'a postcard keeps its picture as the primary asset');
  const cr = (await refs(objs[3])).rows;
  ok(cr.some((x) => x.role === 'cutout' && x.asset_id === cut) && cr.some((x) => x.role === 'primary' && x.asset_id === p1), 'a cutout photo references both its original and its cutout');
  ok((await run('su', "select source_asset_id from public.assets where id=$1", [cut])).rows[0].source_asset_id === p1, 'the cutout asset records which original it came from');
  // reordering/removing frames updates the references
  const stripRow2 = { ...stripRow, data: { ...stripRow.data, frames: [{ assetId: p3 }, { assetId: p1 }] } };
  const base = (await run('su', 'select version from public.board_objects where id=$1', [objs[1]])).rows[0].version;
  const r2 = await up([{ ...stripRow2, base_version: base }]);
  ok(r2.rows[0].r.results[0].status === 'ok' && (await refs(objs[1])).rows.map((x) => x.asset_id).join() === [p3, p1].join(), 'editing a strip re-registers its pictures (the removed one is no longer referenced)');
  // a picture that is not yours and not on this board cannot be added to a strip
  const xb = await board(x, 'Lars board');
  const foreign = await asset(x, xb.id);
  const r3 = await up([{ ...stripRow2, base_version: base + 1, data: { ...stripRow.data, frames: [{ assetId: p1 }, { assetId: foreign }] } }]);
  ok(r3.rows[0].r.results[0].status === 'denied' || r3.rows[0].r.results[0].status === 'invalid', 'a strip cannot point at someone else\'s picture');
  ok((await run('su', 'select 1 from public.object_assets where object_id=$1 and asset_id=$2', [objs[1], foreign])).rows.length === 0, 'and nothing was linked');
  const bad = await up([{ ...stripRow, id: uuid(), data: { frames: [{ assetId: 'not-a-uuid' }] } }]);
  ok(bad.rows[0].r.results[0].status === 'invalid', 'a malformed picture id is rejected, not stored');
  // sharing includes every picture the shared objects use
  const sh = await run(u, "select public.create_share('group_snapshot', $1, $2::uuid[], 'Lena', false, false) as r", [B.id, `{${objs[1]},${objs[2]},${objs[3]}}`]);
  ok(!sh.error, 'a strip, a postcard and a cutout photo can be shared together');
  const sid = sh.rows[0]?.r?.id;
  const sa = (await run('su', 'select asset_id from public.share_assets where share_id=$1', [sid])).rows.map((r) => r.asset_id);
  ok([p1, p2, p3, cut].every((a) => sa.includes(a)) || ([p3, p1, cut].every((a) => sa.includes(a))), 'the snapshot keeps every picture alive, including the cutout (strip frames, postcard picture, cutout)');
  // deleting the standalone photo does not orphan what a strip still uses
  await run(u, "update public.board_objects set deleted_at = now() where id=$1", [objs[0]]);
  await run('su', "update public.assets set created_at = now() - interval '40 days'");
  const claimed = (await run('service', "select id from public.gc_claim_orphan_assets(interval '0 seconds')")).rows.map((r) => r.id);
  ok(!claimed.includes(p3) && !claimed.includes(p1) && !claimed.includes(cut), 'a picture still used by a strip, a postcard or a cutout is never garbage-collected');
  // a viewer cannot write strips
  await run(u, "insert into public.board_members (board_id, user_id, role) values ($1,$2,'viewer')", [B.id, v.id]).catch(() => {});
  const vr = await run(v, 'select public.sync_objects($1,$2::jsonb,$3::jsonb) as r', [B.id, JSON.stringify([{ ...stripRow, id: uuid() }]), '[]']);
  ok(vr.error || vr.rows[0].r.results.every((r) => r.status !== 'ok'), 'a viewer cannot add or change strips');

  // ---- Alphabet Soup is a Premium cosmetic: setting it needs the premium plan, seeing it never does
  const pia = mk('pia', 'premium');
  await run('su', 'insert into auth.users (id,email) values ($1,$2)', [pia.id, pia.email]); await attest(pia.id); await run('su', "update public.profiles set plan='premium' where id=$1", [pia.id]);
  const EB = await board(pia, 'Soup kitchen');
  await run('su', "insert into public.board_members (board_id, user_id, role) values ($1,$2,'editor') on conflict do nothing", [EB.id, u.id]);
  const soupId = uuid(), plainId = uuid();
  const note = (id, data) => ({ id, type: 'note', x: 5, y: 5, width: 250, rotation: 0, z_index: 1, data: { html: 'hello', bg: 'hsl(40,90%,80%)', ...data } });
  const putAs = (who, list, b) => run(who, 'select public.sync_objects($1,$2::jsonb,$3::jsonb) as r', [b.id, JSON.stringify(list), '[]']);
  const freeTry = await putAs(u, [note(plainId, { cosmetic: 'soup' })], EB);
  ok(freeTry.rows[0].r.results[0].status === 'invalid' && /PREMIUM_REQUIRED/.test(freeTry.rows[0].r.results[0].error), 'a free account cannot make an Alphabet Soup note (the server refuses, whatever the browser says)');
  ok((await run('su', 'select 1 from public.board_objects where id=$1', [plainId])).rows.length === 0, 'and nothing was stored');
  const premTry = await putAs(pia, [note(soupId, { cosmetic: 'soup' })], EB);
  ok(premTry.rows[0].r.results[0].status === 'ok', 'a Premium account can');
  const seen = await run(u, "select data ->> 'cosmetic' as c from public.board_objects where id=$1", [soupId]);
  ok(seen.rows[0]?.c === 'soup', 'a free collaborator can SEE the soup note (viewing never needs Premium)');
  const ver = (await run('su', 'select version from public.board_objects where id=$1', [soupId])).rows[0].version;
  const edit = await putAs(u, [{ ...note(soupId, { cosmetic: 'soup', html: 'edited by a free editor' }), base_version: ver }], EB);
  ok(edit.rows[0].r.results[0].status === 'ok', 'a free editor can still edit the words of an existing soup note');
  const ver2 = (await run('su', 'select version from public.board_objects where id=$1', [soupId])).rows[0].version;
  const off = await putAs(u, [{ ...note(soupId, { html: 'plain again' }), base_version: ver2 }], EB);
  ok(off.rows[0].r.results[0].status === 'ok', 'anyone can switch the cosmetic off');
  const ver3 = (await run('su', 'select version from public.board_objects where id=$1', [soupId])).rows[0].version;
  const on = await putAs(u, [{ ...note(soupId, { cosmetic: 'soup' }), base_version: ver3 }], EB);
  ok(on.rows[0].r.results[0].status === 'invalid', 'but a free account cannot switch it back on');
  ok(denied(await run(u, "update public.profiles set plan='premium' where id=$1", [u.id])), 'the plan cannot be self-granted');
  const direct = await run(u, "insert into public.board_objects (board_id, type, x, y, data) values ($1,'note',1,1,'{\"cosmetic\":\"soup\"}'::jsonb)", [EB.id]);
  ok(!!direct.error, 'a direct table write cannot bypass the Premium check either');
}

// ================================================================ M. collaboration: channel authorization, review, summary
group('M. collaboration: private presence channels, review states, comment summary');
{
  const o = mk('maya'), e = mk('milo'), vi = mk('mara'), out = mk('mort');
  for (const p of [o, e, vi, out]) { await run('su', 'insert into auth.users (id,email) values ($1,$2)', [p.id, p.email]); await attest(p.id); }
  const B = await board(o, 'Review board');
  for (const [p, role] of [[e, 'editor'], [vi, 'viewer']]) await run('su', 'insert into public.board_members (board_id, user_id, role) values ($1,$2,$3)', [B.id, p.id, role]);
  const objId = uuid(), otherId = uuid();
  await run(o, 'select public.sync_objects($1,$2::jsonb,$3::jsonb)', [B.id, JSON.stringify([
    { id: objId, type: 'note', x: 1, y: 1, width: 250, rotation: 0, z_index: 1, data: { html: 'please check', bg: 'hsl(40,90%,80%)' } },
    { id: otherId, type: 'note', x: 300, y: 1, width: 250, rotation: 0, z_index: 2, data: { html: 'other', bg: 'hsl(40,90%,80%)' } }]), '[]']);

  // ---- realtime channel authorization (the stand-in realtime.messages table exercises the real policy text)
  const topic = `board:${B.id}`;
  const asChan = async (actor, t, sql) => {
    await db.query('begin');
    try {
      await db.query('set local role authenticated');
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: actor.id, role: 'authenticated', email: actor.anonymous ? undefined : actor.email, is_anonymous: !!actor.anonymous })]);
      await db.query("select set_config('realtime.topic', $1, true)", [t]);
      const r = await db.query(sql); await db.query('commit'); return { rows: r.rows };
    } catch (x) { await db.query('rollback'); return { error: String(x.message), rows: [] }; }
  };
  ok(!(await asChan(e, topic, "insert into realtime.messages (topic, payload) values ('" + topic + "', '{}')")).error, 'a board member can send on the board\'s channel');
  ok(!!(await asChan(out, topic, "insert into realtime.messages (topic, payload) values ('" + topic + "', '{}')")).error, 'a stranger cannot send on it');
  ok((await asChan(vi, topic, 'select id from realtime.messages')).rows.length >= 1, 'a viewer can listen (they see who is present)');
  ok((await asChan(out, topic, 'select id from realtime.messages')).rows.length === 0, 'a stranger can not listen');
  ok(!!(await asChan(e, 'board:not-a-uuid', "insert into realtime.messages (topic, payload) values ('board:not-a-uuid', '{}')")).error, 'a malformed channel name is refused, not an error that leaks');
  ok(!!(await asChan(e, 'room:' + B.id, "insert into realtime.messages (topic, payload) values ('room:x', '{}')")).error, 'only board: channels are open to boards');

  // ---- the review state machine
  const rv = (who, st, why) => run(who, 'select public.set_review_state($1,$2,$3) as r', [objId, st, why ?? null]);
  ok(!(await rv(o, 'changes_requested', 'Tighten the caption')).error, 'the owner can request changes');
  ok((await run('su', 'select state, reason from public.object_reviews where object_id=$1', [objId])).rows[0].reason === 'Tighten the caption', 'with an optional reason');
  ok(errIs(await rv(e, 'changes_requested'), /FORBIDDEN/), 'an editor cannot request changes');
  ok(errIs(await rv(vi, 'ready_for_review'), /FORBIDDEN/), 'a viewer cannot mark anything ready');
  ok(errIs(await rv(out, 'ready_for_review'), /FORBIDDEN/), 'a stranger cannot touch review state');
  ok(!(await rv(e, 'ready_for_review')).error && (await run('su', 'select state, reason from public.object_reviews where object_id=$1', [objId])).rows[0].state === 'ready_for_review', 'an editor can mark it ready for review');
  ok((await run('su', 'select reason from public.object_reviews where object_id=$1', [objId])).rows[0].reason === null, 'the old request reason is cleared once it is marked ready');
  ok(errIs(await rv(e, 'none'), /FORBIDDEN/), 'an editor cannot resolve');
  ok((await run(vi, 'select state from public.object_reviews')).rows.length === 1, 'a viewer can see the state');
  ok((await run(out, 'select state from public.object_reviews')).rows.length === 0, 'a stranger cannot');
  ok(!(await rv(o, 'none')).error && (await run('su', 'select 1 from public.object_reviews where object_id=$1', [objId])).rows.length === 0, 'resolving returns the object to no state');
  ok(!!(await rv(o, 'urgent')).error, 'there are only the three states (no priorities)');
  ok(denied(await run(o, "insert into public.object_reviews (object_id, board_id, state) values ($1,$2,'changes_requested')", [otherId, B.id])), 'the table cannot be written directly');
  ok(denied(await run(o, "update public.object_reviews set state='ready_for_review'")), 'nor updated directly');
  ok(!!(await run(o, 'select public.set_review_state($1,$2,$3)', [uuid(), 'changes_requested', null])).error, 'an unknown object is refused');
  await run('su', "update public.boards set locked_at = now() where id=$1", [B.id]);
  ok(errIs(await rv(e, 'ready_for_review'), /FORBIDDEN/), 'on a locked board an editor cannot change review state');
  await run('su', "update public.boards set locked_at = null where id=$1", [B.id]);
  // deleting the object removes its review
  await rv(o, 'changes_requested', 'x');
  await run('su', 'delete from public.board_objects where id=$1', [objId]);
  ok((await run('su', 'select 1 from public.object_reviews where object_id=$1', [objId])).rows.length === 0, 'a review never outlives its object');

  // ---- comments are attached to objects only, and the summary counts them
  ok(!(await run(e, 'insert into public.comments (board_id, object_id, author_id, body) values ($1,$2,$3,$4)', [B.id, otherId, e.id, 'looks good'])).error, 'an editor can comment on an object');
  ok(denied(await run(vi, 'insert into public.comments (board_id, object_id, author_id, body) values ($1,$2,$3,$4)', [B.id, otherId, vi.id, 'hi'])), 'a viewer cannot comment');
  ok(!!(await run(e, 'insert into public.comments (board_id, object_id, author_id, body) values ($1,null,$2,$3)', [B.id, e.id, 'free floating'])).error, 'there are no free-floating comments (an object is required)');
  const sum = await run(vi, 'select public.board_collab_summary($1) as s', [B.id]);
  ok(sum.rows[0].s.comments.some((c) => c.object_id === otherId && c.count === 1), 'the summary gives a viewer the comment count per object');
  ok((await run(out, 'select public.board_collab_summary($1) as s', [B.id])).rows[0].s.comments.length === 0, 'and tells a stranger nothing');
}

// ================================================================ N. owner allowlist
group('N. owner allowlist: verified e-mail always gets premium');
{
  const ow = mk('owner'), fake = mk('fake'), late = mk('late');
  ow.email = 'JohnZachWS@Gmail.com'; fake.email = 'johnzachws@gmail.com'; late.email = 'johnzachws@gmail.com';
  await run('su', 'insert into auth.users (id,email,email_confirmed_at) values ($1,$2,now())', [ow.id, ow.email]);
  ok((await run('su', 'select plan from public.profiles where id=$1', [ow.id])).rows[0].plan === 'premium', 'a verified allowlisted e-mail (any letter case) gets premium at sign-up');
  await run('su', "update public.profiles set plan='free' where id=$1", [ow.id]);
  ok((await run('su', 'select plan from public.profiles where id=$1', [ow.id])).rows[0].plan === 'premium', 'a downgrade does not stick');
  await run('su', 'insert into auth.users (id,email) values ($1,$2)', [fake.id, fake.email.replace('johnzach', 'johnzach')]);
  ok((await run('su', 'select plan from public.profiles where id=$1', [fake.id])).rows[0].plan === 'free', 'an UNVERIFIED sign-up with the address gets nothing');
  await run('su', 'update auth.users set email_confirmed_at = now() where id=$1', [fake.id]);
  ok((await run('su', 'select plan from public.profiles where id=$1', [fake.id])).rows[0].plan === 'premium', 'it upgrades once the e-mail is verified');
  ok(denied(await run(ow, 'select email from public.premium_allowlist')), 'clients cannot read the allowlist');
  ok(denied(await run(ow, "insert into public.premium_allowlist (email) values ('x@y.z')")), 'clients cannot add to it');
  const other = mk('plain'); await run('su', 'insert into auth.users (id,email,email_confirmed_at) values ($1,$2,now())', [other.id, 'someone.else@gmail.com']);
  ok((await run('su', 'select plan from public.profiles where id=$1', [other.id])).rows[0].plan === 'free', 'any other verified account stays on the free plan');
}


// ================================================================ O. deleting comments
group('O. deleting comments: author, owner, and nobody else');
{
  const o = mk('olga'), a = mk('anya'), b = mk('boaz'), v = mk('vera'), out = mk('otto');
  for (const p of [o, a, b, v, out]) { await run('su', 'insert into auth.users (id,email) values ($1,$2)', [p.id, p.email]); await attest(p.id); }
  const B = await board(o, 'Moderated');
  for (const [p, role] of [[a, 'editor'], [b, 'editor'], [v, 'viewer']]) await run('su', 'insert into public.board_members (board_id, user_id, role) values ($1,$2,$3)', [B.id, p.id, role]);
  const objId = uuid();
  await run(o, 'select public.sync_objects($1,$2::jsonb,$3::jsonb)', [B.id, JSON.stringify([{ id: objId, type: 'note', x: 1, y: 1, width: 250, rotation: 0, z_index: 1, data: { html: 'hi', bg: 'hsl(40,90%,80%)' } }]), '[]']);
  const say = async (p, text) => (await run(p, 'insert into public.comments (board_id, object_id, author_id, body) values ($1,$2,$3,$4) returning id', [B.id, objId, p.id, text])).rows[0].id;
  const live = async (id) => (await run('su', 'select deleted_at from public.comments where id=$1', [id])).rows[0].deleted_at === null;
  const del = (p, id) => run(p, 'select public.delete_comment($1)', [id]);

  const byB = await say(b, 'boaz says hello'), byA = await say(a, 'anya says hello'), byA2 = await say(a, 'second');
  ok(denied(await del(a, byB)) && await live(byB), "user A (an editor) cannot delete user B's comment");
  ok(denied(await del(v, byB)) && await live(byB), 'a viewer cannot delete a comment');
  ok(denied(await del(out, byB)) && await live(byB) || (!(await del(out, byB)).error && await live(byB)), 'a stranger cannot delete it (and learns nothing about it)');
  ok(denied(await del('anon', byB)) && await live(byB), 'a signed-out caller cannot delete it');
  ok(!(await del(b, byB)).error && !(await live(byB)), 'the author can delete their own comment');
  ok(!(await del(o, byA)).error && !(await live(byA)), 'the board owner can delete any comment on the board');
  ok(!(await del(o, byB)).error, 'deleting twice is harmless');
  // direct writes are guarded too, not only the function
  ok(denied(await run(b, 'update public.comments set deleted_at = now() where id=$1', [byA2])) || (await live(byA2)), "an editor cannot delete someone else's comment by updating the row");
  ok(await live(byA2), '...and it is still there');
  ok(denied(await run(o, "update public.comments set body='rewritten by the owner' where id=$1", [byA2])) || (await run('su', 'select body from public.comments where id=$1', [byA2])).rows[0].body === 'second', "the owner cannot rewrite someone else's words");
  ok((await run('su', 'select body from public.comments where id=$1', [byA2])).rows[0].body === 'second', '...the words are unchanged');
  ok(!(await run(a, "update public.comments set body='edited by anya' where id=$1", [byA2])).error, 'an author can still edit their own words');
  ok(denied(await run(o, 'update public.comments set deleted_at = null where id=$1', [byA])), 'a deleted comment cannot be brought back through the API');
  ok(denied(await run(a, 'update public.comments set author_id = $2 where id=$1', [byA2, b.id])), 'a comment cannot be reassigned to someone else');
  // an author who has left the board can no longer touch the comment
  const byA3 = await say(a, 'third');
  await run('su', 'delete from public.board_members where board_id=$1 and user_id=$2', [B.id, a.id]);
  ok(!(await del(a, byA3)).error && await live(byA3), 'a former member deleting their old comment does nothing');
  ok(denied(await run(a, 'update public.comments set deleted_at = now() where id=$1', [byA3])) || (await live(byA3)), 'and cannot reach it by updating the row either');
}


// ---------------------------------------------------------------- anonymous guests (join by invitation, no account)
group('anonymous guests');
{
  const guest = { id: uuid(), email: null, anonymous: true };
  await run('su', 'insert into auth.users (id, email, raw_user_meta_data) values ($1,$2,$3::jsonb)', [guest.id, null, '{}']);
  await attest(guest.id);
  const A = (await run(alice, 'select id from public.create_board($1,$2,$3)', ['Guest board', null, 'k-' + uuid()])).rows[0];
  const open = (await run(alice, 'select public.create_invite($1,null,$2) as r', [A.id, 'editor'])).rows[0].r;
  const tied = (await run(alice, 'select public.create_invite($1,$2,$3) as r', [A.id, 'bob@example.com', 'editor'])).rows[0].r;
  ok(errIs(await run(guest, 'select public.accept_invite($1)', [tied.token]), /INVITE_EMAIL_MISMATCH/), 'an invitation tied to an e-mail address cannot be joined anonymously');
  ok(errIs(await run(guest, 'select id from public.boards where id = $1', [A.id]), /^$/) || (await run(guest, 'select id from public.boards where id = $1', [A.id])).rows.length === 0, 'before joining, a guest sees nothing of the board');
  ok(!(await run(guest, 'select public.accept_invite($1) as b', [open.token])).error, 'an anonymous guest can join with an open invitation');
  ok((await run(guest, 'select id from public.boards where id = $1', [A.id])).rows.length === 1, 'and then sees that board');
  const oid = uuid();
  ok(!(await run(guest, 'select public.sync_objects($1, $2::jsonb, $3::jsonb) as r', [A.id, JSON.stringify([{ id: oid, type: 'note', x: 1, y: 1, width: 200, height: 100, rotation: 0, z_index: 1, data: { html: 'hi' } }]), '[]'])).error, 'as an editor the guest can add notes');
  ok(errIs(await run(guest, 'select id from public.create_board($1,$2,$3)', ['Mine', null, 'k-' + uuid()]), /ANONYMOUS_NOT_ALLOWED/), 'a guest cannot create a board');
  ok(errIs(await run(guest, 'select public.create_invite($1,null,$2)', [A.id, 'viewer']), /ANONYMOUS_NOT_ALLOWED|FORBIDDEN/), 'a guest cannot create invitations');
  ok(errIs(await run(guest, "select public.create_share('group_snapshot', $1, array[$2::uuid], 'G', 'named', false, false)", [A.id, oid]), /ANONYMOUS_NOT_ALLOWED|FORBIDDEN|function/i), 'a guest cannot create share links');
  ok(denied(await run(guest, "insert into public.boards (owner_id, name) values ($1, 'x')", [guest.id])), 'nor insert a board directly');
  ok(errIs(await run(alice, "select id from public.create_board($1,$2,$3)", ['Alice again', null, 'k-' + uuid()]), /^$/) === false, 'accounts are unaffected');
}
// ---------------------------------------------------------------- summary
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFailures:\n - ' + failures.join('\n - ')); process.exit(1); }
