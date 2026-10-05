// ONE canonical patch history, several generated outputs.
//
//   Authored (edit these):   docs/patch-notes/patch-notes.json   metadata, summary, tags, highlights, tour cards (newest first)
//                            docs/patch-notes/<version>.md       the long-form notes
//                            docs/patch-notes/index.json         the small list, checked against the JSON
//   Generated (never edit):  docs/patch-notes/patch-history.json  the whole history, for the website (and anything else)
//                            docs/patch-notes/patch-notes.js      the same as an ES module (`export const patchNotes`)
//                            js/patch-history.js                  the whole history, for the in-app Patch Notes reader and tour library
//                            js/patch-data.js                     only the newest version (the upgrade card and its walk-through)
//
//   node tools/build-patch-data.mjs [--check]       (--check writes nothing and fails if the generated files are out of date)
// Full notes are parsed from the Markdown into plain sections, so the app and the website render the same words. A tour is never invented: a version
// with no tour of its own gets one derived word-for-word from its own highlights (marked "derived"), or none.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'docs', 'patch-notes');
const check = process.argv.includes('--check');
const data = JSON.parse(fs.readFileSync(path.join(dir, 'patch-notes.json'), 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
export const CATEGORIES = ['Canvas', 'Media', 'Sharing', 'Mobile', 'Privacy', 'Performance', 'Nodes'];
const SKIP_SECTIONS = /^(status audit|development references|deferred|media|under the hood)$/i;     // reference material for the team: still in the .md, not in the reader

const problems = [];
if (data.length !== index.length) problems.push('index.json and patch-notes.json list a different number of versions');
data.forEach((d, i) => {
  const x = index[i];
  if (!x) return;
  for (const k of ['version', 'codename', 'title', 'date', 'status', 'tldr']) if (d[k] !== x[k]) problems.push(`${d.version}: "${k}" differs between index.json and patch-notes.json`);
  if (!fs.existsSync(path.join(dir, x.file))) problems.push(`${d.version}: ${x.file} does not exist`);
  if (!Array.isArray(d.tags) || !d.tags.length || d.tags.some((t) => !CATEGORIES.includes(t))) problems.push(`${d.version}: "tags" must be a non-empty list from ${CATEGORIES.join(', ')}`);
  if (!/^\d+\.\d+\.\d+(\.\d+)?$/.test(d.version)) problems.push(`${d.version}: not a version number`);
  if (d.status !== 'released' && d.date !== null) problems.push(`${d.version}: only a released version has a date`);
});
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

// ---- the long-form notes: Markdown -> sections of plain blocks
function parseNotes(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const sections = []; let cur = null, sub = null, list = null;
  const push = (b) => { (sub || cur).blocks.push(b); };
  for (const raw of lines) {
    const l = raw.replace(/\s+$/, '');
    let m;
    if ((m = /^##\s+(.*)$/.exec(l))) { cur = { heading: m[1].trim(), blocks: [] }; sections.push(cur); sub = null; list = null; continue; }
    if (!cur) continue;                                                       // the title, release date and status lines above the first section
    if ((m = /^###\s+(.*)$/.exec(l))) { sub = { heading: m[1].trim(), blocks: [] }; (cur.sub = cur.sub || []).push(sub); list = null; continue; }
    if ((m = /^\s*[-*]\s+(.*)$/.exec(l))) { if (!list) { list = { t: 'ul', items: [] }; push(list); } list.items.push(m[1].trim()); continue; }
    if (/^\s*\|/.test(l)) { list = null; continue; }                          // tables are team reference, not reader text
    if (!l.trim()) { list = null; continue; }
    list = null; push({ t: 'p', text: l.trim() });
  }
  return sections.filter((s) => !SKIP_SECTIONS.test(s.heading) && !/^tl;?dr$/i.test(s.heading)).map((s) => {
    const out = { heading: s.heading, blocks: s.blocks };
    if (s.sub) out.sub = s.sub.map((x) => ({ heading: x.heading, blocks: x.blocks }));
    return out;
  });
}
function deriveTour(d) {
  return (d.highlights || []).map((h) => {
    const i = h.indexOf(': ');
    const title = i > 0 && i < 48 ? h.slice(0, i) : h.split(/\s+/).slice(0, 5).join(' ');
    return { target: null, title, body: i > 0 && i < 48 ? h.slice(i + 2) : h };
  });
}

const history = data.map((d, i) => {
  const x = index[i];
  const md = fs.readFileSync(path.join(dir, x.file), 'utf8');
  const own = Array.isArray(d.tour) && d.tour.length;
  const cards = own ? d.tour : deriveTour(d);
  return {
    version: d.version, slug: 'v' + d.version.replace(/\./g, '-'), codename: d.codename, title: d.title,
    status: d.status, date: d.date, summary: d.tldr, tags: d.tags,
    highlights: d.highlights || [],
    notes: parseNotes(md),
    tour: cards.length ? { mode: own ? (d.tourMode || 'full') : 'derived', cards: cards.map((c) => { const o = { title: c.title, body: c.body }; if (c.target) o.target = c.target; if (c.feature) o.feature = c.feature; if (c.action) o.action = c.action; if (c.icon) o.icon = c.icon; if (c.media) o.media = c.media; return o; }) } : null,
    media: d.media || [],
    notesFile: x.file,
    newer: i > 0 ? data[i - 1].version : null, older: i < data.length - 1 ? data[i + 1].version : null
  };
});

const out = {
  'docs/patch-notes/patch-history.json': JSON.stringify({ generated: 'by tools/build-patch-data.mjs from docs/patch-notes/patch-notes.json and the per-version .md files. Do not edit by hand.', categories: CATEGORIES, versions: history }, null, 2) + '\n',
  'docs/patch-notes/patch-notes.js': '// Generated by tools/build-patch-data.mjs from patch-notes.json. Do not edit by hand.\n' + 'export const patchNotes = ' + JSON.stringify(data, null, 2) + ';\n',
  'js/patch-history.js': '// Generated by tools/build-patch-data.mjs. Do not edit by hand. The whole patch history for the in-app Patch Notes reader and the tour library.\n' +
    '(function (root) { var Stick = root.Stick = root.Stick || {}; Stick.patchHistory = ' + JSON.stringify({ categories: CATEGORIES, versions: history }) + '; })(typeof window !== "undefined" ? window : globalThis);\n'
};
// the app's upgrade card needs only the newest version (its summary and its walk-through with real targets)
const latest = data[0];
const tour = (latest.tour || []).map(({ target, title, body, feature, action }) => { const o = { target: target || null, title, body }; if (feature) o.feature = feature; if (action) o.action = action; return o; });
out['js/patch-data.js'] = '// Generated by tools/build-patch-data.mjs from docs/patch-notes/patch-notes.json. Do not edit by hand.\n' +
  '(function (root) { var Stick = root.Stick = root.Stick || {}; Stick.patchData = ' +
  JSON.stringify({ version: latest.version, codename: latest.codename, tldr: latest.tldr, highlights: latest.highlights || [], tourMode: latest.tourMode || 'summary', tour }, null, 2) +
  '; })(typeof window !== "undefined" ? window : globalThis);\n';

let stale = 0;
for (const [f, text] of Object.entries(out)) {
  const p = path.join(root, f);
  if (check) { const cur = fs.existsSync(p) ? fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n') : ''; if (cur !== text) { stale++; console.error('out of date: ' + f); } }
  else { fs.writeFileSync(p, text); console.log('wrote ' + f); }
}
if (check && stale) process.exit(1);
if (!check) console.log(history.length + ' versions, newest ' + latest.version);
