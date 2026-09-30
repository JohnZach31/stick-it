# Fonts and languages

Every note picks a handwriting font that can draw its script. Each font has a `script`, a `mood` (pen, round, neat, marker, script) and optionally `also: [...]` for other scripts it really covers (e.g. Caveat covers Cyrillic). Fallback stacks are built per mood so mixed-language notes stay harmonious.

| script | status | fonts |
|---|---|---|
| Latin | rolled out (+16 this update, 36 total) | Caveat, Kalam, Gloria Hallelujah, Just Another Hand, Rancho, ... |
| Hebrew | rolled out (+7) | Solitreo, Gveret Levin, Rubik Scribble, Amatic SC, ... plus pick-only print fonts (Alef, Miriam Libre, Frank Ruhl Libre, Bellefair, David Libre) |
| Cyrillic | **new** | Marck Script, Bad Script, Pangolin, Comforter, Underdog, Ruslan Display (+ Caveat, Neucha, Amatic SC, Rubik, Rubik Scribble) |
| Arabic | **new** | Aref Ruqaa, Katibeh, Marhey, Rakkas, Lalezar, Reem Kufi, Mada, Lateef, Harmattan |
| Chinese / Japanese / Korean | as before | |

Detection: Unicode ranges per note text; the browser's language picks the default for empty notes (ru/uk/bg/... -> Cyrillic, ar/fa/ur -> Arabic). Right-to-left is handled by `dir="auto"`.

Rules: a font name is added to the Google Fonts request in `index.html` only after checking it exists and has the needed subset; the browser downloads only the ones a note uses. "Print-style" fonts are marked `rand:false`: they are choosable (Settings, Account settings, the note's font button) but never picked at random.

## Next rollouts (subsets already confirmed on Google Fonts)
- Greek: Mansalva (also Latin), plus Comfortaa-style rounds to be checked.
- Thai: Itim, Mali, Sriracha, Charm, Charmonman, Athiti, Srisakdi.
- Devanagari (Hindi): Kalam, Kurale, Gotu.
Each needs: entries in `FONTS`, a fallback per mood in `MOOD_FALLBACK`, `SCRIPT_NAMES`/`SCRIPT_ORDER`, `detectScript` ranges and `preferredScript` language codes.
