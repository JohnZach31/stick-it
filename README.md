# Stick-It

A playful sticky-note corkboard for the browser. Drag notes around, format them with headings and bullet lists, attach images, turn them into tasks with due dates, and share a board or note with a real link — no account, no backend, no build step.

Single HTML file. Vanilla JavaScript. Nothing to install.

## Features

- **Infinite corkboard** — click anywhere to stick a new note; scroll or swipe sideways for more room, or zoom the whole board with `Ctrl/Cmd + / -`.
- **Rich text notes** — headings, bullet lists, and inline images (drag-and-drop or click to upload), all stored locally in your browser.
- **Random handwriting fonts** — a new font and color for every note (or lock one font in Settings), with a corkboard-style pin, tape, and toolbar tucked into a single "⋯" button per note.
- **Tasks & due dates** — mark any note as a task, give it a date and time, and download it as a real `.ics` calendar invite (works with Google Calendar, Outlook, Apple Calendar — anything that imports `.ics`).
- **Multiple boards** — switch between named boards (Work, Personal, …) from the header.
- **Real sharing, no server** — "Share your board" or "Share this note" encodes the content directly into the URL. Anyone who opens the link sees it instantly; there's no database and nothing to configure. There's also a one-click JPEG snapshot of what's on screen.
- **Search, minimap, undo-delete, keyboard shortcuts** — the small things that make a corkboard actually usable once it fills up.

## Running it locally

There's no build step. Either:

```bash
open index.html
```

or serve it (recommended, so relative paths and clipboard/share features behave exactly like production):

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Deploying

It's one static file — any static host works.

**GitHub Pages**
1. Push this repo to GitHub.
2. Repo Settings → Pages → Deploy from a branch → pick `main` and `/ (root)`.
3. Your site is live at `https://<username>.github.io/<repo>/`.

**Vercel / Netlify**
Drag the folder into the dashboard, or `vercel` / `netlify deploy` from this directory. No build command needed — it's already static.

## How it works

- **Storage**: everything (notes, boards, settings) lives in `localStorage`, scoped to whatever domain you deploy this to. Nothing is sent to a server.
- **Sharing**: "Share your board/note" base64-encodes the note data straight into the link's URL hash (`#sb=…` for a board, `#sn=…` for a single note). Opening that link decodes it client-side and renders a read-only view — genuinely public, no database, no expiry. Boards with a lot of notes produce long links; for those, the JPEG snapshot is the more practical option.
- **Calendar**: "Add to Calendar" generates a standard `.ics` file and downloads it directly — no Google account or API key required.

## Credits

Fonts from [Google Fonts](https://fonts.google.com). Snapshot rendering via [html2canvas](https://html2canvas.hertzen.com/).

## License

MIT — see [LICENSE](LICENSE).
