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

## 8. Amendment, 2026-10-17: the words, the logo, and four flyers. CONTRACT, before any code
The Advisor, on the § 7 proofs: the words on both pieces are to be rewritten, the logo better integrated, and the flyer, if printed four to a sheet and cut, given a set of four photos.
1. The tent face drops "Two questions, then choose your meals." and "Scan to find your plan". eatfitaf.com sits directly under the QR code, centred on it. The headline and the offer stay.
2. The flyer drops its headline block: "Find your plan.", "Chef-prepared meal plans from Fit AF.", the four plan chips and "from $12.00 a meal". The flyer is the bar, the photo, the offer, and the QR code with eatfitaf.com under it.
3. The logo, three variants for the Advisor to choose from, each piece rendered in each: (a) the logo in the navy bar at its left, the bar's words beside it; (b) the logo on a plate over a corner of the main photo (the flyer's hero; the tent's large photo); (c) the logo larger, above the headline on the tent and above the offer on the flyer. Each a separate proof named by its letter (tent-card-a-PROOF.pdf …); the variant is one named value, so the chosen one becomes the build's only output by one change.
4. Four flyers: the flyer is also made four times, flyer-1 to flyer-4, each with its own photo, the photos of the first array of rung 4 in its order (the first rung-4 array without the tent's three photos, if one exists, else the first), each a full single flyer with its own bleed; the vendor imposes them. A preview sheet shows the four side by side (PNG only).
5. Where a change empties a face's space, the remaining parts keep the mock-up's spacing rules; nothing is stretched to fill it.
6. The photos' crops are unchanged by this amendment: the Advisor is choosing how the windows and Image Gauge's crops are reconciled.
Cases: the dropped words are absent from both pieces and present nowhere else they were not before; eatfitaf.com's box is centred under the QR code's; three variants per piece, named; four flyers, four different photos, from the rule; Q9's same-box check still holds for every part that did not move.

## 9. Amendment, 2026-10-17: the flyer without its header, the logo at the bottom right, and a taller photo. CONTRACT, before any code
The Advisor (`ts` of 2026-10-17 22:37Z): *"Please get rid of the "Fit AF in Boston October 2026" header. Then move the Fit AF logo to the bottom right of the piece (it might move again, but for now I'm just trying to get it out of the way for the rest of the refactor). That will open up a lot of vertical whitespace – which will go make the photo's aspect ratio closer to 3:2 or 4:3 (right now it looks like 2:1)."*
1. The flyer (and its four, flyer-1 to flyer-4) drops the navy header bar and its words. § 8 item 3's three logo variants are withdrawn for the flyer: it has one logo, at the bottom right of the face, inside the safe margin.
2. The flyer's photo window becomes **3:2** (width to height) across the face's width, at the top of the face and running into the bleed on its three cut edges; the space the header and the old strip held goes to it. ⭐ 3:2 is the glam photos' own composed shape (most are 3:2 as composed), so a photo shows as Image Gauge composed it; the report gives each photo's shape against the window's, and the visible fraction of its width and height.
3. Below the photo, in order: the offer, then the QR code with eatfitaf.com under it; the logo at the bottom right. Parts keep the mock-up's sizes, and the space left is distributed evenly between them (nothing is stretched).
4. The tent card is unchanged by this amendment (its bar and its § 8 variants stay until the Advisor rules on it).
5. Cases: the flyer has no header and no "Fit AF in Boston"; its photo window measures 3:2 within half a mock-up pixel; the logo's box sits in the face's bottom-right corner inside the safe margin; the order of the parts; the four flyers likewise. The safe-margin report on the old bar's words disappears with the bar.

## 10. Amendment, 2026-10-18: the tent card without its bar, the logo at the bottom right, and square windows. CONTRACT, before any code
The Advisor (2026-10-18), on the tent card: drop its bar *"like the flyer"*; the logo *"bottom right, as on the flyer"*; and on the photo windows, *"What is the aspect ratio of the crops? Can we adjust them to be more square?"* Measured from the § 7 build: the two tiles are 1.35:1 windows given Image Gauge's 1:1 squares (74% of each square's height shows), and the large window is 1.27:1 given a 2:3 portrait photo (53% of its height shows).
1. Both faces drop the navy bar and its words. § 8 item 3's three logo variants are withdrawn for the tent: one logo, at the bottom right of each face, inside the safe margin, as § 9 item 1 placed the flyer's.
2. **Square windows**: the two tiles become squares (1:1), and the large window a square too, its side two tiles plus the gap between them, the three together spanning the face's width as now (`2fr 1fr` becomes the arithmetic of squares, not a stretch). The photo band's height follows from that width (about 2.66 in of the 6 in face, from about 2.18 in), taken from the space the bar held and the space below the photos.
3. **Each window takes Image Gauge's first good square for its photo** (§ 7 item 2's rule for the tiles, now for the large photo too), so a square shows whole, with nothing cropped after Image Gauge. A photo with no square in the deliverable takes its composed photo covered to the square window, and the report names it and the fraction of its width and height that shows.
4. Below the photos, in order: the headline, the offer, then the QR code with eatfitaf.com under it; the logo at the bottom right. Parts keep the mock-up's sizes; the space left is distributed evenly between them (nothing is stretched), as § 9 item 3.
5. The flyers are unchanged by this amendment.
6. Cases: the tent has no bar and no "Fit AF in Boston"; each of its three windows measures 1:1 within half a mock-up pixel, and the large window's side equals two tiles plus the gap; each window's file is a square (`-sq-`) where the deliverable has one; the logo's box sits in each face's bottom-right corner inside the safe margin; the order of the parts; the upper face is still the lower turned 180° (Q2); one variant file, `tent-card-PROOF.pdf`, not three. The report gives each window's shape and the visible fraction of its photo.

## 11. Amendment, 2026-10-18: the two event codes, `boston` and `seminar`. CONTRACT, before any code

**Why.** The Advisor, 2026-10-17 (Fit AF's decision record `2026-10-17-the-picks-from-our-plans-and-the-breakfast-slate.md`
§ 7a): *"I like the idea of two QR codes … It is possible that the seminar organizers will flash up a slide thanking
Fit AF for the catering – if so, we can ask them to include this QR code"*, and *"Boston should have a unique QR code"*;
ordered first among Boston's work on 2026-10-18 (§ 7g item 7 there). `SPEC-analytics.md` § 9 item 2 is the reader that
will count them (`?e=<id>` read against `data/events.json`). Measured 2026-10-18: `https://eatfitaf.com/?e=boston` and
`?e=seminar` serve the production page byte for byte as `/` does, so a code works before the analytics land.

1. **`data/events.json` gains two events, after `demo`**, which stays first so that nothing reading *the first event*
   changes (the mock-ups' default, the save step's built-in id, `SPEC-rung4-save-offer.md` § 3):
   `{ "id": "boston", "name": "Fit AF in Boston, 26–29 October 2026", "url": "https://eatfitaf.com/?e=boston" }` and
   `{ "id": "seminar", "name": "the seminar of 23 October 2026", "url": "https://eatfitaf.com/?e=seminar" }`.
2. **The printed pieces carry `boston` by default**: `build:print`'s default event becomes the event whose id is
   `boston` (one named value), which is what § 4 already says (*"the Boston event"*); `--event` still names any other.
   The build's report line names the event and its URL, as today.
3. **`npm run build`** (production) writes one code per event, as `writeQrCodes` already does: `dist/qr/boston.svg` and
   `.png`, `dist/qr/seminar.svg` and `.png`, beside `demo`'s. The seminar's is handed to the Advisor for the organizers'
   slide; nothing here sends it.
4. **Unchanged**: the production page and the development page byte for byte (S20; `events.json`'s other ids are not
   read by today's page), the mock-ups (their default is the first event), the save step (an id outside `events.json`
   is still refused; these two are now inside it), every word and size of the pieces. The address printed under the
   QR code is the event URL's host alone, so every piece for every event reads `eatfitaf.com` (§ 8 item 1), while the
   code itself carries the full URL (`https://eatfitaf.com/?e=boston`; the orchestrator's ruling, 2026-10-18, after the
   build found the address had followed the URL to `eatfitaf.com/?e=boston`).
5. **Cases** (written first, run red): **Q12** the three events load, `demo` first; **Q13** `build:print` with no
   `--event` reports `boston` and `https://eatfitaf.com/?e=boston`, and its QR SVG is `writeQrCodes`' for that URL;
   **Q14** `npm run build` writes the `boston` and `seminar` codes, each decoding to its URL (decoded by the test, not
   assumed: if no decoder is installed, the matrix is compared with one `writeQrCodes` makes for the URL); **Q15** S20
   and the mock-ups' outputs byte-identical. **Mutant**: the default back to the first event (Q13).
6. ⛔ **Not here**: the analytics' reading of `?e=` (`SPEC-analytics.md`), the offer's words (the Owner's), any print order.

> **Ruled 2026-10-18 (the orchestrator, the contracts' author), at the merge of `boston/analytics` into
> `boston/integration-1022`: item 4's "byte for byte" held for the event codes alone.** Once the analytics reads `?e=`
> (`SPEC-analytics.md` § 9 item 2), every page carries `data/events.json`'s ids in its analytics script, so the page
> carrying the event ids is the analytics' change, not this section's. QE15 is narrowed to exactly that (`9fab243`): each
> production and development page of the committed build and of the one-event build differs by that id list alone
> (`["demo","boston","seminar"]` against `["demo"]`), and is byte for byte the one-event page once the list is put back;
> every other file, the two added pages and codes, and the mock-ups are as item 4 says. The analytics' reading of the
> two ids is its own case, `test/a-qr-event.test.mjs` (`a123be9`): an `open` from `?e=boston` or `?e=seminar` carries
> that id, any other query none.

## 12. Amendment, 2026-10-20: a two-sided flyer, the front a strong call to action, the back "Why Fit AF?". CONTRACT, before any code

**Why.** The Advisor, mid-meeting with the Owner (Fit AF's decision record
`2026-10-17-the-picks-from-our-plans-and-the-breakfast-slate.md` § 7k item 4, `ts=2026-10-20T17:50:25.052Z`): *"lean into
the Owner's self-described tendency to "list features over benefits" and put a version of "Why Fit AF?" on the back. I
don't want to do a wall of text – but we could let the back be mostly wordy prose and make the front a strong call to
action with a more impactful (simplified?) design. I also think we can possibly add more photos (to the front and/or
back) now that we've effectively doubled the display surface of the piece."* And, the same meeting: the Owner *"really"*
liked the glam set.

1. **Two sides.** Every flyer PDF (`flyer.pdf`, `flyer-1.pdf` to `flyer-4.pdf`) has **two pages**: page 1 the front, page
   2 the back, each the trim plus the bleed (324 × 414 pt, Q1's), the back upright for a flip on the long edge (no
   rotation). The **back is the same for every flyer**, so the vendor can impose four fronts on one side and four backs
   on the other. PNG proofs: each front as today (`flyer-1-PROOF.png` …), and **one** `flyer-back(-PROOF).png`;
   `flyer-1-4.png` stays the four fronts. The tent card is unchanged by this amendment.
2. **The front: the call to action, larger.** Today's parts in today's order (§ 9 item 3: the 3:2 photo, the offer, the
   QR code with `eatfitaf.com` under it, the logo at the bottom right), and nothing added: the strength is in scale.
   **The offer** is set at the headline's size (the mock-ups' `.headline`, 34px, from the offer's 24px), in its own
   field (`var(--cta)`), across the body's width, wrapping to at most two lines; **the QR code** is **1.4 in** square
   (168 layout px, from 112), the address under it as § 8 item 1. Both are named values (`print/sizes.mjs`), so a
   redirect is one change. The space left is shared evenly (§ 9 item 3); nothing stretched. ⛔ No scan prompt (§ 8
   dropped it) and no new words on the front.
3. **The back: "Why Fit AF?" in a few short paragraphs, and three photos.** Top to bottom: **three square photos** across
   the face's width at its top, running into the bleed on the top edge and on the outer edge of the outer two (the
   tent's tile arithmetic, § 10: three equal squares and two 4px gaps); **the words** of `data/flyer-back.md` (item 4):
   its heading at the headline's size, its first paragraph (the lede) at the tagline's, then each paragraph, its bold
   lead-in in the heading font; and at the bottom **`eatfitaf.com`** at the left and the **logo** at the right, as the
   front's. ⛔ **No QR code and no offer on the back** (the front carries both; the offer's words are not approved, and
   one place for them is enough). Type no smaller than **14 layout px** (8.4 pt) anywhere on the back (a named value).
4. **The words: `data/flyer-back.md`, the only source.** A small Markdown file a person can edit, read by the build, and
   **only this subset**: line 1 `# <heading>`; then paragraphs separated by one blank line; a paragraph may open with
   `**<lead-in>**` followed by a space; `’` and the other characters of the page's own copy are allowed, and nothing
   else Markdown means (a list, a link, a second heading, emphasis elsewhere, HTML) is: the build **refuses** naming the
   line. Its words are the orchestrator's draft from "Why Fit AF?" draft 2 (Fit AF `docs/explainers/why-fit-af/`), every
   claim one that draft already makes, **for the Advisor to edit**; until he marks it approved (`<!-- approved -->` as
   its last line, the only HTML comment allowed), **the back is a proof** (§ 4's rule: `-PROOF`, and the last line names
   it). It is committed: its words are a version of a page this repository already serves on the dev site (`/why/`), and
   it names no person and no photo.
5. **It must fit, not shrink.** The back's words and photos are laid out at the sizes above; if the words do not fit
   between the photos and the bottom row (the face's content would overflow, or any line would fall inside the bottom
   row or outside the safe margin), **the build refuses**, naming how many layout px over it is. Nothing scales the type
   down to make it fit: the remedy is fewer words, which is the point (*"I don't want to do a wall of text"*).
6. **The back's photos, by rule** (pool `glam`): the **first array of rung 3 that contains none of the photos the build
   places elsewhere** (the flyer's, the four flyers', the tent's three), its three in order, left to right; none such →
   refused, naming the rung. Each prints Image Gauge's first good square for its photo (§ 10 item 3's rule, and its
   fallback: a photo with no square prints as composed, covered, and the report names it), at least 300 ppi (§ 3).
   `assignment.json` gains `flyer-back-1` to `flyer-back-3`, as the other positions. Without `--photos-dir`, the
   mock-ups' labelled placeholder, as § 3.
7. **Unchanged**: the tent card, every mock-up and its screen build (the back is print-only; `flyerFace` gains options
   the mock-ups never pass, as § 8's did), the page, the Worker, the storefront block, `data/offers.json` and every
   other data file but the new one; ⛔ the header's rule on photographs (no photo, photo ID, file name or photos' location
   committed).
8. **Cases** (written first, run red): **Q18** each flyer PDF has two pages, each 324 × 414 pt; **Q19** the five flyers'
   backs are the same page (their page 2 renders to identical pixels); **Q20** the back's text is exactly
   `data/flyer-back.md`'s words in its order (the DOM's text against the file's, whitespace normalised), and a word
   changed in the file changes the back (in a mirror, Q7's way); **Q21** the subset: a list, a link, a second heading
   and stray HTML each refused, naming the line; **Q22** the back's three windows are 1:1 within half a layout px, each a
   `-sq-` file where the deliverable has one, from item 6's rule (fixture rungs: an array holding any other position's
   photo is skipped; none left refused); **Q23** too many words refused, naming the overflow (a fixture file), and no
   font size on the back below the minimum; **Q24** the back carries no QR code and no offer; **Q25** the front's offer
   at 34px and its QR code 168 layout px, the parts in § 9's order, the logo's box at the bottom right inside the safe
   margin; **Q26** without `<!-- approved -->` the back is `-PROOF` and named on the last line, with it not. **Q5**'s
   *nothing committed* extends to the back's photos. **Mutants**: item 6's rule allowing a photo used elsewhere (Q22);
   the overflow check off (Q23); the back's page dropped (Q18); the approval marker ignored (Q26).
9. ⛔ **Not here**: the offer's words (the Owner's and the Advisor's); the back's final words (the Advisor's edit); more
   photos on the front (offered: the front could take two squares beside the QR code; not built until he asks); the
   vendor's file specification; any print order.
