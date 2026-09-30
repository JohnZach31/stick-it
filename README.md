<div align="center">

# 📌 Stick-It

### A playful sticky-note corkboard that lives entirely in your browser.

Drag notes around. Format them. Attach photos. Turn them into tasks with real calendar reminders.
Share a board with a link that just *works*.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen?style=for-the-badge&logo=googlechrome&logoColor=white)](https://johnzach31.github.io/stick-it/)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg?style=for-the-badge)](LICENSE)

</div>

---

## ✨ What it does

| | |
|---|---|
| 🖱️ **Infinite corkboard** | Double-click anywhere to stick a note (tap on touch screens). Scroll or swipe sideways for more room, or zoom the whole board. |
| ✍️ **Rich text notes** | Headings, bold, italic, a marker-style highlighter, lists, hand-drawn checklists (it'll offer when your note looks like a list), links and resizable photos, all tucked behind one tidy menu per note so the board stays clean. |
| 🎨 **A little chaos, on purpose** | Every note gets its own handwriting, colour, tape or pin, and a crease or two. Tap **Aa** to try another hand. Hebrew, Chinese, Japanese and Korean get fonts that actually have those letters. |
| ✅ **Tasks & real reminders** | Write "Dentist Tuesday 17:30" and Stick-It spots the date; one click adds it to Google Calendar or downloads a reminder for Apple Calendar / Outlook. Tasks with due dates still work too. |
| 🗂️ **Multiple boards** | Work, Personal, whatever. Switch boards from the header, each with a live little thumbnail of its own notes, or a cover and subtitle you choose. |
| 👤 **Google Sign-In, or stay a guest** | Sign in to put your real name & photo on notes you share. Stick-It only ever sees your name, email, and photo, never your password or your Gmail/Calendar/Drive. Or skip it entirely; guest mode asks for nothing. |
| 🔗 **Sharing that actually works** | Share a board, a single note, or just a few selected notes with a link that opens instantly for whoever you send it to, no login or setup on their end. |
| 🖼️ **Photos that feel printed** | Drop or paste a photo onto the board and it becomes a Polaroid, a hand-cut print or a cut-out mounted on card, with an optional handwritten caption. |
| 🔎 **Focus mode** | Double-click a note to pick it up and write comfortably; Esc puts it back exactly where it was. |
| 📷 **One-click snapshot** | Grab an image of the board content on screen (never the menus or dialogs). |
| 🔍 **Search, minimap, undo** | Type to filter notes, jump around a big board, and undo almost anything: moves, deletes, colours, fonts, imports. |
| 🧲 **Handle a few at once** | Ctrl/Cmd+click or drag a box to select notes, then move, duplicate, copy/paste, share or send them to another board together. |
| ⌨️ **Real keyboard shortcuts** | Select, nudge, resize, zoom, all documented in-app, one hover away. |
| 📱 **Quick capture on your phone** | Tap the board and choose what to put down: a sticky, a photo, a voice memo or a video. Bigger tap targets, and the on-screen keyboard won't swallow the note you're typing into. |

---

## 🙏 Credits

Fonts from [Google Fonts](https://fonts.google.com) · snapshots via [html2canvas](https://html2canvas.hertzen.com/) · sign-in via [Google Identity Services](https://developers.google.com/identity/gsi/web)

## 📄 License

MIT. See [LICENSE](LICENSE).

## Cloud backend (optional)

Stick-It can run local-only (guest) or sync to a Supabase project. See `docs/backend/`:
`00-audit`, `01-database-and-security`, `02-architecture-and-auth`, `03-storage-migration-sharing`,
`06-setup` (manual steps, which values are public vs secret), `07-security-csp-status` (what is and isn't done).
Tests: `cd supabase/tests && npm ci && npm run test:all`.
