// v0.8.2.2 "Touch the Paper": the tack, turning things by hand, grouped menus, video links that already exist, delete, Legal & policies icons.
//   node v0822.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');
const app = read('js/app.js'), css = read('css/app.css');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const fn = (name) => { const i = app.indexOf('function ' + name + '('); if (i < 0) return ''; let d = 0, j = app.indexOf('{', i); for (; j < app.length; j++) { if (app[j] === '{') d++; else if (app[j] === '}') { d--; if (!d) break; } } return app.slice(i, j + 1); };

// ================================================================ ROTATION: model, range, snap, straighten, unsupported types, one undo step
{
  const code = ['rotatable', 'clampRot', 'snapRot', 'paintRot', 'setRotation', 'rotateBy', 'straighten'].map(fn).join('\n') + '\nvar ROT_MAX = 15, ROT_STEP = 3, ROT_SNAP = 5;';
  const log = { changes: [], saves: 0, toasts: [], tugs: 0 };
  const notesById = {};
  const sb = {
    readOnly: false, isZone: (n) => n.type === 'zone', isPileObj: (n) => n.type === 'pile', isAV: (n) => n.type === 'audio' || n.type === 'video', isHiddenMember: (n) => !!n.hidden,
    isPinned: (n) => n.pinned === true, pinTug: () => { log.tugs++; }, toast: (m) => log.toasts.push(m),
    captureState: (ids) => { const m = {}; ids.forEach((id) => { m[id] = JSON.parse(JSON.stringify(notesById[id])); }); return m; },
    saveNotes: () => { log.saves++; }, updateMinimap: () => {}, recordChange: (label, before) => { log.changes.push({ label, ids: Object.keys(before) }); },
    Math, Number, isFinite, Array,
  };
  const ctx = vm.createContext(sb); vm.runInContext(code, ctx);
  const mk = (o) => { const n = Object.assign({ id: 'n' + Math.random().toString(36).slice(2), rot: 0, el: { style: { v: '', setProperty(k, v) { this.v = v; } } } }, o); notesById[n.id] = n; return n; };
  const run = (e) => vm.runInContext(e, ctx);
  ok(run('clampRot(40)') === 15 && run('clampRot(-40)') === -15 && run('clampRot(4.26)') === 4.3 && run('clampRot("x")') === 0 && run('clampRot(NaN)') === 0, 'the angle is clamped to -15..+15 and rounded to a tenth; junk becomes level');
  ok(run('snapRot(7)') === 5 && run('snapRot(8)') === 10 && run('snapRot(-2.4)') === 0 && run('snapRot(14)') === 15 && run('snapRot(-14)') === -15 && run('snapRot(100)') === 15, 'Shift snaps to 5 degrees and never beyond the range');
  const types = { note: {}, receipt: { type: 'receipt' }, ticket: { type: 'ticket' }, postcard: { type: 'postcard' }, strip: { type: 'photo_strip' }, shopping: { type: 'shopping' }, photo: { type: 'photo' } };
  ok(Object.values(types).every((t) => run('rotatable') && vm.runInContext('rotatable', ctx)(mk(t))), 'notes, checklists, receipts, tickets, postcards, photo strips, shopping lists and photos can turn');
  ok(['zone', 'pile', 'embed', 'audio', 'video'].every((t) => !vm.runInContext('rotatable', ctx)(mk({ type: t }))) && !vm.runInContext('rotatable', ctx)(mk({ hidden: true })) && !vm.runInContext('rotatable', ctx)(null), 'zones, piles, embedded video, recordings and hidden pile members do not turn (and null is safe)');
  const a = mk({ rot: -3.3 }), b = mk({ rot: 2 });
  sb.list = [a, b]; const before = log.changes.length;
  ok(run('rotateBy(list, 3)') === 2 && a.rot === -0.3 && b.rot === 5 && log.changes.length === before + 1 && log.changes[before].ids.length === 2, 'rotating two items is ONE logical undo step, and the angle is the single stored number');
  ok(a.el.style.v === '-0.3deg', 'the new angle is drawn from that same number');
  const c = mk({ rot: 14 }); sb.list = [c]; run('rotateBy(list, 3)'); ok(c.rot === 15, 'turning stops at the range');
  const n0 = log.changes.length; run('rotateBy(list, 3)'); ok(log.changes.length === n0, 'a turn that changes nothing creates no undo entry');
  sb.list = [a, b, c]; const n1 = log.changes.length; run('straighten(list)'); ok(a.rot === 0 && b.rot === 0 && c.rot === 0 && log.changes.length === n1 + 1 && log.changes[n1].label === 'Straighten', 'Straighten puts everything back to 0 as one undo step');
  const d = mk({ rot: 6 }); sb.list = [d]; for (let i = 0; i < 50; i++) vm.runInContext('paintRot', ctx)(d); ok(d.rot === 6, 'drawing again and again never changes the angle (no drift, no second random angle)');
  const p = mk({ rot: 4, pinned: true }); sb.list = [p]; const n2 = log.changes.length; run('rotateBy(list, 3)'); ok(p.rot === 4 && log.changes.length === n2 && log.toasts.some((t) => /Pinned/.test(t)), 'a pinned item does not turn (and says why)');
  const z = mk({ type: 'zone', rot: 0 }); sb.list = [z]; run('rotateBy(list, 3)'); ok(z.rot === 0, 'an unsupported type is ignored safely');
  sb.readOnly = true; sb.list = [d]; ok(run('rotateBy(list, 3)') === 0 && d.rot === 6, 'a read-only view cannot turn anything');
}
ok(/clampNum\(c\.rot, -15, 15, 0\)/.test(fn('cloudSanitize')), 'an angle from the server is accepted anywhere in -15..+15');
ok(/c\.rot = isFinite\(srcRot\) \? clampRot\(srcRot\)/.test(fn('paperCopy')), 'a copy / paste / duplicate keeps the angle of its original');
ok(/"rot"/.test(app.match(/var SERIAL_FIELDS = \[[^\]]*\]/)[0]) && /"rot"/.test(app.match(/var TRACK_FIELDS = \[[^\]]*\]/)[0]), 'the angle is stored, synced and part of undo');
ok(!/rotation|rotHandle|tack/.test(app.match(/var SERIAL_FIELDS = \[[^\]]*\]/)[0]), 'no handle, tack or animation state is stored');
ok(/rotation[^,]*between -360 and 360/.test(read('supabase/migrations/20260930120000_core_schema.sql')), 'the database accepts the whole range (the column allows -360..360)');
{ // Shift snapping inside the drag, the handle only on one selected object, touch size
  const sr = fn('startRotate');
  ok(/ev\.shiftKey \? snapRot\(v\) : clampRot\(v\)/.test(sr) && /recordChange\("Rotate", before\)/.test(sr) && /cur !== start/.test(sr), 'dragging: Shift snaps, one undo step at the end, nothing recorded if it did not move');
  ok(/selected\.size !== 1/.test(fn('syncRotHandle')) && /removeRotHandle\(\);\n/.test(fn('syncRotHandle')) && /isPinned\(n\)/.test(fn('syncRotHandle')), 'the handle exists only on the one selected, unpinned object (nothing extra on a big board)');
  ok(/dblclick/.test(fn('syncRotHandle')) && /straighten\(\[n\]\)/.test(fn('syncRotHandle')) && /ArrowLeft/.test(fn('syncRotHandle')), 'double-click straightens and the focused handle turns with the arrow keys');
  ok(!/notes\.splice|notes\.push|notes\s*=[^=]|\.pileId|delete /.test(fn('syncRotHandle') + fn('startRotate') + fn('removeRotHandle')), 'turning never adds or removes anything from the board (an unmounted handle is not a deletion)');
  ok(/@media \(pointer:coarse\)\{ \.rotHandle\{ width:40px; height:40px;/.test(css), 'touch: the handle is 40px');
  ok(/syncRotHandle\(\)/.test(fn('applySelection')) && /syncRotHandle\(\)/.test(fn('renderNote')), 'the handle follows selection and survives a redraw');
}

// ================================================================ PIN: the tack
{
  const { document } = parseHTML('<html><body></body></html>');
  const timers = []; const mkEl = () => { const e = document.createElement('div'); document.body.appendChild(e); return e; };
  let reduced = false;
  const code = ['decoratePin', 'tackFall'].map(fn).join('\n') + '\nvar TACK_SVG = "<svg></svg>";';
  const ctx = vm.createContext({ document, hashStr: (s) => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }, isPinned: (n) => n.pinned === true, reducedMotion: () => reduced, setTimeout: (f, t) => { timers.push({ f, t }); return timers.length; }, Math, String });
  vm.runInContext(code, ctx);
  const dp = (n, how) => vm.runInContext('decoratePin', ctx)(n, how), fall = (n) => vm.runInContext('tackFall', ctx)(n);
  const n = { id: 'abc', pinned: true, el: mkEl() };
  dp(n); ok(n.el.querySelector('.pinTack') && n.el.classList.contains('pinned') && !n.el.querySelector('.pinTack.drop'), 'a pinned object shows a tack (no animation on a plain redraw / reload / undo)');
  const t1 = n.el.querySelector('.pinTack').getAttribute('style'); dp(n); ok(n.el.querySelector('.pinTack').getAttribute('style') === t1 && n.el.querySelectorAll('.pinTack').length === 1, 'the tack sits in the same place and tilt every time, and never doubles up');
  const n2 = { id: 'zzz', pinned: true, el: mkEl() }; dp(n2); ok(n2.el.querySelector('.pinTack').getAttribute('style') !== t1, 'different objects get different (slightly imperfect) tacks');
  dp(n, 'drop'); ok(n.el.querySelector('.pinTack.drop') && n.el.classList.contains('thud'), 'pinning drops the tack and gives the paper a tiny thud');
  ok(timers.some((t) => t.t >= 300 && t.t <= 700), 'the animation classes are removed again after about half a second');
  timers.forEach((t) => t.f()); ok(!n.el.querySelector('.pinTack.drop') && !n.el.classList.contains('thud'), 'the drop is temporary: afterwards only the settled tack remains');
  reduced = true; const n3 = { id: 'r1', pinned: true, el: mkEl() }; dp(n3, 'drop'); ok(n3.el.querySelector('.pinTack') && !n3.el.querySelector('.pinTack.drop') && !n3.el.classList.contains('thud'), 'reduced motion: the tack just appears');
  reduced = false;
  n.pinned = false; dp(n); ok(!n.el.querySelector('.pinTack') && !n.el.classList.contains('pinned'), 'unpinning removes the tack from the object');
  // the fall: a temporary element on the page, gone afterwards, never a board object
  const n4 = { id: 'f1', pinned: true, el: mkEl() }; dp(n4); n4.el.querySelector('.pinTack').getBoundingClientRect = () => ({ left: 10, top: 20, width: 26, height: 26 });
  const before = document.body.querySelectorAll('.tackFall').length; timers.length = 0; fall(n4);
  ok(document.body.querySelectorAll('.tackFall').length === before + 1 && timers.some((t) => t.t >= 400), 'unpinning lets a temporary copy of the tack fall');
  timers.forEach((t) => t.f()); ok(document.body.querySelectorAll('.tackFall').length === before, 'the falling tack is removed when it has gone (no leftover element)');
  reduced = true; const n5 = { id: 'f2', pinned: true, el: mkEl() }; reduced = false; dp(n5); n5.el.querySelector('.pinTack').getBoundingClientRect = () => ({ left: 1, top: 1, width: 26, height: 26 }); reduced = true;
  const b2 = document.body.querySelectorAll('.tackFall').length; fall(n5); ok(document.body.querySelectorAll('.tackFall').length === b2, 'reduced motion: the tack just disappears (no fall)');
}
{
  const sp = fn('setPinned');
  ok(/decoratePin\(n, "drop"\)/.test(sp) && /tackFall\(n\); delete n\.pinned; decoratePin\(n\)/.test(sp), 'pinning drops, unpinning falls');
  ok(/recordChange\(on \?/.test(sp) && /saveNotes\(\)/.test(sp) && /captureState/.test(sp), 'one undo step per pin / unpin, and the state is saved');
  ok(!/tack|Tack/.test(fn('persistForm') + fn('serializeNote')), 'only pinned / not pinned is stored: no tack position or animation state');
  ok(/pinTug/.test(app) && /\.pinned\{ cursor:default; \}/.test(css), 'a pinned object still cannot be dragged (behaviour unchanged)');
  ok(/@keyframes tackDrop/.test(css) && /@keyframes tackFall/.test(css) && /@keyframes paperThud/.test(css) && /\.pinTack\.drop, \.thud, \.tackFall\{ animation:none !important; \}/.test(css) && /html\[data-a11y-motion="reduce"\] \.tackFall\{ display:none; \}/.test(css), 'the animations exist and both reduced-motion routes switch them off');
  const dur = /\.pinTack\.drop\{ animation:tackDrop \.3s/.test(css); ok(dur, 'the drop takes about 300 ms');
  ok(/body\.dark \.pinTack/.test(css), 'the tack has a dark-mode treatment');
  ok(!/animation[^;]*infinite/.test(css.slice(css.indexOf('Touch the Paper'))), 'no looping animation was added');
}

// ================================================================ MENUS: Paper and Arrange, one level
{
  const { document } = parseHTML('<html><body></body></html>');
  const code = ['makeDiv', 'menuItem', 'placeFlyout', 'menuSub', 'paperSubmenu', 'arrangeSubmenu'].map(fn).join('\n') + '\nvar ROT_STEP = 3;';
  const calls = [];
  const ctx = vm.createContext({ document, window: { innerWidth: 1000, innerHeight: 800 }, ICONS: { fit: '<svg></svg>', rip: '<svg></svg>', sticky: '<svg></svg>', move: '<svg></svg>' }, MOD: 'Ctrl', trimPaper: (n, how) => calls.push('trim:' + how), restorePaper: () => calls.push('restore'), closeFloatingPopovers: () => {},
    rotatable: (n) => n.type !== 'zone', isZone: (n) => n.type === 'zone', isHiddenMember: () => false, layerObjects: (ids, op) => calls.push('layer:' + op), isPinned: (n) => !!n.pinned, rotateBy: (l, d) => calls.push('rot:' + d), straighten: () => calls.push('straighten') });
  vm.runInContext(code, ctx);
  const pop = document.createElement('div'); document.body.appendChild(pop);
  vm.runInContext('paperSubmenu', ctx)(pop, { id: 'a' }); vm.runInContext('arrangeSubmenu', ctx)(pop, { id: 'a' });
  const heads = [...pop.querySelectorAll(':scope > .menuSub > .menuItem')].map((b) => b.textContent.replace('›', '').trim());
  ok(heads.join('|') === 'Paper|Arrange', 'the menu gets one Paper and one Arrange row');
  const inside = (label) => [...[...pop.querySelectorAll('.menuSub')].find((s) => s.querySelector('.menuItem').textContent.indexOf(label) === 0).querySelectorAll('.menuSubBody > .menuItem')].map((b) => b.textContent.trim());
  ok(inside('Paper').join('|') === 'Fit paper to content|Rip off empty paper|Restore full paper', 'Paper holds Fit, Rip off and Restore');
  ok(inside('Arrange').join('|') === 'Rotate left|Rotate right|Straighten|Bring to front|Bring forward|Send backward|Send to back', 'Arrange holds Rotate left / right, Straighten and the four Layer actions');
  ok(pop.querySelectorAll('.menuSubBody .menuSub').length === 0, 'submenus are one level deep, never nested');
  ok([...pop.querySelectorAll(':scope > .menuItem')].length === 0, 'the paper actions are not also top-level rows');
  const head = pop.querySelector('.menuSub > .menuItem'), body = pop.querySelector('.menuSubBody');
  ok(body.hidden && head.getAttribute('aria-expanded') === 'false' && head.getAttribute('aria-haspopup') === 'true', 'a submenu starts closed and says so to assistive technology');
  head.click(); ok(!body.hidden && head.getAttribute('aria-expanded') === 'true', 'activating the row opens it inline');
  const key = (el, k) => { const e = new document.defaultView.Event('keydown', { bubbles: true, cancelable: true }); e.key = k; el.dispatchEvent(e); return e.defaultPrevented; };
  ok(key(head, 'ArrowLeft') && body.hidden, 'ArrowLeft closes it');
  ok(key(head, 'ArrowRight') && !body.hidden, 'ArrowRight opens it');
  const restore = [...body.querySelectorAll('.menuItem')].find((b) => /Restore/.test(b.textContent)); ok(restore.disabled === true, 'Restore full paper is disabled while nothing has been trimmed');
  const arr = [...pop.querySelectorAll('.menuSub')][1]; arr.querySelector('.menuItem').click(); const aBody = [...document.querySelectorAll('.menuSubBody')].find((b) => b.getAttribute('aria-label') === 'Arrange'); ok(document.querySelector('.menuSubBody') && [...document.querySelectorAll('.menuSubBody')].filter((b) => !b.hidden).length === 1, 'opening Arrange closes Paper: only one submenu is open at a time'); ok(aBody.parentNode === document.body, 'an opened flyout lives on the page, so the scrolling menu cannot clip it'); [...aBody.querySelectorAll('.menuItem')][1].click(); [...aBody.querySelectorAll('.menuItem')][2].click();
  ok(calls.includes('rot:3') && calls.includes('straighten'), 'Arrange actions work without a pointer drag (rotate right, straighten)');
  const pinnedPop = document.createElement('div'); document.body.appendChild(pinnedPop); vm.runInContext('arrangeSubmenu', ctx)(pinnedPop, { id: 'p', pinned: true });
  ok([...pinnedPop.querySelectorAll('.menuSubBody .menuItem')].slice(0, 3).every((b) => b.classList.contains('disabled')) && ![...pinnedPop.querySelectorAll('.menuSubBody .menuItem')].slice(3).some((b) => b.classList.contains('disabled')), 'a pinned item shows the turning actions as unavailable (layering still works: it moves nothing)');
  const zonePop = document.createElement('div'); document.body.appendChild(zonePop); vm.runInContext('arrangeSubmenu', ctx)(zonePop, { id: 'z', type: 'zone' });
  ok(zonePop.children.length === 0, 'an object that cannot turn gets no Arrange row');
  const sp = document.createElement('div'); document.body.appendChild(sp); vm.runInContext('paperSubmenu', ctx)(sp, { id: 's', cosmetic: 'soup' }); ok(sp.children.length === 0, 'Alphabet Soup keeps its own rules: no Paper submenu');
}
{
  const nm = fn('openNoteMenu');
  ok(/paperSubmenu\(pop, n\)/.test(nm) && !/"Fit paper to content"/.test(nm) && !/"Rip off empty paper"/.test(nm) && !/"Restore full paper"/.test(nm), 'the note menu has Paper, and no separate Fit / Rip / Restore rows');
  ok(/pinAndArrange\(pop, n\)/.test(nm), 'the note menu has Arrange next to Pin');
  ok(['openPhotoMenu', 'paperMenu', 'shoppingMenu'].every((f) => /pinAndArrange\(pop, n\)/.test(fn(f))), 'photos, paper objects and shopping lists get Arrange too');
  ok(/button\.menuItem"\)\)\.filter\(function\(b\)\{ return !b\.closest\("\[hidden\]"\) && !b\.disabled; \}\)/.test(fn('menuNav')), 'arrow-key navigation skips items inside a closed submenu');
  ok(/\.menuSubBody\[hidden\]\{ display:none; \}/.test(css), 'a closed submenu takes no space (and no touch area)');
ok(/\.menuSubBody\{ position:fixed;/.test(css) && /left = Math\.max\(8, h\.left - w - gap\)/.test(fn('placeFlyout')) && /h\.right \+ gap/.test(fn('placeFlyout')), 'a submenu opens as a flyout to the right of its row (to the left only when there is no room)');
}

// ================================================================ DELETE: one destructive language
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const x = lum(hex(a)), y = lum(hex(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
ok(/\.del:hover, \.del:focus-visible\{ background:var\(--destructive-soft\); color:var\(--destructive\)/.test(css) && /\.del:active\{ background:var\(--destructive-press\)/.test(css), 'the note X turns red on hover and focus, stronger when pressed');
ok(/@media \(hover:none\)\{ \.del:active\{/.test(css), 'touch: a pressed state exists without hover');
ok(!/\.note:hover\{[^}]*(--destructive|background:var\(--destructive)/.test(css) && !/\.note[^{]*\{[^}]*--destructive/.test(css.slice(css.indexOf('Touch the Paper')).replace(/\.del[^{]*\{[^}]*\}/g, '')), 'only the X changes colour: the note itself never turns red');
ok(/\.menuItem\.danger:hover, \.menuItem\.danger:focus-visible\{ background:var\(--destructive-soft\); color:var\(--destructive\)/.test(css) && /\.menuItem\.danger:active/.test(css), 'Delete in menus uses the same language (hover, focus, pressed)');
ok(/:root\{ --destructive:#b3261e/.test(css) && /body\.dark\{ --destructive:#ff8a80/.test(css), 'light and dark destructive colours are central tokens');
ok(ratio('#b3261e', '#fffdf5') >= 4.5 && ratio('#ff8a80', '#1e1a30') >= 4.5, 'destructive text is readable on the light and dark panels (' + ratio('#b3261e', '#fffdf5').toFixed(1) + ' / ' + ratio('#ff8a80', '#1e1a30').toFixed(1) + ')');
ok(/\.pillBtn\.primary:not\(:disabled\):hover/.test(css) && /v0\.8\.2\.1: button states/.test(css), 'the 0.8.2.1 button-contrast tokens are still in place');

// ================================================================ LEGAL & policies icons and the Language row
{
  const { document } = parseHTML('<html><body></body></html>');
  const code = app.slice(app.indexOf('var SCRAP = '), app.indexOf('  var LEGAL_ABOUT = ['));
  const ctx = vm.createContext({ document, window: { Stick: { lang: { iconSvg: (n) => '<svg class="langIcon" width="' + n + '"></svg>' } } }, Stick: { lang: { iconSvg: (n) => '<svg class="langIcon" width="' + n + '"></svg>' } } });
  vm.runInContext(code, ctx);
  const keys = ['whatsNew', 'language', 'privacy', 'terms', 'young', 'storage', 'accessibility', 'copyright'];
  const el = vm.runInContext('legalIconEl', ctx);
  ok(keys.every((k) => { const e = el(k); return e && e.className === 'ccIco' && e.querySelector('svg') && e.getAttribute('aria-hidden') === 'true'; }), 'all eight Legal & policies rows get an icon (What’s New, Language, Privacy, Terms, Young people, Storage, Accessibility, Copyright)');
  ok(keys.filter((k) => k !== 'language').every((k) => { const s = el(k).innerHTML; return /viewBox="0 0 24 24"/.test(s) && /stroke-width="1\.7"/.test(s) && /stroke="currentColor"/.test(s) && !/#[0-9a-f]{3,6}"/i.test(s) && s.length < 900; }), 'one family: 24px, the same stroke, currentColor (light and dark safe), lightweight, no emoji and no fixed colours');
  ok(el('nope') === null, 'an unknown row gets no icon (never a broken one)');
  const mapped = ['privacy.html', 'terms.html', 'young-people.html', 'storage.html', 'accessibility.html', 'copyright.html'].map((f) => 'legal/' + f);
  ok(mapped.every((m) => app.includes('"' + m + '": "'), 'every document row has an icon mapping') || mapped.every((m) => app.includes('"' + m + '"')), 'every document row has an icon mapping');
}
ok(/\.asAction\.hasIco\{ justify-content:flex-start; gap:12px; \}/.test(css) && /\.asAction\.hasIco \.lbl\{ flex:1 1 auto; text-align:start; \}/.test(css) && /\.asAction\.hasIco \.go\{ margin-inline-start:auto; \}/.test(css), 'the Language icon (and every row icon) sits next to its words with a 12px gap, using logical properties so right-to-left works');
ok(/\.ccIco\{ flex:none; width:26px; height:26px;/.test(css) && /classList\.add\("hasIco"\)/.test(app), 'every icon uses the same 26px slot');
ok(!/\.ccLangIco/.test(css.slice(css.indexOf('Touch the Paper')).replace(/#ccLang \.ccLangIco\{ display:none; \}/, '')), 'the old Language spacing rule is gone');

// ================================================================ VIDEO links that already exist
{
  const ctx = vm.createContext({ URL, Math, Number, String, isFinite, Object });
  vm.runInContext('var window = globalThis; Stick = {};', ctx); vm.runInContext(read('js/embed.js'), ctx);
  const E = ctx.Stick.embed, id = 'dQw4w9WgXcQ';
  const lc = fn('showLinkCard');
  ok(/Stick\.embed\.parse\(href\)/.test(lc) && /if\(vInfo\) lcAct\("Play in Stick-It"/.test(lc), 'the Play action is offered only when the address is a supported video link');
  ok(E.parse('https://example.com/page') === null && E.parse('https://www.youtube.com/watch?v=' + id) !== null && E.parse('https://vimeo.com/76979871') !== null, 'a normal address gets no video action; YouTube and Vimeo do');
  ok(/lcAct\("Open"/.test(lc) && /lcAct\("Copy link"/.test(lc), 'every link can be opened or copied from its card');
  ok(/a\.closest\("\.note"\)/.test(lc) && /!readOnly/.test(lc), 'the video action is only offered on an editable note, never in a read-only view');
  ok(E.parse('https://evil.example/watch?v=' + id) === null && E.parse('javascript:alert(1)') === null && E.parse('https://youtube.com.evil.example/watch?v=' + id) === null, 'an unsafe address cannot become a video');
  const cv = fn('convertLinkToVideo');
  ok(/linkToEmbed\(n, info\)/.test(cv) && /createEmbedAt\(info,/.test(cv) && /endEditing\(\)/.test(cv), 'a note that is only the link becomes the video; otherwise the video is added beside the note and the note keeps its words and link');
  ok(/info\.source/.test(fn('createEmbedAt')) && /info\.source/.test(fn('linkToEmbed')), 'the original address is kept on the video object');
  ok(/convertLinkToVideo/.test(app) && /pointerType/.test(app.slice(app.indexOf('var lastPointerKind'), app.indexOf('var lastPointerKind') + 400)) && /showLinkCard\(a\)/.test(app.slice(app.indexOf('var lastPointerKind'), app.indexOf('var lastPointerKind') + 700)), 'touch: tapping a link shows the same actions (no hover needed)');
  ok(/@media \(pointer:coarse\)\{ \.lcBtn\{ min-height:44px/.test(css), 'touch: the link actions are 44px high');
  ok(/Convert back to a link/.test(fn('embedMenu')) && /Copy link/.test(fn('embedMenu')) && /Open the original link/.test(fn('embedMenu')), 'an embedded video offers: Convert back to a link, Open the original, Copy link');
  ok(/removeNoteEl\(old, false\)/.test(fn('swapObject')) && /recordChange\(label, before, \{newIds: \[fresh\.id\]\}\)/.test(fn('swapObject')), 'link to video and video to link are each ONE undo step');
  ok(/embedObserver\.unobserve\(elRef\)/.test(fn('removeNoteEl')) && /sandbox/.test(fn('embedPlay')) && /f\.src = info\.embedUrl \+ "&autoplay=1"/.test(fn('embedPlay')), 'the security model is unchanged: built embed address, sandbox, player released when the object goes');
  ok(/\.embedObj::before\{/.test(css) && /body\.dark \.embedObj\{/.test(css) && /\.embedObj \.embFoot\{[^}]*opacity:0\.75/.test(css), 'the embedded video is a taped card with a quiet source line, in light and dark');
  ok(!/\.embedObj[^{]*\{[^}]*animation[^}]*infinite/.test(css), 'the embed card adds no looping animation');
}

// ================================================================ a group selection never leaves a text cursor behind (P pins the group, it does not type "p")
ok(/if\(selected\.size > 1\) dropTextFocus\(\);/.test(fn('applySelection')) && /ae\.blur\(\)/.test(fn('dropTextFocus')) && /removeAllRanges/.test(fn('dropTextFocus')), 'selecting several things blurs any note text and clears the text selection');
ok(/selected\.size < 2 \|\| e\.ctrlKey \|\| e\.metaKey \|\| e\.altKey \|\| e\.key\.length !== 1/.test(app) && /t\.isContentEditable && t\.closest && t\.closest\("\.note, \.paperObj"\)\)\{ t\.blur\(\)/.test(app), 'with a group selected, a typed key is never typed into a note: the note is blurred first so the shortcut acts on the group');
ok(/box\.remove\(\);\s+document\.body\.style\.userSelect = "";\s+if\(selected\.size > 1\) dropTextFocus/.test(app), 'the drag box also clears it when it ends');

// ================================================================ patch data
const pn = JSON.parse(read('docs/patch-notes/patch-notes.json'));
const pn2 = pn.find((x) => x.version === '0.8.2.2');
ok(pn2 && pn2.codename === 'Touch the Paper' && pn2.status === 'development' && pn2.date === null && pn2.title === 'Stick-It v0.8.2.2 — Touch the Paper', 'v0.8.2.2 "Touch the Paper" is recorded and not released');
ok(/APP_STATUS: "development"/.test(read('js/config.js')) && /APP_VERSION: "0\.8\.\d(?:\.\d)?"/.test(read('js/config.js')), 'the app is still in development');
ok(JSON.parse(read('docs/patch-notes/index.json')).find((x) => x.version === '0.8.2.2').file === '0.8.2.2.md' && fs.existsSync(path.join(root, 'docs/patch-notes/0.8.2.2.md')), 'patch notes and the index are in step');
ok(pn2.tour.length === 5 && ['Pin it for real', 'Turn things a little sideways', 'Links can become videos', 'Cleaner menus'].every((t) => pn2.tour.some((s) => s.title === t)), 'the Spotlight has the four cards');
const pd = read('js/patch-data.js'); ok(/"version": "0\.8\.\d(?:\.\d)?"/.test(pd) && !/Room to Breathe/.test(pd), 'the shipped Spotlight data has no stale 0.8.2.1 content');
const md = read('docs/patch-notes/0.8.2.2.md'); ok(['## Pinning finally looks like pinning', '## Give things a little tilt', '## Video links become useful after paste', '## Paper controls got their own home', '## Delete looks like delete', '## Cleaner object menus', '## More Stick-It in Settings', '## Embedded video polish', '## Small tactile touches'].every((h) => md.includes(h)), 'the patch note follows the agreed structure');

console.log('v0.8.2.2: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
