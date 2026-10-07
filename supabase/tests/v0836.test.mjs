// v0.8.3.3 final QA cleanup: zone containment, trash/undo sounds, topbar, zone cursors, shared links window, shortcuts layout, double-click setting, pile tab rail, pile browser.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const app = read('js/app.js'), sp = read('css/spaces.css');
function fn(name) { const i = app.search(new RegExp('(async )?function ' + name + '\\(')); if (i < 0) return ''; let d = 0, j = app.indexOf('{', i); for (let k = j; k < app.length; k++) { if (app[k] === '{') d++; else if (app[k] === '}') { d--; if (!d) return app.slice(i, k + 1); } } return ''; }

// ---- zone containment: run the real functions on a model
{
  const mk = (o) => Object.assign({ rot: 0, x: 0, y: 0, el: { isConnected: true, style: {} } }, o);
  const run = (zone, members) => {
    const notes = [zone].concat(members);
    const ctx = vm.createContext({ notes, Math, Array, isZone: (n) => n.type === 'zone', ZONE_PAD: 10, ZONE_MAX_W: 20000, ZONE_MAX_H: 20000,
      objSize: (o) => ({ w: o.w, h: o.h }), zoneContents: (z) => notes.filter((o) => o !== z && o.type !== 'zone' && o.x + o.w / 2 >= z.x && o.x + o.w / 2 <= z.x + z.w && o.y + o.h / 2 >= z.y && o.y + o.h / 2 <= z.y + z.h) });
    vm.runInContext('var zoneFitting = false;\n' + fn('memberBounds') + fn('zoneFitOne') + fn('zoneFitAll'), ctx);
    return { changed: ctx.zoneFitAll() };
  };
  let z = mk({ type: 'zone', x: 100, y: 100, w: 400, h: 300 }), m = mk({ x: 150, y: 100, w: 200, h: 560 });
  let r = run(z, [m]); ok(r.changed && z.y + z.h >= 100 + 560 + 10 && z.w === 400, 'a member taller than the zone: the zone grows downwards to cover it');
  z = mk({ type: 'zone', x: 100, y: 100, w: 400, h: 300 }); m = mk({ x: 120, y: 150, w: 700, h: 100 }); r = run(z, [m]); ok(z.x + z.w >= 120 + 700 + 10 && z.h === 300, 'a member wider than the zone: the zone grows to the right');
  z = mk({ type: 'zone', x: 100, y: 100, w: 400, h: 300 }); m = mk({ x: 240, y: 330, w: 260, h: 120, rot: 40 }); r = run(z, [m]);
  { const a = 40 * Math.PI / 180, bh = 260 * Math.sin(a) + 120 * Math.cos(a), cy = 330 + 60; ok(z.y + z.h >= cy + bh / 2 + 10 - 1, 'a rotated member near the edge is measured by its rotated bounds (a tilted box reaches further than the flat one)'); }
  z = mk({ type: 'zone', x: 100, y: 100, w: 400, h: 300 }); m = mk({ x: 150, y: 150, w: 100, h: 100 }); r = run(z, [m]); ok(!r.changed && z.w === 400 && z.h === 300, 'a member that fits changes nothing');
  z = mk({ type: 'zone', x: 100, y: 100, w: 800, h: 700 }); m = mk({ x: 150, y: 150, w: 100, h: 100 }); r = run(z, [m]); ok(!r.changed && z.w === 800 && z.h === 700, 'a large zone is never shrunk because its members are small');
  z = mk({ type: 'zone', x: 100, y: 100, w: 400, h: 300 }); m = mk({ x: 150, y: 100, w: 200, h: 560 }); run(z, [m]); ok(m.x === 150 && m.y === 100 && m.w === 200, 'the member is never moved, resized or ejected');
  z = mk({ type: 'zone', x: 100, y: 100, w: 400, h: 300, min: true }); m = mk({ x: 150, y: 100, w: 200, h: 560 }); r = run(z, [m]); ok(!r.changed, 'a minimized zone is left alone');
  z = mk({ type: 'zone', x: 100, y: 100, w: 400, h: 300 }); m = mk({ x: 105, y: 150, w: 160, h: 120 }); r = run(z, [m]); ok(z.x <= 105 - 10 && m.x === 105, 'a member that overhangs the left edge makes the zone grow leftwards while the member stays put');
  ok(/zoneFitAll\(\)/.test(fn('saveNotes')) && /zoneFitAll\(\)\) saveNotes\(\)/.test(app), 'the zone is re-fitted whenever the board is saved (resizes, newspaper growth, photos) and after load / fonts, and saved if it grew');
  ok(/zoneFitting/.test(fn('zoneFitAll')), 'the fit cannot re-enter itself through saveNotes');
}
// ---- sounds
{
  const sfx = app.slice(app.indexOf('var SoundFx'), app.indexOf('function buildSoundsPane'));
  ok(/dim7Blow: \[207\.65, 174\.61, 146\.83, 123\.47\]/.test(sfx) && /name === "trash"/.test(sfx) && /110\.00/.test(sfx), 'Trash: a low B dim7 strummed downwards, settling on A2');
  ok(/name === "undo"/.test(sfx) && /CH\.c69\.slice\(\)\.reverse\(\)/.test(sfx) && /CH\.dim7B\.slice\(\)\.reverse\(\)/.test(sfx), 'Undo: Done played backwards (C6/9 into B dim7, strummed downwards)');
  ok(/SoundFx\.cue\("undo"\)/.test(fn('undo')) && !/SoundFx\.cue\("undo"\)/.test(fn('redo')), 'Undo plays its sound from the person\'s own undo; redo does not');
  ok(/this\.enabled\(\) \|\| this\.volume\(\) <= 0\) return false/.test(sfx) && /navigator\.userActivation/.test(sfx), 'all cues obey the Sounds setting and need a user gesture');
  ok(!/SoundFx/.test(read('js/sync.js')) && !/SoundFx/.test(fn('applySide')), 'sync never plays a sound');
  ok(/B dim7 two octaves down/.test(read('docs/dev/SOUND.md')) && /Undo/.test(read('docs/dev/SOUND.md')), 'Trash and Undo voicings are documented');
  ok(/createDynamicsCompressor/.test(sfx), 'the same compressor / low-pass protects the new cues');
}
// ---- topbar
{
  ok(!/id="quickSignOut"/.test(read('index.html')), 'there is no standalone topbar Sign out button');
  ok(/"Sign out", function\(\)\{ closeFloatingPopovers\(\); confirmSignOut/.test(fn('openAccountMenu')), 'Sign out is still in the avatar menu (with its confirmation)');
}
// ---- zone cursors
{
  ok(/\.zoneBar\{ cursor:grab; \} \.zone\.dragging \.zoneBar, \.zoneBar:active\{ cursor:grabbing; \}/.test(sp), 'grab on the rail, grabbing while dragging');
  ok(/\.zone \.zoneTitle\[contenteditable="true"\]\{ cursor:text; \}/.test(sp) && /\.zone \.zoneTitle, \.zone \.zoneTitle\.editable\{ cursor:inherit; \}/.test(sp), 'the text cursor shows only while the title is being edited');
  ok(/\.zone\.pinned \.zoneBar[^{]*\{ cursor:default; \}/.test(sp), 'a pinned zone shows no draggable cursor');
  ok(/closest\("\.zoneTitle"\)\)\) return; e\.preventDefault\(\); e\.stopPropagation\(\); editZoneTitle\(n\)/.test(fn('renderZone')), 'double-clicking the title (only) starts editing');
}
// ---- shared links
{
  const ms = fn('openManageShares');
  ok(/title: "Shared links"/.test(ms) && /Whole board/.test(ms) && /Selection of notes/.test(ms) && /Single note/.test(ms), 'the window is Shared links, and each kind has a plain name');
  ok(/lkCard/.test(ms) && /lkHead/.test(ms) && /lkMeta/.test(ms) && /chip\("Created /.test(ms) && /"Shown as "/.test(ms) && /"Read only"/.test(ms) && /"Frozen copy"/.test(ms), 'each link is a card: what it is, which board, when, as whom, and its permission');
  ok(/Turn off/.test(ms) && /Stick\.share\.disable\(x\.id\)/.test(ms), 'Turn off still revokes the link');
  ok(/\.lkList\{[^}]*max-height:min\(56vh, 460px\); overflow:auto/.test(sp), 'many links scroll inside the window');
  ok(/@media \(max-width:480px\)\{ \.lkCard\{ flex-wrap:wrap; \}/.test(sp), 'responsive on a phone');
  ok(!/\.slNote|\.slCard/.test(sp.slice(sp.indexOf('/* Shared links window */'), sp.indexOf('/* Shortcuts: the name keeps'))), 'its classes do not collide with the loader\'s .slNote');
  ok(/Manage shared links/.test(app) && !/Manage active shares/.test(app), 'the action says "Manage shared links" everywhere');
}
// ---- shortcuts layout
{
  ok(/\.kbdRow\{ flex-wrap:wrap/.test(sp) && /\.kbdRow \.kbdDesc\{ flex:1 1 14rem; min-width:min\(14rem, 100%\)/.test(sp), 'the shortcut name keeps a readable width; the binding wraps under it');
  ok(/@media \(max-width:560px\)\{ \.kbdRow \.kbdDesc\{ flex-basis:100%/.test(sp) && /word-break:normal/.test(sp), 'narrow widths stack intentionally; no emergency word wrapping');
  ok(/\.kbdGroups\{ grid-template-columns:repeat\(auto-fill, minmax\(min\(100%, 22rem\), 1fr\)\)/.test(sp), 'the groups grid never goes below a readable width');
}
// ---- double-click setting
{
  ok(/cc\.panes\.appearance\.appendChild\(buildInputCard\(\)\)/.test(app) && /"inDbl", "Double-click the canvas creates"/.test(fn('buildInputCard')), 'Appearance (Personalization) has "Double-click the canvas creates"');
  ok(!/buildInputCard|inDbl/.test(fn('buildShortcutsPane')), 'it is not duplicated in the Shortcuts pane');
  ok(/setUiPref\(key, sel\.value\)/.test(fn('buildInputCard')) && /DBL_NODES = \[\["sticky"/.test(app) && /\["ask", "Ask me each time"\]/.test(app), 'it uses the existing preference (sticky, other nodes, Ask me each time), saved on this device and with the account');
  ok((app.match(/var DBL_NODES/g) || []).length === 1, 'one preference source');
}
// ---- pile tab rail
{
  ok(/PILE_TAB_SLOT = 28/.test(app) && /function pileTabSlots\(n\)/.test(app) && /pileTabSlots\(n\)/.test(fn('paintPileTabs')), 'how many tabs fit is computed from the pile width and the reserved kind-tab / button room');
  const ctx = vm.createContext({ Math }); vm.runInContext('var PILE_TABS_MAX = 3, PILE_TAB_SLOT = 28;\n' + fn('pileTabSlots'), ctx);
  ok(ctx.pileTabSlots({ w: 200 }) === 3 && ctx.pileTabSlots({ w: 150 }) === 1 && ctx.pileTabSlots({ w: 260 }) === 3 && ctx.pileTabSlots({}) === 3, 'slots: 3 on a normal pile, never fewer than 1 on a narrow one');
  ok(/\.pileObj \.pileTabs\{[^}]*height:26px[^}]*overflow:visible/.test(sp) && /\.pileObj \.pileTab\{ flex:0 0 26px; width:26px/.test(sp) && /\.pileObj \.pileTab\.on\{ height:26px; margin:0; padding:0/.test(sp), 'a fixed-height rail with fixed 26px slots; the selected tab grows inside it (no negative margin, no overflow:hidden)');
  ok(/\.pileObj \.pileTabs, \.pileObj \.pileKind\{ top:auto; bottom:calc\(100% - 1px\)/.test(sp), 'rail and kind tab hang from the pile\'s top edge and rotate with it');
  ok(!/\.pileObj \.pileTabs\{ max-width:calc\(100% - 118px\); overflow:hidden/.test(sp), 'the clipping overflow:hidden is gone');
}
// ---- pile browser
{
  const pb = fn('openPileBrowser');
  ok(/pbGroup/.test(pb) && /"Arrange the pile"/.test(pb) && /"This paper"/.test(pb) && /foot\.appendChild\(back\)/.test(pb), 'actions are grouped: arrange | this paper | leave');
  ok(/prev\.title = "Previous paper"; next\.title = "Next paper"/.test(pb) && /b\.title = label; b\.setAttribute\("aria-label", label\)/.test(pb), 'every icon has a tooltip and an aria-label');
  ok(/\.pbCard\{ width:min\(420px, 100%\); gap:4px/.test(sp) && /\.pbDesk \.pbStage\{ min-height:0/.test(sp), 'the browser card is compact around the paper');
  ok(/shufflePile\(pile\)/.test(pb) && /movePileMember\(pile, m\.id, -1\)/.test(pb) && /pileTakeTop\(pile, m\.id\)/.test(pb) && /focusPileMember\(pile, m\.id\)/.test(pb) && /closePileBrowser/.test(pb), 'the actions still do what they did (shuffle, reorder, edit, take out, back)');
  ok(/min-height:44px/.test(sp.slice(sp.indexOf('Pile browser: compact'))), 'touch targets stay 44px');
}
console.log('v0.8.3.3 final QA: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
