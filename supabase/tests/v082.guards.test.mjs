// v0.8.2 "Get a Grip": guards for what is wired where, so a refactor can't quietly drop a feature, plus the zone/tour data rules.
//   node v082.guards.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');
const app = read('js/app.js'), css = read('css/app.css'), html = read('index.html');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };

// ---- loading
ok(/<script src="js\/keys\.js">/.test(html) && /<script src="js\/patch-data\.js">/.test(html) && /<script src="js\/lang\.js">/.test(html), 'keys.js, patch-data.js and lang.js are loaded by the app');

// ---- action registry, shortcuts, palette
ok(/function defineAction\(a\)/.test(app) && /defineAction\(\{id: "newNote"/.test(app) && /defineAction\(\{id: "palette"/.test(app), 'the action registry exists with the palette and new-note actions');
ok(!/\(key === "n" \|\| key === "N"\)/.test(app), 'the old hard-coded N handler is gone (the registry owns it)');
ok(/KB\.find\(activeKeys\(\), b\)/.test(app) && /rebinderOpen/.test(app), 'the dispatcher resolves keys through the active map and stands down while a key is being rebound');
ok(/Press a new shortcut/.test(app) && /Reset all to default/.test(app) && /Replace/.test(app), 'the rebinder prompts, resets all, and offers Replace on a duplicate');
ok(/saveUiPrefs/.test(read('js/account.js')) && /ui_prefs/.test(read('supabase/migrations/20261003100000_ui_prefs.sql')), 'shortcuts sync through a private ui_prefs column');
ok(/role", "combobox"/.test(app) && /aria-activedescendant/.test(app) && /OV\.layer\("command-palette"/.test(app), 'the palette is a labelled combobox/listbox on the Esc layer stack');
ok(/body\.dark \.kbdKeys kbd, body\.dark \.palKeys kbd/.test(css), 'shortcut key caps have a dark-mode style');

// ---- zones, pin, history, bookmarks
ok(/function renderZone\(n, isNew\)/.test(app) && /OBJECT_MENUS\.zone = zoneMenu/.test(app), 'zones render and have a menu');
ok(/if\(n && n\.type === "zone"\) return true;/.test(app), 'a zone is never treated as an empty note (clean-up-empty would delete it)');
ok(/!insideAnyZone\(n\)/.test(app) && /isPinned\(n\) && !isZone\(n\)/.test(app), 'Clean up leaves pinned notes and notes inside a zone alone');
ok(/var VH = \{list: \[\], i: -1/.test(app) && /CAP: 30/.test(app) && /def: "Alt\+\["/.test(app), 'spatial history is capped and bound to Alt+[ / Alt+]');
ok(/BOOKMARK_MAX = 30/.test(app) && /function goToBookmark/.test(app), 'bookmarks are capped and navigable');

// zone normalisation: lifted out of the source and run in a VM
{
  const a = app.indexOf('if(item.type === "zone"){'), b = app.indexOf('if(window.Stick && Stick.objects && Stick.objects.isKind(item.type)){', a);
  ok(a > 0 && b > a, 'the zone branch of normalizeIncoming is present');
  const body = app.slice(a, b);
  const ctx = vm.createContext({ Math, String, Date, clampNum: (v, lo, hi, d) => { v = Number(v); return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; }, newId: () => 'zid', safeColor: (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : null),
    ZONE_MIN_W: 160, ZONE_MAX_W: 1000, ZONE_MIN_H: 110, ZONE_MAX_H: 1600, ZONE_MATERIALS: [['paper'], ['kraft'], ['cardboard'], ['grid'], ['felt']], ZONE_TINTS: ['#fff3a8'] });
  const f = vm.runInContext('(function(item){ ' + body + ' })', ctx);
  const z = f({ type: 'zone', x: 10, y: 20, w: 99999, h: 5, title: '  Groceries‮  list ', variant: 'bogus', bg: 'url(x)', carry: 'yes', pinned: true });
  ok(z && z.type === 'zone' && z.w === 1000 && z.h === 110, 'zone size is clamped');
  ok(z.title === 'Groceries list', 'zone title is cleaned (bidi override gone, spaces collapsed)');
  ok(z.variant === 'paper' && z.bg === '#fff3a8', 'an unknown material or a non-colour falls back to the defaults');
  ok(z.carry === undefined && z.pinned === undefined, 'carry needs exactly true, and a paste or import is never pinned');
  ok(f({ type: 'zone', carry: true, variant: 'felt', bg: '#112233' }).carry === true, 'a real carry flag and material survive');
}

// ---- validation-pass fixes
ok(/release: function\(id\)\{ var u = urls\.get\(id\)/.test(app) && /MediaStore\.release\(n\.mediaId\)/.test(app), 'removing a voice memo or video lets go of its object URL (and the blob it keeps alive)');
ok(/OV\.layer\("language-chooser"/.test(app), 'the inline language list is an Esc layer of its own');

// ---- patch tour data
{
  const pd = read('js/patch-data.js');
  ok(/Stick\.patchData/.test(pd) && /"tourMode": "full"/.test(pd), 'the app ships the structured patch data with a tour mode');
  const g = {}; vm.runInNewContext(pd, g); const D = (g.Stick || vm.runInNewContext('Stick', g)).patchData;
  ok(D.version === read('js/config.js').match(/APP_VERSION: "([^"]+)"/)[1], 'the patch data is for the version the app says it is');
  ok(D.tour.length >= 3 && D.tour.every((s) => s.title && s.body), 'every tour step has a title and words');
  const targets = D.tour.map((s) => s.target).filter(Boolean);
  ok(targets.every((t) => /^[#.][\w-]+$/.test(t)), 'tour targets are simple selectors');
  ok(targets.every((t) => (t[0] === '#' ? html.includes('id="' + t.slice(1) + '"') : (html.includes(t.slice(1)) || app.includes('"' + t.slice(1) + '"') || app.includes('className = "' + t.slice(1)) || app.includes('"' + t.slice(1) + ' ') || app.includes('class="' + t.slice(1) + '"') || t === '.note'))), 'every tour target names something that exists');
  ok(/function maybeOfferPatchTour/.test(app) && /firstRun\)\{ ptMarkSeen\(\)/.test(app) && /Stick\.dev\.patchTour/.test(app), 'the update card skips first-time visitors and the replay/reset tools are dev-only');
  ok(/Show me/.test(app) && /Not now/.test(app) && /View patch notes/.test(app), 'the update card has Show me, Not now and View patch notes');
  ok(/escapeHtml\(s\.title/.test(app) && /escapeHtml\(s\.body/.test(app), 'tour step words are escaped before they reach the page');
}

// ---- legal
{
  const lc = read('legal/legal.css'), lu = read('legal/legal-ui.js');
  ok(!/prefers-color-scheme/.test(lc), 'the legal pages are beige unless dark is chosen (no automatic dark)');
  ok(/data-a11y-theme="dark"/.test(lc) && /data-a11y-size="large"/.test(lc) && /data-a11y-contrast="on"/.test(lc) && /data-a11y-motion="reduce"/.test(lc), 'legal CSS reacts to theme, size, contrast and motion');
  ok(/LG\.complete\("legal"\)/.test(lu) && /aria-haspopup/.test(lu), 'the globe lists only complete languages');
  ok(/complete: \{ legal: true/.test(read('js/lang.js')), 'the language registry marks which surfaces are complete');
  ok(/legal-ui\.js/.test(read('legal/he/privacy.html')) && /js\/lang\.js/.test(read('legal/he/privacy.html')), 'the Hebrew pages load the same chooser');
  ok(!app.slice(app.indexOf('var LEGAL_ABOUT'), app.indexOf('function buildLegalPane')).includes('he/privacy.html'), 'the direct Hebrew link in Legal & About is replaced by the Language chooser');
  ok(/mirrorTheme/.test(app) && /theme: "light"/.test(read('js/a11y.js')), 'the app mirrors its light/dark choice to the legal pages, which default to beige');
}

console.log(`v082 guards: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
