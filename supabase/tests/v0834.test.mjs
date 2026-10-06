// v0.8.3.3 Print / Save as PDF: layout planning (pure), and the real printObjects code run against a DOM with the app's helpers stubbed.
import '../../js/print-layout.js';
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url'; import { parseHTML } from 'linkedom';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const app = read('js/app.js'), css = read('css/print.css');
function fn(name) { const i = app.search(new RegExp('(async )?function ' + name + '\\(')); if (i < 0) return ''; let d = 0, j = app.indexOf('{', i); for (let k = j; k < app.length; k++) { if (app[k] === '{') d++; else if (app[k] === '}') { d--; if (!d) return app.slice(i, k + 1); } } return ''; }
const P = globalThis.Stick.printLayout;

// ---------------------------------------------------------------- layout planning
{
  let p = P.plan([{ x: 50, y: 50, w: 220, h: 200, rot: 0 }]);
  ok(p.mode === 'single' && p.scale > 1 && p.scale <= P.MAX_UP, 'a lone small note is enlarged to be readable, never past the cap');
  p = P.plan([{ x: 0, y: 0, w: 220, h: 2600, rot: 0 }]); ok(p.mode === 'single' && p.scale <= 1 && p.spans === true, 'a very tall single object is not blown up and may span pages');
  p = P.plan([{ x: 10, y: 10, w: 200, h: 200, rot: 0 }, { x: 260, y: 40, w: 200, h: 180, rot: 3 }, { x: 120, y: 300, w: 220, h: 150, rot: -2 }]);
  ok(p.mode === 'spatial' && p.boxes.length === 3 && p.width <= P.PAGE.w + 1 && p.height <= P.PAGE.h + 1, 'a few objects close together keep their arrangement on one page');
  ok(p.boxes[1].left > p.boxes[0].left && p.boxes[2].top > p.boxes[0].top, 'the relative layout is preserved');
  p = P.plan([{ x: 0, y: 0, w: 200, h: 200, rot: 0 }, { x: 6000, y: 5000, w: 200, h: 200, rot: 0 }]); ok(p.mode === 'flow' && p.order.length === 2, 'objects scattered over a huge canvas do not make blank pages: a compact flow is used instead');
  p = P.plan([{ x: 900, y: 900, w: 200, h: 200 }, { x: 0, y: 0, w: 200, h: 200 }, { x: 5000, y: 20, w: 200, h: 200 }, { x: 0, y: 5000, w: 200, h: 200 }]); ok(p.mode === 'flow' && p.order[0] === 1 && p.order[1] === 2, 'the flow reads top to bottom, left to right');
  ok(P.plan([{ x: 0, y: 0, w: 5000, h: 100 }, { x: 0, y: 500, w: 100, h: 100 }]).boxes.every((b) => b.scale <= 1), 'nothing is enlarged in a flow');
  ok(P.plan([]).mode === 'none', 'nothing to print plans nothing');
  const rb = P.rotBox({ w: 200, h: 100, rot: 15 }); ok(rb.w > 200 && rb.h > 100, 'a tilted object is measured by its rotated bounds');
  p = P.plan([{ x: 0, y: 0, w: 300, h: 300 }, { x: 50, y: 50, w: 300, h: 300 }]); ok(p.boxes.every((b) => b.scale <= 1.5), 'a pair is enlarged at most 1.5x');
}

// ---------------------------------------------------------------- printObjects against a DOM
{
  const { document, window } = parseHTML('<!doctype html><html><head><title>Stick-It</title></head><body class="dark"><div id="app"><div id="board"></div><div class="acctBackdrop" id="modal"></div></div></body></html>');
  const toasts = []; let printCalls = 0, printedState = null;
  const mk = (n) => { const e = document.createElement('div'); e.className = 'note staticNote'; e.id = 'dup-' + n.id; e.innerHTML = '<span id="inner-' + n.id + '">' + (n.text || '') + '</span><button class="reactAdd">x</button>'; Object.defineProperty(e, 'offsetWidth', { value: n.w || 200 }); Object.defineProperty(e, 'offsetHeight', { value: n.h || 150 }); return e; };
  const env = {
    document, window: Object.assign(window, { print: () => { printCalls++; printedState = { printing: document.body.classList.contains('printing'), dark: document.body.classList.contains('dark'), root: !!document.getElementById('printRoot'), title: document.title, kids: document.querySelectorAll('#printRoot .printObj').length }; window.dispatchEvent(new window.Event('afterprint')); } }),
    Stick: { printLayout: P }, setTimeout, clearTimeout, Promise, Math, Array, Object, String, Number,
    isPileObj: (n) => n.type === 'pile', isZone: (n) => n.type === 'zone', isAV: (n) => n.type === 'audio' || n.type === 'video', isHiddenMember: (n) => !!n.hidden, noteHasContent: (n) => !n.empty, itemText: (n) => n.text || '',
    PublicShare: { toPublicNote: (n) => ({ id: n.id, text: n.text, x: n.x, y: n.y, w: n.w, h: n.h, rot: n.rot, secret: undefined }) }, buildStaticNote: mk, makeDiv: (c) => { const d = document.createElement('div'); d.className = c; return d; },
    toast: (m) => toasts.push(m), endEditing: () => {}, closeFloatingPopovers: () => {}, printState: null,
  };
  env.window.addEventListener = window.addEventListener.bind(window); env.window.removeEventListener = window.removeEventListener.bind(window);
  const ctx = vm.createContext(env); vm.runInContext('var printState = null, printBusy = false;\n' + ['printable', 'printTitleFor', 'endPrint', 'printObjects'].map(fn).join('\n'), ctx);
  const N = (id, o) => Object.assign({ id, text: 'text ' + id, x: 0, y: 0, w: 200, h: 150, rot: 0, el: { marker: 'live' }, phys: { keep: 1 } }, o || {});
  const board = [N('a'), N('b', { x: 250 }), N('c', { x: 500 }), N('pile', { type: 'pile' }), N('zone', { type: 'zone' }), N('rec', { type: 'audio' }), N('hid', { hidden: true }), N('blank', { empty: true }), N('emb', { type: 'embed' })];
  const snapshot = JSON.stringify(board);
  const run = async (list, opts) => { printCalls = 0; printedState = null; toasts.length = 0; await ctx.printObjects(list, opts); await new Promise((r) => setTimeout(r, 120)); };

  await run([board[0]]);
  ok(printCalls === 1 && printedState.kids === 1 && printedState.printing && !printedState.dark, 'a single object is printed alone, in print mode, with the dark theme switched off for the page');
  ok(!document.getElementById('printRoot') && !document.body.classList.contains('printing') && document.body.classList.contains('dark') && document.title === 'Stick-It', 'afterwards the print root is gone and the theme, class and title are restored');
  await run([board[0], board[1], board[2]]);
  ok(printedState.kids === 3, 'a multi-selection prints exactly the selected objects');
  await run(board);
  ok(printedState.kids === 3 && toasts.some((t) => /left out/.test(t)), 'piles, zones, recordings, hidden members, embeds and empty notes are never printed, and the person is told');
  ok(printedState.title.startsWith('Stick-It') && /3 items/.test(printedState.title), 'the page title (the default PDF file name) names what is printed');
  await run([board[3]]); ok(printCalls === 0 && toasts.some((t) => /pile/i.test(t)), 'a selected pile prints nothing and says how to print a paper in it');
  await run([board[5]]); ok(printCalls === 0 && toasts.some((t) => /Recordings and videos/.test(t)), 'recordings cannot be printed');
  await run([board[6], board[7]]); ok(printCalls === 0, 'hidden pile members and empty notes are not printed');
  ok(JSON.stringify(board) === snapshot, 'printing never changes the board objects');
  await run([board[0]], { pdf: true }); ok(toasts.some((t) => /Save as PDF/.test(t)), 'the PDF option tells people to choose Save as PDF in the browser print window');
  await run([board[0]]); ok(!document.querySelector('#printRoot') && document.querySelectorAll('[id^="dup-"]').length === 0, 'no duplicate ids are left behind');
  let seenIds = -1; env.window.print = () => { seenIds = document.querySelectorAll('#printRoot [id]').length; window.dispatchEvent(new window.Event('afterprint')); }; await run([board[0]]); ok(seenIds === 0, 'ids are stripped from the printed copies');
  // a second request while one is open is ignored; a failure cleans up
  let p2 = ctx.printObjects([board[0]]); ctx.printObjects([board[1]]); await p2; await new Promise((r) => setTimeout(r, 150)); ok(document.querySelectorAll('#printRoot').length === 0, 'only one print root can ever exist, and it is removed');
  env.window.print = () => { throw new Error('blocked'); }; await run([board[0]]); ok(!document.getElementById('printRoot') && !document.body.classList.contains('printing') && toasts.some((t) => /print window/.test(t)), 'if the print window cannot open, everything is cleaned up');
  ok(document.body.classList.contains('dark'), 'the theme is still restored after a failure');
}

// ---------------------------------------------------------------- source / CSS guarantees
{
  const po = fn('printObjects');
  ok(/PublicShare\.toPublicNote\(Object\.assign\(\{\}, n\)\)/.test(po), 'copies of the data are printed (the originals are never handed to the print code)');
  ok(/removeAttribute\("id"\)/.test(po) && /document\.fonts\.ready/.test(po) && /addEventListener\("afterprint"/.test(po) && /setTimeout\(endPrint, 180000\)/.test(po), 'ids are stripped, fonts and pictures are awaited, and cleanup is guaranteed (afterprint plus a safety timer)');
  ok(!/(notes|donePile|trashPile)\.(push|splice)|saveNotes\(|recordChange\(|pushHistory\(/.test(po + fn('endPrint') + fn('printable')), 'printing does not save, record history or alter any list');
  ok(/!isPileObj\(n\) && !isZone\(n\) && !isAV\(n\) && n\.type !== "embed" && !isHiddenMember\(n\) && noteHasContent\(n\)/.test(fn('printable')), 'only real, visible, non-empty content is printable');
  ok(/body\.printing > \*:not\(#printRoot\)\{ display:none !important/.test(css), 'everything except the print root (header, search, minimap, dock, modals, board) is hidden while printing');
  ok(/\.cmtTab/.test(css) && /\.reactChips/.test(css) && /\.reactAdd/.test(css), 'comment and reaction chrome is excluded even if a clone carried it');
  ok(/break-inside:avoid/.test(css) && /\.printItem\.spans\{ break-inside:auto/.test(css) && /@page\{ margin:14mm/.test(css), 'small objects are kept whole on a page; only very tall ones may span; sensible margins');
  ok(/print-color-adjust:exact/.test(css) && /background:#fff !important/.test(css), 'colours are kept; the page is white');
  ok(/PRINT_ICON/.test(app) && (app.match(/printObjects\(/g) || []).length >= 8, 'Print is offered from the menus, the selection bar and the share window');
  const sm = app.slice(app.indexOf('var pr = makeDiv("sharePrintRow")'), app.indexOf('var pr = makeDiv("sharePrintRow")') + 900);
  ok(/"Print selection" : "Print"/.test(sm) && /"Print \/ Save as PDF"/.test(sm) && /choose .*Save as PDF/.test(sm), 'the share window offers Print (Print selection) and Print / Save as PDF with honest wording');
  ok(/Print selection/.test(app) && /"Print…"/.test(app) || /Print…/.test(app), 'single-object menus say Print… and the multi-selection menu says Print selection…');
  ok(/<script src="js\/print-layout\.js"><\/script>/.test(read('index.html')) && /css\/print\.css/.test(read('index.html')), 'the print layout script and stylesheet are loaded');
  ok(!/jsPDF|html2pdf|pdfmake/i.test(app + css + read('js/print-layout.js')), 'no claim of a native PDF engine: it is the browser print window');
  ok(/body:not\(\.printing\) \.po-clipping \.poSheet\{ clip-path:none/.test(read('css/spaces.css')), 'a clipping keeps its torn edge when printed');
}
console.log('v0.8.3.3 print: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
