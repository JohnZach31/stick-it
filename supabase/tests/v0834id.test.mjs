// v0.8.3.4 identity + presence pass: header presence, editing leases, guest identity, board-list presence, history, aggregation.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const read = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const app = read('js/app.js'), css = read('css/spaces.css') + read('css/app.css'), sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- the collaboration module, run for real with a fake realtime client
const { document } = parseHTML('<!doctype html><html><body><div id="presenceBar" hidden></div></body></html>');
const tracked = [], channels = [], removed = [];
const fakeClient = {
  channel(name, opts) {
    const ch = { name, opts, handlers: {}, state: {}, on(kind, f, fn) { ch.handlers[kind + ':' + (f.event || '')] = fn; return ch; }, subscribe(cb) { ch.cb = cb; setTimeout(() => cb && cb('SUBSCRIBED'), 0); return ch; },
      track(p) { tracked.push({ name, p }); return Promise.resolve(); }, untrack() {}, presenceState() { return ch.state; } };
    channels.push(ch); return ch;
  },
  removeChannel(ch) { removed.push(ch.name); }, rpc: () => Promise.resolve({ data: null }),
};
const ctx = vm.createContext({ console, setTimeout, clearTimeout, setInterval, clearInterval, Date, JSON, Math, Object, Array, Promise, document, addEventListener() {}, CustomEvent: class {}, dispatchEvent() {} });
ctx.window = ctx; ctx.Stick = { cloud: { load: () => Promise.resolve(fakeClient) }, auth: {} };
vm.runInContext(read('js/collab.js'), ctx, { filename: 'collab.js' });
const C = ctx.Stick.collab, core = C.core;

// payload hygiene
{
  const st = core.cleanState({ uid: 'u1', name: 'Anya', alias: 'Leaflet #253', guest: true, hue: 123.4, role: 'editor', editing: 'n1', beat: 3, email: 'a@b.c', token: 'secret', profile: { x: 1 }, content: '<b>hi</b>' });
  ok(st.uid === 'u1' && st.name === 'Anya' && st.alias === 'Leaflet #253' && st.guest === true && st.hue === 123 && st.role === 'editor' && st.editing === 'n1', 'presence carries uid, name, generated alias, guest flag, colour, role hint and the node being edited');
  ok(!('email' in st) && !('token' in st) && !('profile' in st) && !('content' in st) && JSON.stringify(st).indexOf('secret') === -1 && JSON.stringify(st).indexOf('a@b.c') === -1, 'and nothing else: no e-mail, token, profile or board content');
  ok(core.cleanState({ hue: 999, role: 'admin' }).hue === null && core.cleanState({ hue: 999, role: 'admin' }).role === null, 'a colour out of range or an invented role is dropped');
}
// how a person is labelled
ok(core.label({ name: 'Anya', alias: 'Leaflet #253', guest: true }).sub === 'Guest · Leaflet #253', 'a guest with a chosen name: "Anya", sub "Guest · Leaflet #253"');
ok(core.label({ name: 'Leaflet #253', alias: 'Leaflet #253', guest: true }).sub === 'Guest', 'a guest with only the generated name: sub "Guest"');
ok(core.label({ name: 'Johnathan', guest: false }).sub === '', 'an account has no guest line');
// editing lease: short, expires without a heartbeat, belongs to whoever is editing NOW
{
  const t0 = 1000000, peers = core.merge({}, [{ key: 'a:1', state: { uid: 'a', name: 'Anya', hue: 200, editing: 'n1', beat: 1 } }], t0);
  ok(core.lockOwner(peers, 'n1', t0 + 1000, 'me').name === 'Anya', 'while the lease is fresh the note is held by the person editing it');
  ok(core.lockOwner(peers, 'n1', t0 + 7900, 'me') !== null && core.lockOwner(peers, 'n1', t0 + 8100, 'me') === null, 'it lapses about 8 seconds after the last heartbeat (a closed or crashed tab never locks a note for long)');
  ok(core.fresh(peers['a:1'], t0 + 20000), 'while the person is still listed as being on the board');
  const hb = core.merge(peers, [{ key: 'a:1', state: { uid: 'a', name: 'Anya', hue: 200, editing: 'n1', beat: 2 } }], t0 + 7000);
  ok(core.lockOwner(hb, 'n1', t0 + 14000, 'me') !== null, 'a heartbeat renews it');
  const done = core.merge(hb, [{ key: 'a:1', state: { uid: 'a', name: 'Anya', hue: 200, editing: null, beat: 3 } }], t0 + 8000);
  ok(core.lockOwner(done, 'n1', t0 + 8100, 'me') === null, 'ending the edit releases it at once: nobody keeps ownership of the note');
  const own = core.lockOwner(peers, 'n1', t0 + 1000, 'a:1'); ok(own === null, 'and you are never blocked by yourself');
  ok(core.lockOwner(peers, 'n1', t0 + 1000, 'me').hue === 200 && core.lockOwner(core.merge({}, [{ key: 'z', state: { uid: 'z', name: 'Z', editing: 'n2', beat: 1 } }], t0), 'n2', t0, 'me').hue === core.hue('z'), 'the editor\'s colour is their own, or a stable one derived from their id (never re-randomised)');
}
// a running session
C.start({ boardId: 'b1', role: 'owner', me: { uid: 'owner-1', name: 'Johnathan', guest: false }, host: { refresh() {}, showPeople() {} }, comments: false, transport: 'supabase' });
await sleep(30);
ok(tracked.length >= 1 && tracked[0].name === 'board:b1' && channels[0].opts.config.private === true, 'presence runs on the board\'s private channel (the existing infrastructure; no second socket)');
const last = () => tracked[tracked.length - 1].p;
ok(last().uid === 'owner-1' && !('email' in last()) && Object.keys(last()).every((k) => ['uid', 'name', 'alias', 'guest', 'hue', 'role', 'editing', 'since', 'active', 'beat'].includes(k)), 'what is tracked is only the small, safe set');
C.setEditing('note-9'); ok(last().editing === 'note-9', 'starting to edit announces the lease at once');
const n0 = tracked.length; C.setEditing(null); ok(last().editing === null && tracked.length === n0 + 1, 'ending the edit releases it at once');
C.setMe({ name: 'Johnathan Z' }); ok(last().name === 'Johnathan Z', 'a rename is announced at once (no reload)');
ok(C.status() === 'connected', 'the module can say whether live presence is connected');
// header
const bar = document.getElementById('presenceBar');
const feed = (list) => { const st = {}; list.forEach((p, i) => { st['k' + i] = [Object.assign({ beat: 1 }, p)]; }); channels[0].state = st; channels[0].handlers['presence:sync'](); };
feed([]); ok(bar.hidden === true, 'alone on the board the header shows nothing');
feed([{ uid: 'g1', name: 'Leaflet #253', alias: 'Leaflet #253', guest: true, hue: 40, role: 'editor' }]);
ok(bar.hidden === false && bar.children.length === 2, 'a connected guest appears in the header (with me)');
ok(bar.children[0].className.includes('self') && bar.children[1].className.includes('guest'), 'I am marked, and the guest is marked as a guest');
ok(/Leaflet #253/.test(bar.children[1].title) && /Guest/.test(bar.children[1].title) && /Editor/.test(bar.children[1].title), 'its tooltip gives the name, "Guest", and the role');
feed([{ uid: 'a1', name: 'Anya', guest: false, hue: 300 }, { uid: 'g1', name: 'Test Guest', alias: 'Leaflet #253', guest: true, hue: 40 }]);
ok(bar.children.length === 3 && /Anya/.test(bar.children[1].title) && /Guest · Leaflet #253/.test(bar.children[2].title), 'an account and a guest show side by side, the guest with its chosen name and generated one');
feed([{ uid: 'a1', name: 'Anya' }, { uid: 'b1', name: 'Bo' }, { uid: 'c1', name: 'Cy' }, { uid: 'd1', name: 'Di' }, { uid: 'e1', name: 'Ed' }]);
ok(bar.children.length === 5 && /^\+\d/.test(bar.children[4].textContent) && bar.children[4].textContent === '+2', 'more than four collapse into "+N"');
feed([{ uid: 'g1', name: 'Anya', alias: 'Leaflet #253', guest: true, hue: 40 }]);
ok(/Anya/.test(bar.children[1].title), 'a guest rename shows up in the header on the next presence update');
feed([]); ok(bar.hidden === true, 'when everyone leaves (or is revoked) they leave the header');
C.stop(); ok(removed.includes('board:b1'), 'leaving the board removes the presence channel');
// the board list can watch other boards without appearing in them
{
  const before = tracked.length; let got = null;
  const stop = C.watch(['b2', 'b3'], (id, list) => { got = [id, list]; }); await sleep(20);
  const w = channels.filter((c) => c.name === 'board:b2' || c.name === 'board:b3'); ok(w.length === 2 && w.every((c) => c.opts.config.private === true), 'it listens on each other board\'s private channel');
  w[0].state = { k: [{ uid: 'x', name: 'Xia', guest: true, hue: 10, beat: 1 }, { uid: 'x', name: 'dup', beat: 2 }] }; w[0].handlers['presence:sync']();
  ok(got && got[0] === 'b2' && got[1].length === 1 && got[1][0].name === 'dup' || got && got[1].length === 1, 'it reports who is there, one entry per person');
  ok(tracked.length === before, 'watching tracks nothing: nobody appears to be in a board just because the list is open');
  stop(); ok(w.every((c) => removed.includes(c.name)), 'closing the list removes the watchers (no leak)');
}

// ---------------------------------------------------------------- the page: guest identity, rename, board list, conflicts, history, counts
{
  const a = app.indexOf('  var GUEST_KEY = "stickit.guest";'), b = app.indexOf('  function getAnonName(){');
  const store = {}; const safeGet = (k) => (k in store ? JSON.parse(JSON.stringify(store[k])) : null), safeSet = (k, v) => { store[k] = JSON.parse(JSON.stringify(v)); };
  const g = new Function('safeGet', 'safeSet', 'crypto', 'window', app.slice(a, b) + '\nreturn {guestId, guestSave, guestAliasHint, guestLabel};')(safeGet, safeSet, { randomUUID: () => 'uuid-1' }, { crypto: { randomUUID: () => 'uuid-1' } });
  const id1 = g.guestId(); const id2 = g.guestId();
  ok(id1.id === id2.id && id1.hue === id2.hue && typeof id1.hue === 'number', 'the local guest id and colour are created once and stay the same');
  g.guestSave({ alias: 'Leaflet #253', name: 'Test Guest' });
  ok(g.guestAliasHint() === 'Leaflet #253' && g.guestLabel() === 'Test Guest', 'the generated name and the chosen name are remembered locally');
  g.guestSave({ alias: 'x; drop table' }); ok(g.guestAliasHint() === '', 'a malformed alias is never sent to the server');
  const leave = app.slice(app.indexOf('function onAccessLost()'), app.indexOf('window.addEventListener("stick:access-changed"'));
  ok(!/GUEST_KEY|stickit\.guest/.test(leave) && !/removeItem\("stickit\.guest"/.test(app), 'losing board access never touches the local guest identity');
  ok(/function getAnonName\(\)\{\s*var gl = guestLabel\(\); if\(gl\) return gl;/.test(app), 'continuing as a guest uses the same name');
  ok(/Stick\.repo\.acceptInvite\(t, anonJoin \? guestAliasHint\(\) : ""\)/.test(app) && /setGuestName\(gn\)/.test(app), 'joining again asks for the same generated name and restores the chosen one; access is only what the new invitation grants');
  ok(/accept_invite", args\)/.test(read('js/repo.js')) && /args\.p_alias = alias/.test(read('js/repo.js')) && /PGRST202/.test(read('js/repo.js')), 'an older server without the alias argument still works');
  const mig = read('supabase/migrations/20261009120000_guest_identity.sql');
  ok(/want ~ '\^\[A-Z\]\[a-z\]\{2,11\} #\[0-9\]\{1,4\}\$'/.test(mig) && /x\.alias = want and x\.user_id <> uid/.test(mig), 'the server only honours a well-formed alias nobody else holds on that board');
  ok(!/\bupdate public\.board_members\b|delete from public\.board_members/.test(mig), 'the identity migration never touches a membership');
  ok(/Unknown member/.test(mig) && !/'Member'|'Stick-It member'/.test(mig), 'the server never labels anyone with a bare "Member"');
  ok(!/\|\| "Member"|"Stick-It member"|'Stick-It member'/.test(app), 'and neither does the page');
  ok(/archived_at timestamptz/.test(mig) && /set archived_at = coalesce\(archived_at, now\(\)\)/.test(mig) && !/delete from public\.board_invites/.test(mig), 'Delete from history hides (archives) the record: it stays as the access log, no membership changes');
}
ok(/function openGuestNameDialog\(anchor\)/.test(app) && /What should we call you\?|You\\u2019re \\u201c<span class="npAlias">/.test(app) && /class="npSave"|npSave/.test(app) && /npCancel/.test(app) && /npX/.test(app), 'the name step is a small slip with a field, Save, Cancel and X (not a toast, not an account)');
ok(/Stick\.collab\.setMe\(\{name: shown\}\)/.test(app) && /Stick\.repo\.setGuestName\(custom\)/.test(app), 'renaming updates everyone connected at once and the owner\'s lists');
ok(/openGuestNameDialog\(self0\)/.test(app) && /#presenceBar \.presAv\.self/.test(app) && !/toast\("You\\u2019re \\u201c" \+ gi\.alias/.test(app), 'a new guest is offered the name slip once, anchored to their own avatar; it stays until they act');
ok(/if\(p\.self && p\.guest\)/.test(app) && /Change my name/.test(app), 'a guest can rename from the header avatars at any time');
ok(/showPeople: function\(anchor\)\{ openPresencePopover\(anchor\); \}/.test(app) && /var h = makeDiv\("menuHint"\); h\.textContent = "On this board now"/.test(app), 'tapping the header avatars lists who is here (name, guest line, role)');
ok(/function paintBoardPres\(id\)/.test(app) && /" here"/.test(app) && /Stick\.collab\.watch\(ids/.test(app) && /endBoardWatch\(\)/.test(app) && /rowPres\[b\.id\] = presEl/.test(app), 'the board list shows "N here" under a board, from presence, only while it is open');
ok(/Stick\.collab\.holder\(n\.id\)/.test(app) && /Delete anyway\?/.test(app) && /editing .* right now\. Delete anyway\?/.test(app), 'deleting a note someone is editing asks first: "<name> is editing this note right now. Delete anyway?"');
ok((app.match(/is editing this (note|list|" \+ Stick\.objects\.LABELS\[n\.type\])/g) || []).length >= 3 && /Stick\.collab\.blockedBy\(n\.id\)/.test(app), 'editing a note someone else is editing says "<name> is editing this note." and does not steal focus');
ok(/\.peerGlow\{[^}]*hsl\(var\(--ph, 200\)/.test(css) && /syncPeerLayer/.test(read('js/collab.js')) && /is editing"/.test(read('js/collab.js')) && /z-index:var\(--z-peer, 9990\)/.test(css), 'the editing node glows in the editor\'s own colour (board-level overlay above every paper) with a "<name> is editing" tab');
ok(!/setEditing\([^)]*\)[^;]*saveNotes|setEditing[^\n]*syncObjects/.test(app + read('js/collab.js')), 'the lease uses presence only, not the board\'s persistent data');
// board-name sub-lines and counts
ok(/kind === "invite"/.test(app) && /function bump\(d, kind\)/.test(app) && /bump\(-1, "public"\)/.test(app) && /\.accCount"\)\.textContent = nInv/.test(app), 'turning links off or hiding history moves the counts without a reload');
ok(/Stick\.repo\.myActiveInviteCount\(\)/.test(app) && /activeShares \|\| 0\) \+ \(activeInvites \|\| 0/.test(app), 'Settings counts public links and collaboration invites');
ok(!/You have no active shared links/.test(app) && !/>\s*0 links/.test(app), 'the old "no active shared links" text is gone from the code');
ok(/\.invActs|Delete from history/.test(app) && /Stick\.repo\.deleteInviteHistory\(r\.id\)/.test(app) && /Hides it|stays turned off/.test(app.replace(/\s+/g, ' ')) , 'turned-off cards have a working Delete from history');
ok(/Live presence isn\\u2019t connecting/.test(app) && /realtime-policies\.sql/.test(app), 'if live presence cannot connect, the owner is told why, and which one-time SQL fixes it');
ok(/saveStats/.test(read('js/sync.js')) && /saves: sv/.test(app), 'Stick.perf.collab() now includes how long our own saves take');

console.log('v0.8.3.4 identity + presence: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
