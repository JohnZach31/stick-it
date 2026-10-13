// v0.8.4 editor fix: Ctrl+U / Cmd+U underline. The shortcut handler is cut out of js/app.js and run for real against stub editor state.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };

const a = app.indexOf('  function underlineShortcut(e){'), b = app.indexOf('  window.addEventListener("keydown", underlineShortcut, true);');
ok(a > 0 && b > a, 'the shortcut lives in one named handler');
const src = app.slice(a, b);

function run(ev, { active, readOnly = false, singleNoteMode = false, typing = false } = {}) {
  const calls = [];
  const ctx = vm.createContext({ document: { activeElement: active || null }, readOnly, singleNoteMode, isTyping: () => typing, execIn: (el, cmd) => calls.push(cmd) });
  vm.runInContext(src + '\nthis.fn = underlineShortcut;', ctx);
  const e = Object.assign({ ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, repeat: false, code: 'KeyU', key: 'u', prevented: false, stopped: false,
    preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } }, ev);
  ctx.fn(e); return { e, calls };
}
const note = { isContentEditable: true, classList: { contains: (c) => c === 'text' } };
const other = { isContentEditable: true, classList: { contains: () => false } };

for (const mod of ['ctrlKey', 'metaKey']) {
  let r = run({ [mod]: true }, { active: note });
  ok(r.calls.join() === 'underline' && r.e.prevented && r.e.stopped, mod + ': toggles underline in the focused note and blocks view-source');
  r = run({ [mod]: true, repeat: true }, { active: note });
  ok(r.calls.length === 0 && r.e.prevented, mod + ': a held key (auto-repeat) is swallowed, never toggles again');
  r = run({ [mod]: true, code: 'Semicolon', key: 'ק' }, { active: note });
  ok(r.calls.length === 0, mod + ': other keys untouched');
  r = run({ [mod]: true, code: 'KeyU', key: 'ו' }, { active: note });
  ok(r.calls.length === 1, mod + ': a Hebrew layout (physical U key) still underlines');
  r = run({ [mod]: true, shiftKey: true }, { active: note }); ok(r.calls.length === 0, mod + ': Shift/Alt variants are not ours');
  r = run({ [mod]: true }, { active: note, readOnly: true }); ok(r.calls.length === 0 && r.e.prevented, mod + ': read-only never edits');
  r = run({ [mod]: true }, { active: null }); ok(r.calls.length === 0 && !r.e.prevented, mod + ': nothing editable focused: the browser keeps Ctrl+U (no global hijack)');
  r = run({ [mod]: true }, { active: null, typing: false }); ok(!r.e.prevented, mod + ': a merely selected note no longer hijacks it');
  r = run({ [mod]: true }, { active: other, typing: true }); ok(r.calls.length === 0 && r.e.prevented, mod + ': another Stick-It field never opens view-source');
}

// one command for every control, no duplicate handlers
ok(/execIn\(textEl, cmd, value\)\{[\s\S]{0,250}document\.execCommand\(cmd, false, value \|\| null\)[\s\S]{0,120}refreshFormatControls\(\)/.test(app), 'execIn applies the command and repaints every format control');
ok((app.match(/underlineShortcut/g) || []).length === 2, 'the handler is registered exactly once');
ok(!/underline is applied by the window handler/.test(app), 'no second per-note Ctrl+U handler');
ok(/execIn\([a-zA-Z]+, "underline"\)/.test(app) && (app.match(/"underline"/g) || []).length >= 3, 'the buttons use the same execIn("underline") command');
ok(/function refreshFormatControls\(\)\{[\s\S]{0,120}paintSelTip\(\)[\s\S]{0,60}updateFocusBar\(\)/.test(app), 'selection tip and focus bar both repaint from queryCommandState');

console.log('v0.8.4 Ctrl+U underline: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
