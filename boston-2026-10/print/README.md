# print/ — the printed tent card and quarter-sheet flyer

**The build of [`SPEC-print-pieces.md`](../SPEC-print-pieces.md)**: two of the four mock-ups ([`mockups/`](../mockups/README.md)),
printed. A printed piece is **another surface of the same content, never a second copy of it**: its page is the mock-up's
own face, made by `mockups/pieces.mjs` (`flyerFace`, `tentFace`) from `mockups/parts.mjs` and the mock-ups' inputs
(`mockups/inputs.mjs`: `data/`, the template's tokens and fonts, the photo manifest), so a change to a shared file
changes the mock-up and the printed piece alike (Q7). This folder adds only the page around the face, the sizes and the
checks. The legend (*"Where each part comes from"*) is a screen-share device and is **not printed** (Q8).

## Build

```sh
npm --prefix boston-2026-10 run build:print                                           # placeholders: every piece a -PROOF
npm --prefix boston-2026-10 run build:print -- --photos-dir DIR --rungs FILE          # the glam set, by § 3's rule
npm --prefix boston-2026-10 run build:print -- --photos-dir DIR --rungs FILE --on 2026-10-23 --event demo
```

`dist-print/` (**git-ignored, emptied at every run, never hand-edited**): `flyer.pdf`, `tent-card.pdf`, a PNG proof of
each at 1× (one pixel per CSS pixel, 96 per inch: the PDF's page as Chrome draws it), and `assignment.json` (which photo
went where, by ID, with its pixels, its window and its ppi). **A piece carrying any placeholder** (a photo position
without a photo, or the offer while `data/offers.json` says `"status": "placeholder"` or its label is a bracketed
stand-in such as `[The offer]`) **is a proof**: its files end `-PROOF`, and the report's last line names what remains.

- **`--photos-dir`**: the glam set's files, `<id>.jpg`, full size. **`--rungs`**: Image Gauge's `image-rungs.json`
  for the glam set (`pools.glam.rungs`). The two go together. ⛔ Neither the folder nor the file is ever in this
  repository. The report names positions and rungs, not photo IDs (only a refusal over a missing or unreadable file
  names its `<id>.jpg`); `dist-print/assignment.json` (ignored) names them.
- **The rule** (`assign.mjs`): the flyer takes rung 1's first photo (`strongest`, then `also_good`, in the file's
  order); the tent card's `tent-large`, `tent-top` and `tent-bottom` take, in order, the first array of rung 3 without
  the flyer's photo. A pool, rung or array missing is refused, naming it.
- **`--on`** picks the offer by `offerForSave`, and **`--event`** the event whose QR code the pieces carry (default: the
  first in `data/events.json`), as for the mock-ups. The report names the offer, the event and the URL the code carries.

## How a page is made, and checked before it is printed

1. **The page** (`pages.mjs`): the mock-up's face on a page of the sheet plus the bleed, its style the mock-ups'
   (`:root` tokens, fonts, `mockups.css`), then [`print.css`](print.css), then the sizes as a few generated rules. The
   mock-ups' layout unit (120 px a real inch) is zoomed to the CSS inch, so the face keeps the mock-up's proportions.
2. **The photos** are copied, under their position's own file name (`mockups/photos.json`), into a temporary folder the
   page is printed from and that is removed after: no photo's ID or file name is in a page.
3. **The measuring pass** (`measure.js`, headless Chrome `--dump-dom` over a copy of the page) finds every photo window,
   every run of text, the QR code and every painted field. **The build refuses, printing nothing**, when (`checks.mjs`):
   a photo is below **300 ppi** at its window (its pixels from the JPEG's header, upright, against the window's printed
   inches, bleed included; the smaller of the two ratios, since it fills the window); text or the QR code is less than
   **0.125 in** inside its face's edges (the tent's fold too); a field meets a cut edge of the trim without running on
   to the page's edge; or a page or trim is not § 2's size.
4. **The PDF** (`--print-to-pdf`, `@page` sized) and **the PNG proof** (`--screenshot`), by `mockups/png.mjs`'s
   `runChrome`: one way to run Chrome in this package.

## Sizes ([`sizes.mjs`](sizes.mjs), one place, to change when the vendor's specification is known)

| piece | trim | PDF page (trim + 0.125 in bleed on every edge) | layout |
|---|---|---|---|
| flyer | 4.25 × 5.5 in, portrait | 4.5 × 5.75 in = **324 × 414 pt** | the mock-up's flyer; the navy bar and the hero run into the bleed, the bar's words 0.125 in inside the trim |
| tent card | two faces, each 6 × 4 in, landscape, on one 6 × 8 in sheet | 6.25 × 8.25 in = **450 × 594 pt** | the mock-up's tent card's parts, **landscape** (the mock-up's face is portrait): the bar across the top at the fold, its three photos (the large one two rows tall, the tiles beside it) in the left half, the rest of the face in the right half. **The upper face is the lower face turned 180°** (one face's markup twice, the first `rotate(180deg)`), so folded on the centre line into an A-frame both read upright (Q2) |

No crop marks, and no CMYK conversion: colours are the page's own sRGB tokens (§ 2 ⚠). The QR code is `build.mjs`
`writeQrCodes`' SVG, drawn as vector.

## Tests (`test/q*.test.mjs`; `node --test`, no network)

| | case |
|---|---|
| Q1 | § 2's sizes in points; each PDF one page, its media box the trim plus twice the bleed; the measured page and trims; the checks' controls (text, QR, an unbled field, a wrong size) |
| Q2 | the tent: one face's markup twice, the first turned 180° and nothing else turned; the fold on the sheet's centre line; the proof's upper half turned is its lower half (with an unturned control) |
| Q3 | the assignment over fixture rungs: rung 1's first, rung 3's first array without it, a containing array skipped, every missing part refused by name |
| Q4 | the JPEG size reader (EXIF quarter turns); the effective resolution; 299 refused and 300 passing; a build with a low-resolution fixture refused, naming the position and the ppi, nothing printed |
| Q5 | `dist-print/` ignored; after a build with fixture photos `git status` unchanged, every file written ignored, no committed file holding a fixture ID |
| Q6 | `-PROOF` with no photos, and with photos while the offer is a placeholder; plain names with photos and a named offer; the last line |
| Q7 | a word changed in a mirror of `data/messages.json` changes the mock-up's flyer and the printed one alike; every printed text run is the mock-up's own; the build's QR; no colour of the print's own |
| Q8 | no legend, switch, caption or script on a printed piece (the mock-ups' as the control) |

The cases that render (Q1, Q2, and parts of Q4–Q6) need Chrome (`CHROME=<path>`, else the macOS default) and **skip,
saying so, when none is found**. Their photos are synthetic JPEGs made at test time (`test/print-fixtures.mjs`) with IDs
made at random, and they build into a temporary folder, so `npm test` never empties a real `dist-print/`. They build
one at a time across the suite's parallel processes (a lock directory in the system's temporary folder): several builds
at once, beside the rest of the suite, starved Chrome past its 90 s timeout on a loaded machine.
