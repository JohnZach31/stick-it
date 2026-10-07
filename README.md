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
| 👤 **Google Sign-In, or stay a guest** | Sign in to put your real name & photo on notes you share. Stick-It asks the provider only for your name, e-mail and profile photo; it never sees your password and asks for no access to your mail, calendar or files. Or skip it entirely: guest mode keeps everything on your device. |
| 🔗 **Sharing that actually works** | Share a board, a single note, or just a few selected notes with a link that opens instantly for whoever you send it to, no login or setup on their end. |
| 🖼️ **Photos that feel printed** | Drop or paste a photo onto the board and it becomes a Polaroid, a hand-cut print or a cut-out mounted on card, with an optional handwritten caption. |
| 🔎 **Focus mode** | Double-click a note to pick it up and write comfortably; Esc puts it back exactly where it was. |
| 📷 **One-click snapshot** | Grab an image of the board content on screen (never the menus or dialogs). |
| 🔍 **Search, minimap, undo** | Type to filter notes, jump around a big board, and undo almost anything: moves, deletes, colours, fonts, imports. |
| 🧲 **Handle a few at once** | Ctrl/Cmd+click or drag a box to select notes, then move, duplicate, copy/paste, share or send them to another board together. |
| ⌨️ **Real keyboard shortcuts** | Select, nudge, resize, zoom, all documented in-app, one hover away. |
| 📱 **Quick capture on your phone** | Tap the board and choose what to put down: a sticky, a photo, a voice memo or a video. Bigger tap targets, and the on-screen keyboard won't swallow the note you're typing into. |
| 📌 **Pin it for real** | Pin a note (or a whole selection with **P**) and a physical tack drops onto the paper; unpin and it falls away. Pinned things stay exactly where they are. |
| 🔄 **Turn things a little sideways** | Select a note, photo or scrap and drag its turn handle (Shift snaps to 5°, double-click straightens, or use *Arrange* in the menu). |
| 📚 **Piles and stacks** | Stack notes in a column, or collapse them into a pile you can browse one paper at a time. Nothing in a pile is ever deleted by collapsing it. |
| ▶️ **Links that become videos** | Paste a YouTube or Vimeo link (or click one already in a note) and choose to keep it as a link or play it right on the board. Nothing loads until you press Play. |
| ✅ **Done pile & Clean up** | Finished notes tuck into a Done pile; a tidy-up button arranges what's on screen, leaving pinned notes and zones alone. |
| 📜 **Legal, in the app** | Privacy, Terms, Storage, Accessibility, Young people and Copyright open inside Stick-It (English and Hebrew), generated from the same source as the public pages. |

---

## 🆕 What's new

**v0.8.3.3 — Sand the Edges** (in development): a hotfix pass. Tutorial keys and Skip work again (a second tutorial could stack on the first), a central layer scale puts dialogs above Done / Trash, piles show the real top paper with one set of reserved controls and can be edited in place, zones get a short menu (Material / Colour submenus), a readable title rail with its own fonts and a clickable object count, reactions are paper tabs with a searchable emoji slip, Done has a warmer stamp-and-chime sound, empty notes skip Trash, paper trims itself (with Undo), newspapers have eight clearly different looks, standalone legal pages match the in-app reader, Add video asks how first, Clean Up can tidy inside zones, Done / Trash are one small dock, and What’s New shows every update with a release map. See [docs/dev/LAYERS.md](docs/dev/LAYERS.md).

**v0.8.3.2 — Finish the Flow** (in development): paste text as a sticky or a clipping (and remember the choice), choose what double-click creates, zones that collapse and show what belongs to them, Done / Trash / Restore sounds and a stronger Done moment, optional newspaper pictures, collab invites as e-mail pills, a broader reaction picker, a safer sign-out, smarter Hebrew/English dates, a calmer Legal reader, and **every patch note and tour inside the app** (one canonical source: [docs/dev/PATCH-DATA.md](docs/dev/PATCH-DATA.md)).

**v0.8.2.2 — Touch the Paper** (in development): a physical tack, hand rotation, grouped *Paper* / *Arrange* menus, link-to-video for existing links, clearer delete, Legal & policies icons. Selecting several things with a drag box no longer leaves a text cursor in a note, so shortcuts like **P** act on the group instead of typing into it.
Earlier: v0.8.2.1 *Room to Breathe* (in-app legal reader, compact phone shell, pile browsing, safe video embeds), v0.8.2 *Get a Grip*. Full notes: [docs/patch-notes/](docs/patch-notes/).

---

## 🙏 Credits

Open-source fonts (SIL OFL / Apache 2.0, originally from [Google Fonts](https://fonts.google.com), now self-hosted; see [docs/fonts-licenses.md](docs/fonts-licenses.md)) · snapshots via [html2canvas](https://html2canvas.hertzen.com/) · accounts via [Supabase](https://supabase.com) with Google or GitHub sign-in · full list: [docs/legal/third-party-licenses.md](docs/legal/third-party-licenses.md)

## 📄 License

MIT. See [LICENSE](LICENSE).

## Cloud backend (optional)

Stick-It can run local-only (guest) or sync to a Supabase project. See `docs/backend/`:
`00-audit`, `01-database-and-security`, `02-architecture-and-auth`, `03-storage-migration-sharing`,
`06-setup` (manual steps, which values are public vs secret), `07-security-csp-status` (what is and isn't done).
Tests: `cd supabase/tests && npm ci && npm run test:all`. Legal pages and the in-app reader are generated: `python tools/build-legal.py`.

## Legal and privacy

Drafts and audits live in `docs/legal/` (start with `OWNER-ACTION-REQUIRED.md` and `LEGAL-RISK-REPORT.md`).
Nothing there is legal advice or a compliance claim; items marked `[OWNER INPUT REQUIRED]` are decisions only the
owner can make. Public pages: `legal/privacy.html`, `legal/terms.html`, `legal/copyright.html` (draft banners until the
business details in `js/legal-config.js` are filled in).
