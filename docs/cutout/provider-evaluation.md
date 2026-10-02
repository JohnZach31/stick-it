# Real cutouts: how the model was chosen

Evaluated 2026-10-01 for v0.8.0. Decision first, evidence after.

## Decision
**On-device segmentation with the U²-Net family, run in the browser with ONNX Runtime Web (WebAssembly).**
- **Quick** (default): `u2netp`, 4.6 MB, Apache-2.0, bundled in the repository (`assets/models/u2netp.onnx`).
- **Second look** (used by *Retry*): the same `u2netp` model run on the photo and on its mirror image, averaged. No extra download.
- **Finer edges (experimental, NOT shipped)**: `silueta`, 44 MB, a size-reduced U²-Net. Its weights' provenance is unverified, so the file is not in the repository or on the site (`.gitignore`) and the option is off (`FINER_MODEL: false` in `js/config.js`). To experiment locally: put the file at `assets/models/silueta.onnx`, run the dev server, and set `stickit.dev.config` to `{"FINER_MODEL": true}` (honoured on localhost only). It is fetched only when someone explicitly runs that engine.
- A **guided filter** against the full-resolution photo (our own code, `js/cutout.js`) snaps the model's soft 320-pixel mask onto the real edges of the photo; stray blobs and tiny holes are cleaned; the person can then Erase / Restore / adjust Edges by hand.
- **No photo leaves the device for a cutout.** There is no provider, no API key, no secret, nothing to rate-limit, and nothing to put on a cloud bill. The only network traffic is the one-off download of the model file(s) and the ONNX runtime from Stick-It's own site.

## Why not the alternatives
| Option | Quality | Licence | Size / cost / privacy | Verdict |
|---|---|---|---|---|
| **BiRefNet_lite** (MIT) | best (hair, thin structures) | MIT | 224 MB fp32, 114 MB fp16. Native CPU: ~17 s per image. **Did not run in the browser here**: both WebAssembly and WebGPU aborted while loading/allocating (a 1024-pixel Swin/deformable model is too heavy for 32-bit WASM and the GPU path failed on the fp16 graph). Above GitHub Pages' 100 MB file limit | Rejected for now. Revisit when browsers handle it, or as an optional server tier |
| **RMBG-1.4** (briaai) | very good | **non-commercial** ("other") | 44-176 MB | Rejected: licence |
| **ISNet / IS-Net general** (community ONNX conversion) | good | the conversion on Hugging Face is tagged **AGPL-3.0** | 44-176 MB | Rejected: copyleft |
| **MODNet** | excellent for people only | Apache-2.0 | 6-26 MB | Rejected: portrait-only (buildings, products and animals are core uses) |
| **U²-Net full** (176 MB) | good | Apache-2.0 | too large for a browser download | Rejected: size |
| **u2netp / silueta** | good on single subjects, soft on fringes | Apache-2.0 lineage | 4.6 / 44 MB, 2-6 s in WASM | **Chosen** |
| Hosted APIs (remove.bg, Photoroom, Replicate-hosted models) | very good | per provider | per-image cost; **photos leave the device**; needs a secret held in an Edge Function and rate limiting | Not needed for the headline feature; keep as a possible future "pro" tier |
| Supabase Edge Function running a model | n/a | n/a | Edge Functions cannot hold a 100-200 MB model within their memory/CPU limits | Not feasible |

## Licences (for the owner and counsel)
- `u2netp.onnx`: from the official U²-Net repository, **Apache-2.0** (https://github.com/xuebinqin/U-2-Net, LICENSE confirmed).
- `silueta.onnx`: a reduced U²-Net distributed by the `rembg` project (MIT). Its lineage is U²-Net (Apache-2.0); the weights file's own provenance is less explicit than the official one. **Decision for this release: not shipped** (kept out of the repository; the feature has one model plus the mirror-image second look). It can be re-added in a later release once the provenance is confirmed or a clearly licensed replacement is found.
- `onnxruntime-web` 1.22.0: MIT (`js/vendor/ort/LICENSE`).
- Licence texts/attribution: `docs/legal/third-party-licenses.md`.

## Results on the evaluation set (browser, single-threaded WebAssembly)
Photos from Wikimedia Commons under CC licences (kept out of the repository). "Area" = fraction of the picture kept.

| Subject | Quick (area, time) | Finer (area, time) | Verdict |
|---|---|---|---|
| Person (portrait) | 0.173, 2-3 s | 0.178, ~6 s | Good. Quick leaves a faint fringe at the hem; finer is cleaner. Hair strands are approximated |
| Dog | 0.068, 1.8 s | 0.066, ~6 s | Good, fur edge natural |
| Shoe / product | 0.224, 1.9 s | 0.222, ~6 s | Good. The foot and leg count as the subject (as a person would see it) |
| Eiffel Tower (building) | 0.136, 1.9 s | 0.131, ~6 s | Good. The lattice and the see-through arch stay see-through; quick smudges the base slightly |
| Plant | 0.183, 1.8 s | 0.159, ~6 s | Good. Leaves and stem; the pot is dropped |
| Food | 0.358, 1.9 s | 0.423, ~6 s | Reasonable. Whether the plate counts is a judgement call: Retry changes it, Erase/Restore settles it |
| Complex scene (night market) | picks a billboard | **nothing found** | Not a clean cutout. Finer returns an empty mask, which shows "Couldn't make a clean cutout. Your original photo is unchanged." with Retry / Use original / Cancel |
| Ambiguous (foggy forest) | soft smear | almost nothing | Not a clean cutout; the manual tools or "Use original" are the answer |

Honest summary: **single-subject photos of people, animals, buildings, products and plants work well; cluttered or ambiguous scenes do not**, and the product says so instead of pretending.

## Performance and limits
- Working resolution is capped at 1280 px on the long side; the stored original is never changed. The cutout is saved as a PNG cropped to the subject (typically 150-600 KB).
- WebAssembly runs single-threaded on GitHub Pages (no cross-origin isolation headers are possible), so a cutout takes about 2-3 s (quick) and 6-12 s (finer, the first time includes the 44 MB download). The loader shows no fake percentages; the model download shows real bytes.
- Photos are stored at 1000 px in Stick-It already, so a small subject in a large scene yields a small cutout (a dog that fills 7% of the frame is about 230 px wide). Fine at board size, soft if enlarged a lot.
- Result caching: a cutout is generated once and stored (guest: IndexedDB; account: an asset whose `source_asset_id` is the original). Switching Cutout, Polaroid and Mounted never reruns segmentation.

## Security notes
No server component, no URL fetched on behalf of a client, no secret in the browser. The derived PNG is uploaded through the normal asset pipeline: `create_asset` checks ownership and the board, the `cutout` kind allows only PNG/WebP up to 10 MB, `finalize_asset` re-checks size and type, and the asset's source must be readable by the uploader. `script-src` gained `'wasm-unsafe-eval'` (needed to compile WebAssembly; it does not enable JavaScript `eval`).
