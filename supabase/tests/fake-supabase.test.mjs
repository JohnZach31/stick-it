// End-to-end check of the local Supabase stand-in using the REAL supabase-js client:
// PKCE sign-in, RPCs, RLS through the REST layer, Storage upload/sign/download, the share resolver.
//   node --experimental-strip-types fake-supabase.test.mjs
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = 54390;
const srv = spawn('node', ['--experimental-strip-types', path.join(here, 'fake-supabase', 'server.mjs'), String(PORT)], { stdio: ['ignore', 'pipe', 'pipe'] });
let anon = '';
await new Promise((ok, bad) => {
  srv.stdout.on('data', (d) => { const m = /anon key:\s+(\S+)/.exec(String(d)); if (m) { anon = m[1]; ok(); } });
  srv.stderr.on('data', (d) => { if (/Error/.test(String(d))) console.error(String(d)); });
  setTimeout(() => bad(new Error('server did not start')), 60000);
});
const url = `http://127.0.0.1:${PORT}`;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };

async function login(email) {
  const c = createClient(url, anon, { auth: { flowType: 'pkce', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data, error } = await c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'http://127.0.0.1:8123/', skipBrowserRedirect: true, queryParams: { login_hint: email } } });
  if (error) throw error;
  const r = await fetch(data.url, { redirect: 'manual' });
  const code = new URL(r.headers.get('location')).searchParams.get('code');
  const { data: s, error: e2 } = await c.auth.exchangeCodeForSession(code);
  if (e2) throw e2;
  await c.rpc('set_age_band', { p_band: 'adult' });          // the age screen
  return { c, user: s.user };
}

try {
  const alice = await login('alice@example.com');
  const bob = await login('bob@example.com');
  const stranger = createClient(url, anon, { auth: { persistSession: false } });
  ok(!!alice.user.id && alice.user.email === 'alice@example.com', 'PKCE sign-in yields a session');
  const bad = createClient(url, anon, { auth: { flowType: 'pkce', persistSession: false } });
  const { error: exch } = await bad.auth.exchangeCodeForSession('not-a-code');
  ok(!!exch, 'a wrong auth code is rejected');

  // profile created from the Google metadata by the signup trigger
  const prof = await alice.c.from('profiles').select('id, display_name, plan').eq('id', alice.user.id).single();
  ok(prof.data?.display_name === 'Alice Tester' && prof.data.plan === 'free', 'profile created on first sign-in');
  ok((await alice.c.from('profiles').update({ plan: 'premium' }).eq('id', alice.user.id)).error, 'clients cannot upgrade themselves');

  // boards through the RPC (limit enforced server-side)
  const b1 = await alice.c.rpc('create_board', { p_name: 'Trip', p_subtitle: 'Athens', p_migration_key: 'local-abc-12345' });
  ok(b1.data?.name === 'Trip' && b1.data.subtitle === 'Athens', 'create_board returns the board');
  const again = await alice.c.rpc('create_board', { p_name: 'Trip', p_migration_key: 'local-abc-12345' });
  ok(again.data?.id === b1.data.id, 'idempotent by migration key');
  await alice.c.rpc('create_board', { p_name: 'Second' });
  const third = await alice.c.rpc('create_board', { p_name: 'Third' });
  ok(third.error && /BOARD_LIMIT_REACHED/.test(third.error.message), 'plan limit enforced through the client');
  const list = await alice.c.from('boards').select('id,name,subtitle,cover_mode').order('created_at', { ascending: true });
  ok(list.data?.length === 2 && list.data[0].name === 'Trip', 'boards listed via REST');
  ok((await bob.c.from('boards').select('id')).data?.length === 0, "another user sees no boards");
  ok((await stranger.from('boards').select('id')).error, 'anonymous key cannot read boards');

  // objects through sync_objects
  const id = crypto.randomUUID();
  const s1 = await alice.c.rpc('sync_objects', { p_board: b1.data.id, p_upserts: [{ id, type: 'note', x: 5, y: 6, width: 250, rotation: 2, z_index: 3, data: { html: 'hi' } }], p_deletes: [] });
  ok(s1.data?.results[0].status === 'ok', 'sync_objects creates');
  const s2 = await alice.c.rpc('sync_objects', { p_board: b1.data.id, p_upserts: [{ id, type: 'note', x: 9, y: 6, data: { html: 'hi 2' }, base_version: 1 }] });
  ok(s2.data?.results[0].version === 2, 'sync_objects updates with a base version');
  const rows = await alice.c.from('board_objects').select('id,x,version,data').eq('board_id', b1.data.id).is('deleted_at', null);
  ok(rows.data?.length === 1 && rows.data[0].data.html === 'hi 2' && rows.data[0].x === 9, 'objects readable via REST with filters');
  const stale = await alice.c.rpc('sync_objects', { p_board: b1.data.id, p_upserts: [{ id, type: 'note', x: 1, y: 1, data: {}, base_version: 1 }] });
  ok(stale.data?.results[0].status === 'conflict', 'conflict surfaced to the client');

  // invite -> bob edits; bob cannot see the other board
  const inv = await alice.c.rpc('create_invite', { p_board: b1.data.id, p_email: 'bob@example.com', p_role: 'viewer' });
  ok(!inv.error && inv.data.token.length >= 60, 'invite created');
  ok(!(await bob.c.rpc('accept_invite', { p_token: inv.data.token })).error, 'invite accepted');
  ok((await bob.c.from('boards').select('id')).data?.length === 1, 'invitee sees only the invited board');
  const bobWrite = await bob.c.rpc('sync_objects', { p_board: b1.data.id, p_upserts: [{ id: crypto.randomUUID(), type: 'note', x: 1, y: 1, data: {} }] });
  ok(bobWrite.data?.results[0].status === 'denied', 'a viewer cannot write (through the real client)');

  // storage: register, upload, finalize, read, sign
  const bytes = new Uint8Array(2048).map((_, i) => i % 251);
  const asset = await alice.c.rpc('create_asset', { p_board: b1.data.id, p_kind: 'image', p_mime: 'image/jpeg', p_size: bytes.length, p_filename: 'pic.jpg', p_width: 32, p_height: 32 });
  ok(asset.data?.status === 'pending' && asset.data.storage_path.startsWith('a/'), 'asset registered');
  const up = await alice.c.storage.from('media').upload(asset.data.storage_path, new Blob([bytes], { type: 'image/jpeg' }), { contentType: 'image/jpeg' });
  ok(!up.error, 'file uploaded to the issued path');
  ok((await bob.c.storage.from('media').upload(asset.data.storage_path + 'x', new Blob([bytes], { type: 'image/jpeg' }))).error, 'uploading to a path nobody issued is refused');
  const fin = await alice.c.rpc('finalize_asset', { p_asset: asset.data.id });
  ok(fin.data?.ok === true && fin.data.asset.status === 'ready', 'asset finalised');
  const dl = await bob.c.storage.from('media').download(asset.data.storage_path);
  ok(!dl.error && (await dl.data.arrayBuffer()).byteLength === 2048, 'board member downloads the media');
  ok((await stranger.storage.from('media').download(asset.data.storage_path)).error, 'anonymous download refused');
  const svg = await alice.c.rpc('create_asset', { p_board: b1.data.id, p_kind: 'image', p_mime: 'image/svg+xml', p_size: 100 });
  ok(svg.error && /MIME_NOT_ALLOWED/.test(svg.error.message), 'SVG refused');

  // sharing + resolver Edge Function
  const objId = crypto.randomUUID();
  await alice.c.rpc('sync_objects', { p_board: b1.data.id, p_upserts: [{ id: objId, type: 'photo', x: 1, y: 1, width: 240, data: { photoStyle: 'polaroid', caption: 'Lucy', assetId: asset.data.id } }] });
  const share = await alice.c.rpc('create_share', { p_type: 'object_snapshot', p_board: b1.data.id, p_object_ids: [objId], p_by_name: 'Alice' });
  ok(share.data?.token?.length === 64, 'snapshot share created');
  const resolved = await fetch(`${url}/functions/v1/resolve-share`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:8123' }, body: JSON.stringify({ token: share.data.token }) });
  const rj = await resolved.json();
  ok(resolved.status === 200 && rj.objects[0].data.caption === 'Lucy' && rj.by_name === 'Alice', 'public resolver returns the snapshot');
  const signed = Object.values(rj.assets)[0];
  const media = await fetch(signed.url);
  ok(media.status === 200 && (await media.arrayBuffer()).byteLength === 2048, 'signed URL serves the media without any account');
  ok(!JSON.stringify(rj).includes(alice.user.id) && !JSON.stringify(rj).includes('alice@example.com'), 'resolver output has no user id or e-mail');
  ok((await fetch(`${url}/functions/v1/resolve-share`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: 'f'.repeat(64) }) })).status === 404, 'unknown token -> 404');
  const tampered = await fetch(signed.url.replace(/token=[^&]+/, 'token=abc.def.ghi'));
  ok(tampered.status >= 400, 'a forged signed URL is rejected');
  ok(!(await alice.c.rpc('disable_share', { p_share: share.data.id })).error, 'share disabled');
  ok((await fetch(`${url}/functions/v1/resolve-share`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: share.data.token }) })).status === 410, 'disabled share -> 410');
} catch (e) { fail++; console.log('  EXCEPTION', e); }
finally { srv.kill(); }
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
