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

### 12.1 Built, 2026-10-20 — found at the build, not ruled

1. ⚠ **The 1.4 in QR code did not fit under a two-line offer.** The first build with the offer's proposed label (not
   committed here: the offer is not approved; two lines at 34px) warned on all five fronts that `eatfitaf.com` was less
   than § 2's 0.125 in inside the bottom cut edge; under Q25's two-line fixture the logo measured 0.058 in from it. Q25
   had passed because the committed offer is the one-line placeholder. **The code is 1.25 in** (150 layout px, still
   34% larger than the mock-up's 0.93 in), the one other value tried, which keeps every part inside the safe margin
   under two lines (sizes between the two were not tried). Q25 now builds with a neutral bracketed two-line offer, and
   fails at 1.4 in (run red, then green).
2. **The offer's two lines are balanced** (`text-wrap: balance`): without it the first line ran nearly the body's width
   and the second held the last two words.
3. **The draft words did not fit** (item 5 refused them: 66.1 layout px over); cut by the orchestrator to the five
   paragraphs now in `data/flyer-back.md` (12.3 layout px to spare), every claim still one of draft 2's.
4. **Q21's refusal cases edit a fixed fixture**, not the committed words, so the Advisor's edits cannot break them.
5. ⛔ **The two-sided PDF printed its front without its QR code, address and logo** (found 2026-10-20, after every case
   was green). Each sheet's page is laid out at the mock-ups' size and drawn scaled, so its unscaled layout is taller
   than the sheet; with a second sheet after it, Chrome's print layout carried every part that crossed the page's
   height into the next fragment, and lost it. The PNG proofs (screenshots) and every measured case read the screen, so
   all of them showed the parts; poppler's `pdftotext` and `pdftoppm` and macOS's own renderer showed the PDF without
   them, and the one-page PDFs of the morning had them. **Fixed by containing each sheet** (`print.css`:
   `.print-sheet { contain: strict; }`). ⭐ **Q27 reads the PDF itself**: every page of every PDF carries every text run
   the build measured on its sheet (`pdftotext`) and every QR code's box is drawn (`pdftoppm`, at least a quarter of it
   dark); skipped, said, without poppler. Its mutant, the containment removed, fails it with page 1's address and QR
   code missing. ⚠ **The PNG proof is still a screenshot, not the PDF**; Q27 is what ties the two.

### 12.2 The Boston offer's words, approved (2026-10-20)

The Advisor (`ts=2026-10-20T23:42:09.441Z`): *"The offer was approved by the Owner in our last meeting."* The offer is the
recommended pricing scheme of Fit AF's decision record 2026-10-17 § 7j item 1, its line on the pieces *"Sign up today,
save up to 28%"*. ⇒ `data/offers.json`'s Boston event offer carries its words and **`label_approved: "2026-10-20"`**, and
the print build reads an offer carrying `label_approved` as final (`pages.mjs` `offerIsPlaceholder`), though the file's
`status` stays `placeholder`: its codes and terms, and its other three offers, are not approved (test S11 holds that), and
a bracketed label is a placeholder whatever it carries. Q6 builds its placeholder cases from a placeholder copy of the
file and checks the committed one. ⚠ The flyers stay proofs until `data/flyer-back.md` is marked approved (§ 12 item 4);
the tent card is final.

## 13. Amendment, 2026-10-20 (evening): front B, the Owner's energy on a brief. CONTRACT, written beside a spike

**Why.** The Advisor, 2026-10-20, on the Owner's ask that our flyers be *"spiced up"* so he feels *"confident"* at the
Boston event: *"we've addressed the style but not the substance of the critique … The (much more difficult) goal is to
replicate the \*feeling\* that the Owner has when seeing this material – while still making it as effective as
possible"*, and *"This flyer has to go out tomorrow morning."* The front of § 12 carries no words saying what Fit AF is
(the offer, the code, the address and the logo only). The brief, the candidates and the measurements are Fit AF's
(`docs/design-analysis/2026-10-20-boston-flyer-fronts.md`), not this repository's: they quote words not yet approved.
⚠ **Built the same evening as a spike, under the deadline, before its cases**; the cases of item 7 are written and run
before anything of it is committed, the mechanism's mutant red first.

1. **Two fronts.** Front A is § 12's, unchanged, and the default. **Front B** is made when the build is given its words
   (`--front-words FILE`); the back is § 12's, the same page whichever front a flyer has.
2. **Front B, top to bottom**: a dark band (the template's `--ink`) running into the bleed on the top, left and right,
   holding the headline (Poppins 700, uppercase, `FRONT_B_HEAD_PX`; one of its lines, `accent`, in `--signature`) and
   the lede (`FRONT_B_LEDE_PX`); a torn lower edge, a fixed path drawn over the photo's top; the photo across the face
   into the bleed on the left and right, by § 3 and § 7's rules as front A's, taking the height the band and the foot
   leave; **at most one callout**, a level green disc over the photo's lower right corner (Q2: nothing but the tent's face
   turns); then the foot: the offer
   (`FRONT_B_OFFER_PX`, at most two lines, § 12 item 2's check) with the logo under it at the left, and the QR code
   (`FRONT_B_QR_IN`, 1 in) with the address under it at the right. **One logo** a side. Every size is `sizes.mjs`'s;
   every colour the template's. Every part inside the safe margin (the build's report names any that is not).
3. **The words: one JSON file**, `print/front.mjs`'s keys only (`headline` one to three lines, set as given and never
   rewrapped; `accent`; `lede`; `callout` one to three lines; `approved`), anything else refused naming the key. ⛔
   **Until the Advisor approves them, the words live outside this repository** (a public one) and every flyer made with
   them is a proof (`-PROOF`, the report's last line naming the file). Once approved they are committed as
   `data/flyer-front.json` with `"approved": true`, and the build is given that file.
4. `--back-words FILE` builds with a back other than `data/flyer-back.md` (a draft kept outside the repository), read
   and checked by § 12 item 4's rules and named by its file in the report; `--out-dir DIR` writes the pieces there.
5. **Unchanged**: front A and every case that holds it; the tent card; the back; the mock-ups and their screen build
   (front B is print-only, as the back is); `data/offers.json`; `data/events.json`.
6. ⛔ **Not here**: the words (the Advisor's, and the Owner's); which front prints; a field test of the two fronts
   (it would need event codes of its own in `data/events.json`, and production to know them, before 2026-10-26).
8. **The meal's name on its photo** (the Advisor, 2026-10-20: *"Can we also add the meal names under (or on?) the
   photos?"*). Given `--photo-names FILE` (`{ "<photo id>": "<the meal's name>" }`, a line of at most 40 characters,
   kept **outside this repository**: it names photos by their IDs, which § 3 keeps out), each flyer prints the name of
   the meal each of its photos shows: front B's at the photo's lower left, the back's three at each square's foot, a
   solid chip of `--ink` with white type (14px), inside the safe margin; the back's names are out of the photos' grid
   flow, so no photo moves. A photo the flyer carries with no name is refused (a flyer names all its meals or none).
   **Which dish a photo shows, and its name, come from Fit AF's KMS** (the Advisor, 2026-10-20: *"All of the meal names
   should come via the KMS – these meals themselves should be grains"*): a person binds each photo to a meal record, and
   the KMS writes the names file. ⚠ The glam set's photos are not bound to meal records yet (the KMS's meal-image
   decisions cover the meal library's photos), and several of its dishes have no record; so **pass 1 (2026-10-20)
   prints no names**. A stand-in from the Owner's file names was built and set aside.
9. **The callout is optional and, by the Advisor's word, unused**: the claim it carried was *"a "our water is wet"
   style claim – true but fairly meaningless."* The lede's two
   lines are balanced (`text-wrap: balance`), as the offer's are.
11. **Pass 2** (the Advisor on pass 1, 2026-10-20: a headline that read *"like a wall of text"*; the foot *"needs to be
   unified into one section (rather than an orange box on a white backround)"*; *"move the logo from the footer to the
   top right of the page"*; *"make the QR code stylized and stick the Fit AF logo in it"*; *"this needs \*more\* to meet
   the Owner's design tastes"*): **the logo at the band's top right** on a white plate, the headline kept clear of it;
   **words between asterisks** in a headline line set in the accent colour, and **`size`**, a take's own headline size
   (24–56 layout px); **the foot one orange section** (`--cta`) running into the bleed under the band's torn edge
   mirrored (by its numbers: Q2 lets nothing turn), the offer at `FRONT_B_OFFER_PX` (32) in white with no box of its
   own; **the QR code at error correction H** (`qr/<event>-h.svg`, the same URL by the same library and `QR_OPTIONS` but
   the level, written by the print build; the page's and the tent's codes unchanged, P4) on a white tile with a green
   rule, **the logo at its centre** (about a quarter of its width, within what level H recovers). Read from pass 2's PDFs:
   every code decodes to the event's URL at 300 dpi, and the front's at 150 and 100 dpi, by two decoders.
12. **Cases**: **Q28** `readFront` refuses each malformed key, naming it; with a fixture's neutral bracketed words, every
   flyer's page 1 carries the headline's lines, the lede, the callout, the offer and the address as text in the PDF and
   its QR code drawn (Q27's reader, `pdfCarriesProblems`), page 2 is the same page as front A's back, no part is less
   than the safe margin inside the trim, and the flyers are proofs; with `"approved": true` (and the back approved) they
   are final. **Mutant**: the front words ignored (front A printed): Q28 red.

## 14. Amendment, 2026-10-20 (late evening): pass 3, the lede's accent, the back's two graphics, and longer meal names. CONTRACT, before any code

**Why.** The Advisor on pass 2 (Fit AF's decision record `2026-10-17-…` § 7n): the front is *"like a 6 or maybe 7"* against
the Owner's *"Volume 10"*, with *"more headroom to get to the Owner's aesthetic volume"*; a phrase of the lede in an
accent colour, *"Maybe blue or orange from the palette? I think the green might be repetitive"*; a new lede of three short
sentences in place of a string of three qualifiers (its words are Fit AF's, not this repository's), with a test of
whether it makes any measurable difference. On the back: *"turn the prose into something more graphical"*: the allergen line *"a horizontal
bar/grouping with each supported diet listed (possibly with some sort of standard graphic symbol?)"*, and the delivery
paragraph replaced by *"the Owner's multi-step graphic (at least as a placeholder)"*. The meal names now come from the
KMS (Fit AF `scripts/photographs/glam_photo_names.py`), and some are longer than § 13 item 8's 40 characters. The words
stay outside this repository until approved (§ 13 item 3).

1. **The lede's accent.** Front B's `lede` may carry words between asterisks (pairs, as the headline's), set in the
   colour the words file's new key **`ledeAccent`** names: `orange` (`--orange`), `blue` (`--lean`) or `green`
   (`--signature`); without the key, `orange`. Anything else is refused, naming the key. The lede stays one paragraph,
   balanced (§ 13 item 9).
   1a. **The lede in two lines** (the Advisor on pass 3, 2026-10-21, for the H1 take): `lede` may instead be one to two
   lines (an array), each set on its own line as given, as the headline's are; three or more are refused.
2. **Volume, by the brief's feeling** (Fit AF `docs/design-analysis/2026-10-20-boston-flyer-fronts.md` § 1 item 5: scale,
   contrast, saturation, motion): a **halftone** of white dots over the band's lower right, fading toward the headline
   (a CSS gradient, nothing turned, behind every word), the Owner's own texture; and a take's headline `size` as its
   words file gives it. Every part stays inside the safe margin.
3. **The back's two graphics, in the words file.** § 12 item 4's subset gains two blocks, each a line holding only a
   lead-in (`**<lead-in>**`) followed, with no blank line, by its items:
   - **a bar**: items `- {<icon>} <label>`, two to six, set in one row, each its icon over its label;
   - **steps**: items `1. {<icon>} <title>: <detail>`, numbered from 1 in order in the file, two to four, set as columns
     in that order, each its icon, its title in the heading font, its detail under it; no number is printed (the
     Advisor on pass 3: *"Drop the red 1-4 on the steps"*).
   Each block's lead-in is centred over it (the same note: *"Center … and …"*).
   `<icon>` is one of `print/icons.mjs`'s names (drawn here as plain line drawings, no outside set); an unknown icon, a
   list item outside such a block, a block mixing the two kinds, a misnumbered step or a step without its `:` is refused,
   naming the line. Everything else of § 12 item 4 stands (a list anywhere else is still refused). Type on the back stays
   at least the floor (14 layout px), and the words and the graphics must still fit (§ 12 item 5).
4. **Longer meal names.** A name may run to **60** characters (`PHOTO_NAME_MAX_CHARS`) and wraps inside its chip, which
   keeps § 13 item 8's place and its width limit; nothing shrinks it.
5. **Cases.** **Q29**: the lede's words between asterisks carry the colour of each `ledeAccent`, an unknown one refused;
   a back fixture with a bar and steps builds, its lead-ins, labels, titles and details read from the PDF (Q27's
   reader) in the file's order (an icon is not text, so the PDF cannot say it was drawn: every icon name resolves, and an
   unknown one is refused); each refusal of item 3 names its line; a 60-character name prints and a 61-character one is
   refused. **Q21**'s list case still refuses (a list with no lead-in line). **Mutant**: the bar's items dropped (Q29
   red).
6. ⛔ **Not here**: the words (the Advisor's, then the Owner's); which diets Fit AF supports (the bar prints what the words
   file lists; the Owner confirms the list); the *"Built around your goals"* infographic (the Advisor's next revision);
   the offer as a starburst or banner (offered on pass 1, not yet asked for again).
7. **Built, 2026-10-20 (late), found at the build, not ruled.** The pass 3 back (its words outside this repository) did
   not fit with the bar and the steps added: § 12 item 5 refused it at 99.9, then 30.2, then 17.2 layout px over. It
   fits with **1.6 layout px** to spare after one paragraph and two clauses were cut from the words (the words file's
   business, listed in Fit AF's record) and the graphics tightened (the bar's icons 24px, the steps' discs 36px); the
   type stays at the floor or above. A diagnostic build without one paragraph was drawn to see where the lines fell.
   The Advisor's notes on it (decision § 7o item 4): no numbers on the steps; the two lead-ins centred.
8. ⛔ **Q7 had been red since `e51a7f9` (§ 13 item 11) and no run said so.** Pass 2 wrote the level-H QR code with
   `qrcode` imported into `print/build-print.mjs`; Q7 holds that no print file makes a QR code (one source, `build.mjs`),
   and pass 2's runs were Q2, Q27, Q28, the mutants and P4, not Q7. Found by this pass's whole print set (111 cases).
   **Fixed**: `build.mjs` `writeQrCodesH` writes `qr/<event>-h.svg` (the site's outputs unchanged), the print build calls
   it. The same run refused pass 3's first halftone (a translucent gradient: Q7 allows nothing translucent and no raw
   colour); it is drawn instead as opaque dots of the template's `--muted` that shrink away from the corner
   (`pieces.mjs` `HALFTONE`). After both: the print set 111 of 111, the § 14 mutant red on its case and its control green.

## 15. Amendment, 2026-10-21: pass 5, the goals as plans, the menu as badges, the offer's banner, and the logo reversed. CONTRACT, before any code

**Why.** The Advisor on pass 4 (Fit AF's decision record `2026-10-17-…` § 7o items 8 and 10): *"Goals as an
infographic"*, *"Menu line as a graphic"*, *"I'm interested in the offer as a banner … that it is a limited time offer
and/or its total potential savings"*, and of the band's logo on its white plate, *"The white field on black background
feels like a cutout"*; then (§ 7p item 5), after the Owner's review, *"the Owner wants to use it (with some continued
refinements!)"*. The words stay outside this repository until approved (§ 13 item 3); the two claims a banner may carry
were checked against Fit AF's record of the offer's numbers before this amendment, and which one prints is his.

1. **The logo reversed, no plate.** Front B's band carries the logo **drawn for a dark ground**:
   `print/assets/fitaf-logo-reversed.png` (the green box and its white letters as they are; the logo's own white field
   transparent; the tagline white; the frame's blue and the greens as the logo's own inks), on no plate, at the band's
   top right where § 13 item 11 put it, the headline kept clear of it. It is derived in Fit AF from the vector logo the
   Owner's label files carry, never from a flyer's raster, and is print-only (the page keeps `src/assets/fitaf-logo.png`,
   B1; `copyStatic` copies only `src/assets`, so the page's built files do not change). The words file's new key
   **`logo`** chooses it: `reversed` (the default from this amendment), `reversed-white` (the same, the second word's
   letters white instead of green) or `plate` (§ 13 item 11's, for comparison). Anything else is refused, naming the key.
   The QR code's centre keeps the page's logo on its white tile (a white ground).
2. **The offer's banner.** The words file's new key **`banner`**: one short line (at most 32 characters), set in the
   foot above the offer, on a level ribbon (a flat band with notched ends, `clip-path`, nothing turned: Q2) of the
   template's `--ink` with white type in the heading font, uppercase. No new colour (Q7). Absent, no banner.
   2a. **The offer's words** stay `data/offers.json`'s approved label (§ 12.2), which the Owner's review changed the same
   day (relayed by the Advisor, 2026-10-21; the record is Fit AF's): *"Sign up today to save 25%"*, `label_approved`
   2026-10-21. Its terms and codes are still placeholders (the file's `status`): the terms the Owner sets must give 25%.
   2b. **The foot's texture** (the Advisor, the same day: *"add a little something (more dots or some other texture) to the
   orange … I do not want to impact legibility, so maybe this is just on some of the flat orange areas"*): opaque dots of
   the template's `--orange` on the foot's `--cta`, in patches whose dots are largest at the foot's corners and at the foot
   of the gap between the offer and the code, and gone before they reach a word (`pieces.mjs` `FOOT_DOTS`); the code's
   white tile covers any dot behind it. Nothing translucent (Q7).
3. **The back's plans.** § 14 item 3's subset gains a third block, **plans**: items `- {<plan>} <name>: <line>`, two to
   four, `<plan>` one of `lean`, `signature`, `performance`, `family`; set as cards in a row in the file's order, each
   with its plan's colour as a top bar (an accent, never behind text, as the page's plan cards), its name in the
   heading font and its line under it, in ink.
4. **A statement.** A lead-in on a line of its own with no items after it (§ 14 item 3 refused it) is a statement, set
   centred as a block's lead-in. The Advisor (2026-10-21), of the menu line: *"that's a claim that is strong enough to
   stand on its own"*. (A badges block was built first and dropped the same day on his word, *"Get rid of these
   badges"*: not here.)
5. **Unchanged**: every block's other rules (§ 14 item 3: a lead-in on a line of its own, no blank line before the
   items, a mixed block refused, an unknown name refused naming the line); the type floor; **the words and the graphics
   must still fit** (§ 12 item 5): the build refuses an overflow, naming it in layout px, and never shrinks to fit.
   Which words go when they do not fit is the Advisor's.
6. **Cases. Q30**: the words file's `logo` key: each treatment builds, the reversed logo is the band's image and no
   plate is drawn behind it, an unknown one is refused; `banner`: its text is read from the PDF in the foot above the
   offer, and a 33-character one is refused; a back fixture with plans and a statement builds, its lead-ins, names and
   lines read from the PDF in the file's order; each malformed item is refused naming its line (an unknown plan, a plan
   without its `:`, plans and a bar's items mixed). **Mutant**: the plans' items dropped (Q30 red), its control green.
7. ⛔ **Not here**: the words (the Advisor's, then the Owner's); which banner prints; the Owner's notes on the review
   (to come).
8. **The back, the Advisor's notes on pass 5 (2026-10-21, with crops of it)**, before it fits: *"unify the meal names
   underneath the photos (which will push the rest of the content down)"*; of the body, *"This has a lot of margin"*;
   *"… can get the banner treatment and be put last in the order (above the logo and domain name)"*; *"drop the blue
   background for"* the bar; and the lede line dropped. So: **the back's meal names leave the photos** for one band
   under them, the band's ink running into the bleed at both sides and across the gaps, each name under its own photo
   in white (§ 13 item 8's chips stay on front B); **the body's padding** 8 px at the top and 18 px at the sides (the names' own 4/5 px) (the
   safe margin is 15), the bottom row 14 px up; the plan cards' padding and gaps 4 px, the steps' discs 30 px; **a
   statement is set as the front's banner** (item 2's level ink ribbon, centred), wherever the words file puts it;
   **the bar has no ground** (its icons and labels on the page's white); and **the lede is optional**: § 12 item 4's
   *"the first paragraph is the lede"* now reads *a first paragraph of words is the lede*; a back whose first block is a
   graphic has none. **And the back's three photos 3:2** (the glam photos' own shape, printed as composed, no longer
   from a square; § 12 item 6 made them square), which, with the band, the margins and the ribbon, is what lets the back
   fit: measured in a scratch copy, the back was 58.6 layout px over with square photos and 2.8 over at 3:2, closed by
   the tightening above. Q10's list of square positions amended on purpose. Q30 holds each.
9. **The cases, amended for the approved back (2026-10-21), on purpose.** With `data/flyer-back.md` approved (its last
   line the mark), all graphics and a statement and no lede, and the back's photos 3:2, twelve cases that had held the
   back as it was went red; each now holds the contract as it stands, and none was deleted. **Q20** reads every
   expectation from the committed file: its plain reading of the file (`qb-checks.mjs` `fileWords`) reads an item as it
   prints (no marker, no `{<name>}`, no `: ` between a step's or a plan's two parts), and the word its mirror changes is
   the file's first plain word after the heading that is in it once (it had been the lede's first). **Q21**'s control
   reads the committed file's blocks in order, each kind, line, lead-in and count of items, a lede only when the first is
   words, and the mark, from the file. **Q22** holds three 3:2 windows across the top, into the bleed, each the photo as
   composed though the deliverable lists squares for two of them. **Q23** and the § 12 mutants' control build too many
   words by saying the committed blocks twice more **before** the mark (words after it are refused as a second comment,
   not as an overflow). **Q26**: the committed back is approved and final; its copy without the mark is unapproved and a
   proof; that copy with the mark put back is approved, so the § 12 mutant (the mark ignored) is red whichever way the
   committed file stands. The cases' fitting back (`print-fixtures.mjs`) is the committed file **without its mark** (a
   proof), less its last paragraph, as before. **Q29**'s 60-character names build with a back that leaves room, and read
   the back's three from the PDF too, each wrapped, its type not below 14 px. **New, Q30**: one back fixture fits with
   short names and is refused with 60-character ones, naming the overflow (§ 12 item 5: nothing shrinks). The print set:
   128 of 128 on this tree, the mutants red on their cases and their controls green. ⚠ *"Q30 holds each"* above is wider
   than the cases: the names band's place under the photos, the body's margins, the statement drawn as a ribbon and the
   bar's ground have no case that measures them (the names' words are read from the PDF, Q28 and Q29, and a statement's,
   Q30).

## 16. Amendment, 2026-10-21 (evening): the back's diets, the Owner's five. CONTRACT, before any code

**Why.** The Owner, relayed by the Advisor (2026-10-21, after the flyers went to print): *"make the allgerns on the back:
gluten free, high protein, low carb, keto, dairy free"*; the Advisor: *"We can format them how we want – he mostly just
wanted to replace "diabetic" etc"*. The bar's list was the Owner's to confirm (§ 14 item 3's caution, Fit AF's decision
record § 7o item 2); this is his list.

1. **The words** (`data/flyer-back.md`, the bar under *"Allergen and diet sensitive"*), in his order: *Gluten-free*,
   *High protein*, *Low carb*, *Keto*, *Dairy-free* (the house's hyphen on the two *-free* compounds, as the bar's
   *Gluten-free* already has it). The file stays approved: these are the Owner's words, given through the Advisor.
2. **Three new icons** in `print/icons.mjs`, drawn here as the others are (plain line drawings on the 24-unit square,
   `currentColor`, no outside icon set), each with its one-line comment: **`high-protein`**, a dumbbell; **`keto`**, an
   avocado halved, its stone showing; **`dairy-free`**, a milk carton in a circle, struck through, as `gluten-free`'s
   grain stalk is. `diabetic`, `vegetarian` and `vegan` stay in the set, unused.
3. **Unchanged**: every other rule of §§ 12–15; the back must still fit (§ 12 item 5: refused in layout px, never
   shrunk) with the type floor; if it does not, the build says by how much and the Advisor chooses.
4. **Cases**: the committed back's bar reads, from the PDF, the five labels in the file's order (Q21's reading of the
   committed file); each new icon draws (a case per name, as the existing icons' are held); Q20–Q30 green, each failure
   shown to be the base's or amended on purpose with the reason. The print set and P1 green.
5. **Then**: the print-ready pages and the 4-up rebuilt (`scripts/print-delivery/`, Fit AF's), every PDF read as on
   2026-10-21 (§ 15's release), for the next run on the in-house printer or the shop. Not before the Advisor has seen a
   render of the new back.

### 16.1 Built, 2026-10-21 (evening) — found at the build, not ruled

1. **The cases first, Q31** (`test/q31-owners-five.test.mjs`): the committed file's bar, read the plain way (Q21's
   reading, not `back.mjs`'s), is the five in his order, each with item 2's icon, and the file keeps its mark; built
   with the committed back, the PDF's page 2 carries the bar's lead-in and the five labels in that order (Q29's reader,
   `backGraphicsProblems`); and a case per new icon: one of `ICON_NAMES`, an SVG on the 24-unit square, a drawn shape,
   no colour of its own, and its one-line comment in `print/icons.mjs`. Run red on the base: **0 of 5**, each for its
   reason (the bar's Diabetic, Vegetarian and Vegan; page 2 lacking *High protein* in order; no such icon).
2. **The words and the icons** as items 1 and 2 say. **The back still fits: 3.2 layout px to spare**, the same as § 15's
   release (the five labels each on one line, as the old five were, so the bar's height did not change); the smallest
   type 14 layout px. The dumbbell was first drawn with plates 12 units tall; in the render it read lighter than the
   bread and the avocado beside it, and was **redrawn with plates 16 units tall**, the handle kept at 6.
3. ⚠ **Q30 amended on purpose**: its unknown-plan case named `{keto}`. Item 2 made `keto` an icon, so that line read as
   a bar's item and the refusal moved to the next line (*"a block mixes a bar's items and plans"*): red, 4 of 5. The
   unknown plan is now `{unknown}`, neither a plan nor an icon. No other case changed.
4. **The print set and P1: 138 of 138** (§ 15's 133 and Q31's 5), each file run alone at `nice -n 15`; after the
   dumbbell's redraw, Q31, Q29, Q19, Q23, Q7 and Q27 again, 23 of 23. The mutants red on their cases, their controls
   green (QB 11 of 11).
5. **A render for the Advisor**, built as § 15's release was (the glam set, front B's approved words, the KMS's names;
   no placeholder left), into the ignored `dist-print/`: the back of `flyer-1.pdf` at 150 dpi and its bar at 300 dpi
   (`pdftocairo`), the five icons and labels legible and none clipped. Not committed: the back carries the photos.
   Item 5 (the print-ready pages and the 4-up) waits for his look.
6. ⚠ `print/README.md`'s table of cases stops at Q26 (and the QB mutants): Q27–Q31 have no row. Not changed here.

## 17. Amendment, 2026-10-23: the giveaway tout and its entry card, 4 × 6 in. CONTRACT, before any code

**Why.** The Advisor (2026-10-23, afternoon): *"a 4" x 6" "Drop your business card to win" (plus maybe blank entry cards
…) … The Owner just got 2 acrylic raffle containers that each have a slot for a 4x6" flyer (landscape orientation). The
idea is to do very passive contact gathering."* One winner across the week of Boston events (2026-10-26 to 10-29); every
entrant may be emailed. ⚠ **It is a drawing, never called a raffle** (in Massachusetts a raffle is a licensed
nonprofit's): no purchase, and rules on the entry card. The words are **not approved** and stay outside this repository
(§ 13 item 3): Fit AF's `docs/design-analysis/2026-10-23-giveaway-tout/` holds them, given to the build by flag. The
Owner leaves for Boston on Saturday 2026-10-24: **a proof tonight comes first**; the release is the Advisor's.

1. **Two new pieces** in `print/sizes.mjs` `PRINT_PIECES`, each one face with § 2's bleed and safe margin:
   **`tout`**, 6 × 4 in **landscape**, one side (it stands in the box's slot), and **`entry-card`**, 6 × 4 in landscape,
   **two sides** (the front the fields, the back the rules, upright for a flip on the long edge, as § 12's flyer).
   Built by `npm run build:print` beside the others only when their words are given: `--tout-words FILE` (JSON) and
   `--entry-words FILE` (Markdown, its `# Front` and `# Back`). Without them the build writes what it writes today
   (Q1–Q30 green and every existing file byte-identical: the case says so).
2. **The tout is front B's look, laid out landscape** (§§ 13–15, the face `mockups/pieces.mjs` draws for the flyer,
   not a new style): the dark band with the headline (its `*…*` accent green, as front B's), the lede, and the **reversed
   logo** (§ 15 item 1) at the band's top right; **one photo** of the glam set (the flyer's first, its caption as the
   flyer prints it) running into the bleed on its side; the **orange foot** with § 15's **banner** ribbon (`banner`), then
   a **QR code** of § 11's `boston` code (at least 0.75 in square; `scan` beside it and `eatfitaf.com` under it), and
   **the fine print** (`fine`) at the type floor or larger (§ 12 item 3's 14 layout px), never shrunk below it. Where the
   parts sit is the builder's first proposal, measured and drawn as a PNG proof; the Advisor redirects. Anything that
   does not fit is refused, naming by how much (§ 12 item 5), never shrunk.
3. **The entry card is plain, for a pen**: the front its heading, the four fields as **writing lines** (a label above
   each, at least 0.3 in between lines; the optional ones say so), the draw line and the consent line; the back the rules
   at the type floor, the logo small at the bottom right on both sides. White ground, the template's ink and one accent
   (no photo), so it prints on any card stock and a pen writes on it.
4. **`-PROOF` while a placeholder remains** (§ 1's rule): a `[bracket]` in either words file names the file
   `…-PROOF.pdf`/`.png`, and the report lists each bracket. The words today carry four (the prize, its value, where it is
   delivered, the sponsor's legal name and address).
5. **Cases first, run red**: Q31 the tout (its page 6.25 × 4.25 in with bleed, landscape, one page; the parts present
   from the PDF's own text: the headline's lines, the banner, `eatfitaf.com`, the fine print whole; the QR code decodes to
   the `boston` URL, § 11's reading; no text outside the safe margin; nothing under the type floor), Q32 the entry card
   (two pages, the same size; the front's four field labels and the consent line, the back's rules whole, both read from
   the PDF; the writing lines present and their spacing), Q33 the `-PROOF` rule (a bracket proofs, none does not), Q34
   the build without the flags unchanged. A mutant each for Q31's fit check and Q33's bracket rule.
6. **Then** (the orchestrator's, after the Advisor's look at the proofs): Fit AF's `scripts/print-delivery/` makes the
   print-ready sheet for the Owner's printer (two up on letter with crop marks, the tout and the card), every PDF read as
   on 2026-10-21.
