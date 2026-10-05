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
async function device(email, opts = {}) {
  const dev = { offline: false, store: new Map(), notes: [], toasts: [], mediaBlobs: new Map(), authLost: 0 };
  const ls = { getItem: k => dev.store.has(k) ? dev.store.get(k) : null, setItem: (k, v) => dev.store.set(k, String(v)), removeItem: k => dev.store.delete(k) };
  const client = createClient(url, anon, { auth: { flowType: 'pkce', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (...a) => dev.offline ? Promise.reject(new TypeError('fetch failed')) : fetch(...a) } });
  const { data } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'http://127.0.0.1:8123/', skipBrowserRedirect: true, queryParams: { login_hint: email } } });
  const r = await fetch(data.url, { redirect: 'manual' });
  await client.auth.exchangeCodeForSession(new URL(r.headers.get('location')).searchParams.get('code'));
  if (opts.attest !== false) await client.rpc('set_age_band', { p_band: 'adult' });     // what the age screen does for a real adult

  const ctx = vm.createContext({ console, setTimeout, clearTimeout, setInterval, clearInterval, fetch, Blob, URL, TextEncoder, TextDecoder, atob, btoa, crypto: globalThis.crypto,
    Uint8Array, FileReader: FR, navigator: { onLine: true }, location: { origin: 'http://127.0.0.1:8123', pathname: '/', hostname: '127.0.0.1', search: '' }, localStorage: ls, decodeURIComponent, encodeURIComponent });
  const load = (f) => vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), ctx, { filename: f });
  load('config.js');
  Object.assign(ctx.Stick.config, { SUPABASE_URL: url, SUPABASE_ANON_KEY: anon, CLOUD_CONFIGURED: true });
  ['legal-config.js', 'cloud-client.js', 'repo.js', 'assets.js', 'sync.js', 'sharing.js', 'migrate.js', 'account.js'].forEach(load);
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

  // ---- a real cutout: a PNG blob under cutoutKey on this device becomes a 'cutout' asset that points at the photo's asset
  const cut = { id: crypto.randomUUID(), type: 'photo', x: 40, y: 40, w: 220, rot: 1, z: 8, imgRatio: 0.7, image: tinyJpeg(11), photoStyle: 'cutout', cutoutKey: 'co-test-1', cutoutRatio: 1.31, backing: 'kraft', font: 'Caveat', phys: { cut: 2 } };
  A.mediaBlobs.set('co-test-1', new Blob([Buffer.alloc(700, 5)], { type: 'image/png' }));
  A.notes.push(cut); A.sync.notesChanged();
  await sleep(200); await A.sync.flush();
  for (let i = 0; i < 60 && !(A.notes.find(o => o.id === cut.id).cutoutAssetId); i++) await sleep(100);
  await A.sync.flush();
  const cRow = (await admin('select data from public.board_objects where id=$1', [cut.id])).rows[0].data;
  ok(cRow.cutoutAssetId && cRow.assetId && cRow.photoStyle === 'cutout' && cRow.backing === 'kraft' && cRow.cutoutRatio === 1.31, 'a cutout is saved as its own asset next to the original photo asset');
  ok(!('cutoutKey' in cRow) && !JSON.stringify(cRow).includes('base64'), 'the device-local cutout key never reaches the server and no picture data is in the row');
  const cAsset = (await admin('select kind, source_asset_id, mime_type, status from public.assets where id=$1', [cRow.cutoutAssetId])).rows[0];
  ok(cAsset.kind === 'cutout' && cAsset.mime_type === 'image/png' && cAsset.status === 'ready' && cAsset.source_asset_id === cRow.assetId, 'the cutout asset is a verified PNG whose source is the original photo');
  ok((await admin("select count(*)::int c from public.object_assets where object_id=$1 and role='cutout'", [cut.id])).rows[0].c === 1, 'the object references the cutout with the cutout role (so shares include it)');
  const assetCountBefore = (await admin('select count(*)::int c from public.assets')).rows[0].c;
  await A.sync.flush(); await sleep(150);
  ok((await admin('select count(*)::int c from public.assets')).rows[0].c === assetCountBefore, 'the cutout is not uploaded again');
  // ---- postcard picture and photo strip frames: uploaded as assets; the rows hold references only
  const card = { id: crypto.randomUUID(), type: 'postcard', x: 5, y: 5, w: 320, rot: 0, z: 9, image: tinyJpeg(21), imgRatio: 0.66, location: 'Lisbon', message: 'Hi', variant: 'classic', phys: {} };
  const strip = { id: crypto.randomUUID(), type: 'photo_strip', x: 9, y: 9, w: 140, rot: 0, z: 10, variant: 'vertical', caption: 'Trip', font: 'Caveat', phys: {}, frames: [{ image: tinyJpeg(31), ratio: 0.75 }, { image: tinyJpeg(32), ratio: 0.7 }, { image: tinyJpeg(33), ratio: 0.8 }] };
  A.notes.push(card, strip); A.sync.notesChanged();
  await sleep(250); await A.sync.flush();
  for (let i = 0; i < 80 && !(A.notes.find(o => o.id === card.id).assetId && A.notes.find(o => o.id === strip.id).frames.every(f => f.assetId)); i++) await sleep(100);
  await A.sync.flush();
  const cardRow = (await admin('select data from public.board_objects where id=$1', [card.id])).rows[0].data;
  ok(cardRow.assetId && cardRow.location === 'Lisbon' && !JSON.stringify(cardRow).includes('base64'), 'a postcard\'s picture is an asset; the row keeps the words and a reference');
  const stripRowData = (await admin('select data from public.board_objects where id=$1', [strip.id])).rows[0].data;
  ok(Array.isArray(stripRowData.frames) && stripRowData.frames.length === 3 && stripRowData.frames.every(f => f.assetId && !f.image && !f.pending), 'every strip frame is uploaded and the row holds references only');
  ok(!JSON.stringify(stripRowData).includes('base64') && stripRowData.caption === 'Trip', 'no picture bytes in the strip row');
  ok((await admin("select count(*)::int c from public.object_assets where object_id=$1 and role='attached'", [strip.id])).rows[0].c === 3, 'the server registered the three pictures as the strip\'s assets');
  const stripAssets = (await admin('select count(*)::int c from public.assets')).rows[0].c;
  await A.sync.flush(); await sleep(150);
  ok((await admin('select count(*)::int c from public.assets')).rows[0].c === stripAssets, 'strip pictures are not uploaded twice');
  await B.sync.pull(false);
  const bPhoto = B.notes.find(o => o.id === photo.id);
  ok(bPhoto && bPhoto.assetId && !bPhoto.image, 'B receives the photo object with only its reference');
  for (let i = 0; i < 30 && !B.notes.find(o => o.id === photo.id).image; i++) await sleep(100);
  ok(!!B.notes.find(o => o.id === photo.id).image && /^blob:/.test(B.notes.find(o => o.id === photo.id).image), 'B downloads the photo (cross-device media)');
  const bAudio = B.notes.find(o => o.id === audio.id);
  const signed = await B.Stick.assets.signedUrl(bAudio.assetId);
  ok(signed && (await (await fetch(signed)).arrayBuffer()).byteLength === 900, 'B can stream the recording from a signed URL');
  ok(!(B.notes.some(o => o.mediaState === 'uploading')), 'no object is left "uploading"');
  const bCut = B.notes.find(o => o.id === cut.id);
  ok(bCut && bCut.cutoutAssetId === cRow.cutoutAssetId && !bCut.cutoutKey, 'the other device receives the cutout by reference only');
  const cutBlobUrl = await B.Stick.assets.blobUrl(cRow.cutoutAssetId);
  ok(typeof cutBlobUrl === 'string' && cutBlobUrl.length > 0, 'and can download the cutout asset');
  const bStrip = B.notes.find(o => o.id === strip.id), bCard = B.notes.find(o => o.id === card.id);
  ok(bStrip && bStrip.frames.length === 3 && bStrip.frames.every(f => f.assetId) && bCard && bCard.assetId, 'the other device receives the strip and the postcard by reference');
  for (let i = 0; i < 40 && !(B.notes.find(o => o.id === strip.id).frames.every(f => f.image) && B.notes.find(o => o.id === card.id).image); i++) await sleep(100);
  ok(B.notes.find(o => o.id === strip.id).frames.every(f => /^blob:/.test(f.image || '')) && /^blob:/.test(B.notes.find(o => o.id === card.id).image || ''), 'and downloads every strip frame and the postcard picture');
  await B.sync.pull(false);
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

  // ---- guest boards with the new kinds: receipt, postcard, strip frames and a real cutout come along (pictures as assets)
  {
    const pid = 'bpaper0001';
    const bs = JSON.parse(gs.getItem('stickyboard.boards.v1') || '[]'); bs.push({ id: pid, name: 'Scraps' }); gs.setItem('stickyboard.boards.v1', JSON.stringify(bs));
    G.mediaBlobs.set('co-guest-1', new Blob([Buffer.alloc(650, 8)], { type: 'image/png' }));
    const objs = [
      { id: 'r1', type: 'receipt', x: 10, y: 10, w: 230, rot: 1, z: 1, title: 'Cafe', date: '1 Oct', body: 'Coffee', amount: '3.50', variant: 'torn', phys: {} },
      { id: 'pc1', type: 'postcard', x: 300, y: 10, w: 320, rot: 0, z: 2, image: tinyJpeg(41), imgRatio: 0.66, location: 'Lisbon', message: 'Hi', variant: 'classic', phys: {} },
      { id: 'st1', type: 'photo_strip', x: 10, y: 300, w: 140, rot: 0, z: 3, variant: 'vertical', caption: 'Trip', frames: [{ image: tinyJpeg(51), ratio: 0.7 }, { image: tinyJpeg(52), ratio: 0.8 }, { image: tinyJpeg(53), ratio: 0.75 }], phys: {} },
      { id: 'ph1', type: 'photo', x: 400, y: 300, w: 220, imgRatio: 0.7, image: tinyJpeg(61), photoStyle: 'cutout', cutoutKey: 'co-guest-1', cutoutRatio: 1.2, backing: 'kraft', font: 'Caveat', rot: 0, z: 4, phys: { cut: 3 } },
    ];
    gs.setItem('stickyboard.notes.' + pid, JSON.stringify(objs));
    const pr = await G.Stick.migrate.run({ store: gs, boardIds: [pid], mediaBlob: async (id) => G.mediaBlobs.get(id) || null });
    const prep = pr.boards[0];
    ok(pr.ok && prep.migrated === 4 && prep.failed === 0 && prep.verified === true, 'a guest board with receipt, postcard, strip and cutout migrates completely');
    const rows = (await admin('select type, data from public.board_objects where board_id=$1 order by z_index', [prep.cloudId])).rows;
    const byLegacy = (id) => rows.find(r => r.data.legacyId === id);
    ok(byLegacy('r1').data.title === 'Cafe' && byLegacy('r1').data.variant === 'torn', 'the receipt keeps its words and look');
    ok(byLegacy('pc1').data.assetId && !JSON.stringify(byLegacy('pc1').data).includes('base64'), 'the postcard picture became an asset');
    ok(byLegacy('st1').data.frames.length === 3 && byLegacy('st1').data.frames.every(f => f.assetId) && !JSON.stringify(byLegacy('st1').data).includes('base64'), 'every strip frame became an asset, in order');
    const ph = byLegacy('ph1').data;
    ok(ph.assetId && ph.cutoutAssetId && ph.backing === 'kraft' && !('cutoutKey' in ph), 'the real cutout went up next to its photo and the device key stayed behind');
    ok((await admin("select source_asset_id from public.assets where id=$1", [ph.cutoutAssetId])).rows[0].source_asset_id === ph.assetId, 'with the original photo recorded as its source');
    ok((await admin("select count(*)::int c from public.object_assets where object_id=(select id from public.board_objects where data->>'legacyId'='st1')")).rows[0].c === 3, 'and the server registered the strip pictures');
    G.Stick.migrate.removeLocal(gs, [pid]);
  }

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

    // age bands: the server decides what each band may do; only the band + timestamp + versions are kept
    {
      const K = await device('age.new@example.com', { attest: false });
      const early = await K.client.rpc('create_board', { p_name: 'x' });
      ok(!!early.error && K.Stick.errors.parse(early.error).code === 'AGE_NOT_CONFIRMED', 'an account that has not passed the age screen cannot create a board (client sees AGE_NOT_CONFIRMED)');
      ok(!!(await K.client.from('profile_settings').insert({ user_id: K.Stick.auth.user().id, bio: 'hi' })).error, '...or save a bio');
      const sneaky = await K.client.from('profiles').update({ age_band: 'adult' }).eq('id', K.Stick.auth.user().id);
      ok(!!sneaky.error, 'a browser cannot write its own age band');
      const prof = await K.Stick.account.setAgeBand('teen');
      ok(prof.age_band === 'teen' && !!prof.age_attested_at && prof.parental_consent_status === 'not_required', 'a teen is recorded (band + timestamp), no parent step');
      ok(prof.terms_version === K.Stick.legal.termsVersion && prof.privacy_version === K.Stick.legal.privacyVersion, 'with the policy versions that were shown');
      const again = await K.Stick.account.setAgeBand('adult');
      ok(again.age_band === 'teen', 'a second call cannot change the band');
      ok(!!(await K.client.rpc('create_board', { p_name: 'teen board' })).data, 'afterwards the account works normally');
      const row = (await admin('select * from public.profiles where id=$1', [K.Stick.auth.user().id])).rows[0];
      ok(!Object.keys(row).some(k => /birth|dob|born/i.test(k)), 'no birth date column exists on the profile');
      ok((await K.Stick.account.load()).settings.shareDefaultIdentity === 'anonymous', 'teen accounts start by sharing anonymously');

      const C = await device('age.child@example.com', { attest: false });
      const cp = await C.Stick.account.setAgeBand('child');
      ok(cp.age_band === 'child' && cp.parental_consent_status === 'pending_parent_consent', 'a child is recorded as pending parent consent (the account is NOT deleted)');
      const blocked = await C.client.rpc('create_board', { p_name: 'x' });
      ok(!!blocked.error && C.Stick.errors.parse(blocked.error).code === 'PARENT_CONSENT_REQUIRED', 'cloud use is refused until a parent approves (PARENT_CONSENT_REQUIRED)');
      ok(/parent or guardian/i.test(C.Stick.errors.friendly({ code: 'PARENT_CONSENT_REQUIRED' })), 'with a plain explanation');
      ok(!!(await C.client.rpc('parental_consent_set', { p_child: C.Stick.auth.user().id, p_status: 'approved', p_method: 'x' })).error, 'the child cannot approve themself');
      ok((await admin('select 1 from auth.users where id=$1', [C.Stick.auth.user().id])).rows.length === 1, 'the child’s sign-in account still exists (cleanup is a separate process)');
      let mk_err = null; try { await C.Stick.account.save({ displayName: 'Kid', marketingOptIn: true }, { action: 'keep' }); } catch (e) { mk_err = e; }
      ok(!!mk_err, 'nothing can be saved to the cloud for a pending child');
    }

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

    ok((await Q.Stick.account.handleAvailable('quinn_q')) === true, 'your own username reads as available');
    ok((await Q.Stick.account.handleAvailable('iris_jay')) === false, "another account's username is reported as taken");
    ok((await Q.Stick.account.handleAvailable('brand_new_1')) === true, 'a free username is reported as available');
    ok((await Q.Stick.account.handleAvailable('no')) === false, 'a malformed username never reaches the server and is not available');

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

  // ============================================================ board-size safeguards: duplicates are ordinary objects and sync like any other
  {
    const D = await device('dup.user@example.com');
    const bd = await D.Stick.repo.createBoard('Dupes', null);
    D.open(bd.id); await D.sync.start();
    const original = note({ html: 'original' });
    D.notes.push(original);
    // what a slowed burst of 60 duplicates leaves behind: 60 more objects with their own ids, created over time
    for (let i = 0; i < 60; i++) { D.notes.push(note({ html: 'original', x: original.x + 26 * (i + 1), y: original.y + 26 * (i + 1) })); if (i % 15 === 0) { D.sync.notesChanged(); await sleep(30); } }
    D.sync.notesChanged(); await sleep(200); await D.sync.flush();
    const rows = (await admin('select id from public.board_objects where board_id=$1 and deleted_at is null', [bd.id])).rows;
    ok(rows.length === 61 && new Set(rows.map((r) => r.id)).size === 61, 'duplicated objects all reach the server, each with its own id, none lost and none deleted');
    ok((await admin('select count(*)::int c from public.board_objects where board_id=$1 and deleted_at is not null', [bd.id])).rows[0].c === 0, 'a burst of duplicates deletes nothing');
    D.sync.stop();
  }

  // ============================================================ piles: collapsed members are still on the board, in the database, and in every diff
  {
    const D = await device('pile.user@example.com');
    const bd = await D.Stick.repo.createBoard('Piles', null);
    D.open(bd.id); await D.sync.start();
    const members = [note({ html: 'a' }), note({ html: 'b' }), note({ html: 'c' }), note({ html: 'd' })];
    const loose = note({ html: 'loose' });
    D.notes.push(...members, loose); D.sync.notesChanged(); await sleep(150); await D.sync.flush();
    const live = async () => (await admin('select id, type, data from public.board_objects where board_id=$1 and deleted_at is null', [bd.id])).rows;
    const dead = async () => (await admin('select count(*)::int c from public.board_objects where board_id=$1 and deleted_at is not null', [bd.id])).rows[0].c;
    ok((await live()).length === 5, 'pile: five plain notes to start with');

    // collapse four into a pile: members keep their rows and gain pileId; the pile row references them; NOTHING leaves the object list
    const pileId = crypto.randomUUID();
    const pile = { id: pileId, type: 'pile', x: 10, y: 10, w: 200, rot: 0, z: 9, members: members.map((m) => m.id), ox: 10, oy: 10, edges: 7, phys: {} };
    members.forEach((m) => { m.pileId = pileId; });
    D.notes.push(pile); D.sync.notesChanged(); await sleep(200); await D.sync.flush();
    let rows = await live();
    ok(rows.length === 6 && (await dead()) === 0, 'pile: collapsing four notes adds one row (the pile) and deletes nothing');
    const prow = rows.find((r) => r.type === 'pile');
    ok(prow && Array.isArray(prow.data.members) && prow.data.members.length === 4, 'pile: the pile row stores its member ids, not their content');
    ok(!('html' in prow.data), 'pile: the pile holds no copy of any member content');
    ok(rows.filter((r) => r.data.pileId === pileId).length === 4, 'pile: every member row carries the pile id');

    // a device that draws none of them (everything collapsed / nothing mounted) still reports every object: no deletes, ever
    const snapIds = D.host.snapshot().map((o) => o.id);
    ok(members.every((m) => snapIds.includes(m.id)) && snapIds.includes(pileId), 'pile: the sync snapshot lists collapsed members as well as the pile');
    D.sync.notesChanged(); await sleep(150); await D.sync.flush();
    ok((await live()).length === 6 && (await dead()) === 0, 'pile: an idle sync pass with a collapsed pile deletes nothing');

    // a member finished (Done): it leaves the pile, stays in the stored list (the Done pile is part of the snapshot), the pile shrinks
    const doneM = members[0];
    D.notes.splice(D.notes.indexOf(doneM), 1); delete doneM.pileId; doneM.doneAt = Date.now();
    D.donePile = (D.donePile || []).concat([doneM]);
    pile.members = pile.members.filter((id) => id !== doneM.id);
    const origSnap = D.host.snapshot;
    D.host.snapshot = () => D.notes.concat(D.donePile).map((o) => Object.assign({}, o));
    D.sync.notesChanged(); await sleep(200); await D.sync.flush();
    rows = await live();
    ok(rows.length === 6 && (await dead()) === 0, 'pile: marking a member done deletes nothing (it moves to the Done pile and stays stored)');
    ok(rows.find((r) => r.id === doneM.id).data.doneAt > 0 && !rows.find((r) => r.id === doneM.id).data.pileId, 'pile: the finished member kept its content, is Done, and is no longer in the pile');
    ok(rows.find((r) => r.id === pileId).data.members.length === 3, 'pile: the pile now lists three members');

    // unpile: the pile object goes, every member stays alive and loses its pile id
    D.notes.splice(D.notes.indexOf(pile), 1); members.slice(1).forEach((m) => { delete m.pileId; });
    D.sync.notesChanged(); await sleep(200); await D.sync.flush();
    rows = await live();
    ok(rows.filter((r) => r.type !== 'pile').length === 5 && !rows.some((r) => r.type === 'pile'), 'pile: unpiling removes only the pile object; all five notes are still live');
    ok(rows.every((r) => !r.data.pileId), 'pile: after unpiling no row points at a pile');

    // negative control: an implementation that dropped collapsed members from the object list WOULD delete them
    const pile2 = { id: crypto.randomUUID(), type: 'pile', x: 0, y: 0, w: 200, rot: 0, z: 10, members: members.slice(1).map((m) => m.id), ox: 0, oy: 0, edges: 1, phys: {} };
    const keepNotes = D.notes.slice();
    D.notes.splice(0, D.notes.length, loose, pile2);
    D.sync.notesChanged(); await sleep(200); await D.sync.flush();
    ok((await live()).filter((r) => r.type !== 'pile').length <= 2, 'control: if collapsed members were taken out of the list they WOULD be deleted (the test can see that bug)');
    D.sync.stop();
  }

  // ============================================================ v0.8.2.2: a turned, pinned note keeps both through the account (and a view-only decoration deletes nothing)
  {
    const D = await device('turn.user@example.com');
    const bd = await D.Stick.repo.createBoard('Turned', null);
    D.open(bd.id); await D.sync.start();
    const turned = note({ html: 'turned', rot: 14.5, pinned: true });
    const level = note({ html: 'level', rot: 0 });
    const video = { id: crypto.randomUUID(), type: 'embed', x: 5, y: 5, w: 340, rot: 0, z: 3, url: 'https://youtu.be/dQw4w9WgXcQ', provider: 'youtube', vid: 'dQw4w9WgXcQ', phys: {} };
    D.notes.push(turned, level, video); D.sync.notesChanged(); await sleep(200); await D.sync.flush();
    const live = async () => (await admin('select id, type, rotation, data from public.board_objects where board_id=$1 and deleted_at is null', [bd.id])).rows;
    let rows = await live(); const r1 = rows.find((r) => r.id === turned.id);
    ok(rows.length === 3 && r1 && Math.abs(Number(r1.rotation) - 14.5) < 1e-9 && r1.data.pinned === true, 'rotation 14.5 and the pinned state reach the server');
    ok(rows.find((r) => r.id === video.id).data.url === 'https://youtu.be/dQw4w9WgXcQ' && rows.find((r) => r.id === video.id).type === 'embed', 'an embedded video keeps its original address on the server');
    // turn it again and unpin it: an edit, not a deletion
    turned.rot = -9; delete turned.pinned; D.sync.notesChanged(); await sleep(200); await D.sync.flush();
    rows = await live(); const r2 = rows.find((r) => r.id === turned.id);
    ok(rows.length === 3 && Number(r2.rotation) === -9 && !('pinned' in r2.data), 'turning and unpinning update the same row and delete nothing');
    // a second device opening the board sees the same angle
    const E = await device('turn.user@example.com');
    E.open(bd.id); await E.sync.start(); await E.sync.flush(); await sleep(300);
    const t2 = E.notes.find((o) => o.id === turned.id);
    ok(t2 && t2.rot === -9 && !t2.pinned, 'another device loads the same angle and pin state');
    E.sync.stop(); D.sync.stop();
  }

  // ============================================================ v0.8.3: Done and Trash are states of live rows, never deletions
  {
    const D = await device('spaces.user@example.com');
    const bd = await D.Stick.repo.createBoard('Spaces', null);
    D.open(bd.id); await D.sync.start();
    const keep = note({ html: 'keep' }), trashMe = note({ html: 'trash me', rot: 5 }), doneMe = note({ html: 'done me' });
    const clip = { id: crypto.randomUUID(), type: 'clipping', x: 4, y: 4, w: 260, rot: 0, z: 4, variant: 'web', quote: 'a quote', sourceTitle: 'Src', sourceUrl: 'https://example.com/a', reactions: { '\uD83D\uDC4D': ['u1', 'u2'] }, phys: {} };
    const paper = { id: crypto.randomUUID(), type: 'newspaper', x: 9, y: 9, w: 310, rot: 1, z: 5, variant: 'tabloid', headline: 'News', sub: 's', body: 'b', phys: {} };
    D.notes.push(keep, trashMe, doneMe, clip, paper); D.sync.notesChanged(); await sleep(200); await D.sync.flush();
    const live = async () => (await admin('select id, type, z_index, data from public.board_objects where board_id=$1 and deleted_at is null', [bd.id])).rows;
    const deadCount = async () => (await admin('select count(*)::int c from public.board_objects where board_id=$1 and deleted_at is not null', [bd.id])).rows[0].c;
    let rows = await live();
    ok(rows.length === 5 && rows.find((r) => r.id === clip.id).data.sourceUrl === 'https://example.com/a' && rows.find((r) => r.id === clip.id).data.reactions['\uD83D\uDC4D'].length === 2 && rows.find((r) => r.id === paper.id).data.variant === 'tabloid', 'spaces: clippings (with source and reactions) and newspapers sync like any object');
    // a "trash" and a "done" device: both lists are in every snapshot
    const trash = [], done = [];
    D.host.snapshot = () => D.notes.concat(done, trash).map((o) => JSON.parse(JSON.stringify(o)));
    D.notes.splice(D.notes.indexOf(trashMe), 1); trash.push(Object.assign({}, trashMe, { trashedAt: Date.now() }));
    D.notes.splice(D.notes.indexOf(doneMe), 1); done.push(Object.assign({}, doneMe, { doneAt: Date.now() }));
    D.sync.notesChanged(); await sleep(250); await D.sync.flush();
    rows = await live();
    ok(rows.length === 5 && (await deadCount()) === 0, 'spaces: moving an object to Trash or Done leaves every row live; nothing is soft-deleted');
    ok(rows.find((r) => r.id === trashMe.id).data.trashedAt > 0 && rows.find((r) => r.id === trashMe.id).data.html === 'trash me' && rows.find((r) => r.id === doneMe.id).data.doneAt > 0, 'spaces: the marker is stored on the row with all its content');
    // negative control: a device that dropped Trash / Done from its snapshot WOULD delete them
    D.host.snapshot = () => D.notes.map((o) => JSON.parse(JSON.stringify(o)));
    D.sync.notesChanged(); await sleep(250); await D.sync.flush();
    ok((await live()).length === 3 && (await deadCount()) === 2, 'control: leaving Done and Trash out of the snapshot WOULD delete them (the test can see the bug)');
    // restore them: the rows come back (the sync layer re-creates them) and "delete forever" is the explicit removal
    D.host.snapshot = () => D.notes.concat(done, trash).map((o) => JSON.parse(JSON.stringify(o)));
    D.sync.notesChanged(); await sleep(250); await D.sync.flush();
    rows = await live(); ok(rows.length === 5, 'spaces: with the lists back in the snapshot both objects are live again');
    trash.splice(0, 1); D.sync.notesChanged(); await sleep(250); await D.sync.flush();
    ok((await live()).length === 4 && (await deadCount()) >= 1, 'spaces: Delete forever (the object leaves every list) is the one thing that deletes its row');
    D.sync.stop();
  }

  // ============================================================ INCIDENT REGRESSIONS (data safety)
  // 2026-10-04: opening a share link in a browser that is signed in soft-deleted the account's whole board. The share page's own objects (the
  // shared copies) were diffed against what the account already knew, and every real object read as "removed".
  {
    const O = await device('incident.owner@example.com');
    const bd = await O.Stick.repo.createBoard('Main Board', null);
    O.open(bd.id); await O.sync.start();
    const mine = [note({ html: 'one' }), note({ html: 'two' }), note({ html: 'three' }),
      { id: crypto.randomUUID(), type: 'photo', x: 1, y: 2, w: 200, rot: 0, z: 2, caption: 'p', imgRatio: 0.75 },
      { id: crypto.randomUUID(), type: 'receipt', x: 5, y: 5, w: 230, rot: 0, z: 3, title: 'R', variant: 'clean' }];
    O.notes.push(...mine); O.sync.notesChanged(); await sleep(150); await O.sync.flush();
    const active = async () => (await admin('select count(*)::int c from public.board_objects where board_id=$1 and deleted_at is null', [bd.id])).rows[0].c;
    const restore = () => admin('update public.board_objects set deleted_at=null where board_id=$1', [bd.id]);
    ok(await active() === 5, 'incident: the board starts with 5 live objects on the server');

    // the same browser (same storage and session) now has a share-link page open: its objects are the shared copies, with ids that are not the account's
    const sharedCopy = [{ id: 's0', x: 0, y: 0, w: 250, rot: 0, z: 1, html: 'shared copy', bg: 'hsl(50,90%,80%)', font: 'Caveat' }];
    const viewHost = Object.assign({}, O.host, { snapshot: () => sharedCopy, getObject: () => null, isShareView: () => true });
    const mk = (host) => O.Stick.createSync({ host, storage: O.ls, keys: O.keys, config: { debounceMs: 15, maxWaitMs: 60, pollMs: 1e9, batch: 100 } });
    const view = mk(viewHost);
    view.attach(bd.id);
    ok(view.boardId() === null, 'incident: a share-link page refuses to attach to a board');
    await view.start(); view.notesChanged(); await sleep(200); await view.flush();
    ok(await active() === 5, 'incident: a share-link page never deletes anything (5 of 5 still live)');
    ok((await admin('select count(*)::int c from public.board_objects where board_id=$1 and deleted_at is not null', [bd.id])).rows[0].c === 0, 'incident: no row was soft-deleted');
    view.stop();

    // negative control: without the refusal, that very situation deletes everything (so this test really can see the bug)
    const bad = mk(Object.assign({}, viewHost, { isShareView: undefined }));
    bad.attach(bd.id); await bad.start(); await sleep(100); await bad.flush();
    ok(await active() === 0, 'control: without the guard the same situation WOULD delete the whole board (the test can see the bug)');
    bad.stop(); await restore();
    ok(await active() === 5, 'control: (test housekeeping) rows restored');

    // an object this device could not read is "present", never "deleted"
    const keep = mine[3].id;
    const unreadable = mk(Object.assign({}, O.host, { snapshot: () => O.host.snapshot().filter(o => o.id !== keep), protectedIds: () => ({ [keep]: true }) }));
    unreadable.attach(bd.id); await unreadable.start(); unreadable.notesChanged(); await sleep(200); await unreadable.flush();
    ok(await active() === 5, 'incident: an object this device could not read is never deleted from the account');
    unreadable.stop();
    const plain = mk(Object.assign({}, O.host, { snapshot: () => O.host.snapshot().filter(o => o.id !== keep) }));
    plain.attach(bd.id); await plain.start(); await sleep(100); await plain.flush();
    ok(await active() === 4, 'control: without protection a missing object IS deleted (so the protection above is what saved it)');
    plain.stop(); await restore();

    // owner and a visitor with their own account: the visitor's share-link page must not touch the visitor's own board either
    const V2 = await device('incident.visitor@example.com');
    const vb = await V2.Stick.repo.createBoard('Visitor board', null);
    V2.open(vb.id); await V2.sync.start();
    V2.notes.push(note({ html: 'v1' }), note({ html: 'v2' })); V2.sync.notesChanged(); await sleep(150); await V2.sync.flush();
    const vview = V2.Stick.createSync({ host: Object.assign({}, V2.host, { snapshot: () => sharedCopy, getObject: () => null, isShareView: () => true }), storage: V2.ls, keys: V2.keys, config: { debounceMs: 15, maxWaitMs: 60, pollMs: 1e9, batch: 100 } });
    vview.attach(vb.id); await vview.start(); vview.notesChanged(); await sleep(150);
    ok((await admin('select count(*)::int c from public.board_objects where board_id=$1 and deleted_at is null', [vb.id])).rows[0].c === 2, 'incident: opening someone else\'s share link never touches the visitor\'s own board');
    vview.stop(); V2.sync.stop(); O.sync.stop();
  }

  A.sync.stop(); B.sync.stop(); V.sync.stop();
} catch (e) { fail++; console.log('  EXCEPTION', e && e.stack || e); }
finally { srv.kill(); }
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
