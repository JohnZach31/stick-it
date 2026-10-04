// Public share resolution: every failure the visitor can hit maps to a distinct, true state, and nothing internal reaches the page.
//   node share-errors.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };

function resolverWith(fetchImpl, configured = true) {
  const calls = [];
  const win = {
    Stick: { config: { CLOUD_CONFIGURED: configured, SUPABASE_URL: 'https://x.supabase.co/', SUPABASE_ANON_KEY: 'k'.repeat(30) } },
    location: { origin: 'https://a.example', pathname: '/stick-it/' },
    fetch: (u, o) => { calls.push([u, o]); return fetchImpl(u, o); },
    AbortController, setTimeout: (f, ms) => setTimeout(f, Math.min(ms, 5)), clearTimeout,
  };
  win.window = win; win.self = win;
  vm.createContext(win);
  vm.runInContext(read('js/sharing.js'), win);
  return { resolve: win.Stick.share.resolve, calls, share: win.Stick.share };
}
const reply = (status, body) => () => Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });

const kinds = async (status, body) => (await resolverWith(reply(status, body)).resolve('t'.repeat(64)));
{
  const good = await kinds(200, { ok: true, type: 'board_live', objects: [] });
  ok(good.ok === true && good.type === 'board_live', 'a good answer passes straight through');
  const nf = await kinds(404, { ok: false, reason: 'not_found' });
  ok(!nf.ok && nf.kind === 'not_found' && nf.status === 404, '404 is "not found"');
  const blocked = await kinds(404, { ok: false, reason: 'blocked' });
  ok(blocked.kind === 'not_found', 'a blocked share looks exactly like a missing one');
  const gone = await kinds(410, { ok: false, reason: 'disabled' });
  ok(gone.kind === 'revoked', '410 disabled is "revoked"');
  const exp = await kinds(410, { ok: false, reason: 'expired' });
  ok(exp.kind === 'revoked', 'an expired link is "revoked"');
  const si = await kinds(403, { ok: false, reason: 'sign_in_required' });
  ok(si.kind === 'signin', '401/403 or sign_in_required is "sign in"');
  const rl = await kinds(429, { ok: false, reason: 'rate_limited' });
  ok(rl.kind === 'rate_limited', '429 is "rate limited"');
  const srv = await kinds(502, { ok: false, reason: 'unavailable' });
  ok(srv.kind === 'server' && srv.status === 502, '502 is a server failure, not a connection failure');
  const junk = await resolverWith(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.reject(new Error('not json')) })).resolve('t'.repeat(64));
  ok(junk.kind === 'server', 'a non-JSON 500 is a server failure');
}

// network failure and timeout: tried twice, then "network"
{
  const r = resolverWith(() => Promise.reject(new TypeError('Failed to fetch')));
  const res = await r.resolve('t'.repeat(64));
  ok(!res.ok && res.kind === 'network' && r.calls.length === 2, 'a network failure is retried once, then reported as network');
}
// a transient failure that recovers is invisible
{
  let n = 0;
  const r = resolverWith(() => (++n === 1 ? Promise.reject(new TypeError('x')) : reply(200, { ok: true, type: 'group_snapshot', objects: [] })()));
  const res = await r.resolve('t'.repeat(64));
  ok(res.ok === true && r.calls.length === 2, 'one transient failure followed by success is never shown to the visitor');
  let m = 0;
  const r2 = resolverWith(() => (++m === 1 ? reply(502, { ok: false, reason: 'unavailable' })() : reply(200, { ok: true, type: 'object_snapshot', objects: [] })()));
  ok((await r2.resolve('t'.repeat(64))).ok === true, 'one 502 followed by success is never shown either');
}
// definite answers are not retried
{
  const r = resolverWith(reply(404, { ok: false, reason: 'not_found' }));
  await r.resolve('t'.repeat(64));
  ok(r.calls.length === 1, 'a 404 is not retried');
  const r2 = resolverWith(reply(410, { ok: false, reason: 'disabled' }));
  await r2.resolve('t'.repeat(64));
  ok(r2.calls.length === 1, 'a revoked link is not retried');
}
// request shape: only the token goes up, with the public key
{
  const r = resolverWith(reply(404, { ok: false }));
  await r.resolve('ab'.repeat(32));
  const [url, opts] = r.calls[0];
  ok(url === 'https://x.supabase.co/functions/v1/resolve-share' && opts.method === 'POST', 'the resolver posts to the resolve-share function');
  ok(JSON.parse(opts.body).token === 'ab'.repeat(32) && Object.keys(JSON.parse(opts.body)).length === 1, 'only the token is sent');
  ok(opts.headers.authorization === 'Bearer ' + 'k'.repeat(30), 'the public (anon) key is used, never anything else');
  ok(!!opts.signal, 'the request has a timeout');
}
{
  const r = resolverWith(reply(200, {}), false);
  const res = await r.resolve('t'.repeat(64));
  ok(res.kind === 'server' && r.calls.length === 0, 'with no backend configured nothing is sent');
}
// token parsing
{
  const { share } = resolverWith(reply(200, {}));
  const t = 'ab'.repeat(32);
  ok(share.tokenFromHash('#s=' + t) === t && share.tokenFromHash('#s=' + t.toUpperCase()) === t, 'a good token is read from the hash (any case)');
  ok(share.tokenFromHash('#s=' + t + '&x=1') === null && share.tokenFromHash('#s=short') === null && share.tokenFromHash('') === null, 'anything else is not a token');
}

// the page: honest words, a way out, a way to retry, and no internals
{
  const app = read('js/app.js');
  const must = ["We couldn’t reach Stick-It. Check your connection and try again.", "Stick-It couldn’t open this board right now. Try again in a moment.", 'This shared link is no longer available.', "We couldn’t find this shared board.", 'This board is only shared with invited people. Sign in to continue.'];
  ok(must.every((m) => app.includes(m)), 'all five visitor messages are present, word for word');
  ok(!/Couldn't reach the server/.test(app), 'the old catch-all message is gone');
  ok(/retry: recoverable \? attempt : null/.test(app) && /if\(resolving\) return;/.test(app), 'Try again exists for recoverable failures and cannot run twice at once');
  ok(/miniLoaderHtml\(\) \+ "<span>Opening shared board/.test(app), 'retrying shows the small Stick-It loader');
  ok(/opts\.wrap \|\| publicShell\(\)/.test(app), 'a retry reuses the page instead of stacking another footer');
  ok(!/res\.error|res\.message|\.stack/.test(app.slice(app.indexOf('function shareUnavailable'), app.indexOf('function sharerOf'))), 'the failure page never prints error text from the server');
}
// server contract the page relies on
{
  const h = read('supabase/functions/resolve-share/handler.ts');
  ok(/disabled: 410, expired: 410/.test(h) && /not_found: 404, blocked: 404/.test(h), 'the function answers 404 for missing/blocked and 410 for revoked/expired');
  ok(/502, \{ ok: false, reason: "unavailable" \}/.test(h), 'the function answers 502 only for its own failures');
  const idx = read('supabase/functions/resolve-share/index.ts');
  ok(/ALLOWED_ORIGINS/.test(idx) && /johnzach31\.github\.io/.test(idx), 'the production origin is allowed, and a custom domain only needs the ALLOWED_ORIGINS setting');
}

console.log(`share errors: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
