// Tests for the browser-side compliance contracts that need no server: the subscription disclosure gate (js/billing.js),
// the business-details config (js/legal-config.js), and the repository-wide guarantees (no third-party font/analytics origins).
//   node billing.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + m); } };
const load = (f, ctx) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });

// ---------------------------------------------------------------- billing disclosure contract
{
  const ctx = vm.createContext({ console, Intl, Number, String, Object, Error, Date });
  load('js/billing.js', ctx);
  const B = ctx.Stick.billing;
  ok(B.enabled === false, 'billing is not enabled (there is no payment provider)');
  const plan = { name: 'Premium', price: '4.99', currency: 'USD', interval: 'month', cancelPath: 'Account settings > Plan > Manage subscription' };
  const t = B.terms(plan);
  ok(/^Premium — .*4\.99.*\/month$/.test(t[0]), 'first line shows plan, price and period: ' + t[0]);
  ok(t.some(l => /Renews automatically each month until cancelled\./.test(l)), 'states automatic renewal');
  ok(t.some(l => /Cancel any time from Account settings > Plan > Manage subscription\./.test(l)), 'states how to cancel');
  const trial = B.terms({ ...plan, trialDays: 7, firstChargeNote: 'Your first charge is on day 8 unless you cancel.' });
  ok(trial.some(l => /Free for 7 days, then .*4\.99.*\/month\./.test(l)) && trial.some(l => /first charge is on day 8/.test(l)), 'a trial states the length, the price after it and when the first charge happens');
  const refuses = (p) => { try { B.terms(p); return null; } catch (e) { return e; } };
  for (const [k, v] of [['price', ''], ['price', 'free'], ['currency', 'dollars'], ['currency', undefined], ['interval', 'decade'], ['cancelPath', ''], ['name', '']]) {
    const e = refuses({ ...plan, [k]: v });
    ok(e && e.name === 'BillingDisclosureError' && e.missing.includes(k), `refuses a plan with bad ${k}`);
  }
  const e1 = refuses({ ...plan, trialDays: 7 });
  ok(e1 && e1.missing.includes('firstChargeNote'), 'a trial without a statement of the first charge is refused');
  ok(refuses(null) && refuses(undefined), 'no plan at all is refused');
  // the checkout block is built from the same lines and cannot exist without them
  const made = [];
  const doc = { createElement: (tag) => { const el = { tag, children: [], textContent: '', className: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, appendChild(c) { this.children.push(c); }, addEventListener() {} }; made.push(el); return el; } };
  const ctx2 = vm.createContext({ console, Intl, document: doc, Object, Error, Number, String, Date });
  load('js/billing.js', ctx2);
  const block = ctx2.Stick.billing.checkoutBlock(plan, {});
  const kids = block.children.map(c => c.tag);
  ok(kids[kids.length - 1] === 'button' && kids.indexOf('button') === kids.length - 1, 'the button comes AFTER the terms (they sit immediately above it)');
  ok(block.children.filter(c => c.tag === 'p' || c.tag === 'strong').length >= 3, 'the terms are rendered in the same block as the button');
  ok(!block.children.some(c => c.tag === 'input'), 'no checkbox (nothing pre-checked, nothing to pre-check)');
  let threw = false; try { ctx2.Stick.billing.checkoutBlock({ ...plan, price: '' }, {}); } catch (e) { threw = true; }
  ok(threw && made.filter(m => m.tag === 'button').length === 1, 'an incomplete plan renders no button at all');
}

// ---------------------------------------------------------------- business details are never invented
{
  const ctx = vm.createContext({ console, Object, String });
  load('js/legal-config.js', ctx);
  const L = ctx.Stick.legal;
  ok(!L.isComplete() && L.missing().length === 5, 'with nothing filled in, the config reports every required field as missing');
  ok(L.operatorName === '' && L.postalAddress === '' && L.privacyEmail === '' && L.supportEmail === '' && L.copyrightEmail === '', 'no business details are pre-filled (nothing invented)');
  ok(L.dmcaRegistered === false && L.copyrightFormEnabled === false, 'DMCA registration is not claimed and the complaint form is off');
  ok(L.dmcaAgent.name === '' && L.dmcaAgent.email === '' && L.dmcaAgent.address === '', 'no agent details are pre-filled');
}

// ---------------------------------------------------------------- repository guarantees
{
  const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
  const pages = ['index.html', '404.html', 'unsubscribe.html', 'legal/privacy.html', 'legal/terms.html', 'legal/copyright.html'];
  for (const f of pages) {
    const h = read(f);
    ok(!/fonts\.googleapis|fonts\.gstatic/.test(h), `${f}: no Google Fonts reference`);
    ok(!/<script[^>]+src=["']https?:/i.test(h), `${f}: no remote script`);
    ok(!/<link[^>]+href=["']https?:\/\/(?!johnzach31)/i.test(h.replace(/<link[^>]+rel="icon"[^>]*>/g, '')), `${f}: no remote stylesheet/link tags`);
    ok(/http-equiv="Content-Security-Policy"/.test(h), `${f}: has a Content-Security-Policy`);
  }
  const css = read('assets/fonts/fonts.css');
  ok(!/https?:\/\//.test(css), 'fonts.css only references local files');
  ok((css.match(/@font-face/g) || []).length > 1000, 'fonts.css declares the self-hosted faces');
  const idx = read('index.html');
  ok(!/document\.cookie/.test(idx) && !/document\.cookie/.test(read('js/account.js')), 'no code sets or reads cookies');
  const bad = /fullstory|hotjar|clarity\.ms|posthog|sentry|logrocket|smartlook|google-analytics|googletagmanager|mixpanel|amplitude|segment\.com|plausible|matomo|datadog|newrelic|bugsnag|fbq\(|connect\.facebook/i;
  const files = ['index.html', '404.html', 'unsubscribe.html', ...fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f)];
  ok(files.every(f => !bad.test(read(f))), 'no analytics, session-replay or advertising SDK anywhere in the shipped code');
  const manifest = JSON.parse(read('assets/fonts/manifest.json'));
  ok(manifest.length > 80 && manifest.every(m => m.licenseFile && ['OFL', 'APACHE2'].includes(m.license)), 'every self-hosted font has a licence file and an OFL/Apache licence');
  ok(manifest.every(m => fs.existsSync(path.join(root, 'assets/fonts', m.family.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), m.licenseFile))), 'each licence file is present next to its fonts');
  const fam = [...idx.matchAll(/\{name:"([^"]+)", script:/g)].map(m => m[1]);
  ok(fam.every(f => manifest.some(m => m.family === f)), 'every font the app can pick is self-hosted');
  // the age gate is wired in front of the providers
  ok(/function requireAge\(go\)/.test(idx) && /beginProviderSignIn\("github"\)/.test(idx) && /function beginProviderSignIn[\s\S]{0,120}requireAge/.test(idx), 'both Google and GitHub sign-in go through the age screen');
  ok(!/Subscribe|Upgrade now|Start free trial|Buy Premium|Checkout/.test(idx.replace(/<!--[\s\S]*?-->/g, '')), 'no subscribe / upgrade / checkout button exists in the app');
  ok(!/GDPR.compliant|COPPA.(compliant|certified)|ADA.compliant|DMCA.protected|100% (secure|private)|military.grade/i.test(idx + read('README.md')), 'no compliance badges or unsupported security claims');
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
