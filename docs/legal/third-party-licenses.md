# Third-party software, fonts and assets: licences

**This is an inventory, not legal clearance.** Where a licence has conditions they are listed; anything uncertain is flagged.

## Software shipped to the browser
| Component | Version | Where | Licence | Notes |
|---|---|---|---|---|
| supabase-js | 2.x (bundled UMD) | `js/vendor/supabase.js`, licence `js/vendor/supabase-js.LICENSE` | MIT | Attribution kept. Contacts the Supabase project only |
| html2canvas | 1.4.1 | `js/vendor/html2canvas.min.js`, licence `js/vendor/html2canvas.LICENSE` | MIT | Self-hosted since this patch (was loaded from cdnjs). Its bundle includes `tslib` (0BSD) |
| ONNX Runtime Web | 1.22.0 | `js/vendor/ort/` (3 files), licence `js/vendor/ort/LICENSE` | MIT | Runs the cutout model in WebAssembly, on the device. Loaded only when someone makes a cutout |
| Stick-It's own code | n/a | `index.html`, `js/*.js`, `legal/*`, `supabase/*` | the repository `LICENSE` | |

No other runtime library. Development/test only (not shipped): `@electric-sql/pglite` (Apache-2.0), `@supabase/supabase-js` (MIT) in `supabase/tests`.
Server-side (Supabase Edge Functions): `npm:@supabase/supabase-js` (MIT), run by Supabase.

## Machine-learning models (run on the device, shipped from this site)
| Model | File | Licence | Notes |
|---|---|---|---|
| U²-Net (portable "p" version) | `assets/models/u2netp.onnx` (4.6 MB) | Apache-2.0 (official repository) | Default "Quick" cutout. Attribution: https://github.com/xuebinqin/U-2-Net |
| silueta (size-reduced U²-Net, distributed by `rembg`, MIT) | `assets/models/silueta.onnx` (44 MB) | Apache-2.0 lineage; **provenance of the weights file is less explicit: owner/counsel to confirm or remove** | "Finer edges" retry only. Choosing and rejecting alternatives: `docs/cutout/provider-evaluation.md` |

Rejected for licence reasons (not shipped): RMBG-1.4 (non-commercial), the community ISNet conversion (AGPL-3.0).

## Fonts
85 families, all **SIL OFL 1.1** or **Apache 2.0**, self-hosted with their licence files. No copyleft beyond OFL's "keep the licence with the font, don't sell the font alone, don't reuse reserved names", no non-commercial licences, no restrictions on web embedding. Full list: `docs/fonts-licenses.md`.

## Icons, textures, images, sound
| Asset | Source | Licence / status |
|---|---|---|
| UI icons (`ICONS` in `index.html`) | Inline SVG drawn for this project (simple strokes). No icon pack was imported | Part of the project's own code. **Flag:** the paths were not generated from a third-party set, but provenance of every path is not provable; replace with a known licensed set if that matters |
| Logo (sticky note) and `docs/brand/stick-it-icon-512.png` | Drawn for this project | Project's own |
| Paper, tape, pin and washi textures | CSS gradients and clip-paths | Project's own, no image files |
| Google "G" mark (sign-in button) and GitHub mark (sign-in button) | Brand marks | **Third-party trademarks** used to identify the sign-in provider. Follow Google's and GitHub's brand/usage guidelines (do not alter, keep clear space). **Flag: brand-guideline check by the owner** |
| Sample images / illustrations | none bundled | n/a |
| Sound assets | none bundled (the app only plays user recordings) | n/a |
| User uploads | belong to the user (see Terms) | Stick-It claims no ownership |

## Services (not bundled)
Supabase, GitHub Pages, Google and GitHub sign-in: governed by their own terms; see `00-data-and-third-party-inventory.md`.
Cutouts use **no provider and no network service**: segmentation runs in the browser (see above). The model files are fetched from Stick-It's own site the first time they are needed.

## Flags
- Copyleft: **none** found in what ships. (OFL is a permissive-with-conditions font licence, not copyleft for the app.)
- Non-commercial restrictions: **none**.
- Attribution required: MIT / OFL / Apache notices are kept in the repository next to the files.
- Open: brand-guideline check for the two provider marks; icon provenance note above.
