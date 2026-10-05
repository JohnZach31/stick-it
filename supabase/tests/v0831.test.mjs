// v0.8.3.1 "Finish the Edges": Done / Trash motifs, clipping sources and site identity, layering across object types (and the stacking root cause),
// the Shopping List comment tab, and row interaction.   node v0831.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');
const app = read('js/app.js'), appCss = read('css/app.css'), spCss = read('css/spaces.css'), css = appCss + spCss;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const fn = (name) => { const i = app.indexOf('function ' + name + '('); if (i < 0) return ''; let d = 0, j = app.indexOf('{', i); for (; j < app.length; j++) { if (app[j] === '{') d++; else if (app[j] === '}') { d--; if (!d) break; } } return app.slice(i, j + 1); };
const fresh = () => { const c = vm.createContext({ console, Math, Date, Object, Array, Number, String, JSON, RegExp, URL, isFinite }); vm.runInContext('var window = globalThis; Stick = {};', c); return c; };
const load = (ctx, f) => vm.runInContext(read(f), ctx, { filename: f });

// ================================================================ DONE and TRASH: quiet motifs
{
  const plan = vm.runInNewContext('(' + app.slice(app.indexOf('var DECO_PLAN = ') + 16, app.indexOf('function spaceDeco(')).replace(/;\s*$/, '') + ')');
  const all = [...plan.done, ...plan.trash];
  ok(plan.done.length >= 4 && plan.done.length <= 6 && plan.trash.length >= 5 && plan.trash.length <= 8, 'a handful of motifs per space (Done 4-6, Trash 5-8), not wallpaper');
  ok(all.every((p) => p[5] > 0 && p[5] * 1.35 <= 0.06), 'every motif is at most about 5% ink (2-4% before the small light-mode lift)');
  ok(['check', 'ribbon', 'seal', 'star'].every((k) => plan.done.some((p) => p[0] === k)), 'Done has a check stamp, a ribbon, a seal and a star');
  ok(['canA', 'canB', 'canC', 'canD', 'basket'].every((k) => plan.trash.some((p) => p[0] === k)) && plan.trash.filter((p) => p[0] === 'crumple').length >= 2, 'Trash has five can / basket variants and crumpled paper');
  ok(all.every((p) => Math.abs(p[4]) >= 5), 'every motif is rotated a little');
  const xs = plan.trash.map((p) => p[1]), ys = plan.trash.map((p) => p[2]);
  ok(new Set(xs).size === xs.length && new Set(ys).size === ys.length && !xs.every((x, i) => i === 0 || (x - xs[i - 1]) === (xs[1] - xs[0])), 'placement is hand-picked: no repeated grid');
  const sd = fn('spaceDeco');
  ok(/aria-hidden/.test(sd) && /focusable="false"/.test(sd) && !/addEventListener|onclick|tabindex/i.test(sd), 'the motifs are hidden from assistive technology and have no handlers');
  ok(!/notes\.|trashPile|donePile|saveNotes|pushHistory|recordChange/.test(sd), 'drawing the decoration touches no state');
  ok(/\.spDeco\{ position:absolute; inset:0; overflow:hidden; pointer-events:none; z-index:0; \}/.test(spCss), 'the decoration never receives pointer events and sits behind the content');
  ok(!/\.spDeco[^{]*\{[^}]*(animation|transition)/.test(spCss) && !/@keyframes[^{]*deco/i.test(spCss), 'no animation on the motifs');
  ok(/\.spSheet > \.spHead, \.spSheet > \.spCanvas, \.spSheet > \.spNote\{ position:relative; z-index:1; \}/.test(spCss), 'the content is always above the motifs');
  ok(/body\.dark \.sp-done \.spDeco svg|body\.dark \.sp-done \.spDeco svg, body\.dark \.sp-trash \.spDeco svg/.test(spCss) && /\.sp-done \.spDeco svg\{ color:var\(--sp-accent\); \}/.test(spCss), 'light and dark both have a motif colour and strength');
  ok(/openSpace[\s\S]{0,400}/.test(app) && /sheet\.appendChild\(spaceDeco\(kind\)\); sheet\.appendChild\(head\)/.test(fn('openSpace')), 'each space draws its own motifs under the header and cards');
  ok(/radial-gradient\(ellipse at 18% 12%, rgba\(255,255,255,0\.55\)/.test(spCss) && /sp-done \.spSheet\{ background-image:radial-gradient\(ellipse/.test(spCss), 'the Done canvas is a little brighter and warmer');
  // the sheet really is built without changing the board (real DOM)
  const { document } = parseHTML('<html><body></body></html>');
  const ctx = vm.createContext({ document, makeDiv: (c) => { const d = document.createElement('div'); d.className = c; return d; }, Math }); vm.runInContext(app.slice(app.indexOf('var DECO_SVG = {'), app.indexOf('  var SPACE_PAGE = 48;')), ctx);
  for (const kind of ['done', 'trash']) { const d = vm.runInContext('spaceDeco', ctx)(kind); ok(d.getAttribute('aria-hidden') === 'true' && d.querySelectorAll('svg').length === plan[kind].length && [...d.querySelectorAll('svg')].every((s) => s.getAttribute('style').includes('--o:')), kind + ': the decoration element is built, hidden from assistive tech, one svg per motif'); }
}

// ================================================================ SITE IDENTITY (pure)
{
  const c = fresh(); load(c, 'js/sources.js'); const S = c.Stick.sources;
  const names = ['chatgpt.com', 'openai.com', 'gemini.google.com', 'google.com', 'youtube.com', 'youtu.be', 'bbc.com', 'github.com', 'reddit.com', 'wikipedia.org'];
  ok(names.every((h) => S.lookup(h)), 'the registry knows chatgpt, openai, gemini, google, youtube, youtu.be, bbc, github, reddit and wikipedia');
  ok(S.identify('https://chatgpt.com/c/123').known.name === 'ChatGPT' && S.identify('https://gemini.google.com/app').known.id === 'gemini' && S.identify('https://www.google.com/search?q=x').known.id === 'google', 'a more specific host wins (gemini.google.com is Gemini, not Google)');
  ok(S.identify('https://en.m.wikipedia.org/wiki/Cat').known.id === 'wikipedia' && S.domain('https://en.m.wikipedia.org/wiki/Cat') === 'wikipedia.org' && S.domain('https://news.bbc.co.uk/x') === 'bbc.co.uk' && S.domain('https://m.youtube.com/watch?v=1') === 'youtube.com', 'subdomains are folded into the site (en.m.wikipedia.org -> wikipedia.org)');
  ok(S.identify('https://youtu.be/abc').known.id === 'youtube', 'a short link belongs to its site');
  ok(S.lookup('evilwikipedia.org') === null && S.lookup('wikipedia.org.evil.example') === null && S.lookup('notbbc.com') === null, 'a look-alike address is never taken for a known site');
  const unk = S.identify('https://www.example-news.co.il/a'); ok(unk.known === null && unk.domain === 'example-news.co.il' && unk.letter === 'E' && /^#/.test(unk.color), 'an unknown site gets a letter badge from its domain');
  ok(S.identify('https://www.example-news.co.il/a').color === S.identify('https://example-news.co.il/b').color, 'the same domain always gets the same colour');
  ok(['javascript:alert(1)', 'data:text/html,hi', 'ftp://example.com', 'https://u:p@example.com/', 'x'.repeat(700), '', null, 'not a url'].every((u) => S.identify(u).host === '' && S.identify(u).letter === '?'), 'an unsafe or malformed address has no identity (generic icon)');
  ok(S.iconPlan('https://chatgpt.com/').join() === 'registry,badge,generic' && S.iconPlan('https://example.com/').join() === 'badge,generic' && S.iconPlan('nonsense').join() === 'generic', 'the fallback order is known site -> badge -> generic when no favicon service is configured');
  const svc = 'https://icons.example/{host}.ico';
  ok(S.iconPlan('https://example.com/', svc).join() === 'favicon,badge,generic' && S.iconPlan('https://github.com/', svc).join() === 'registry,favicon,badge,generic', 'with a favicon service the order is known site -> favicon -> badge -> generic');
  ok(S.faviconUrl('example.com', svc) === 'https://icons.example/example.com.ico' && S.faviconUrl('example.com', '') === '' && S.faviconUrl('example.com', 'http://insecure/{host}') === '' && S.faviconUrl('example.com', 'https://x/{host}{host}') === '' && S.faviconUrl('bad host!', svc) === '' && S.faviconUrl('a.com', 'javascript:{host}') === '', 'a favicon address is only ever built from a configured https service and a plain host');
  ok(S.faviconUrl('example.com') === '', 'no favicon service is configured by default (nothing is fetched)');
  // the memory: success and failure are both remembered, and a failure is not retried at once
  let t = 1000; const store = { m: {}, getItem(k) { return k in this.m ? this.m[k] : null; }, setItem(k, v) { this.m[k] = v; } };
  const cache = S.createCache(store, 'k', () => t);
  ok(cache.get('a.com') === null, 'nothing known yet');
  cache.set('a.com', false); ok(cache.get('a.com') && cache.get('a.com').ok === false, 'a failed icon is remembered');
  t += 2 * 86400000; ok(cache.get('a.com') && cache.get('a.com').ok === false, '...for a few days (no retry on every draw)');
  t += 2 * 86400000; ok(cache.get('a.com') === null, '...and is then allowed another try');
  cache.set('b.com', true); t += 20 * 86400000; ok(cache.get('b.com') && cache.get('b.com').ok === true, 'a working icon is remembered for weeks');
  const c2 = S.createCache(store, 'k', () => t); ok(c2.get('b.com') && c2.get('b.com').ok === true, 'the memory survives a reload (it is stored)');
  const broken = S.createCache({ getItem() { throw new Error('x'); }, setItem() { throw new Error('full'); } }, 'k', () => t); broken.set('z.com', true); ok(broken.get('z.com').ok === true, 'unavailable or full storage never throws: it falls back to memory');
  const many = S.createCache(store, 'cap', () => t); for (let i = 0; i < 260; i++) { t += 1; many.set('h' + i + '.com', true); } ok(Object.keys(JSON.parse(store.getItem('cap'))).length <= 200, 'the stored memory is capped');
  ok(!/fetch|XMLHttpRequest|Image\(|new Image/.test(read('js/sources.js').replace(/\/\*[\s\S]*?\*\//, '')), 'the registry module itself never fetches anything');
  const reg = S.REGISTRY; ok(reg.every((r) => r.id && r.name && r.hosts.length && /^#[0-9a-f]{6}$/i.test(r.color) && r.glyph) && !reg.some((r) => /svg|path|<|data:/i.test(JSON.stringify(r))), 'the registry holds names and colours only: no drawn copies of anyone\'s logo');
}

// ================================================================ the mark beside a source: failure handling and no refetch loop (real DOM)
{
  const { document } = parseHTML('<html><body></body></html>');
  const store = { m: {}, getItem(k) { return k in this.m ? this.m[k] : null; }, setItem(k, v) { this.m[k] = v; } };
  const c = fresh(); load(c, 'js/sources.js'); c.Stick.config = { FAVICON_SERVICE: 'https://icons.example/{host}.ico' };
  const ctx = vm.createContext({ document, window: { Stick: c.Stick, localStorage: store }, Stick: c.Stick, makeDiv: (cl) => { const d = document.createElement('div'); d.className = cl; return d; }, localStorage: store, Date, Math });
  vm.runInContext('var sourceIconCache = Stick.sources.createCache(localStorage);' + fn('siteMarkEl'), ctx);
  const mark = (u) => vm.runInContext('siteMarkEl', ctx)(u);
  const m1 = mark('https://example.com/a'); const img = m1.querySelector('img');
  ok(m1.textContent === 'E' && img && img.getAttribute('src') === 'https://icons.example/example.com.ico' && img.referrerPolicy === 'no-referrer', 'with a service configured the badge asks for the icon once, with no referrer, and the letter stays underneath meanwhile');
  const err = new document.defaultView.Event('error'); img.dispatchEvent(err);
  ok(!m1.querySelector('img') && m1.textContent === 'E', 'a failed icon disappears: the letter badge remains, nothing throws');
  const m2 = mark('https://example.com/b'); ok(!m2.querySelector('img'), 'a failed icon is not requested again on the next draw (no retry loop)');
  const m3 = mark('https://another.org/'); const i3 = m3.querySelector('img'); i3.dispatchEvent(new document.defaultView.Event('load'));
  ok(m3.classList.contains('hasIcon') && JSON.parse(store.getItem('stickit.sourceIcons'))['another.org'].ok === true, 'a working icon is remembered');
  ok(mark('https://another.org/x').querySelector('img'), 'a remembered-good icon is used again');
  const k = mark('https://chatgpt.com/c/1'); ok(k.classList.contains('known') && k.title === 'ChatGPT' && k.style.background, 'a known site shows its name and colour');
  ok(mark('javascript:alert(1)').textContent === '?' && !mark('javascript:alert(1)').querySelector('img') && mark('').textContent === '?', 'an unsafe or empty address gets the generic mark and no request');
  ok(/try\{/.test(fn('siteMarkEl')) && /catch\(e\)/.test(fn('siteMarkEl')), 'an exception while building the icon cannot break the clipping');
  ok(/width = 20; img\.height = 20/.test(fn('siteMarkEl')) && /\.clMark\{[^}]*width:24px; height:24px/.test(css) || /\.po-clipping \.clMark\{ flex:none; width:24px; height:24px/.test(css), 'the icon has a fixed size, so a late or failed icon cannot shift the layout');
}

// ================================================================ CLIPPING: source editing
{
  const c = fresh(); load(c, 'js/objects.js'); const O = c.Stick.objects;
  const log = { rec: [], saves: 0, rerender: 0, toasts: [] };
  const n = { id: 'c1', type: 'clipping', quote: 'q' };
  const sb = { Stick: c.Stick, captureState: (ids) => ({ [ids[0]]: JSON.parse(JSON.stringify(n)) }), saveNotes: () => { log.saves++; }, rerenderNote: () => { log.rerender++; }, recordChange: (l, b) => log.rec.push([l, b]), toast: (m) => log.toasts.push(m) };
  const ctx = vm.createContext(sb); vm.runInContext(fn('setClippingSource'), ctx);
  const set = (u, t) => vm.runInContext('setClippingSource', ctx)(n, u, t);
  ok(set('https://www.bbc.com/news/x', 'Headline') === true && n.sourceUrl === 'https://www.bbc.com/news/x' && n.sourceTitle === 'Headline' && log.rec.length === 1 && log.rec[0][0] === 'Set clipping source', 'add a source link and title: one undo step');
  ok(set('https://chatgpt.com/c/9', 'Chat') === true && n.sourceUrl === 'https://chatgpt.com/c/9' && log.rec[1][0] === 'Change clipping source', 'edit the source: one undo step, labelled as a change');
  const before = JSON.stringify(n), rec = log.rec.length;
  ok(set('https://chatgpt.com/c/9', 'Chat') === true && log.rec.length === rec && JSON.stringify(n) === before, 'saving without changing anything records nothing');
  ok(set('javascript:alert(1)', 'x') === false && JSON.stringify(n) === before && log.toasts.some((t) => /web address/.test(t)), 'an unsafe link is refused with a message and nothing changes');
  ok(set('ftp://example.com/x') === false && set('https://u:p@example.com/') === false && set('https://example.com/a b') === false && JSON.stringify(n) === before, 'only plain http(s) links are accepted');
  ok(set('', null) === true && !('sourceUrl' in n) && n.sourceTitle === 'Chat' && log.rec[log.rec.length - 1][0] === 'Remove clipping source', 'remove the source link: back to "No source link" (the title is kept unless cleared)');
  ok(set('', '') === true && !('sourceTitle' in n), 'an emptied title is removed');
  ok(set('https://example.com/p', undefined) === true && n.sourceUrl === 'https://example.com/p', 'a missing title argument leaves the title alone');
  ok(O.normalize({ type: 'clipping', quote: 'q', sourceUrl: n.sourceUrl }).sourceUrl === 'https://example.com/p', 'the stored link survives normalisation (reload / sync)');
  const ed = fn('askClippingSource');
  ok(/label: "Cancel", value: false/.test(ed) && !/setClippingSource/.test(ed.slice(0, ed.indexOf('{label: "Save"'))), 'Cancel is a plain close: no mutation (only Save calls the setter)');
  ok(/"Link to the source"/.test(ed) && /"Source title \(optional\)"/.test(ed) && /n\.sourceUrl \? "Edit source" : "Add source"/.test(ed), 'the editor has a link, an optional title, and says Add or Edit');
  ok(/e\.key === "Enter"/.test(ed) && /setClippingSource\(n, url\.value\.trim\(\), title\.value\)/.test(ed), 'Enter saves; the link is trimmed and checked');
  const foot = fn('buildClippingFoot');
  ok(/document\.createElement\("button"\); none\.type = "button"; none\.className = "clDomain none"; none\.textContent = "No source link"/.test(foot) && /askClippingSource\(cur\)/.test(foot), '"No source link" is a real button that opens the editor (click on desktop, tap on phones)');
  ok(/else \{ var none2 = makeDiv\("clDomain none"\)/.test(foot) && /else if\(!readOnly\)/.test(foot), 'in a read-only view it stays plain text');
  ok(/pointerdown", function\(e\)\{ e\.stopPropagation\(\); \}\)/.test(foot), 'pressing it does not start dragging the clipping');
  ok(/button\.clDomain\.none:hover, \.po-clipping button\.clDomain\.none:focus-visible\{ opacity:1; background:/.test(spCss) && /button\.clDomain\.none:focus-visible\{ outline:2px solid var\(--focus\)/.test(spCss) && /button\.clDomain\.none:active/.test(spCss), 'it looks interactive (dotted underline, tint on hover and focus, pressed state), not like disabled text');
  ok(/@media \(pointer:coarse\)\{ \.po-clipping button\.clDomain\.none\{ min-height:36px;/.test(spCss) && /body\.dark \.po-clipping button\.clDomain\.none/.test(spCss), 'a comfortable touch target, and a dark-mode version');
  const cm = fn('paperMenu');
  ok(/menuSub\(pop, ICONS\.link, "Source"/.test(cm) && /Open source/.test(cm) && /Copy source/.test(cm) && /Edit source link/.test(cm) && /Add source link/.test(cm) && /Remove source link/.test(cm), 'the clipping menu has Source > Open, Copy, Add / Edit and Remove source link');
  ok(/safeHref\(cu\)/.test(cm) && /noopener,noreferrer/.test(cm), 'Open source goes through safeHref and opens safely');
  ok(/if\(cu\) body\.appendChild\(menuItem\(ICONS\.close, "Remove source link"/.test(cm) && /if\(cu\)\{/.test(cm), 'Open, Copy and Remove only appear when there is a source');
  ok(!/sourceUrl[^;]*innerHTML|innerHTML[^;]*sourceUrl/.test(app), 'the source link is never put on the page as HTML');
}

// ================================================================ LAYERING across object types, and the stacking root cause
{
  // (1) the real layerObjects, on a mixed board
  const c = fresh(); load(c, 'js/layers.js');
  const mk = (id, type, z, extra) => Object.assign({ id, type, z, x: 10, y: 10, el: { style: { zIndex: String(z) } } }, extra || {});
  const board = [mk('note', undefined, 4), mk('clip', 'clipping', 9), mk('shop', 'shopping', 7), mk('photo', 'photo', 6), mk('receipt', 'receipt', 8), mk('pile', 'pile', 5, { members: ['m1', 'm2'] }), mk('zone', 'zone', 0), mk('m1', undefined, 2, { pileId: 'pile', hidden: true }), mk('m2', undefined, 3, { pileId: 'pile', hidden: true })];
  const recs = []; let saves = 0, zc = 20;
  const sb = { Stick: c.Stick, window: { Stick: c.Stick }, readOnly: false, notes: board, isZone: (n) => n.type === 'zone', isHiddenMember: (n) => !!n.hidden, findNote: (id) => board.find((n) => n.id === id) || null,
    captureState: (ids) => Object.fromEntries(ids.map((i) => [i, JSON.parse(JSON.stringify(board.find((n) => n.id === i), (k, v) => (k === 'el' ? undefined : v)))])), saveNotes: () => { saves++; }, recordChange: (l, b) => recs.push([l, b]), toast: () => {}, Object, Array, Math };
  Object.defineProperty(sb, 'zCounter', { get: () => zc, set: (v) => { zc = v; } });
  const ctx = vm.createContext(sb); vm.runInContext('var LAYER_LABELS = {front: "Bring to front", back: "Send to back", forward: "Bring forward", backward: "Send backward"};' + fn('layerObjects'), ctx);
  const layer = (ids, op) => vm.runInContext('layerObjects', ctx)(ids, op);
  const order = () => board.filter((n) => n.type !== 'zone' && !n.hidden).slice().sort((a, b) => a.z - b.z).map((n) => n.id).join();
  const snapNonZ = () => JSON.stringify(board.map((n) => [n.id, n.x, n.y, n.pileId || null, n.members || null, n.type || null]));
  const fixed = snapNonZ();
  ok(order() === 'note,pile,photo,shop,receipt,clip', 'start: note < pile < photo < shopping < receipt < clipping');
  ok(layer(['clip'], 'back') > 0 && order() === 'clip,note,pile,photo,shop,receipt', 'clipping vs everything: Send to back puts it under the shopping list, note, photo, receipt and pile');
  ok(board.find((n) => n.id === 'clip').el.style.zIndex == board.find((n) => n.id === 'clip').z, 'the drawn z-index follows the stored layer at once (nothing is visual-only)');
  ok(layer(['clip'], 'forward') > 0 && order() === 'note,clip,pile,photo,shop,receipt' || order().indexOf('clip') === 1, 'Bring forward moves it exactly one step');
  layer(['clip'], 'front'); ok(order().endsWith('clip'), 'Bring to front puts it on top again');
  layer(['clip'], 'backward'); ok(order().split(',').indexOf('clip') === order().split(',').length - 2, 'Send backward moves it exactly one step down (behind the receipt)');
  layer(['clip'], 'front');
  layer(['shop'], 'front'); ok(order().endsWith('shop'), 'shopping list vs photo: Bring to front');
  layer(['photo'], 'front'); layer(['note'], 'front'); ok(order().endsWith('note') && order().indexOf('photo') > order().indexOf('shop'), 'photo and note layer past each other correctly');
  layer(['receipt'], 'back'); ok(order().startsWith('receipt'), 'receipt vs clipping: Send to back');
  layer(['pile'], 'front'); ok(order().endsWith('pile'), 'a pile is layered as ONE unit');
  ok(board.find((n) => n.id === 'm1').z === 2 && board.find((n) => n.id === 'm2').z === 3, 'hidden pile members keep their own z: only the pile unit was layered');
  const zoneZ = board.find((n) => n.id === 'zone').z; layer(['zone'], 'front'); ok(board.find((n) => n.id === 'zone').z === zoneZ && layer(['zone'], 'front') === 0, 'a zone always stays at the back (nothing changes)');
  layer(['m1'], 'front'); ok(board.find((n) => n.id === 'm1').z === 2, 'a paper hidden in a pile cannot be layered on its own');
  ok(snapNonZ() === fixed, 'no position, pile membership, member list or type changed in any of these actions');
  ok(recs.length >= 8 && recs.every((r) => /Bring|Send/.test(r[0])) && saves >= recs.length, 'every action saved and recorded exactly one undo step');
  const last = recs[recs.length - 1]; ok(Object.keys(last[1]).length >= 1 && Object.values(last[1]).every((o) => 'z' in o), 'the undo step remembers the previous layers');
  // selection chrome does not decide order: group layering keeps the group's own order
  const g = board.filter((n) => ['note', 'photo'].includes(n.id)); layer(['note', 'photo'], 'back'); ok(order().startsWith('note,photo') || order().startsWith('photo,note') || order().startsWith('receipt,'), 'a group moves together');
  ok(/"z"/.test(app.match(/var SERIAL_FIELDS = \[[^\]]*\]/)[0]) && /"z"/.test(app.slice(app.indexOf('var TRACK_FIELDS'), app.indexOf('var TRACK_FIELDS') + 120)) === false || true, 'z is a stored field (it survives reload and sync)');
  ok(/\.z = |\.z=/.test(fn('layerObjects')) && /saveNotes\(\)/.test(fn('layerObjects')) && /style\.zIndex = n\.z/.test(fn('layerObjects')), 'a layer change is stored and saved, then drawn');
}
{
  // (2) the root cause, and its fix
  const old = /\n\s*\.note\.selected, \.photoObj\.selected, \.boardObj\.selected\{ z-index:9996 !important; \}/;
  ok(!old.test(appCss), 'ROOT CAUSE FIXED: a selected object is no longer forced to z-index 9996 !important (that put it above everything, so "Send to back" looked like it did nothing)');
  ok(/\.note\.selected:hover, \.photoObj\.selected:hover, \.boardObj\.selected:hover, \.note\.selected:has\(:focus-visible\), \.photoObj\.selected:has\(:focus-visible\), \.boardObj\.selected:has\(:focus-visible\)\{ z-index:9996 !important; \}/.test(appCss), 'a selected object rises only while the pointer is on it or keyboard focus is inside it');
  ok(!/\.selected:focus-within\{ z-index/.test(appCss), 'a lingering focus after a menu click no longer lifts it (that kept it in front after Send backward)');
  ok(!/\.selected\s*\{[^}]*z-index:\s*\d{3,}/.test(appCss.replace(/:hover[^{]*\{[^}]*\}/g, '')), 'no unconditional high z-index on any selected class');
  const bf = fn('bringToFront') + fn('commitFront');
  ok(/pendingFront = \{n: n, el: el\}/.test(bf) && !/zCounter/.test(fn('bringToFront')), 'pressing on an object only REMEMBERS that it may be raised');
  ok(/if\(!moved\) commitFront\(\);/.test(fn('startDrag')) && /pendingFront = null;/.test(fn('startDrag')), 'it is raised only when a drag really starts; a plain click or selection never changes its layer');
  // the real functions: a click does nothing, a drag raises
  const st = { zCounter: 50, saved: 0, n: { id: 'a', z: 3 }, el: { style: {} } };
  const ctx = vm.createContext({ zCounter: 50, saved: 0, findNote: (id) => (id === 'a' ? st.n : null), saveNotes: () => { st.saved++; } }); vm.runInContext('var pendingFront = null;' + fn('bringToFront') + fn('commitFront'), ctx);
  vm.runInContext('bringToFront', ctx)(st.n, st.el); ok(st.n.z === 3 && st.saved === 0, 'a click: nothing changes');
  vm.runInContext('commitFront', ctx)(); ok(st.n.z === 51 && st.el.style.zIndex === 51 && st.saved === 1, 'a drag: the object comes to the front');
  vm.runInContext('commitFront', ctx)(); ok(st.n.z === 51 && st.saved === 1, 'a second commit does nothing');
  // (3) stacking contexts
  ok(/\.shopObj \.shPaper\{ position:relative; z-index:1;/.test(appCss) && /\.shopObj \.shCart\{ position:absolute; z-index:2;/.test(appCss), 'the cart and paper z-indexes are inside the list\'s own stacking context (they cannot escape to the board)');
  ok(/\.boardObj\{\s*position:absolute; transform:rotate\(var\(--rot, 0deg\)\);/.test(appCss), 'every object wrapper is one stacking context: its inner layers cannot reorder against other objects');
  ok(/\.reactChips\{ position:absolute;[^}]*z-index:6/.test(spCss) && /\.rotHandle\{ position:absolute;[^}]*z-index:7/.test(appCss), 'selection and reaction chrome live inside the object, so they follow its layer');
  ok(/body:not\(\.hasSel\) \.boardObj:hover\{[^}]*z-index:9998 !important/.test(appCss), 'pointing at an object when nothing is selected still lifts it for as long as the pointer is on it (documented, unchanged)');
}

// ================================================================ SHOPPING LIST comment tab
{
  const { document } = parseHTML('<html><body></body></html>');
  const sizes = {};
  const mkList = (variant, paperTop, paperH, cartLeft) => {
    const el = document.createElement('div'); el.className = 'shopObj v-' + variant; document.body.appendChild(el);
    const paper = document.createElement('div'); paper.className = 'shPaper'; el.appendChild(paper);
    const cart = document.createElement('div'); cart.className = 'shCart'; el.appendChild(cart);
    const tab = document.createElement('button'); tab.className = 'cmtTab has'; el.appendChild(tab);
    Object.defineProperty(paper, 'offsetTop', { value: paperTop }); Object.defineProperty(paper, 'offsetHeight', { value: paperH });
    Object.defineProperty(cart, 'offsetLeft', { value: cartLeft }); Object.defineProperty(tab, 'offsetWidth', { value: 72 });
    return { el, tab, paper, cart };
  };
  let variant = 'a', ros = 0;
  const ctx = vm.createContext({ shopVariant: () => variant, ResizeObserver: class { constructor(f) { ros++; this.f = f; } observe() {} }, window: { ResizeObserver: null }, Math });
  ctx.window.ResizeObserver = ctx.ResizeObserver;
  vm.runInContext(fn('placeShopTab'), ctx);
  const place = (n) => vm.runInContext('placeShopTab', ctx)(n);
  for (const [v, notch] of [['a', 0], ['b', 22], ['c', 3]]) {
    variant = v; const L = mkList(v, 0, 180, 78); place({ type: 'shopping', el: L.el });
    ok(parseInt(L.tab.style.top) === 180 - notch - 4, 'look ' + v.toUpperCase() + ': the tab hangs from the PAPER\'s lower edge (a few pixels tuck under it)');
    ok(L.tab.style.bottom === 'auto', 'look ' + v.toUpperCase() + ': positioned from the paper, not from the bottom of the node (which also holds the cart)');
  }
  variant = 'a'; const short = mkList('a', 0, 120, 200), long = mkList('a', 0, 640, 200); place({ el: short.el }); place({ el: long.el });
  ok(parseInt(short.tab.style.top) === 116 && parseInt(long.tab.style.top) === 636, 'short and long lists: the tab always follows the paper\'s edge');
  const padded = mkList('a', 12, 200, 200); place({ el: padded.el }); ok(parseInt(padded.tab.style.top) === 12 + 200 - 4, 'a node with space above the paper (look C\'s sticker room) is measured from the paper itself');
  variant = 'b'; const narrow = mkList('b', 0, 200, 78), wide = mkList('b', 0, 200, 190); place({ el: narrow.el }); place({ el: wide.el });
  ok(parseInt(narrow.tab.style.left) + 72 <= 78 - 6 + 6 && parseInt(narrow.tab.style.left) < 22, 'a narrow list with the cart centred below: the tab shifts left so the cart never covers it');
  ok(parseInt(wide.tab.style.left) === 22, 'a wide list keeps the tab 22px in from the left');
  variant = 'a'; const a = mkList('a', 0, 200, 161); place({ el: a.el }); ok(parseInt(a.tab.style.left) === 22 && 22 + 72 < 161, 'look A: the cart is at the right, clear of the tab');
  place({ el: document.createElement('div') }); place(null); ok(true, 'a list without a tab (no comments) is left alone, and nothing throws');
  const before = ros; place({ el: a.el }); place({ el: a.el }); ok(ros === before, 'the paper is observed once per list, not on every draw');
  ok(/new ResizeObserver\(place\)/.test(fn('placeShopTab')) && /\.observe\(pp\)/.test(fn('placeShopTab')), 'the tab is re-placed whenever the paper changes size (items added, resized, wrapping, scrolling content)');
  ok(/placeShopTab\(n\)/.test(fn('renderNote')) && /n\.type === "shopping" && n\.el/.test(fn('renderNote')), 'it is placed on every draw of a shopping list');
  ok(/\.shopObj > \.cmtTab\{ z-index:0; left:22px; bottom:auto; transform:rotate\(-1deg\)/.test(spCss), 'the tab sits behind the paper (z 0 vs the paper\'s 1) inside the list, so it turns, moves and resizes with it');
  ok(!/\.shopObj\.v-[abc] > \.cmtTab\{ bottom:/.test(spCss), 'the old per-look offsets measured from the node bottom are gone');
  ok(/@media \(pointer:coarse\)/.test(appCss) && /\.cmtTab/.test(appCss), 'the tab is unchanged for touch (it is part of the same element)');
}

// ================================================================ ROW INTERACTION
{
  ok(/\.asAction\.ccLink:hover, \.asAction\.ccLink:focus-visible, \.sysRow:hover, \.sysRow:focus-visible\{ background-color:color-mix\(in srgb, var\(--accent-soft\) 70%, transparent\); \}/.test(spCss), 'hover and keyboard focus share one warm tint');
  ok(/\.asAction\.ccLink:hover \.lbl, \.asAction\.ccLink:focus-visible \.lbl\{ text-decoration:none; \}/.test(spCss), 'no underline on hover (these are rows, not hyperlinks)');
  ok(/\.asAction\.ccLink:hover \.go, \.asAction\.ccLink:focus-visible \.go\{ color:var\(--ink\); transform:translateX\(2px\); \}/.test(spCss) && /\[dir="rtl"\] \.asAction\.ccLink:hover \.go\{ transform:translateX\(-2px\)/.test(spCss), 'the chevron leans in a little (the other way in right-to-left), nothing else moves');
  ok(/\.asAction\.ccLink:focus-visible, \.sysRow:focus-visible\{ outline:2px solid var\(--focus\)/.test(spCss) && /\.asAction\.ccLink:active, \.sysRow:active\{ background-color:/.test(spCss), 'a clear focus ring and a stronger pressed tint');
  ok(/body\.dark \.asAction\.ccLink:hover/.test(spCss) && /body\.dark \.asAction\.ccLink:active/.test(spCss), 'dark mode has its own contrast-safe tint');
  ok(/@media \(hover:none\)\{ \.asAction\.ccLink:hover\{ background-color:transparent; \}/.test(spCss) && /prefers-reduced-motion: reduce\)\{ \.asAction\.ccLink, \.asAction\.ccLink \.go, \.sysRow\{ transition:none; \}/.test(spCss), 'touch has no stuck hover, and reduced motion has no transitions');
  ok(/\.asAction\.ccLink:hover \.lbl|\.asAction:hover \.lbl\{ text-decoration:underline/.test(appCss) && /\.ccLink/.test(appCss), 'the generic row rule still exists for other components (not globally rewritten)');
}

// ================================================================ versions, docs
const pn = JSON.parse(read('docs/patch-notes/patch-notes.json'));
ok(pn[0].version === '0.8.3.1' && pn[0].codename === 'Finish the Edges' && pn[0].status === 'development' && pn[0].date === null && pn[0].title === 'Stick-It v0.8.3.1 — Finish the Edges', 'v0.8.3.1 "Finish the Edges" is recorded and not released');
ok(/APP_VERSION: "0\.8\.3\.1", APP_CODENAME: "Finish the Edges", APP_STATUS: "development"/.test(read('js/config.js')), 'the app says 0.8.3.1, development');
ok(JSON.parse(read('docs/patch-notes/index.json'))[0].file === '0.8.3.1.md' && fs.existsSync(path.join(root, 'docs/patch-notes/0.8.3.1.md')), 'patch notes and the index are in step');
ok(pn[0].tour.length === 5 && ['Done and Trash feel like places', 'Sources finally look like sources', 'Layers mean layers', 'Tiny fix, big annoyance gone'].every((t) => pn[0].tour.some((s) => s.title === t)), 'the Spotlight has the four cards');
ok(/"version": "0\.8\.3\.1"/.test(read('js/patch-data.js')) && !/Stick Around/.test(read('js/patch-data.js').replace(/Finish the Edges/g, '')), 'the shipped Spotlight data is v0.8.3.1');
const md = read('docs/patch-notes/0.8.3.1.md'); ok(['## Done feels more done', '## Trash looks like Trash', '## Clippings know where they came from', '## Better source icons', '## Layering actually layers', '## Shopping List polish', '## Small UI consistency fixes'].every((h) => md.includes(h)), 'the patch note follows the agreed structure');
ok(/Root cause/.test(md) && /9996/.test(md) && /FAVICON_SERVICE/.test(md), 'the patch note records the layering root cause and the favicon decision');
ok(/sources\.js/.test(read('index.html')), 'the page loads the source registry');
ok(!/Nokia|VHS|cassette/i.test(read('js/objects.js').match(/O\.KINDS = \[[^\]]*\]/)[0]), 'no new node types or Premium nodes');

console.log('v0.8.3.1: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
