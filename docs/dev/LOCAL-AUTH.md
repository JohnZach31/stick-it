# Signing in from localhost

**Symptom:** you start Google sign-in on `http://localhost:8123/`, finish at Google, and land on the GitHub Pages site (the old `master` build) instead of back on localhost.

## What the code does

`js/cloud-client.js` builds the return address from the page you started on (`redirectUrl()`):

* on `localhost` / `127.0.0.1` it is always that local origin **and port** + path (a configured production `REDIRECT_URL` is ignored on a loopback host);
* anywhere else it is `REDIRECT_URL`, or the page's own URL (GitHub Pages stays on GitHub Pages).

Nothing is hardcoded to Pages or to localhost. On localhost the console prints `[auth]` lines: the exact `redirectTo` it asked for, whether the page was reached by a sign-in callback (`?code=`), and whether a cached session was restored.

## Root cause of "it lands on Pages"

Supabase only honours a `redirectTo` that is in **Authentication → URL Configuration → Redirect URLs**. A request for a URL that is *not* in that list is silently replaced by the project's **Site URL**, which is the GitHub Pages address. The repo cannot change this setting (it lives in the Supabase dashboard).

## One-time fix (dashboard)

Add to **Redirect URLs** (keep the Pages entry):

```
http://localhost:8123/**
http://127.0.0.1:8123/**
```

(Use the port you run the dev server on. `tools/dev-server.mjs` uses 8123 by default.) Leave **Site URL** as the Pages address.

## Verify

1. `node tools/dev-server.mjs` and open `http://localhost:8123/`. The tab says "Stick-It — Local Development" and the corner reads `v… dev · localhost`.
2. Open DevTools → Console. Sign in with Google. Before leaving you will see `[auth] starting google sign-in; redirectTo = http://localhost:8123/`.
3. After Google, the address bar must be `http://localhost:8123/…` (not `github.io`). The console shows `[auth] page http://localhost:8123/ | returning from sign-in: yes (?code present)` and then `[auth] session restored: true`.
4. If the address bar is `github.io`, the redirect URL was not added (or has a typo / different port).

## Stale cached sessions

If the cached login is rejected by the server (invalid refresh token), the app forgets it and reloads once as a guest (`Stick.auth.staleSession` / `dropStale()`), with a toast, instead of waiting behind the red loader. A network hiccup does **not** count as stale. Guest mode never needs the network.

## Cache-proof dev server

`python -m http.server` sends no cache headers, so Chromium can serve a stale `js/app.js` and make a test lie. Use `node tools/dev-server.mjs [port]` (sends `Cache-Control: no-store`).
