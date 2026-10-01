// Unit tests for the physical-scrap object rules (js/objects.js): cleaning, limits, variants, text, sizes.
//   node objects.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = vm.createContext({ console, Math, Object, Array, String, Number, isFinite });
vm.runInContext('var window = globalThis; Stick = {};', ctx);
vm.runInContext(fs.readFileSync(path.join(here, '..', '..', 'js', 'objects.js'), 'utf8'), ctx);
const O = ctx.Stick.objects;
const H = { safeImage: (s) => (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(String(s)) ? s : null), fontOk: (f) => f === 'Caveat' };
const img = 'data:image/jpeg;base64,AAAA';
const U1 = '11111111-1111-4111-8111-111111111111', U2 = '22222222-2222-4222-8222-222222222222';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };

ok(O.isKind('receipt') && O.isKind('ticket') && O.isKind('postcard') && O.isKind('photo_strip') && !O.isKind('note') && !O.isKind('photo') && !O.isKind('__proto__'), 'only the four scrap kinds are recognised');
ok(O.normalize({ type: 'note' }, H) === null && O.normalize(null, H) === null, 'anything else is not a paper object');

// ---- text is plain, capped, and cleaned of control characters and bidi overrides
{
  const r = O.normalize({ type: 'receipt', title: '  Café‮  Luna\u0007 ' + 'x'.repeat(200), date: '1 Oct 2026', body: 'Coffee 3.50\r\nCroissant 2.80\n\n\n' + 'y\n'.repeat(30), amount: '12.50 EUR and more digits here', variant: 'nonsense' }, H);
  ok(r.title.length <= 60 && !/[‮\u0007]/.test(r.title) && r.title.startsWith('Café Luna'), 'title: capped at 60, whitespace collapsed, bidi override and control characters removed');
  ok(r.body.split('\n').length <= 14 && !r.body.includes('\r'), 'body: at most 14 lines, no carriage returns');
  ok(r.amount.length <= 16, 'amount is capped');
  ok(r.variant === 'clean', 'an unknown variant falls back to the default');
  const x = O.normalize({ type: 'receipt', title: '<img src=x onerror=alert(1)>', body: '<script>alert(1)</script>' }, H);
  ok(x.title === '<img src=x onerror=alert(1)>' && x.body === '<script>alert(1)</script>', 'markup is kept as literal text (it is only ever written with textContent), never interpreted');
}
// ---- widths and variants
{
  ok(O.normalize({ type: 'receipt', w: 5 }, H).w === 170 && O.normalize({ type: 'receipt', w: 9999 }, H).w === 360, 'receipt width is clamped');
  ok(O.normalize({ type: 'ticket', orient: 'portrait' }, H).w === 200 && O.normalize({ type: 'ticket' }, H).w === 330, 'ticket default width depends on orientation');
  ok(O.normalize({ type: 'ticket', orient: 'sideways' }, H).orient === 'landscape', 'ticket orientation is whitelisted');
  ok(O.VARIANTS.receipt.length === 4 && O.VARIANTS.ticket.length === 4 && O.VARIANTS.postcard.length >= 3 && O.VARIANTS.photo_strip.length === 2, 'the planned variants exist');
}
// ---- postcard: picture must pass the app\'s image check; asset ids must be real uuids
{
  const p = O.normalize({ type: 'postcard', image: img, imgRatio: 0.7, location: 'Lisbon', message: 'Hello', font: 'Caveat', assetId: U1 }, H);
  ok(p.image === img && p.assetId === U1 && p.font === 'Caveat' && p.imgRatio === 0.7, 'postcard keeps a valid picture, asset id, font and ratio');
  const q = O.normalize({ type: 'postcard', image: 'javascript:alert(1)', assetId: 'drop table', font: 'Evil Font', imgRatio: 99 }, H);
  ok(!q.image && !q.assetId && q.font === undefined && q.imgRatio === 2.5, 'a bad picture URL, a non-uuid asset id and an unknown font are dropped; ratio is clamped');
}
// ---- photo strip
{
  ok(O.normalize({ type: 'photo_strip', frames: [{ image: img }] }, H) === null, 'a strip needs at least two pictures');
  const s = O.normalize({ type: 'photo_strip', caption: 'Trip', frames: [{ image: img, ratio: 0.5 }, { assetId: U1 }, { image: 'evil' }, { assetId: 'nope' }, { image: img }, { image: img }, { image: img }, { image: img }, { image: img }] }, H);
  ok(s.frames.length <= 6 && s.frames.every((f) => f.image || f.assetId), 'a strip keeps at most 6 pictures and drops empty or invalid frames');
  ok(s.frames[0].ratio === 0.5 && s.frames[1].assetId === U1, 'frame ratio and asset reference survive');
}
// ---- server/share input: never any picture bytes, unknown fields dropped
{
  const o = { id: 'abc', type: 'photo_strip', x: 1, y: 2, z: 3, rot: 4, caption: 'Hi', evil: '<b>', frames: [{ assetId: U1, image: img }, { assetId: U2 }] };
  const c = O.sanitize(o, H);
  ok(c && c.frames.length === 2 && c.frames.every((f) => !f.image) && c.evil === undefined && c.id === 'abc' && c.x === 1, 'sanitize keeps references and position, drops picture bytes and unknown fields');
  ok(O.sanitize({ type: 'photo_strip', frames: [{ assetId: U1 }] }, H) === null, 'a strip with fewer than two pictures from the server is refused');
  ok(O.sanitize({ type: 'receipt', title: 'x'.repeat(500) }, H).title.length === 60, 'oversized text from the server is cut');
}
// ---- derived facts
{
  const r = { type: 'receipt', title: 'Café', date: 'Oct', body: 'A\nB', amount: '9' };
  ok(O.text(r) === 'Café Oct A B 9', 'search and share text joins the visible fields');
  ok(O.label(r) === 'receipt: Café' && O.label({ type: 'ticket' }) === 'ticket', 'labels for assistive technology say what the object is');
  ok(O.hasContent({ type: 'photo_strip', frames: [{}, {}] }) && !O.hasContent({ type: 'photo_strip', frames: [{}] }) && !O.hasContent({ type: 'postcard' }), 'content checks per kind (an empty postcard is not shareable)');
  const a = O.serial('id-1', 10), b = O.serial('id-1', 10), c = O.serial('id-2', 10);
  ok(a === b && a !== c && /^\d{10}$/.test(a), 'decorative serial digits are stable per object and are digits only (never a scannable code)');
  ok(O.sizeEstimate({ type: 'ticket', w: 330 }).h < O.sizeEstimate({ type: 'ticket', w: 330, orient: 'portrait' }).h, 'portrait tickets are taller than landscape ones');
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
