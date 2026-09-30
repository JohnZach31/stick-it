// LOCAL TEST DOUBLE for a Supabase project. NOT a production component and not a substitute for
// testing against your real project (see docs/backend/06-setup.md, "Live smoke test").
//
// It runs the REAL migrations on PGlite and speaks enough of Supabase's HTTP protocols for the
// real supabase-js client to work unchanged:
//   /auth/v1      Google-style PKCE sign-in with a fake account picker, token, refresh, user, logout
//   /rest/v1      PostgREST subset (select/insert/update/delete with filters, rpc)
//   /storage/v1   upload, authenticated download, signed URLs, remove (same RLS policies as production)
//   /functions/v1 resolve-share, report-share (the real handler code)
//   /__admin      test helpers (run SQL, reset)
//
//   node --experimental-strip-types fake-supabase/server.mjs [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { makeResolveHandler } from '../../functions/resolve-share/handler.ts';
import { makeReportHandler } from '../../functions/report-share/handler.ts';
import { RateLimiter } from '../../functions/_shared/http.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv[2] || process.env.PORT || 54321);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const JWT_SECRET = 'fake-supabase-local-secret';

// ---------------------------------------------------------------- database
const db = new PGlite();
await db.exec(fs.readFileSync(path.join(here, '..', 'prelude.sql'), 'utf8'));
const migDir = path.join(here, '..', '..', 'migrations');
for (const f of fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort()) await db.exec(fs.readFileSync(path.join(migDir, f), 'utf8'));
// minimal extra pieces the real platform provides
await db.exec(`update storage.buckets set file_size_limit = file_size_limit where id = 'media';`);

let queue = Promise.resolve();
const serial = (fn) => (queue = queue.then(fn, fn));
const blobs = new Map();       // storage path -> {bytes, type}

// ---------------------------------------------------------------- jwt
const b64u = (b) => Buffer.from(b).toString('base64url');
function sign(claims) {
  const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' })), p = b64u(JSON.stringify(claims));
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${sig}`;
}
function verify(token) {
  const [h, p, s] = String(token || '').split('.');
  if (!h || !p || !s) return null;
  const good = crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${p}`).digest('base64url');
  if (s.length !== good.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(good))) return null;
  try { const c = JSON.parse(Buffer.from(p, 'base64url').toString()); if (c.exp && c.exp < Date.now() / 1000) return null; return c; } catch { return null; }
}
const ANON_KEY = sign({ iss: 'fake-supabase', role: 'anon', exp: 4102444800 });
const SERVICE_KEY = sign({ iss: 'fake-supabase', role: 'service_role', exp: 4102444800 });

// ---------------------------------------------------------------- helpers
const cors = (req, extra = {}) => ({
  'access-control-allow-origin': req.headers.origin || '*',
  'access-control-allow-headers': req.headers['access-control-request-headers'] || '*',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'access-control-expose-headers': 'content-range, x-total-count',
  'access-control-max-age': '600', vary: 'origin', ...extra });
const send = (req, res, status, body, headers = {}) => {
  const isBuf = Buffer.isBuffer(body);
  const raw = isBuf || (typeof body === 'string' && headers['content-type']);   // strings are JSON strings unless a content type says otherwise
  const payload = body === undefined ? '' : raw ? body : JSON.stringify(body);
  res.writeHead(status, cors(req, { ...(raw ? {} : { 'content-type': 'application/json' }), ...headers }));
  res.end(payload);
};
const readBody = (req) => new Promise((ok) => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); });
const q = (o) => (typeof o === 'string' ? o : '');
const ident = (s) => { if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw Object.assign(new Error('bad identifier'), { http: 400 }); return `"${s}"`; };

// run SQL in one transaction as the role/claims from the request's bearer token
async function asCaller(claims, fn) {
  return serial(async () => {
    await db.query('begin');
    try {
      const role = claims?.role === 'service_role' ? 'service_role' : claims?.role === 'authenticated' ? 'authenticated' : 'anon';
      await db.query(`set local role ${role}`);
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims || { role: 'anon' })]);
      const r = await fn(db);
      await db.query('commit');
      return r;
    } catch (e) { await db.query('rollback'); throw e; }
  });
}
const asSuper = (fn) => serial(async () => { await db.query('begin'); try { const r = await fn(db); await db.query('commit'); return r; } catch (e) { await db.query('rollback'); throw e; } });

function pgError(e) {
  const code = e.code || 'XX000';
  const status = e.http || (code === '42501' ? 403 : code === '23505' || code === '23503' ? 409 : code === '28000' ? 401 : code === 'PGRST116' ? 406 : 400);
  return [status, { code, message: e.message, details: e.detail || null, hint: e.hint || null }];
}
function bearer(req) {
  const t = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const c = verify(t);
  return c || verify(req.headers.apikey) || { role: 'anon' };
}

// ---------------------------------------------------------------- auth
const codes = new Map();   // auth code -> {email, challenge}
const sessions = new Map();   // refresh token -> user id
async function findOrCreateUser(email) {
  return asSuper(async (d) => {
    let r = await d.query('select id, email, raw_user_meta_data from auth.users where email = $1', [email]);
    if (!r.rows.length) {
      const name = email.split('@')[0].replace(/^./, c => c.toUpperCase());
      r = await d.query('insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id, email, raw_user_meta_data',
        [email, JSON.stringify({ full_name: `${name} Tester`, avatar_url: `https://img.example/${name}.png` })]);
    }
    return r.rows[0];
  });
}
function sessionFor(u) {
  const now = Math.floor(Date.now() / 1000);
  const access = sign({ iss: 'fake-supabase', sub: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, iat: now, exp: now + 3600,
                        user_metadata: u.raw_user_meta_data, app_metadata: { provider: 'google' } });
  const refresh = crypto.randomUUID();
  sessions.set(refresh, u.id);
  return { access_token: access, token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token: refresh,
           user: { id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, app_metadata: { provider: 'google', providers: ['google'] },
                   user_metadata: u.raw_user_meta_data, identities: [], created_at: new Date().toISOString() } };
}
async function handleAuth(req, res, url, body) {
  const p = url.pathname.replace('/auth/v1', '');
  if (p === '/authorize') {
    const redirect = url.searchParams.get('redirect_to') || ORIGIN;
    const challenge = url.searchParams.get('code_challenge') || '';
    const hint = url.searchParams.get('login_hint');
    const finish = (email) => {
      const code = crypto.randomUUID();
      codes.set(code, { email, challenge });
      const to = new URL(redirect); to.searchParams.set('code', code);
      res.writeHead(302, { location: to.toString() }); res.end();
    };
    if (hint) return finish(hint);
    const users = (await asSuper(d => d.query('select email from auth.users order by created_at'))).rows;
    const items = ['alice', 'bob', 'carol', 'dave'].map(n => `${n}@example.com`).concat(users.map(u => u.email)).filter((e, i, a) => a.indexOf(e) === i);
    const link = (e) => { const u = new URL(url); u.searchParams.set('login_hint', e); return `<li><a href="${u.pathname + u.search}">${e}</a></li>`; };
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(`<!doctype html><meta charset=utf-8><title>Fake Google sign-in</title><body style="font:16px system-ui;max-width:420px;margin:60px auto"><h2>Fake Google account picker</h2><p>Test double: pick an account.</p><ul>${items.map(link).join('')}</ul>`);
    return;
  }
  if (p === '/token') {
    const grant = url.searchParams.get('grant_type');
    const j = JSON.parse(body.toString() || '{}');
    if (grant === 'pkce') {
      const c = codes.get(j.auth_code);
      if (!c) return send(req, res, 400, { error: 'invalid_grant', error_description: 'invalid code' });
      const good = crypto.createHash('sha256').update(String(j.code_verifier || '')).digest('base64url');
      if (good !== c.challenge) return send(req, res, 400, { error: 'invalid_grant', error_description: 'code verifier mismatch' });
      codes.delete(j.auth_code);
      return send(req, res, 200, sessionFor(await findOrCreateUser(c.email)));
    }
    if (grant === 'refresh_token') {
      const uid = sessions.get(j.refresh_token);
      if (!uid) return send(req, res, 400, { error: 'invalid_grant', error_description: 'Invalid Refresh Token' });
      sessions.delete(j.refresh_token);
      const u = (await asSuper(d => d.query('select id, email, raw_user_meta_data from auth.users where id=$1', [uid]))).rows[0];
      return send(req, res, 200, sessionFor(u));
    }
    return send(req, res, 400, { error: 'unsupported_grant_type' });
  }
  if (p === '/user') {
    const c = verify((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
    if (!c || !c.sub) return send(req, res, 401, { message: 'invalid JWT' });
    const u = (await asSuper(d => d.query('select id, email, raw_user_meta_data from auth.users where id=$1', [c.sub]))).rows[0];
    return send(req, res, 200, { id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, user_metadata: u.raw_user_meta_data, app_metadata: { provider: 'google' } });
  }
  if (p === '/logout') return send(req, res, 204);
  if (p === '/settings') return send(req, res, 200, { external: { google: true }, disable_signup: false });
  return send(req, res, 404, { message: 'not found' });
}

// ---------------------------------------------------------------- rest (PostgREST subset)
const colCache = new Map();
async function columns(d, table) {
  if (colCache.has(table)) return colCache.get(table);
  const r = await d.query("select column_name, udt_name from information_schema.columns where table_schema='public' and table_name=$1", [table]);
  const m = Object.fromEntries(r.rows.map(x => [x.column_name, x.udt_name]));
  colCache.set(table, m); return m;
}
const OPS = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', like: 'like', ilike: 'ilike' };
function param(udt, v) {
  if (v === null || v === undefined) return null;
  if (udt === 'jsonb' || udt === 'json') return JSON.stringify(v);
  if (udt.startsWith('_') && Array.isArray(v)) return `{${v.map(x => JSON.stringify(String(x))).join(',')}}`;
  return v;
}
async function buildWhere(d, table, url, vals) {
  const cols = await columns(d, table), parts = [];
  for (const [k, v] of url.searchParams) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) continue;
    const dot = v.indexOf('.'), op = v.slice(0, dot), arg = v.slice(dot + 1);
    if (!cols[k]) throw Object.assign(new Error(`column ${k} does not exist`), { code: '42703' });
    if (op === 'is') { parts.push(`${ident(k)} is ${arg === 'null' ? 'null' : arg === 'true' ? 'true' : 'false'}`); continue; }
    if (op === 'in') {
      const list = arg.replace(/^\(|\)$/g, '').split(',').map(x => x.replace(/^"|"$/g, ''));
      vals.push(list); parts.push(`${ident(k)} = any($${vals.length}::${cols[k]}[])`); continue;
    }
    if (!OPS[op]) throw Object.assign(new Error(`unsupported operator ${op}`), { http: 400 });
    vals.push(arg); parts.push(`${ident(k)} ${OPS[op]} $${vals.length}::${cols[k]}`);
  }
  return parts.length ? ' where ' + parts.join(' and ') : '';
}
function orderBy(url) {
  const o = url.searchParams.get('order'); if (!o) return '';
  return ' order by ' + o.split(',').map(s => { const [c, dir] = s.split('.'); return `${ident(c)} ${dir === 'desc' ? 'desc' : 'asc'}`; }).join(', ');
}
async function handleRest(req, res, url, body) {
  const claims = bearer(req);
  const p = url.pathname.replace('/rest/v1/', '');
  const wantsObject = /pgrst\.object/.test(req.headers.accept || '');
  const prefer = req.headers.prefer || '';
  const rep = /return=representation/.test(prefer);
  try {
    if (p.startsWith('rpc/')) {
      const fn = p.slice(4); ident(fn);
      const args = body.length ? JSON.parse(body.toString()) : {};
      const out = await asCaller(claims, async (d) => {
        const meta = (await d.query(`select p.proargnames, (select array_agg(format_type(o, null) order by ord) from unnest(p.proargtypes::oid[]) with ordinality u(o, ord)) as argtypes,
                       p.proretset, t.typtype from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_type t on t.oid = p.prorettype
                       where n.nspname='public' and p.proname=$1`, [fn])).rows[0];
        if (!meta) throw Object.assign(new Error(`Could not find the function public.${fn}`), { code: 'PGRST202', http: 404 });
        const names = meta.proargnames || [], types = meta.argtypes || [];
        const vals = [], sql = [];
        for (const [k, v] of Object.entries(args)) {
          const i = names.indexOf(k); if (i < 0) throw Object.assign(new Error(`unknown argument ${k}`), { code: 'PGRST202', http: 404 });
          const isArr = types[i].endsWith('[]'), isJson = /^jsonb?$/.test(types[i]);
          vals.push(isJson ? JSON.stringify(v) : isArr && Array.isArray(v) ? `{${v.map(x => JSON.stringify(String(x))).join(',')}}` : v);
          sql.push(`${ident(k)} => $${vals.length}::${types[i]}`);
        }
        const call = `public.${fn}(${sql.join(', ')})`;
        if (meta.proretset || meta.typtype === 'c') { const r = await d.query(`select * from ${call}`, vals); return meta.proretset ? r.rows : r.rows[0]; }
        const r = await d.query(`select ${call} as r`, vals); return r.rows[0].r;
      });
      return send(req, res, 200, out === undefined ? null : out);
    }
    const table = p.split('?')[0]; ident(table);
    const out = await asCaller(claims, async (d) => {
      const cols = await columns(d, table);
      if (!Object.keys(cols).length) throw Object.assign(new Error(`relation "public.${table}" does not exist`), { code: '42P01', http: 404 });
      const vals = [];
      if (req.method === 'GET' || req.method === 'HEAD') {
        const sel = (url.searchParams.get('select') || '*').replace(/\s+/g, '');
        const list = sel === '*' ? '*' : sel.split(',').map(c => ident(c)).join(', ');
        const where = await buildWhere(d, table, url, vals);
        const lim = url.searchParams.get('limit');
        const r = await d.query(`select ${list} from public.${ident(table)}${where}${orderBy(url)}${lim ? ` limit ${parseInt(lim, 10)}` : ''}`, vals);
        return { rows: r.rows, status: 200 };
      }
      if (req.method === 'POST') {
        const rows = [].concat(JSON.parse(body.toString() || '[]'));
        const keys = [...new Set(rows.flatMap(r => Object.keys(r)))];
        const tuples = rows.map(r => '(' + keys.map(k => { vals.push(param(cols[k], r[k])); return `$${vals.length}::${cols[k]}`; }).join(', ') + ')');
        const conflict = url.searchParams.get('on_conflict');
        const merge = /merge-duplicates/.test(prefer);
        const onc = conflict ? ` on conflict (${conflict.split(',').map(ident).join(',')}) ${merge ? 'do update set ' + keys.map(k => `${ident(k)} = excluded.${ident(k)}`).join(', ') : 'do nothing'}` : '';
        const r = await d.query(`insert into public.${ident(table)} (${keys.map(ident).join(', ')}) values ${tuples.join(', ')}${onc} returning *`, vals);
        return { rows: r.rows, status: 201 };
      }
      if (req.method === 'PATCH') {
        const patch = JSON.parse(body.toString() || '{}');
        const sets = Object.keys(patch).map(k => { vals.push(param(cols[k], patch[k])); return `${ident(k)} = $${vals.length}::${cols[k]}`; });
        const where = await buildWhere(d, table, url, vals);
        const r = await d.query(`update public.${ident(table)} set ${sets.join(', ')}${where} returning *`, vals);
        return { rows: r.rows, status: 200 };
      }
      if (req.method === 'DELETE') {
        const where = await buildWhere(d, table, url, vals);
        const r = await d.query(`delete from public.${ident(table)}${where} returning *`, vals);
        return { rows: r.rows, status: 200 };
      }
      throw Object.assign(new Error('method not allowed'), { http: 405 });
    });
    if (req.method === 'GET' || rep) {
      if (wantsObject) {
        if (out.rows.length !== 1) return send(req, res, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${out.rows.length} rows`, hint: null });
        return send(req, res, out.status, out.rows[0]);
      }
      return send(req, res, out.status, out.rows);
    }
    return send(req, res, out.status === 201 ? 201 : 204);
  } catch (e) { const [st, b] = pgError(e); return send(req, res, st, b); }
}

// ---------------------------------------------------------------- storage
const publicUrl = (p, token) => `${ORIGIN}/storage/v1/object/sign/media/${p.split('/').map(encodeURIComponent).join('/')}?token=${token}`;
function signedToken(p, expiresIn) { const now = Math.floor(Date.now() / 1000); return sign({ url: `media/${p}`, iat: now, exp: now + expiresIn }); }
async function handleStorage(req, res, url, body) {
  const claims = bearer(req);
  const rest = url.pathname.replace('/storage/v1/object', '');
  try {
    // signed public download
    let m = /^\/sign\/media\/(.+)$/.exec(rest);
    if (m && req.method === 'GET') {
      const p = decodeURIComponent(m[1]); const t = verify(url.searchParams.get('token'));
      if (!t || t.url !== `media/${p}`) return send(req, res, 400, { statusCode: '400', error: 'InvalidJWT', message: 'invalid signature' });
      const b = blobs.get(p); if (!b) return send(req, res, 404, { statusCode: '404', error: 'not_found', message: 'Object not found' });
      return send(req, res, 200, b.bytes, { 'content-type': b.type, 'cache-control': 'max-age=3600' });
    }
    // create signed URL(s)
    m = /^\/sign\/media(?:\/(.+))?$/.exec(rest);
    if (m && req.method === 'POST') {
      const j = JSON.parse(body.toString() || '{}');
      const paths = m[1] ? [decodeURIComponent(m[1])] : (j.paths || []);
      const out = await asCaller(claims, async (d) => Promise.all(paths.map(async (p) => {
        const r = await d.query("select 1 from storage.objects where bucket_id='media' and name=$1", [p]);
        return r.rows.length ? { path: p, signedURL: `/object/sign/media/${p.split('/').map(encodeURIComponent).join('/')}?token=${signedToken(p, j.expiresIn || 3600)}`, error: null }
                             : { path: p, signedURL: null, error: 'Object not found' };
      })));
      if (m[1]) return out[0].error ? send(req, res, 400, { statusCode: '400', error: 'not_found', message: 'Object not found' }) : send(req, res, 200, { signedURL: out[0].signedURL });
      return send(req, res, 200, out);
    }
    // upload
    m = /^\/media\/(.+)$/.exec(rest);
    if (m && (req.method === 'POST' || req.method === 'PUT')) {
      const p = decodeURIComponent(m[1]);
      const fd = await new Response(body, { headers: { 'content-type': req.headers['content-type'] || '' } }).formData();
      let file = null; for (const [, v] of fd.entries()) if (typeof v !== 'string') file = v;
      if (!file) return send(req, res, 400, { statusCode: '400', error: 'invalid_request', message: 'no file' });
      const bytes = Buffer.from(await file.arrayBuffer());
      const type = (file.type || 'application/octet-stream').toLowerCase();
      const bucket = (await asSuper(d => d.query("select file_size_limit, allowed_mime_types from storage.buckets where id='media'"))).rows[0];
      if (bucket.file_size_limit && bytes.length > Number(bucket.file_size_limit)) return send(req, res, 413, { statusCode: '413', error: 'Payload too large', message: 'The object exceeded the maximum allowed size' });
      if (bucket.allowed_mime_types && !bucket.allowed_mime_types.includes(type.split(';')[0])) return send(req, res, 415, { statusCode: '415', error: 'invalid_mime_type', message: `mime type ${type} is not supported` });
      await asCaller(claims, (d) => d.query("insert into storage.objects (bucket_id, name, owner, metadata) values ('media', $1, $2, $3::jsonb)",
        [p, claims.sub || null, JSON.stringify({ size: bytes.length, mimetype: type.split(';')[0], eTag: crypto.createHash('md5').update(bytes).digest('hex') })]));
      blobs.set(p, { bytes, type });
      return send(req, res, 200, { Id: crypto.randomUUID(), Key: `media/${p}` });
    }
    // authenticated download
    m = /^\/(?:authenticated\/)?media\/(.+)$/.exec(rest);
    if (m && req.method === 'GET') {
      const p = decodeURIComponent(m[1]);
      const ok = await asCaller(claims, (d) => d.query("select 1 from storage.objects where bucket_id='media' and name=$1", [p]));
      const b = blobs.get(p);
      if (!ok.rows.length || !b) return send(req, res, 400, { statusCode: '404', error: 'not_found', message: 'Object not found' });
      return send(req, res, 200, b.bytes, { 'content-type': b.type });
    }
    // remove
    if (/^\/media$/.test(rest) && req.method === 'DELETE') {
      const j = JSON.parse(body.toString() || '{}'); const gone = [];
      for (const p of j.prefixes || []) {
        const r = await asCaller(claims, (d) => d.query("delete from storage.objects where bucket_id='media' and name=$1 returning name", [p]));
        if (r.rows.length) { blobs.delete(p); gone.push({ name: p, bucket_id: 'media' }); }
      }
      return send(req, res, 200, gone);
    }
    return send(req, res, 404, { statusCode: '404', error: 'not_found', message: 'no such route' });
  } catch (e) { const [st, b] = pgError(e); return send(req, res, st === 403 ? 403 : st, { statusCode: String(st), error: e.code || 'error', message: e.message }); }
}

// ---------------------------------------------------------------- edge functions (real handlers)
const allowed = ['http://127.0.0.1:8123', 'http://localhost:8123', 'http://127.0.0.1:8124', 'http://localhost:8124'];
const resolveHandler = makeResolveHandler({
  allowedOrigins: allowed, limiter: new RateLimiter(600, 60000),
  resolve: async (token) => (await asCaller({ role: 'service_role' }, d => d.query('select public.resolve_share($1) as r', [token]))).rows[0].r,
  sign: async (paths, exp) => Object.fromEntries(paths.map(p => [p, publicUrl(p, signedToken(p, exp))])),
});
const reportHandler = makeReportHandler({
  allowedOrigins: allowed, limiter: new RateLimiter(50, 60000),
  report: async (token, reason) => {
    const h = crypto.createHash('sha256').update(token).digest('hex');
    const s = (await asCaller({ role: 'service_role' }, d => d.query('select id from public.shares where token_hash=$1', [h]))).rows[0];
    if (!s) return false;
    await asCaller({ role: 'service_role' }, d => d.query('insert into public.share_reports (share_id, reason) values ($1,$2)', [s.id, reason]));
    return true;
  },
});
async function handleFunction(req, res, url, body) {
  const name = url.pathname.replace('/functions/v1/', '');
  const h = name === 'resolve-share' ? resolveHandler : name === 'report-share' ? reportHandler : null;
  if (!h) return send(req, res, 404, { message: 'function not found' });
  const r = await h(new Request(ORIGIN + url.pathname, { method: req.method, headers: req.headers, body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : body }));
  const out = Buffer.from(await r.arrayBuffer());
  const hdr = Object.fromEntries(r.headers.entries());
  res.writeHead(r.status, { ...hdr, 'access-control-allow-origin': req.headers.origin || hdr['access-control-allow-origin'] || '*' });
  res.end(out);
}

// ---------------------------------------------------------------- admin (tests only)
async function handleAdmin(req, res, url, body) {
  const j = body.length ? JSON.parse(body.toString()) : {};
  if (url.pathname === '/__admin/config') return send(req, res, 200, { url: ORIGIN, anonKey: ANON_KEY, serviceKey: SERVICE_KEY });
  if (url.pathname === '/__admin/sql') {
    try { const r = await asSuper(d => d.query(j.sql, j.params || [])); return send(req, res, 200, { rows: r.rows }); }
    catch (e) { return send(req, res, 400, { error: e.message }); }
  }
  if (url.pathname === '/__admin/blobs') return send(req, res, 200, { count: blobs.size, paths: [...blobs.keys()] });
  return send(req, res, 404, {});
}

// ---------------------------------------------------------------- server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, ORIGIN);
  if (req.method === 'OPTIONS') { res.writeHead(204, cors(req)); return res.end(); }
  try {
    const body = await readBody(req);
    if (url.pathname.startsWith('/auth/v1')) return await handleAuth(req, res, url, body);
    if (url.pathname.startsWith('/rest/v1')) return await handleRest(req, res, url, body);
    if (url.pathname.startsWith('/storage/v1/object')) return await handleStorage(req, res, url, body);
    if (url.pathname.startsWith('/functions/v1')) return await handleFunction(req, res, url, body);
    if (url.pathname.startsWith('/__admin')) return await handleAdmin(req, res, url, body);
    return send(req, res, 200, { ok: true, service: 'fake-supabase (test double)' });
  } catch (e) { console.error(e); return send(req, res, 500, { message: String(e.message) }); }
});
server.listen(PORT, '127.0.0.1', () => {
  console.log(`fake-supabase listening on ${ORIGIN}`);
  console.log(`anon key:    ${ANON_KEY}`);
});
