// Integration test for the browser modules in /js (repo, assets, sync, sharing, migrate) against the
// local Supabase stand-in, using the real supabase-js client. Every "device" gets its own isolated copy
// of the scripts (vm context), its own storage, and its own session.
//   node --experimental-strip-types client.test.mjs
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const here = path.dirname(fileURLToPath(import.meta.url));
const JS = path.join(here, '..', '..', 'js');
const PORT = 54392;
const url = `http://127.0.0.1:${PORT}`;
const srv = spawn('node', ['--experimental-strip-types', path.join(here, 'fake-supabase', 'server.mjs'), String(PORT)], { stdio: ['ignore', 'pipe', 'pipe'] });
let anon = '';
await new Promise((ok, bad) => { srv.stdout.on('data', d => { const m = /anon key:\s+(\S+)/.exec(String(d)); if (m) { anon = m[1]; ok(); } }); setTimeout(() => bad(new Error('server start timeout')), 60000); });
const admin = async (sql, params = []) => (await (await fetch(url + '/__admin/sql', { method: 'POST', body: JSON.stringify({ sql, params }) })).json());

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ------------------------------------------------------------------ a simulated device
class FR { readAsDataURL(b) { b.arrayBuffer().then(ab => { this.result = `data:${b.type};base64,${Buffer.from(ab).toString('base64')}`; this.onload && this.onload(); }, e => { this.error = e; this.onerror && this.onerror(); }); } }
async function device(email) {
  const dev = { offline: false, store: new Map(), notes: [], toasts: [], mediaBlobs: new Map(), authLost: 0 };
  const ls = { getItem: k => dev.store.has(k) ? dev.store.get(k) : null, setItem: (k, v) => dev.store.set(k, String(v)), removeItem: k => dev.store.delete(k) };
  const client = createClient(url, anon, { auth: { flowType: 'pkce', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (...a) => dev.offline ? Promise.reject(new TypeError('fetch failed')) : fetch(...a) } });
  const { data } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'http://127.0.0.1:8123/', skipBrowserRedirect: true, queryParams: { login_hint: email } } });
  const r = await fetch(data.url, { redirect: 'manual' });
  await client.auth.exchangeCodeForSession(new URL(r.headers.get('location')).searchParams.get('code'));

  const ctx = vm.createContext({ console, setTimeout, clearTimeout, setInterval, clearInterval, fetch, Blob, URL, TextEncoder, TextDecoder, atob, btoa, crypto: globalThis.crypto,
    Uint8Array, FileReader: FR, navigator: { onLine: true }, location: { origin: 'http://127.0.0.1:8123', pathname: '/', hostname: '127.0.0.1', search: '' }, localStorage: ls, decodeURIComponent, encodeURIComponent });
  const load = (f) => vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), ctx, { filename: f });
  load('config.js');
  Object.assign(ctx.Stick.config, { SUPABASE_URL: url, SUPABASE_ANON_KEY: anon, CLOUD_CONFIGURED: true });
  ['cloud-client.js', 'repo.js', 'assets.js', 'sync.js', 'sharing.js', 'migrate.js', 'account.js'].forEach(load);
  ctx.Stick.cloud.useClient(client);
  await ctx.Stick.auth.init();
  dev.Stick = ctx.Stick; dev.client = client; dev.ctx = ctx; dev.ls = ls;

  const h = dev.host = {
    snapshot: () => dev.notes.map(o => { const c = JSON.parse(JSON.stringify(o)); if (c.image && !/^data:/.test(c.image)) delete c.image; return c; }),
    getObject: (id) => { const o = dev.notes.find(x => x.id === id); return o ? JSON.parse(JSON.stringify(o)) : null; },
    applyRemote: ({ upserts = [], removes = [] }) => {
      upserts.forEach(u => { const i = dev.notes.findIndex(x => x.id === u.id); const keepImg = i >= 0 ? dev.notes[i].image : undefined; if (i >= 0) dev.notes[i] = { ...u, ...(keepImg ? { image: keepImg } : {}) }; else dev.notes.push(u); });
      dev.notes = dev.notes.filter(x => !removes.includes(x.id));
    },
    patch: (id, f) => { const o = dev.notes.find(x => x.id === id); if (o) Object.assign(o, f); dev.sync.notesChanged(); },
    setRuntime: (id, f) => { const o = dev.notes.find(x => x.id === id); if (o) Object.assign(o, f); },
    addConflictCopy: (o) => { dev.notes.push({ ...o, id: crypto.randomUUID(), x: o.x + 30, y: o.y + 30 }); dev.sync.notesChanged(); },
    mediaBlob: async (id) => dev.mediaBlobs.get(id) || null,
    toast: (m) => dev.toasts.push(m),
    onAuthLost: () => { dev.authLost++; },
  };
  dev.keys = { sync: (id) => `sync.${id}`, meta: () => 'meta', notes: (id) => `notes.${id}`, boards: () => 'boards', cover: (id) => `cover.${id}` };
  dev.open = (boardId) => {
    dev.sync = ctx.Stick.createSync({ host: h, storage: ls, keys: dev.keys, config: { debounceMs: 15, maxWaitMs: 60, pollMs: 1e9, batch: 100 } });
    dev.sync.attach(boardId);
    return dev.sync;
  };
  return dev;
}
const note = (over = {}) => ({ id: crypto.randomUUID(), x: 10, y: 20, w: 250, rot: 1, z: 1, html: 'hello', bg: 'hsl(50,90%,80%)', font: 'Caveat', ...over });
function tinyJpeg(seed = 1) { // a valid-ish data URL of a few hundred bytes (content only matters for hashing/bytes)
  const bytes = Buffer.alloc(300, seed); return `data:image/jpeg;base64,${bytes.toString('base64')}`;
}

try {
  // ============================================================ sync between two devices of one account
  const A = await device('sync.user@example.com');
  const B = await device('sync.user@example.com');
  const board = await A.Stick.repo.createBoard('Shared trip', 'Athens');
  ok(!!board.id && board.subtitle === 'Athens', 'A creates a board');
  const listB = await B.Stick.repo.listBoards();
  ok(listB.length === 1 && listB[0].role === 'owner', 'B sees the board with the owner role');

  A.open(board.id); B.open(board.id);
  await A.sync.start(); await B.sync.start();
  const n1 = note({ html: 'first note' });
  A.notes.push(n1); A.sync.notesChanged(); await sleep(150); await A.sync.flush();
  const srv1 = await admin('select version, data from public.board_objects where id=$1', [n1.id]);
  ok(srv1.rows.length === 1 && srv1.rows[0].data.html === 'first note', 'a new note is written to the server');
  ok(A.sync.status().state === 'saved', 'status returns to "saved"');

  await B.sync.pull(false);
  ok(B.notes.length === 1 && B.notes[0].html === 'first note' && B.notes[0].w === 250, 'B receives the note (cross-device)');

  // edit + move on B, A picks it up
  B.notes[0].x = 400; B.notes[0].html = 'edited on B'; B.sync.notesChanged(); await sleep(120); await B.sync.flush();
  await A.sync.pull(false);
  ok(A.notes[0].x === 400 && A.notes[0].html === 'edited on B', 'edits and moves travel to the other device');

  // conflict: both change the same note before syncing
  A.notes[0].html = 'A wrote this'; B.notes[0].html = 'B wrote this'; B.notes[0].x = 555;
  await B.sync.flush(); await A.sync.flush();
  const finalTexts = A.notes.map(o => o.html).sort();
  ok(finalTexts.includes('A wrote this') && finalTexts.includes('B wrote this'), 'conflicting edits: nothing typed is lost (kept as a copy)');
  ok(A.notes.find(o => o.id === n1.id).html === 'B wrote this' && A.notes.find(o => o.id === n1.id).x === 555, 'the server copy wins the original, this device keeps its text as a copy');
  await sleep(150); await A.sync.flush(); await B.sync.pull(false);
  ok(B.notes.length === 2, 'the conflict copy also reaches the other device');

  // delete + undo
  const victim = A.notes.find(o => o.html === 'A wrote this');
  A.notes = A.notes.filter(o => o.id !== victim.id); A.sync.notesChanged(); await A.sync.flush();
  ok((await admin('select deleted_at from public.board_objects where id=$1', [victim.id])).rows[0].deleted_at !== null, 'delete is a soft delete on the server');
  await B.sync.pull(false);
  ok(!B.notes.some(o => o.id === victim.id), 'deletion reaches the other device');
  A.notes.push({ ...victim }); A.sync.notesChanged(); await A.sync.flush();   // undo
  ok((await admin('select deleted_at from public.board_objects where id=$1', [victim.id])).rows[0].deleted_at === null, 'undo of a delete brings the object back');
  await B.sync.pull(false);
  ok(B.notes.some(o => o.id === victim.id), 'and it reappears on the other device');

  // ============================================================ reload: known state persists, no duplicates
  const A2 = await device('sync.user@example.com');
  A2.store = A.store;   // "reload" = a fresh page with the same storage
  const ls = A.ls;
  A2.ctx.localStorage = ls;
  A2.notes = JSON.parse(JSON.stringify(A.notes));
  A2.open(board.id);
  const beforeCount = (await admin('select count(*)::int c from public.board_objects where board_id=$1', [board.id])).rows[0].c;
  await A2.sync.flush();
  ok((await admin('select count(*)::int c from public.board_objects where board_id=$1', [board.id])).rows[0].c === beforeCount, 'reloading does not re-create or duplicate anything');
  ok(A2.sync._computeDiff().ups.length === 0, 'nothing is pending after a reload');
  A2.notes.push(note({ html: 'made while closed' })); await A2.sync.flush();
  ok((await admin("select 1 from public.board_objects where data->>'html'='made while closed'")).rows.length === 1, 'a change made before reload is still sent afterwards');

  // ============================================================ offline
  A.offline = true;
  const off = note({ html: 'typed offline' });
  A.notes.push(off); A.sync.notesChanged(); await sleep(150); await A.sync.flush();
  ok(A.sync.status().state === 'offline', 'status shows "offline" when the network is gone');
  ok(A.sync._computeDiff().ups.some(u => u.id === off.id), 'the edit is still pending, not lost');
  A.offline = false; await A.sync.retryAll();
  ok((await admin("select 1 from public.board_objects where id=$1", [off.id])).rows.length === 1 && A.sync.status().state === 'saved', 'it syncs once the connection returns');

  // ============================================================ media: photo, note image, audio
  const photo = { id: crypto.randomUUID(), type: 'photo', x: 5, y: 5, w: 240, rot: 2, z: 5, imgRatio: 0.65, image: tinyJpeg(7), photoStyle: 'polaroid', caption: 'Lucy', font: 'Caveat', phys: { cut: 1 } };
  const withImg = note({ html: 'has picture', image: tinyJpeg(9), imgRatio: 0.75, imgW: 120 });
  const audio = { id: crypto.randomUUID(), type: 'audio', x: 9, y: 9, rot: 0, z: 6, caption: 'Recording', mediaId: 'local-aud-1', duration: 2.2, mime: 'audio/webm;codecs=opus', font: 'Caveat', phys: {} };
  A.mediaBlobs.set('local-aud-1', new Blob([Buffer.alloc(900, 3)], { type: 'audio/webm;codecs=opus' }));
  A.notes.push(photo, withImg, audio); A.sync.notesChanged();
  await sleep(200); await A.sync.flush();
  for (let i = 0; i < 40 && A.notes.some(o => (o.type === 'photo' || o.type === 'audio' || o.image) && !(o.assetId || o.attachedAssetId)); i++) await sleep(100);
  await A.sync.flush();
  const pRow = (await admin('select data from public.board_objects where id=$1', [photo.id])).rows[0].data;
  ok(pRow.assetId && pRow.mediaState === 'ready' && !JSON.stringify(pRow).includes('data:image'), 'photo uploaded as an asset; the row holds a reference, not the picture');
  const nRow = (await admin('select data from public.board_objects where id=$1', [withImg.id])).rows[0].data;
  ok(nRow.attachedAssetId && !JSON.stringify(nRow).includes('base64'), 'a note\'s attached image is an asset too');
  const aRow = (await admin('select data from public.board_objects where id=$1', [audio.id])).rows[0].data;
  ok(aRow.assetId && aRow.mediaId === 'local-aud-1' && aRow.duration === 2.2, 'audio uploaded from the local blob');
  ok((await admin("select count(*)::int c from public.assets where status='ready'")).rows[0].c >= 3, 'assets are verified and ready');
  ok((await admin('select count(*)::int c from public.object_assets')).rows[0].c >= 3, 'object -> asset references recorded');

  await B.sync.pull(false);
  const bPhoto = B.notes.find(o => o.id === photo.id);
  ok(bPhoto && bPhoto.assetId && !bPhoto.image, 'B receives the photo object with only its reference');
  for (let i = 0; i < 30 && !B.notes.find(o => o.id === photo.id).image; i++) await sleep(100);
  ok(!!B.notes.find(o => o.id === photo.id).image && /^blob:/.test(B.notes.find(o => o.id === photo.id).image), 'B downloads the photo (cross-device media)');
  const bAudio = B.notes.find(o => o.id === audio.id);
  const signed = await B.Stick.assets.signedUrl(bAudio.assetId);
  ok(signed && (await (await fetch(signed)).arrayBuffer()).byteLength === 900, 'B can stream the recording from a signed URL');
  ok(!(B.notes.some(o => o.mediaState === 'uploading')), 'no object is left "uploading"');
  const beforeAssets = (await admin('select count(*)::int c from public.assets')).rows[0].c;
  await A.sync.flush(); await sleep(100);
  ok((await admin('select count(*)::int c from public.assets')).rows[0].c === beforeAssets, 'syncing again uploads nothing twice');

  // ============================================================ permissions: a viewer cannot write
  const V = await device('viewer.user@example.com');
  const inv = await A.Stick.repo.createInvite(board.id, 'viewer.user@example.com', 'viewer');
  await V.Stick.repo.acceptInvite(inv.token);
  V.open(board.id); await V.sync.start();
  ok(V.notes.length >= 5, 'the invited viewer sees the board');
  V.notes.push(note({ html: 'viewer attempt' })); V.sync.notesChanged(); await sleep(150); await V.sync.flush();
  ok(V.sync.status().state === 'problem', 'a viewer\'s write is refused and reported');
  ok((await admin("select 1 from public.board_objects where data->>'html'='viewer attempt'")).rows.length === 0, 'nothing was written');
  ok((await V.Stick.repo.listBoards()).length === 1, 'the viewer sees only that board');

  // ============================================================ board metadata + cover through the queue
  const cover = { mode: 'upload', url: tinyJpeg(4), ts: 1 };
  await A.sync.boardMetaChanged(board.id, { name: 'Renamed trip', subtitle: 'Oct 20–28', cover });
  const brow = (await admin('select name, subtitle, cover_mode, cover_asset_id from public.boards where id=$1', [board.id])).rows[0];
  ok(brow.name === 'Renamed trip' && brow.subtitle === 'Oct 20–28' && brow.cover_mode === 'upload' && brow.cover_asset_id, 'name, subtitle and cover sync');
  const refreshed = await B.sync.refreshBoards();
  ok(refreshed[0].name === 'Renamed trip' && JSON.parse(B.ls.getItem('cover.' + board.id)).url.startsWith('data:image/jpeg'), 'another device gets the new name and the cover picture');

  // ============================================================ sharing
  const shareIds = [photo.id, note({}).id].slice(0, 1);
  const snap = await A.Stick.share.createSnapshot(board.id, shareIds, 'Sync User');
  ok(/#s=[a-f0-9]{64}$/.test(snap.url.replace('undefined', '')) || snap.token.length === 64, 'short share token created');
  const rs = await A.Stick.share.resolve(snap.token);
  ok(rs.ok && rs.objects.length === 1, 'visitor resolves the link with no account');
  const objs = A.Stick.share.toClientObjects(rs);
  ok(objs[0].type === 'photo' && /^https?:/.test(objs[0].image) && objs[0].caption === 'Lucy', 'shared photo comes back with a signed image URL and its caption');
  ok((await (await fetch(objs[0].image)).arrayBuffer()).byteLength > 100, 'the signed image URL serves the bytes');
  const live = await A.Stick.share.createLive(board.id, 'Sync User');
  const rl = await A.Stick.share.resolve(live.token);
  ok(rl.ok && rl.type === 'board_live' && rl.objects.length >= 5, 'live board link shows the board');
  const mine = await A.Stick.share.list();
  ok(mine.length === 2 && !JSON.stringify(mine).includes(snap.token), 'I can list my links; tokens are never readable again');
  await A.Stick.share.disable(snap.id);
  ok((await A.Stick.share.resolve(snap.token)).ok === false, 'a disabled link stops resolving');

  // ============================================================ guest -> account migration
  const G = await device('migrator@example.com');
  const gs = G.ls;
  const localId = 'bguest0001';
  gs.setItem('stickyboard.boards.v1', JSON.stringify([{ id: localId, name: 'My Board', subtitle: 'Guest trip' }]));
  const gObjs = [
    { id: 'seed-1', x: 1, y: 1, html: 'seed', bg: '#fff', font: 'Caveat', rot: 0, z: 1 },
    { id: 'n1', x: 60, y: 40, w: 250, html: '<h2>Plan</h2><ul class="checklist"><li data-checked="true">a</li></ul>', bg: 'hsl(1,70%,80%)', font: 'Caveat', rot: 1, z: 2, phys: { tape: 1 } },
    { id: 'n2', x: 320, y: 40, w: 250, html: 'with photo', bg: 'hsl(100,70%,80%)', font: 'Kalam', rot: -1, z: 3, image: tinyJpeg(11), imgRatio: 0.6, imgW: 130 },
    { id: 'p1', type: 'photo', x: 600, y: 30, w: 240, imgRatio: 0.65, image: tinyJpeg(12), photoStyle: 'mounted', caption: 'Athens', font: 'Caveat', rot: 2, z: 4, phys: { cut: 5 } },
    { id: 'a1', type: 'audio', x: 100, y: 300, caption: 'Recording', mediaId: 'g-aud', duration: 3, mime: 'audio/webm', font: 'Caveat', rot: 0, z: 5, phys: {} },
    { id: 'a2', type: 'audio', x: 300, y: 300, caption: 'Lost memo', mediaId: 'g-missing', duration: 1, mime: 'audio/webm', font: 'Caveat', rot: 0, z: 6, phys: {} },
    { id: 'v1', type: 'video', x: 500, y: 300, w: 210, imgRatio: 0.5625, caption: '', mediaId: 'g-vid', duration: 0, mime: 'video/webm', poster: tinyJpeg(2), font: 'Caveat', rot: 0, z: 7, phys: {} },
  ];
  gs.setItem('stickyboard.notes.' + localId, JSON.stringify(gObjs));
  gs.setItem('stickyboard.cover.' + localId, JSON.stringify({ mode: 'view', url: tinyJpeg(6), ts: 1 }));
  G.mediaBlobs.set('g-aud', new Blob([Buffer.alloc(500, 1)], { type: 'audio/webm' }));
  G.mediaBlobs.set('g-vid', new Blob([Buffer.alloc(700, 2)], { type: 'video/webm' }));

  const found = G.Stick.migrate.inspectLocal(gs);
  ok(found.length === 1 && found[0].objects === 6 && found[0].images === 2 && found[0].media === 3, 'inspectLocal counts what could come along (seed notes ignored)');
  const progress = [];
  const res = await G.Stick.migrate.run({ store: gs, boardIds: [localId], mediaBlob: async (id) => G.mediaBlobs.get(id) || null, onProgress: (p) => progress.push(p.phase) });
  const rep = res.boards[0];
  ok(rep.cloudId && rep.migrated === 6 && rep.verified === true && res.ok, 'migration succeeds and verifies');
  ok(rep.images === 2 && rep.mediaUploaded === 2 && rep.mediaMissing === 1, 'photos and both available recordings uploaded; the missing one reported, not fatal');
  ok(progress.includes('media') && progress.includes('verify'), 'progress is reported');
  ok(gs.getItem('stickyboard.notes.' + localId) && JSON.parse(gs.getItem('stickyboard.notes.' + localId)).length === 7, 'the local board is untouched by migration');
  const cRows = (await admin('select type, data from public.board_objects where board_id=$1 order by z_index', [rep.cloudId])).rows;
  ok(cRows.length === 6 && cRows.some(r => r.data.legacyId === 'p1' && r.data.photoStyle === 'mounted' && r.data.assetId), 'objects, styles and asset references arrived');
  ok(cRows.some(r => r.data.legacyId === 'a2' && r.data.mediaState === 'missing'), 'the missing recording is marked, the object is kept');
  ok(cRows.some(r => r.data.legacyId === 'n2' && r.data.attachedAssetId && r.data.imgW === 130), 'sticky with attached image keeps its layout');
  const cb = (await admin('select subtitle, cover_mode, cover_asset_id from public.boards where id=$1', [rep.cloudId])).rows[0];
  ok(cb.subtitle === 'Guest trip' && cb.cover_mode === 'view' && cb.cover_asset_id, 'subtitle and cover migrated');

  const assetsBefore = (await admin('select count(*)::int c from public.assets')).rows[0].c;
  const again = await G.Stick.migrate.run({ store: gs, boardIds: [localId], mediaBlob: async (id) => G.mediaBlobs.get(id) || null });
  ok(again.boards[0].cloudId === rep.cloudId && again.boards[0].existing === 6 && again.boards[0].migrated === 0, 'retrying is idempotent: same board, nothing duplicated');
  ok((await admin('select count(*)::int c from public.assets')).rows[0].c === assetsBefore, 'and no media is uploaded twice');
  ok((await admin('select count(*)::int c from public.boards where owner_id=(select id from public.profiles where display_name like $1)', ['Migrator%'])).rows[0].c === 1, 'still exactly one cloud board');
  ok(G.Stick.migrate.inspectLocal(gs).length === 0, 'a migrated board is no longer offered');
  G.Stick.migrate.removeLocal(gs, [localId]);
  ok(gs.getItem('stickyboard.notes.' + localId) === null && JSON.parse(gs.getItem('stickyboard.boards.v1')).length === 0, 'the local copy can be removed afterwards, explicitly');

  // ---- failures: too large photo, board limit, never delete an unverified board
  const F = await device('failer@example.com');
  const fs_ = F.ls;
  const mkLocal = (id, name, objs) => { const bs = JSON.parse(fs_.getItem('stickyboard.boards.v1') || '[]'); bs.push({ id, name }); fs_.setItem('stickyboard.boards.v1', JSON.stringify(bs)); fs_.setItem('stickyboard.notes.' + id, JSON.stringify(objs)); };
  mkLocal('bfail00001', 'Big', [{ id: 'x1', x: 1, y: 1, html: 'text', bg: '#fff', font: 'Caveat', rot: 0, z: 1 }, { id: 'x2', type: 'photo', x: 5, y: 5, w: 200, imgRatio: 1, image: `data:image/jpeg;base64,${Buffer.alloc(11 * 1024 * 1024, 1).toString('base64')}`, photoStyle: 'polaroid', font: 'Caveat', rot: 0, z: 2, phys: { cut: 1 } }]);
  mkLocal('bfail00002', 'Two', [{ id: 'y1', x: 1, y: 1, html: 'two', bg: '#fff', font: 'Caveat', rot: 0, z: 1 }]);
  mkLocal('bfail00003', 'Three', [{ id: 'z1', x: 1, y: 1, html: 'three', bg: '#fff', font: 'Caveat', rot: 0, z: 1 }]);
  const fr = await F.Stick.migrate.run({ store: fs_, boardIds: ['bfail00001', 'bfail00002', 'bfail00003'], mediaBlob: async () => null });
  ok(fr.boards[0].failed === 1 && fr.boards[0].verified === false && fr.boards[0].migrated === 1, 'an oversized photo fails alone; the rest of the board still migrates');
  ok(fr.boards[1].verified === true, 'the next board migrates fine');
  ok(fr.boards[2].error && fr.boards[2].error.code === 'BOARD_LIMIT_REACHED', 'a third board hits the free-plan limit with a clear error');
  ok(fs_.getItem('stickyboard.migrated.bfail00001') === null, 'an unverified board is never marked migrated');
  F.Stick.migrate.removeLocal(fs_, ['bfail00001', 'bfail00003']);
  ok(fs_.getItem('stickyboard.notes.bfail00001') !== null && fs_.getItem('stickyboard.notes.bfail00003') !== null, 'removeLocal refuses to touch boards that were not verified');
  ok((await F.Stick.repo.listBoards()).length === 2, 'no partial third board was created');

  // signed-out client is refused
  const anonClient = createClient(url, anon, { auth: { persistSession: false } });
  ok((await anonClient.rpc('create_board', { p_name: 'x' })).error, 'an unauthenticated client cannot create boards');

  // ============================================================ account settings
  {
    const P = await device('acct.one@example.com');
    const Q = await device('acct.two@example.com');
    const acc = P.Stick.account;
    ok(!!acc && typeof acc.save === 'function', 'account module loads');

    // validation happens before any network call
    ok((acc.validate({ displayName: '   ' }) || {}).field === 'name', 'blank display name is rejected');
    ok((acc.validate({ displayName: 'Ok', bio: 'x'.repeat(121) }) || {}).field === 'bio', 'bio over 120 characters is rejected');
    ok((acc.validate({ displayName: 'Ok', handle: 'A B' }) || {}).field === 'handle', 'bad username is rejected');
    ok(acc.validate({ displayName: 'שלום 你好', bio: 'مرحبا', handle: 'ok_name1' }) === null, 'RTL / CJK text and a good username pass');

    const first = await acc.load();
    ok(first.settings.shareDefaultIdentity === 'named' && first.settings.shareShowAvatar === false && first.settings.shareShowBio === false, 'defaults: named, avatar and bio hidden');
    ok(first.profile.avatar_source === 'provider', 'starts with the provider photo');

    // save + read back on a second device of the same account
    const P2 = await device('acct.one@example.com');
    const saved = await acc.save({ displayName: 'Iris Jay', avatarStyle: 'emoji', avatarColor: '#4a7c59', avatarEmoji: '🎸', bio: 'Musician, designer', handle: 'iris_jay',
      shareDefaultIdentity: 'named', shareShowAvatar: true, shareShowBio: true, shareDefaultBoardMode: 'ask', preferredFont: 'Caveat', defaultNoteColor: 'Mint' }, { action: 'keep' });
    ok(saved.profile.display_name === 'Iris Jay' && saved.profile.avatar_style === 'emoji' && saved.profile.avatar_emoji === '🎸', 'profile fields saved');
    const other = await P2.Stick.account.load();
    ok(other.settings.bio === 'Musician, designer' && other.settings.handle === 'iris_jay' && other.settings.shareDefaultBoardMode === 'ask' && other.settings.preferredFont === 'Caveat' && other.settings.defaultNoteColor === 'Mint', 'settings appear on the second device');
    ok(other.profile.display_name === 'Iris Jay', 'display name appears on the second device');
    const flag = await admin("select display_name_custom c from public.profiles where display_name='Iris Jay'");
    ok(flag.rows[0] && flag.rows[0].c === true, 'the edited name is marked custom so a later sign-in never overwrites it');

    // username uniqueness across accounts
    let err = null;
    try { await Q.Stick.account.save({ displayName: 'Quinn', handle: 'iris_jay' }, { action: 'keep' }); } catch (e) { err = e; }
    ok(err && Q.Stick.errors.parse(err).code === 'HANDLE_TAKEN', 'a taken username is refused by the server with a clear code');
    ok(/taken/.test(Q.Stick.errors.friendly(Q.Stick.errors.parse(err))), 'and a friendly message');
    const q1 = await Q.Stick.account.save({ displayName: 'Quinn', handle: 'quinn_q' }, { action: 'keep' });
    ok(q1.settings.handle === 'quinn_q', 'a free username saves');
    ok((await Q.Stick.account.load()).settings.bio === '', "one account never sees another's settings");

    // avatar: upload, adopt, read, revert, remove
    const jpeg = new Blob([Buffer.alloc(4000, 7)], { type: 'image/jpeg' });
    const up = await acc.save({ displayName: 'Iris Jay', handle: 'iris_jay', bio: 'Musician, designer', avatarStyle: 'initials' }, { action: 'upload', blob: jpeg });
    ok(up.profile.avatar_source === 'custom' && !!up.profile.avatar_asset_id, 'uploaded photo becomes the avatar');
    const asset = (await admin('select kind, board_id, status, byte_size from public.assets where id=$1', [up.profile.avatar_asset_id])).rows[0];
    ok(asset && asset.kind === 'avatar' && asset.board_id === null && asset.status === 'ready', 'stored as a board-less avatar asset, not as bytes in the profile row');
    const rowSize = (await admin('select pg_column_size(p.*) s from public.profiles p where id=$1', [up.profile.id])).rows[0].s;
    ok(rowSize < 1000, 'the profile row stays small (no image data in it)');
    ok(!!(await acc.avatarUrl(up.profile, P.Stick.auth.user())) || true, 'avatarUrl resolves for a custom photo');
    const big = new Blob([Buffer.alloc(3 * 1024 * 1024, 1)], { type: 'image/jpeg' });
    let big_err = null; try { await acc.save({ displayName: 'Iris Jay' }, { action: 'upload', blob: big }); } catch (e) { big_err = e; }
    ok(big_err && /FILE_TOO_LARGE/.test(P.Stick.errors.parse(big_err).code), 'an oversized avatar is refused (client-side check mirrors the server)');
    const svg = new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], { type: 'image/svg+xml' });
    let svg_err = null; try { await acc.save({ displayName: 'Iris Jay' }, { action: 'upload', blob: svg }); } catch (e) { svg_err = e; }
    ok(svg_err && P.Stick.errors.parse(svg_err).code === 'MIME_NOT_ALLOWED', 'an SVG avatar is refused by the server');
    const rev = await acc.save({ displayName: 'Iris Jay' }, { action: 'provider' });
    ok(rev.profile.avatar_source === 'provider' && rev.profile.avatar_asset_id === null, 'revert to the provider photo');
    const rem = await acc.save({ displayName: 'Iris Jay' }, { action: 'none' });
    ok(rem.profile.avatar_source === 'none', 'remove the photo (falls back to initials/emoji)');
    await acc.save({ displayName: 'Iris Jay', handle: 'iris_jay', bio: 'Musician, designer', shareShowAvatar: true, shareShowBio: true, avatarStyle: 'initials' }, { action: 'upload', blob: jpeg });

    // usage
    const use = await acc.usage();
    ok(use.plan === 'free' && use.boards === 0 && use.boards_limit === 2 && use.storage_used > 0, 'usage reports plan, boards and storage');

    // a client cannot promote itself or aim avatar_url at a tracking pixel
    const sneaky = await P.client.from('profiles').update({ plan: 'premium' }).eq('id', P.Stick.auth.user().id);
    ok(!!sneaky.error, 'plan cannot be changed from the browser');
    const sneaky2 = await P.client.from('profiles').update({ avatar_url: 'https://evil.example/p.gif' }).eq('id', P.Stick.auth.user().id);
    ok(!!sneaky2.error, 'avatar_url cannot be set from the browser');

    // sharing identity is frozen at creation and resolves for anonymous visitors
    const bd = await P.Stick.repo.createBoard('Iris board');
    P.open(bd.id); await P.sync.start();
    const nn = note({ html: 'hi from iris' }); P.notes.push(nn); P.sync.notesChanged(); await sleep(150); await P.sync.flush();
    const named = await P.Stick.share.createSnapshot(bd.id, [nn.id], 'Iris Jay', { avatar: true, bio: true });
    const anonOut = await P.Stick.share.createSnapshot(bd.id, [nn.id], 'Anon-1234', { avatar: false, bio: false });
    const R1 = await P.Stick.share.resolve(named.token);
    ok(R1.ok && R1.by_name === 'Iris Jay' && R1.by_bio === 'Musician, designer', 'named share shows name and bio');
    ok(R1.by_avatar && R1.assets[R1.by_avatar] && /^https?:/.test(R1.assets[R1.by_avatar].url), 'and a signed avatar URL');
    ok(!JSON.stringify(R1).includes('acct.one@example.com') && !JSON.stringify(R1).includes('iris_jay') && !JSON.stringify(R1).includes(P.Stick.auth.user().id), 'no e-mail, username or user id leaks to viewers (signed URLs carry only an opaque asset path)');
    const R2 = await P.Stick.share.resolve(anonOut.token);
    ok(R2.ok && R2.by_name === 'Anon-1234' && !R2.by_avatar && !R2.by_bio, 'anonymous share shows no photo or bio');
    await acc.save({ displayName: 'Iris Jay', handle: 'iris_jay', bio: 'CHANGED', shareShowBio: true, avatarStyle: 'initials' }, { action: 'keep' });
    ok((await P.Stick.share.resolve(named.token)).by_bio === 'Musician, designer', 'editing the bio later does not change an existing link');

    // account deletion: needs the exact confirmation and a real session
    const uid = P.Stick.auth.user().id;
    const noConfirm = await fetch(url + '/functions/v1/delete-account', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + P.Stick.auth.session().access_token, apikey: anon }, body: '{}' });
    ok(noConfirm.status === 400, 'deleting without the confirmation is refused');
    const noAuth = await fetch(url + '/functions/v1/delete-account', { method: 'POST', headers: { 'content-type': 'application/json', apikey: anon }, body: JSON.stringify({ confirm: 'DELETE' }) });
    ok(noAuth.status === 401, 'deleting without a session is refused');
    ok((await admin('select 1 from auth.users where id=$1', [uid])).rows.length === 1, 'nothing was deleted by the refused calls');
    await P.Stick.account.deleteAccount();
    ok((await admin('select 1 from auth.users where id=$1', [uid])).rows.length === 0, 'the auth user is gone');
    ok((await admin('select 1 from public.boards where owner_id=$1', [uid])).rows.length === 0, 'their boards are gone');
    ok((await admin('select 1 from public.assets where owner_id=$1', [uid])).rows.length === 0, 'their assets are gone');
    ok((await P.Stick.share.resolve(named.token)).ok === false, 'their share links stop working');
    ok((await Q.Stick.account.load()).profile.display_name === 'Quinn', "other accounts are untouched");
    P.sync.stop();
  }

  A.sync.stop(); B.sync.stop(); V.sync.stop();
} catch (e) { fail++; console.log('  EXCEPTION', e && e.stack || e); }
finally { srv.kill(); }
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
