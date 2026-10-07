// Shopping List: the pure rules (js/shopping.js) plus guards for how the node is wired into the app.
//   node shopping.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');
const ctx = vm.createContext({ console, Math, Object, Array, String, Number, isFinite, Intl, Date, JSON, RegExp });
vm.runInContext('var window = globalThis; Stick = {};', ctx);
vm.runInContext(read('js/objects.js'), ctx);
vm.runInContext(read('js/shopping.js'), ctx);
const S = ctx.Stick.shopping, O = ctx.Stick.objects;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const safeHref = (u) => (/^https?:\/\/[^\s]+$/i.test(String(u)) ? String(u) : null);
const H = { safeHref, locale: 'he-IL', tz: 'Asia/Jerusalem' };

// ---- it is a kind of object, with its own rules
ok(O.isKind('shopping') && O.LABELS.shopping === 'shopping list' && O.WIDTH.shopping[2] === 290, 'shopping is a registered object kind with a width range');
ok(O.hasContent({ type: 'shopping', items: [] }) === true, 'an empty list is never treated as an empty note (it would be tidied away)');

// ---- normalising what arrives (paste, import, server, share)
{
  const n = O.normalize({ type: 'shopping', w: 99999, title: '  Athens‮  trip\u0007 ' + 'x'.repeat(100), fields: ['price', 'bogus', 'price', 'qty'], cur: 'XXX', createdFromPreset: 'trip', items: [
    { id: 'a1', t: 'Electric toothbrush', c: 0, p: 4990.7, q: ' 2 ', n: 'the blue one', g: 'health', l: 'https://shop.example/x' },
    { id: 'a1', t: 'Duplicate id', c: 1, ct: 1760000000000 },
    { t: '   ' },
    { id: 'b2', t: 'javascript link', l: 'javascript:alert(1)' },
    'not an item', null
  ] }, H);
  ok(n.type === 'shopping' && n.w === 420, 'width is clamped');
  ok(n.title.length <= 60 && !/[‮\u0007]/.test(n.title), 'the title is cleaned (control and bidi characters gone, length capped)');
  ok(JSON.stringify(n.fields) === '["qty","price"]', 'only known fields are kept, once each, in a fixed order');
  ok(n.cur === 'ILS', 'an unknown currency falls back to the device guess (Israel: ILS)');
  ok(n.createdFromPreset === 'trip', 'the creation preset is remembered, only as history');
  ok(n.items.length === 3, 'empty and junk items are dropped');
  const a = n.items[0];
  ok(a.p === 4991 && Number.isInteger(a.p), 'a price is rounded to whole minor units, never a fraction');
  ok(a.q === '2' && a.n === 'the blue one' && a.g === 'health' && a.l === 'https://shop.example/x', 'optional details survive, trimmed');
  ok(n.items[1].id !== 'a1' && n.items[1].c === 1 && n.items[1].ct === 1760000000000, 'a repeated id is replaced; a cart item keeps its pick-up time');
  ok(n.items[2].l === undefined, 'a javascript: link is dropped');
  ok(n.items.every((i) => typeof i.u === 'number' && i.u > 0), 'every item has an update stamp for the later live merge');
  ok(n.items[0].ct === null, 'an item to buy has no pick-up time');
  const big = O.normalize({ type: 'shopping', items: Array.from({ length: 150 }, (_, i) => ({ t: 'item ' + i })) }, H);
  ok(big.items.length === 100, 'a list holds at most 100 items');
  const long = O.normalize({ type: 'shopping', items: [{ t: 'y'.repeat(500), n: 'z'.repeat(500), g: 'g'.repeat(99), q: 'q'.repeat(99), p: 1e15 }] }, H).items[0];
  ok(long.t.length === 120 && long.n.length === 120 && long.g.length === 24 && long.q.length === 12 && long.p === undefined, 'text limits apply and an absurd price is refused');
  const neg = O.normalize({ type: 'shopping', items: [{ t: 'x', p: -5 }] }, H).items[0];
  ok(neg.p === undefined, 'a negative price is refused');
  ok(O.normalize({ type: 'receipt' }, H).type === 'receipt' && O.normalize({ type: 'shopping' }, H).items.length === 0, 'a list with nothing in it is still a list');
  const san = O.sanitize({ id: 'x', x: 1, y: 2, z: 3, rot: 4, type: 'shopping', items: [{ t: 'ok' }], evil: '<img onerror>' }, H);
  ok(san && san.id === 'x' && san.items.length === 1 && san.evil === undefined, 'objects from the server are cleaned the same way and unknown keys are dropped');
  const hebrew = O.normalize({ type: 'shopping', title: 'קניות', items: [{ t: 'חלב' }, { t: 'לחם', c: 1 }] }, H);
  ok(hebrew.title === 'קניות' && hebrew.items[0].t === 'חלב' && hebrew.items[1].c === 1, 'Hebrew text passes through');
}

// ---- currency: per list, with the device as a first guess
ok(S.defaultCurrency('he-IL', '') === 'ILS' && S.defaultCurrency('en-US', '') === 'USD' && S.defaultCurrency('en-GB', '') === 'GBP' && S.defaultCurrency('de-DE', '') === 'EUR' && S.defaultCurrency('fr-FR') === 'EUR' && S.defaultCurrency('ja-JP') === 'JPY', 'the currency guess follows the device language region');
ok(S.defaultCurrency('he', 'Asia/Jerusalem') === 'ILS' && S.defaultCurrency('en', 'Europe/Athens') === 'EUR' && S.defaultCurrency('', '') === 'USD', 'with no region the time zone decides, and the last resort is USD');
ok(S.validCurrency('EUR') && S.validCurrency('ILS') && !S.validCurrency('eur') && !S.validCurrency('BTC') && !S.validCurrency(null), 'only listed currencies are valid');
{
  const a = O.normalize({ type: 'shopping', cur: 'EUR' }, { locale: 'he-IL' }), b = O.normalize({ type: 'shopping' }, { locale: 'he-IL' });
  ok(a.cur === 'EUR' && b.cur === 'ILS', 'one list set to EUR does not change what another list defaults to');
}

// ---- price: whole minor units in, Intl formatting out
ok(S.minorDigits('EUR') === 2 && S.minorDigits('ILS') === 2 && S.minorDigits('JPY') === 0, 'yen has no minor units');
{
  const P = (t, c = 'EUR') => S.parsePrice(t, c);
  ok(P('2.50') === 250 && P('2,50') === 250 && P('2.5') === 250 && P('3') === 300 && P('0.99') === 99 && P('.99') === 99, 'simple prices parse to minor units');
  ok(P('1,234.50') === 123450 && P('1.234,50') === 123450 && P('1,234') === 123400 && P('1.234') === 123400, 'thousands separators are told apart from decimals');
  ok(P('€3') === 300 && P('3 ₪', 'ILS') === 300 && P('$ 12.00', 'USD') === 1200, 'currency symbols and spaces are ignored');
  ok(P('abc') === null && P('') === null && P('-4') === 400 && P('1000000.00') === null, 'text, empty and absurd values are not prices');
  ok(P('1,500', 'JPY') === 1500 && P('800', 'JPY') === 800, 'yen are whole numbers');
  ok(Number.isInteger(P('19.99')) && P('19.99') === 1999, 'never a float (19.99 is exactly 1999)');
  const f = S.formatPrice(4990, 'EUR', 'en-US'), g = S.formatPrice(4990, 'ILS', 'he-IL');
  ok(f === '€49.90' && /49[.,]90/.test(g) && /₪/.test(g), 'prices are formatted with Intl for the list currency');
  ok(S.formatPrice(1500, 'JPY', 'en-US') === '¥1,500' && S.formatPrice(null, 'EUR') === '', 'yen format without decimals; no price formats to nothing');
}

// ---- counts, summary line, totals
{
  const none = [], some = [{ c: 0 }, { c: 0 }, { c: 1 }], all = [{ c: 1 }, { c: 1 }];
  ok(S.summary(none) === 'Nothing to buy yet', 'an empty list says so');
  ok(S.summary(some) === '2 to buy · 1 in cart' && S.summary([{ c: 0 }]) === '1 to buy', 'the count line reads "N to buy · M in cart", and leaves out an empty cart');
  ok(S.summary(all) === '2 in cart · All picked ✓' && !/0 to buy/.test(S.summary(all)), 'when everything is picked it says "N in cart · All picked ✓", never "0 to buy"');
  ok(S.counts(all).allPicked === true && S.counts(none).allPicked === false && S.counts(some).allPicked === false, 'all picked needs at least one item');
  const t = S.totals([{ p: 250, c: 0 }, { p: 100, c: 1 }, { c: 1 }, { p: 5, c: 1, q: '3' }]);
  ok(t.all === 355 && t.cart === 105 && t.priced === 3, 'totals simply add the prices entered (quantity is never multiplied in)');
}

// ---- ticking: the cart is ordered by pick-up time, and the time is set and cleared exactly
{
  let items = ['Milk', 'Bread', 'Eggs'].map((t, i) => S.newItem(t, 1000 + i));
  const ids = items.map((i) => i.id);
  items = S.setCart(items, ids[2], true, 5000);
  items = S.setCart(items, ids[0], true, 6000);
  ok(S.cartItems(items).map((i) => i.t).join() === 'Eggs,Milk', 'the cart section is in the order things were picked up');
  ok(S.toBuyItems(items).map((i) => i.t).join() === 'Bread', 'the rest stays in to-buy');
  const eggs = items.find((i) => i.id === ids[2]);
  ok(eggs.c === 1 && eggs.ct === 5000 && eggs.u === 5000, 'checking sets the pick-up time and the update stamp');
  items = S.setCart(items, ids[2], false, 7000);
  const eggs2 = items.find((i) => i.id === ids[2]);
  ok(eggs2.c === 0 && eggs2.ct === null && eggs2.u === 7000, 'unchecking clears the pick-up time');
  items = S.setCart(items, ids[2], true, 8000);
  ok(items.find((i) => i.id === ids[2]).ct === 8000 && S.cartItems(items).map((i) => i.t).join() === 'Milk,Eggs', 'checking again gives a new time, so it goes to the end of the cart');
  const before = JSON.stringify(items);
  S.setCart(items, ids[1], true, 9000);
  ok(JSON.stringify(items) === before, 'a change makes a new list and leaves the old one untouched (so Undo is exact)');
}

// ---- adding, editing, removing, clearing
{
  let items = S.add([], 'Milk', 10);
  ok(items.length === 1 && items[0].t === 'Milk' && items[0].c === 0 && items[0].ct === null, 'a new item starts in to-buy');
  ok(S.add(Array.from({ length: 100 }, () => S.newItem('x')), 'one more') === null, 'the 101st item is refused');
  items = S.update(items, items[0].id, { q: '2', p: 250 }, 20);
  ok(items[0].q === '2' && items[0].p === 250 && items[0].u === 20, 'updating an item stamps it');
  items = S.update(items, items[0].id, { q: null }, 30);
  ok(!('q' in items[0]), 'clearing a detail removes the key');
  let more = S.add(items, 'Bread', 40); more = S.add(more, 'Eggs', 41);
  more = S.setCart(S.setCart(more, more[1].id, true, 50), more[2].id, true, 51);
  ok(S.boughtCount(more) === 2 && S.clearBought(more).length === 1 && S.clearBought(more)[0].t === 'Milk', 'clearing bought items removes exactly the ticked ones');
  ok(S.remove(more, more[0].id).length === 2, 'removing an item removes just it');
}

// ---- words for search, share and the Done pile
{
  const o = { type: 'shopping', title: 'Athens', cur: 'EUR', items: [{ id: 'a', t: 'Toothbrush', c: 0, q: '1', p: 4990, n: 'blue', g: 'health' }, { id: 'b', t: 'Magnet', c: 1 }] };
  const t = S.text(o);
  ok(/Athens/.test(t) && /Toothbrush/.test(t) && /×1/.test(t) && /49[.,]90/.test(t) && /\(blue\)/.test(t) && /#health/.test(t) && /Magnet \[x\]/.test(t), 'the list reads as text for search, sharing and the Done pile');
  ok(O.text(o) === t && O.label(o) === 'Shopping list: Athens' && O.label({ type: 'shopping' }) === 'Shopping list', 'the shared object helpers use the same words');
  const sz = O.sizeEstimate({ type: 'shopping', w: 300, items: Array.from({ length: 60 }, () => ({})) });
  ok(sz.w === 300 && sz.h <= 400 + 70 + 74 && sz.h > 100, 'the size estimate stops growing at the paper maximum');
}

// ---- presets are only a creation template
ok(JSON.stringify(Object.keys(S.PRESETS)) === '["blank","groceries","trip"]' && S.PRESETS.blank.fields.length === 0, 'Blank is first and switches nothing on');
ok(S.PRESETS.groceries.fields.join() === 'qty' && S.PRESETS.trip.fields.join() === 'price,link,note', 'Groceries suggests quantity; Trip suggests price, link and note');

// ---- how the node is wired into the app
{
  const app = read('js/app.js'), css = read('css/app.css'), html = read('index.html');
  ok(/<script src="js\/shopping\.js">/.test(html) && html.indexOf('js/shopping.js') > html.indexOf('js/objects.js'), 'shopping.js loads after objects.js');
  ok(/"fields","cur","createdFromPreset","items"/.test(app), 'the list fields are saved and tracked by undo');
  ok(/if\(n\.type === "shopping"\) return renderShopping\(n, isNew\)/.test(app) && /if\(item\.type === "shopping"\) return buildStaticShopping\(item\)/.test(app), 'the board and shared views both draw a shopping list');
  ok(/OBJECT_MENUS\.shopping = shoppingMenu/.test(app) && /Details/.test(app) && /S\.FIELDS\.slice\(\)\.sort\(/.test(app), 'the ... menu has a Details section with the five optional fields');
  ok(!/class="gear"|shGear/.test(app + css), 'there is no permanent gear on the node');
  ok(/\(n\.type && !isPaper\(n\)\)\) return;/.test(app) && /label: "Mark list done"|"Mark list done"/.test(app), 'a whole list can be marked Done, from its own menu');
  ok(!/markDone\(n\)[^;]*shopTick|shopTick[^}]*markDone/.test(app), 'ticking an item never marks the list done');
  ok(/if\(k === 1\)\{ go\(\); return; \}/.test(app) && /"Clear " \+ k \+ " bought items\?"/.test(app), 'clearing several bought items asks first; it is one undo step');
  ok(/Nothing to buy yet/.test(read('js/shopping.js')) && /Add the first item/.test(app), 'an empty list has a calm empty state with an obvious first entry');
  ok(/safeHref\(v\)/.test(app) && /rel = "noopener noreferrer"/.test(app) && /open \? "span" : "a"/.test(app), 'links go through safeHref, and are plain text while the row is being edited');
  ok(/role", "checkbox"/.test(app) && /aria-checked/.test(app) && /role", "status"/.test(app) && /aria-live", "polite"/.test(app), 'items are real checkboxes and the count is announced politely');
  ok(/Intl\.NumberFormat/.test(read('js/shopping.js')) && !/toFixed\(2\)/.test(read('js/shopping.js')), 'prices are formatted with Intl, never by hand');
  ok(/\.shopObj \.shList\{ max-height:400px;/.test(css) && /\.shopObj \.shCart\{ position:absolute;[^}]*width:78px/.test(css), 'the item area scrolls after 400 px and the cart is a small accent that is never in the flow');
ok(/\.shopObj \.shEdit\{ display:flex;/.test(css) && !/shExtra|\.shField/.test(css + app), 'editing details is a row of small inline fields, not a boxed form');
ok(/\.shopObj \.shNote::before\{ content:"note: "/.test(css) && /\.shopObj \.shMeta/.test(css), 'details appear as tiny receipt annotations under the item');
  ok(/prefers-reduced-motion: reduce\)\{ \.shopObj/.test(css) && /!reducedMotion\(\) && opts\.slideId/.test(app), 'the slide into the cart is off with reduced motion');
  ok(/defineAction\(\{id: "newShopping"/.test(app) && /\{id: "shopping", group: "Add"/.test(app), 'a shopping list can be added from the Add menu and the command palette');
}

// ---- sync: the list is one ordinary object row and comes back unchanged
{
  const rctx = vm.createContext({ console, Math, Object, Array, String, Number, isFinite, JSON, Date });
  vm.runInContext('var window = globalThis; Stick = {};', rctx);
  vm.runInContext(read('js/repo.js'), rctx);
  const R = rctx.Stick.repo;
  const list = O.normalize({ type: 'shopping', title: 'Athens', fields: ['price', 'note'], cur: 'EUR', createdFromPreset: 'trip', items: [{ id: 'a', t: 'Toothbrush', p: 4990, n: 'blue' }, { id: 'b', t: 'Magnet', c: 1, ct: 1760000000000 }] }, H);
  const obj = Object.assign({}, list, { id: 'L1', x: 10, y: 20, z: 5, rot: 1 });
  const row = R.toRow(obj);
  ok(row.type === 'shopping' && row.width === obj.w && row.data.items.length === 2 && row.data.cur === 'EUR' && JSON.stringify(row.data).length < 262144, 'a list becomes one board_objects row, well inside the size limit');
  const back = R.fromRow(JSON.parse(JSON.stringify(row)));
  const clean = O.sanitize(back, H);
  ok(JSON.stringify(clean.items) === JSON.stringify(obj.items) && clean.fields.join() === 'note,price' && clean.cur === 'EUR', 'it comes back from the server with every item, tick, price and the currency intact');
  ok(R.hashRow(row) === R.hashRow(R.toRow(Object.assign({}, clean, { id: 'L1', x: 10, y: 20, z: 5, rot: 1 }))), 'a list that did not change hashes the same, so it is not sent again');
}

// ---- dividers and subtext (v0.8.3.5)
{
  const h = { safeHref: (u) => u, locale: 'en', tz: 'UTC' };
  let items = S.add([], 'milk', 1); items = S.addDivider(items, 'Dairy', 2); items = S.add(items, 'eggs', 3);
  ok(items.length === 3 && items[1].d === 1 && items[1].t === 'Dairy', 'a divider is an item with a label');
  const c = S.counts(items); ok(c.toBuy === 2 && c.inCart === 0 && c.all === 2, 'dividers are never counted as things to buy');
  ok(S.summary(items) === '2 to buy', 'the summary ignores dividers');
  ok(S.totals(items).priced === 0 && S.boughtCount(items) === 0, 'dividers have no price and are never bought');
  ok(/Dairy/.test(S.text({ title: 'T', items })), 'search and sharing text include the divider label');
  const n = S.normalize({ type: 'shopping', title: 'x', items: [{ id: 'a', t: 'Aisle 1', d: 1, c: 1, q: '3', p: 500, n: 'x' }, { id: 'b', t: 'bread' }] }, h);
  ok(n.items[0].d === 1 && n.items[0].c === 0 && !('q' in n.items[0]) && !('p' in n.items[0]) && !('n' in n.items[0]), 'a divider keeps only its label (no tick, quantity, price or subtext), even from messy data');
  ok(n.items[1].d === undefined, 'ordinary items are unchanged');
  let full = []; for (let i = 0; i < S.MAX_ITEMS; i++) full.push(S.newItem('x', i)); ok(S.addDivider(full, '', 1) === null, 'dividers count towards the item limit');
  ok(S.FIELD_LABEL.note === 'Subtext', 'the note detail is presented as Subtext');
  const app = read('js/app.js'); ok(/"Add divider"/.test(app) && /function shopAddDivider/.test(app) && /shopDividerRow\(n, it, st\)/.test(app) && /Add divider/.test(app), 'the list menu offers Add divider, and a divider renders as its own row');
  ok(/Remove divider/.test(app) && /shopChange\(n, "Add divider"/.test(app), 'adding and removing a divider are undoable list changes');
}

console.log(`shopping: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
