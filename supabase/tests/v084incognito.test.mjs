// v0.8.4 Incognito (scratch-off foil): the pure maths run for real, and every place that could show a covered note's words is checked in the source.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const read = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const app = read('js/app.js'), mod = read('js/incognito.js'), css = read('css/privacy.css'), html = read('index.html');
function fn(name) { const i = app.search(new RegExp('(async )?function ' + name + '\\(')); if (i < 0) return ''; let d = 0, j = app.indexOf('{', i); for (let k = j; k < app.length; k++) { if (app[k] === '{') d++; else if (app[k] === '}') { d--; if (!d) return app.slice(i, k + 1); } } return ''; }

// ---- the module's pure helpers, run for real
const win = { Stick: {}, matchMedia: () => ({ matches: false }), requestAnimationFrame: () => 0, addEventListener() {} };
vm.runInContext(mod, vm.createContext(Object.assign(win, { window: win, document: {}, Math, Date, Array, Object, String, Number, setTimeout, clearTimeout })), { filename: 'incognito.js' });
const I = win.Stick.incognito, C = I.core;
ok(I.THRESHOLD === 0.6 && C.THRESHOLD === 0.6, 'the foil lifts at 60% scratched');
{
  const px = (a) => new Uint8ClampedArray(a.flatMap((v) => [0, 0, 0, v]));
  ok(Math.abs(C.cleared(px([255, 255, 255, 255]))) < 1e-9, 'a whole foil counts as 0% cleared');
  ok(C.cleared(px([0, 0, 0, 0])) === 1, 'a bare surface counts as 100% cleared');
  ok(Math.abs(C.cleared(px([0, 0, 255, 255])) - 0.5) < 1e-9, 'half the pixels gone is 50%');
  ok(C.cleared(px([0, 0, 0, 255, 255])) >= 0.6 && C.cleared(px([0, 0, 255, 255, 255])) < 0.6, 'the threshold falls where 3 of 5 are gone');
  ok(C.cleared(new Uint8ClampedArray(0)) === 0, 'an empty sample never reveals by accident');
}
{
  // pointer mapping: the layout size is the untransformed one, so the canvas pixel is the same at any zoom or tilt
  const a = C.mapPoint(50, 25, 100, 50, 300, 150), b = C.mapPoint(50, 25, 100, 50, 150, 75);
  ok(a.x === 150 && a.y === 75 && b.x === 75 && b.y === 37.5, 'an offset maps to the canvas by layout size (zoom- and rotation-independent)');
  ok(C.mapPoint(10, 10, 0, 0, 100, 100).x === 1000, 'a zero-size layout never divides by zero');
}
{
  const r = C.rng(42), r2 = C.rng(42); const s1 = C.stamps(0, 0, 100, 0, 20, r), s2 = C.stamps(0, 0, 100, 0, 20, r2);
  ok(JSON.stringify(s1) === JSON.stringify(s2), 'a stroke is deterministic for a given seed (testable, not random per run)');
  ok(s1.length >= 100 / (20 * 0.35) - 1 && s1.every((s) => s.r >= 20 * 0.8 - 1e-9 && s.r <= 20 * 1.25 + 1e-9), 'stamps overlap along the path and vary in size (a scraped streak, not a rigid circle)');
  ok(s1.some((s) => Math.abs(s.y) > 0.01), 'they wander off the straight line a little');
  ok(C.hash('abc') === C.hash('abc') && C.hash('abc') !== C.hash('abd'), 'the foil pattern is stable per note');
}

// ---- wired into the page
ok(/<script src="js\/incognito.js"><\/script>/.test(html) && /css\/privacy.css/.test(html), 'the module and its stylesheet are loaded');
ok(/\.incogWrap\{[^}]*touch-action:none/.test(css) && /\.incogCanvas\{[^}]*touch-action:none/.test(css), 'the foil takes touch itself (no scrolling, panning or zooming under a finger that is scratching)');
ok(/top:22px/.test(css.match(/\.incogWrap\{[^}]*\}/)[0]), 'the drag tab stays uncovered: dragging works from the header');
ok(/wrap\.addEventListener\("pointerdown"[\s\S]{0,300}preventDefault\(\); e\.stopPropagation\(\)/.test(mod), 'a scratch never reaches the note drag, the board pan, selection or the caret');
ok(/setPointerCapture/.test(mod) && /getCoalescedEvents/.test(mod), 'the stroke keeps following the pointer outside the note, with every sample');
ok(/e\.key === "Enter" \|\| e\.key === " "/.test(mod) && /tabIndex = 0/.test(mod) && /role", "button"/.test(mod), 'keyboard: a focusable button, Enter or Space reveals');
ok(/prefers-reduced-motion/.test(mod) && /prefers-reduced-motion/.test(css), 'reduced motion: no flakes, no lift animation');
ok(/IntersectionObserver/.test(mod) && /MAX_DPR/.test(mod), 'many notes: off-screen pristine foils give their pixels back, and the canvas is capped');

// ---- the model: saved flag, never the revealed state
ok(/"imgFit","tf","incog"\];/.test(app), 'the flag is part of what a note saves and syncs');
ok(!/incogOpen/.test(fn('serializeNote')) && !/incogOpen/.test(fn('persistForm')), 'whether it was scratched is never saved: a reload covers it again');
ok(/function incogCovered\(n\)\{ return isIncog\(n\) && !incogOpen\[n\.id\]; \}/.test(app), 'covered = flagged and not scratched away this session');
ok(/c\.incog !== undefined && \(c\.incog !== true \|\| c\.type\)\) delete c\.incog/.test(app), 'what arrives from the server is only ever true, and only on a plain note');
ok(/decoratePin\(n\); decorateReactions\(n\); decorateIncog\(n\);/.test(app), 'every render of a note re-applies the foil (undo, sync and re-render keep it covered)');

// ---- leakage: every path that could show the words asks isConcealed first
ok(/function itemText\(n\)\{\s*if\(isConcealed\(n\)\) return "";/.test(app), 'text for share messages, search hits and the print title is empty');
ok(/isConcealed\(n\)\)\{ n\.el\.style\.opacity = "0\.15"/.test(fn('runSearch')), 'search neither matches nor highlights a covered note');
ok(/if\(isConcealed\(o\)\) return hiddenLabel\(o\)/.test(fn('pileTitle')) && /if\(isConcealed\(top\)\) return hiddenLabel\(top\)/.test(fn('pileSnippet')), 'the Done list and a pile top show "Incognito note", not words');
ok(/var veiled = isConcealed\(n\);/.test(app) && /var text = veiled \? ""/.test(app) && /if\(n\.image && !veiled\)/.test(app), 'board thumbnails draw a grey card, no words and no picture');
ok(/var veiledAny = list\.some\(isConcealed\)/.test(fn('copyNotesToClipboard')) && /if\(!veiledAny\)\{ try\{ e\.clipboardData\.setData\(CLIP_MIME/.test(fn('copyNotesToClipboard')) && /"\[" \+ hiddenLabel\(n\) \+ "\]"/.test(fn('copyNotesToClipboard')), 'copying puts only a placeholder on the system clipboard, never the private type that carries the words');
ok(/if\(isConcealed\(n\)\)\{ pn\.html = ""; pn\.image = null; pn\.isTask = false; pn\.due = ""; pn\.concealed = true;/.test(fn('printObjects')), 'print and PDF carry no words for a covered note');
ok(/t\.innerHTML = item\.concealed \|\| item\.sealed \? "" : sanitizeHtml\(item\.html\)/.test(fn('buildStaticNote')) && /item\.image && !item\.concealed/.test(fn('buildStaticNote')), 'a concealed copy has no words and no picture in its markup');
ok(/Incognito isn\\u2019t private/.test(fn('openShareModal')) && /Share anyway/.test(fn('openShareModal')), 'sharing says plainly that the foil is not privacy');
ok(/\.note\.incogCovered > :not\(\.tab\)[^{]*\{ visibility:hidden !important; \}/.test(css), 'the words under the foil are hidden from the page, find-in-page and screen readers, not just painted over');
ok(!/encrypt|secure|private storage/i.test(mod.replace(/NOT SECURITY[\s\S]*?\*\//, '')) , 'the module never claims security');

// ---- menus
ok(/incogMenuItems\(pop, n\);/.test(fn('openNoteMenu')) && /incogGroupItem\(pop, ids\);/.test(fn('openGroupMenu')), 'Make Incognito is in the note menu and the multi-select menu');
{ const m = fn('incogMenuItems'); ok(/"Make Incognito"/.test(m) && /"Reveal"/.test(m) && /"Cover Again"/.test(m) && /"Remove Incognito"/.test(m), 'Make / Reveal / Cover Again / Remove Incognito'); }
ok(/recordChange\(on \?/.test(fn('setIncog')) && /captureState/.test(fn('setIncog')), 'making or removing Incognito is one undo step');

console.log('v0.8.4 incognito: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
