# Content-Security-Policy

Delivered as a `<meta http-equiv="Content-Security-Policy">` tag in `index.html`, `404.html`, `unsubscribe.html` and the `legal/*.html` pages (GitHub Pages cannot set response headers). The policy was tested in a browser: guest use, sign-in against the stand-in, avatar upload, sharing, the public share page, and the fonts; the only violation seen was the stand-in's fake avatar host, which is the policy doing its job.

| Directive | Value in `index.html` | Why |
|---|---|---|
| `default-src` | `'self'` | Everything not listed is same-origin only |
| `script-src` | `'self' 'unsafe-inline'` | The app is one large file with inline script (`js/*` and the vendored libraries are same-origin). **`'unsafe-inline'` is a known weakness**: a future clean-up should move inline script out and use hashes. No remote scripts, no `eval` |
| `style-src` | `'self' 'unsafe-inline'` | Inline `<style>` and style attributes throughout |
| `font-src` | `'self'` | Fonts are self-hosted (no Google Fonts) |
| `img-src` | `'self' data: blob: https://*.supabase.co http://127.0.0.1:54321 http://localhost:54321 https://lh3.googleusercontent.com https://avatars.githubusercontent.com` | Signed storage URLs, pictures as data/blob URLs, provider profile photos. The two `127.0.0.1/localhost:54321` entries are for local development against the test backend and are harmless on the live site |
| `media-src` | `'self' blob: https://*.supabase.co http://127.0.0.1:54321 http://localhost:54321` | Voice memos / videos (signed URLs and local blobs) |
| `connect-src` | `'self' blob: data: https://*.supabase.co http://127.0.0.1:54321 http://localhost:54321` | Supabase API/auth/storage/functions; `blob:`/`data:` for fetching local pictures during export |
| `frame-src` | `'none'` | No embeds |
| `object-src` | `'none'` | No plugins |
| `base-uri` / `form-action` | `'self'` | |

Not possible with a meta tag: `frame-ancestors` (clickjacking protection) and report-only mode. If the site ever moves behind a host that can set headers, add `frame-ancestors 'none'` and move the policy to a header.

Supabase sign-in is a **top-level navigation**, which a CSP does not restrict, so Google/GitHub sign-in is unaffected. The legal pages and `unsubscribe.html` use a stricter policy with **no inline script**.
