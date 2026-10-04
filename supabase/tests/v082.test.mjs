// v0.8.2 "Get a Grip": real-DOM tests (linkedom) for Fit/Rip content detection, and pure tests for keyboard bindings.
//   node v082.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const app = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const slice = (from, to) => { const a = app.indexOf(from), b = app.indexOf(to, a); if (a < 0 || b < 0) throw new Error('marker not found: ' + from); return app.slice(a, b); };

// ---- trailing blank detection, on a real DOM
{
  const { document } = parseHTML('<html><body></body></html>');
  const code = slice('function isBlankNode(node){', 'function recordSnapshots');
  const ctx = vm.createContext({ document, Math, Array, RegExp });
  vm.runInContext(code, ctx);
  const t = (h) => ctx.trimTrailingBlank(h);
  ok(t('hello') === 'hello', 'a regular line is left alone');
  ok(t('hello<div><br></div>') === 'hello', 'a trailing blank line goes');
  ok(t('hello<div><br></div><div><br></div><div><br></div>') === 'hello', 'several trailing blank lines go');
  ok(t('hello<br><br>') === 'hello', 'trailing Shift+Enter breaks go');
  ok(t('hello<br>') === 'hello', 'a single filler break goes');
  ok(t('a<div><br></div>b') === 'a<div><br></div>b', 'an intentional blank line inside the writing stays');
  ok(t('a<div><br></div>b<div><br></div>') === 'a<div><br></div>b', 'only the trailing one goes');
  ok(t('שלום עולם<div><br></div>') === 'שלום עולם', 'Hebrew text is kept, its trailing blank goes');
  ok(t('<div>שלום</div><div>​</div>') === '<div>שלום</div>', 'zero-width filler counts as blank');
  ok(t('<div>x</div><div>&nbsp;</div>') === '<div>x</div>', 'a non-breaking space line is blank');
  ok(t('<ul><li>one</li><li>two</li><li><br></li></ul>') === '<ul><li>one</li><li>two</li></ul>', 'an empty trailing list item goes');
  ok(t('<ul><li>one</li></ul>') === '<ul><li>one</li></ul>', 'a checklist/list with content is kept');
  ok(t('pic<img src="x.png">') === 'pic<img src="x.png">', 'an image is content');
  ok(t('') === '' && t('<br>') === '', 'an empty note stays empty');
}

// ---- keyboard binding rules
{
  globalThis.window = undefined;
  const g = {}; vm.runInNewContext(fs.readFileSync(path.join(root, 'js', 'keys.js'), 'utf8'), g);
  g.globalThis = g; // keys.js attaches to globalThis inside the context
  const K = (g.Stick || vm.runInNewContext('Stick', g)).keys;
  const ev = (o) => Object.assign({ key: '', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }, o);
  ok(K.fromEvent(ev({ key: 'k', ctrlKey: true }), false) === 'Mod+K', 'Ctrl+K on Windows is Mod+K');
  ok(K.fromEvent(ev({ key: 'k', metaKey: true }), true) === 'Mod+K', 'Cmd+K on a Mac is Mod+K');
  ok(K.fromEvent(ev({ key: 'K', ctrlKey: true, shiftKey: true }), false) === 'Mod+Shift+K', 'Shift is kept with a letter');
  ok(K.fromEvent(ev({ key: 'Shift', shiftKey: true }), false) === null, 'a modifier alone is not a shortcut');
  ok(K.fromEvent(ev({ key: '?', shiftKey: true }), false) === '?', 'Shift+/ is just "?"');
  ok(K.check('N', {}).ok, 'a plain letter is fine');
  ok(K.check('Mod+T', {}).kind === 'reserved', 'Ctrl+T is browser-reserved');
  ok(K.check('Mod+W', {}).kind === 'reserved', 'Ctrl+W is browser-reserved');
  ok(K.check('Alt+F4', {}).kind === 'reserved', 'Alt+F4 is reserved');
  ok(K.check('Mod+3', {}).kind === 'reserved', 'Ctrl+digit switches tabs');
  ok(K.check('Mod+C', {}).kind === 'editing', 'Ctrl+C is a text-editing chord');
  ok(K.check('Mod+Z', {}).kind === 'editing', 'Ctrl+Z is a text-editing chord');
  ok(K.check('Escape', {}).kind === 'reserved', 'Esc is fixed');
  ok(K.check('Enter', {}).kind === 'reserved' && K.check('Tab', {}).kind === 'reserved', 'Enter and Tab are fixed');
  ok(K.check('Alt+Tab', {}).kind === 'reserved', 'Alt+Tab belongs to the OS');
  ok(K.check('Shift', {}).kind === 'invalid', 'modifier-only is invalid');
  ok(K.check('', {}).kind === 'invalid', 'empty is invalid');
  const cur = { a: 'N', b: 'Mod+J2' }, actions = [{ id: 'a', label: 'New note' }];
  const dup = K.check('N', { current: cur, actions, forId: 'b' });
  ok(dup.kind === 'duplicate' && dup.holder === 'a' && /New note/.test(dup.message), 'a duplicate names its holder');
  ok(K.check('N', { current: cur, actions, forId: 'a' }).ok, 'rebinding an action to its own key is not a duplicate');
  ok(K.format('Mod+Shift+K', false).join('+') === 'Ctrl+Shift+K' && K.format('Mod+K', true).join('+') === 'Cmd+K', 'format adapts to the platform');
  const defs = { a: 'N', b: 'P' };
  ok(JSON.stringify(K.resolve(defs, { a: 'M' })) === '{"a":"M","b":"P"}', 'resolve overlays customs on defaults');
  ok(K.resolve(defs, { a: '' }).a === '', 'an empty string means unbound');
  const clean = K.sanitize({ a: 'Mod+T', b: 'X', zzz: 'Q', c: 5 }, defs, false, {});
  ok(JSON.stringify(clean) === '{"b":"X"}', 'sanitize drops reserved, unknown and non-string entries');
  ok(K.find({ a: 'X', b: 'Y' }, 'Y') === 'b' && K.find({ a: 'X' }, 'Z') === null, 'find looks a binding up');
}

console.log(`v082: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
