// v0.8.3.4 "Lock it down": realtime wiring, error codes, invite UI structure, scroll/drag routing, settings layout, retired font, legal comparison.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const read = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const app = read('js/app.js'), css = read('css/spaces.css') + read('css/app.css');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- realtime: behaviour with a fake client
{
  const channels = [], removed = [];
  const client = { channel(name) { const ch = { name, handlers: [], on(kind, filter, fn) { ch.handlers.push({ kind, filter, fn }); return ch; }, subscribe(cb) { ch.cb = cb; return ch; } }; channels.push(ch); return ch; }, removeChannel(ch) { removed.push(ch.name); } };
  const ctx = vm.createContext({ console, setTimeout, clearTimeout, setInterval, clearInterval, navigator: { onLine: true }, Promise, Date, JSON, Object, Array, Math });
  ctx.window = ctx; ctx.Stick = { config: {}, cloud: { load: () => Promise.resolve(client) }, repo: { fetchObjects: async () => [], fetchChanges: async () => [], toRow: (x) => x, fromRow: (x) => x, hashRow: () => 'h', syncObjects: async () => ({ results: [] }) }, assets: {}, errors: { parse: (e) => ({ message: String(e) }) } };
  vm.runInContext(read('js/sync.js'), ctx, { filename: 'sync.js' });
  let pulls = 0; const store = new Map();
  const mk = () => ctx.Stick.createSync({ host: { snapshot: () => [], getObject: () => null, applyRemote: () => {} }, storage: { getItem: (k) => store.get(k) || null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    keys: { sync: (i) => 's' + i, meta: () => 'm', notes: (i) => 'n' + i, boards: () => 'b', cover: (i) => 'c' + i }, config: { pollMs: 1e9 }, repo: { ...ctx.Stick.repo, fetchChanges: async () => { pulls++; return []; }, fetchObjects: async () => { pulls++; return []; } } });
  const s = mk(); s.attach('board-A'); await s.start(); await sleep(20);
  ok(channels.length === 1 && channels[0].name === 'objects:board-A', 'one realtime channel, named for the active board');
  const h = channels[0].handlers[0];
  ok(h.kind === 'postgres_changes' && h.filter.table === 'board_objects' && h.filter.filter === 'board_id=eq.board-A', 'it listens only to this board\'s objects (server-side filter)');
  const before = pulls; h.fn({ new: { id: 'x', version: 1 } }); h.fn({ new: { id: 'y', version: 1 } }); h.fn({}); await sleep(400);
  ok(pulls === before + 1, 'a burst of pushes becomes ONE ordinary pull (debounced), through the normal sync path');
  channels[0].cb('SUBSCRIBED'); await sleep(20);
  ok(s.realtimeState().status === 'SUBSCRIBED', 'subscription state is observable');
  s.stop(); ok(removed.includes('objects:board-A') && s.realtimeState().channel === null, 'stopping removes the subscription (no leak)');
  const s2 = mk(); s2.attach('board-B'); await s2.start(); await sleep(20);
  ok(channels.length === 2 && channels[1].name === 'objects:board-B' && removed.length === 1, 'a different board gets its own channel and the old one is already gone');
  const s3 = mk(); s3.attach('board-C'); s3.start(); s3.stop(); await sleep(30);
  ok(channels.length === 2, 'stopping while still connecting never leaves a subscription behind');
  s2.stop();
}
const sy = read('js/sync.js');
ok(/rtStatus === "SUBSCRIBED" && Date\.now\(\) - lastPullAt < poll \* 3/.test(sy), 'polling stays as a slow safety net (3x slower while realtime is connected, normal pace otherwise)');
ok(/known\[r\.id\]\.v >= r\.version\) return;/.test(sy), 'our own writes are not echoed back as pulls');
ok(/err\.code === "FORBIDDEN" \|\| err\.status === 403\) \{ if \(host\.onAccessCheck\)/.test(sy) && /host\.onAccessCheck\(\); \}/.test(sy), 'a refused read or write makes the page check whether access was turned off');
ok(/ch\.on\("broadcast", \{ event: "access_changed" \}/.test(read('js/collab.js')), 'the board channel listens for the server\'s access-changed ping');

// ---------------------------------------------------------------- access loss (page side)
ok(/function onAccessLost\(\)/.test(app) && /document\.body\.classList\.add\("accessLost"\)/.test(app) && /stage\.setAttribute\("inert", ""\)/.test(app), 'losing access hides the board and makes it inert (no stale editable board stays)');
ok(/cloudSync\.stop\(\); \}catch\(e\)\{\} try\{ Stick\.collab\.stop\(\)/.test(app), 'sync and presence stop at once');
ok(/Stick\.errors\.describe\("ACCESS_REVOKED"\)\.message/.test(app) && /Access turned off/.test(app), 'the person is told: this board access was turned off by the owner');
ok(/window\.addEventListener\("stick:access-changed"/.test(app) && /addEventListener\("focus", function\(\)\{ checkBoardAccess\(\); \}\)/.test(app) && /setInterval\(function\(\)\{ if\(document\.visibilityState === "visible"\) checkBoardAccess\(\)/.test(app), 'push, focus and a slow timer all re-check access (polling fallback)');
ok(/rest\.length\)\{ cloudSigningOut = true;/.test(app) && /rest\[0\]\.id/.test(app), 'then they go to another of their boards, or back to plain guest mode');

// ---------------------------------------------------------------- error codes
{
  const cc = read('js/cloud-client.js'), doc = read('docs/dev/ERROR-CODES.md');
  const ids = [...cc.matchAll(/"((?:AUTH|INVITE|SHARE|SYNC|BOARD|ASSET|PRINT|MEDIA)-\d{3})": \{ from: "([A-Z_]+)"/g)].map((m) => [m[1], m[2]]);
  ok(ids.length >= 20, 'the error catalogue exists (' + ids.length + ' codes)');
  ok(ids.every(([id, from]) => doc.includes('| ' + id + ' | ' + from + ' |')), 'every catalogue code is documented in docs/dev/ERROR-CODES.md with the same source code');
  const docIds = [...doc.matchAll(/^\| ((?:AUTH|INVITE|SHARE|SYNC|BOARD|ASSET|PRINT|MEDIA)-\d{3}) \|/gm)].map((m) => m[1]).filter((i) => i !== 'SYNC-999');
  ok(docIds.every((i) => ids.some(([x]) => x === i)), 'and nothing is documented that does not exist');
  ok(new Set(ids.map(([i]) => i)).size === ids.length, 'codes are unique');
  for (const need of ['INVITE_NOT_FOUND', 'INVITE_EXPIRED', 'INVITE_REVOKED', 'INVITE_EMAIL_MISMATCH', 'ANONYMOUS_NOT_ALLOWED']) ok(ids.some(([, f]) => f === need), 'invite/guest failure has a code: ' + need);
  const ctx = vm.createContext({ console, window: {}, Promise, setTimeout, localStorage: { getItem: () => null }, navigator: {}, location: { origin: 'http://x', search: '', hostname: 'x' }, document: {}, Error }); ctx.window = ctx;
  vm.runInContext(read('js/config.js'), ctx); vm.runInContext(read('js/cloud-client.js'), ctx);
  const d = ctx.Stick.errors.describe({ code: 'INVITE_REVOKED' });
  ok(d.id === 'INVITE-003' && d.message === 'This board access was turned off by the owner.' && d.known, 'INVITE-003 says what the owner-facing spec asks for');
  ok(ctx.Stick.errors.describe({ code: 'SOMETHING_ODD', message: 'pg: relation "x" secret' }).message === 'Something went wrong. Please try again.', 'unknown errors get a generic message: no database detail leaks');
  ok(ctx.Stick.errors.parse({ message: 'INVITE_REVOKED' }).code === 'INVITE_REVOKED', 'the server\'s INVITE_REVOKED is recognised');
}

// ---------------------------------------------------------------- invite UI structure
ok(/function renderInviteCards\(/.test(app) && /invCard/.test(app) && /invPeople/.test(app) && /Turned off/.test(app) && /Turn off & remove/.test(app), 'Links you made: slips with state, joins, people and a two-step Turn off');
ok(/No links yet/.test(app) && !/>None yet\./.test(app), 'a friendly empty state, not "None yet"');
ok(/Stick\.repo\.revokeInvite\(r\.id\)/.test(app) && /c\.rpc\("revoke_invite"/.test(read('js/repo.js')), 'Turn off calls the server function that removes the access (not a bare row delete)');
ok(/\.collabDlg \.inviteRow input\.asIn\{[^}]*text-overflow:ellipsis/.test(css) && /\.collabDlg\{ overflow-x:hidden/.test(css) && /\.modalCard, \.acctCard\{ max-width:min\(100%, calc\(100vw - 24px\)\)/.test(css), 'a long link scrolls/ellipsises inside its field and the dialog never overflows horizontally');
ok(/\.collabDlg \.inviteRow \.copyBtn\{ flex:none/.test(css) && /grid-template-columns:minmax\(0,1fr\) auto/.test(css), 'the Copy link button stays fully visible');
ok(/id="joinBoardOpen"/.test(read('index.html')) && /function openJoinDialog\(\)/.test(app) && /parseInviteInput/.test(app), 'a top-level "Join with invite link" entry exists in the board picker');
{
  const m = /function parseInviteInput\(text\)\{([\s\S]*?)\n  \}/.exec(app); const f = new Function('text', m[1]);
  const tok = 'a'.repeat(64);
  ok(f('https://x.github.io/stick-it/#invite=' + tok) === tok && f(tok) === tok && f('  ' + tok.toUpperCase() + '  ') === tok, 'the join box accepts a whole link, a bare code, or either in capitals');
  ok(f('hello') === null && f('#invite=' + 'a'.repeat(63)) === null && f('#invite=' + 'a'.repeat(70)) === null && f('') === null, 'and rejects anything else (too short, too long, empty)');
}
ok(/startCollab\._alias/.test(app) && /myGuestAlias/.test(app) && /my_guest_alias/.test(read('js/repo.js')), 'a guest is shown under the server-given friendly name');

// ---------------------------------------------------------------- scroll / drag
ok(/function scrollRegionAt\(e, stop\)/.test(app) && /var reg = scrollRegionAt\(e, board\);/.test(app), 'the wheel handler asks what scrolls under the pointer (any scrollable node, not just text notes)');
{
  const w = /var reg = scrollRegionAt\(e, board\);\n([\s\S]*?)board\.scrollLeft \+= e\.deltaY;/.exec(app)[1];
  ok(/deltaY < 0 && !atTop/.test(w) && /deltaY > 0 && !atBottom/.test(w) && /return;/.test(w), 'wheel scrolls the node while it can, and hands over to the board at its edge');
}
ok((app.match(/if\(isScrollGesture\(e, el\)\) return;/g) || []).length === 4, 'all four paper pointerdown handlers skip dragging for a scroll gesture (scrollbar or swipe inside scrolling content)');
{
  // behaviour of scrollRegionAt with a stub DOM
  const m = /function scrollRegionAt\(e, stop\)\{([\s\S]*?)\n  \}\n/.exec(app); const body = m[1];
  const mkEl = (o) => ({ nodeType: 1, parentNode: o.parent || null, scrollHeight: o.sh, clientHeight: o.ch, clientLeft: 0, clientWidth: o.cw || 100, overflowY: o.oy, getBoundingClientRect: () => ({ left: 0 }) });
  const stop = mkEl({ sh: 10, ch: 10, oy: 'visible' }), list = mkEl({ sh: 900, ch: 400, oy: 'auto', parent: stop }), row = mkEl({ sh: 20, ch: 20, oy: 'visible', parent: list }), plain = mkEl({ sh: 500, ch: 400, oy: 'visible', parent: stop }), fits = mkEl({ sh: 300, ch: 400, oy: 'auto', parent: stop });
  const run = new Function('e', 'stop', 'getComputedStyle', 'document', body);
  const gcs = (el) => ({ overflowY: el.overflowY }); const doc = { body: {} };
  ok(run({ target: row, clientX: 50 }, stop, gcs, doc)?.el === list && run({ target: row, clientX: 50 }, stop, gcs, doc).onBar === false, 'a press on a row inside a scrolling list is a scroll gesture');
  ok(run({ target: list, clientX: 104 }, stop, gcs, doc)?.onBar === true, 'a press on the scrollbar is detected');
  ok(run({ target: plain, clientX: 5 }, stop, gcs, doc) === null && run({ target: fits, clientX: 5 }, stop, gcs, doc) === null, 'non-scrolling paper and lists that fit still drag the node');
}

// ---------------------------------------------------------------- settings layout
ok(/asItem asItemField/.test(app) && /selWrap\.className = "asSel"/.test(app), 'Input rows use the field layout with the shared select wrapper');
ok(/\.asItem\.asItemField\{ display:grid; grid-template-columns:minmax\(0,1fr\) minmax\(150px,max-content\)/.test(css) && /@media \(max-width:480px\)\{ \.asItem\.asItemField\{ grid-template-columns:minmax\(0,1fr\)/.test(css), 'two real columns on desktop, stacked on narrow screens');
ok(!css.split('\n').filter((l) => /asItemField/.test(l)).some((l) => /word-break|overflow-wrap:\s*anywhere/.test(l)), 'no word-break hack');

// ---------------------------------------------------------------- age modal
ok(/extra: \[\{label: "Sign out"/.test(app) && !/actions: \[\{label: "Sign out", value: "signout"\}\]/.test(app) && /modalActions ageActs/.test(app), 'Sign out is in the same row as Continue');
ok(/\.modalActions\.ageActs\{ flex-wrap:nowrap; justify-content:space-between/.test(css) && /\.ageSel::after/.test(css), 'month/year are styled selectors; one row of actions even on a phone');

// ---------------------------------------------------------------- retired font
{
  const fonts = /var FONTS = \[([\s\S]*?)\n  \];/.exec(app)[1];
  ok(!/name:"Rubik Scribble"/.test(fonts), 'Rubik Scribble is no longer in the font list (so it is not selectable and never picked at random)');
  ok(/LEGACY_FONT = \{"Rubik Scribble": "Rubik"\}/.test(app) && /FONT_BY_NAME\[k\] = FONT_BY_NAME\[LEGACY_FONT\[k\]\]/.test(app), 'notes saved with it still render, in Rubik, and are not rewritten');
  ok(fs.existsSync(path.join(root, 'tools/fetch-fonts.py')) && /Rubik Scribble/.test(read('tools/fetch-fonts.py')), 'the font files are kept until nothing needs them');
}

// ---------------------------------------------------------------- errors UI + perf
ok(/function errorToast\(err, opts\)/.test(app) && /etClose/.test(app) && /etCode/.test(app) && /opts\.retry && d\.retry !== false/.test(app), 'compact error component: dismissible, shows the code, optional Retry');
ok(/\.toast\.errToast\{[^}]*env\(safe-area-inset-bottom/.test(css) && /@media \(max-width:600px\)\{\s*\.toast\{ max-width:calc\(100vw - 20px\)/.test(css), 'safe-area aware and compact on phones');
ok(/Stick\.perf = \{/.test(app) && /perfMark\("board switch: clicked"\)/.test(app) && /prefetchBoard\(b\.id\)/.test(app) && /prefetching\[b\.id\] \|\|/.test(app), 'board switching is instrumented and boards are prefetched while the list is open');

// ---------------------------------------------------------------- legal (line endings)
ok(/replace\(\/\\r\\n\/g, "\\n"\)/.test(read('supabase/tests/v0833.test.mjs')), 'the legal comparison normalises line endings instead of being disabled');

console.log('v0.8.3.4 lock it down: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
