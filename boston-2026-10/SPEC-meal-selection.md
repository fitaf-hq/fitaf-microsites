# boston-2026-10 — which meals the plan covers: four questions, eight carts. CONTRACT

**Written 2026-10-07, before any code. Status: RULED** by the Advisor the same day, asked which shape the plan page's
meal question should take: *"So I'm thinking of it as 3 choices for the customer: "AND" vs "OR" for "lunch and/or
dinner"; Weekends? (5/10 meals vs 7/14 meals depending on first answer); Breakfast? (+5 or +7 meals depending on first
answer); Snacks? (+5 or +7 snacks depending on first answer). I think that is the simplest way to express the count."*
And, asked what a count the store does not sell becomes: *"The storefront requires rounding down (until we add a new
meal count pricing tier). So use the "4" plan for 5 meals and the "14" plan for 15 meals. That will at least let us
able to show it, and then we can tweak the HMP backend to add 5 and 15."* **Who reads it**: whoever builds it, and
Fit AF's picks emitter, which writes the file § 5 describes.

## 0. Phasing

- **The week delivered 2026-10-18 ships on today's page**, with today's picks file (`menus` for 7 and 14,
  `SPEC-chefs-choice.md` § 1 and § 7). Nothing here blocks it.
- This contract is **the next release** of the plan page. Until it lands, the page asks today's two buttons.
- ⛔ **Unchanged**: the Family tab, *See all plans* and its 3 × 2 grid, the Footer block and everything under
  `src/storefront/`, the Worker, the save-offer flow. The Footer block already knows every plan's count
  (`scripts/build-storefront.mjs`'s `countTable` inlines every plan × count of `data/plans.json`, the 4-, 10- and 21-meal
  plans included), so a 4-, 10- or 21-meal cart needs no change to it.

## 1. The questions (individual plans)

*"Which meals should we cover?"* becomes four questions, in this order, each a pair of buttons in the count buttons'
style (`SPEC-plan-page-refinement.md` § 8 item 4):

| | question | answers | default |
|---|---|---|---|
| Q1 | lunch or dinner, or both | *Lunch **or** dinner* · *Lunch **and** dinner* | none: the result card waits for Q1 |
| Q2 | weekends | *Every day* · *Weekdays* | every day |
| Q3 | breakfast | *Add breakfast* · *No breakfast* | no breakfast |
| Q4 | snacks | *Add snacks* · *No snacks* | no snacks; ⚠ **hidden while snacks are not carted** (§ 4) |

- With the defaults, answering Q1 alone gives **today's result**: *or* is 7, *and* is 14.
- Every word is a phrase in `data/messages.json` (new keys; ⚠ placeholders for the Advisor's copy review); the build
  refuses a missing phrase, as the page's other words.
- The defaults are data (`data/plans.json`, § 2), so a different default is a data change.

## 2. Meals, plans and snacks — `data/plans.json`

The file gains a **`selection`** table, one row per answer set, and a **`snacks`** row. The two buttons are retired;
⚠ **`shown_counts` stays**, read by *See all plans*' grid and the version-1 picks reader only (§ 8 item 1).

| Q1 | Q2 | Q3 | meals | plan |
|---|---|---|---:|---:|
| or | every day | no | 7 | 7 |
| or | weekdays | no | 5 | **4** |
| and | every day | no | 14 | 14 |
| and | weekdays | no | 10 | 10 |
| or | every day | yes | 14 | 14 |
| or | weekdays | yes | 10 | 10 |
| and | every day | yes | 21 | 21 |
| and | weekdays | yes | 15 | **14** |

- `meals` is what the answers come to; **`plan` is the store's plan the cart goes through**, the largest count the store
  sells at or below `meals`. The build refuses a `plan` that is not among each individual plan's `counts`, and a row
  whose `plan` is above its `meals`.
- **Snacks**: 7 with *every day*, 5 with *weekdays*, **beside** the plan, never in its count (the store sells snacks as
  add-ons, not as plan meals).
- **The result card shows the plan**: its meals a week (⚠ **new**: today the count is on the button, not the card;
  § 8 item 4), its price per meal and its weekly total. When `plan` is below `meals`, one line says so (`plan_page.rounded`, a placeholder: *"{meals} meals go through as our {plan}-meal plan
  for now."*). ⚠ The snack price is not in `data/plans.json`; the card shows no snack price until a ruling says where it
  comes from.

## 3. The fragment

`#<size>-<or|and>-<7d|5d>[-b][-s]`, e.g. `#lean-or-7d`, `#signature-and-5d-b`. **Today's fragments keep working**:
`#<size>-7` opens *or*, every day; `#<size>-14` opens *and*, every day (Storybook's stories and any bookmark carry them;
⚠ not a saved offer, whose emails link `#from-email` and carry no choice: § 8 item 6); `#family` is unchanged. An
unknown fragment opens the page at its start, as today. The partial states keep a fragment too (§ 8 item 3).

## 4. Chef's Choice for the answers

- The card shows **the cart for the chosen answers** (found by the answers, never by the plan's `mpid`: § 8 item 2)
  from the week's picks file (§ 5): the heading as today
  (`chefs_choice.heading`), the meals with their counts, *Continue to checkout* (the size's `mpid` **for the row's
  `plan`**, built by `handoffLink` through `payloadFromArgs`, as today), and *Choose my own meals*.
- **No cart for those answers** (or no file, or a v1 file without that combination): today's rule, *Choose your meals*
  alone.
- **Which list a visitor sees**: `chefs-choice` only. ⛔ **The file carries only the lists the page shows** (this
  repository is public, and a list carried before it is offered would publish it): other lists join the file, by name,
  in the same change that shows them.
- ⚠ **Snacks are not carted until proven.** Whether the hand-off can put an add-on (the store's `upsells`) into the
  cart has not been checked. `data/plans.json`'s `snacks.carted` is `false`; while it is, **Q4 is hidden** and no snack
  reaches a link. Turning it on needs the hand-off shown carting a snack on the live store (the watch's smoke, which
  never submits), then a data change.

## 5. The picks file, version 2

```json
{ "delivery": "2026-10-25", "version": 2,
  "lists": { "chefs-choice": {
      "carts": [ { "lunch_dinner": "or", "weekends": true, "breakfast": false, "plan": 7,
                   "items": [ { "name": "…", "display": "…", "qty": 1 }, … ] }, … ],
      "snacks": { "7": [ { "name": "…", "display": "…", "qty": 1 }, … ], "5": [ … ] } } } }
```

- **Each cart is checked as today's menus are**: `payloadFromArgs` with the cart's `plan` as the count (the full-plan
  rule, `checkDistinct`, 1 to `MAX_QTY`), `name` the store's name and the only key, `display` the KMS's name, shown
  (`SPEC-chefs-choice.md` § 7). A cart's `(lunch_dinner, weekends, breakfast)` must be a row of `selection` and its
  `plan` that row's; two carts for one row are refused; a missing row is allowed (§ 4's fallback).
- Snack lists: the same item checks, their `qty` summing to 7 or 5; no `mpid`.
- **A version-1 file** (`menus` with `"7"` and `"14"`) still builds: its `7` is the cart for *or*, every day, no
  breakfast, and its `14` for *and*, every day, no breakfast, in `chefs-choice`. So the week delivered 10-18, written
  before this lands, shows under the new questions without a re-emit.
- Public fields only, as today: no KMS slug, no product id, no price, no person.
- **Its writer is Fit AF's picks emitter**, from a reviewed set of generated picks; that contract is Fit AF's.

## 6. Cases (`node --test`, no network)

| | case | expect |
|---|---|---|
| MS-1 | the eight rows | each answer set's card shows its `plan`'s meals and price; 5 → 4 and 15 → 14 carry the rounded line |
| MS-2 | ⭐ the links | each cart's link decodes (the shipped reader of `#fitaf=`) to its items' keys and quantities and **the `mpid` of the row's plan at the chosen size** (5 → the 4-meal `mpid`, never the 7's) |
| MS-3 | defaults | Q1 alone gives today's 7 and 14 results and today's links, byte-identical in their `href`s |
| MS-4 | fragments | `#lean-7`, `#signature-14` and `#family` open as today; every new fragment round-trips; an unknown one opens the start |
| MS-5 | v1 file | builds; its two menus appear under the two default rows; the other rows fall back |
| MS-6 | refusals | a cart whose qty does not make its plan, a combination not in `selection`, two carts for one row, a `plan` not sold, an unknown field: the build fails, naming the file and the cart |
| MS-7 | snacks off | with `snacks.carted` false, no Q4 in the page and no snack in any link; with it true (a fixture), Q4 shows and the snack list appears, still outside the plan's count |
| MS-8 | words | every phrase from `data/messages.json` (the letterless-marker rule) |
| MS-9 | unchanged | the Footer block's text, the watch's expected Footer, the Worker: byte-identical (CC-8's golden) |
| MS-10 | ⭐ mutants | in a mirror: rounding up (5 → 7) fails MS-1/MS-2; a link built on `meals` instead of `plan` fails MS-2; a v1 `14` mapped to *or* fails MS-5 |

Storybook's stories gain the eight answer sets (Chosen, at 390 and 1280), so the Advisor can review them by name.

## 7. Not decided here

- The question words and the defaults (placeholders). ✅ **Ruled 2026-10-07** (the Advisor, `AskUserQuestion`,
  `ts=2026-10-08T03:54:05.161Z`): **Q2–Q4 appear once Q1 is answered** (*"After Q1"*), and **Q1's buttons are words
  alone** (*"Words only"*: no numeral; the card shows the meals a week, § 8 item 4).
- The snack price and whether snacks are carted (§ 4).
- Which other pick lists a visitor is offered, and by what names.
- The 3 × 2 grid: whether it grows to the store's other counts (4, 10, 21).
- **Prod**: the dev line and the test address first; eatfitaf.com only on the Advisor's go.

## 8. Read against the code, 2026-10-07 (session 229) — before any build

The contract above was written from the contracts it extends. Read against the page's code on the dev line
(`21acd34`), it was wrong in six places and silent in three. Each item names the lines; the clauses above that it
changes point here.

1. ⭐ **`shown_counts` has five readers, not one.** The meals buttons (`build.mjs:389`) and their phrase check
   (`build.mjs:128`) go; but *See all plans*' grid reads it for its columns and heads (*"7 meals / Lunch or dinner"*:
   `gridCells`, `build.mjs:86`; `gridHead`, `build.mjs:207`), the page script's fragment check reads it
   (`clientData`, `build.mjs:229`, then `validCount` in `src/app.js`), and so does the version-1 picks reader
   (`scripts/chefs-choice.mjs:112`). § 0 keeps the grid unchanged, so **`shown_counts` stays**, read by the grid and the
   version-1 reader; the questions read `selection`.
2. ⭐⭐ **The Chef's Choice card finds its menu by the `mpid` in the result's link** (`src/chefs-choice/chefs-choice.js:17`,
   `chosen()`). Under `selection` the 14-meal plan is the plan of **three** answer sets (*and*, every day; *or*, every day
   with breakfast; *and*, weekdays with breakfast) and the 10-meal plan of two, so **an `mpid` cannot name a cart**.
   `src/app.js` writes the chosen answer set on `#result` (`data-selection`, the fragment's answer part: `or-5d`,
   `and-5d-b`) and the card reads that; the page data's carts are keyed by it, each with one link per size by `mpid`,
   as today. The card script's header (*"app.js is not changed"*) no longer holds.
3. **The fragment has partial states today** (`src/app.js:14–29`): a goal alone (`#lean`), meals without a goal
   (`#meals-14`), neither (`#individual`). They become `#<goal>`, `#meals-<answers>` and `#individual`, `<answers>` being
   `<or|and>-<7d|5d>[-b][-s]`. ⚠ **A state with Q2–Q4 answered and Q1 not has no fragment** under this grammar; that is
   why Q2–Q4 show only once Q1 is answered (✅ ruled, § 7).
4. **Q1 "in the count buttons' style" has no fixed numeral.** A count button today is a numeral, its unit and a line
   of words (`countButton`, `build.mjs:137`); Q1's meals are 7, 5, 14 or 10 by Q2 and Q3. ✅ **Ruled: Q1 is words alone**
   (§ 7), and **the card shows the meals a week** (§ 2): today it does not, so that is a new figure and a new phrase
   (`plan_page.meals_unit`, a placeholder).
5. **Not every word is a phrase today**: the second question's heading (*"Which meals should we cover?"*,
   `src/template.html:210`) and *Choose your meals* (`:222`) are literals in the template. The new questions' headings
   and answers, `plan_page.rounded` and `plan_page.meals_unit` are phrases (new `plan_page` keys, placeholders, refused
   when missing); the heading at `:210` becomes Q1's phrase; *Choose your meals* stays a literal (this release does not
   move it).
6. **No saved offer carries a choice.** § 3 said a saved offer's link reopens the same choice; rung 4's emails open
   `#from-email` (`src/save/flow1.js:147`) and nothing writes a plan fragment. Today's fragments are kept for Storybook's
   stories and bookmarks, which is reason enough.
7. **The development page's share panel reads today's fragment** (`src/save/share.js:10`, `^#([a-z]+)-(\d+)$`) and
   divides by seven (`src/save/calculator.js:9`, meals a day = meals a week ÷ 7). Under a new fragment it shows its hint
   and never a figure; under *weekdays* ÷ 7 is wrong (a lunch or a dinner each weekday is one a day on five days, not
   0.71 a day). Amended: the panel reads the answers, **meals a day = 1 or 2 (Q1) + 1 with breakfast (Q3)** on 7 or 5
   days (Q2), and `shareLines` takes meals a day and days; today's fragments give today's figures. Development build
   only: the production page is unchanged by it (S20).
8. **Photographs.** The week's photo sheet is written by Fit AF's emitter (its `emit_microsite_photos.py`), which binds
   the store names of the week's 7 and 14 only. A cart's meal outside those (every breakfast) has no cell: its tile on
   the card is plain (`thumbStyle` returns null) and the hand-off's screen shows the store card's own image for it
   (`photoPart` allows a null cell: `scripts/handoff-link.mjs:61–66`). Nothing here refuses; the sheet's binding grows
   to version 2's carts on Fit AF's side, in the same release as the first version-2 file.
9. **Live.** The Footer block takes every plan's count (`COUNTS`, `src/storefront/fitaf-handoff.js:529`), so § 0
   holds: a 4-, 10- or 21-meal cart needs no change to it. The watch's smoke carts the Lean 7 by default; its W17
   `--link` carts any link. **Before the release**, the smoke runs with `--link` on the week's 4-meal and 21-meal
   carts (never submitting); the 21 is the longest fill C has to make.
10. **Order.** `boston/storybook-faces` merges into the dev line first (Hand-off stories), and this builds on that,
    so Storybook carries both the eight answer sets and the hand-off.

### 8.1 Cases added (to § 6)

| | case | expect |
|---|---|---|
| MS-11 | ⭐ one plan, three carts | the three answer sets on the 14-meal plan each show their own cart and link (a fixture where the three differ); a card choosing by `mpid` fails it |
| MS-12 | partial fragments | `#lean`, `#meals-or-7d`, `#individual` open as their states and round-trip |
| MS-13 | the grid | *See all plans* byte-identical to today's (its heads still *"7 meals / Lunch or dinner"*) |
| MS-14 | share panel (development page) | meals a day and days from the answers; `#lean-7` and `#lean-14` give today's lines; *or*, weekdays gives one a day |

MS-10 gains: a card that chooses its cart by `mpid` fails MS-11.

## 9. The Advisor's tweaks, 2026-10-07 21:36 PDT — ride with this build

Given against Storybook (`ts=2026-10-08T04:36:01.979Z`, two screenshots: the goal buttons at 390 px, and today's meals
buttons):

1. **The goal buttons' facts become one unit**: *"Please unify the calorie and protein data into a single unit (e.g.,
   common background color/treatment)."* Today each fact is its own tile (`goalButton`, `build.mjs:107`; `.fact` in
   `src/template.html`), and at 390 px *"25–35 g protein"* wraps inside its tile, so the three buttons' tiles differ in
   height. Now: **one block** per button with one background (today's fact background, a token), calories on its
   first line and protein on its second, **each line whole** (no break inside *"25–35 g protein"*: the line may set
   smaller before it breaks), the three blocks the same height at 390 and 1280. The words are unchanged.
2. **The meals buttons lose their numeral**: *"these numbers change whether or not weekends are included"*: § 8 item 4,
   as ruled.
3. ⭐ **Breakfast and snacks on the page**: *"We need to add the breakfast and snack options. Let's get the on the page
   and we'll see how they look?"* Q3 is shown as § 1 has it. **Q4 is shown too**, which changes § 4: `data/plans.json`'s
   `snacks` gains **`shown: true`** beside **`carted: false`**. While `carted` is false: Q4 shows; *Add snacks* shows the
   chosen week's snack list on the card (§ 5's `snacks`, by Q2: 7 or 5) under its own heading
   (`chefs_choice.snacks_heading`) and one line (`chefs_choice.snacks_not_carted`, a placeholder: *"Snacks aren't added
   to your cart yet."*); **no snack reaches any link** (MS-7's second half holds). With no snack list for the week,
   *Add snacks* shows the line alone. `shown: false` is § 4 as written (Q4 hidden).
   ⚠ **Not for eatfitaf.com in this state**: the production release of this page waits for the Advisor's go (§ 7), and a
   Q4 that adds nothing to the cart is for his review, not for a visitor.
4. **The carousel's photographs become Image Gauge's glam set** (*"Replace the slideshow with the Image Gauge "glam"
   ladder"*): a data change only (`data/photo-sheets.json` and `src/assets/photo-sheets/carousel.jpg`, re-emitted by
   Fit AF's emitter), made on the dev line outside this build. Nothing here changes for it.

Storybook's stories (§ 6's last line) include, at 390 and 1280: the goal buttons; the eight answer sets with Q4
answered *No snacks*; *and*, every day, with breakfast and *Add snacks* (snack list shown); and *or*, weekdays, with
*Add snacks* and no snack list. A fixture week (invented names, as `fixtures/picks/`) carries version 2 with snacks.

| | case | expect |
|---|---|---|
| MS-15 | one unit | each goal button has one facts block holding both lines, one background, no per-fact background; *"25–35 g protein"* on one line at 390 (Chrome, computed: one line box) |
| MS-16 | snacks shown, not carted | `shown: true`, `carted: false`: Q4 in the page; *Add snacks* shows the list and the not-carted line; every link byte-identical to the same answers with *No snacks* |
