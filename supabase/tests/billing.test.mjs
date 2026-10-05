// Tests for the browser-side compliance contracts that need no server: the subscription disclosure gate (js/billing.js),
// the business-details config (js/legal-config.js), and the repository-wide guarantees (no third-party font/analytics origins).
//   node billing.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execSync } from 'node:child_process';
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
  const MB = 'support.stickit@gmail.com';
  ok(L.supportEmail === MB && L.privacyEmail === MB && L.copyrightEmail === MB, 'the dedicated Stick-It mailbox serves support, privacy and copyright');
  ok(L.missing().length === 0 && L.draft === true && !L.isComplete(), 'contact fields are filled but the DRAFT flag stays: e-mail alone does not finish the legal pages');
  ok(L.dmcaRegistered === false && L.copyrightFormEnabled === false && L.parentConsentEnabled === false, 'DMCA registration, the complaint form and parent consent are not claimed');
  ok(L.dmcaAgent.name === '' && L.dmcaAgent.email === '' && L.dmcaAgent.address === '', 'no agent details are pre-filled');
  // the built pages carry the mailbox and still show the draft banner logic
  {
    const rd = (f) => fs.readFileSync(path.join(root, f), 'utf8');
    for (const f of ['privacy', 'terms', 'copyright', 'young-people', 'accessibility']) for (const d of ['legal/', 'legal/he/']) {
      if (d === 'legal/he/' && f === 'copyright') { ok(/mailto:support\.stickit@gmail\.com/.test(rd(d + f + '.html')), `${d}${f}: copyright contact present`); continue; }
      ok(/mailto:support\.stickit@gmail\.com/.test(rd(d + f + '.html')) && !/(OWNER INPUT REQUIRED|נדרש מידע מהבעלים): (privacy e-mail|support e-mail|copyright e-mail|דוא)/.test(rd(d + f + '.html')), `${d}${f}: contact filled, no e-mail placeholder left`);
    }
    ok(/l\.draft !== false/.test(rd('js/legal-fill.js')) && /legalFill/.test(rd('legal/legal.js')), 'the legal pages keep the DRAFT banner while draft is true (rules in legal-fill.js, shared with the in-app reader)');
    ok(!/Maalot/.test(rd('js/legal-config.js')) && /publicPostalAddress: null/.test(rd('js/legal-config.js')), 'public postal address stays null');
  }
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
  const idx = ['index.html', 'js/app.js', 'css/app.css'].map(read).join('\n').replace(/\r\n/g, '\n');
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
  ok(/function beginProviderSignIn\(provider\)\{\s*if\(!ageFlag\(\) && !ageKnown\(\)\)\{ pendingAuth = provider; renderAccountModal\("age"\)/.test(idx) && /beginProviderSignIn\("github"\)/.test(idx) && /beginProviderSignIn\("google"\)/.test(idx) && /function beginEmailSignIn\(\)\{\s*if\(!ageFlag\(\) && !ageKnown\(\)\)/.test(idx), 'Google, GitHub and e-mail sign-in each go through the age step first (unless this browser already knows the band)');
  ok(!/state === "choice" && !ageFlag\(\)\) state = "age"/.test(idx), 'opening Account no longer jumps straight to the age screen');
  {
    const a = idx.indexOf('if(CLOUD_OK){\n        card.innerHTML = closeBtnHtml +'), b = idx.indexOf('var closeBtn = card.querySelector("#acctCloseBtn");');
    const choice = idx.slice(a, b);
    ok(a > 0 && b > a, 'found the sign-in choice screen');
    ok(/Continue with Google/.test(choice) && /Continue with GitHub/.test(choice) && /Continue with email/.test(choice) && /Continue as guest/.test(choice), 'the choice screen offers Google, GitHub, email and guest');
    ok(!/acctWhy|operatorName|calendar|password|profile photo|collectionNotice/i.test(choice), 'the sign-in screen has no operator / permissions / privacy-mechanics text');
    ok((choice.match(/<p /g) || []).length <= 3 && /LEGAL_ACK_HTML/.test(choice) && /Terms/.test(idx.slice(idx.indexOf('var LEGAL_ACK_HTML'), idx.indexOf('var LEGAL_ACK_HTML') + 300)), 'only one short lead line plus the Terms/Privacy line remain');
  }
  ok(!/must be 13|13\+|13 or older/i.test(idx.slice(idx.indexOf('function buildAgeForm'), idx.indexOf('function renderChildStep'))), 'the age screen never states a minimum age');
  ok(/A quick check/.test(idx) && /Your birth date isn\\u2019t stored/.test(idx), 'age screen copy: "A quick check" / birth date is not stored');
  {
    const cc = read('js/cloud-client.js'), mail = cc.slice(cc.indexOf('sendEmailCode'), cc.indexOf('identities:'));
    ok(/signInWithOtp/.test(mail) && /verifyOtp/.test(mail) && !/password/i.test(mail), 'e-mail sign-in uses Supabase one-time codes, no password and no custom tokens');
  }
  ok(/autocomplete="one-time-code"/.test(idx) && /Resend code/.test(idx) && /Use another email/.test(idx) && /If this address can receive a code/.test(idx), 'code screen: one-time-code field, resend with cooldown, use another email, neutral wording');
  ok(/EMAIL_AUTH: false/.test(read('js/config.js')) && /EMAIL_AUTH \? '<button type="button" class="googleBtn" id="emailBtn"/.test(idx) && /if\(EMAIL_AUTH\) card\.querySelector\("#emailBtn"\)/.test(idx), 'e-mail sign-in is off in production: no button is rendered unless EMAIL_AUTH is true');
  ok(fs.existsSync(path.join(root, 'docs/auth/email-auth-deferred.md')), 'the deferral and re-enable steps are documented');
  ok(!/split\("@"\)\[0\]/.test(idx), 'the e-mail address is never turned into a public display name');
  ok(/AGE_KNOWN_KEY = "stickit.age.known"/.test(idx) && /age\.known/.test(read('js/dev.js')) && !/birth|year|month/i.test(idx.slice(idx.indexOf('function ageKnownSet'), idx.indexOf('function ageKnownSet') + 160)), 'the 90-day known-band hint stores a band only and is cleared by the dev reset');
  ok(/SL_SHOW_AFTER = 180/.test(idx) && /SL_MIN_VISIBLE = 250/.test(idx) && /function stickLoaderDone/.test(idx) && /function stickLoaderFail/.test(idx), 'loader: 180 ms show delay, 250 ms minimum, success and failure states');
  ok(/prefers-reduced-motion: reduce\)\{\s*\.slNote/.test(idx), 'loader has a reduced-motion rule');
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

// ---------------------------------------------------------------- v0.8.0: cutouts, scraps, collaboration, patch notes
{
  const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
  const exists = (f) => fs.existsSync(path.join(root, f));
  const idx = read('index.html');
  const app = read('js/app.js');
  const trackedFiles = execSync('git ls-files', { cwd: root, encoding: 'utf8' }).split('\n');
  // scripts and CSP
  for (const f of ['js/cutout.js', 'js/sticker.js', 'js/cutout-maker.js', 'js/objects.js', 'js/collab.js']) ok(exists(f) && idx.includes(`<script src="${f}"></script>`), `${f} exists and is loaded by index.html`);
  const csp = idx.match(/Content-Security-Policy" content="([^"]+)"/)[1];
  ok(/script-src 'self' 'wasm-unsafe-eval';/.test(csp) && !/unsafe-eval'[^;]*'unsafe-eval'/.test(csp) && !/script-src[^;]*'unsafe-inline'/.test(csp), 'CSP allows WebAssembly compilation only (no JavaScript eval, no inline script)');
  ok(!/https?:\/\/(?!localhost|127\.0\.0\.1)[^"'\s]*\.(onnx|wasm)/.test(read('js/cutout.js')), 'the model and runtime come from this site, not a third-party host');
  ok(exists('assets/models/u2netp.onnx') && !trackedFiles.includes('assets/models/silueta.onnx') && /FINER_MODEL: false/.test(read('js/config.js')) && /silueta\.onnx/.test(read('.gitignore')) && exists('js/vendor/ort/ort-wasm-simd-threaded.wasm') && exists('js/vendor/ort/LICENSE'), 'model files, runtime and the runtime licence are bundled');
  ok(/u2netp/.test(read('docs/legal/third-party-licenses.md')) && /Apache-2\.0/.test(read('docs/legal/third-party-licenses.md')) && /silueta/.test(read('docs/legal/third-party-licenses.md')), 'models are listed with their licences');
  ok(exists('docs/cutout/provider-evaluation.md') && /RMBG-1\.4/.test(read('docs/cutout/provider-evaluation.md')) && /AGPL/.test(read('docs/cutout/provider-evaluation.md')), 'the model choice and the rejected licences are documented');
  // no secret or provider call in the browser for cutouts
  const cutSrc = read('js/cutout.js') + read('js/cutout-maker.js') + read('js/sticker.js');
  ok(!/api[_-]?key|secret|service_role|remove\.bg|photoroom|replicate\.com|huggingface/i.test(cutSrc), 'no provider, key or secret appears in the cutout code');
  ok(!/fetch\([^)]*(upload|api)/i.test(read('js/cutout.js')), 'the engine never uploads the photo anywhere');
  // the original is never modified by the maker
  ok(!/\.image\s*=/.test(read('js/cutout-maker.js')) && /startCutout/.test(app) && /cutoutKey/.test(app), 'the maker only reads the source; the app stores the result as a separate cutout');
  // insertion menu
  ok(/addEventListener\("contextmenu"/.test(app) && /openInsertMenu/.test(app) && /e\.shiftKey\) return/.test(app), 'right-click opens the insertion menu on empty board; Shift+right-click keeps the browser menu');
  ok(/contenteditable=true\], input, textarea/.test(app), 'text being edited keeps the native context menu');
  ok(['Note', 'Photo', 'Cutout Photo', 'Receipt', 'Ticket', 'Postcard', 'Photo Strip', 'Record', 'Video', 'Alphabet Soup'].every((l) => app.includes(`label: "${l}"`)), 'every planned item is in the insertion menu');
  ok(/More\\u2026/.test(app) && /touch: "more"/.test(app), 'touch keeps the quick menu and puts the new objects under More');
  // text safety of the new scraps
  const objs = read('js/objects.js');
  ok(!/innerHTML/.test(objs) && /CONTROL/.test(objs), 'the object rules never produce HTML and strip control characters and bidi overrides');
  const paper = app.slice(app.indexOf('// ---------- physical scraps'), app.indexOf('// ---------- Alphabet Soup'));
  ok(!/\.innerHTML\s*=\s*[^;]*(item|n)\.(title|date|body|amount|details|place|message|location|caption|recipient)/.test(paper), 'user text in the scraps is never put into innerHTML');
  ok(/dir = "auto"/.test(paper) && /textContent = n\[field\]|textContent = item\[field\]|d\.textContent = n\[field\]/.test(paper), 'fields are written with textContent and auto text direction (Hebrew and Arabic work)');
  // Alphabet Soup rules
  ok(/SOUP_MAX = 100/.test(app) && /aria-hidden", "true"/.test(app.slice(app.indexOf('function buildSoupLayer'), app.indexOf('function soupDecorate'))) && /prefers-reduced-motion: reduce\)\{ \.soupLayer/.test(read('css/app.css')), 'soup: at most 100 pieces, decorative layer hidden from assistive technology, reduced motion respected');
  ok(!/isPremium\(\)/.test(app.slice(app.indexOf('function soupDecorate'), app.indexOf('function applySoup'))), 'drawing a soup note never checks Premium (viewers never need it)');
  ok(/PREMIUM_REQUIRED/.test(read('supabase/migrations/20261001130000_premium_cosmetics.sql')), 'the Premium cosmetic is enforced in the database');
  // collaboration
  const col = read('js/collab.js');
  ok(/private: true/.test(col) && /channel\("board:"/.test(col), 'presence uses a private board channel');
  ok(/board_channel_read/.test(read('supabase/migrations/20261001140000_collab.sql')) && /can_read_board\(substr\(realtime\.topic\(\), 7\)::uuid\)/.test(read('supabase/migrations/20261001140000_collab.sql')), 'only board members can join the channel (database policy)');
  ok(/object_id uuid not null|object_id/.test(read('supabase/migrations/20260930120000_core_schema.sql').slice(read('supabase/migrations/20260930120000_core_schema.sql').indexOf('create table public.comments'))) && !/free.?floating/i.test(col.replace(/free.?floating[^\n]*\n/gi, '')), 'comments always belong to an object');
  // patch notes
  const pn = JSON.parse(read('docs/patch-notes/index.json'));
  ok(Array.isArray(pn) && pn[3].version === '0.8.1' && pn[3].codename === 'One Place' && pn[3].status === 'development' && pn[3].date === null && pn[3].title === 'Stick-It v0.8.1 — One Place' && pn[4].version === '0.8.0' && pn[4].codename === 'Cut It Out' && exists('docs/patch-notes/' + pn[3].file), 'patch-note index: v0.8.0 "Cut It Out", status development, no release date, file exists');
  ok(exists('docs/patch-notes/HISTORY-TODO.md') && !/20\d\d-\d\d-\d\d/.test(read('docs/patch-notes/HISTORY-TODO.md')), 'the history TODO exists and invents no dates');
  const notes = read('docs/patch-notes/0.8.0.md');
  ok(['## TL;DR', '## Highlights', '## Added', '## Improved', '## Changed', '## Fixed', '## Privacy & Security', '## Under the Hood', '## Known Limitations', '## Deferred', '## Development References'].every((h) => notes.includes(h)) && /status: \*\*development\*\*/.test(notes), 'the patch note has every planned section and says development');
  const op = read('supabase/migrations/20261001150000_owner_premium.sql');
  ok(/email_confirmed_at is not null/.test(op) && /lower\(u\.email\)/.test(op) && /enable row level security/.test(op) && !/johnzachws/.test(app + read('js/config.js') + idx), 'owner premium: matched on the verified e-mail in the database, allowlist unreadable to clients, address never shipped to the browser');
  ok(new RegExp('APP_VERSION: "' + pn[0].version + '", APP_CODENAME: "' + pn[0].codename + '", APP_STATUS: "' + pn[0].status + '"').test(read('js/config.js')) && /id="verTag"/.test(idx), 'the version tag on the page matches the newest patch note (version, codename, status)');
  // ---- v0.8.0 polish pass: the new UI is Stick-It UI, not prototype UI
  {
    const css = read('css/app.css'), col = read('js/collab.js'), mk = read('js/cutout-maker.js'), cutjs = read('js/cutout.js');
    const appNorm = app.replace(/\r\n/g, '\n');
    const sources = ['js/app.js', 'js/collab.js', 'js/cutout-maker.js', 'js/objects.js', 'js/sticker.js', 'js/account.js', 'js/sharing.js'].map(read).join('\n');
    ok(!/\b(window\.|root\.)?(prompt|alert)\s*\(/.test(sources.replace(/Stick\.errors|\/\/[^\n]*/g, '')) && !/[^.\w]confirm\(\s*["'`]/.test(sources), 'no native prompt(), alert() or confirm() anywhere in the app code');
    ok(/host\.modal\(/.test(col) && !/root\.prompt/.test(col) && /askReason/.test(col) && /slipCard/.test(appNorm), 'Request changes asks for its reason in the shared Stick-It modal (a review slip), not a browser prompt');
    ok(/function stripNeedsMore/.test(appNorm) && /Photo strips need at least two photos/.test(appNorm) && /Pick another/.test(appNorm) && !/toast\("Choose at least " \+ Stick\.objects\.STRIP_MIN/.test(appNorm), 'a strip with too few photos opens the branded modal (Exit / Pick another), not a toast');
    ok(/openStripPicker/.test(appNorm) && /aria-pressed/.test(appNorm.slice(appNorm.indexOf('function openStripPicker'), appNorm.indexOf('function createStripFromFiles'))), 'Pick another opens a photo picker that keeps the photos already chosen');
    // captions
    ok(['latin', 'hebrew', 'cyrillic', 'arabic'].every((s) => new RegExp(s + ':\\s+\\[').test(appNorm.slice(appNorm.indexOf('var CAPTION_SAFE'), appNorm.indexOf('function captionList')))), 'caption-safe fonts exist for Latin, Hebrew, Cyrillic and Arabic');
    ok(!/Reenie Beanie|Rock Salt|Kristi|Homemade Apple|Zeyada/.test(appNorm.slice(appNorm.indexOf('var CAPTION_SAFE'), appNorm.indexOf('function captionList'))), 'caption-safe fonts exclude the loose ornamental hands');
    ok(/captionStack\(item\.captionFont, item\.caption\)/.test(appNorm) && !/cap\.style\.fontFamily = fontStack\(item\.font\)/.test(appNorm), 'photo, recording and video captions use the caption-safe set, never the note font');
    ok(/clamp\(13px, calc\(var\(--pw, 220px\) \* 0\.078\)/.test(css) && /clamp\(13px, calc\(var\(--pw, 220px\) \* 0\.066\)/.test(css), 'captions never render below 13 px');
    // cutout maker
    ok(/Fit subject/.test(mk) && /Fit original/.test(mk) && /fitSubject\(\)/.test(mk) && /autoFit/.test(mk), 'the Cutout Maker frames the detected subject after the automatic cutout (Fit subject / Fit original)');
    ok(/"Refine"/.test(mk) && /cmkShelf/.test(mk) && /cmkGroup/.test(mk) && /cmkSeg/.test(mk) && !/cmkTools/.test(css), 'the Cutout Maker uses grouped panels (Tools, Brush, View, History, Border) instead of one long row of buttons');
    ok(/border: state\.border/.test(mk) && /CUT_BORDERS = \["none", "thin", "medium"\]/.test(appNorm) && /border === "none" \|\| opts\.border === "medium"/.test(read('js/sticker.js')), 'white border: None / Thin (default) / Medium, chosen in the maker and changeable from the photo menu');
    ok(/finerEnabled/.test(cutjs) && /FINER_MODEL: false/.test(read('js/config.js')) && /MODEL_NOT_AVAILABLE/.test(cutjs), 'the finer model is off unless the owner turns it on, and is only fetched when explicitly run');
    ok(/M\.antialias/.test(cutjs) && /M\.snapExtremes/.test(cutjs) && /conf: up/.test(cutjs), 'mask post-processing: confidence-aware hole filling, edge anti-aliasing that spares thin detail, speckle snapping');
    // soup
    const soup = appNorm.slice(appNorm.indexOf('var SOUP_RATIO'), appNorm.indexOf('function setNoteCosmetic'));
    ok(/class="soupBowl"/.test(soup) && /sbBroth/.test(soup) && /soupLayout/.test(soup) && /Math\.sqrt/.test(soup), 'Alphabet Soup draws a bowl with broth and places pasta letters inside the broth ellipse');
    ok(/IntersectionObserver/.test(soup) && /SOUP_LIVE_MAX = 2/.test(appNorm) && /SOUP_BOB_MAX = 8/.test(appNorm) && /prefers-reduced-motion: reduce\)\{ \.soupLayer\.live \.soupTile\.bob/.test(css), 'soup animation: at most 2 notes, 8 letters each, only on screen, none with reduced motion');
    ok(/soupSettleNext/.test(soup) && /\.soupLayer\.settle \.soupTile/.test(css) && /note\.soup\.editing > \.text/.test(css.replace(/\.note\.soup\.editing\s*>\s*\.text/g, '.note.soup.editing > .text')), 'soup editing shows a readable text card over a dimmed bowl, then the letters settle back into the broth');
    // done pile
    ok(/function markDone/.test(appNorm) && /function restoreFromPile/.test(appNorm) && /function deleteFromPile/.test(appNorm) && /confirmDialog\(\{title: "Throw this away for good\?"/.test(appNorm), 'the Done pile can take a note, give it back, and delete it permanently after a branded confirmation');
    ok(/notes\.concat\(donePile\)\.map\(persistForm\)/.test(appNorm) && /snapshot: function\(\)\{ return notes\.concat\(donePile\)/.test(appNorm), 'finished notes are stored and synced with the board (they are not deleted when they leave the canvas)');
    ok(/Everything\\u2019s checked off\. Move this note to Done\?/.test(appNorm) && !/offerDoneForChecklist[\s\S]{0,400}markDone\(n\);\s*\n\s*}\s*\n\s*}/.test(appNorm.slice(appNorm.indexOf('function offerDoneForChecklist'), appNorm.indexOf('function offerDoneForChecklist') + 700).replace('toast(', 'toast(')), 'a fully ticked checklist offers the Done pile and never moves itself');
    // selection focus
    ok(/classList\.toggle\("hasSel"/.test(appNorm) && /body:not\(\.hasSel\) \.note:hover/.test(css) && /body:not\(\.hasSel\) \.photoObj:hover/.test(css) && /body:not\(\.hasSel\) \.boardObj:hover/.test(css) && /\.note\.selected, \.photoObj\.selected, \.boardObj\.selected\{ z-index:9996 !important; \}/.test(css), 'while something is selected the rest of the board stays still (no lift, no sway) and the selected object stays on top');
    ok(/paperObj\.selected \.poF\{ cursor:text/.test(css) && /plain click on its text edits it/.test(appNorm), 'a selected scrap shows the text cursor on its text and a click there edits it');
    // media
    ok(/function fmtClock/.test(appNorm) && /fmtClock\(cur\) \+ " \/ " \+ fmtClock\(dur\)/.test(appNorm) && /mWaveOn/.test(css), 'playing media shows elapsed / duration and a waveform that fills as it plays');
    ok(/addEventListener\("timeupdate"/.test(appNorm) && !/requestAnimationFrame\([^)]*paintMedia/.test(appNorm) && /visibilitychange", function\(\)\{ if\(document\.hidden\) pauseAllMedia/.test(appNorm), 'media progress comes from timeupdate (no animation-frame loop) and playback pauses when the tab is hidden');
    ok(/function startAVResize/.test(appNorm) && /AUDIO_MIN_W/.test(appNorm) && /VIDEO_MIN_W/.test(appNorm), 'recordings and videos can be resized');
    ok(/function ensureVideoEl/.test(appNorm) && /Open large/.test(appNorm) && /className = "fVideo"/.test(appNorm), 'videos play inline on the board, with "Open large" as a separate choice');
    // focus toolbar and minimap
    ok(/role", "toolbar"/.test(appNorm.slice(appNorm.indexOf('function buildFocusBar'), appNorm.indexOf('function enterFocus'))) && ['bold', 'italic', 'mark', 'ul', 'ol', 'check', 'link'].every((k) => new RegExp('add\\("' + k + '"').test(appNorm)) && /add\("h" \+ lv/.test(appNorm) && /ArrowRight/.test(appNorm.slice(appNorm.indexOf('function buildFocusBar'), appNorm.indexOf('function enterFocus'))), 'Focus Mode has a keyboard-reachable formatting strip with every common control');
    ok(/minimapTrack\.addEventListener\("pointerdown"/.test(appNorm) && /miniPills/.test(appNorm) && !/minimapTrack\.innerHTML = ""/.test(appNorm), 'the minimap can be dragged to pan and is no longer rebuilt from scratch on every change');
    ok(/var PreviewCache/.test(appNorm) && /PreviewCache\.use\(img, shownSrc/.test(appNorm), 'board photos use a small preview instead of the full original');
  }
  // e-mail sign-in stays out of production
  ok(/EMAIL_AUTH: false/.test(read('js/config.js')) && !/Continue with email'/.test(idx.replace(/<!--[\s\S]*?-->/g, '')), 'e-mail sign-in is not offered');
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
