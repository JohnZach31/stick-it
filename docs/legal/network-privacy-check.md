# Network privacy check

Method: the app was loaded in a browser and the Resource Timing list (`performance.getEntriesByType('resource')`) and `document.cookie` were read after each scenario. Guest scenarios ran against the real, production configuration (the real Supabase URL is configured). Signed-in scenarios ran against the local stand-in server, which plays the role of the Supabase project (its origin `127.0.0.1:54321` stands for `https://<project>.supabase.co`; its fake avatar host `img.example` stands for `lh3.googleusercontent.com` / `avatars.githubusercontent.com`). A real-project network recording in a signed-in session is **still to be done by the owner** (see OWNER-ACTION-REQUIRED).

| Scenario | Origins contacted | Notes |
|---|---|---|
| First load (guest, empty storage) | **own origin only** (18 requests: the page, `assets/fonts/*.woff2`, `js/*`) | No Google Fonts, no CDN, no analytics. The Supabase library is **not even loaded** until someone signs in |
| Guest use: new note, Settings, share dialog | own origin only | Share links for guests are built in the browser; nothing is sent |
| Sign-in modal and the age screen | own origin only | The provider is contacted only **after** the age screen is passed |
| Sign-in (redirect) | Supabase Auth, then Google or GitHub, then back | Navigation (not a background request) to the provider the person chose |
| Account settings, board editing, sync | the Supabase project only (stand-in `127.0.0.1:54321`) | REST + RPC calls |
| Sharing (server link) | the Supabase project only | Opening a link: the Supabase `resolve-share` function |
| Media upload / avatar | the Supabase project only (storage API) | Pictures are shrunk in the browser first |
| Provider avatar shown | `lh3.googleusercontent.com` or `avatars.githubusercontent.com` | Only if the person kept their provider photo; blocked-and-fallen-back in the test (stand-in host not in the CSP) |
| "Add to calendar" click | `calendar.google.com` | Only when the person clicks it |
| Cookies | **none** (`document.cookie` is empty throughout) | |

Result: **no request is made to `fonts.googleapis.com` or `fonts.gstatic.com` (0 requests)**; no request to any analytics, advertising, replay or CDN host. Unexpected origins found: **none**.
The Content-Security-Policy (`docs/legal/csp.md`) enforces this list: anything else is blocked by the browser.
