// v0.8.3.2 "Finish the Flow": the parts built so far (patch system, input prefs, paste chooser, sign-out confirm, tour keys, Done/Trash/Restore cues, receipt Style submenu).
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const app = read('js/app.js'); const pn = JSON.parse(read('docs/patch-notes/patch-notes.json'));
const v = pn.find((e) => e.version === '0.8.3.2');
ok(v && v.codename === 'Finish the Flow' && v.status === 'development' && v.date === null, 'v0.8.3.2 is recorded as development, not released');
ok(/APP_VERSION: "0\.8\.3\.2", APP_CODENAME: "Finish the Flow", APP_STATUS: "development"/.test(read('js/config.js')), 'the app says 0.8.3.2, development');
ok(v.tour.length === 6 && v.highlights.length === 5, 'the Spotlight has the five cards plus the intro');
ok(fs.existsSync(path.join(root, 'docs/patch-notes/0.8.3.2.md')) && JSON.parse(read('docs/patch-notes/index.json'))[0].file === '0.8.3.2.md', 'notes and index are in step');
let check = true; try { execFileSync('node', ['tools/build-patch-data.mjs', '--check'], { cwd: root, stdio: 'pipe' }); } catch (e) { check = false; }
ok(check, 'generated patch files match the single patch source (--check)');
const hist = read('js/patch-history.js'); ok(pn.every((e) => hist.includes('"' + e.version + '"')), 'every patch is in the in-app history');
ok(/Stick\.patchReader\.open\(\)/.test(app) && /patchNotes/.test(app), 'What’s New opens the patch history reader');
ok(/"ArrowRight"/.test(app) && /"Backspace"/.test(app) && /isContentEditable/.test(app.slice(app.indexOf('function tourKeys'), app.indexOf('function tourKeys') + 700)), 'tutorial keys never act inside editable fields');
ok(/Sign out of Stick-It\?/.test(app) && (app.match(/confirmSignOut\(/g) || []).length >= 5, 'every sign-out entry asks first');
ok(/dblNode: "sticky", pasteText: "ask"/.test(app) && /createAtDoubleClick\(e\)/.test(app) && /adoptAccountInputPrefs\(/.test(app), 'input prefs default to sticky / ask, apply to double-click, and follow the account');
ok(/choosePasteKind\(plain\)/.test(app) && /Remember my choice/.test(app) && /if\(r\.remember\) setUiPref\("pasteText"/.test(app), 'paste asks and can remember');
ok(/SoundFx\.cue\("done"\)/.test(app) && /SoundFx\.cue\("trash"\)/.test(app) && /SoundFx\.cue\("restore"\)/.test(app) && /if\(!this\.enabled\(\) \|\| this\.volume\(\) <= 0\) return false/.test(app), 'Done/Trash/Restore cues exist and respect Sounds');
ok(/menuSub\(pop, ICONS\.paper \|\| ICONS\.sticky, "Style"/.test(app), 'paper Style choices live in a Style submenu');
console.log('v0.8.3.2: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
