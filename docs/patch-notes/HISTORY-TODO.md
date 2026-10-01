# Patch history still to reconstruct

Stick-It is pre-1.0. Versioning rule: `0.X.0` = a substantial feature release, `0.X.Y` = a bugfix/polish follow-up, `1.0.0` = a deliberate future milestone. **No old version numbers have been invented and no dates are guessed here.**

A dedicated git-history audit (`git log` per era) can later assign versions and write the notes for these earlier eras:

1. The original sticky-board foundation (single board, notes, local storage).
2. Physical-note and editor expansion (paper, tape, pins, fonts, formatting, checklists).
3. Standalone photos and media (photos, voice memos, videos).
4. Sharing and multi-select (public links, groups, boards).
5. Supabase accounts and cloud sync (sign-in, sync, assets, guest import).
6. Account settings and international fonts (profile, avatar, sharing identity, Hebrew/Cyrillic/Arabic).
7. Legal, privacy and accessibility hardening (age step, Israeli baseline, Hebrew pages, CSP).
8. Auth and loading redesign (clean sign-in dialog, sticky loader; e-mail sign-in built then deferred).

Each entry should follow `docs/patch-notes/0.8.0.md` and be added to `index.json` (newest first). A future public "Patch Notes / What's New" page can render straight from `index.json`; nothing for that is built yet.
