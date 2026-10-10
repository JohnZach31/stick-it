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
ok(/guestSave\(\{alias: al\}\)/.test(app) && /myGuestAlias/.test(app) && /my_guest_alias/.test(read('js/repo.js')), 'a guest is shown under the server-given friendly name (kept in the local guest identity)');

// ---------------------------------------------------------------- scroll / drag
ok(/function scrollRegionAt\(e, stop\)/.test(app) && /var reg = scrollRegionAt\(e, board\);/.test(app), 'the wheel handler asks what scrolls under the pointer (any scrollable node, not just text notes)');
{
  const w = /var reg = scrollRegionAt\(e, board\);\n([\s\S]*?)board\.scrollLeft \+= e\.deltaY;/.exec(app)[1];
  ok(/deltaY < 0 && !atTop/.test(w) && /deltaY > 0 && !atBottom/.test(w) && /e\.preventDefault\(\); return;/.test(w), 'wheel scrolls the node while it can; at its edge the wheel is still consumed (the board does not start moving)');
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
ok(/asItem asItemField/.test(app) && /selWrap\.className = "asSel idlsHost"/.test(app), 'Input rows use the field layout with the shared select wrapper');
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


// ---------------------------------------------------------------- final pass: invisibility of collaboration invites, legacy cards, tooltip, zone pin, IDLS select, wheel
{
  const rp = read('js/repo.js');
  ok(/c\.from\("board_invites"\)\.select\("id,board_id,email,role,uses,created_at"\)/.test(rp) && /list_invites\|PGRST202/.test(rp), 'the invite list falls back to reading the table when the server has no v0.8.3.4 function yet (so existing links always show)');
  ok(/revoke_invite\|PGRST202/.test(rp), 'and Turn off falls back to deleting the row on an older server');
  const ms = app.slice(app.indexOf('async function openManageShares'), app.indexOf('function openDeleteAccount'));
  ok(/Public links/.test(ms) && /Collaboration invites/.test(ms) && /Stick\.repo\.listInvites\(b\.id\)/.test(ms) && /buildAccessPanel\(set\.b\.id/.test(ms) && /Sharing & access/.test(ms), 'the Shared links window (now Sharing & access) lists collaboration invitations as well as public share links');
  ok(!/You have no active shared links/.test(app), 'it no longer claims "no active shared links" when a collaboration invite exists');
  ok(/Legacy collaboration invite/.test(app) && /Created before invite tracking/.test(app) && /stay on the board if you turn this link off/.test(app), 'old (pre-tracking) invitations appear, labelled as legacy, with an honest note');
  ok(/r\.tracked === false/.test(app) && /Stick\.repo\.revokeInvite\(r\.id\)/.test(app), 'a legacy invitation can still be turned off');
  ok(/removable = people\.filter\(function\(x\)\{ return x\.active && !x\.legacy; \}\)/.test(app), 'the Turn off confirmation only promises to remove people the server will actually remove');
  ok(/twice returns a board list that does not contain it/.test(app) && /setTimeout\(r, 2500\)/.test(app), 'access loss is confirmed twice before the page leaves a board (no false kick on a hiccup)');
  ok(/function attachTruncTip\(row, info, b\)/.test(app) && /scrollWidth > c\.clientWidth \+ 1/.test(app) && /row\.tabIndex = 0/.test(app) && /\}, 520\)/.test(app), 'board cards show cut-off text on hover, keyboard focus and long press');
  ok(/\.truncTip\{ position:fixed/.test(css), 'the label is fixed-position (no layout jump)');
  ok(/\.zone > \.pinTack, \.zone > \.pinBadge\{ z-index:10000; \}/.test(css) && /\.zone \.zoneBar\{ position:relative; z-index:9999; \}/.test(css) && !/\.zone\{[^}]*z-index:\d{3,}/.test(css), 'the zone tack and bar sit above its papers, while the zone itself is not raised');
  ok(/function idlsSelect\(sel, btnId\)/.test(app) && /role", "listbox"/.test(app) && /role", "option"/.test(app) && /aria-selected/.test(app) && /aria-activedescendant/.test(app) && /e\.key === "ArrowDown"/.test(app) && /e\.key === "Home"/.test(app) && /e\.key === "Escape"/.test(app), 'the Input choices use a keyboard-navigable listbox');
  ok(/idlsNative/.test(css) && /\.idlsSelBtn:focus-visible/.test(css) && /body\.dark/.test(css) && /border-inline-end/.test(css) && /pop\.dir = getComputedStyle\(btn\)\.direction/.test(app) && /pointer:coarse\)\{ \.idlsSelOpt/.test(css), 'focus ring, dark mode, RTL and touch sizes are handled; the real <select> stays as the value holder');
  const nIn = /var DBL_NODES/.test(app) && (app.match(/row\("in(Dbl|Paste)"/g) || []).length === 2; ok(nIn, 'both Input preferences use it');
  // wheel at the middle / top / bottom / outside, with the real handler body and a stub region
  const w = /board\.addEventListener\("wheel", function\(e\)\{\n([\s\S]*?)\n  \}, \{passive:false\}\);/.exec(app)[1];
  const mkEl = (st, ch, sh) => ({ scrollTop: st, clientHeight: ch, scrollHeight: sh });
  function wheel(region, deltaY) {
    const calls = { prevented: false, scrolled: 0 }; const board = { scrollLeft: 0 };
    const fn = new Function('e', 'board', 'scrollRegionAt', 'dismissHint', w);
    const ev = { deltaX: 0, deltaY, target: {}, preventDefault() { calls.prevented = true; } };
    const r = fn(ev, board, () => region ? { el: region } : null, () => {});
    return { returned: r === undefined && !calls.prevented && board.scrollLeft === 0 ? 'native' : 'handled', prevented: calls.prevented, boardMoved: board.scrollLeft !== 0 };
  }
  const mid = mkEl(200, 400, 900), top = mkEl(0, 400, 900), bottom = mkEl(500, 400, 900);
  ok(wheel({ ...mid }.valueOf ? mid : mid, 120).boardMoved === false && wheel(mid, 120).prevented === false, 'wheel in the middle: the node scrolls (native), the board does not move');
  ok(wheel(top, -120).boardMoved === false && wheel(top, -120).prevented === true, 'wheel up at the top edge: consumed, the board does NOT move');
  ok(wheel(bottom, 120).boardMoved === false && wheel(bottom, 120).prevented === true, 'wheel down at the bottom edge: consumed, the board does NOT move');
  ok(wheel(top, 120).prevented === false && wheel(bottom, -120).prevented === false, 'the other direction still scrolls the node');
  const out = wheel(null, 120); ok(out.boardMoved === true && out.prevented === true, 'pointer just outside the node: the board scrolls as before');
}


// ---- the IDLS choice list, run for real in a DOM
{
  const { parseHTML } = await import('linkedom');
  const { window, document } = parseHTML('<!doctype html><html><body><select id="s"><option value="a">Alpha</option><option value="b">Beta</option><option value="c">Gamma</option></select></body></html>');
  const start = app.indexOf('  var idlsSelSeq = 0;'), end = app.indexOf('  function buildInputCard(){');
  const body = app.slice(start, end);
  const makeDiv = (c) => { const d = document.createElement('div'); d.className = c; return d; };
  const rect = () => ({ left: 10, right: 210, top: 10, bottom: 48, width: 200, height: 38 });
  window.innerHeight = 800; window.innerWidth = 1000;
  window.HTMLElement.prototype.scrollIntoView = function () {};
  const fnSrc = new Function('document', 'window', 'makeDiv', 'getComputedStyle', 'Event', body + '\nreturn idlsSelect;');
  const idlsSelect = fnSrc(document, window, makeDiv, () => ({ direction: 'ltr' }), window.Event);
  const sel = document.getElementById('s'); sel.id = 'inTest'; sel.selectedIndex = 0; const val = () => sel.options[sel.selectedIndex].value;
  let changes = 0; sel.addEventListener('change', () => changes++);
  const wrap = idlsSelect(sel, 'inTest'); document.body.appendChild(wrap);
  const btn = wrap.querySelector('button'); btn.getBoundingClientRect = rect; document.body.getBoundingClientRect = rect;
  ok(btn.id === 'inTest' && btn.getAttribute('aria-haspopup') === 'listbox' && btn.getAttribute('aria-expanded') === 'false' && btn.textContent.includes('Alpha'), 'the button shows the current choice and announces a listbox');
  ok(sel.getAttribute('aria-hidden') === 'true' && sel.tabIndex === -1 && sel.id === 'inTestNative', 'the real select is kept (hidden from the tab order) as the value holder');
  const key = (el, k) => { const ev = new window.Event('keydown', { bubbles: true, cancelable: true }); ev.key = k; el.dispatchEvent(ev); };
  btn.click();
  const pop = document.querySelector('[role=listbox]');
  ok(!!pop && btn.getAttribute('aria-expanded') === 'true' && pop.querySelectorAll('[role=option]').length === 3 && pop.querySelector('[aria-selected=true]').textContent === 'Alpha', 'clicking opens a listbox with one option per choice and the current one selected');
  pop.querySelectorAll('[role=option]').forEach((o) => { o.scrollIntoView = () => {}; });
  key(pop, 'ArrowDown'); key(pop, 'ArrowDown'); ok(pop.getAttribute('aria-activedescendant') === 'inTestOpt2', 'arrow keys move the active option');
  key(pop, 'ArrowDown'); ok(pop.getAttribute('aria-activedescendant') === 'inTestOpt2', 'and stop at the last one');
  key(pop, 'Home'); ok(pop.getAttribute('aria-activedescendant') === 'inTestOpt0', 'Home goes to the first');
  key(pop, 'End'); key(pop, 'Enter');
  ok(val() === 'c' && changes === 1 && !document.querySelector('[role=listbox]') && btn.textContent.includes('Gamma') && btn.getAttribute('aria-expanded') === 'false', 'Enter chooses: the select changes once, the menu closes, the button updates');
  btn.click(); const p2 = document.querySelector('[role=listbox]'); p2.querySelectorAll('[role=option]').forEach((o) => { o.scrollIntoView = () => {}; });
  key(p2, 'Escape'); ok(!document.querySelector('[role=listbox]') && val() === 'c' && changes === 1, 'Escape closes without changing anything');
  btn.click(); const p3 = document.querySelector('[role=listbox]'); p3.querySelectorAll('[role=option]').forEach((o) => { o.scrollIntoView = () => {}; });
  p3.querySelectorAll('[role=option]')[1].click(); ok(val() === 'b' && changes === 2, 'clicking an option chooses it');
  key(btn, 'ArrowDown'); ok(!!document.querySelector('[role=listbox]'), 'ArrowDown on the button opens the list'); key(document.querySelector('[role=listbox]'), 'Escape');
}


// ---------------------------------------------------------------- collaboration management pass
{
  const ms = app.slice(app.indexOf('async function openManageShares'), app.indexOf('function openDeleteAccount'));
  ok(/tabInv = mkTab\("Collaboration invites", activeInv, invWrap\); tabPub = mkTab\("Public links", act\.length, pubWrap\)/.test(ms) && /role", "tablist"/.test(ms) && /role", "tab"/.test(ms), 'the manager has two tabs (collaboration invites, public links) with counts, kept apart');
  ok(/nInv \+ nPub/.test(ms) && /collaboration " \+ \(nInv === 1/.test(ms), 'its summary counts both kinds of link');
  ok(/pickTab\(activeInv \|\| !act\.length \? tabInv : tabPub\)/.test(ms), 'it opens on collaboration invites when there are any (so they can never look absent)');
  ok(/presence: set\.b\.id === activeBoardId, people: true/.test(ms), 'live presence is shown only for the board you are on; people-with-access for each board');
  ok(/activeShares \|\| 0\) \+ \(activeInvites \|\| 0/.test(app) && /Stick\.repo\.myActiveInviteCount\(\)/.test(app) && /Public share links " \+ \(activeShares \|\| 0\)/.test(app), 'Settings counts public links AND collaboration invites, with the breakdown');
  ok(/kind === "invite"/.test(app), 'turning off an invitation updates the Settings count');
  ok(!/See and turn off every link you/.test(app), 'the Settings row no longer promises only "shared links"');
  const pan = app.slice(app.indexOf('function buildAccessPanel'), app.indexOf('// one row per address: its own link'));
  ok(/accSecHead\("On this board now"/.test(pan) && /accSecHead\("People with access"/.test(pan) && /accSecHead\("Links you made"\)/.test(pan), 'three separate sections: On this board now (presence), People with access (authorization), Links you made');
  ok(/Connected right now\. This is who is here, not who is allowed in\./.test(pan), 'presence is explained as presence, not permission');
  ok(/Stick\.collab\.online/.test(pan) && /Stick\.collab\.onChange/.test(pan) && /el\.isConnected/.test(pan), 'the live list follows the board presence channel and stops following when the window closes');
  ok(/Stick\.repo\.listBoardAccess\(boardId\)/.test(pan) && /roleOf\(p\.uid\)/.test(pan), 'roles come from the server access list (matched by account id), never from what a client says about itself');
  ok(/<h3 class="accH first">Invite people<\/h3>/.test(app) && /<hr class="accRule" role="separator">/.test(app), 'the Collaborate window has an Invite people heading and a divider before the lists');
  ok(/t\.className = "accH"/.test(pan.slice(0, pan.indexOf('function roleLabel')) + app.slice(app.indexOf('function accSecHead'), app.indexOf('function roleLabel'))) && /\.accH\{[^}]*font-size:1\.12rem; font-weight:700/.test(css), '"Links you made" is a real heading, not a form label');
  const ic = app.slice(app.indexOf('function idChip(p)'), app.indexOf('// each link as a slip'));
  ok(/idTag/.test(ic) && /"Guest"/.test(ic) && !/email/i.test(ic), 'chips mark guests plainly and never show an e-mail');
  const rc = app.slice(app.indexOf('function renderInviteCards'), app.indexOf('// ---- the three things an owner wants to know'));
  ok(/"Turned off"/.test(rc) && /join history kept/.test(rc), 'a turned-off card reads Turned off and keeps its history');
  ok(/if\(on\)\{\s*if\(toks\[r\.id\]\)/.test(rc) && /Delete from history/.test(rc) && rc.indexOf('Copy link') < rc.indexOf('var del = document'), 'Copy and Turn off exist only for active links; turned-off links offer Delete from history');
  ok(/Delete this invite from your history\?/.test(rc) && /access to the board changes/.test(rc), 'deleting history asks first and says it changes nobody\'s access');
  ok(/sub = x\.active \? "" : "access removed"/.test(rc) && /gone: !x\.active/.test(rc), 'a removed guest stays in the link history, marked "access removed"');
  const al = app.slice(app.indexOf('function onAccessLost()'), app.indexOf('window.addEventListener("stick:access-changed"'));
  ok(/Continue as guest/.test(al) && /Sign in or create account/.test(al) && /Go to my boards/.test(al), 'the exit screen offers choices: boards / continue as guest / sign in');
  ok(/onClose: function\(v\)\{ leave\(v\); \}/.test(al) && /if\(next !== "signin" && next !== "boards"\) next = null;/.test(al), 'closing the dialog never signs anyone in: only an explicit "Sign in" choice asks for it');
  ok(/stickit\.afterLeave/.test(al) && /al === "signin"\) openAccountModal\(\)/.test(app), 'sign-in opens only after the person chose it');
  ok((app.match(/idlsScroll/g) || []).length === 2 && /wrap\.classList\.add\("idlsScroll"\)/.test(app) && /content\.classList\.add\("idlsScroll", "accDlg"\)/.test(app), 'the Stick-It scrollbar class is applied to exactly two surfaces: the Collaborate and Sharing & access windows');
  ok(/^\.idlsScroll\{|\.idlsScroll::-webkit-scrollbar\{/m.test(css) && read('css/spaces.css').slice(read('css/spaces.css').indexOf('collaboration management')).split('\n').filter((l) => /::-webkit-scrollbar/.test(l) && !/@supports/.test(l) && !/^\s*\/\*/.test(l) && !/\*\//.test(l)).every((l) => /\.idlsScroll/.test(l)), 'and every scrollbar rule in it is scoped to that class (no global override)');
  ok(/Stick\.perf\.collab = function/.test(app) && /push: med\("push"\)/.test(app) && /save: svs\.length/.test(app), 'Stick.perf.collab() reports save, event, wait, pull, draw and total latency');
  ok(/live \? \(cfg\.liveDebounceMs \|\| 150\)/.test(read('js/sync.js')) && /host\.hasPeers && host\.hasPeers\(\)/.test(read('js/sync.js')), 'saves are quicker (150 ms) only while someone else is on the board; alone, the 700 ms settle remains');
  ok(/cfg\.pullDebounceMs == null \? 80 : cfg\.pullDebounceMs/.test(read('js/sync.js')), 'the realtime pull debounce is 80 ms and still coalesces a burst');
}
// latency samples, run for real
{
  const channels = [];
  const client = { channel(name) { const ch = { name, handlers: [], on(kind, filter, fn) { ch.handlers.push({ kind, filter, fn }); return ch; }, subscribe(cb) { ch.cb = cb; return ch; } }; channels.push(ch); return ch; }, removeChannel() {} };
  const ctx = vm.createContext({ console, setTimeout, clearTimeout, setInterval, clearInterval, navigator: { onLine: true }, Promise, Date, JSON, Object, Array, Math });
  ctx.window = ctx; ctx.Stick = { config: {}, cloud: { load: () => Promise.resolve(client) }, repo: {}, assets: {}, errors: { parse: (e) => ({ message: String(e) }) } };
  vm.runInContext(read('js/sync.js'), ctx, { filename: 'sync.js' });
  let first = true; const applied = []; const store = new Map();
  const repo = { toRow: (x) => x, fromRow: (x) => x, hashRow: (x) => JSON.stringify(x), fetchObjects: async () => [], syncObjects: async () => ({ results: [] }),
    fetchChanges: async () => { if (first) { first = false; return []; } await sleep(30); return [{ id: 'n1', version: 2, updated_at: new Date().toISOString(), type: 'note', x: 1, y: 1, width: 1, height: 1, rotation: 0, z_index: 1, data: { html: 'SECRET TEXT' } }]; } };
  const s = ctx.Stick.createSync({ host: { snapshot: () => [], getObject: () => null, applyRemote: (o) => applied.push(o), hasPeers: () => true },
    storage: { getItem: (k) => store.get(k) || null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }, keys: { sync: (i) => 's' + i, meta: () => 'm', notes: (i) => 'n' + i, boards: () => 'b', cover: (i) => 'c' + i }, config: { pollMs: 1e9 }, repo, assets: {} });
  s.attach('b1'); await s.start(); await sleep(30); first = false;
  channels[0].handlers[0].fn({ new: { id: 'n1', version: 2 }, commit_timestamp: new Date(Date.now() - 40).toISOString() });
  await sleep(300);
  const lat = s.latency();
  ok(lat.length === 1 && lat[0].rows === 1 && ['wait', 'pull', 'draw', 'push', 'total'].every((k) => typeof lat[0][k] === 'number' && lat[0][k] >= 0), 'a remote change produces one latency sample: wait, pull, draw, push and total, all numbers');
  ok(lat[0].wait >= 60 && lat[0].wait < 250 && lat[0].pull >= 25 && lat[0].total >= lat[0].pull, 'the numbers are sensible (80 ms debounce, ~30 ms fetch)');
  ok(JSON.stringify(lat).indexOf('SECRET') === -1 && Object.keys(lat[0]).every((k) => ['rows', 'wait', 'pull', 'draw', 'push', 'total'].includes(k)), 'samples contain timings only: no note content, ids or tokens');
  s.stop();
}

// ---------------------------------------------------------------- legal (line endings)
ok(/replace\(\/\\r\\n\/g, "\\n"\)/.test(read('supabase/tests/v0833.test.mjs')), 'the legal comparison normalises line endings instead of being disabled');

console.log('v0.8.3.4 lock it down: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
