<div align="center">

# 📌 Stick-It

### A playful sticky-note corkboard that lives entirely in your browser.

Drag notes around. Format them. Attach photos. Turn them into tasks with real calendar reminders.
Share a board with a link that just *works* — no login, no database, no build step.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen?style=for-the-badge&logo=googlechrome&logoColor=white)](https://johnzach31.github.io/stick-it/)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](#)
[![Zero Build](https://img.shields.io/badge/build%20step-none-ff69b4?style=for-the-badge)](#)
[![No Backend](https://img.shields.io/badge/backend-none-6f42c1?style=for-the-badge)](#)

</div>

---

## ✨ What it does

| | |
|---|---|
| 🖱️ **Infinite corkboard** | Click anywhere to stick a note. Scroll or swipe sideways for more room. `Ctrl/Cmd + / -` zooms the whole board. |
| ✍️ **Rich text notes** | Headings, bullet lists, and drag-and-drop images — all tucked behind one tidy "⋯" menu per note so the board stays clean. |
| 🎨 **A little chaos, on purpose** | Every note gets a random handwriting font and color (or lock one font in Settings if you'd rather it behave). |
| ✅ **Tasks & real reminders** | Mark a note as a task, give it a date, and download a genuine `.ics` calendar invite — Google Calendar, Outlook, Apple Calendar, all of it. |
| 🗂️ **Multiple boards** | Work, Personal, whatever — switch boards from the header, each with its own notes. |
| 👤 **Google Sign-In, or stay a guest** | Sign in to put your real name & photo on notes you share — Stick-It only ever sees your name, email, and photo, never your password or your Gmail/Calendar/Drive. Or skip it entirely; guest mode asks for nothing. |
| 🔗 **Sharing that actually works** | "Share" encodes the note data straight into the link. Anyone who opens it sees it — instantly, no account, no server, no expiry. |
| 📷 **One-click snapshot** | Grab a JPEG of exactly what's on screen. |
| 🔍 **Search, minimap, undo** | Type to filter notes, jump around a big board from a minimap, and undo an accidental delete before it's gone for good. |
| ⌨️ **Real keyboard shortcuts** | Select, nudge, resize, zoom — all documented in-app, one hover away. |
| 📱 **Built for touch too** | Bigger tap targets on mobile, and the on-screen keyboard won't swallow the note you're typing into. |

---

## 🚀 Try it locally

No build step. No `npm install`. Pick one:

```bash
open index.html
```

or serve it properly (so sharing/clipboard behave exactly like production):

```bash
python -m http.server 8000
# → http://localhost:8000
```

## ☁️ Deploying

It's a single static file — it'll run anywhere.

**GitHub Pages**
1. Push this repo.
2. Settings → Pages → Deploy from a branch → `master` / `/ (root)` → Save.
3. Live at `https://<you>.github.io/<repo>/` within a minute.

**Vercel / Netlify** — drag the folder into the dashboard, or `vercel` / `netlify deploy`. No build command; it's already static.

### 🔑 Turning on Google Sign-In

Off by default until you plug in your own Client ID (nobody else's app should be able to use it):

1. [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) → **Create Credentials → OAuth client ID → Web application**.
2. Under **Authorized JavaScript origins**, add every URL you'll open the app from, e.g. `https://johnzach31.github.io` and `http://localhost:8000` for local testing.
3. Copy the generated Client ID into `index.html`:
   ```js
   var GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";
   ```
4. Reload — the "Continue with Google" button lights up. Until this is set, it shows a friendly heads-up instead of pretending to work.

---

## 🧠 How the "no backend" magic works

| Feature | How |
|---|---|
| **Storage** | Everything — notes, boards, settings — lives in your browser's `localStorage`. Nothing is ever sent anywhere. |
| **Sharing** | The note/board data is base64-encoded directly into the URL hash (`#sb=…`, `#sn=…`). The link *is* the database. |
| **Calendar** | Generates a standard `.ics` file client-side and downloads it. No Google API key, no OAuth. |
| **Google Sign-In** | Uses [Google Identity Services](https://developers.google.com/identity/gsi/web) — a client-only sign-in flow, no server-side secret required. |

---

## 🙏 Credits

Fonts from [Google Fonts](https://fonts.google.com) · snapshots via [html2canvas](https://html2canvas.hertzen.com/) · sign-in via [Google Identity Services](https://developers.google.com/identity/gsi/web)

## 📄 License

MIT — see [LICENSE](LICENSE). Do whatever you want with it.
