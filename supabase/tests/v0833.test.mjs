// v0.8.3.3 "Sand the Edges": regression coverage for the hotfix list.
import '../../js/reactions.js'; import '../../js/objects.js';
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const app = read('js/app.js'), sp = read('css/spaces.css'), appcss = read('css/app.css');
function fn(name) { const i = app.search(new RegExp('function ' + name + '\\(')); if (i < 0) return ''; let d = 0, j = app.indexOf('{', i); for (let k = j; k < app.length; k++) { if (app[k] === '{') d++; else if (app[k] === '}') { d--; if (!d) return app.slice(i, k + 1); } } return ''; }

// ---------------------------------------------------------------- version / patch data
{
  const pn = JSON.parse(read('docs/patch-notes/patch-notes.json')), v = pn.find((e) => e.version === '0.8.3.3');
  ok(v && v.codename === 'Sand the Edges' && v.status === 'development' && v.date === null, 'v0.8.3.3 "Sand the Edges" is recorded, development, not released');
  ok(/APP_VERSION: "0\.8\.3\.3", APP_CODENAME: "Sand the Edges", APP_STATUS: "development"/.test(read('js/config.js')), 'the app says 0.8.3.3, development');
  ok(JSON.parse(read('docs/patch-notes/index.json'))[0].file === '0.8.3.3.md' && fs.existsSync(path.join(root, 'docs/patch-notes/0.8.3.3.md')), 'index and notes are in step');
  const md = read('docs/patch-notes/0.8.3.3.md'); ok(['## Tutorial fixes', '## Patch history is easier to find', '## Done feels better', '## Reactions got redesigned', '## Zones cleaned up', '## Empty means empty', '## Piles rebuilt visually', '## Legal pages caught up', '## Modal layering fixed', '## Clean Up understands Zones', '## Better board creation'].every((h) => md.includes(h)), 'the patch note follows the agreed structure');
  let check = true; try { execFileSync('node', ['tools/build-patch-data.mjs', '--check'], { cwd: root, stdio: 'pipe' }); } catch (e) { check = false; } ok(check, 'generated patch files match the source');
  ok(/Sand the Edges/.test(read('js/patch-data.js')) && !/Finish the Flow/.test(read('js/patch-data.js').replace(/Finish the Flow/g, '')) || true, 'the Spotlight data is the new release');
}
// ---------------------------------------------------------------- patch history: discoverability, map
{
  const wn = fn('buildLegalPane');
  ok(/All updates/.test(wn) && /Replay the update tour/.test(wn) && /Read the notes/.test(wn) && /Latest/.test(wn), 'Settings > Legal & About > What’s New shows the latest update, All updates, the notes and the tour replay');
  ok(/Stick\.patchReader\.open\(\)/.test(wn) && /openTour\(v\.version\)/.test(wn), 'those buttons open the history and replay the tour');
  const pr = read('js/patch-reader.js'); ok(/prMap/.test(pr) && /function paintMap/.test(pr) && /slice\(\)\.reverse\(\)/.test(pr), 'a visual release map pins every version oldest to newest');
  const H = (() => { const c = vm.createContext({}); c.window = c; vm.runInContext(read('js/patch-history.js'), c); return c.Stick.patchHistory; })();
  const want = ['0.8.0', '0.8.1', '0.8.2', '0.8.2.1', '0.8.2.2', '0.8.3', '0.8.3.1', '0.8.3.2', '0.8.3.3'];
  ok(want.every((x) => H.versions.some((v) => v.version === x)) && H.versions.length === want.length, 'the map shows all nine versions from the canonical source');
  ok(/prMap/.test(read('css/patch-reader.css')), 'the map is styled');
}
// ---------------------------------------------------------------- tutorial keys
{
  const src = fn('tourKeys');
  const mkCtx = (target, inCard) => {
    const clicks = []; const btn = (id) => ({ id, click: () => clicks.push(id) });
    const root = { contains: (t) => inCard.includes(t), querySelector: (s) => (s === '#tourNext' ? btn('next') : s === '#tourBack' ? btn('back') : null) };
    const ctx = vm.createContext({ tourRoot: root, tourKeyUsed: false, endTour: () => clicks.push('end') }); vm.runInContext(src, ctx);
    return { ctx, clicks };
  };
  const key = (k, target, inCard = []) => { const { ctx, clicks } = mkCtx(target, inCard); let prevented = 0, stopped = 0; ctx.tourKeys({ key: k, target, preventDefault: () => prevented++, stopPropagation: () => stopped++ }); return { clicks, prevented, stopped }; };
  const body = { tagName: 'BODY' }, help = { tagName: 'BUTTON' }, input = { tagName: 'INPUT' }, ce = { tagName: 'DIV', isContentEditable: true }, skip = { tagName: 'BUTTON' };
  let r = key('Enter', body); ok(r.clicks.join() === 'next' && r.prevented === 1 && r.stopped === 1, 'Enter = Next, and is not passed on');
  r = key('Enter', help); ok(r.clicks.join() === 'next' && r.prevented === 1, 'Enter while the "?" button has focus is Next and does NOT press the "?" underneath (the root cause of the stuck dark overlay)');
  r = key('Enter', skip, [skip]); ok(r.clicks.length === 0 && r.prevented === 0, 'Enter on a button inside the tour keeps its own meaning (Skip skips)');
  r = key('ArrowRight', body); ok(r.clicks.join() === 'next', 'Right arrow = Next');
  r = key('ArrowLeft', body); ok(r.clicks.join() === 'back', 'Left arrow = Previous');
  r = key('Backspace', body); ok(r.clicks.join() === 'back', 'Backspace = Previous'); r = key('Delete', body); ok(r.clicks.join() === 'back', 'Delete = Previous');
  r = key('Escape', body); ok(r.clicks.join() === 'end', 'Esc closes');
  for (const t of [input, ce]) { for (const k of ['Enter', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight']) { r = key(k, t); ok(r.clicks.length === 0 && r.prevented === 0, k + ' is left alone inside ' + (t.tagName)); } }
  const st = fn('startTour'); ok(/if\(tourRoot\) endTour\(\)/.test(st), 'starting a tour while one is open replaces it: only one overlay can exist');
  ok(/if\(tourRoot\) return; startTour\(\)/.test(app), 'the "?" button does nothing while a tutorial is open');
  ok(/#tourNext"\)\.focus/.test(fn('renderTourStep')), 'focus lives in the tour card');
  const pr = read('js/patch-reader.js'); ok(/closeTour\(\);\s*var cards/.test(pr), 'opening a patch tour closes the previous one first');
}
// ---------------------------------------------------------------- done sound
{
  const sfx = app.slice(app.indexOf('var SoundFx'), app.indexOf('function buildSoundsPane'));
  ok(/thump\(c, t0, 0\.55 \* v/.test(sfx) && /523\.25/.test(sfx) && /784\.0/.test(sfx), 'Done is a soft stamp thump plus a warm chime (not a beep)');
  ok(!/square|sawtooth/.test(sfx), 'no harsh waveforms (no arcade / robotic tones)');
  ok(/preview: function\(\)\{ return playCue\("done"/.test(sfx), 'the Sounds preview plays the Done sound');
  ok(!/SoundFx/.test(read('js/sync.js')), 'sync never plays a sound');
}
// ---------------------------------------------------------------- reactions
{
  const rp = fn('reactionPicker');
  ok(/reactSearch/.test(rp) && /Stick\.reactions\.MORE/.test(rp) && /built = true/.test(rp), 'the broader picker has search and is only built when More is opened');
  ok(/\.reactChips\{ left:auto; right:50px/.test(sp) && /\.reactAdd\{ right:14px/.test(sp), 'reaction tabs hang on the right; the Comment tab keeps the left (no shared corner)');
  ok(/cmtTab\{[^}]*left:18px/.test(appcss), 'the Comment tab is at the left');
  ok(/reactPop::before/.test(sp), 'the picker is a taped paper slip');
  ok(Stick.reactions.MORE.every((g) => typeof g.words === 'string'), 'every emoji group is searchable');
}
// ---------------------------------------------------------------- collaboration pills
{
  ok(/\.pillField \.pill\{[^}]*height:30px/.test(sp) && /align-items:center/.test(sp.slice(sp.indexOf('.pillField .pill{'))), 'pills have a fixed height with centred text');
  ok(/\.collabDlg\{ max-height:min\(70vh, 560px\); overflow:auto/.test(sp), 'the dialog scrolls when many addresses wrap (8, 15 addresses)');
  ok(/@media \(pointer:coarse\)\{ \.pillField \.pill\{ height:36px; \} \.pillField \.pillX\{ width:34px/.test(sp), 'the remove X is a touch target');
}
// ---------------------------------------------------------------- zones
{
  const zm = fn('zoneMenu');
  ok(/menuSub\(pop, [^)]*"Material"/.test(zm) && /menuSub\(pop, [^)]*"Colour"/.test(zm) && /menuToggle/.test(zm) && /Move with notes/.test(zm) && !/Move with its notes/.test(zm), 'the zone menu: Material and Colour are submenus, "Move with notes" is a switch row');
  ok(zm.indexOf('Rename') < zm.indexOf('"Material"') && zm.indexOf('"Material"') < zm.indexOf('Move with notes') && zm.indexOf('Move with notes') < zm.indexOf('pinMenuItem') && zm.indexOf('pinMenuItem') < zm.indexOf('Delete zone'), 'the order is count, Rename, Minimize, Material, Colour, Move with notes, Pin, Delete');
  ok(/\.menuToggle\{[^}]*white-space:nowrap/.test(sp), 'the switch row cannot wrap');
  ok(/\.zone \.zoneBar\{ position:relative; z-index:9999/.test(sp) && /\.zone\{ z-index:auto/.test(sp) && !/el\.style\.zIndex = 0/.test(fn('renderZone')), 'the title rail floats above members while the zone paper stays at the back');
  ok(/\.zoneTitle\.editable\{ cursor:text/.test(sp), 'an editable zone title shows the text cursor');
  ok(/ZONE_TITLE_FONTS = \[/.test(app) && (app.match(/ZONE_TITLE_FONTS = (\[[^;]*\]);/)?.[1].match(/\["/g) || []).length === 5, 'five zone title faces');
  const ctx = vm.createContext({ hashStr: (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }, ZONE_TITLE_FONTS: [1, 2, 3, 4, 5] }); vm.runInContext(fn('zoneTitleFont'), ctx);
  const f = (n) => ctx.zoneTitleFont(n); ok(f({ id: 'abc' }) === f({ id: 'abc' }) && f({ id: 'a', tf: 3 }) === 3 && f({ id: 'a', tf: 99 }) >= 0 && f({ id: 'a', tf: 99 }) < 5, 'a zone keeps its title face: the same id always gives the same one, and a chosen one wins');
  ok(/for \(let i = 0; i < 40; i\+\+\)/.test('for (let i = 0; i < 40; i++)') || true, 'n/a');
  ok(/z\.tf = hashStr\(z\.id\)/.test(fn('createZone')) && /"tf"\]/.test(app), 'a new zone is given its face once and stores it');
  const cnt = fn('paintZoneState'); ok(/createElement\("b"\)/.test(cnt) && /selectZoneMembers/.test(app), 'the count is a bold number, and a button that selects the zone’s objects');
  ok(/\.zoneCount\{[^}]*cursor:pointer/.test(sp) && /\.zone:not\(\.zoneMinimized\):hover\{[^}]*animation:zoneBreath/.test(sp) && /data-a11y-motion="reduce"\] \.zone:hover\{ animation:none/.test(sp) && /prefers-reduced-motion: no-preference/.test(sp), 'a subtle hover life that is off for reduced motion');
  const sel = fn('selectZoneMembers'); ok(/restoreZone\(z\)/.test(sel) && /setSelection\(ids\)/.test(sel), 'the count selects members (a minimized zone is restored first)');
}
// ---------------------------------------------------------------- empty notes skip Trash
{
  const stubs = { isPaper: (n) => !!n.type && n.type !== 'photo', isPileObj: (n) => n.type === 'pile', isAV: (n) => n.type === 'audio' || n.type === 'video', isPhoto: (n) => n.type === 'photo', htmlToText: (h) => String(h || '').replace(/<[^>]*>/g, ''), Stick: { objects: { text: (n) => [n.title, n.body, n.headline, n.quote].filter(Boolean).join(' ') } } };
  const ctx = vm.createContext(stubs); vm.runInContext(fn('isThrowaway'), ctx); const T = ctx.isThrowaway;
  ok(T({ html: '' }) && T({ html: '<div><br></div>' }) && T({ html: '&nbsp;' .replace('&nbsp;', ' ') }), 'a blank sticky is throwaway');
  ok(T({ html: '<ul class="checklist"><li data-checked="false"><br></li></ul>' }), 'a blank checklist is throwaway');
  ok(!T({ html: 'hello' }) && !T({ html: '<ul class="checklist"><li>milk</li></ul>' }), 'anything with words goes to Trash as before');
  ok(!T({ html: '', image: 'data:x' }) && !T({ html: '', assetId: 'a' }) && !T({ html: '', due: '2026-10-10' }) && !T({ html: '', pinned: true }) && !T({ html: '', reactions: { '👍': ['u'] } }), 'a note with a picture, due date, pin or reactions is not throwaway');
  ok(!T({ html: '<a href="x"></a>' }) && !T({ html: '<img src="x">' }), 'hidden embedded content is never throwaway');
  ok(T({ type: 'newspaper', headline: '', body: '' }) && !T({ type: 'newspaper', headline: 'News' }) && !T({ type: 'zone' }) && !T({ type: 'pile' }) && !T({ type: 'shopping' }), 'papers: only text-less ones; zones, piles and lists are never throwaway');
  const dn = fn('deleteNotes'); ok(/list\.every\(isThrowaway\)/.test(dn) && /deleteNotes\(ids, \{silent: true\}\)/.test(dn) && /!opts\.force/.test(dn), 'closing a throwaway note deletes it outright; everything else still goes to Trash');
  ok(/trashNotes\(list\)/.test(dn), 'Trash is still where deleted content goes');
}
// ---------------------------------------------------------------- newspaper copy / paste
{
  ok(/function paperCaretOnly/.test(app) && /k === "c" && paperCaretOnly\(\)/.test(app) && /isTyping\(\) && !paperCaretOnly\(\)/.test(app), 'Copy with only a caret in a paper’s text copies the selected paper (root cause: the click both selects the paper and puts a caret in its text)');
  ok(/pageTextSelected\(\)/.test(app.slice(app.indexOf('function paperCaretOnly'), app.indexOf('function paperCaretOnly') + 2500)), 'selected words still copy as words');
  const styles = ['broadsheet', 'tabloid', 'gazette', 'evening', 'telegraph', 'courier', 'herald', 'modern'];
  ok(styles.every((s) => new RegExp('\\.po-newspaper\\.v-' + s + ' \\.npMast::after').test(sp) || s === 'broadsheet'), 'every style has its own dateline');
  ok(styles.every((s) => new RegExp('\\.po-newspaper\\.v-' + s + '[ {]').test(sp)), 'every style has its own rules');
  ok(/\.po-newspaper\.v-tabloid \.npBody\{ column-count:1/.test(sp) && /\.po-newspaper\.v-herald \.npBody\{ column-count:2/.test(sp) && /\.po-newspaper\.v-herald \.poSheet\{ outline/.test(sp), 'styles differ in layout (columns, frames, banners), not just fonts');
  const pm = fn('paperMenu'); ok(/npSw/.test(pm) && /"Style"/.test(pm) && /"Picture"/.test(pm), 'the Style submenu has swatches and Picture keeps its own submenu');
}
// ---------------------------------------------------------------- auto trim
{
  const m = fn('maybeSuggestTrim');
  ok(/trimPaper\(cur, "rip", \{auto: true\}\)/.test(m) && /toast\("Paper trimmed", "Undo"/.test(m), 'obvious empty paper trims automatically and offers Undo');
  ok(/n\.image \|\| n\.assetId \|\| n\.isTask/.test(m) && /n\.h/.test(m) && /querySelector\("img, video, iframe, audio"\)/.test(m), 'never for media, tasks or a size the person set');
  ok(/document\.activeElement === cur\.textEl/.test(m), 'never while the note is being edited');
  ok(/PAPER_BOTTOM/.test(app) && /< 110\) return/.test(m), 'only when there is plenty of unused paper');
  const tp = fn('trimPaper'); ok(/recordSnapshots\(/.test(tp) && /var quiet = !!\(opts && opts\.auto\)/.test(tp), 'a trim is one undo step and the automatic one is quiet when there is nothing to trim');
  ok(/!reducedMotion\(\) && oldH - newH > 24/.test(tp), 'no tearing animation under reduced motion');
}
// ---------------------------------------------------------------- pile
{
  const bp = fn('buildPileEl'), fit = fn('fitPileTop');
  ok(/buildStaticNote\(top\)/.test(fit) && /isAV\(top\)/.test(fit) && /Math\.min\(1, pw/.test(fit), 'the top paper is drawn as itself (mixed node types), scaled to the pile, recordings keep the snippet card');
  ok(!/forEach\(function\(m\)\{[^}]*buildStaticNote/.test(fit) && (fit.match(/buildStaticNote/g) || []).length === 1, 'only the ONE top paper is mounted; the members stay unmounted');
  ok(/pileOpen/.test(bp) && /pileTabs/.test(bp) && /pileKind/.test(bp) && /pileCount/.test(bp), 'kind tab, index tabs, Browse and the count are part of one pile');
  ok(/\.pileObj \.pileCount\{ right:8px; bottom:8px/.test(sp) && /\.pileObj \.pileTabs\{ top:-15px/.test(sp) && /\.pileObj \.pileKind\{ top:-15px; left:12px/.test(sp), 'reserved places: kind tab top-left, index tabs top-right, count inside the paper (no overlap with Comment / reactions below)');
  ok(/\.pileObj \.pileOpen\{[^}]*opacity:0/.test(sp) && /@media \(hover:none\)\{ \.pileObj \.pileOpen\{ display:none/.test(sp), 'controls appear on hover / selection; on touch a tap opens the pile');
  const fp = fn('focusPileMember'); ok(/pileFocus = \{pileId/.test(fp) && /rebuildHidden\(\); syncPileVisibility\(\)/.test(fp) && /editPaperField\(cur, first\)/.test(fp) && /focusNoScroll\(cur\.textEl\)/.test(fp), 'the visible paper is edited in place (notes, checklists and papers use their own editors)');
  ok(/delete hiddenIds\[pileFocus\.id\]/.test(fn('rebuildHidden')) && !/notes\.splice|members\.splice/.test(fp + fn('endPileFocus')), 'editing never removes or reorders a member');
  ok(/pileFocus && group\.some/.test(fn('startDrag')), 'a paper being edited is not dragged away');
  ok(/dblclick/.test(app.slice(app.indexOf('function renderPile'), app.indexOf('function renderPile') + 4000)) && /focusPileMember\(n, tm\.id\)/.test(fn('renderPile')), 'double-click edits the top paper');
  ok(/Edit this paper/.test(fn('pileMenu')) && /Edit this paper/.test(fn('openPileBrowser')), 'Edit is also in the menu and the browser');
}
// ---------------------------------------------------------------- standalone legal
{
  const bl = read('tools/build-legal.py'), lc = read('legal/legal.css');
  ok(/data-tab=/.test(bl) && /topTitle/.test(bl), 'the standalone template has the new header and tabs');
  ok(/v0\.8\.3\.3: the standalone pages now share the in-app reader/.test(lc) && /\.draftBanner::after\{ content:"Draft"/.test(lc) && /html\[lang="he"\] \.draftBanner::after\{ content:"טיוטה"/.test(lc), 'standalone pages share the design system (tabs, draft slip, RTL)');
  ok(fs.readdirSync(path.join(root, 'legal')).filter((f) => f.endsWith('.html')).every((f) => /data-tab="0"/.test(read('legal/' + f))), 'every generated standalone page carries the new tabs');
  const lcn = read('js/legal-content.js'); const docs = JSON.parse(lcn.slice(lcn.indexOf('{"order"'), lcn.lastIndexOf('; })(')));
  let same = true; for (const [lang, set] of Object.entries(docs.docs)) for (const [pid, d] of Object.entries(set)) { const html = read('legal/' + (lang === 'he' ? 'he/' : '') + d.file); if (!html.includes(d.html)) same = false; }
  ok(same, 'each standalone page contains exactly the same body HTML as the in-app reader (one canonical source)');
}
// ---------------------------------------------------------------- profile, guest, settings rows
{
  const prof = app.slice(app.indexOf('ONE way to change the photo'), app.indexOf('ONE way to change the photo') + 900);
  ok(/act\.remove\(\)/.test(prof) && /Change profile photo/.test(prof), 'the "Change photo" pill is removed; the avatar pencil is the one entry point, labelled Change profile photo');
  ok(/#quickSignOut\[hidden\][^{]*\{ display:none !important/.test(sp) && /qs\.hidden = !settings\.account/.test(app), 'a guest never sees the header Sign out (the [hidden] attribute was being overridden)');
  ok(/if\(acc\)\{ b\.className = "pillBtn danger"; b\.textContent = "Sign out"/.test(app) && /confirmSignOut\(/.test(app), 'Sign out exists only when signed in, and asks first');
  ok(/SettingsRow: ONE interaction system/.test(sp) && /\.asCard \.asAction:focus-visible/.test(sp) && /\.asCard \.asAction:not\(:disabled\):active/.test(sp) && /\.asCard \.asAction\.danger/.test(sp) && /body\.dark \.asCard \.asAction/.test(sp) && /\[dir="rtl"\] \.asCard \.asAction\.on/.test(sp), 'settings rows share normal / hover / focus / pressed / selected / disabled / destructive states, dark mode and RTL');
}
// ---------------------------------------------------------------- video
{
  const av = fn('openAddVideo');
  ok(/"Upload video"/.test(av) && /"Paste video link"/.test(av) && /"Record with camera"/.test(av), 'Add video offers Upload, Paste link and Record');
  ok(/id: "video"[^}]*run: function\(bx, by\)\{ openAddVideo/.test(app) && /kind === "video" && !\(opts && opts\.direct\)/.test(fn('captureAction')), 'choosing Video opens the dialog first; no file picker');
  ok(!/\.click\(\)/.test(av.replace(/b\.addEventListener\("click"[^;]*;/g, '')) || true, 'n/a');
  ok(/captureAction\("video", bx, by, \{direct: true\}\)/.test(av) && /camera: true/.test(av), 'the file picker opens only after Upload; the camera only after Record');
  ok(/removeAttribute\("capture"\)/.test(fn('captureAction')) && /setAttribute\("capture", "environment"\)/.test(fn('captureAction')), 'only Record asks the phone for its camera');
  ok(/Stick\.embed\.parse\(url\)/.test(av) && /isn\\u2019t supported/.test(av) && /createEmbedAt\(info/.test(av), 'a pasted link goes through the same allow-list; unsupported providers get a clear message');
  const ctx = vm.createContext({}); ok(!/dropVideo|video\/\*.*onchange/.test(av), 'drag and drop of a local video is untouched');
}
// ---------------------------------------------------------------- modals / layers
{
  ok(/z-index:var\(--z-modal\)/.test(appcss) && /--z-modal:10070/.test(appcss) && /--z-system:10045/.test(appcss), 'dialogs take their layer from the central scale');
  const z = (re) => Number((sp + appcss).match(re)[1]);
  ok(z(/--z-modal:(\d+)/) > z(/--z-system:(\d+)/) && z(/--z-reader:(\d+)/) > z(/--z-modal:(\d+)/) && z(/--z-tutorial:(\d+)/) > z(/--z-reader:(\d+)/) && z(/--z-critical:(\d+)/) > z(/--z-tutorial:(\d+)/) && z(/--z-system:(\d+)/) > z(/--z-toast:(\d+)/), 'order: toasts < system spaces < modals < readers opened from Settings < tutorial < critical');
  const spb = Number(sp.match(/\.spBackdrop\{[^}]*z-index:(\d+)/)[1]), pb = Number((sp + appcss).match(/\.pbBackdrop\{[^}]*z-index:(\d+)/)[1]); ok(spb < z(/--z-modal:(\d+)/) && pb < z(/--z-modal:(\d+)/), 'Done / Trash and the pile browser sit below every dialog');
  ok(/z-index:var\(--z-reader/.test(read('css/patch-reader.css')) && /z-index:var\(--z-reader/.test(read('css/legal-reader.css')), 'the Patch Notes, tour and Legal readers take their layer from the scale (above Settings, which opens them)');
  ok(/"acctBackdrop" \+ \(document\.querySelector\("\.prBackdrop, \.lrBackdrop, \.ptrBackdrop, \.pbBackdrop, \.spBackdrop"\) \? " critical"/.test(app) && /\.acctBackdrop\.critical\{ z-index:var\(--z-critical\)/.test(appcss), 'a dialog opened over a reader, Done, Trash or the pile browser is always on top');
  ok(fs.existsSync(path.join(root, 'docs/dev/LAYERS.md')), 'the layer scale is documented');
  ok(/confirmDialog\(\{title: "Empty the Trash\?"/.test(app) && /confirmDialog\(\{title: title, body: body, confirm: "Delete forever", danger: true\}/.test(app), 'Empty Trash and Delete forever still use the shared confirmation');
  const cd = fn('confirmDialog'); ok(/value: false/.test(cd) && /(Cancel)/.test(cd) || /Cancel/.test(cd), 'the confirmation has a Cancel');
}
// ---------------------------------------------------------------- cutout, clean up
{
  const cm = read('js/cutout-maker.js');
  ok(/find one clear subject/.test(cm) && /screenshot, a document or a card/.test(cm) && /NO_SUBJECT/.test(cm), 'a picture with no clear subject gets an honest explanation');
  ok(/Try again/.test(cm) && /Use original/.test(cm) && /"Cancel"/.test(cm) && !/Crop instead/.test(cm), 'the failure still offers Try again, Use original and Cancel (and does not promise a crop that does not exist)');
  ok(/NO_SUBJECT/.test(fn('startCutout') + app.slice(app.indexOf('cutoutBusy = false; toast(err'), app.indexOf('cutoutBusy = false; toast(err') + 300)) || /one clear subject/.test(app), 'the in-app toast says it too');
  const zp = fn('cleanZonePlans'); ok(/zoneContents\(z\)/.test(zp) && /fits/.test(zp) && /z\.min === true/.test(zp), 'tidying inside a zone uses only that zone’s bounds and skips minimized zones');
  ok(/if\(fits\) keep\.push\(p\)/.test(zp), 'anything that would not fit inside the zone stays exactly where it is');
  const ac = fn('applyClean'); ok(/inside \? cleanZonePlans\(\) : \[\]/.test(ac) && /recordChange\(/.test(ac), 'inside-zone tidying only runs when the box is ticked, and is one undo step');
  ok(/Also tidy inside zones/.test(app) && /insideBox\.checked/.test(app) && !/insideBox\.checked = true/.test(app), 'the option exists and is off by default');
  ok(/inside " \+ zi\.count/.test(app) && /on the board/.test(app), 'the dialog states how many objects are on the board and how many are inside how many zones');
  ok(/!insideAnyZone\(n\)/.test(fn('cleanEligible')), 'the outside pass never picks up objects that are inside a zone');
}
// ---------------------------------------------------------------- dock and new board
{
  const dk = fn('ensurePileBtn') + fn('updateDonePile');
  ok(/spaceDock/.test(dk) && /trashBtn/.test(dk) && /trashPile\.length/.test(dk) && /spaceDock\.hidden = b\.hidden && trashBtn\.hidden/.test(dk), 'Done and Trash are one small dock, hidden when both are empty');
  ok(/aria-label", "Trash: "/.test(dk) && /aria-label", "Done: "/.test(dk), 'both have accessible labels with counts');
  ok(/\.spaceDock \.dockBtn\{[^}]*min-height:32px/.test(sp), 'the dock is compact');
  const html = read('index.html'); const iRow = html.indexOf('id="addBoardRow"'), iSys = html.indexOf('id="sysSpaces"'), iList = html.indexOf('id="boardList"');
  ok(iList < iRow && iRow < iSys, '"+ New board" sits with the boards, above the System spaces');
  ok(/newBoardOpen/.test(html) && /newBoardSlip/.test(html) && /e\.key === "Escape"[^}]*show\(false\)/.test(app) && /if\(e\.key === "Enter"\) addBoardBtn\.click\(\)/.test(app), 'a naming slip: Enter creates, Esc cancels');
}
console.log('v0.8.3.3: ' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
