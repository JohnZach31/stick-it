// v0.8.3.2 "Finish the Flow", part three: reactions, zones, newspaper picture, pile, legal reader, input prefs, sounds.
import '../../js/reactions.js'; import '../../js/objects.js';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const app = read('js/app.js');
function fn(name) { const i = app.search(new RegExp('function ' + name + '\\(')); if (i < 0) return ''; let d = 0, j = app.indexOf('{', i); for (let k = j; k < app.length; k++) { if (app[k] === '{') d++; else if (app[k] === '}') { d--; if (!d) return app.slice(i, k + 1); } } return ''; }
const RR = globalThis.Stick.reactions, O = globalThis.Stick.objects, css = read('css/spaces.css');

// ---- reactions
ok(RR.isEmoji('👍') && RR.isEmoji('🎉') && RR.isEmoji('🇮🇱') && RR.isEmoji('👨‍👩‍👧') && !RR.isEmoji('<b>') && !RR.isEmoji('abc') && !RR.isEmoji('👍👍'), 'any one emoji is allowed; text and markup are not');
let r = RR.toggle({}, '🎉', 'u1'); ok(r['🎉'].length === 1 && Object.keys(RR.toggle(r, '🎉', 'u1')).length === 0, 'a broader emoji toggles on and off');
let many = {}; RR.MORE.flatMap((g) => g.items).slice(0, 20).forEach((e) => { many = RR.toggle(many, e, 'u1'); });
ok(Object.keys(many).length === RR.MAX_KINDS, 'an object keeps at most ' + RR.MAX_KINDS + ' kinds of reaction');
ok(RR.SET.length === 6 && RR.MORE.length >= 4 && RR.MORE.every((g) => g.items.length > 5 && g.items.every(RR.isEmoji)), 'the quick six plus a broader palette of real emoji');
const sm = RR.summary({ '🎉': ['a'], '👍': ['a', 'b'] }, 'a'); ok(sm[0].emoji === '👍' && sm[1].emoji === '🎉', 'quick emoji first, then the others');
ok(/reactQuick/.test(fn('reactionPicker')) && /reactMoreBtn/.test(fn('reactionPicker')) && /Stick\.reactions\.MORE/.test(fn('reactionPicker')), 'the picker shows the quick six with a "+" for more');
ok(!/React/.test(fn('openObjectMenu')) && !/reaction/i.test(fn('paperMenu')), 'reactions are not an item in the "..." menu');
ok(/min-width:44px|width:44px; height:44px/.test(css), 'reaction buttons are 44px');

// ---- zones as containers
ok(/ZONE_MAX_W = 20000/.test(app) && /ZONE_MIN_W = 120/.test(app), 'zones are no longer capped at 1000 x 1600');
ok(/"min","hold"/.test(app), 'minimized state and the held ids are stored and synced fields');
const mz = fn('minimizeZone') + fn('restoreZone');
ok(!/notes\.splice|removeNoteEl|trashPile|donePile/.test(mz) && /syncPileVisibility\(\)/.test(mz), 'minimizing never removes anything from the object list; it only changes what is drawn');
ok(/recordChange\("Minimize zone"/.test(mz) && /recordChange\("Restore zone/.test(mz), 'minimize and restore are undoable');
ok(/zoneHolder\[id\] = z\.id/.test(fn('rebuildHidden')) && /zone: zoneHolder\[n\.id\]/.test(app), 'search finds objects hidden by a minimized zone');
ok(/restoreZone\(zn, \{quiet: true\}\)/.test(fn('goToSearchHit')), 'jumping to a search hit restores the zone');
ok(/zoneCount/.test(fn('paintZoneState')) && /zoneMember/.test(fn('syncZoneMembership')) && /zoneOwns/.test(fn('syncZoneMembership')), 'a zone shows how many objects belong to it, and who belongs to whom');
ok(/\.zone\.zoneMinimized\{ height:auto !important/.test(css), 'a minimized zone shows only its strip');
ok(app.includes('(b.min === true ? zoneHeld(b)'), 'dragging a minimized zone carries what it holds');
ok(/notes\.concat\(donePile, trashPile\)/.test(app) || /donePile/.test(app), 'Done and Trash rows remain in the sync snapshot (a zone never hides them from sync)');

// ---- newspaper picture
{
  const h = { safeImage: (s) => (/^data:image\//.test(s) ? s : null), fontOk: () => true };
  const png = 'data:image/png;base64,AAAA';
  let n = O.normalize({ type: 'newspaper', headline: 'x', image: png, imgMode: 'color', halftone: true, imgRatio: 0.5 }, h);
  ok(n.image === png && n.imgMode === 'color' && n.halftone === true && n.imgRatio === 0.5, 'a newspaper keeps its picture, color mode and halftone');
  n = O.normalize({ type: 'newspaper', headline: 'x', image: png }, h); ok(n.imgMode === 'bw' && !n.halftone, 'a new picture prints black and white by default');
  n = O.normalize({ type: 'newspaper', headline: 'x' }, h); ok(!('image' in n) && !('imgMode' in n) && !('imgRatio' in n), 'a newspaper without a picture is unchanged');
  n = O.normalize({ type: 'newspaper', image: 'javascript:alert(1)', imgMode: 'weird' }, h); ok(!n.image && !n.imgMode, 'an unsafe image is dropped');
  const sv = O.sanitize({ id: 'a', x: 1, y: 2, z: 1, rot: 0, type: 'newspaper', image: png, assetId: '11111111-1111-4111-8111-111111111111', imgMode: 'bw' }, h);
  ok(!sv.image && sv.assetId && sv.imgMode === 'bw', 'what goes to the server carries the asset id and the print mode, never image bytes');
  ok(O.sizeEstimate({ type: 'newspaper', w: 300, body: 'x', image: png, imgRatio: 0.667 }).h > O.sizeEstimate({ type: 'newspaper', w: 300, body: 'x' }).h, 'a picture makes the estimated height larger');
  ok((read('js/sync.js').match(/"newspaper"/g) || []).length >= 3, 'the picture is uploaded and loaded like a postcard picture');
  const pm = fn('paperMenu');
  ok(/pickNewspaperImage/.test(pm) && /removeNewspaperImage/.test(pm) && /Halftone print/.test(pm) && /Black & white/.test(pm) && /"Color"/.test(pm), 'the menu can add, replace, remove, switch color / black & white and toggle halftone');
  ok(/recordChange\("Remove newspaper picture"/.test(fn('removeNewspaperImage')) && /Replace newspaper picture/.test(fn('pickNewspaperImage')), 'each picture change is one undo step');
  ok(/filter:grayscale\(1\)/.test(css) && !/canvas|toDataURL/.test(fn('buildNewspaperSheet')), 'black & white is a print treatment (CSS); the original is never redrawn');
}

// ---- pile
{
  ok(/pileKind/.test(fn('buildPileEl')) && /pileTabs/.test(fn('buildPileEl')) && /PILE_TABS_MAX/.test(app), 'a pile shows a kind tab and a row of index tabs');
  ok(!/notes\.splice|members\.splice|pileId/.test(fn('paintPileTabs')), 'the index only changes which paper shows; no membership changes');
  ok(/@media \(hover:none\)\{ \.pileObj \.pileTabs\{ display:none/.test(css), 'on touch the tabs are hidden: a tap opens the pile, one paper at a time');
}

// ---- legal reader
{
  const lr = read('js/legal-reader.js'), lcss = read('css/legal-reader.css');
  ok(/lrHeadMain/.test(lr) && /lrSlipTag/.test(lr) && /data-tab/.test(lr), 'header group, draft slip and tab colours are in the reader');
  ok(/max-width:380px/.test(lcss) && /max-width:640px/.test(lcss) && /\.lrDoc\[data-tab="1"\]/.test(lcss), 'tabs have colours and the phone sizes are covered');
  ok(/min-height:44px/.test(lcss), 'touch targets are 44px on phones');
  ok(/DRAFT/.test(read('js/legal-content.js')), 'canonical legal content (still DRAFT) is untouched');
}

// ---- input prefs
{
  ok(/DBL_NODES = \[\["sticky"/.test(app) && /\["ask", "Ask me each time"\]\];/.test(app), 'double-click node list: sticky is first, "Ask me each time" is last');
  ok(/openInsertMenu\(e\.clientX, e\.clientY, bx, by\)/.test(fn('createAtDoubleClick')), '"Ask me each time" opens the compact insertion menu where you clicked');
  ok(/saveUiPrefs\(next\)/.test(fn('setUiPref')) && /Stick\.auth\.user\(\)/.test(fn('setUiPref')), 'signed-in users sync the choice; guests keep it on the device');
  ok(/pasteText: "ask"/.test(app), 'pasted text asks by default');
}

// ---- sounds / done
{
  const de = fn('doneEffect');
  ok(/doneRingFx/.test(de) && /700\)/.test(de), 'the Done effect is stronger and ends within 700 ms');
  ok(/prefers-reduced-motion: reduce\)\{ \.doneRingFx/.test(css), 'reduced motion hides the ring too');
  ok(!/AudioContext/.test(app.slice(0, app.indexOf('var SoundFx'))), 'no audio is created before the sound module (nothing autoplays on load)');
  ok(/cue: function\(name\)/.test(app) && /navigator\.userActivation/.test(app), 'cues only play after a user gesture');
  ok(['markDone', 'markDoneGroup', 'trashNotes', 'restoreFromTrash', 'restoreFromPile'].every((f) => /SoundFx\.cue\(/.test(fn(f))), 'Done, Trash and Restore cues come from the user actions, not from sync');
  ok(!/SoundFx/.test(read('js/sync.js')) && !/SoundFx\.cue/.test(fn('applySide')), 'a remote change never plays a sound (no duplicate echoes)');
  ok(/this\.enabled\(\) \|\| this\.volume\(\) <= 0\) return false/.test(app), 'cues respect the Sounds setting and volume');
}
console.log('v0.8.3.2c: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
