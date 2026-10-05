// v0.8.3.2 "Finish the Flow", part two: collab pills, reactions, zones, pile, newspaper image, legal reader.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const app = read('js/app.js');
function fn(name) { const i = app.search(new RegExp('function ' + name + '\\(')); if (i < 0) return ''; let d = 0, j = app.indexOf('{', i); for (let k = j; k < app.length; k++) { if (app[k] === '{') d++; else if (app[k] === '}') { d--; if (!d) return app.slice(i, k + 1); } } return ''; }

// ---- collab invite pills
{
  const ctx = vm.createContext({ String, Array, RegExp });
  vm.runInContext('function validEmail(s){ return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(s) && s.length <= 254; }\n' + fn('parseInviteEmails'), ctx);
  const P = (t, h) => vm.runInContext('parseInviteEmails', ctx)(t, h);
  let r = P('a@x.com, b@y.org; c@z.io\nd@w.com e@v.net');
  ok(r.ok.length === 5 && !r.bad.length, 'comma, semicolon, newline and space all separate addresses');
  r = P('a@x.com, A@X.com, a@x.com'); ok(r.ok.length === 1 && r.dup === 2, 'duplicates (any case) are ignored');
  r = P('a@x.com', ['a@x.com']); ok(r.ok.length === 0 && r.dup === 1, 'an address already shown as a pill is a duplicate');
  r = P('good@x.com, nonsense, @x, y@'); ok(r.ok.length === 1 && r.bad.length === 3, 'invalid addresses stay (marked), valid ones become pills');
  r = P('<a@x.com>'); ok(r.ok[0] === 'a@x.com', 'a pasted <address> is cleaned');
  const dlg = fn('openCollabDialog');
  ok(/createInvite\(activeBoardId, email, role\)/.test(dlg) && /targets = emails\.length \? emails\.slice\(\) : \[""\]/.test(dlg), 'one invite per address; none = one open link');
  ok(/e\.key === "Backspace" && !input\.value && emails\.length/.test(dlg) && /e\.key === "," \|\| e\.key === ";"/.test(dlg) && /"paste"/.test(dlg), 'Enter/comma/semicolon, paste and Backspace behave as pills');
  ok(!/lookup|exists|findUser|accountFor/i.test(dlg + fn('parseInviteEmails')), 'no account lookup: nothing reveals whether an address has an account');
}
console.log('v0.8.3.2b: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
