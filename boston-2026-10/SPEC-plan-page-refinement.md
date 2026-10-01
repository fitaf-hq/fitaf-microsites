# boston-2026-10 — the plan page, refined from the Advisor's review in Storybook. CONTRACT

**Written 2026-09-30 (late), before any code. Status: RULED** by the Advisor: his review of the Storybook stories
(`ts=2026-10-01T04:14:37.128Z`, against *Individual · Start*), and two rulings (`ts=2026-10-01T04:47:22.382Z`):
**photos** — *"the microsite is using downstream \*non-authoritative\* versions of photos as assets. Please commit
copies to the public repo \*but\* please make it easy for those images to be \*removed\* and be replaced by
to-be-implemented CDN-based asset links or similar"*; **when** — *"Everything before 10:00"* (the Owner meeting,
2026-10-01). **Who reads it**: whoever builds it; the Advisor, who reviews it in Storybook.

⛔ **Unchanged, and checked**: the Footer block's text (`src/storefront/**`, `scripts/build-storefront.mjs`; its SHA-256
stays `914668ded95f…`, CC-8 and R2-32 as they are), the Worker, the save-offer (rung 4) sections, the Family tab, the
mock-ups. ⚠ `data/messages.json` and `data/plans.json` are **shared with the mock-ups and the Footer block**: a phrase
the page stops showing is **not deleted** there (the banner and flyer still say *"Find your plan."* and the event
line; the slideshow still carries the plans' promise lines; the screen reads its words from the same file).

## 1. Removed from the page (both builds)

1. The event bar, *"Fit AF in Boston · October 2026"* (`event_line`). The logo stays.
2. The hero: *"Find your plan."*, *"Two questions, then choose your meals."*, and the two lines *"Pick your plan — here"* /
   *"Choose your meals and check out — on the Fit AF store"*. The Advisor rewrites this section; until then it is absent.
3. The hint *"Pick a goal and how many meals to see your price."*
4. The result card's eyebrow *"Your plan"*.
5. Chef's Choice's line *"These meals go into your cart. You can change them before you pay."* (it may return reworded).
6. Each goal's promise line (*"Built for cutting, dialing in & staying sharp"* and the other two).

## 2. Changed

1. **A carousel at the top of the page**, below the logo, above the tabs: auto-advancing (one photo every 4 s, a
   cross-fade), with dots; ⛔ **no auto-advance under `prefers-reduced-motion`** (the first photo, and the dots to move);
   without JavaScript, the first photo. Five photos, the Image Gauge *rung 5* set the Advisor named
   (the first of its two, to iterate on), each a **4:3** window. Decorative: `alt=""` (no dish is claimed). Full width
   of the page's column.
2. **What's your goal?** → **one horizontal row** of three choices (Lean · Signature · Performance), each its name and
   its calorie and protein ranges, at 390 and 1280. The step number and heading stay.
3. **Which meals should we cover?** → **two buttons**: *"Lunch **or** dinner"* · *"7 meals/week"* and *"Lunch **and**
   dinner"* · *"14 meals/week"*, the *or* / *and* emphasised. Words from `data/messages.json` (new keys; the existing
   count labels the Footer block reads are not edited).
4. **The price**: the **weekly total leads** (larger, first) and the price per meal **supports** it (smaller, below
   or beside); never equal weight. ⚠ The Advisor may swap the two: the order and the two sizes come from one place in
   the stylesheet, so a swap is a two-line change.
5. **Chef's Choice is always open**: the toggle button is removed; the heading, the list and *Continue to checkout*
   and *Choose my own meals* show whenever the week has picks for the count. **Each meal has a thumbnail** (§ 3) to the
   left of its name; a meal with no thumbnail gets a plain tile in the page's own colour (no image), so the rows align.
6. **See all plans** → a **plain text link** that opens the 3 × 2 grid in a **modal** (`<dialog>`, a close button,
   Esc and a backdrop press close it, focus moves in and returns). The grid's links are unchanged.
7. **The footnote** → *"Prices as of 2026-09-27."*, the date from `data/plans.json`'s own read date (the Advisor
   confirms the wording with the Owner or legal: a placeholder in `data/messages.json`).

## 3. ⭐ The photos: committed copies, removable in one step (his ruling)

- **One directory, `src/assets/photo-sheets/`**, holds every photograph the page shows, as **sprite sheets** (one JPEG
  per use: `carousel.jpg`; `chefs-choice-<delivery>.jpg`, one per week with picks). Nothing else in the repository
  holds a photograph (the mock-ups' photos stay git-ignored).
- **One manifest, `data/photo-sheets.json`**: a `base` (default `"assets/photo-sheets/"`, relative), and per sheet its
  file, its pixel size and its cells (`x`, `y`, `w`, `h`): the carousel's by position (`1` … `5`), Chef's Choice's by
  the meal's **store name exactly as the picks file writes it**. ⛔ **No photo ID, no KMS identifier, no file path**
  of the source in the repository: provenance stays in Fit AF's own records.
- ⭐ **The swap and the removal are each one change**: every photo URL the page carries is built from `base`, so a
  CDN is `base: "https://…/"`; and **deleting `src/assets/photo-sheets/`** with `base: null` builds a page with no
  photograph and no broken image (the carousel absent, the plain tiles in the list).
- **The sheets are made by a tool**, `tools/photo-sheets/` (its own package or none; it may use `ffmpeg`, already on
  the machine, and adds nothing to the site's install), from a **local input list given by path** (never committed;
  it names private files): each carousel photo centre-cropped to 4:3 and scaled to **780 × 585**; each meal thumbnail
  scaled to **168 × 168**; JPEG quality chosen to keep the carousel sheet **under 300 KB** and a week's thumbnail sheet
  **under 120 KB** (reported). The tool writes the sheets and the manifest; re-running it is byte-stable.
- The page's own transfer budget (`SPEC.md` § 1, *under 60 KB before images*) holds.

## 4. Storybook

The stories follow the page: *Chef's Choice · closed* and *· open* become **one story**, *Chef's Choice*; *All plans*
opens the modal by pressing the link. The SM cases change only where a story's state changed.

## 5. Cases (`node --test`; the site's suite and the tool's)

| | case | expect |
|---|---|---|
| PR-1 | removed | none of § 1's phrases is in either built page (the mock-ups' build still carries *"Find your plan."* and the event line) |
| PR-2 | the carousel | five cells from the manifest, `alt=""`, dots; auto-advance on a timer; none under reduced motion (the script's own check) |
| PR-3 | ⭐ base | `base` set to `https://cdn.example/x/`: every photo URL in the page starts with it; `base: null` and no directory: the page builds, no `url(` or `src` names a photo, no carousel |
| PR-4 | goal row | three choices in one row, no promise line, the ranges present |
| PR-5 | meals | two buttons with § 2 item 3's words from `data/messages.json`, *or* / *and* emphasised |
| PR-6 | price | the weekly total's element comes first and its font size is larger (computed in Chrome at 390, in the watch's or Storybook's Chrome) |
| PR-7 | Chef's Choice | the list visible on load with no press; no toggle; a thumbnail cell for each meal in the sheet, a plain tile for the others |
| PR-8 | the modal | the link opens a `dialog` holding the grid; Esc closes it; the grid's seven order links unchanged (T2) |
| PR-9 | footnote | *"Prices as of 2026-09-27."* |
| PR-10 | unchanged | the Footer block's text SHA-256 `914668ded95f…`; CC-8's golden; the mock-ups' build output for the phrases above |
| PR-11 | the tool | over a fixture of four small generated images: the cells' sizes, the manifest's cells match the sheet, a re-run byte-identical |

**Existing cases a ruled change breaks are updated, not deleted** (the production page's golden, S20, is re-recorded:
the production page is meant to change, by this ruling); each update says which § it follows.

## 6. Not decided here

- **The hero's new words** (the Advisor's rewrite). **Which rung-5 set** (the second is one input-list change).
- **A crop per window for the carousel** (Image Gauge offers one; this uses its centred squares).
- **The six meals of week B with no KMS thumbnail** (*Birria de Res Bowl*, *Coffee-Crusted Brisket & Smoked Gouda Mash*,
  *Grilled Chili Lime Free-Range Chicken Thighs*, *Honey Mustard Chicken Wing Bites*, *Maple Harvest Fit Bowl*, *Wild
  Salmon Cakes with Wasabi Aioli*): plain tiles until a source is ruled.
- **A CDN**: the manifest's `base` is the seam; nothing here builds one.

## 7. Built — found at the build, not ruled

Red at `ea6a002` (the site's suite 451 tests, 26 failing on the missing feature, B1 and P1 at import; the changed
Storybook cases 7, 6 failing; PR-10, which guards what must not change, passing), green at `a402eb0` (the site's suite
**458 of 458**, 446 on `3ab88dc`; `tools/storybook` **20 of 20**, 17 before; `npm run contrast` passes; the Footer block's
text `914668de…` unchanged). §§ 1–6 are unchanged; this is the build's reading where they left one open.

**⚠ § 3's producer is HELD (the orchestrator, during the build).** *"Do not build tools/photo-sheets/ … the sheets will be
produced on the KMS side (Fit AF's own pipeline), not in this repository."* So: **no `tools/photo-sheets/`, no
`data/photo-sheets.json` and no sheet is committed, and PR-11 is dropped.** § 3's consumer side is built and proven over a
FIXTURE (`test/fixtures/photo-sheets/`: a manifest of § 3's shape and two sheets of generated flat colour, its Chef's
Choice cells keyed by the fixture week's invented names). **The page as committed has no photograph**: no carousel, the
tiles plain (PR-3's third case). Before the hold arrived the tool had been written and run once over the input list (not
committed, then deleted): the carousel sheet **285,116 bytes** (JPEG quality 7 of ffmpeg's 2–31; limit read as 300,000)
and week B's thumbnail sheet **66,832 bytes** (quality 2; limit 120,000), both byte-identical on a second run.

**§ 1**
- Removed from the template, so from both builds: the top bar, the hero (`h1`, intro, the two flow lines), the hint
  (`PROD_SLOTS.HINT` and the development page's *meal size* hint go with it), the eyebrow, the card's line, the promise
  lines. **Kept in `data/`**: `event_line`, `headline`, `subhead`, `chefs_choice.open` and `.note`, each goal's `promise`
  (PR-1 and PR-10 check the mock-ups still carry them). The build no longer requires `chefs_choice.open` or `.note`.
- The old footnote's second sentence, *"Orders are placed on the Fit AF store."*, went with it: § 2 item 7 gives the
  footnote as the one sentence. **For the Advisor** if that was not meant.

**§ 2**
- **The carousel** is the first thing in `main`, above the tabs. On the production page that is directly below the
  logo; on the development page the save section (rung 4, unchanged) stays between the logo and the carousel, so *"the
  offer first"* still holds there. Each window is an `<img alt="">` of the whole sheet, placed by percentages computed
  from the manifest's cell (`width`, `left`, `top`), in a box of `aspect-ratio: 4 / 3`. Five windows, one URL, so one
  request. The cross-fade is CSS (`opacity`, 0.8 s); `app.js` swaps the shown class every 4 s (`CAROUSEL_MS`), and
  starts no timer under `prefers-reduced-motion` or with fewer than two photos. Without JavaScript the first shows and
  the dots are hidden.
- **The dots** are buttons named by `plan_page.carousel_dot` (*"Photo {n} of {total}"*, new, placeholder). ⚠ **A dot
  press shows its photo and stops the advance**: WCAG 2.2.2 wants a way to stop moving content that starts by itself, and
  the contract names no pause control. **For the Advisor**: keep this, or add a pause button.
- **The goals' row**: three columns at every width, with narrow cards at 390 (centred text, the check above the name,
  the two ranges stacked). **The meals**: `plan_page.counts` (`"Lunch *or* dinner"`; a word between asterisks becomes
  `<em>`) and `plan_page.per_week` (`"{n} meals/week"`). The build refuses a missing one. `plans.json`'s `label`s, which
  the grid's head and the Footer block read, are untouched.
- **The price**: one box with the weekly total (34 px) first and the price per meal (18 px) below it. `.price .fig-total`
  and `.price .fig-per-meal` each carry `order` and `--figure-size` on one line, so a swap edits those two lines. The
  Family card's `.figures` are unchanged.
- **Chef's Choice**: no button, and the list shows whenever the week has picks for the count. Each row is a 56 px tile
  followed by the name. A tile with a photo carries a style the build computes from the week's sheet: its URL from `base`,
  and its size and position in percentages, so the stylesheet alone sets the tile's size. A tile with no photo is plain
  `--ice`. The tiles travel in `#picks-data` as `thumbs`, a list parallel to `meals`. The cell is looked up by the meal's
  name as the link tool reads it, a `🟠NEW:` tag included.
- **See all plans** is a `<button>` styled as a text link (so the page still carries exactly seven order links, T2),
  `aria-haspopup="dialog"`. The grid moved unchanged into `<dialog id="all">`, labelled by the grid's own caption, with a
  close button (`×`, `aria-label="Close"`). `showModal()` opens it and moves focus to the close button. Esc (the
  browser's own), the close button and a press on the backdrop (the dialog element itself, outside its box) close it,
  and focus returns to the link. Without JavaScript the dialog shows in place (`<noscript>`), as the grid did.
  ⚠ `::backdrop` uses `var(--navy)` at 0.6 opacity: browsers before Chrome 122 or Safari 17.4 do not give it custom
  properties and draw their default backdrop.
- **The footnote** is `plan_page.prices_as_of` (*"Prices as of {date}."*, placeholder) with `plans.json`'s `read_on`.

**§ 3 (the consumer)**
- A relative `base` is joined to the page's own asset prefix: `""` on production, `"/"` on the development pages, which
  are one directory down. An absolute `base` (`https://…`, `//…`) is used exactly as written. `base: null`, or no
  `data/photo-sheets.json`, means no photograph.
- With a relative `base`, the build copies **every sheet the manifest names** beside the page, not only the open weeks':
  Storybook serves the development pages' `assets/` from one date's build. **A sheet the manifest names that is missing
  from `src/assets/photo-sheets/` refuses the build**, so a broken image never ships. To remove the photos, set `base`
  to null. `build()` takes `photosPath` and `sheetsDir`, which the cases use for the fixture.
- **P1 names each allowed sheet through a manifest**, the real one (none yet) or the fixture's. A JPEG that no manifest
  names is still flagged.

**§ 4**: *Chef's Choice* is one story (`cc`, a week with picks, needing `#cc-list` shown), and *All plans* presses
`#all-link` and needs `#all` shown. SM-5's mutant could no longer *forget the press*, so it now opens *Chef's Choice*
on the *no picks* date and must fail (it does). SM-5 also wants a tile per meal. The static server knows `.jpg`.

**§ 5**: PR-4's layout and the behaviour of PR-6 and PR-8 run in Chrome, in `tools/storybook/test/pr-6-8-chrome.test.mjs`
(the site's own production build, served on 127.0.0.1, every other host refused). The rest of PR-1 to PR-10 run in the
site's suite, one file each. **Updated, not deleted**:
- CC-1b, CC-3, CC-6 (a, b, c, d, e), CC-7 and `cc-harness.mjs` (§ 2 item 5; the harness stubs `matchMedia` and the
  carousel's `setInterval`);
- P2 (c) and B2's mutant anchor (§ 1);
- B1 and P1 (§ 3);
- S20's golden, re-recorded (only `index.html` moved);
- SM-2 and SM-5 with its mutant (§ 4).

Mutants, each in a mirror of `a402eb0`, each case passing on the unmutated mirror first:
- `sheetUrl` returns `assets/photo-sheets/<file>` whatever `base` is: PR-3's CDN case fails (*"every photo URL starts
  with the base"*);
- the list hidden on load: PR-7 fails (*"the list is shown with no press"*).

**Found**
- ⚠ **A sprite sheet bleeds at its cells' edges.** In Chrome, over the fixture, a thin band of the next cell shows along a
  window's bottom edge. JPEG codes 16-row blocks across the boundary between cells, and the browser's smoothing samples
  across it too. A 585-pixel cell is not a multiple of 16. **For the producer**: cells a multiple of 16 pixels tall, or a
  gutter of a few pixels between cells.
- The production page is 30,515 bytes without photographs. With the real manifest (before the hold) it was 33,353.
  Both are under `SPEC.md` § 1's 60 KB.

**Not verified**:
- the real photographs on the page, in any browser;
- Safari and iOS;
- the cross-fade's look over time;
- anything live: nothing is deployed.

Looked at in headless Chrome at 390 and 1280 (production page, fixture sheets, `#lean-7`, the modal open): no
horizontal scroll at either width.
