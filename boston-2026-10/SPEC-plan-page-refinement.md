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
