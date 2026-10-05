// Piles and vertical stacks (phase 1): the pure rules, plus guards on the app code that keeps them safe.
//   node pile.test.mjs
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
const fn = (name) => { const i = app.indexOf('function ' + name + '('); if (i < 0) return ''; let d = 0, j = app.indexOf('{', i); const start = i; for (; j < app.length; j++) { if (app[j] === '{') d++; else if (app[j] === '}') { d--; if (!d) break; } } return app.slice(start, j + 1); };

const ctx = vm.createContext({ console, Math, Date, Object, Array, Number, String, isFinite });
vm.runInContext('var window = globalThis; Stick = {};', ctx);
vm.runInContext(read('js/pile.js'), ctx);
const P = ctx.Stick.pile;

// ---------------------------------------------------------------- eligibility
ok(P.eligible({ id: 'a', html: 'x' }) && P.eligible({ id: 'b', type: 'receipt' }) && P.eligible({ id: 'c', type: 'ticket' }), 'notes, receipts and tickets can be piled');
ok(!P.eligible({ id: 'a', type: 'photo' }) && !P.eligible({ id: 'a', type: 'zone' }) && !P.eligible({ id: 'a', type: 'audio' }) && !P.eligible({ id: 'a', type: 'shopping' }), 'photos, zones, recordings and shopping lists are not piled in phase 1');
ok(!P.eligible({ id: 'a', type: 'pile' }), 'no nested piles');
ok(!P.eligible({ id: 'a', pinned: true }) && !P.eligible({ id: 'a', doneAt: 5 }) && !P.eligible(null), 'pinned, Done and missing things are not piled');

// ---------------------------------------------------------------- normalize
const n = P.normalize({ type: 'pile', members: ['a', 'b', 'a', '', 'bad id!', 7, 'c'], w: 9999, x: 40, y: 60 });
ok(JSON.stringify(n.members) === JSON.stringify(['a', 'b', '7', 'c']) && n.w === 260 && n.ox === 40 && n.oy === 60, 'normalize keeps unique valid ids in order, clamps the width, and falls back to the position for the origin');
ok(P.normalize({ type: 'note' }) === null && P.normalize({ type: 'pile', members: 'nope' }).members.length === 0, 'normalize only accepts piles and survives junk');
ok(P.normalize({ type: 'pile', members: Array.from({ length: 900 }, (_, i) => 'm' + i) }).members.length === P.MAX_MEMBERS, 'a pile holds at most the member limit');

// ---------------------------------------------------------------- what is hidden, what is counted
const board = [
  { id: 'p', type: 'pile', members: ['a', 'b', 'c'] },
  { id: 'a', pileId: 'p' }, { id: 'b', pileId: 'p' }, { id: 'c', pileId: 'p' }, { id: 'free' },
];
const find = (id) => board.find((o) => o.id === id) || null;
ok(['a', 'b', 'c'].every((id) => P.isHidden(find(id), find)) && !P.isHidden(find('free'), find), 'members of a live pile are hidden, free notes are not');
ok(P.logicalCount(board) === 4, 'the pile counts as nothing and each member as one: a board of 4 notes stays 4 however it is piled');
const c = P.counts(board, find);
ok(c.logical === 4 && c.piles === 1 && c.collapsedMembers === 3 && c.rendered === 2, 'diagnostics: logical 4, collapsed 3, rendered 2 (the pile and the free note)');

// damaged or half-arrived references never hide a note
ok(!P.isHidden({ id: 'a', pileId: 'gone' }, find), 'a member whose pile is missing stays visible');
ok(!P.isHidden({ id: 'z', pileId: 'p' }, find), 'a note the pile does not list stays visible');
const small = [{ id: 'q', type: 'pile', members: ['x', 'y'] }, { id: 'x', pileId: 'q' }];
const findS = (id) => small.find((o) => o.id === id) || null;
ok(!P.isHidden(findS('x'), findS), 'a pile with only one live member hides nothing (it behaves as if it did not exist)');
ok(!P.isHidden({ id: 'a', pileId: 'a' }, (id) => (id === 'a' ? { id: 'a', type: 'note' } : null)), 'a member pointing at a non-pile stays visible');

// ---------------------------------------------------------------- ordering
const z = P.order([{ id: 'l', z: 1 }, { id: 'h', z: 9 }, { id: 'm', z: 5 }]).map((o) => o.id).join('');
ok(z === 'hml', 'the highest paper is the top of the pile');
ok(P.sendTopToBack(['a', 'b', 'c']).join('') === 'bca' && P.sendTopToBack(['a']).join('') === 'a', 'send to back moves the top to the bottom, order of the rest kept');
ok(P.removeMember(['a', 'b', 'c'], 'b').join('') === 'ac', 'removing a member leaves the others in order');
const seq = [0.1, 0.9, 0.5, 0.2, 0.7]; let k = 0;
ok(P.shuffle(['a', 'b', 'c', 'd'], () => seq[k++ % seq.length]).slice().sort().join('') === 'abcd', 'shuffling never loses or repeats a member');

// ---------------------------------------------------------------- the vertical stack
const lay = P.stackLayout([{ id: 'c', x: 300, y: 300 }, { id: 'a', x: 50, y: 40 }, { id: 'b', x: 80, y: 120 }], 28);
ok(lay.map((l) => l.id).join('') === 'abc' && lay[1].y - lay[0].y === 28 && lay[2].y - lay[1].y === 28, 'a stack goes in reading order, each one step below the last');
ok(lay.every((l) => Math.abs(l.x - lay[0].x) <= 4), 'a stack stays in one column (a hair of sway only)');
for (const size of [10, 50, 100, 250]) {
  const items = Array.from({ length: size }, (_, i) => ({ id: 'n' + i, x: (i * 37) % 900, y: (i * 53) % 500 }));
  const t = Date.now(), out = P.stackLayout(items, 28), ms = Date.now() - t;
  ok(out.length === size && new Set(out.map((o) => o.id)).size === size && ms < 50, 'stack layout of ' + size + ' notes is complete and instant (' + ms + ' ms)');
}

// ---------------------------------------------------------------- unpile
ok(JSON.stringify(P.unpileShift({ x: 140, y: 90, ox: 100, oy: 100 })) === JSON.stringify({ dx: 40, dy: -10 }), 'unpile puts the papers back shifted by however far the pile was dragged');

// ---------------------------------------------------------------- the app code that keeps it safe
const sync = fn('syncPileVisibility'), hidden = fn('rebuildHidden');
ok(sync && !/notes\.splice|notes\s*=[^=]|notes\.length\s*=|notes\.push/.test(sync + hidden), 'drawing or hiding collapsed members never adds or removes anything from the board\'s object list');
ok(/n\.el\s*=\s*null/.test(sync) && /try\{ n\.el\.remove\(\); \}/.test(sync), 'hiding a member only removes its drawing');
const mk = fn('makePile');
ok(mk && !/notes\.splice/.test(mk) && /m\.pileId\s*=\s*pile\.id/.test(mk) && /notes\.push\(pile\)/.test(mk), 'collapsing adds the pile and marks members; it removes nothing');
const del = fn('deleteNotes');
ok(/!opts\.force && list\.some\(isPileObj\)/.test(del) && /unpilePile/.test(del), 'deleting a pile unpiles it unless the separate confirmed action forced it');
ok(/deleteNotes\(ids\.concat\(\[pile\.id\]\), \{force: true\}\)/.test(fn('deletePileAndContents')) && /confirmDialog/.test(fn('deletePileAndContents')), '"Delete pile and contents" is its own confirmed action');
ok(/function noteHasContent[\s\S]{0,200}"pile"/.test(app), 'a pile is never "empty", so blank-note cleanup can not remove it');
ok(/if\(hiddenIds\[n\.id\]\) return null;/.test(fn('renderNote')), 'hidden members are skipped when drawing');
ok(/!hiddenIds\[id\]/.test(fn('setSelection')), 'a hidden member can not be selected');
ok(/if\(item\.type === "pile"\) return null;/.test(fn('normalizeIncoming')) && /delete item\.pileId/.test(fn('normalizeIncoming')), 'a pile is never imported or pasted, and a stray pile id never survives an import');
ok(/c\.type === "pile"/.test(fn('cloudSanitize')) && /sp\.pileId/.test(fn('cloudSanitize')), 'piles and members survive sanitising from the server');
ok(/pileRelease\(o\.id, false\)/.test(app), 'a member finished on another device leaves its pile');
ok(/\.filter\(function\(n\)\{ return n && !isPileObj\(n\); \}\)/.test(fn('duplicateNow')), 'a pile is not duplicated in phase 1');
ok(/isPileObj\)\)\{ toast\("Open the pile first/.test(fn('moveNotesToBoard')), 'a pile is not moved to another board in phase 1');
ok(/"pileId","members","ox","oy","edges"/.test(app.match(/var SERIAL_FIELDS = \[[^\]]*\]/)[0]), 'pile fields are stored and synced');
ok(/"pileId","members","ox","oy","edges"/.test(app.match(/var TRACK_FIELDS = \[[^\]]*\]/)[0]), 'pile fields are part of undo');
ok(/logicalCount\(\)/.test(fn('checkBoardSize')), 'the board-size warnings count a pile as its members');
ok(/syncPileVisibility\(\);/.test(fn('afterHistoryApply')), 'undo and redo redraw piles');

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
