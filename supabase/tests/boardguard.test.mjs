// Board-size safeguards: the burst limiter, the size levels, the projected-size check, and the way duplicate and paste use them.
// The app's own guardedMultiply / duplicateNotes / pasteNotes text is lifted out of js/app.js and run against stubs, so what is tested is what ships.
//   node boardguard.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');
const app = read('js/app.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };

// ---------------------------------------------------------------- the pure rules
const gctx = vm.createContext({ console, Math, Date, Object, Array, Number });
vm.runInContext('var window = globalThis; Stick = {};', gctx);
vm.runInContext(read('js/boardguard.js'), gctx);
const G = gctx.Stick.guard;

ok(G.level(0) === 0 && G.level(499) === 0 && G.level(500) === 1 && G.level(749) === 1 && G.level(750) === 2 && G.level(999) === 2 && G.level(1000) === 3 && G.level(2000) === 3, 'size levels switch at 500, 750 and 1000 active objects');
ok(G.levelMessage(0, 10) === '' && /large board/i.test(G.levelMessage(1, 520)) && /very heavy/.test(G.levelMessage(2, 800)) && /1000/.test(G.levelMessage(3, 1000)), 'each level has its own message, and a comfortable board has none');
ok(!G.needsConfirm(100, 150) && !G.needsConfirm(900, 24) && G.needsConfirm(900, 150) && G.needsConfirm(1000, 25) && G.needsConfirm(1200, 40) && !G.needsConfirm(1200, 3), 'only a bulk operation that takes the board to 1000 or more needs a confirmation');
ok(/150 objects/.test(G.confirmText(900, 150)) && /900/.test(G.confirmText(900, 150)) && /1050/.test(G.confirmText(900, 150)), 'the confirmation says how many will be added and the resulting size');
ok(G.LEVELS.huge === 1000 && G.BULK_MIN === 25, 'the thresholds are the agreed ones');
ok(!/premium|plan\b/i.test(read('js/boardguard.js').replace(/tied to a plan|not a feature to sell/g, '')), 'the safeguards are not tied to any plan');

// the limiter on its own
{
  const L = G.createLimiter({ burst: 15, windowMs: 5000, spacingMs: 600 });
  let t = 1000, quick = 0;
  for (let i = 0; i < 15; i++) { if (!L.reserve(t + i * 20).queued) quick++; }
  ok(quick === 15, 'a burst of 15 quick actions runs immediately');
  const sixteenth = L.reserve(t + 15 * 20);
  ok(sixteenth.queued && sixteenth.delay > 0, 'the 16th quick action is slowed');
  const next = L.reserve(t + 16 * 20);
  ok(next.at >= sixteenth.at + 600, 'sustained actions are spaced out');
  const L2 = G.createLimiter({ burst: 15, windowMs: 5000, spacingMs: 600 });
  for (let i = 0; i < 40; i++) L2.reserve(1000 + i * 10);
  const later = L2.reserve(1000 + 40 * 10 + 60000);
  ok(!later.queued, 'after a pause the limiter forgets the burst');
  const L3 = G.createLimiter({ burst: 15, windowMs: 5000, spacingMs: 600 });
  let normal = 0; for (let i = 0; i < 10; i++) if (!L3.reserve(1000 + i * 1500).queued) normal++;
  ok(normal === 10, 'steady, ordinary use (one every 1.5 s) is never slowed');
  const L4 = G.createLimiter({});
  const times = []; for (let i = 0; i < 60; i++) times.push(L4.reserve(5000 + i).at);
  ok(times.every((x, i) => i === 0 || x >= times[i - 1]), 'run times never go backwards, so order is kept');
}

// ---------------------------------------------------------------- the real duplicate / paste code, on stubs
function build() {
  const a = app.indexOf('  var multiplyLimiter = '), b = app.indexOf('  var CLIP_KEY = ');
  const dup = app.slice(a, b);
  const c = app.indexOf('  function pasteNotes(data){'), d = app.indexOf('  // Pasting on the board (not while typing)');
  const paste = app.slice(c, d);
  let now = 100000, idSeq = 0, timers = [], toasts = [], confirmAnswers = [], confirms = [], inserted = [];
  const sb = {
    console, Math, Object, Array, Promise, Number, JSON,
    Stick: gctx.Stick, window: { Stick: gctx.Stick },
    Date: { now: () => now },
    setTimeout: (fn, ms) => { timers.push({ at: now + ms, fn }); return timers.length; },
    toast: (m) => toasts.push(m),
    confirmDialog: (o) => { confirms.push(o); return Promise.resolve(confirmAnswers.length ? confirmAnswers.shift() : true); },
    readOnly: false,
    notes: [],
    findNote: (id) => sb.notes.find((n) => n.id === id) || null,
    serializeNote: (n) => ({ ...n }),
    paperCopy: (src) => ({ ...src, id: 'copy' + (++idSeq) }),
    insertNotes: (list, label) => { list.forEach((n) => { sb.notes.push(n); inserted.push(n); }); sb.labels.push(label); },
    labels: [], pasteSeq: 0, lastPasteTs: 0,
    activeBoardId: 'b1', centerGroup: () => {}, viewCenter: () => ({ x: 0, y: 0 }),
  };
  const ctx = vm.createContext(sb);
  vm.runInContext('var pasteSeq = 0, lastPasteTs = 0, activeBoardId = "b1";' + dup + paste, ctx);
  const api = {
    sb, ctx, toasts, timers, confirms, inserted, confirmAnswers,
    advance(ms) { now += ms; const due = timers.filter((t) => t.at <= now).sort((x, y) => x.at - y.at); timers = timers.filter((t) => t.at > now); due.forEach((t) => t.fn()); api.timers = timers; },
    setNow(t) { now = t; }, tick(ms) { now += ms; },
    dup: (ids) => vm.runInContext('duplicateNotes(' + JSON.stringify(ids) + ')', ctx),
    paste: (data) => { sb.__d = data; vm.runInContext('pasteNotes(__d)', ctx); },
    seed(n) { for (let i = 0; i < n; i++) sb.notes.push({ id: 'n' + i, x: 0, y: 0, html: 'note ' + i }); },
    pendingTimers: () => timers.length,
  };
  Object.defineProperty(api, 'timers', { get: () => timers, set: (v) => { timers = v; } });
  return api;
}
const flush = () => new Promise((r) => setImmediate(r));

{ // a single ordinary duplicate is unaffected
  const t = build(); t.seed(5); t.dup(['n0']);
  ok(t.inserted.length === 1 && t.toasts.length === 0 && t.confirms.length === 0 && t.pendingTimers() === 0, 'one ordinary duplicate runs at once, with no message and no question');
  ok(t.sb.labels[0] === 'Duplicate note', 'its history label is unchanged');
}
{ // an ordinary batch is unaffected
  const t = build(); t.seed(30); t.dup(Array.from({ length: 12 }, (_, i) => 'n' + i));
  ok(t.inserted.length === 12 && t.sb.labels[0] === 'Duplicate 12 notes' && t.pendingTimers() === 0, 'duplicating a selection of 12 is one whole batch, run at once');
}
{ // a short burst is allowed
  const t = build(); t.seed(3);
  for (let i = 0; i < 15; i++) { t.dup(['n0']); t.tick(30); }
  ok(t.inserted.length === 15 && t.toasts.length === 0 && t.pendingTimers() === 0, 'a burst of 15 rapid duplicates is allowed in full, silently');
}
{ // sustained spam is slowed, never dropped, and says so once
  const t = build(); t.seed(3);
  for (let i = 0; i < 60; i++) { t.dup(['n0']); t.tick(25); }
  ok(t.inserted.length === 15 && t.pendingTimers() === 45, 'after the burst, the rest are queued (45 waiting), not run and not lost');
  ok(t.toasts.length === 1 && /slowing this down to protect performance/.test(t.toasts[0]), 'one calm message explains the slowdown');
  for (let i = 0; i < 80; i++) t.advance(600);
  ok(t.inserted.length === 60 && t.pendingTimers() === 0, 'every one of the 60 duplicates eventually happens: nothing is silently dropped');
  const ids = t.inserted.map((n) => n.id);
  ok(new Set(ids).size === 60, 'every duplicate has its own unique id');
  ok(t.sb.labels.length === 60 && t.sb.labels.every((l) => l === 'Duplicate note'), 'each one is its own history step (so Undo works one at a time)');
}
{ // a batch is never split by the limiter
  const t = build(); t.seed(20);
  for (let i = 0; i < 16; i++) t.dup(['n0']);
  const before = t.inserted.length;
  t.dup(Array.from({ length: 10 }, (_, i) => 'n' + i));
  ok(t.inserted.length === before && t.pendingTimers() === 2, 'a batch that arrives during a burst is queued as ONE whole batch');
  for (let i = 0; i < 10; i++) t.advance(600);
  const last = t.sb.labels[t.sb.labels.length - 1];
  ok(last === 'Duplicate 10 notes' && t.inserted.length === before + 11, 'when it runs it creates all 10 together, never a partial batch');
}
{ // a note deleted while its duplicate waits is skipped without harm
  const t = build(); t.seed(3);
  for (let i = 0; i < 16; i++) t.dup(['n0']);
  t.sb.notes = t.sb.notes.filter((n) => n.id !== 'n0');
  for (let i = 0; i < 3; i++) t.advance(600);
  ok(t.inserted.length === 15, 'a queued duplicate of a note that has since been deleted does nothing (no error, no ghost)');
}
{ // paste shares the guard
  const t = build(); t.seed(1);
  const data = { ts: 1, board: 'b1', notes: [{ id: 'n0', html: 'x' }] };
  for (let i = 0; i < 30; i++) { data.ts = i; t.paste(data); t.tick(20); }
  ok(t.inserted.length === 15 && t.pendingTimers() === 15 && t.toasts.length === 1, 'repeated pasting is throttled the same way');
  for (let i = 0; i < 40; i++) t.advance(600);
  ok(t.inserted.length === 30, 'and every paste still happens');
}
{ // projected size: confirm before a bulk operation at the top of the range
  const t = build(); t.seed(900); t.confirmAnswers.push(false);
  t.dup(Array.from({ length: 150 }, (_, i) => 'n' + i));
  await flush();
  ok(t.confirms.length === 1 && /150 objects/.test(t.confirms[0].body) && /1050/.test(t.confirms[0].body), 'duplicating 150 objects on a board of 900 asks first, with the numbers');
  ok(t.inserted.length === 0, 'cancelling creates nothing at all');
  t.confirmAnswers.push(true);
  t.dup(Array.from({ length: 150 }, (_, i) => 'n' + i));
  await flush();
  ok(t.inserted.length === 150, 'confirming creates the whole batch');
}
{ // ordinary work on a big board is never blocked
  const t = build(); t.seed(1100); t.dup(['n0']);
  ok(t.inserted.length === 1 && t.confirms.length === 0, 'a single duplicate on a board of 1100 is not blocked or questioned');
  t.paste({ ts: 5, board: 'b1', notes: [{ id: 'n0' }, { id: 'n1' }, { id: 'n2' }] });
  ok(t.inserted.length === 4 && t.confirms.length === 0, 'a small paste on a big board is not questioned either');
}
{ // read-only views never multiply
  const t = build(); t.seed(2); t.sb.readOnly = true; t.dup(['n0']);
  ok(t.inserted.length === 0, 'a read-only view cannot duplicate');
}

// ---------------------------------------------------------------- wiring in the app
ok(/<script src="js\/boardguard\.js">/.test(read('index.html')), 'boardguard.js is loaded by the app');
ok(app.includes('guardedMultiply(src.length, function(){ duplicateNow(ids); })') && app.includes('guardedMultiply(data.notes.length, function(){ pasteNow(data); })'), 'duplicate and paste both go through the guard (so Ctrl/Cmd+D spam, the menu and paste loops are covered)');
ok(app.includes('if(typeof checkBoardSize === "function") checkBoardSize();') && app.includes('var lvl = G.level(notes.length);'), 'size warnings count active board objects (the notes list, not the Done pile)');
ok(!/G\.level\(donePile/.test(app) && !/notes\.concat\(donePile\)\.length[^;]*level/.test(app), 'the Done pile is not counted toward the warnings');
ok(/Very large board|very large board/.test(app) && app.includes('Stick.guard.LEVELS.huge'), 'importing a huge board says so before replacing');
ok(app.includes('Stick.dev.perf = function()') && app.includes('Stick.dev.stress = function(count)') && app.includes('if(CLOUD) return "Stress test is only for guest boards'), 'dev-only diagnostics exist, and the stress helper refuses signed-in boards');
ok(!/premium/i.test(app.slice(app.indexOf('var multiplyLimiter'), app.indexOf('var CLIP_KEY'))), 'the guard has nothing to do with Premium');

console.log(`board guard: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
