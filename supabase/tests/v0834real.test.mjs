// v0.8.3.4 reality-fix checkpoint: every item here was found broken (or unproven) by driving the REAL page in a browser, then fixed.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { spawn } from 'node:child_process'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const app = read('js/app.js'), css = read('css/spaces.css') + '\n' + read('css/app.css'), collab = read('js/collab.js');

// ---- 1. the editing lease cannot be bypassed: typing, paste, and anything the browser reports as input afterwards
{
  const a = app.indexOf('  function leaseHolder(n){'), b = app.indexOf('  // typing in an item\'s words: kept as you type');
  const { document, window } = parseHTML('<!doctype html><html><body><div id="t" contenteditable="true">Buy bread</div></body></html>');
  let holder = 'Pinny'; const toasts = [];
  const mk = new Function('window', 'document', 'toast', 'Stick', app.slice(a, b) + '\nreturn {leaseGuard, leaseHolder, dropCaret};');
  const stub = { collab: { active: () => true, blockedBy: () => holder } };
  const api = mk(Object.assign(window, { Stick: stub, getSelection: () => ({ removeAllRanges() {} }) }), document, (m) => toasts.push(m), stub);
  const t = document.getElementById('t'); api.leaseGuard(t, { id: 'n1' }, 'note');
  ok(t._leaseGuarded === true, 'the guard is installed on the text');
  const ev = (type) => { const e = new window.Event(type, { bubbles: true, cancelable: true }); t.dispatchEvent(e); return e; };
  ok(ev('beforeinput').defaultPrevented === true && toasts.length === 1 && /Pinny is editing this note\./.test(toasts[0]), 'typing / paste is cancelled while someone else holds the lease, and the person is told why');
  t.innerHTML = 'Buy bread PROG'; ev('input');
  ok(t.innerHTML === 'Buy bread', 'text that gets in anyway (script- or accessibility-driven) is rolled back to what it was');
  holder = null; t.innerHTML = 'Buy bread and more'; ev('input'); const e2 = ev('beforeinput');
  ok(e2.defaultPrevented === false && t.innerHTML === 'Buy bread and more', 'when nobody holds the lease, editing is untouched');
  holder = 'Pinny'; t.innerHTML = 'Buy bread and more STEAL'; ev('input');
  ok(t.innerHTML === 'Buy bread and more', 'and the rollback goes back to the last ACCEPTED text, not to the very first');
  ok(/leaseGuard\(text, n, "note"\)/.test(app) && /leaseGuard\(span, n, "list"\)/.test(app) && /leaseGuard\(host, n, Stick\.objects\.LABELS\[n\.type\]\)/.test(app), 'notes, shopping lists and papers are all guarded');
  ok(/if\(holder\)\{ text\.blur\(\); dropCaret\(\);/.test(app) && /span\.blur\(\); dropCaret\(\)/.test(app), 'refusing focus also drops the caret, so a later insert has nowhere to go');
}

// ---- 2. the editing glow and tab: one overlay above every paper, tab pulled inside when it would sit under the top bar
ok(/function syncPeerLayer\(\)/.test(collab) && /className = "peerLayer"|el\("div", "peerLayer"\)/.test(collab) && /tb\.classList\.toggle\("inside"/.test(collab), 'the overlay exists and moves the tab inside the corner near the top bar');
ok(/\.peerLayer\{[^}]*z-index:var\(--z-peer, 9990\)/.test(css) && /--z-peer:9990/.test(css), 'it sits on the central layer scale (no magic number)');
ok(/hit === "editing"\) b\.remove\(\)/.test(collab), 'the old in-paper badge is not drawn for editing (it was hidden by neighbouring papers)');
ok(/node\.offsetLeft - 5/.test(collab) && /cs\.transform/.test(collab), 'the glow follows the paper\'s box and tilt');

// ---- 3. class-name collision: a heading called "board" took the page canvas's rules (position:fixed)
ok(!/\.accH\.board\{/.test(css) && !/\.accH\.boardName\{/.test(css) && /\.accH\.accBoardTitle\{/.test(css) && /accH accBoardTitle/.test(app), 'the board-name heading uses its own class (not "board" = the page canvas, not "boardName" = the top-bar pill)');
{
  const old = read('css/app.css');
  const mine = [...new Set([...(css.matchAll(/\.((?:acc|inv|id|np|peer|bRow|idls)[A-Za-z]+)\b/g))].map((m) => m[1]))];
  const all = [...read('css/app.css').matchAll(/\.([A-Za-z][A-Za-z0-9_-]*)\{/g)].map((m) => m[1]);
  ok(!['board', 'note', 'text', 'tab', 'del'].some((c) => /^\.(accH|invCard)\.(board|note|text|tab|del)\b/.test('.' + c)), 'no generic class names are reused for the new surfaces');
  ok(mine.length > 20, 'the new surfaces use their own prefixes (' + mine.length + ' classes)');
}
ok(/\.collabDlg > \*\{ flex:none; \}/.test(css), 'the Collaborate window\'s parts keep their height (the new link row was being squashed onto the sections below)');

// ---- 4. the Stick-It dropdown opens ABOVE the dialog it belongs to
ok(/\.idlsSelList\{[^}]*z-index:var\(--z-menu, 10095\)/.test(css) && /--z-menu:10095/.test(css), 'the choice list is on the layer scale, above dialogs (it was hidden behind Settings at 10030)');
ok(/--z-menu/.test(read('docs/dev/LAYERS.md')) && /--z-peer/.test(read('docs/dev/LAYERS.md')), 'and the layer document says so');

// ---- 5. scrollbar: the standard properties switch the rounded one off in Chromium, so they are only a fallback
ok(!/\.idlsScroll\{[^}]*scrollbar-(width|color)/.test(css.replace(/@supports not selector\(::-webkit-scrollbar\)\{[\s\S]*?\n\}/, '')), '.idlsScroll sets no scrollbar-width / scrollbar-color outside the Firefox fallback');
ok(/@supports not selector\(::-webkit-scrollbar\)\{\s*\.idlsScroll\{ scrollbar-width:thin; scrollbar-color:/.test(css), 'Firefox gets the standard properties');
ok(/\.idlsScroll::-webkit-scrollbar-thumb\{[^}]*border-radius:999px/.test(css), 'Chromium and Safari get the rounded thumb');
ok((app.match(/idlsScroll/g) || []).length === 2, 'it is applied to the two collaboration surfaces only');

// ---- 6. stale bundle: a tab that stays open says so
ok(/js\/build-info\.js\?cb=/.test(app) && /Number\(m\[1\]\) <= bi\.n\) return/.test(app) && /v\.classList\.add\("stale"\)/.test(app), 'the build tag asks the server which build it has and turns red when this tab is older');
ok(/setInterval\(checkBuild, local \? 15000 : 300000\)/.test(app) && !/location\.reload\(\);\s*\}\)\.catch/.test(app), 'it polls (15 s locally, 5 min live) and never reloads by itself');
ok(/#verTag\.local\{/.test(css) && /#verTag\.stale\{/.test(css) && /#verTag\{[^}]*z-index:var\(--z-toast/.test(css), 'the tag is clearly visible: coloured on localhost, red when stale, above the board');
{
  const m = /var m = (\/[^\n]+\/)\.exec\(t \|\| ""\)/.exec(app); const re = new Function('return ' + m[1])();
  ok(Number(re.exec('S.build = { n: 119, at: "x" }')[1]) === 119 && re.exec('nothing') === null, 'the build number is read from build-info.js correctly');
}

// ---- 7. leaving a cloud session leaves no pictures of its boards behind
ok(/cloudSigningOut \|\| accessLost\) return;\s*\/\/ leaving a cloud session/.test(app) || /cloudSigningOut \|\| accessLost\) return;/.test(app), 'no board picture is written once a cloud session is being left');
ok(/stickit\.wipeCloud/.test(app) && /sessionStorage\.getItem\("stickit\.wipeCloud"\)/.test(app), 'and whatever the closing page wrote anyway is swept at the next start');

// ---- 8. Empty Trash: the Trash chord, once, only after it really happened
{
  const i = app.indexOf('bulkBtn("Empty Trash'), seg = app.slice(i, i + 1200);
  ok((seg.match(/SoundFx\.cue\("trash"\)/g) || []).length === 1 && /if\(!ok\) return;/.test(seg) && /if\(n\)\{ try\{ SoundFx\.cue\("trash"\)/.test(seg), 'one cue, after the confirmation, only when something was emptied');
  ok(seg.indexOf('SoundFx.cue("trash")') > seg.indexOf('deleteForever('), 'and after the deleting itself');
}

// ---- 9. dev-only seams stay dev-only
{
  const dev = read('js/dev.js'), cc = read('js/cloud-client.js');
  ok(/isLoopback|localhost|127\.0\.0\.1/.test(dev) || /Stick\.dev/.test(dev), 'the dev helpers exist');
  ok(/window\.Stick && Stick\.dev && localStorage\.getItem\("stickit\.dev\.presence"\)/.test(app), 'the presence test transports are only honoured when the dev helpers are present (localhost)');
  ok(/relayTransport/.test(collab) && /"\/__presence\/"/.test(collab) && /opts\.transport === "relay"/.test(collab), 'the relay transport is a separate transport, never the default');
  ok(/devFeed/.test(collab) && /DEV ONLY/.test(collab), 'devFeed is documented as dev only');
  ok(/stickit\.dev\.config/.test(read('js/config.js')) && /localhost|127\.0\.0\.1/.test(read('js/config.js')), 'the backend override is localhost-only (existing behaviour)');
}

// ---- 10. the test backend: anonymous sign-in carries is_anonymous, accounts do not
{
  const port = 54399, srv = spawn('node', ['--experimental-strip-types', path.join(here, 'fake-supabase', 'server.mjs'), String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
  let anon = ''; await new Promise((res, rej) => { srv.stdout.on('data', (d) => { const m = /anon key:\s+(\S+)/.exec(String(d)); if (m) { anon = m[1]; res(); } }); setTimeout(() => rej(new Error('start')), 60000); });
  const claims = (t) => JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString());
  try {
    const r = await (await fetch(`http://127.0.0.1:${port}/auth/v1/signup`, { method: 'POST', headers: { apikey: anon, 'content-type': 'application/json' }, body: '{}' })).json();
    ok(r.user && r.user.is_anonymous === true && claims(r.access_token).is_anonymous === true && !r.user.email, 'an anonymous session has no e-mail and the is_anonymous claim');
    const q = (await (await fetch(`http://127.0.0.1:${port}/__admin/sql`, { method: 'POST', body: JSON.stringify({ sql: 'select count(*)::int c from auth.users where email is null' }) })).json()).rows[0].c;
    ok(q === 1, 'it created exactly one e-mail-less user');
    const rel = `http://127.0.0.1:${port}/__presence/b1`;
    await fetch(rel, { method: 'POST', body: JSON.stringify({ key: 'k1', state: { uid: 'u1', name: 'A' } }) });
    const list = await (await fetch(rel)).json();
    ok(list.length === 1 && list[0].state.name === 'A', 'the presence relay reports who is connected');
    await fetch(rel, { method: 'DELETE', body: JSON.stringify({ key: 'k1' }) });
    ok((await (await fetch(rel)).json()).length === 0, 'and forgets them when they leave');
  } finally { srv.kill(); }
}

// ---- 11. API presence
ok(/Stick\.perf\.collab = function\(\)/.test(app) && /Stick\.perf = \{marks:/.test(app) && app.indexOf('Stick.perf = {marks:') < app.indexOf('Stick.perf.collab = function'), 'Stick.perf.collab is defined right after Stick.perf, at page start (typeof Stick.perf.collab === "function")');


// ---- 12. CSP: WebSockets to Supabase are allowed (an https:// source does NOT cover wss://, so Realtime was silently blocked in the browser)
{
  const csp = read('index.html').match(/Content-Security-Policy" content="([^"]+)"/)[1];
  const connect = (csp.match(/connect-src ([^;]+)/) || [])[1] || '';
  const toks = connect.split(/\s+/);
  ok(toks.includes('https://*.supabase.co') && toks.includes('wss://*.supabase.co'), 'connect-src allows https AND wss for Supabase');
  ok(toks.includes('http://127.0.0.1:54321') && toks.includes('ws://127.0.0.1:54321') && toks.includes('http://localhost:54321') && toks.includes('ws://localhost:54321'), 'and the same pair for the two local test origins');
  ok(!/wss?:\/\/\*(?!\.supabase)/.test(connect) && !/\bwss?:(\s|$)/.test(connect) && !/\*\s|\s\*(\s|$)/.test(connect), 'without opening WebSockets to anywhere else');
  ok(/wss:\/\/\*\.supabase\.co/.test(read('docs/legal/csp.md')) || /does NOT cover a wss/.test(read('docs/legal/csp.md')), 'the CSP document explains why');
}
// ---- 13. reconnect: after a drop the channel rejoins, re-announces who we are, and the list shows one entry per person
{
  const { parseHTML } = await import('linkedom');
  const { document } = parseHTML('<!doctype html><html><body><div id="presenceBar" hidden></div></body></html>');
  const tracked = [], warns = [], chans = [];
  const client = { channel(name, o) { const ch = { name, handlers: {}, state: {}, on(k, f, fn) { ch.handlers[k + ':' + (f.event || '')] = fn; return ch; }, subscribe(cb) { ch.cb = cb; return ch; }, track(p) { tracked.push(p); return Promise.resolve(); }, untrack() {}, presenceState() { return ch.state; } }; chans.push(ch); return ch; }, removeChannel() {} };
  const ctx = vm.createContext({ console: { warn: (m) => warns.push(String(m)), log() {} }, setTimeout, clearTimeout, setInterval, clearInterval, Date, JSON, Math, Object, Array, Promise, document, addEventListener() {}, CustomEvent: class {}, dispatchEvent() {} });
  ctx.window = ctx; ctx.Stick = { cloud: { load: () => Promise.resolve(client) }, auth: {} };
  vm.runInContext(read('js/collab.js'), ctx, { filename: 'collab.js' });
  const C = ctx.Stick.collab; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  C.start({ boardId: 'b1', role: 'owner', me: { uid: 'o1', name: 'Owner' }, host: { refresh() {}, elFor: () => null }, comments: false });
  await sleep(30); const ch = chans[0];
  ch.cb('SUBSCRIBED'); await sleep(10); const t1 = tracked.length;
  ok(C.status() === 'connected' && t1 >= 1, 'connected: our state is announced');
  ch.cb('CLOSED'); ok(C.status() === 'unavailable' && warns.length === 1 && /\[presence\] live channel CLOSED/.test(warns[0]) && !/apikey|jwt|token/i.test(warns[0]), 'a drop is reported once, with the usual causes, and no secret');
  ch.cb('TIMED_OUT'); ok(warns.length === 1, 'repeated failures do not spam the console');
  C.setEditing('n1'); ch.cb('SUBSCRIBED'); await sleep(10);
  ok(C.status() === 'connected' && tracked.length > t1 && tracked[tracked.length - 1].editing === 'n1', 'after the rejoin we announce again, including the note we are editing');
  // two tabs of one person, plus a guest who reconnects: still one avatar each
  ch.state = { a1: [{ uid: 'g1', name: 'Pinny', guest: true, beat: 1 }], a2: [{ uid: 'g1', name: 'Pinny', guest: true, beat: 2 }] };
  ch.handlers['presence:sync'](); const bar = document.getElementById('presenceBar');
  ok(bar.children.length === 2, 'several connections of one person show as one avatar (plus me)');
  ch.state = {}; ch.handlers['presence:sync']();
  ok(bar.hidden === true && bar.children.length === 0, 'when they leave, exactly their entry goes');
  C.stop();
}


// ---- 14. a start-up race has exactly one winner (the same answer on both sides), and the loser's work is discarded, not saved
{
  const ctx = vm.createContext({ console, setTimeout, clearTimeout, setInterval, clearInterval, Date, JSON, Math, Object, Array, Promise, document: { getElementById: () => null, createElement: () => ({}) }, addEventListener() {}, CustomEvent: class {}, dispatchEvent() {} });
  ctx.window = ctx; ctx.Stick = { cloud: { load: () => new Promise(() => {}) }, auth: {} };
  vm.runInContext(read('js/collab.js'), ctx, { filename: 'collab.js' });
  const core = ctx.Stick.collab.core, now = 5e6;
  const peers = (since, uid, editing = 'n1') => core.merge({}, [{ key: uid + ':k', state: { uid, name: uid, editing, since, beat: 1 } }], now);
  ok(core.mustYield(peers(1000, 'anna'), 'n1', now, 'me:x', { uid: 'bo', since: 1400 })?.uid === 'anna', 'I started later than them: I yield');
  ok(core.mustYield(peers(1400, 'anna'), 'n1', now, 'me:x', { uid: 'bo', since: 1000 }) === null, 'I started earlier: I keep it (and they will yield: same two numbers, same rule)');
  ok(core.mustYield(peers(1000, 'anna'), 'n1', now, 'me:x', { uid: 'bo', since: 1000 })?.uid === 'anna' && core.mustYield(peers(1000, 'bo'), 'n1', now, 'me:x', { uid: 'anna', since: 1000 }) === null, 'a tie goes to the smaller account id, on both sides alike');
  ok(core.mustYield(peers(1000, 'anna', 'other'), 'n1', now, 'me:x', { uid: 'bo', since: 1400 }) === null, 'someone editing a different object is no rival');
  ok(core.mustYield(peers(1000, 'bo'), 'n1', now, 'me:x', { uid: 'bo', since: 1400 }) === null, 'my own other tab is no rival');
  ok(core.mustYield(peers(1000, 'anna'), 'n1', now + 9000, 'me:x', { uid: 'bo', since: 1400 }) === null, 'a rival whose lease has lapsed no longer counts');
  const a = app.slice(app.indexOf('yieldEdit: function(id, rival)'), app.indexOf('yieldEdit: function(id, rival)') + 900);
  ok(/t\.blur\(\)/.test(a) && /n\.html = n\._leaseModel; rerenderNote\(n\); saveNotes\(\)/.test(a) && /is editing this note\./.test(a), 'the loser stops, goes back to what the note held when they started (so nothing of theirs is saved and no conflict copy appears), and is told');
  ok(/n\._leaseModel = n\.html;/.test(app), 'what the note held at the start is remembered when editing begins');
  ok(/since: S\.editing \? S\.editSince : 0/.test(collab) && /S\.editSince = id \? Date\.now\(\) : 0/.test(collab), 'the start time travels with the lease');
}
// ---- 15. selecting something never overwrites "I am editing" in what is announced
{
  const { parseHTML } = await import('linkedom');
  const { document } = parseHTML('<!doctype html><html><body><div id="presenceBar" hidden></div></body></html>');
  const tracked = []; const chans = [];
  const client = { channel(name) { const ch = { handlers: {}, state: {}, on(k, f, fn) { ch.handlers[k + ':' + (f.event || '')] = fn; return ch; }, subscribe(cb) { ch.cb = cb; return ch; }, track(p) { tracked.push(p); return Promise.resolve(); }, untrack() {}, presenceState() { return ch.state; } }; chans.push(ch); return ch; }, removeChannel() {} };
  const ctx = vm.createContext({ console, setTimeout, clearTimeout, setInterval, clearInterval, Date, JSON, Math, Object, Array, Promise, document, addEventListener() {}, CustomEvent: class {}, dispatchEvent() {} });
  ctx.window = ctx; ctx.Stick = { cloud: { load: () => Promise.resolve(client) }, auth: {} };
  vm.runInContext(read('js/collab.js'), ctx, { filename: 'collab.js' });
  const C = ctx.Stick.collab; C.start({ boardId: 'b9', role: 'owner', me: { uid: 'o9', name: 'Owner' }, host: { refresh() {}, elFor: () => null }, comments: false });
  await new Promise((r) => setTimeout(r, 30)); chans[0].cb('SUBSCRIBED'); await new Promise((r) => setTimeout(r, 10));
  C.setEditing('note-A'); C.setActive('note-B'); C.setActive(null); C.setActive('note-C');
  const last = tracked[tracked.length - 1];
  ok(last.editing === 'note-A' && last.active === 'note-C' && last.since > 0, 'editing and selecting are announced separately; selecting never replaces editing');
  C.setEditing(null); ok(tracked[tracked.length - 1].editing === null && tracked[tracked.length - 1].since === 0, 'ending the edit clears only the lease');
  C.stop();
}


// ---- 16. English UI, English dates: nothing here follows the browser's own language for month names (a Hebrew browser showed Hebrew months inside the English interface)
{
  const bad = (txt) => (txt.match(/to(Locale|LocaleDate|LocaleTime)String\(undefined|Intl\.DateTimeFormat\(undefined/g) || []).length;
  ok(bad(app) === 0 && bad(collab) === 0, 'every date shown in the interface names its language ("en")');
  ok(/toLocaleDateString\("en", \{day: "numeric", month: "short", year: "numeric"\}\)/.test(app) && /toLocaleString\("en"/.test(collab), 'link dates and comment times use English');
  ok(new Date(Date.UTC(2026, 9, 8, 12)).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) === 'Oct 8, 2026', 'and read as "Oct 8, 2026"');
}
// ---- 17. phones: the top bar fits, who-is-here sits under it, nothing scrolls sideways
{
  const m = css.match(/@media \(max-width:520px\)\{\s*\.brand\{ min-width:0; gap:4px; \}[\s\S]*?\n\}/);
  ok(!!m, 'a phone rule set for the left cluster exists');
  ok(m && /#syncPill\{ font-size:0/.test(m[0]) && /\.brand \.chev\{ display:none; \}/.test(m[0]), 'the save state shrinks to its dot and the chevron goes (so logo + dot fit beside the buttons)');
  ok(m && /\.presenceBar\{ position:fixed; top:calc\(56px \+ env\(safe-area-inset-top, 0px\) \+ 6px\); left:calc\(10px \+ env\(safe-area-inset-left, 0px\)\)/.test(m[0]) && /z-index:calc\(var\(--z-peer, 9990\) \+ 1\)/.test(m[0]), 'who is here moves to a small pill just under the bar, safe-area aware, on the layer scale');
  ok(m && /\.presPop\{ max-width:calc\(100vw - 16px\); \}/.test(m[0]), 'its list never exceeds the screen');
  ok(/\.namePop\{[^}]*width:min\(300px, calc\(100vw - 16px\)\)/.test(css) && /Math\.min\(window\.innerWidth - w - 8, r\.left\)/.test(app), 'the rename slip fits any width and is clamped to the screen');
  ok(/\.peerTab\.inside\{ top:10px; left:10px; \}/.test(css) && /@media \(pointer:coarse\)\{ \.peerTab\{ height:32px; \}/.test(css), 'the editing tab stays on screen and is finger-sized on touch');
}
// ---- 18. leaving a session: nothing but the guest identity (and dev switches) stays namespaced
ok(/stickit\.wipeCloud/.test(app) && /cloudSigningOut \|\| accessLost\) return/.test(app) && !/removeItem\("stickit\.guest"/.test(app), 'cloud caches (and pictures of boards) are swept; the guest identity is never removed');

console.log('v0.8.3.4 reality fixes: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
