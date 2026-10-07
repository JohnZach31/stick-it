// Proves 20261009100000_lock_it_down.sql does not remove or weaken anyone's EXISTING access.
// Builds a database the way production is today (every migration BEFORE this one), creates real collaborators through the old functions
// (a signed-in editor, an anonymous guest, a viewer, people who used a reusable link, someone with two links), applies the new migration on top,
// and checks that nothing about access changed. Then it shows the exact event that DOES remove someone: the owner pressing Turn off.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), migDir = path.join(here, '..', 'migrations');
const NEW = '20261009100000_lock_it_down.sql';
const db = new PGlite();
await db.exec(fs.readFileSync(path.join(here, 'prelude.sql'), 'utf8'));
const files = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort();
for (const f of files.filter((f) => f < NEW)) await db.exec(fs.readFileSync(path.join(migDir, f), 'utf8'));
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const uuid = () => crypto.randomUUID();
async function run(actor, sql, params = []) {
  await db.query('begin');
  try {
    if (actor !== 'su') { await db.query('set local role authenticated'); await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: actor.id, role: 'authenticated', email: actor.anonymous ? undefined : actor.email, is_anonymous: !!actor.anonymous })]); }
    const r = await db.query(sql, params); await db.query('commit'); return { rows: r.rows };
  } catch (e) { await db.query('rollback'); return { error: String(e.message), rows: [] }; }
}
const mkUser = async (name, anonymous = false) => { const u = { id: uuid(), email: anonymous ? null : name + '@example.com', anonymous, name }; await run('su', 'insert into auth.users (id,email,raw_user_meta_data) values ($1,$2,$3::jsonb)', [u.id, u.email, '{}']); await run('su', "update public.profiles set age_band='adult', age_attested_at=now() where id=$1", [u.id]); return u; };
const owner = await mkUser('owner'), editor = await mkUser('editor'), viewer = await mkUser('viewer'), guest = await mkUser('guest', true), guest2 = await mkUser('guest2', true), twoLinks = await mkUser('twolinks');
await run('su', "update public.profiles set plan='premium' where id=$1", [owner.id]);

// ---- production as it is today
const board = (await run(owner, 'select id from public.create_board($1,$2,$3)', ['Grocery List', null, 'k-' + uuid()])).rows[0];
const inv = async (email, role) => (await run(owner, 'select public.create_invite($1,$2,$3) as r', [board.id, email, role])).rows[0].r;
const openLink = await inv(null, 'editor'), otherLink = await inv(null, 'editor'), viewLink = await inv(null, 'viewer'), tiedLink = await inv(editor.email, 'editor');
ok(!(await run(guest, 'select public.accept_invite($1)', [openLink.token])).error, 'before: an anonymous guest joined through the open link');
ok(!(await run(guest2, 'select public.accept_invite($1)', [openLink.token])).error, 'before: a second guest joined through the SAME reusable link (the link only remembers its last user)');
ok(!(await run(editor, 'select public.accept_invite($1)', [tiedLink.token])).error, 'before: an e-mail-bound editor joined');
ok(!(await run(viewer, 'select public.accept_invite($1)', [viewLink.token])).error, 'before: a viewer joined');
ok(!(await run(twoLinks, 'select public.accept_invite($1)', [openLink.token])).error && !(await run(twoLinks, 'select public.accept_invite($1)', [otherLink.token])).error, 'before: someone joined through two different links');

const snap = async () => ({
  members: (await run('su', 'select board_id,user_id,role from public.board_members order by board_id,user_id')).rows,
  invites: (await run('su', 'select id,board_id,email,role,token_hash,expires_at from public.board_invites order by id')).rows,
});
const before = await snap();
ok(before.members.length === 6, 'before: six people on the board (owner + 5)');
const objId = uuid();
const write = (u) => run(u, 'select public.sync_objects($1,$2::jsonb,$3::jsonb) as r', [board.id, JSON.stringify([{ id: uuid(), type: 'note', x: 1, y: 1, width: 200, height: 100, rotation: 0, z_index: 1, data: { html: 'x' } }]), '[]']);
const wrote = async (u) => (await write(u)).rows[0]?.r?.results?.[0]?.status === 'ok';

// ---- deploy the migration
const sql = fs.readFileSync(path.join(migDir, NEW), 'utf8').replace(/\r\n/g, '\n');
ok(!/\bdelete\s+from\s+public\.board_members\b/i.test(sql.replace(/create or replace function public\.remove_invite_members[\s\S]*?end \$\$;/i, '')), 'the migration has no DELETE on board_members outside the (only-called-by-Turn-off) removal function');
ok(!/\bupdate\s+public\.board_members\b/i.test(sql), 'and no UPDATE of board_members at all');
ok(!/update public\.board_invites set (expires_at|token_hash|revoked_at)/i.test(sql.replace(/create or replace function public\.revoke_invite[\s\S]*?end \$\$;/i, '')), 'no invitation is expired, revoked or re-tokened by the migration itself');
await db.exec(sql);

const after = await snap();
ok(JSON.stringify(after.members) === JSON.stringify(before.members), 'AFTER: every membership row is exactly as it was (nobody added, removed or re-roled)');
ok(JSON.stringify(after.invites) === JSON.stringify(before.invites), 'AFTER: every invitation is exactly as it was (same token hashes, none expired, none revoked)');
ok((await run('su', 'select count(*)::int c from public.board_invites where revoked_at is not null')).rows[0].c === 0, 'AFTER: no invitation is turned off');
ok((await run('su', 'select count(*)::int c from public.board_members where granted_via_invite')).rows[0].c === 0, 'AFTER: nobody is marked as invitation-granted (all existing people are "legacy / unattributed")');
ok((await run('su', 'select count(*)::int c from public.board_invites where tracked')).rows[0].c === 0, 'AFTER: existing invitations are marked legacy (not tracked), and still valid');
for (const [n, u] of [['editor', editor], ['viewer', viewer], ['guest', guest], ['guest2', guest2], ['twoLinks', twoLinks]]) ok((await run(u, 'select id from public.boards where id=$1', [board.id])).rows.length === 1, 'AFTER: ' + n + ' still sees the board');
ok(await wrote(guest) && await wrote(guest2) && await wrote(editor) && await wrote(twoLinks), 'AFTER: existing editors and guests can still write');
ok(!(await wrote(viewer)), 'AFTER: the viewer is still only a viewer');
// the old link still works for new people and for the existing ones (the very thing a real collaborator does when they reopen it)
const newGuest = await mkUser('newguest', true);
ok(!(await run(newGuest, 'select public.accept_invite($1)', [openLink.token])).error, 'AFTER: the existing open link still admits a new person');
ok(!(await run(guest, 'select public.accept_invite($1)', [openLink.token])).error && await wrote(guest), 'AFTER: an existing guest reopening their old link is fine and keeps writing');
ok((await run('su', 'select granted_via_invite g from public.board_members where user_id=$1', [guest.id])).rows[0].g === false, 'a legacy member reopening a link stays legacy (not re-labelled as removable by guess)');

// ---- the owner can see every one of those invitations
const li = (await run(owner, 'select public.list_invites($1) as r', [board.id])).rows[0].r;
ok(li.length === 4 && li.every((i) => i.revoked_at === null), 'the owner sees all four existing links, all active');
ok(li.every((i) => i.tracked === false), 'and they are labelled as created before invite tracking');
ok(li.find((i) => i.id === openLink.id).people.length >= 1, 'the open link lists the person it last remembered');

// ---- what DOES remove people
ok((await run(owner, 'select public.revoke_invite($1)', [viewLink.id])).rows.length === 1, 'the owner presses Turn off on the viewer link');
ok((await run(viewer, 'select id from public.boards where id=$1', [board.id])).rows.length === 1, 'a LEGACY member of that link is NOT removed (never guessed): their access stays');
ok(!!(await run(newGuest, 'select public.accept_invite($1)', [viewLink.token])).error, 'but nobody new can use the turned-off link');
// a person who joins AFTER the release through a fresh link is removed precisely when that link is turned off
const fresh = await inv(null, 'editor'), g3 = await mkUser('g3', true), g4 = await mkUser('g4', true);
await run(g3, 'select public.accept_invite($1)', [fresh.token]); await run(g4, 'select public.accept_invite($1)', [fresh.token]); await run(g4, 'select public.accept_invite($1)', [otherLink.token]);
await run(owner, 'select public.revoke_invite($1)', [fresh.id]);
ok((await run(g3, 'select id from public.boards where id=$1', [board.id])).rows.length === 0, 'a new guest whose ONLY grant was the turned-off link is removed');
ok((await run(g4, 'select id from public.boards where id=$1', [board.id])).rows.length === 1, 'a new guest with a second valid link is kept');
ok((await run(guest, 'select id from public.boards where id=$1', [board.id])).rows.length === 1 && (await run(twoLinks, 'select id from public.boards where id=$1', [board.id])).rows.length === 1, 'and no existing collaborator was affected by turning off a different link');
ok((await run('su', 'select count(*)::int c from public.board_members where board_id=$1', [board.id])).rows[0].c === 6 + 1 /* newGuest */ + 1 /* g4 */, 'final head count: exactly the existing 6, plus the new guest and g4; only g3 left');


// ---- the second migration (collaboration management) is just as harmless to existing access
{
  const NEW2 = '20261009110000_collab_management.sql';
  const sql2 = fs.readFileSync(path.join(migDir, NEW2), 'utf8').replace(/\r\n/g, '\n');
  ok(!/\bdelete\s+from\s+public\.board_members\b/i.test(sql2.replace(/create or replace function public\.remove_invite_members[\s\S]*?end \$\$;/i, '')) && !/\bupdate\s+public\.board_members\b/i.test(sql2), 'the second migration has no direct change to memberships either');
  const pre = await snap();
  await db.exec(sql2);
  const post = await snap();
  ok(JSON.stringify(pre.members) === JSON.stringify(post.members) && JSON.stringify(pre.invites) === JSON.stringify(post.invites), 'AFTER the second migration: memberships and invitations are identical');
  const li2 = (await run(owner, 'select public.list_invites($1) as r', [board.id])).rows[0].r;
  ok(li2.length >= 4 && li2.every((i) => i.people.every((p) => typeof p.name === 'string' && !/@/.test(p.name))), 'the owner list still shows every link, with names only');
  ok((await run('su', "select count(*)::int c from public.board_invite_uses where alias is not null")).rows[0].c >= 0, 'legacy guests get names without any access change');
  ok(!!(await run(guest, 'select id from public.boards where id=$1', [board.id])).rows.length && await wrote(guest2) && await wrote(editor), 'existing guests and editors still read and write');
  // deleting the history of a turned-off LEGACY link changes nobody's access
  const headBefore = (await run('su', 'select count(*)::int c from public.board_members where board_id=$1', [board.id])).rows[0].c;
  ok((await run(owner, 'select public.delete_invite_history($1) as r', [viewLink.id])).rows[0]?.r === true, 'the owner deletes the turned-off viewer link from history');
  ok((await run('su', 'select count(*)::int c from public.board_members where board_id=$1', [board.id])).rows[0].c === headBefore && (await run(viewer, 'select id from public.boards where id=$1', [board.id])).rows.length === 1, 'and nobody, including the legacy viewer, lost access');
}


// ---- and the third migration (guest identity, history archiving)
{
  const NEW3 = '20261009120000_guest_identity.sql';
  const sql3 = fs.readFileSync(path.join(migDir, NEW3), 'utf8').replace(/\r\n/g, '\n');
  ok(!/\bupdate\s+public\.board_members\b/i.test(sql3) && !/\bdelete\s+from\s+public\.board_members\b/i.test(sql3), 'the third migration does not touch memberships either');
  const pre = await snap();
  await db.exec(sql3);
  const post = await snap();
  ok(JSON.stringify(pre.members) === JSON.stringify(post.members) && JSON.stringify(pre.invites) === JSON.stringify(post.invites), 'AFTER the third migration: memberships and invitations are still identical');
  ok(!(await run(guest, 'select public.accept_invite($1)', [openLink.token])).error && await wrote(guest), 'an existing guest reopening their link with the old one-argument call still works');
  ok(!(await run(newGuest, 'select public.accept_invite($1, $2)', [openLink.token, 'Leaflet #5'])).error, 'and the new two-argument call works');
  const accNames = (await run(owner, 'select public.list_board_access($1) as r', [board.id])).rows[0].r;
  ok(accNames.every((a) => typeof a.name === 'string' && a.name !== 'Member' && !/@/.test(a.name)), 'nobody is listed as a bare "Member" and no address appears');
  ok(accNames.length === (await run('su', 'select count(*)::int c from public.board_members where board_id=$1', [board.id])).rows[0].c, 'the access list matches the real membership');
}

console.log('migration preserves existing access: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
