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
  ok(L.operatorName === 'Jonathan Zachevsky' && L.operatorCountry === 'Israel' && L.lastUpdated === '2026-10-01', 'known public owner facts are set');
  ok(L.governingLaw === 'State of Israel' && /Tel Aviv/.test(L.proposedVenue), 'proposed governing law and venue are set (marked for legal review in the Terms)');
  ok(L.publicPostalAddress === null, 'no public postal address is configured (nothing invented, nothing private)');
  ok(L.supportEmail === null && L.privacyEmail === null && L.copyrightEmail === null, 'no contact e-mail is invented');
  ok(!L.isComplete() && L.missing().join() === 'supportEmail,privacyEmail,copyrightEmail', 'the draft status stays until the three contact fields exist');
  ok(L.dmcaRegistered === false && L.copyrightFormEnabled === false && L.parentConsentEnabled === false, 'DMCA registration, the complaint form and parent consent are not claimed');
  ok(L.dmcaAgent.name === '' && L.dmcaAgent.email === '' && L.dmcaAgent.address === '', 'no agent details are pre-filled');
  ok(!Object.keys(L).some(k => /home|residen|street/i.test(k)), 'the public config has no field for a private/residential address');
}

// ---------------------------------------------------------------- the dev helpers exist only on a local host
{
  const run = (hostname, config = {}) => {
    const ctx = vm.createContext({ console, Object, String, Array, localStorage: { getItem() { return null; }, removeItem() {} }, location: { hostname } });
    vm.runInContext('globalThis.window = globalThis; Stick = {config: ' + JSON.stringify(config) + '};', ctx);
    vm.runInContext(fs.readFileSync(path.join(root, 'js/dev.js'), 'utf8'), ctx);
    return ctx.Stick;
  };
  for (const h of ['johnzach31.github.io', 'stick-it.example.com', 'localhost.evil.com', '192.168.1.5', '']) ok(run(h).dev === undefined, `Stick.dev does not exist on "${h}"`);
  for (const h of ['localhost', '127.0.0.1']) {
    const S = run(h);
    ok(S.dev && ['resetAgeGate', 'resetConsent', 'showAgeFlow'].every(f => typeof S.dev[f] === 'function'), `Stick.dev has the three helpers on ${h}`);
  }
  ok(run('dev.stick-it.test', { DEV_HOSTS: ['dev.stick-it.test'] }).dev !== undefined, 'a host the owner lists explicitly in DEV_HOSTS also works');
  ok(run('johnzach31.github.io', { DEV_HOSTS: [] }).dev === undefined, 'with an empty DEV_HOSTS (production) nothing is exposed');
  const cfg = fs.readFileSync(path.join(root, 'js/config.js'), 'utf8');
  ok(/DEV_HOSTS:\s*\[\s*\]/.test(cfg), 'production config has an empty DEV_HOSTS list');
  const idx = ['index.html', 'js/app.js', 'css/app.css'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
  ok(!/URLSearchParams\([^)]*\)[^;]{0,120}(resetAge|ageOk|age\.ok|bypass)/i.test(idx), 'no query-string switch can bypass the age step');
  ok(!/ipify|ip-api|ipinfo|x-forwarded-for/i.test(idx), 'nothing in the app relies on an IP address');
  ok(!/Stick\.dev\s*=/.test(idx), 'index.html never assigns Stick.dev itself (only js/dev.js does, and only locally)');
}

// ---------------------------------------------------------------- the age bands (the real function, from index.html)
{
  const idx = ['index.html', 'js/app.js', 'css/app.css'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
  const start = idx.indexOf('var AGE_OK_KEY');
  const end = idx.indexOf('function ageFlag()');
  ok(start > 0 && end > start, 'found ageBandFor in the app');
  const NOW = new Date(2026, 9, 1);           // 1 Oct 2026 (month index 9)
  class FakeDate extends Date { constructor(...a) { if (a.length) super(...a); else super(NOW.getTime()); } }
  const ctx = vm.createContext({ Date: FakeDate });
  vm.runInContext(idx.slice(start, end), ctx);
  const band = (age) => ctx.ageBandFor(2026 - age, 9);      // born in the PREVIOUS calendar month of that year: past the birth month
  const want = { 8: 'child', 12: 'child', 13: 'teen', 16: 'teen', 17: 'teen', 18: 'adult', 25: 'adult' };
  for (const [age, b] of Object.entries(want)) ok(band(Number(age)) === b, `age ${age} -> ${b} (got ${band(Number(age))})`);
  ok(ctx.ageBandFor(2013, 10) === 'child', 'born 13 years ago THIS month: still "child" (the birth month has not passed)');
  ok(ctx.ageBandFor(2013, 9) === 'teen', 'born in the previous month 13 years ago: teen');
  ok(ctx.ageBandFor(2008, 10) === 'teen' && ctx.ageBandFor(2008, 9) === 'adult', 'the same rule at 18');
  ok(!/safeSet\(AGE_OK_KEY, \{[^}]*(year|month|birth)/i.test(idx), 'the stored age flag never contains a year, month or birth date');
  ok(!/Stick-It isn.{1,8}t available to you/i.test(idx), 'the old "Stick-It isn\'t available to you" refusal is gone');
  ok(!/AGE_BLOCK_KEY|ageBlocked/.test(idx), 'the old 24-hour under-age block is gone');
}

// ---------------------------------------------------------------- repository guarantees
{
  const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
  const pages = ['index.html', '404.html', 'unsubscribe.html', 'legal/privacy.html', 'legal/terms.html', 'legal/copyright.html', 'legal/young-people.html', 'legal/storage.html', 'legal/accessibility.html', 'legal/he/privacy.html', 'legal/he/terms.html', 'legal/he/copyright.html', 'legal/he/young-people.html', 'legal/he/storage.html', 'legal/he/accessibility.html'];
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
  const idx = ['index.html', 'js/app.js', 'css/app.css'].map(read).join('\n');
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
  ok(/function beginProviderSignIn\(provider\)\{\s*if\(!ageFlag\(\)\)/.test(idx) && /beginProviderSignIn\("github"\)/.test(idx) && /function beginGoogleSignIn\(\)\{ beginProviderSignIn\("google"\); \}/.test(idx), 'both Google and GitHub sign-in go through the age step first');
  ok(!/Subscribe|Upgrade now|Start free trial|Buy Premium|Checkout/.test(idx.replace(/<!--[\s\S]*?-->/g, '')), 'no subscribe / upgrade / checkout button exists in the app');
  ok(!/GDPR.compliant|COPPA.(compliant|certified)|ADA.compliant|DMCA.protected|100% (secure|private)|military.grade/i.test(idx + read('README.md')), 'no compliance badges or unsupported security claims');
}

// ---------------------------------------------------------------- Hebrew pages, strict CSP, private info
{
  const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
  for (const p of ['privacy', 'terms', 'copyright', 'young-people', 'storage', 'accessibility']) {
    const he = read(`legal/he/${p}.html`), en = read(`legal/${p}.html`);
    ok(/<html lang="he" dir="rtl">/.test(he) && /<html lang="en" dir="ltr">/.test(en), `${p}: Hebrew page is rtl, English is ltr`);
    ok(he.includes(`href="../${p}.html"`) && en.includes(`href="he/${p}.html"`), `${p}: the language switch links both ways`);
  }
  const idx = read('index.html');
  const csp = idx.match(/Content-Security-Policy" content="([^"]+)"/)[1];
  ok(!/script-src[^;]*unsafe-inline/.test(csp) && !/style-src [^;]*unsafe-inline/.test(csp.replace(/style-src-attr[^;]*/, '')), 'index.html CSP has no unsafe-inline for scripts or stylesheets');
  ok(!/<script>/.test(idx) && !/<style>/.test(idx), 'index.html has no inline script or style block');
  ok(['privacy', 'terms'].every(p => (read(`docs/legal/${p === 'privacy' ? 'privacy-policy' : 'terms'}-draft.md`).match(/^## \d+\./gm) || []).length === 21), 'English Terms and Privacy have 21 numbered sections');
  ok(['privacy-policy', 'terms'].every(p => (read(`docs/legal/he/${p}-draft.md`).match(/^## \d+\./gm) || []).length === 21), 'Hebrew Terms and Privacy have 21 numbered sections');
  // private-info audit over every tracked text file (strings are built from parts so this file never contains them)
  const secret = [['Maa', 'lot 8'].join(''), ['5884', '736'].join('')];
  const walk = (d) => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap(e => e.name === 'node_modules' || e.name === '.git' || e.name === '.claude' || e.name === 'fonts' ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const hits = walk('.').filter(f => /\.(html|js|mjs|ts|css|md|json|sql|txt|py)$/i.test(f) && secret.some(s => read(f).includes(s)));
  ok(hits.length === 0, 'no residential address string appears in any tracked text file');
  ok(!/\[OWNER INPUT REQUIRED: postal address\]/.test(read('docs/legal/terms-draft.md') + read('docs/legal/privacy-policy-draft.md')), 'the policies no longer ask for the owner postal address');
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
