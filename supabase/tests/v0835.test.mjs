// v0.8.3.3 owner-QA batch: add to pile, pinned zone, pile chrome, double-click, jazz sounds, avatar menu, sharing settings, compact share, newspaper keys / paste / size, photo undo.
import '../../js/objects.js';
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const app = read('js/app.js'), sp = read('css/spaces.css'), O = globalThis.Stick.objects;
function fn(name) { const i = app.search(new RegExp('(async )?function ' + name + '\\(')); if (i < 0) return ''; let d = 0, j = app.indexOf('{', i); for (let k = j; k < app.length; k++) { if (app[k] === '{') d++; else if (app[k] === '}') { d--; if (!d) return app.slice(i, k + 1); } } return ''; }

// ---- add loose papers to an existing pile (run the real function on a model)
{
  const notes = [{ id: 'a', html: 'a' }, { id: 'b', html: 'b' }, { id: 'p', type: 'pile', members: ['m1', 'm2'] }, { id: 'm1', pileId: 'p' }, { id: 'm2', pileId: 'p' }, { id: 'pin', pinned: true }, { id: 'q', type: 'pile', members: [] }];
  const states = []; const toasts = [];
  const ctx = vm.createContext({ notes, toasts, readOnly: false, findNote: (id) => notes.find((n) => n.id === id), isPileObj: (n) => n && n.type === 'pile', isHiddenMember: (n) => !!n.pileId,
    Stick: { pile: { eligible: (o) => !!o && o.type !== 'pile' && !o.pinned, order: (l) => l.slice(), MAX_MEMBERS: 500 } }, toast: (m) => toasts.push(m), endEditing() {}, closeFloatingPopovers() {},
    captureState: (ids) => { states.push(ids.slice()); return {}; }, selected: new Set(['a']), pileBrowse: {}, finishPileChange() {}, setSelection() {}, recordChange: (l) => { states.push(l); return {}; }, undoIfTop() {}, Set });
  vm.runInContext(fn('addToPile'), ctx);
  const n = ctx.addToPile('p', ['a', 'b', 'pin', 'p', 'm1']);
  ok(n === 2 && notes[2].members.join() === 'a,b,m1,m2', 'two loose papers go on top of the existing pile; the pinned one, the pile itself and a member are left out');
  ok(notes[0].pileId === 'p' && notes[1].pileId === 'p' && !notes[5].pileId, 'only pile membership changes (pileId on the added papers)');
  ok(notes.length === 7 && notes.filter((x) => x.id === 'a').length === 1, 'nothing is duplicated or removed from the board list');
  ok(ctx.addToPile('p', ['pin']) === 0 && toasts.some((t) => /can.t go into a pile/.test(t)), 'nothing eligible gives a clear message');
  ok(states.some((s) => Array.isArray(s) && s.includes('m1') && s.includes('a')) && states.includes('Add 2 papers to a pile'), 'the change is recorded as one undoable step that captures the pile and every paper');
  const am = fn('addToPileMenu'); ok(/menuSub\(pop, ICONS\.move, "Add to pile"/.test(am) && /pileChoiceLabel\(p\)/.test(am) && /!targets\.length \|\| !loose\.length/.test(am), 'Add to pile > lists the piles (top paper, count) and only appears when there is something to add');
  ok((app.match(/addToPileMenu\(pop/g) || []).length >= 3 && /addToPile\(inSel\[0\]\.id, ids\)/.test(fn('makePile')), 'offered in the note, paper and selection menus; selecting a pile plus papers and choosing Pile adds them');
  ok(!/notes\.splice|notes\.push/.test(fn('addToPile')), 'no object is removed or added to the board list');
}
// ---- pinned zone
{
  const sd = fn('startDrag');
  ok(/isZone\(primary\) && isPinned\(primary\)\)\{ pendingFront = null; pinTug\(primary\); return; \}/.test(sd), 'a pinned zone does not move, and does not carry its members off with "Move with notes"');
  ok(/group\.filter\(function\(g\)\{ return !isPinned\(g\); \}\)/.test(sd), 'ordinary pin behaviour is unchanged');
  ok(!/isPinned\(z\)|zone\.pinned|z\.pinned/.test(fn('zoneContents') + fn('insideAnyZone')), 'zone membership never depends on the zone being pinned: members stay independently draggable');
  ok(/\.pinTack\{[^}]*pointer-events:none/.test(read('css/app.css')), 'the pin tack never blocks a note under it');
}
// ---- zone heading
{
  ok(/\.zone \.zoneBar\{[^}]*linear-gradient/.test(sp) && /border-bottom:2px solid/.test(sp) && /\.zone \.zoneTitle\{[^}]*color:#2a2619/.test(sp), 'the title rail is a ledger strip with a rule and stronger text');
  ok(/body\.dark \.zone:not\(\.mat-felt\) \.zoneBar/.test(sp) && /mat-felt \.zoneBar/.test(sp), 'dark mode and felt have their own strips');
}
// ---- pile chrome
{
  ok(/\.pileObj \.pileTab\{[^}]*height:20px[^}]*padding:3px 5px 0[^}]*line-height|font:700 0\.7rem\/1/.test(sp) && /overflow:visible/.test(sp), 'index numbers have room and are never clipped');
  ok(/\.pileObj \.pileOpen\{ left:-15px/.test(sp) && /openB\.innerHTML = '<svg/.test(fn('buildPileEl')) && /aria-label", "Browse the papers in this pile"/.test(fn('buildPileEl')), 'Browse is a small paper tab with an icon, still labelled');
  const pb = fn('openPileBrowser');
  ok((pb.match(/ic\('<path/g) || []).length >= 4 && /aria-label", label/.test(pb), 'browser controls are icons with aria-labels and tooltips (back keeps its words)');
  ok(/Back to the pile/.test(pb), 'Back to the pile keeps its text');
  ok(/card\.classList\.toggle\("isFan", fan\)/.test(pb) && /\.pbCard\.isFan\{ background:linear-gradient/.test(sp) && /\.pbFanCard\{[^}]*width:170px/.test(sp), 'the fan is papers on a desk with compact controls');
  ok(/\(k - \(from \+ \(to - from - 1\) \/ 2\)\)/.test(pb), 'the fan is centred on the visible papers');
  ok(/pbSlip \.pbTool\.ico\{ width:44px; min-height:44px/.test(sp), 'icon controls keep 44px targets');
  ok(/addEventListener\("dblclick", function\(e\)\{ e\.preventDefault\(\); e\.stopPropagation\(\); openPileBrowser\(n\); \}, true\)/.test(fn('renderPile')), 'double-click anywhere on a pile opens the browser (capture phase, so no child can swallow it)');
}
// ---- jazz sound
{
  const sfx = app.slice(app.indexOf('var SoundFx'), app.indexOf('function buildSoundsPane'));
  ok(/dim7B: \[246\.94, 293\.66, 349\.23, 415\.30\]/.test(sfx) && /c69: +\[261\.63, 329\.63, 440\.00, 587\.33\]/.test(sfx) && /dim7E/.test(sfx), 'Done is a tiny B diminished-7th resolving to C 6/9; Restore is an Eb diminished-7th sting');
  ok(/createDynamicsCompressor/.test(sfx) && /frequency\.value = 3200/.test(sfx), 'a soft compressor and low-pass keep a chord from clipping');
  ok(!/square|sawtooth/.test(sfx) && /return !!audio\(\)|cue: function/.test(sfx), 'no harsh waveforms');
  ok(/navigator\.userActivation/.test(sfx) && !/SoundFx/.test(read('js/sync.js')), 'still gesture-gated and never played by sync');
  ok(fs.existsSync(path.join(root, 'docs/dev/SOUND.md')) && /B dim7/.test(read('docs/dev/SOUND.md')), 'the voicings are documented');
}
// ---- avatar menu
{
  const am = fn('openAccountMenu');
  ok(/"Account settings"/.test(am) && /"Switch account…"/.test(am) && /"Sign out"/.test(am) && /"Sign in or create an account"/.test(am), 'signed-in: Account settings, Switch account, Sign out; guest: Sign in or create an account');
  const guest = am.slice(am.indexOf('} else {'));
  ok(/Sign in or create an account/.test(guest) && !/Sign out/.test(guest), 'a guest never sees Sign out');
  ok(/confirmDialog\(\{title: "Switch account\?"/.test(am) && /confirmSignOut\(/.test(am), 'switching account and signing out both ask first');
  ok(/accountBtn\.addEventListener\("contextmenu"/.test(app) && /setTimeout\(function\(\)\{ fired = true; openAccountMenu\(\); \}, 550\)/.test(app), 'right-click opens it; a 550 ms long press does on touch, and a plain tap still opens the account window');
}
// ---- sharing settings and the share window
{
  ok(/id="asH2b">Your links/.test(app) && /id="asShares2"/.test(app) && /Printing and saving as a PDF never creates a link/.test(app), 'Settings > Sharing has a Your links card (manage active shares) that explains what a link is');
  ok(/\$\("asShares"\)\.addEventListener\("click", manageShares\); \$\("asShares2"\)\.addEventListener\("click", manageShares\)/.test(app), 'it reuses the existing manager (no duplicate implementation)');
  const ss = app.slice(app.indexOf('var acts = makeDiv("shareActs")'), app.indexOf('var acts = makeDiv("shareActs")') + 6500);
  ok(/Copy link/.test(ss) && /Copy message/.test(ss) && /"Print selection" : "Print"/.test(ss) && /Print \/ Save as PDF/.test(ss) && /<details|createElement\("details"\)/.test(ss) && /What will people see\?/.test(ss) && /Turn this link off/.test(ss), 'the share window keeps every action, folds the explanation into one disclosure, and keeps Turn this link off');
  ok(/frozen copy|Shared links don't expire/.test(ss) || /Shared links don't expire/.test(app), 'the legal / explanatory text is kept');
  ok(/\.shareCompact \.shareTop\{ display:flex/.test(sp) && /max-width:480px\)\{ \.shareCompact \.shareTop\{ flex-direction:column/.test(sp), 'compact on desktop, stacked on a phone');
}
// ---- newspaper
{
  const ef = fn('editPaperField');
  ok(/e\.key === "Tab" && n\.type === "newspaper"/.test(ef) && /\["headline", "sub", "body"\]/.test(ef) && /e\.shiftKey \? -1 : 1/.test(ef), 'Tab goes headline > subheading > story, Shift+Tab back');
  ok(/nx >= 0 && nx < order\.length/.test(ef), 'past the first or last field Tab leaves normally; literal tabs are never inserted');
  ok(/firstImageFile\(cd\)/.test(ef) && /img && !txt\.trim\(\)/.test(ef) && /setNewspaperImage\(/.test(ef), 'an image on the clipboard (with no text) becomes the Newspaper picture while a text field is being edited; text still pastes as text');
  ok(/dt\.items/.test(fn('firstImageFile')), 'a pasted image exposed only as a clipboard item is found too');
  ok(/data-f=/.test(ef), 'the next field is looked up after the edit is saved (the node may re-render)');
  let n = O.normalize({ type: 'newspaper', image: 'data:image/png;base64,AAAA', imgSize: 'small', imgFit: 'contain' }, { safeImage: (s) => s, fontOk: () => true });
  ok(n.imgSize === 'small' && n.imgFit === 'contain', 'picture size and fit are stored on the node');
  n = O.normalize({ type: 'newspaper', image: 'data:image/png;base64,AAAA', imgSize: 'gigantic', imgFit: 'x' }, { safeImage: (s) => s, fontOk: () => true }); ok(n.imgSize === 'full' && n.imgFit === 'cover', 'unknown sizes fall back to full width / cover');
  n = O.normalize({ type: 'newspaper', headline: 'x' }, { safeImage: (s) => s, fontOk: () => true }); ok(!('imgSize' in n), 'no picture, no size fields');
  ok(/"imgSize","imgFit"/.test(app), 'size and fit are saved, synced and undoable fields');
  const pm = fn('paperMenu'); ok(/"Small"/.test(pm) || /\["small", "Small"\]/.test(pm), 'the Picture submenu has Size and Fit choices');
  ok(/\.npFig\.sz-small\{ width:40%/.test(sp) && /\.npFig\.contain img\{ object-fit:contain/.test(sp), 'the sizes and the contain fit are styled');
}
// ---- profile photo
{
  const i = app.indexOf('item("Remove photo"'); const seg = app.slice(i, i + 700);
  ok(/Profile photo removed · Undo/.test(seg) && /stage = prev; refreshHero\(\)/.test(seg), 'removing the photo offers Undo, which puts the previous choice back (nothing is destroyed until Save)');
}
console.log('v0.8.3.3 owner QA: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
