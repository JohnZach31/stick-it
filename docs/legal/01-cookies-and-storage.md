# Cookies, trackers and browser storage

Conclusion (verified in the code and in a browser): **Stick-It sets no cookies, loads no analytics, advertising, tracking-pixel or session-replay code, and contacts no third party for fonts.** The only browser storage is what the product needs to work (boards, settings, the sign-in session). There is therefore **no non-essential technology that needs a consent banner**, and none was added. If any optional analytics or similar is ever added, a real accept / reject / preferences control must be built first (see the checklist at the end).

Local storage is not called a "cookie" here. Whether storing it needs consent depends on the law in each country and on whether it is strictly necessary for something the person asked for; the rows flagged *[legal review]* are the ones a lawyer should confirm.

| Technology | Purpose | Essential? | Provider | Storage duration | Consent required? |
|---|---|---|---|---|---|
| Cookies | none set | n/a | n/a | n/a | n/a |
| localStorage: guest boards and notes (`stickyboard.*`) | Saving the person's own notes on their device | Yes: this *is* the product for guests | Stick-It (first party) | Until cleared | No: strictly necessary to provide the requested service [legal review] |
| localStorage: settings, tutorial state | Remembering preferences the person set | Yes | Stick-It | Until cleared | No (user-requested preference) [legal review] |
| localStorage: Supabase session (`stickit.auth`) | Keeping a signed-in person signed in | Yes | Supabase client library (first-party storage) | Until sign-out / token expiry | No (authentication) |
| localStorage: cloud cache (`stickyboard.cloud.<id>.*`) | Offline copy of the person's account boards | Yes | Stick-It | Until sign-out / deletion | No |
| localStorage: age-screen flags (`stickit.age.*`) | Remember a passed (1 h) or failed (24 h) age screen on this device | Yes (safety control) | Stick-It | 1 h / 24 h, then ignored | No [legal review] |
| IndexedDB `stickit-media` | Voice memos, videos, cached pictures | Yes | Stick-It | Until cleared / sign-out | No |
| Third-party scripts | none (html2canvas and supabase-js are bundled, first-party files) | n/a | n/a | n/a | n/a |
| Analytics, advertising, retargeting, pixels | none | n/a | n/a | n/a | n/a |
| Session replay | none (see below) | n/a | n/a | n/a | n/a |
| Embedded third-party content / iframes | none (CSP `frame-src 'none'`) | n/a | n/a | n/a | n/a |
| Fonts | self-hosted files | Yes | Stick-It | browser HTTP cache | No |

## Session replay
Searched the whole repository (HTML, JS, TS, configs, dependencies) for FullStory, Hotjar, Microsoft Clarity, PostHog, Sentry (including Replay), LogRocket, Smartlook, Datadog RUM, New Relic, Mixpanel, Amplitude, Segment, Plausible, Matomo, Google Analytics / Tag Manager, Facebook/Meta pixel. **None found. Session replay is not used. None was added.** Given how personal board content is, the owner's default should stay "no replay"; if it is ever wanted it must be opt-in, with all text, inputs, note bodies, e-mail, usernames and media masked.

## If an optional tracker is ever added (checklist)
1. Do not load it before a choice. 2. Buttons "Accept optional", "Reject optional" and "Preferences" of equal prominence; nothing pre-checked. 3. Store the choice. 4. Provide "Privacy / cookie preferences" in Settings and the footer. 5. Never send note text, comment text, filenames, board names or share tokens. 6. Update the privacy policy, this table and the CSP.
