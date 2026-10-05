# Content Security Policy

Every page sets a CSP with a `<meta http-equiv>` tag (GitHub Pages cannot send headers).

## Main app (`index.html`)
`default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob: <Supabase + avatar hosts>; media-src ...; connect-src 'self' <Supabase>; frame-src https://www.youtube-nocookie.com https://player.vimeo.com; object-src 'none'; base-uri 'self'; form-action 'self'`

- **`'unsafe-inline'` is gone from `script-src` and from `style-src`.** The former 390 KB inline script is now `js/app.js` and the inline stylesheet is `css/app.css`. There are no inline event handlers and no `javascript:` URLs.
- **One remaining relaxation: `style-src-attr 'unsafe-inline'`.** It only governs `style="..."` attributes written in HTML strings (about 50 in the markup and in a few `innerHTML` templates). Styles set from JavaScript (`el.style.x = ...`) are not affected by CSP. Removing this last relaxation means turning every `style="..."` attribute into a class; it is a separate, mechanical refactor and has not been done.
- Scripts can no longer be injected inline. An XSS that depended on inline script is blocked; the remaining exposure is style attributes only.

## Other pages
Legal pages, `404.html` and `unsubscribe.html` use `script-src 'self'; style-src 'self'` with no inline code.

## Notes
- The meta-tag form cannot express `frame-ancestors`, `report-uri` or `sandbox`. If the site is ever served from a host that can send headers, add `frame-ancestors 'none'`.
- Tested: the app boots with no blocked script, the boards render, dark mode and the account/age dialogs work. The browser console shows three "Applying inline style" messages that also appear on pages without any inline style, so they were not traced to app code (most likely the preview pane's own injected styling). A check in a normal browser with DevTools open is still worthwhile.
