# boston-2026-10 — the mock-ups take a photo per piece position. CONTRACT

**Written 2026-09-30, before any code. Status: RULED** by the Advisor the same day (asked *"Your campaign rule needs a
photo per piece position. Build that before the meeting?"*, he chose *"Yes, before the meeting"*). **Who reads it**:
whoever builds it, and whoever fills the mock-ups' photos for the Owner meeting of 2026-10-01.

**Why**: the mock-ups (`mockups/README.md`) take one photo file per **slot**, and the pieces share the slots: `hero`
fills the banner, the flyer, the tent card's large photo and slide 1. So one photo leads four pieces at once. The
Advisor's rule for the campaign is that a photo alone on one piece is not repeated alone on another, and where it
reappears in a larger piece it takes a secondary place. That needs **a photo per position**, chosen for the campaign
as a whole.

⛔ Unchanged, and never: a photograph committed (P1); the page (`src/`), the Worker, the storefront block. This
contract changes `mockups/` and its tests only.

## 1. The positions

The manifest `mockups/photos.json` keeps its shape (`slots`: a name → a plain file name in the git-ignored
`mockups/photos/`), and its slots become the **nine positions**, each used by **exactly one place in one piece**:

| position | piece | where, highest in the piece's hierarchy first |
|---|---|---|
| `banner` | banner | the photo, below the offer and the QR |
| `flyer` | flyer | the hero, across the top |
| `tent-large` | tent card | the large photo, left, two rows tall |
| `tent-top` | tent card | the small tile, top right |
| `tent-bottom` | tent card | the small tile, bottom right |
| `slide-1` | slideshow | slide 1 (Lean's line) |
| `slide-2` | slideshow | slide 2 (Signature's line) |
| `slide-3` | slideshow | slide 3 (Performance's line) |
| `slide-4` | slideshow | slide 4 (Family's line) |

- **Two positions may name the same file**: both show it, and the build copies it once. A repeat is the chooser's
  choice, never forced by the manifest.
- The slideshow's plan per slide is unchanged, and P6's rules stand (3 to 5 photo slides, each with one plan line).
- ⛔ **The committed manifest names each position's own file, `<position>.jpg`** (`banner.jpg`, `tent-large.jpg`, …),
  with `status: placeholder`. A preview puts a photo under that name in `mockups/photos/`; **it never edits the
  committed manifest to a photo's own name or ID**, which this repository must not carry (the README's step that
  invited it is removed).

## 2. What stays

- A position with no file shows the labelled placeholder (*"Photo to come"*, the position and its file).
- The legend's **Photos** row, the `data-src` citation of each photo (the manifest's JSON pointer to its position),
  the colours, the sizes, every layout: unchanged. Each photo keeps `object-fit: cover`, centred.
- The build's report line (`N photo(s) copied`) counts distinct files.

## 3. Cases (replace P3's; `node --test`, no network, no Chrome)

| | case | expect |
|---|---|---|
| P3-1 | the manifest | names exactly the nine positions of § 1, each a plain file name (a path, or another extension, refused as today) |
| P3-2 | ⭐ one position, one place | across the four pieces' HTML, each position appears on **exactly one** element, in the piece and place § 1 gives it; a piece using a position the manifest lacks is refused |
| P3-3 | placeholders | with no photos present, all nine show a labelled placeholder naming the position and its file, and no image is referenced |
| P3-4 | present | with all nine present, each shows its file and no placeholder is left |
| P3-5 | ⭐ one change, one place | in a mirror, one position's file changed to another present file: **exactly one** element across the four pieces changes its image, and every other photo is byte-for-byte as before (this **replaces** today's *"one changed photo changes every piece that uses its slot"*) |
| P3-6 | a shared file | two positions naming one file: both show it; `dist-mockups/photos/` holds it once |
| P3-7 | ⛔ the committed manifest | read from git (`HEAD`), every position's file is `<position>.jpg` and `status` is `placeholder`: a preview's photo names never reach a commit |

## 4. The README

`mockups/README.md`: the slot table becomes § 1's position table, with each window's **measured shape** (the width
divided by the height, in headless Chrome at 1920 × 1080 with the legend shut, 2026-09-30: banner **1.58**, flyer
**2.20**, tent large **1.21**, tent tiles **1.23**, a slide **1.07** on a screen and **0.46** on a phone). Its
photographs section says to preview by copying a photo under the position's file name, and that nothing else changes.
