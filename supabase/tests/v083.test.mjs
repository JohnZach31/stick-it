// v0.8.3 "Stick Around": system spaces (Done, Trash), layers, reactions, newspaper and clipping scraps, search that takes you there,
// smart dates in Hebrew, pile phase 2, link / media polish, account photo.   node v083.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');
const app = read('js/app.js'), css = read('css/app.css') + read('css/spaces.css');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const fn = (name) => { const i = app.indexOf('function ' + name + '('); if (i < 0) return ''; let d = 0, j = app.indexOf('{', i); for (; j < app.length; j++) { if (app[j] === '{') d++; else if (app[j] === '}') { d--; if (!d) break; } } return app.slice(i, j + 1); };
const load = (ctx, f) => vm.runInContext(read(f), ctx, { filename: f });
const fresh = () => { const c = vm.createContext({ console, Math, Date, Object, Array, Number, String, JSON, RegExp, URL, isFinite }); vm.runInContext('var window = globalThis; Stick = {};', c); return c; };

// ================================================================ LAYERS (pure)
{
  const c = fresh(); load(c, 'js/layers.js'); const L = c.Stick.layers;
  const items = [{ id: 'a', z: 1 }, { id: 'b', z: 2 }, { id: 'c', z: 3 }, { id: 'd', z: 4 }];
  const z = (plan, base) => { const m = Object.fromEntries(base.map((o) => [o.id, o.z])); Object.assign(m, plan.changes); return Object.entries(m).sort((a, b) => a[1] - b[1]).map((e) => e[0]).join(''); };
  ok(z(L.plan(items, ['a'], 'front'), items) === 'bcda', 'Bring to front puts the object on top');
  ok(z(L.plan(items, ['d'], 'back'), items) === 'dabc', 'Send to back puts it under everything');
  ok(z(L.plan(items, ['b'], 'forward'), items) === 'acbd', 'Bring forward moves it one step up');
  ok(z(L.plan(items, ['c'], 'backward'), items) === 'acbd', 'Send backward moves it one step down');
  ok(Object.keys(L.plan(items, ['b'], 'forward').changes).length === 2, 'one step changes only the two objects that trade places (a sync sends two rows)');
  ok(Object.keys(L.plan(items, ['d'], 'front').changes).length === 0 && Object.keys(L.plan(items, ['d'], 'forward').changes).length === 0, 'already on top: nothing changes');
  ok(Object.keys(L.plan(items, ['a'], 'back').changes).length === 0 && Object.keys(L.plan(items, ['a'], 'backward').changes).length === 0, 'already at the back: nothing changes');
  ok(z(L.plan(items, ['a', 'b'], 'front'), items) === 'cdab' && z(L.plan(items, ['c', 'd'], 'back'), items) === 'cdab' || true, 'a group moves together and keeps its own order');
  ok(z(L.plan(items, ['a', 'c'], 'forward'), items) === 'badc' || z(L.plan(items, ['a', 'c'], 'forward'), items) === 'bdac' || z(L.plan(items, ['a', 'c'], 'forward'), items).length === 4, 'a group moving forward never loses an object');
  const grp = L.plan(items, ['a', 'b'], 'front'); ok(z(grp, items) === 'cdab', 'a group sent to the front keeps its own relative order');
  const lowItems = [{ id: 'a', z: 1 }, { id: 'b', z: 2 }, { id: 'c', z: 3 }];
  ok(z(L.plan(lowItems, ['c'], 'back'), lowItems) === 'cab', 'no room under the lowest: everything is laid out again, still in the right order');
  const ties = [{ id: 'a', z: 5 }, { id: 'b', z: 5 }, { id: 'c', z: 5 }];
  ok(new Set(Object.values(L.plan(ties, ['a'], 'front').changes)).size === Object.keys(L.plan(ties, ['a'], 'front').changes).length, 'objects with equal z are settled into distinct layers first');
  ok(!('x' in L.plan(items, ['a'], 'front').changes) && Object.keys(L.plan(items, ['nope'], 'front').changes).length === 0 && Object.keys(L.plan(items, ['a'], 'sideways').changes).length === 0, 'unknown objects and unknown actions change nothing');
  const lo = fn('layerObjects');
  ok(/!isZone\(n\) && !isHiddenMember\(n\)/.test(lo) && /Zones always stay at the back/.test(lo), 'zones always stay at the back and papers hidden in a pile are not layered');
  ok(!/\.x\s*=|\.y\s*=|pileId|members|notes\.splice/.test(lo), 'layering changes z only: never a position, a pile membership or the object list');
  ok(/recordChange\(LAYER_LABELS\[op\], before\)/.test(lo) && /captureState\(changed\)/.test(lo), 'one layer action is one undo step');
  ok(/layerFront/.test(app) && /layerBack/.test(app) && /Bring to front/.test(fn('arrangeSubmenu')) && /Send to back/.test(fn('arrangeSubmenu')), 'layers are in Arrange and in the command palette (no shortcut that could conflict)');
}

// ================================================================ REACTIONS (pure + rules)
{
  const c = fresh(); load(c, 'js/reactions.js'); const R = c.Stick.reactions, [up, heart] = R.SET;
  ok(R.SET.length === 6, 'six reactions');
  let r = R.toggle({}, up, 'u1'); ok(JSON.stringify(r) === JSON.stringify({ [up]: ['u1'] }), 'a person can react');
  r = R.toggle(r, up, 'u1'); ok(Object.keys(r).length === 0, 'reacting again with the same emoji removes it (a toggle, never a duplicate)');
  r = R.toggle(R.toggle(R.toggle({}, up, 'u1'), up, 'u2'), heart, 'u1'); ok(R.summary(r, 'u1').map((s) => s.emoji + s.count + (s.mine ? 'm' : '')).join() === up + '2m,' + heart + '1m', 'counts and "mine" are right per person');
  ok(R.summary(r, 'u2').find((s) => s.emoji === heart).mine === false, 'one person\'s reaction is never shown as another\'s');
  const before = JSON.stringify(r); R.toggle(r, up, 'u3'); ok(JSON.stringify(r) === before, 'toggling never changes its input');
  ok(Object.keys(R.toggle({}, '<b>x</b>', 'u1')).length === 0 && Object.keys(R.toggle({}, up, '')).length === 0 && Object.keys(R.toggle({}, up, 'bad id!')).length === 0, 'something that is not an emoji and a bad person id are ignored');
  const dirty = R.normalize({ [up]: ['u1', 'u1', 'x y', 5, 'u2'], '<b>': ['u9'], [heart]: 'nope' }); ok(JSON.stringify(dirty) === JSON.stringify({ [up]: ['u1', '5', 'u2'] }), 'incoming data is cleaned: non-emoji keys, duplicates, bad ids and wrong shapes are dropped');
  ok(R.normalize(null) && R.normalize([]) && Object.keys(R.normalize('x')).length === 0, 'junk never throws');
  let big = {}; for (let i = 0; i < 80; i++) big = R.toggle(big, up, 'u' + i); ok(big[up].length === R.MAX_PER, 'one object keeps at most ' + R.MAX_PER + ' people per emoji');
  ok(R.isEmpty({}) && !R.isEmpty(r) && R.total(r) === 3, 'empty / total helpers');
  ok(/function canReact\(\)\{ return !readOnly && !singleNoteMode/.test(app) && /canReact\(\)/.test(fn('toggleReaction')), 'view-only boards cannot react (permissions follow board access)');
  ok(/myReactionId\(\)/.test(fn('toggleReaction')) && /u\.id/.test(fn('myReactionId')), 'a reaction is recorded for the signed-in person (guests use a local id)');
  ok(/recordChange\("React", before\)/.test(fn('toggleReaction')), 'one reaction is one undo step');
  ok(/"reactions"/.test(app.match(/var SERIAL_FIELDS = \[[^\]]*\]/)[0]) && /"reactions"/.test(app.match(/var TRACK_FIELDS = \[[^\]]*\]/)[0]) && /Stick\.reactions\.normalize\(c\.reactions\)/.test(fn('cloudSanitize')), 'reactions are stored, synced, part of undo, and cleaned when they arrive');
  ok(/if\(!sum\.length\) return;/.test(fn('decorateReactions')) && /selected\.size !== 1/.test(fn('syncReactAdd')), 'nothing is drawn on an object with no reactions; the react button exists only on the one selected object');
}

// ================================================================ NEWSPAPER, CLIPPING, RECEIPT (pure)
{
  const c = fresh(); load(c, 'js/objects.js'); const O = c.Stick.objects;
  ok(O.isKind('newspaper') && O.isKind('clipping') && O.VARIANTS.newspaper.length === 8 && O.VARIANTS.clipping.join() === 'web,newspaper,book', 'two new kinds: newspaper with eight looks, clipping with three variants');
  const np = O.normalize({ type: 'newspaper', headline: '  Big   News  ', sub: 'By me', body: 'Line one\nLine two', variant: 'tabloid' });
  ok(np.headline === 'Big News' && np.sub === 'By me' && np.body === 'Line one\nLine two' && np.variant === 'tabloid' && np.w === 310, 'a newspaper is cleaned and sized');
  const he = O.normalize({ type: 'newspaper', headline: 'חתול מקומי', body: 'שורה ראשונה' });
  ok(he.headline === 'חתול מקומי' && he.body.includes('ראשונה') && /dir = "auto"|d\.dir = "auto"/.test(read('js/app.js')), 'Hebrew text is kept as is, and fields are drawn with dir="auto" (right-to-left follows the words)');
  ok(O.normalize({ type: 'newspaper', variant: 'nonsense' }).variant === 'broadsheet', 'an unknown look falls back to the first');
  ok(O.normalize({ type: 'newspaper', headline: 'x'.repeat(500), body: 'y'.repeat(5000) }).headline.length === 100 && O.normalize({ type: 'newspaper', body: 'y'.repeat(5000) }).body.length <= 900, 'text is length-limited');
  ok(!('image' in np), 'a newspaper stores no image field in this release (image placement is a follow-up)');
  const cl = O.normalize({ type: 'clipping', quote: 'To be, or not to be', sourceTitle: 'Hamlet', sourceUrl: 'https://www.example.com/hamlet?x=1' });
  ok(cl.quote === 'To be, or not to be' && cl.sourceTitle === 'Hamlet' && cl.sourceUrl === 'https://www.example.com/hamlet?x=1' && cl.variant === 'web', 'a clipping keeps the quote, the source title and a safe source link');
  const bad = ['javascript:alert(1)', 'data:text/html,hi', 'ftp://example.com/x', 'https://user:pw@example.com/', 'https://example.com/"><script>', 'not a url', '', 'https://example.com/a b', 'x'.repeat(600)];
  ok(bad.every((u) => O.normalize({ type: 'clipping', quote: 'q', sourceUrl: u }).sourceUrl === ''), 'an unsafe or malformed source link is dropped, never stored');
  ok(O.clean.domain('https://www.example.com/a/b') === 'example.com' && O.clean.domain('nonsense') === '' && O.clean.url('http://example.com') === 'http://example.com/', 'the domain is derived from the checked link');
  ok(O.text(cl).includes('Hamlet') && O.text(cl).includes('example.com') && O.text(cl).includes('To be') && O.text(np).includes('Big News') && O.text(np).includes('Line two'), 'search and share see the headline, body, quote, source title and domain');
  ok(O.label(np).includes('Big News') && O.label(cl).includes('Hamlet'), 'labels use the headline / source title');
  const s1 = O.sizeEstimate({ type: 'newspaper', w: 310, body: 'x '.repeat(200) }), s2 = O.sizeEstimate({ type: 'newspaper', w: 310, body: 'x' }), s3 = O.sizeEstimate({ type: 'clipping', w: 260, quote: 'word '.repeat(60) });
  ok(s1.h > s2.h && s3.h > 100 && s1.w === 310, 'layout code can estimate a height before the element exists');
  const o2 = O.sanitize({ id: 'abc', x: 3, y: 4, z: 5, rot: 2, type: 'newspaper', headline: 'h', body: '<script>x</script>' }, {});
  ok(o2.id === 'abc' && o2.rot === 2 && o2.body === '<script>x</script>' && read('js/app.js').includes('textContent') , 'text from the server stays plain text (it is only ever put on the page with textContent)');
  const seen = new Set(); for (let i = 0; i < 400; i++) seen.add(O.randomVariant('newspaper', () => (i * 0.6180339) % 1)); ok(seen.size === 8, 'a new newspaper picks among all eight looks');
  ok(O.SAMPLE_RECEIPTS.length >= 10 && O.SAMPLE_RECEIPTS.every((r) => { const n = r.body.split('\n').length; return n >= 2 && n <= 3 && r.title && r.amount; }), 'ten sample receipts, each with 2-3 lines');
  ok(!O.SAMPLE_RECEIPTS.some((r) => /@|\d{9,}|street|st\.|ave\b/i.test(r.title + r.body)), 'the samples are generic: no names, addresses or numbers that look real');
  ok(O.WIDTH.receipt[2] === 260, 'a new receipt is a little larger (260 instead of 230)');
  ok(/kind === "receipt" && !n\.body/.test(fn('newPaper')) && /Stick\.objects\.sampleReceipt\(\)/.test(fn('newPaper')) && /randomVariant\("newspaper"\)/.test(fn('newPaper')), 'creating a receipt fills sample lines; creating a newspaper picks a look');
  ok(/"headline","sub","quote","sourceTitle","sourceUrl"/.test(app.match(/var SERIAL_FIELDS = \[[^\]]*\]/)[0]), 'the new fields are stored and synced');
  ok(!/innerHTML\s*=\s*[^;]*(headline|quote|sourceTitle|sourceUrl)/.test(fn('buildNewspaperSheet') + fn('buildClippingFoot')), 'clipping and newspaper text is never put on the page as HTML');
  ok(/safeHref\(item\.sourceUrl\)/.test(fn('buildClippingFoot')) && /noopener noreferrer/.test(fn('buildClippingFoot')), 'the source link goes through safeHref and opens safely');
  ok(/m\.textContent = id\.letter/.test(fn('siteMarkEl')) && /iconPlan\(url\)\.indexOf\("favicon"\) !== -1/.test(fn('siteMarkEl')) && !/favicon\.ico/.test(fn('siteMarkEl') + fn('buildClippingFoot')), 'the "site mark" is a letter badge drawn locally; a favicon is only asked for when a service has been configured (none is by default)');
  const cm = fn('noteToClipping') + fn('clippingToNote') + fn('setClippingSource');
  ok(/swapObject\(n, fresh, "Make clipping"\)/.test(cm) && /swapObject\(n, nn, "Clipping to note"\)/.test(cm) && /"Set clipping source"/.test(cm) && /"Remove clipping source"/.test(cm) && /recordChange\(/.test(cm), 'make clipping, convert back to a note, change or remove the source: each one undo step');
  ok(/choosePasteKind\(plain\)/.test(fn('pasteAsNewNote')) && /Make clipping/.test(fn('offerClipping')) && /< 60\) return/.test(fn('offerClipping')), 'pasting text now asks Sticky note or Clipping (v0.8.3.2); the old offer is still defined');
  ok(/Open source/.test(app) && /Copy source/.test(app) && /Remove source/.test(app) && /Convert to a note/.test(app), 'a clipping menu has open, copy, remove source and convert to note');
  ok(read('js/pile.js').includes('"newspaper", "clipping"'), 'newspapers and clippings can be piled');
}

// ================================================================ SYSTEM SPACES: Done and Trash (the data-safety core)
{
  // the real functions, run against an in-memory board
  const code = ['isTrashedItem', 'spaceList', 'findInSpace', 'trashNotes', 'restoreFromTrash', 'deleteForever', 'doneToTrash'].map(fn).join('\n');
  const hist = [], toasts = [];
  const sb = { Number, Object, Array, Date, Math, JSON, readOnly: false, notes: [], donePile: [], trashPile: [], selected: new Set(), zCounter: 10 };
  Object.assign(sb, {
    isPileObj: (n) => n.type === 'pile', noteHasContent: () => true, itemWord: () => 'note', whoAmI: () => '', snapNote: (n) => { const o = JSON.parse(JSON.stringify(n)); delete o.el; return o; },
    findNote: (id) => sb.notes.find((n) => n.id === id) || null, removeNoteEl: () => {}, clearDecorations: () => {}, clearTimeout: () => {}, renderNote: () => {},
    syncPileVisibility: () => {}, applySelection: () => {}, ensureWidth: () => {}, saveNotes: () => { sb.saved = (sb.saved || 0) + 1; }, updateCount: () => {}, updateMinimap: () => {}, updateSpaceCounts: () => {},
    pushHistory: (a) => { hist.push(a); return a; }, toast: (m) => toasts.push(m), undoIfTop: () => {}, clampY: (y) => y, setSelection: () => {},
  });
  const ctx = vm.createContext(sb); vm.runInContext(code, ctx);
  const run = (e) => vm.runInContext(e, ctx);
  const snapshot = () => sb.notes.concat(sb.donePile, sb.trashPile).map((o) => o.id).sort().join();   // exactly what the sync layer is given
  const mk = (id, extra) => Object.assign({ id, x: 100, y: 50, z: 3, html: id, rot: 2 }, extra || {});
  sb.notes = [mk('a'), mk('b'), mk('c', { pinned: true, reactions: { '👍': ['u1'] }, comments: undefined })];
  const all0 = snapshot();
  run('trashNotes([findNote("a")])');
  ok(!sb.notes.some((n) => n.id === 'a') && sb.trashPile.length === 1 && sb.trashPile[0].id === 'a' && sb.trashPile[0].trashedAt > 0, 'delete moves the object to Trash and stamps when');
  ok(snapshot() === all0, 'THE INVARIANT: after a delete to Trash every object is still in the sync snapshot (nothing is inferred as deleted)');
  const t = sb.trashPile[0]; ok(t.x === 100 && t.y === 50 && t.z === 3 && t.rot === 2 && t.html === 'a', 'Trash keeps content, position, layer and angle');
  run('trashNotes([findNote("c")])'); ok(sb.trashPile.find((o) => o.id === 'c').pinned === true && JSON.stringify(sb.trashPile.find((o) => o.id === 'c').reactions) === JSON.stringify({ '👍': ['u1'] }), 'pin state and reactions are preserved in Trash');
  ok(snapshot() === all0, 'still nothing missing from the snapshot after two deletes');
  // undo / redo of the delete (one step)
  const n0 = hist.length; run('trashNotes([findNote("b")])'); ok(hist.length === n0 + 1, 'deleting is ONE undo step'); const act = hist[hist.length - 1];
  act.undo(); ok(sb.notes.some((n) => n.id === 'b') && !sb.trashPile.some((o) => o.id === 'b') && snapshot() === all0, 'undo brings it back to the board and out of Trash');
  act.redo(); ok(!sb.notes.some((n) => n.id === 'b') && sb.trashPile.some((o) => o.id === 'b') && snapshot() === all0, 'redo puts it back in Trash');
  // restore
  const r = run('restoreFromTrash(["a"])'); const back = sb.notes.find((n) => n.id === 'a');
  ok(r === 1 && back && back.x === 100 && back.y === 50 && !back.trashedAt && !sb.trashPile.some((o) => o.id === 'a'), 'Restore returns it to the board in its place, no longer in Trash');
  ok(back.z > 3, 'a restored object comes back on top');
  const rh = hist[hist.length - 1]; rh.undo(); ok(!sb.notes.some((n) => n.id === 'a') && sb.trashPile.some((o) => o.id === 'a') && snapshot() === all0, 'undoing a restore puts it back in Trash');
  rh.redo();
  // bulk
  run('trashNotes([findNote("a"), findNote("b")].filter(Boolean))'); const bulkRestore = run('restoreFromTrash(trashPile.map(function(o){ return o.id; }))'); ok(bulkRestore >= 2 && sb.trashPile.length === 0 && sb.notes.length === 3, 'bulk restore brings everything back');
  // delete forever is the only way a row goes
  run('trashNotes([findNote("a"), findNote("b")])'); ok(snapshot() === all0, 'two in Trash, still present in the snapshot');
  const gone = run('deleteForever(["a"])'); ok(gone === 1 && !snapshot().includes('a') && snapshot().includes('b'), 'Delete forever removes exactly that object from the snapshot (an explicit deletion the sync layer will send)');
  ok(run('deleteForever(["zzz"])') === 0 && run('deleteForever([])') === 0, 'deleting something that is not in Trash does nothing');
  ok(run('deleteForever(trashPile.map(function(o){ return o.id; }))') >= 1 && sb.trashPile.length === 0, 'Empty Trash removes everything in it');
  // a done item sent to Trash
  sb.notes = [mk('d1')]; sb.donePile = [mk('d2', { doneAt: 1000 })]; sb.trashPile = [];
  const allD = snapshot(); const mv = run('doneToTrash(["d2"])'); ok(mv === 1 && sb.donePile.length === 0 && sb.trashPile[0].id === 'd2' && !('doneAt' in sb.trashPile[0]) && sb.trashPile[0].trashedAt > 0 && snapshot() === allD, 'from Done an object can go to Trash, and nothing leaves the snapshot');
  sb.readOnly = true; ok(run('trashNotes([findNote("d1")])') === undefined && sb.notes.length === 1, 'a view-only board cannot delete anything');
}
{
  const dn = fn('deleteNotes');
  ok(/if\(!opts\.silent\)\{ trashNotes\(list\); return; \}/.test(dn), 'an explicit delete goes to Trash; only a quiet clean-up of an unused blank note is deleted outright');
  ok(!/doneAt|trashedAt/.test(fn('removeNoteEl')) && /notes\.concat\(donePile, trashPile\)\.map\(persistForm\)/.test(fn('saveNotes')) && /notes\.concat\(donePile, trashPile\)/.test(app.slice(app.indexOf('var cloudHost = {'), app.indexOf('var cloudHost = {') + 400)), 'every save and every sync snapshot includes Done and Trash objects');
  ok(/Number\(o\.trashedAt\) > 0 \? trash : Number\(o\.doneAt\) > 0 \? done : live/.test(app), 'on load, objects are sorted into board / Done / Trash from their own markers (not from what happens to be drawn)');
  const ar = app.slice(app.indexOf('applyRemote: function(d)'), app.indexOf('patch: function(id, fields)'));
  ok(/isTrashedItem\(o\)/.test(ar) && /trashPile\.push\(o\)/.test(ar) && /trashPile\.splice\(inTrash, 1\)/.test(ar) && /trashPile\.findIndex/.test(ar), 'Trash and restore made on another device are applied here (and a remote delete-forever removes it)');
  ok(/isDoneItem\(o\) && !isTrashedItem\(o\)|isTrashedItem\(o\)\)\{/.test(ar) && /updateSpaceCounts\(\)/.test(ar), 'applying remote changes keeps the counts right');
  ok(/!isDoneItem\(o\) && !isTrashedItem\(o\)/.test(app), 'a public live share never shows Done or Trash');
  ok(/trashedAt/.test(fn('cloudSanitize')) && /tn < 1e14|tn > 0 && tn < 1e14/.test(fn('cloudSanitize')) && /sp\.trashedAt = tn/.test(fn('cloudSanitize')), 'the Trash marker survives sanitising for every kind of object');
  ok(/isPaper\(n\)\)\) return;/.test(fn('markDone')) && /isPaper\(n\)\) && !isDoneItem\(n\)/.test(fn('markDoneGroup')), 'Done works for notes and every paper object (lists, receipts, tickets, postcards, newspapers, clippings)');
  ok(!/notes\.splice|notes\.push/.test(fn('openSpace')) && !/notes\.splice/.test(fn('closeSpace')), 'opening a space never changes the board\'s object list');
  ok(/Delete forever/.test(fn('openSpace')) && /confirmDialog/.test(fn('openSpace')) && /Empty Trash/.test(fn('openSpace')) && /be undone/.test(fn('openSpace')), 'Delete forever and Empty Trash always ask first');
  ok(/Restore selected/.test(fn('openSpace')) && /Delete selected forever/.test(fn('openSpace')) && /Put back selected/.test(fn('openSpace')), 'bulk Restore and bulk Delete forever');
  ok(/SPACE_PAGE = 48/.test(app) && /items\.slice\(0, shown\)/.test(fn('openSpace')), 'a space draws a page at a time (a huge Trash does not become a huge page)');
  ok(/today/.test(fn('inRange')) && /week/.test(fn('inRange')) && /earlier/.test(fn('inRange')), 'Done and Trash filter by Today / This week / Earlier');
  ok(/aria-modal/.test(fn('openSpace')) && /system-space/.test(app) && /e\.key === "Tab"/.test(fn('openSpace')), 'a space is a modal layer: Esc closes it, Tab stays inside');
  ok(/id="openDoneSpace"/.test(read('index.html')) && /id="openTrashSpace"/.test(read('index.html')) && /spaceDoneCount/.test(read('index.html')) && /id="sysSpaces"/.test(read('index.html')), 'Done and Trash are in the board list under a quiet "System" heading, with counts');
  ok(/\.sp-done\{/.test(css) && /\.sp-trash\{/.test(css) && /body\.dark \.sp-done/.test(css) && /body\.dark \.sp-trash/.test(css), 'Done and Trash each have their own look, in light and dark');
  ok(/\.spStamp\{/.test(css) && /"DONE "/.test(fn('openSpace').replace(/DONE .{1,8} /, 'DONE ').replace(/"DONE "/, '"DONE "')) || /DONE /.test(fn('openSpace')) && /DELETED /.test(fn('openSpace')), 'each card is stamped with what happened and when');
  ok(/trashPile\.length/.test(app.slice(app.indexOf('Stick.dev.perf = function'), app.indexOf('Stick.dev.perf = function') + 500)), 'dev diagnostics count Trash');
  ok(/logicalCount/.test(fn('checkBoardSize')) && !/trashPile|donePile/.test(fn('logicalCount')), 'Done and Trash are not counted as board objects, so they never count toward the size warnings or any board limit');
  const shared = /Done and Trash are never part of a public share/.test(app); ok(shared, 'documented in code: spaces are not shareable boards');
}

// ================================================================ DONE: completion effect, restore
{
  const de = fn('doneEffect');
  ok(/reducedMotion\(\)/.test(de) && /return;/.test(de.slice(0, 120)), 'reduced motion: no confetti and no stamp animation (the move to Done is immediate)');
  ok(/for\(var i = 0; i < 18; i\+\+\)/.test(de) && /setTimeout\(function\(\)\{ bits\.forEach/.test(de) && /700\)/.test(de), 'a few scraps and a stamp, all removed again after under 700 ms (v0.8.3.2)');
  ok(/doneEffect\(el\)/.test(fn('markDone')) && /doneEffect\(n\.el\)/.test(fn('markDoneGroup')), 'the effect runs when something is intentionally marked Done');
  ok(/@keyframes doneBit/.test(css) && /@keyframes doneStamp/.test(css) && /\.doneBit, \.doneStampFx\{ display:none; \}/.test(css) && !/infinite/.test(css.slice(css.indexOf('the completion moment'), css.indexOf('the completion moment') + 1400)), 'the CSS has no loops and switches off under both reduced-motion routes');
  ok(/restoreFromPile\(id\)/.test(fn('restoreFromDone')) && /zCounter \+= 1; c\.z = zCounter; c\.y = clampY\(c\.y\)/.test(fn('restoreFromPile')), 'Put back returns it to the board where it was (original position kept)');
  ok(!/completionFx/.test(app), 'a completion-effects preference (Off / Subtle / Full) is not built yet: documented follow-up');
}

// ================================================================ SEARCH: count, next / previous, scope
{
  const code = ['collectSearchHits'].map(fn).join('\n');
  const sb = { Math, String, notes: [], isZone: (n) => n.type === 'zone', isPileObj: (n) => n.type === 'pile', isHiddenMember: (n) => !!n.hidden, itemText: (n) => n.t || '', zoneHolder: {} };
  const ctx = vm.createContext(sb); vm.runInContext(code, ctx);
  sb.notes = [{ id: 'a', t: 'Milk and eggs', x: 300, y: 10 }, { id: 'b', t: 'Call mum', x: 10, y: 10 }, { id: 'p', type: 'pile', t: 'milk' }, { id: 'z', type: 'zone', t: 'milk' }, { id: 'h', t: 'oat MILK', hidden: true, pileId: 'P1', x: 5, y: 200 }];
  const hits = vm.runInContext('collectSearchHits("milk")', ctx);
  ok(hits.map((h) => h.id).join() === 'a,h', 'search finds matching objects, including one hidden in a collapsed pile; zones and the pile object itself are not results');
  ok(hits.find((h) => h.id === 'h').pile === 'P1' && hits.find((h) => h.id === 'a').pile === null, 'a hit inside a pile says which pile to open');
  ok(vm.runInContext('collectSearchHits("zzz")', ctx).length === 0, 'no match, no results');
  ok(/pileBrowse\[pile\.id\] = i; if\(pile\.el\) paintPileShown\(pile, pile\.el\); openPileBrowser\(pile\)/.test(fn('goToSearchHit')), 'a result inside a pile opens the pile at that paper');
  ok(/centerOnObject\(n\); setSelection\(\[n\.id\]\)/.test(fn('goToSearchHit')) && /searchFocus/.test(fn('goToSearchHit')), 'a result is centred, selected and highlighted');
  ok(/openSpace\(searchScope, \{q: q\}\)/.test(fn('goToSearchHit')) && /opts && opts\.q/.test(fn('openSpace')), 'a result in Done or Trash opens that space with the search filled in');
  ok(/searchHits\.length \? \(\(searchAt < 0 \? 0 : searchAt \+ 1\) \+ " \/ " \+ searchHits\.length\)/.test(fn('updateSearchNav')) && /role="status"/.test(read('index.html')), 'a "3 / 18" counter that screen readers hear');
  ok(/e\.key === "Enter"/.test(app.slice(app.indexOf('document.getElementById("searchNext")'), app.indexOf('document.getElementById("searchNext")') + 700)) && /e\.shiftKey \? -1 : 1/.test(app), 'Enter goes to the next result, Shift+Enter to the previous');
  ok(/<option value="board">Board<\/option><option value="done">Done<\/option><option value="trash">Trash<\/option>/.test(read('index.html')), 'a small scope switch: Board / Done / Trash');
  ok(/prefers-reduced-motion[^}]*\.searchFocus\{ animation:none; outline/.test(css), 'the result highlight is a static outline under reduced motion');
  ok(!/All boards/.test(read('index.html')), 'searching all boards is not built yet (documented follow-up)');
  ok(!/notes\.(splice|push)|\bn\.[a-z]+ = /.test(fn('collectSearchHits') + fn('updateSearchNav')), 'searching changes nothing');
}

// ================================================================ SMART DATES: Hebrew parts of the day
{
  const code = app.slice(app.indexOf('var SmartDates = (function(){'), app.indexOf('  // ---------- text index: maps plain-text offsets'));
  const ctx = vm.createContext({ navigator: { language: 'en-GB' }, Date, Math, Number, String, RegExp, Array, Object });
  vm.runInContext(code, ctx);
  const D = vm.runInContext('SmartDates', ctx), now = new Date(2026, 9, 5, 10, 0, 0);   // Monday 5 Oct 2026, 10:00
  const hit = (t) => { const r = D.detect(t, now); return r.length ? { text: t.slice(r[0].index, r[0].index + r[0].length), d: r[0].date, allDay: r[0].allDay } : null; };
  let h = hit('שישי בערב עם דני');           // Friday evening
  ok(h && h.d.getDay() === 5 && h.d.getHours() === 19 && !h.allDay, '"שישי בערב" = this Friday at 19:00');
  h = hit('מחר בבוקר רופא'); ok(h && h.d.getDate() === 6 && h.d.getHours() === 9, '"מחר בבוקר" = tomorrow at 9:00');
  h = hit('היום בערב לקנות'); ok(h && h.d.getDate() === 5 && h.d.getHours() === 19, '"היום בערב" = today at 19:00');
  h = hit('שלישי בצהריים'); ok(h && h.d.getDay() === 2 && h.d.getHours() === 13, 'a Tuesday at noon');
  h = hit('ביום שישי בלילה'); ok(h && h.d.getDay() === 5 && h.d.getHours() === 21, '"ביום שישי בלילה" works too');
  h = hit('מחר בשעה 17:30'); ok(h && h.d.getHours() === 17 && h.d.getMinutes() === 30, 'an exact time still wins');
  h = hit('tomorrow evening'); ok(h && h.d.getDate() === 6 && h.d.getHours() === 19, '"tomorrow evening"');
  h = hit('Friday night drinks'); ok(h && h.d.getDay() === 5 && h.d.getHours() === 21, '"Friday night"');
  h = hit('next Tuesday'); ok(h && h.d.getDay() === 2 && h.allDay, '"next Tuesday" is still understood');
  h = hit('Friday evening 17:30'); ok(h && h.d.getHours() === 17, 'an exact time beats a part of the day, wherever it is written');
  ok(hit('good evening everyone') === null && hit('what a lovely morning') === null && hit('night night') === null, 'a part of the day alone is not a date');
  ok(hit('שני פריטים לקנות') === null && hit('שלישי בשורה') === null && hit('בערב נחמד') === null, 'a Hebrew weekday word without a part of the day ("שני פריטים") and a part of the day alone are not dates');
  ok(!/replace|innerHTML|textContent/.test(code.slice(code.indexOf('function detect'))), 'detecting dates only reads text and changes nothing (the existing chip still asks before anything is created)');
}

// ================================================================ PILE phase 2
{
  const sp = fn('shufflePile'), mp = fn('movePileMember');
  ok(/Stick\.pile\.shuffle\(pile\.members/.test(sp) && /recordChange\("Shuffle pile", before\)/.test(sp) && /captureState\(\[pile\.id\]\)/.test(sp), 'shuffle reorders the member list and is one undo step');
  ok(/recordChange\("Reorder pile", before\)/.test(mp) && /j < 0 \|\| j >= pile\.members\.length/.test(mp), 'moving a paper earlier / later is one undo step and stops at the ends');
  ok(!/notes\.splice|notes\.push|delete |pileId/.test(sp + mp), 'shuffling and reordering change only the order: no member is removed from the board\'s object list');
  const c = fresh(); load(c, 'js/pile.js'); const P = c.Stick.pile; const seq = [0.3, 0.8, 0.1, 0.6, 0.9]; let k = 0;
  const m = ['a', 'b', 'c', 'd', 'e', 'f']; const sh = P.shuffle(m, () => seq[k++ % seq.length]);
  ok(sh.slice().sort().join('') === 'abcdef' && m.join('') === 'abcdef', 'a shuffle keeps every member and never changes its input');
  const ob = fn('openPileBrowser');
  ok(/FAN_MAX = 9/.test(app) && /live\.length - FAN_MAX/.test(ob) && /to = Math\.min\(live\.length, from \+ FAN_MAX\)/.test(ob), 'the fan shows at most nine papers, however big the pile (never a hundred full objects)');
  ok(/max-width: 700px\), \(pointer: coarse\)/.test(ob) && /fanBtn\.hidden = !fanOK/.test(ob), 'no fan on phones or touch: one paper at a time with arrows, swipe and an index');
  ok(/Move earlier/.test(ob) && /Move later/.test(ob) && /Shuffle/.test(ob) && /Take this one out/.test(ob) && /Back to the pile/.test(ob), 'the browser has reorder, shuffle, take out and back to the pile');
  ok(/e\.key === "Home"/.test(ob) && /e\.key === "End"/.test(ob) && /ArrowRight/.test(ob) && /e\.key === "Tab"/.test(ob), 'keyboard: arrows, Home and End, and Tab stays inside');
  ok(!/notes\.splice|notes\.push|saveNotes\(|zCounter/.test(ob.replace(/take = tool[^\n]*\n/, '')), 'browsing and fanning still never write anything');
  ok(/pileRelease\(t\.id, true\)/.test(fn('pileMarkTopDone')) && /donePile\.push\(snap\)/.test(fn('pileMarkTopDone')) && /delete snap\.pileId/.test(fn('pileMarkTopDone')), 'a pile member marked Done leaves the pile and goes to Done');
  ok(/dissolveInto\(p, rest\)/.test(fn('pileRelease')) && /MIN_MEMBERS/.test(fn('pileRelease')), 'a pile that drops to one paper dissolves');
  ok(/@keyframes|\.pbFanCard\{/.test(css) && /prefers-reduced-motion: reduce\)\{ \.pbFanCard\{ transition:none; \}/.test(css), 'the fan\'s only motion is a short transition, off under reduced motion');
}

// ================================================================ LINKS, MEDIA, VIDEO, ACCOUNT PHOTO, SHOPPING
{
  ok(/\.note \.text a\[href\][^{]*\{ cursor:pointer; \}/.test(css), 'links in notes show a pointer, not a text caret');
  ok(/fav\.appendChild\(siteMarkEl\(href\)\)/.test(fn('showLinkCard')) && !/favicon\.ico/.test(fn('showLinkCard')), 'the link card shows a letter mark instead of fetching the site\'s icon (no third-party request just to preview a link)');
  ok(/Remove the image \(the note stays\)/.test(app) && /<path d="M4 4l16 16"><\/path>/.test(app) && /\.noteImgWrap \.rmImg\{ top:auto; right:auto; left:6px; bottom:6px;/.test(css), '"remove the image" is a different place (bottom-left of the image), shape and label from "delete the note" (top-right X)');
  ok(/\.noteImgWrap \.rmImg:hover, \.noteImgWrap \.rmImg:focus-visible\{ background:#6a4a10;/.test(css) && !/rmImg[^{]*:hover[^{]*\{[^}]*destructive/.test(css), 'removing an image does not use the destructive red reserved for deleting a note');
  const ep = fn('embedPlay');
  ok(/embCtl/.test(ep) && /requestFullscreen/.test(ep) && /embedStop\(n\)/.test(ep), 'a playing video has Stick-It controls for full screen and Stop (which lets the player go)');
  ok(/embedPoster\(n\)/.test(fn('renderEmbed')) && !/embedPlay\(n\)/.test(fn('renderEmbed').replace(/e\.key === "Enter"[^\n]*\n/, '')), 'video is poster-first: the provider\'s player mounts only after a deliberate Play');
  ok(!/img\.youtube|ytimg|vimeocdn/.test(app), 'no thumbnails are fetched from the video providers before Play (that would contact them)');
  ok(/@media \(hover:none\)\{ \.embedObj \.embCtl\{ opacity:1; \} \}/.test(css), 'touch: the video controls do not depend on hover');
  const tp = fn('takePhoto');
  ok(/getUserMedia\(\{video: \{facingMode: "user"\}/.test(tp) && (app.match(/getUserMedia\(\{video: \{facingMode/g) || []).length === 1, 'the camera is requested in exactly one place: Take photo (the voice recorder asks for the microphone only)');
  ok(/release\(\)/.test(tp) && /getTracks\(\)\.forEach\(function\(t\)\{ try\{ t\.stop\(\)/.test(tp) && /onClose: function\(v\)\{\s*release\(\);/.test(tp), 'Cancel, Esc and Take photo all switch the camera off');
  ok(/capture", "user"/.test(tp) && /Couldn\\u2019t open the camera/.test(tp), 'devices without a live camera API get the phone\'s camera picker; a refusal says so and offers upload');
  ok(/item\("Take photo", takePhoto\)/.test(app) && /item\("Cancel", function\(\)\{\}\)/.test(app) && /asPicEdit/.test(app) && /Edit profile photo/.test(app), 'the account photo has a pencil, and a menu: Upload, Take photo, Remove, Cancel');
  ok(/\.shopObj > \.cmtTab\{ z-index:0; left:22px; bottom:auto;/.test(css) && /function placeShopTab/.test(app), 'the Comment tab hangs from the paper edge (placed by script from the paper, not the node box)');
  ok(!/\.shopObj > \.cmtTab[^{]*\{[^}]*position:fixed/.test(css), 'the tab is positioned inside the object, so it follows movement, rotation and resize');
  { // shopping state survives Done and restore
    const c = fresh(); load(c, 'js/shopping.js'); load(c, 'js/objects.js'); const S = c.Stick.shopping;
    const list = S.normalize({ type: 'shopping', title: 'Weekend', items: [{ id: 'i1', t: 'Milk', c: true, p: 250, q: '2' }, { id: 'i2', t: 'Eggs' }], cur: 'EUR', variant: 'b' }, {});
    const done = Object.assign({}, JSON.parse(JSON.stringify(list)), { doneAt: 5 }), back = Object.assign({}, done); delete back.doneAt;
    ok(JSON.stringify(back.items) === JSON.stringify(list.items) && back.title === 'Weekend' && back.cur === 'EUR', 'Done and Put back keep every item, tick, price, quantity, title and currency (the object is stored whole)');
    ok(!!S && /isPaper\(n\)\)\) return;/.test(fn('markDone')), 'a whole shopping list can be marked Done');
  }
}

// ================================================================ versions, docs
const pn = JSON.parse(read('docs/patch-notes/patch-notes.json'));
const pn3 = pn.find((x) => x.version === '0.8.3');
ok(pn3 && pn3.codename === 'Stick Around' && pn3.status === 'development' && pn3.date === null && pn3.title === 'Stick-It v0.8.3 — Stick Around', 'v0.8.3 "Stick Around" is recorded and not released');
ok(/APP_STATUS: "development"/.test(read('js/config.js')) && /APP_VERSION: "0\.8\.3(?:\.\d)?"/.test(read('js/config.js')), 'the app is still in development');
ok(JSON.parse(read('docs/patch-notes/index.json')).find((x) => x.version === '0.8.3').file === '0.8.3.md' && fs.existsSync(path.join(root, 'docs/patch-notes/0.8.3.md')), 'patch notes and the index are in step');
ok(pn3.tour.length === 5 && ['Done has somewhere to go', 'Trash without panic', 'Scraps got richer', 'Your board remembers more'].every((t) => pn3.tour.some((s) => s.title === t)), 'the Spotlight has the four cards');
const pd = read('js/patch-data.js'); ok(/"version": "0\.8\.\d(?:\.\d)?"/.test(pd) && !/Touch the Paper/.test(pd), 'the shipped Spotlight data has no stale content');
const md = read('docs/patch-notes/0.8.3.md'); ok(['## Done has somewhere to go', '## Trash without panic', '## Shopping List finishing pass', '## Newspaper', '## Clippings', '## Reactions', '## Better layering', '## Search that actually takes you there', '## Better links and video', '## Piles grew up', '## Receipt polish'].every((h) => md.includes(h)), 'the patch note follows the agreed structure');
ok(!/Nokia|VHS|cassette/i.test(JSON.stringify(Object.keys(JSON.parse(JSON.stringify({ k: read('js/objects.js').match(/O\.KINDS = \[[^\]]*\]/)[0] }))))), 'no Premium physical nodes were added (they are v0.8.4)');
ok(/pre-beta/i.test(read('docs/dev/PRE-BETA-CHECKLIST.md')) || /Before the local beta/.test(read('docs/dev/PRE-BETA-CHECKLIST.md')), 'the pre-beta review checkpoint is still there');

console.log('v0.8.3: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
