# Testing the age flow (development only)

The helpers exist **only** when the page is served from `localhost`, `127.0.0.1` or a host the owner lists in `Stick.config.DEV_HOSTS`. Production has an empty list, so `Stick.dev` is undefined there. There is no query-string, password, IP or hidden-menu bypass, because none of those is a real boundary.

In the browser console on a local host:

```
Stick.dev.resetAgeGate()   // forget the local age result
Stick.dev.resetConsent()   // forget local mock consent / child-test state
Stick.dev.showAgeFlow()    // open the age step
```

Settings also shows a "Developer (local only)" section with the same actions.

These change only this browser. Server records (`age_band`, `parental_consent_status`) change only with SQL / the service role, for example against the local fake server or a test project:

```
update profiles set age_band = null where id = '<uuid>';
select parental_consent_set('<uuid>', 'approved', 'test', 'dev', null);
```

Never use the service role from browser code. Automated coverage: `supabase/tests/billing.test.mjs` (host matrix, band boundaries), `client.test.mjs`, `run-tests.mjs` section K.

## When the age step appears
Opening Account shows the sign-in choices; no age form yet. The age step ("A quick check") appears only after choosing Google, GitHub or "Continue with email", and is skipped when this browser already knows a band: the 1-hour `stickit.age.ok` flag, or the 90-day `stickit.age.known` hint (band only, set once an account with a band has been loaded here). A brand-new account with no band is still asked right after sign-in, and the server blocks cloud writes until `set_age_band` has run. `Stick.dev.resetAgeGate()` clears both local keys. `Stick.dev.loader.show/done/fail/hide` previews the loader states on local hosts only.
