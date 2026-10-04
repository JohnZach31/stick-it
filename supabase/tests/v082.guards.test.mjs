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

// ---- mark many done, typing sync, Ctrl+U, Collaborate
ok(/function markDoneGroup\(ids\)/.test(app) && /markDoneGroup\(ids\); \}\)/.test(app) && /run: function\(\)\{ markDoneGroup\(selIds\(\)\); \}/.test(app), 'several selected notes can be marked done together (selection bar, right-click menu and the shortcut)');
ok(/pushHistory\(\{label: "Mark " \+ list\.length \+ " done"/.test(app), 'marking several done is one undo step');
ok(/function saveNotesTyping\(\)/.test(app) && /text\._t = setTimeout\(saveNotesTyping, 250\)/.test(app) && /typingNotifyT = setTimeout\(flushTypingNotify, Math\.max\(0, Math\.min\(2000/.test(app), 'typing keeps the device copy current but tells the account only after a pause');
ok(/pagehide", flushTypingNotify/.test(app) && /scope = scope === "global" \? "global" : "local";\s+flushTypingNotify\(\);/.test(app), 'a buffered typing change is sent when the page is hidden, closed or signed out');
ok(/e\.code === "KeyU"/.test(app), 'Ctrl+U never opens view-source from inside a note, on any keyboard layout');
ok(/id="collabBtn" hidden/.test(html) && html.indexOf('id="collabBtn"') > html.indexOf('id="publishBtn"'), 'the Collaborate button sits under Publish in the share panel and starts hidden');
ok(/function canShowCollab\(\)\{[\s\S]*?!CLOUD[\s\S]*?Stick\.auth\.user\(\)[\s\S]*?!isPremium\(\)[\s\S]*?meta\.access === "owner"/.test(app), 'Collaborate shows only for a signed-in Premium owner of a cloud board');
ok(/collabBtn\.hidden = !canShowCollab\(\)/.test(app) && /if\(willOpen\) updateCollabButton\(\)/.test(app), 'the button is re-checked every time the share panel opens');
ok(/Stick\.repo\.createInvite\(activeBoardId, email, role\)/.test(app) && /Stick\.repo\.acceptInvite\(t\)/.test(app) && /#invite=\(\[a-f0-9\]\{64\}\)/.test(app), 'invites are created and accepted through the existing server functions');

// ---- underline, link look, checklist titles, selection tip, pulling a note
ok(/ALLOWED_TAGS = \{DIV:1,P:1,BR:1,B:1,STRONG:1,I:1,EM:1,U:1,/.test(app) && /execIn\(text, "underline"\)/.test(app), 'underline is kept by the sanitiser and works from the key and every format control');
ok(/\.text a\{ color:var\(--link/.test(css) && /\.text a::after\{ content:"\\2197"/.test(css) && /\.text u\{ text-decoration:underline/.test(css), 'links are coloured with a dotted line and an arrow, so they never look like underlined text');
ok(/function toggleChecklistTitle\(textEl\)/.test(app) && /li\.setAttribute\("data-title", "true"\)/.test(app) && /ul\.checklist > li\[data-title="true"\]::before/.test(css), 'a checklist line can be a title with no checkbox');
ok(/\[:\\uff1a\]\\s\*\$/.test(app), 'a first line ending in a colon becomes the title when a list is made a checklist');
ok(/li:not\(\[data-title="true"\]\)/.test(app) && /li\.getAttribute\("data-title"\) !== "true" && checkboxHit/.test(app), 'a title is never counted, ticked or clicked as a checkbox');
ok(/var selTip = null/.test(app) && /makeDiv\("floatPop selTip"\)/.test(app) && /makeDiv\("fmtGrid"\)/.test(app.slice(app.indexOf('var selTip = null'), app.indexOf('function paintSelTip'))) && /\.floatPop\.selTip\{/.test(css), 'the selection toolbar is a small copy of the note menu: same panel, same grid, same buttons');
ok(/window\.addEventListener\("keydown", function\(e\)\{\s+if\(!\(e\.ctrlKey \|\| e\.metaKey\)[\s\S]*?\}, true\);/.test(app) && /KeyU/.test(app), 'Ctrl+U is caught on the window in the capture phase, before the browser can open view-source');
ok(/function startNoteResize\(e, n, axis\)/.test(app) && /noteEdgeB/.test(app) && /@media \(pointer:coarse\)\{[\s\S]*?noteEdgeB/.test(css), 'a note can be pulled longer or wider by its edge, with a finger-sized grab bar on touch screens');

ok(/@media \(hover:hover\) and \(prefers-reduced-motion:no-preference\)\{[\s\S]*?#gearBtn:is\(:hover,:focus-visible\) svg\{ transform:rotate\(70deg\)/.test(css) && /@keyframes hbSweep/.test(css), 'the top-bar buttons have one small hover movement each, only where hovering exists and motion is allowed');

// ---- data-safety incident (2026-10-04): share pages, boot-time sanitising, unreadable objects
{
  const at = (t) => app.indexOf(t);
  ok(at('var SHARE_LINK_PAGE = /^#(sb|s)=/.test(location.hash);') > 0, 'a share-link page is identified once, from the address');
  ok(app.includes('if(CLOUD_OK && !singleNoteMode && !SHARE_LINK_PAGE){'), 'a share-link page never starts the account sync, even when signed in');
  ok(app.includes('isShareView: function(){ return SHARE_LINK_PAGE; }') && read('js/sync.js').includes('host.isShareView && host.isShareView()'), 'the sync layer itself refuses to attach from a share-link page');
  ok(app.includes('if(SHARE_LINK_PAGE) return;                       // the shared copies on screen are never written over this account'), 'a share-link page never overwrites the cached board');
  ok(at('var ZONE_MATERIALS = [') > 0 && at('var ZONE_MATERIALS = [') < at('notes = notes.map(sanitizeSafely)'), 'the zone constants exist before the cached board is sanitised at boot (a cached zone used to crash the page)');
  ok(app.split('var ZONE_MATERIALS').length === 2, 'the zone constants are declared exactly once');
  ok(app.includes('notes = notes.map(sanitizeSafely).filter(Boolean)') && app.includes('var o = sanitizeSafely(raw); if(!o) return;'), 'every object is sanitised one at a time: one bad object cannot stop the rest');
  ok(app.includes('protectedIds: function(){ return quarantined; }') && read('js/sync.js').includes('host.protectedIds'), 'an object this device could not read is never sent to the server as a delete');
  ok(app.includes('try{ renderNote(n, false); }catch(err)') && app.includes('try{ renderNote(o, false, {focus:false}); }catch(err)'), 'one object that cannot be drawn does not blank the board');
  ok(!app.includes('notes = notes.map(cloudSanitize)'), 'the old all-or-nothing sanitising is gone');
}

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
