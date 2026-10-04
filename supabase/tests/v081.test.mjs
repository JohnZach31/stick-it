// v0.8.1 "One Place": unit tests for the pure rules that live inside js/app.js (pasting, clean-up layout, torn edges), plus guards for the
// Control Center architecture. The functions are lifted out of the source text and run in a plain VM, so what is tested is what ships.
//   node v081.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const app = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8').replace(/\r\n/g, '\n');
const css = fs.readFileSync(path.join(root, 'css', 'app.css'), 'utf8').replace(/\r\n/g, '\n');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const slice = (from, to) => { const a = app.indexOf(from), b = app.indexOf(to, a); if (a < 0 || b < 0) throw new Error('marker not found: ' + from); return app.slice(a, b); };
const sandbox = (code, extra = {}) => { const ctx = vm.createContext({ Math, Array, Object, String, Number, console, ...extra }); vm.runInContext(code, ctx); return ctx; };

// ---- pasting: a transparent background is not a highlight
{
  const ctx = sandbox(slice('function hasRealBackground(style){', 'function cleanPastedHtml'));
  const f = ctx.hasRealBackground;
  ok(f('background-color: rgba(0, 0, 0, 0);') === false, 'rgba(0,0,0,0) (what browsers write on copied text) is no background');
  ok(f('color:red; background-color: transparent') === false, '"transparent" is no background');
  ok(f('background: initial') === false && f('background-color: inherit') === false, 'initial / inherit are no background');
  ok(f('background-color: rgb(255, 235, 59)') === true, 'a real colour is a highlight');
  ok(f('background: #fff3a8') === true, 'a hex colour is a highlight');
  ok(f('background-color: rgba(255, 235, 59, 0.5)') === true, 'a half-transparent colour still is');
  ok(f('background-color: rgba(10, 20, 30, 0)') === false, 'alpha 0 with any colour is none');
  ok(f('') === false && f('color: red') === false, 'no background declared is no background');
}

// ---- clean-up layout: reading order, no overlaps, nothing under the header, nothing lost
{
  const code = 'var CLEAN_BAND = 140;\n' + slice('function cleanOrder(items){', 'function cleanPlan(items){');
  const ctx = sandbox(code);
  const mk = (id, x, y, w, h) => ({ n: { id, x, y }, w, h, bw: w, bh: h });
  const items = [mk('d', 900, 30, 200, 150), mk('a', 20, 20, 240, 180), mk('c', 40, 400, 200, 200), mk('b', 300, 40, 240, 160), mk('e', 600, 420, 220, 180)];
  const order = ctx.cleanOrder(items).map((i) => i.n.id).join('');
  ok(order === 'abdce', 'reading order: bands from the top, left to right inside a band (' + order + ')');
  const page = { x0: 20, x1: 800, y0: 20, y1: 620 };
  const res = ctx.cleanPack(ctx.cleanOrder(items), page, 26);
  const boxes = res.placed.map((p) => ({ id: p.it.n.id, l: p.cx - p.it.bw / 2, t: p.cy - p.it.bh / 2, r: p.cx + p.it.bw / 2, b: p.cy + p.it.bh / 2 }));
  let overlaps = 0; for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], b = boxes[j]; if (a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t) overlaps++; }
  ok(overlaps === 0, 'packed items never overlap');
  ok(boxes.every((b) => b.t >= 20 - 1e-6 && b.l >= 20 - 1e-6), 'nothing is placed above or left of the page margin (so nothing sits under the header)');
  ok(res.placed.length + res.rest.length === items.length, 'every item is either placed or handed to the next page');
  const tight = ctx.cleanPack(ctx.cleanOrder(items), { x0: 20, x1: 400, y0: 20, y1: 260 }, 26);
  ok(tight.rest.length > 0 && tight.placed.length + tight.rest.length === items.length, 'what does not fit on a small page is carried over, not dropped');
  const big = ctx.cleanPack([mk('wide', 0, 0, 2000, 100)], page, 26);
  ok(big.placed.length === 1, 'an item wider than the page is still placed');
}

// ---- torn edge: deterministic, valid shapes
{
  const code = slice('function hashStr(str){', 'function makePhys') + '\nvar NOTE_W = 250;\n' + slice('function ripStyleFor(n){', 'function widestLine(n){');
  const ctx = sandbox(code);
  const n = { id: 'note-abc', w: 250, rip: 'torn' };
  const a = ctx.ripPolygon(n), b = ctx.ripPolygon({ id: 'note-abc', w: 250, rip: 'torn' }), c = ctx.ripPolygon({ id: 'note-xyz', w: 250, rip: 'torn' });
  ok(a === b && a !== c, 'a note always tears the same way, and different notes tear differently');
  ok(/^polygon\(0 0, 100% 0,/.test(a) && a.split(',').length > 12, 'a torn edge has many points along the bottom');
  ok(/^polygon\(0 0, 100% 0, 100% calc\(100% - 2px\), 0 calc\(100% - \d+px\)\)$/.test(ctx.ripPolygon({ id: 'q', w: 250, rip: 'cut' })), 'a rough cut is one slanted edge');
  ok(/^polygon\(100% 0, 100% 100%, 6px 100%/.test(ctx.ripPolygon({ id: 'q', w: 250, rip: 'notebook' })), 'a notebook edge is ragged on the binding side');
  const styles = new Set(); for (let i = 0; i < 60; i++) styles.add(ctx.ripStyleFor({ id: 'id' + i })); ok(styles.size === 3, 'all three edge styles occur');
}

// ---- Control Center architecture
{
  ok(/var CC_SECTIONS = \[/.test(app) && ['account', 'appearance', 'sharing', 'privacy', 'sounds', 'shortcuts', 'legal'].every((id) => new RegExp('\\{id: "' + id + '"').test(app)), 'one registry describes every Control Center section');
  ok(/function openControlCenter\(section\)/.test(app) && !/function renderAccountSettings/.test(app) && /function buildAccountParts\(cc\)/.test(app), 'the account page is built into the Control Center; there is no separate account settings screen');
  ok(/gearBtn\.addEventListener\("click"[\s\S]{0,200}openControlCenter\("appearance"\)/.test(app) && /kbdBtn\.addEventListener\("click"[\s\S]{0,120}openControlCenter\("shortcuts"\)/.test(app) && /if\(ccSignedIn\(\)\)\{ openControlCenter\("account"\)/.test(app), 'avatar, gear and keyboard button open the same dialog at their own section');
  ok(!/settingsSave|settingsCancel|settingsClose|settingsTitle/.test(html + app), 'the older Settings dialog has no controls of its own any more (one Save, one Cancel)');
  ok(/role="tablist"/.test(app) && /role", "tab"/.test(app) && /role", "tabpanel"/.test(app) && /aria-selected/.test(app) && /ArrowDown/.test(app.slice(app.indexOf('function openControlCenter'), app.indexOf('function legalPointer'))), 'the sections are real tabs with arrow-key navigation');
  ok(/build: buildSoundsPane/.test(app) && /build: buildShortcutsPane/.test(app) && /build: buildLegalPane/.test(app), 'Sounds, Shortcuts and Legal build themselves only when first opened');
  ok(/cc\.once\("account", ensureUsage\)/.test(app) && /cc\.once\("privacy", ensureUsage\)/.test(app), 'account numbers are fetched only when a section that shows them is opened');
  ok(/settings\.soundOn/.test(app) && /settings\.soundVolume/.test(app) && /"soundOn","soundVolume"/.test(app), 'the sound preference is stored and staged like the other settings');
  ok(/avSig/.test(app) && /sig !== avSig/.test(app) && /pvEls/.test(app), 'the profile avatar and the sharing preview are only repainted when the picture itself changes');
  ok(/handleAvailable/.test(app) && /handle_available/.test(fs.readFileSync(path.join(root, 'js', 'account.js'), 'utf8')) && fs.existsSync(path.join(root, 'supabase', 'migrations', '20260930140000_handle_available.sql')), 'username availability is a server call (the unique index still decides on Save)');
  ok(/Occasional Stick-It news and feature updates\. You can unsubscribe anytime\./.test(app), 'the e-mail updates row is one short line');
}

// ---- notes, canvas, loading
{
  ok(/class="quickDone"|qd\.className = "quickDone"/.test(app) && /aria-label", "Mark done"/.test(app) && /\.note\.soup \.quickDone/.test(css), 'a note has a quick Mark done tick beside the x (not on soup), with a label');
  ok(/function trimPaper\(n, mode\)/.test(app) && /Fit paper to content/.test(app) && /Rip off empty paper/.test(app) && /Restore full paper/.test(app), 'Fit paper to content, Rip off empty paper and Restore full paper exist');
  ok(/PAPER_MIN_H = 96/.test(app) && /el\.style\.minHeight = "0px"/.test(app), 'a note keeps room for its words: its height is only a minimum');
  ok(/id="cleanBtn"/.test(html) && /function openCleanUp\(preset\)/.test(app) && /Clean my screen/.test(app) && /Clean whole canvas/.test(app) && /recordChange\(scope === "screen"/.test(app), 'Clean up is in the top bar, offers my screen / whole canvas, and is one undo step');
  ok(!/wipe|clear the board|delete everything/i.test(slice('function openCleanUp(preset){', '(function(){ var b = document.getElementById("cleanBtn")')), 'the Clean up dialog never talks about deleting');
  ok(/function busyStart\(/.test(app) && /function localLoader\(/.test(app) && /busyStart\("sync"/.test(app) && /busyStart\("share"/.test(app) && /busyStart\("media"/.test(app) && /watchPhotoLoading/.test(app), 'the foot slip is wired to syncing, photos, media and sharing');
  ok(/localLoader\(content, "Loading your links/.test(app) && !/content\.textContent = "Loading/.test(app), 'Active Shares uses the branded loader, not plain "Loading…"');
  ok(/function cleanPastedHtml/.test(app) && /Apple-interchange-newline/.test(app), 'pasted text is cleaned of browser wrappers (no stray highlight, no extra line)');
  ok(/class="crown"|makeDiv\("crown"\)/.test(app) && /avCrownWrap/.test(app) && /paintAvatar: function\(elm, uid\)/.test(app), 'the crown sits on the avatar in the header and the profile, and your own comments show your own picture');
}

// ---- legal pages: notebook look, same content
{
  const lc = fs.readFileSync(path.join(root, 'legal', 'legal.css'), 'utf8');
  ok(/article::after/.test(lc) && /repeating-linear-gradient/.test(lc) && /html\[dir="rtl"\] article::after/.test(lc), 'legal pages are a spiral-notebook page, mirrored for right-to-left');
  ok(/prefers-color-scheme: dark/.test(lc.slice(lc.indexOf('v0.8.1'))) && /@media print/.test(lc), 'the notebook has a dark version and prints plainly');
  ok(!/Sora.*cursive/.test(lc) && /--bodyfont:'Sora'/.test(lc), 'body text stays in a plain readable face; only headings use handwriting');
}

// ---- patch notes for 0.8.1
{
  const pn = (f) => fs.readFileSync(path.join(root, 'docs', 'patch-notes', f), 'utf8').replace(/\r\n/g, '\n');
  const md = pn('0.8.1.md');
  const heads = [...md.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  ok(JSON.stringify(heads) === JSON.stringify(['TL;DR', 'What changed', 'New in this patch', 'Fixed', 'Improved', 'Still being worked on', 'Under the hood', 'Status audit', 'Development references']), '0.8.1.md uses the agreed section order (' + heads.join(' | ') + ')');
  ok(/^# Stick-It v0\.8\.1 — One Place/.test(md) && /Release date: not released/.test(md) && /Status: \*\*development\*\*/.test(md), '0.8.1.md carries the title, "not released" and status development');
  const rows = [...md.matchAll(/^\| (.+?) \| (SHIPPED|PARTIAL|DEFERRED|NOT IMPLEMENTED)[^|]* \|$/gm)];
  ok(rows.length >= 20 && rows.some((r) => r[2] === 'PARTIAL') && rows.some((r) => r[2] === 'SHIPPED'), 'the status audit uses the four honest statuses and is not all "shipped"');
  const index = JSON.parse(pn('index.json')), data = JSON.parse(pn('patch-notes.json'));
  ok(index[0].version === '0.8.1' && data[0].version === '0.8.1' && index[0].tldr === data[0].tldr && index[0].file === '0.8.1.md' && index[0].date === null && data[0].date === null, 'index.json and patch-notes.json agree and neither marks 0.8.1 as released');
  ok(['highlights', 'added', 'improved', 'fixed', 'limitations'].every((k) => Array.isArray(data[0][k]) && data[0][k].length > 0), 'the structured data has highlights, added, improved, fixed and limitations');
  const js = pn('patch-notes.js');
  ok(/^export const patchNotes = \[/m.test(js) && js.includes(JSON.stringify(data[0].tldr)), 'patch-notes.js (for the website) is generated from the same data');
  const sum = pn('0.8.1-summary.md');
  ok(['## TL;DR', '## Already completed before this patch', '## What was added in 0.8.1', '## What was fixed', '## What was improved', '## What remains partial', '## What is deferred', '## What I can test right now', '## Release blockers', '## Status table'].every((h) => sum.includes(h)), '0.8.1-summary.md has every planned section');
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
