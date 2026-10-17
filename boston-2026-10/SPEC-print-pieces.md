# boston-2026-10 — the printed pieces: the tent card and the quarter-sheet flyer, from the glam set. CONTRACT

**Written 2026-10-17, before any code.** **Why**: the Owner has asked for printed table tents and quarter-sheet flyers
for the Boston trip (the Owner from 2026-10-23, the team 2026-10-26 to 29). The mock-ups (`mockups/README.md`) are for a
screen share (*"Nothing here is printed and nothing is print-ready"*); this contract adds a print build of two of them,
filled from the glam set of photographs (2026-10-07, the Advisor's choice). **Every phrase, price, plan, colour and the
QR code still come from the same data files as the microsite and the mock-ups**: a printed piece is another surface
of the same content, never a second copy of it.

⛔ Unchanged: the four mock-ups and their screen build (`build:mockups`), the page (`src/`), the Worker, the storefront
block. ⛔ **No photograph, no photo ID, no photo's file name and no photos' location is ever committed** (this
repository is public; `SPEC-mockup-photos.md` P3-7 holds the same for the mock-ups).

## 1. The build

`npm --prefix boston-2026-10 run build:print -- --photos-dir DIR --rungs FILE [--on YYYY-MM-DD] [--event ID]` writes
**`boston-2026-10/dist-print/`** (git-ignored, emptied at every run): `tent-card.pdf`, `flyer.pdf`, a PNG proof of each
at 1×, and `assignment.json` (which photo went where; ignored, never committed). It reuses the mock-ups' pieces and data
(`mockups/pieces.mjs`, `parts.mjs`, `inputs.mjs`) and renders with the same headless Chrome (`--print-to-pdf`), so a
change to a shared file changes the mock-up and the printed piece alike. The legend (*"Where each part comes from"*) is a
screen-share device and is **not printed**.

## 2. Sizes (named values in one place, to redirect when the vendor's specification is known)

| piece | trim | layout |
|---|---|---|
| flyer | **4.25 × 5.5 in**, portrait (a quarter of US Letter) | the mock-up's flyer |
| tent card | **two faces, each 6 × 4 in, landscape**, on one flat **6 × 8 in** sheet: the upper face turned 180° so that, folded on the centre line into an A-frame, both faces read upright | the mock-up's tent card, on each face |

Every PDF page is the trim plus a **0.125 in bleed** on every edge (a photo or a colour field that meets the trim runs
into the bleed); text and the QR code sit at least **0.125 in inside** the trim. No crop marks. ⚠ Colours are the
page's own sRGB tokens; there is no CMYK conversion, because the vendor's requirement is not known.

## 3. The photographs

- **`--photos-dir`**: the glam set's files, `<id>.jpg` (the top image, full size). **`--rungs`**: Image Gauge's
  `image-rungs.json` for the glam set (`rung k` holds arrays of `k` photo IDs that work together; *"any array in a rung
  may be used"*, they are not ranked).
- **The assignment, by rule** (pool `glam`): the **flyer** takes the **first photo of rung 1**; the tent card's
  `tent-large`, `tent-top` and `tent-bottom` take, in its order, the **first array of rung 3 that does not contain the
  flyer's photo**. So no photo appears on both pieces, which keeps the campaign's rule (a photo alone on one piece is
  not repeated alone on another; `SPEC-mockup-photos.md`). A rung or array missing → refused, naming it.
- Each photo fills its window (`object-fit: cover`, centred), as in the mock-ups.
- ⭐ **Print resolution**: each photo's effective resolution at its printed size must be at least **300 ppi** (its pixel
  dimensions against its window's printed size in inches); below that the build refuses, naming the position and the
  ppi.
- **Without `--photos-dir`**, every position shows the mock-ups' labelled placeholder.

## 4. The QR code and the offer

- **The QR code** is the one `build.mjs` writes (`writeQrCodes`) for the event `--event` names (default: the Boston
  event in `data/events.json`); the build's report names the event and the URL the code carries. A vector image.
- **The offer** is `offerForSave`'s choice on `--on`, as in the mock-ups. ⚠ Today every offer is the placeholder
  `[The offer]`: the Owner's words are owed.
- ⭐ **A piece carrying any placeholder (a photo or the offer) is a proof**: its file name ends `-PROOF`
  (`flyer-PROOF.pdf`), and the build's last line says which placeholders remain. Only a piece with none is named
  `flyer.pdf`.

## 5. Cases (`node --test`, no network; the Chrome cases skip, said, when no Chrome is found)

| | case | expect |
|---|---|---|
| Q1 | sizes | each PDF page's media box is the trim plus twice the bleed, in points (flyer 324 × 414; tent 450 × 594) |
| Q2 | the tent's faces | the upper face is the lower face turned 180° (the same content, rotated) |
| Q3 | the assignment | over fixture rungs: the flyer is rung 1's first; the tent is rung 3's first array without it; an array containing the flyer's photo is skipped; a missing rung refused |
| Q4 | resolution | a fixture photo below 300 ppi at its window is refused, naming the position |
| Q5 | ⛔ nothing committed | after a build with fixture photos, `git status` shows no change outside the ignored `dist-print/`, and no committed file contains a fixture photo's ID |
| Q6 | proofs | with no photos, or with the offer placeholder, the file names end `-PROOF` and the last line lists what remains |
| Q7 | one source | a word changed in the shared message file changes the mock-up's flyer and the printed flyer alike (in a mirror) |
| Q8 | no legend | the printed pieces carry no legend |

## 6. Not in this contract

The banner and the slideshow in print; CMYK; the vendor's own file specification (checked when known, and § 2's
values changed to it); the offer's words; which photos the Advisor prefers to the rule's (a later choice replaces § 3's
rule by a list he approves, kept outside this repository).

## 7. Amendment, 2026-10-17: the approved layouts and the existing crops, nothing new. CONTRACT, before any code
The Advisor, on the first tent proof: the pieces must be the layouts he approved, through the photo pipeline already built (SPEC-photo-slots.md, Image Gauge's crops), not a new layout. § 2's tent face was wrong: the approved mock-up's face is portrait, 4 × 6 in.
1. The tent card: two of the mock-up's own faces, each 4 × 6 in portrait, laid out exactly as the mock-up's (tentFace, mockups.css), on one flat 4 × 12 in sheet, the upper face turned 180°, the fold on the centre line; the page is the sheet plus the 0.125 in bleed (4.25 × 12.25 in, 306 × 882 pt). ⛔ The print build re-lays out no face: print-only rules may set the page, the bleed and the safe margin, and nothing that moves a part.
2. The tent's two tiles (tent-top, tent-bottom) take the photo's first good square from Image Gauge (the square SPEC-photo-slots.md § 2 names for the tent card's tiles), the file <id>-sq-<key>.jpg for the first key the glam deliverable lists for that photo; the large photo and the flyer's hero take the photo as composed (<id>.jpg), covered to the window as in the mock-ups.
3. The flyer takes the first photo of rung 1 whose pixel width exceeds its height (the flyer's window is landscape), and the report names any skipped. The tent's array rule is unchanged.
4. Cases: Q1 and Q2 for the new sheet; a case that the printed tent face's parts sit where the mock-up's sheet puts them (the same boxes, scaled); a case for the square file chosen; a case for the landscape rule.
