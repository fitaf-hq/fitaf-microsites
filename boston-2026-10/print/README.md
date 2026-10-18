# print/ — the printed tent card and quarter-sheet flyer

**The build of [`SPEC-print-pieces.md`](../SPEC-print-pieces.md)**: two of the four mock-ups ([`mockups/`](../mockups/README.md)),
printed. A printed piece is **another surface of the same content, never a second copy of it**: its page is the mock-up's
own face, made by `mockups/pieces.mjs` (`flyerFace`, `tentFace`) from `mockups/parts.mjs` and the mock-ups' inputs
(`mockups/inputs.mjs`: `data/`, the template's tokens and fonts, the photo manifest), so a change to a shared file
changes the mock-up and the printed piece alike (Q7). This folder adds only the page around the face, the sizes and the
checks. The legend (*"Where each part comes from"*) is a screen-share device and is **not printed** (Q8).

⛔ **§ 7 (the Advisor, 2026-10-17): the pieces are the layouts he approved, through the photo pipeline already built.**
The print build re-lays out no face: its rules set the page, the bleed and the safe margin, and **nothing that moves a
part** (Q9 measured every part against the mock-up's sheet). The first tent proof, a landscape re-layout, was wrong.
Since then the Advisor himself has laid each face out anew, the flyer by § 9 and the tent card by § 10 (below), so Q9 is
retired and Q16 and Q17 measure the two layouts.

⭐ **§ 8 (the Advisor, on the § 7 proofs): fewer words, the logo in three places, four flyers.** The faces are still the
mock-ups' own (`tentFace`, `flyerFace`), given § 8's options, which **the mock-ups never take: they are unchanged**.
- **The words**: the tent drops its subhead and its scan prompt; the flyer drops its headline block (the rule, the
  headline, the tagline, the four plan names, the lowest price) and its scan prompt, and is the bar, the photo, the offer
  and the QR code. On both, `eatfitaf.com` sits directly under the QR code, centred on it. Emptied space stays empty.
- **The logo, three variants**, each its own proof named by its letter: **(a)** in the navy bar at its left, **(b)** on a
  plate over the main photo's corner, **(c)** larger, above the headline. ⛔ **Withdrawn**: for the flyer by § 9 and for
  the tent card by § 10; each piece now has one logo, at the bottom right of its face, and no file carries a letter.
- **Four flyers**, `flyer-1` to `flyer-4`, each a full single flyer with its own bleed and its own photo, as composed: the
  first array of rung 4 without the tent's three photos (else the first), in its order. The vendor imposes them; a PNG
  preview shows the four side by side (`flyer-1-4.png`).
- The photos' crops are unchanged by § 8 (the Advisor was choosing how the windows and Image Gauge's crops are
  reconciled: § 9 shaped the flyer's window to its photos, § 10 the tent's to Image Gauge's squares).

⭐ **§ 9 (the Advisor, 2026-10-17 22:37Z): the flyer without its header, the logo at the bottom right, a taller photo.**
The flyer and its four drop the navy bar and its words, and **§ 8's logo variants are withdrawn for the flyer**: it is one
flyer, named without a letter (`flyer.pdf`, `flyer-1.pdf` … `flyer-4.pdf`, `flyer-1-4.png`). Its photo window is **3:2**
(sizes.mjs `photoWindow`) across the face's width at its top, running into the bleed on the top, left and right; below it
the offer, then the QR code with the address, the space left shared evenly above, between and below them; the one logo
(the mock-up's 84px) at the bottom right, at the body's own padding, inside the safe margin. The report gives each flyer
photo's shape against the window's and how much of its width and height show (a 3:2 photo loses only the bleed: 94% of
each). The tent card was unchanged by § 9.

⭐ **§ 10 (the Advisor, 2026-10-18): the tent card without its bar, the logo at the bottom right, square windows.** Both
faces drop the navy bar and its words, and **§ 8's logo variants are withdrawn for the tent too**: one tent card,
`tent-card.pdf`. Its three photo windows are **squares** (sizes.mjs `photoWindow`, 1:1) across the face's width at its
top (the fold): mockups.css's `2fr 1fr` becomes the arithmetic of squares (print.css), a tile's side the face's width less
the two 4px gaps, over three (1.31 in), and the large window's side two tiles and the gap (2.66 in, from 2.18 in), the
large photo running into the bleed on the left and the tiles on the right. **Each window prints Image Gauge's first good
square for its photo**, the large one's too (`assign.mjs` `SQUARE_POSITIONS`); a photo the deliverable lists no square for
prints as composed, covered to the square, and the report names it. Below the photos: the rule and the headline, the
offer, then the QR code with the address, the space left shared evenly above, between and below them (the rule keeps the
mock-up's 11px to its headline); the one logo (the mock-up's 112px) at the bottom right, at the body's own padding,
inside the safe margin. The report gives each photo's shape against its window's and how much of the photo shows (a
square loses only the bleed: 96% of each side in the large window, 91% in a tile). The flyers are unchanged by § 10.

## Build

```sh
npm --prefix boston-2026-10 run build:print                                           # placeholders: every piece a -PROOF
npm --prefix boston-2026-10 run build:print -- --photos-dir DIR --rungs FILE --deliverable FILE   # the glam set, by §§ 3 and 7
npm --prefix boston-2026-10 run build:print -- --photos-dir DIR --rungs FILE --deliverable FILE --on 2026-10-23 --event demo
```

`dist-print/` (**git-ignored, emptied at every run, never hand-edited**): `tent-card.pdf`, `flyer.pdf` and `flyer-1.pdf`
to `flyer-4.pdf`, a PNG proof of each at 1× (one pixel per CSS pixel, 96 per inch: the PDF's
page as Chrome draws it), `flyer-1-4.png` (the four side by side); and `assignment.json` (which photo went where, by ID,
with its pixels, its window, its ppi and how it shows; the four flyers' photos; the rung-1 photos skipped). **A piece
carrying any placeholder** (a photo position
without a photo, or the offer while `data/offers.json` says `"status": "placeholder"` or its label is a bracketed
stand-in such as `[The offer]`) **is a proof**: its files end `-PROOF`, and the report's last line names what remains.

- **`--photos-dir`**: the glam set's files, `<id>.jpg` as composed and `<id>-sq-<key>.jpg` each square, full size.
  **`--rungs`**: Image Gauge's `image-rungs.json` for the glam set (`pools.glam.rungs`). **`--deliverable`**: Image
  Gauge's `deliverable.json` for it, of which only `photos.<id>.squares[0].key` of the tent's three photos is read. The
  three go together. ⛔ Neither the folder nor the file is ever in this
  repository. The report names positions and rungs, not photo IDs (only a refusal over a missing or unreadable file
  names its `<id>.jpg`); `dist-print/assignment.json` (ignored) names them.
- **The rule** (`assign.mjs`): the flyer takes rung 1's first **landscape** photo (`strongest`, then `also_good`, in the
  file's order; its width as composed above its height, since the flyer's window is landscape), and the report names
  each skipped by its place in the rung (`assignment.json` by ID); the tent card's `tent-large`, `tent-top` and
  `tent-bottom` take, in order, the first array of rung 3 without the flyer's photo. A pool, rung or array missing is
  refused, naming it.
- **The files** (§ 7 item 2, § 10 item 3): the tent's three windows, square since § 10, print the photo's **first good
  square**, `<id>-sq-<key>.jpg` for the first key the deliverable lists for it (SPEC-photo-slots.md § 2's `square`); a
  photo the deliverable lists no square for (not listed, or listed with none) prints **as composed**, covered to the
  square, and the report says so. The flyer's hero prints the photo as composed, `<id>.jpg`, covered to the window as in
  the mock-ups.
- **`--on`** picks the offer by `offerForSave`, and **`--event`** the event whose QR code the pieces carry (default: the
  first in `data/events.json`), as for the mock-ups. The report names the offer, the event and the URL the code carries.

## How a page is made, and checked before it is printed

1. **The page** (`pages.mjs`): the mock-up's face on a page of the sheet plus the bleed, its style the mock-ups'
   (`:root` tokens, fonts, `mockups.css`), then [`print.css`](print.css), then the sizes as a few generated rules. The
   page is **laid out in the mock-ups' own unit (120 px a real inch) and drawn scaled to the CSS inch** (a transform):
   every part is laid out exactly as on the mock-up's sheet, its text at the same size. (A `zoom` laid the text out at
   0.8×, and its widths drifted by up to 1.7 mock-up px.) A part that meets a cut edge only grows outward into the
   bleed: the flyer's photo (§ 9: up and sideways), the tent's large photo (left) and tiles (right), each from its own
   cell.
2. **The photos** are copied, under their position's own file name (`mockups/photos.json`), into a temporary folder the
   page is printed from and that is removed after: no photo's ID or file name is in a page.
3. **The measuring pass** (`measure.js`, headless Chrome `--dump-dom` over a copy of the page) finds every photo window,
   every run of text, the QR code and every painted field. **The build refuses, printing nothing**, when (`checks.mjs`):
   a photo is below **300 ppi** at its window (its pixels from the JPEG's header, upright, against the window's printed
   inches, bleed included; the smaller of the two ratios, since it fills the window); a field meets a cut edge of the
   trim without running on to the page's edge; or a page or trim is not its size. **It reports, and does not refuse**,
   text or the QR code less than **0.125 in** inside a cut edge (the tent's fold is not one): § 7 forbade moving a part,
   and the approved flyer put its bar's words 0.10 in below the top trim (reported until § 9 took the bar away; the
   build has reported none since).
4. **The PDF** (`--print-to-pdf`, `@page` sized) and **the PNG proof** (`--screenshot`), by `mockups/png.mjs`'s
   `runChrome`: one way to run Chrome in this package.
5. **A stalled Chrome run is run again.** Each run (measure, PDF, PNG) gets 30 s; one silent that long while Chrome
   still runs is stopped and run again in a fresh profile, up to 3 runs, and **the report names every retry**. Measured
   2026-10-17: a healthy run takes at most 2.0 s (270 runs, at loads up to 137), and three suite runs on a loaded machine
   met a Chrome that stayed alive and silent for 90 s, which did not recur in 240 runs alone. A hang that is the page's,
   or the flags', stalls every attempt and still fails, after 90 s, as before (test QC).

## Sizes ([`sizes.mjs`](sizes.mjs), one place, to change when the vendor's specification is known)

| piece | trim | PDF page (trim + 0.125 in bleed on every edge) | layout |
|---|---|---|---|
| flyer | 4.25 × 5.5 in, portrait | 4.5 × 5.75 in = **324 × 414 pt** | § 9: no header; the photo 3:2 across the top, into the bleed; the offer, the QR code with the address; the logo bottom right |
| tent card | two of the mock-up's own faces, each **4 × 6 in, portrait**, on one 4 × 12 in sheet (§ 7) | 4.25 × 12.25 in = **306 × 882 pt** | § 10: no bar; three square photo windows across the top, at the fold, into the bleed at the sides; the rule and the headline, the offer, the QR code with the address; the logo bottom right; **the upper face is the lower face turned 180°** (one face's markup twice, the first `rotate(180deg)`), the fold on the centre line, so folded into an A-frame both read upright (Q2) |

No crop marks, and no CMYK conversion: colours are the page's own sRGB tokens (§ 2 ⚠). The QR code is `build.mjs`
`writeQrCodes`' SVG, drawn as vector.

## Tests (`test/q*.test.mjs`; `node --test`, no network)

| | case |
|---|---|
| Q1 | the sizes in points (§ 7's tent 306 × 882); each PDF one page, its media box the sheet plus twice the bleed; the measured page and trims; no safe-margin finding (§ 9 took the flyer's bar, which had the one, and § 10 the tent's); the checks' controls (a finding by a cut edge, none by the fold, an unbled field, a wrong size) |
| Q2 | the tent: one face's markup twice, the first turned 180° and nothing else turned; the fold on the sheet's centre line; the proof's upper half turned is its lower half (with an unturned control) |
| Q3 | the assignment over fixture rungs: rung 1's first, rung 3's first array without it, a containing array skipped, every missing part refused by name |
| Q4 | the JPEG size reader (EXIF quarter turns); the effective resolution; 299 refused and 300 passing; a build with a low-resolution fixture refused, naming the position and the ppi, nothing printed |
| Q5 | `dist-print/` ignored; after a build with fixture photos `git status` unchanged, every file written ignored, no committed file holding a fixture ID |
| Q6 | `-PROOF` with no photos, and with photos while the offer is a placeholder; plain names with photos and a named offer; the last line |
| Q7 | a word changed in a mirror of `data/messages.json` (the headline) changes the mock-up's tent card and the printed one alike, and a changed offer the flyers; every printed text run is the mock-up's own; the build's QR; no colour of the print's own |
| Q8 | no legend, switch, caption or script on a printed piece (the mock-ups' as the control) |
| Q9 | ⛔ retired by § 10 (2026-10-18): it held each printed face's parts where the mock-up's sheet puts them, but for those § 8 moved; § 9 laid the flyer out anew and § 10 the tent, so no part stays where the mock-up has it. Q16 and Q17 measure the two layouts |
| Q10 | the tent's three windows print `<id>-sq-<key>.jpg` for the deliverable's first key (§ 10: the large photo too), the hero `<id>.jpg`; a photo the deliverable does not list, or lists no square for, prints as composed; a bad key, squares not a list, or no `photos`, refused; built, each window at its square's own resolution, and one without a square as composed, named in the report with how it shows |
| Q11 | the flyer is rung 1's first landscape photo, a portrait and a square before it skipped and named; none landscape refused; built, the report and `assignment.json` name the skipped |
| Q12 | §§ 8–10's dropped words (the bars' too) are in no printed page's markup (the four flyers too), no printed page carries a word its mock-up lacks, and the mock-ups (and the banner and slideshow) still carry them |
| Q13 | `eatfitaf.com`'s glyphs centred under the QR code and directly under it (within 0.1 in), on every face of every page, measured in Chrome |
| Q14 | § 8's variants withdrawn (§§ 9–10): one tent card, one flyer and its four, unlettered, and no variant named in `pages.mjs`; built, the files (`tent-card-PROOF.pdf`, not three) |
| Q16 | § 9's flyer and its four: no header or its words; one logo, last in the body, in the bottom-right corner inside the safe margin; the window 3:2 within half a mock-up pixel, across the top, into the bleed; the offer then the code; even space; no safe-margin finding; the report's shape and share lines |
| Q15 | the four flyers' rule (the first rung-4 array without the tent's photos, else the first; refusals); built, four different photos from it, each a one-page flyer at the flyer's size, and the preview of the four |
| Q17 | § 10's tent card, both faces (the upper turned back): no bar or its words; one logo, last in the body, at the mock-up's size, in the bottom-right corner inside the safe margin; three windows each 1:1 within half a mock-up pixel, at the fold, across the face, the large one's side two tiles and the gap, into the bleed at the sides; the rule and headline, the offer, the code, in order, the space even; no safe-margin finding; the report's square and share lines |
| QC | a Chrome run silent 30 s is run again (up to 3), each retry reported; a stall on every attempt still fails (a stand-in Chrome) |

The cases that render (Q1, Q2, Q13, and parts of Q4–Q6, Q10, Q11, Q14–Q17) need Chrome (`CHROME=<path>`, else the macOS default) and **skip,
saying so, when none is found**. Their photos are synthetic JPEGs made at test time (`test/print-fixtures.mjs`) with IDs
made at random, and they build into a temporary folder, so `npm test` never empties a real `dist-print/`. They build
one at a time across the suite's parallel processes (a lock directory in the system's temporary folder): several builds
at once, beside the rest of the suite, starved Chrome past its 90 s timeout on a loaded machine.
