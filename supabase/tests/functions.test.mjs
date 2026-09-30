// Unit tests for the Edge Function handlers (pure logic, no Deno, no network).
//   node --experimental-strip-types functions.test.mjs
import { RateLimiter } from '../functions/_shared/http.ts';
import { makeResolveHandler } from '../functions/resolve-share/handler.ts';
import { makeReportHandler } from '../functions/report-share/handler.ts';
import { makeGcHandler } from '../functions/gc-assets/handler.ts';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const TOKEN = 'a'.repeat(64);
const ORIGIN = 'https://johnzach31.github.io';
const req = (body, { method = 'POST', origin = ORIGIN, ip = '1.1.1.1' } = {}) =>
  new Request('https://x.test/fn', { method, body: method === 'POST' ? JSON.stringify(body) : undefined, headers: { origin, 'x-forwarded-for': ip, 'content-type': 'application/json' } });

// ---------------------------------------------------------------- resolve-share
{
  const secretPath = 'a/22222222-2222-2222-2222-222222222222/photo.jpg';
  const calls = { sign: 0 };
  const share = { ok: true, type: 'group_snapshot', by_name: 'Alice', created_at: 'now', board: null,
    objects: [{ type: 'photo', x: 1, y: 2, data: { assetId: 'A1', caption: 'hi' } }],
    assets: { A1: { path: secretPath, mime: 'image/jpeg', kind: 'image', width: 10, height: 20, duration: null } } };
  const mk = (over = {}) => makeResolveHandler({
    allowedOrigins: [ORIGIN], limiter: new RateLimiter(3, 60000),
    resolve: async (t) => (t === TOKEN ? share : { ok: false, reason: 'not_found' }),
    sign: async (paths) => { calls.sign++; return Object.fromEntries(paths.map(p => [p, 'https://signed.example/' + encodeURIComponent(p) + '?t=1'])); },
    ...over });

  let h = mk();
  let r = await h(req({ token: TOKEN }));
  let body = await r.json();
  ok(r.status === 200 && body.ok && body.objects.length === 1, 'valid token resolves');
  ok(body.assets.A1.url.startsWith('https://signed.example/'), 'media comes back as a signed URL');
  ok(!('path' in body.assets.A1) && !JSON.stringify(body).includes('"path"'), 'the raw storage path is never returned, only a signed URL');
  ok(r.headers.get('access-control-allow-origin') === ORIGIN, 'CORS allows the app origin');
  ok(!(await h(req({ token: TOKEN }, { origin: 'https://evil.example' }))).headers.get('access-control-allow-origin'), 'CORS does not allow other origins');
  h = mk();
  ok((await h(req({ token: 'short' }))).status === 404, 'malformed token -> 404 without touching the database');
  ok((await h(req({ token: 'b'.repeat(64) }))).status === 404, 'unknown token -> 404');
  h = mk();
  const statuses = []; for (let i = 0; i < 5; i++) statuses.push((await h(req({ token: TOKEN }, { ip: '9.9.9.9' }))).status);
  ok(statuses.slice(0, 3).every(s => s === 200) && statuses.slice(3).every(s => s === 429), 'rate limit kicks in per client');
  ok((await h(req({ token: TOKEN }, { ip: '8.8.8.8' }))).status === 200, 'other clients unaffected');
  ok((await mk()(req(null, { method: 'GET' }))).status === 405, 'GET refused');
  ok((await mk()(req(null, { method: 'OPTIONS' }))).status === 204, 'preflight ok');
  const big = new Request('https://x.test', { method: 'POST', body: JSON.stringify({ token: TOKEN, pad: 'x'.repeat(10000) }), headers: { origin: ORIGIN } });
  ok((await mk()(big)).status === 404, 'oversized body refused');
  ok((await mk({ resolve: async () => ({ ok: false, reason: 'disabled' }) })(req({ token: TOKEN }))).status === 410, 'disabled share -> 410');
  ok((await mk({ resolve: async () => ({ ok: false, reason: 'expired' }) })(req({ token: TOKEN }))).status === 410, 'expired share -> 410');
  ok((await mk({ resolve: async () => ({ ok: false, reason: 'blocked' }) })(req({ token: TOKEN }))).status === 404, 'blocked share looks like not-found');
  ok((await mk({ resolve: async () => { throw new Error('db down'); } })(req({ token: TOKEN }))).status === 502, 'backend failure -> 502, no details');
  ok((await mk({ sign: async () => { throw new Error('storage down'); } })(req({ token: TOKEN }))).status === 502, 'signing failure -> 502');
  body = await (await mk({ sign: async () => ({}) })(req({ token: TOKEN }))).json();
  ok(body.ok && Object.keys(body.assets).length === 0, 'assets that could not be signed are omitted, not leaked');
  const noMedia = { ...share, assets: {} }; calls.sign = 0;
  await mk({ resolve: async () => noMedia })(req({ token: TOKEN }));
  ok(calls.sign === 0, 'no signing call when a share has no media');
}

// ---------------------------------------------------------------- report-share
{
  const reports = [];
  const h = makeReportHandler({ allowedOrigins: [ORIGIN], limiter: new RateLimiter(2, 60000),
    report: async (t, reason) => { reports.push([t, reason]); return t === TOKEN; } });
  const known = await h(req({ token: TOKEN, reason: 'spam' }));
  const unknown = await h(req({ token: 'c'.repeat(64) }));
  ok(known.status === 200 && unknown.status === 200 && JSON.stringify(await known.json()) === JSON.stringify(await unknown.json()), 'same answer for known and unknown tokens');
  ok((await h(req({ token: TOKEN }))).status === 429, 'reports are rate limited');
  ok((await makeReportHandler({ allowedOrigins: [], limiter: new RateLimiter(9, 1), report: async () => true })(req({ token: 'nope' }))).status === 404, 'malformed token rejected');
  ok(reports[0][1] === 'spam', 'reason passed through');
}

// ---------------------------------------------------------------- gc-assets
{
  const log = [];
  const deps = (over = {}) => ({ secret: 's3cret-value',
    purgeObjects: async () => { log.push('purge'); return 2; },
    claimAssets: async () => { log.push('claim'); return [{ id: '1', storage_path: 'p1' }, { id: '2', storage_path: 'p2' }]; },
    finishAssets: async (ids) => { log.push('finish:' + ids.join()); return ids.length; },
    tombstones: async () => { log.push('tombstones'); return Array.from({ length: 120 }, (_, i) => 'f' + i); },
    removeFiles: async (p) => { log.push('remove:' + p.length); },
    clearTombstones: async (p) => { log.push('clear:' + p.length); }, ...over });
  const call = (h, secret) => h(new Request('https://x.test', { method: 'POST', headers: secret === undefined ? {} : { 'x-cron-secret': secret } }));
  ok((await call(makeGcHandler(deps()), undefined)).status === 401, 'no secret -> 401');
  ok((await call(makeGcHandler(deps()), 'wrong-secret-!')).status === 401, 'wrong secret -> 401');
  ok((await call(makeGcHandler(deps({ secret: '' })), '')).status === 401, 'an unset server secret never authorises anyone');
  ok(log.length === 0, 'nothing ran without the secret');
  const r = await call(makeGcHandler(deps()), 's3cret-value');
  const out = await r.json();
  ok(r.status === 200 && out.assetsClaimed === 2 && out.filesRemoved === 120 && out.objectsPurged === 2, 'authorised run reports counts');
  ok(log.indexOf('finish:1,2') < log.indexOf('tombstones') && log.indexOf('tombstones') < log.findIndex(l => l.startsWith('remove')), 'rows are finished before files are removed (so their tombstones are included)');
  ok(log.filter(l => l.startsWith('remove')).join() === 'remove:50,remove:50,remove:20', 'files removed in batches of 50');
  ok(log.filter(l => l.startsWith('clear')).length === 3, 'tombstones cleared only after each batch is removed');
  const partial = []; let n = 0;
  await call(makeGcHandler(deps({ removeFiles: async (p) => { if (++n === 2) throw new Error('storage error'); partial.push(p.length); }, clearTombstones: async () => {} })), 's3cret-value').catch(() => {});
  ok(partial.length === 1, 'a failing batch stops the run (the rest stay queued for next time)');
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
