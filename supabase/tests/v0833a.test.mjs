// v0.8.3.3 environment fixes: OAuth return address, stale cached session, local-development identity, no-cache dev server.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const cc = read('js/cloud-client.js'), app = read('js/app.js');
function load(href) {                      // run the real cloud-client in a tiny fake window at a given address
  const u = new URL(href), store = {}, logs = [];
  const win = { location: { origin: u.origin, pathname: u.pathname, hostname: u.hostname, search: u.search, hash: u.hash }, localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } }, console: { info: (...a) => logs.push(a.join(' ')) }, document: {} };
  win.window = win; win.Stick = { config: { CLOUD_CONFIGURED: true, SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'k', REDIRECT_URL: 'https://johnzach31.github.io/stick-it/' } };
  vm.runInNewContext(cc, win); return { win, logs, store };
}
let r = load('http://localhost:8123/'); ok(r.win.Stick.authDiag.redirectUrl() === 'http://localhost:8123/', 'on localhost the return address is the local origin, port and path, even when a production REDIRECT_URL is configured');
r = load('http://127.0.0.1:5500/app/index.html'); ok(r.win.Stick.authDiag.redirectUrl() === 'http://127.0.0.1:5500/app/index.html', '127.0.0.1 keeps its own port and path');
r = load('https://johnzach31.github.io/stick-it/'); ok(r.win.Stick.authDiag.redirectUrl() === 'https://johnzach31.github.io/stick-it/' && r.logs.length === 0, 'on GitHub Pages it returns to Pages and nothing is logged');
r = load('http://localhost:8123/?code=abc'); ok(r.logs.some((l) => /\[auth\] page http:\/\/localhost:8123\//.test(l) && /code present/.test(l)) && !r.logs.some((l) => /abc/.test(l)), 'localhost logs that a callback arrived but never prints the code');
ok(!/github\.io/.test(cc.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')), 'no GitHub Pages address is hardcoded in the client');
ok(/redirectTo = redirectUrl\(\)/.test(cc) && (cc.match(/redirectUrl\(\)/g) || []).length >= 3, 'both sign-in and link-identity use the environment-aware address');
ok(/Stick\.auth\.staleSession = /.test(cc) && /Retryable\|fetch\|network/.test(cc) && /dropStale: function/.test(cc), 'a rejected cached login is detected as stale; a network failure is not');
ok(/Stick\.auth\.staleSession && navigator\.onLine && !Stick\.auth\.callbackPending/.test(app) && /stickit\.staleDropped/.test(app) && /location\.reload\(\)/.test(app.slice(app.indexOf('staleSession && navigator'), app.indexOf('staleSession && navigator') + 700)), 'a stale login falls back to guest by reloading once (no reload loop)');
ok(/Local Development/.test(app) && /localhost"; \}/.test(app) && /isLoopback\(\)/.test(app), 'a local build shows its own title and version marker; production does not');
ok(fs.existsSync(path.join(root, 'tools/dev-server.mjs')) && /no-store/.test(read('tools/dev-server.mjs')), 'a no-cache dev server is in the repo');
ok(/Redirect URLs/.test(read('docs/dev/LOCAL-AUTH.md')) && /localhost:8123\/\*\*/.test(read('docs/dev/LOCAL-AUTH.md')), 'the Supabase allow-list step is documented');
console.log('v0.8.3.3a: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
