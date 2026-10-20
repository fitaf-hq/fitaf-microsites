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

## 10. Built, 2026-10-08 — found at the build, not ruled

Built by an agent on `boston/meal-selection` from `985f777` (the site's suite 522 of 522 there), in six steps, each its
own commit with its suite green: `843683f` (`data/plans.json`'s selection, the build's checks, MS-6's data half),
`1debec4` (the questions, the fragments, the result card; S20 re-recorded), `a36f7ef` (the picks file's version 2, the card
by the answer set, the snack block), `c0ca035` (the share panel), `ff8e8b5` (Storybook's Meal selection stories, MS-15 in
Chrome) and `fb4ab36` (MS-10's mutants); this note and the READMEs after them. Each case was seen red for its own reason
before its code, except where said below. On the last code commit: the site's suite **615 of 615**, Storybook's **40 of
40**, `npm run contrast` 70 pairs, 0 fail; the watch's suite and the counts on this note's own commit are in the report
that hands it over. **To be re-gated by the orchestrator.** §§ 0–9 are unchanged; where they were wrong or silent:

**Wrong, or wrong once § 9 landed**

1. **MS-7 was written when `carted` hid Q4; § 9 split it.** Read as § 9 amends it: `snacks.shown` decides whether Q4 and
   the snack block are on the page (false: no Q4, no snack list in the page's data, a `-s` fragment not an answer set the
   page offers); `snacks.carted` decides whether a snack reaches a link. ⚠ **`carted: true` is refused by the build**
   (MS-6): no link format carries a snack and the hand-off has not been shown carting one (§ 4), so a `true` would only
   remove the not-carted line from a cart that still has no snack. Turning it on is a code change as well as a data
   change: the link's snack part, fill C's press of an add-on, and this refusal.
2. **MS-10's "a link built on meals instead of plan fails MS-2" cannot fail on a decoded link**: 5 and 15 are no plan the
   store sells, so no size has an mpid for them and the build stops at the first such cart (*"Cannot destructure
   property 'mpid'"*). MS-2 fails it because there is no page. Every variant tried (the nearest sold count above) is
   refused by the full-plan rule the same way.
3. **MS-10's "rounding up (5 → 7)" is not a code change**: `plan` is data. The mutant is `data/plans.json` sending 5
   through the 7 **and** the build's refusal of a plan above its meals removed (else the refusal kills it first), the
   week's or-weekdays cart following with the 7's meals. MS-1 and MS-2 fail it on the card's meals and the link's mpid.
4. **§ 8 item 7's "today's fragments give today's figures" holds only for 7 and 14**: the panel's day is now the answers'
   (`shareLines(size, perDay, days, targets)`), and its targets line names the days when they are not 7 (*"Lean, 5 meals
   a week (1 a day, 5 days a week)"*): new words, literals in `src/save/calculator.js` as all its words are (never phrases;
   development page only). The panel's meals a week are the **answers'** (15), not the plan's (14), beside the card's
   rounded line.
5. **Storybook's index reads a story's name from the source.** A name computed by a function (`story("or-7d")`) was indexed
   under its export name, so SM-2 and SM-5 failed on the first run; every name is now written where it is exported, as
   `individual.stories.js` already did.

**Silent, and what was done**

6. **Where the defaults live**: `data/plans.json`'s `selection_defaults` (`weekends`, `breakfast`, `snacks`), beside
   `selection`; the build refuses a missing or non-boolean default, and snacks on by default while not shown.
7. **More refusals than § 2 names**: besides a plan not sold at every size and a plan above its meals, a row missing or
   twice, a row's `meals` not (1 or 2, + 1 with breakfast) × (7 or 5), an unknown field. **Not refused**: a plan below the
   largest sold count at or below its meals (15 → 10 would build); § 2 defines `plan` that way but names only the two
   refusals.
8. **The snacks' counts are not in `data/plans.json`**: one a day on Q2's days (`scripts/selection.mjs`'s constants), so 7
   or 5; the picks file's snack lists are keyed `"7"` and `"5"`, the page's data `7d` and `5d` (the fragment's day token).
9. **An unknown fragment**: as today's `#lean-9` kept the size, a known size with answers the page does not know opens
   that size alone (`#lean-or-9d`, `#lean-and-7d-s` while snacks are not shown); only a fragment with no known part opens
   the start (MS-4).
10. **`data-selection` carries the snacks mark** (`and-7d-b-s`, the fragment's whole answer part); the card's cart is
    the answer set without it. It is `""` while the card is hidden.
11. **Add snacks with no week open shows nothing.** The snack block (`src/chefs-choice/snacks.html`) is part of the week's
    card, inlined only when a week is open (and only while `snacks.shown`); with no week the page writes no word of the
    week's. ⬜ **For the Advisor**: the not-carted line without a week, if wanted, is the base page's.
12. **Where the snacks sit on the card**: their own box after *Choose my own meals*, shown whether or not the answers have
    a cart (a fallback card shows them too); with no list for the days, the heading goes with the list and the line
    stands alone. Snack tiles are looked up on the week's sheet by store name, as the meals' are (plain until Fit AF's
    emitter binds them, like every breakfast: § 8 item 8).
13. **"The same item checks" for snacks had no entry point**: `checkDistinct` was private to the link tool and
    `payloadFromArgs` needs an mpid. The tool now exports `itemsFromArgs` (the item rules alone), which `payloadFromArgs`
    calls; its rules, refusals and words are unchanged (R2-13's and CC-5's cases unmoved).
14. **Version numbers**: a file without `version` is version 1; `"version": 1` with `menus` is also read; any other is
    refused (*"version 3 is not one the page reads (1, 2)"*). A version-2 list other than `chefs-choice` is refused by name.
15. **The phrases' keys**: `plan_page.questions.<question>.heading` and its two answers (`or`/`and`; `yes`/`no`),
    `plan_page.meals_unit` (*"meals/week"*, the retired `per_week`'s words), `plan_page.rounded`,
    `chefs_choice.snacks_heading` (*"Snacks this week"*) and `snacks_not_carted`; Q2–Q4's headings are new placeholders
    (*"Which days?"*, *"Breakfast too?"*, *"Snacks too?"*). `plan_page.counts` and `per_week` are **removed**: nothing
    reads them once the buttons are gone.
16. **Where the meals a week sit**: the third line of the price block (*"14 meals/week"*, the per-meal line's size), and
    the rounded line under the block, muted. Q1–Q4's answers are words at the goal names' size (15 px at 390).
17. **§ 9 item 1's "may set smaller"**: the goals' facts set at `clamp(10px, 2.8vw, 12px)`, 10.92 px at 390 and 12 px at
    1280, each line `nowrap`; measured one line box each, the blocks 39.66 px and 42.78 px tall, none overflowing (MS-15).
    MS-15's Chrome half was written after the markup; its mutant (lines that may break, at 14 px) shows it failing.
18. **Storybook needs a week the committed data does not have**: the Date control gains a fourth date, *the fixture
    week* (test/fixtures/picks-v2/, version 2, invented names, a cart per answer set, snacks for 7 days only), and the
    site's build gains `--picks DIR` to build it (Storybook's pages only, as `--out`; SPEC-storybook-microsite § 2 item
    1's "nothing else of the site changes" no longer holds by one flag). The Meal selection stories open on it, scrolled
    to the questions or the snacks; *Goal buttons* opens on today. Their names use the contract's table words, never a
    phrase of `data/messages.json` (SM-4 counts "Add snacks", ten characters, as a copy).
19. **The production page now carries Q4** (`shown: true` is committed), which § 9 says is not for eatfitaf.com in this
    state. Nothing here deploys; S20's golden records it (`index.html` `6a548cd7…`, the only moved file), and the release
    stays a pin change on the Advisor's go (§ 7).

**Found, not changed**

- PR-13 (Chrome) timed out once at 120 s with the machine's load average near 30, and its process then held the
  Storybook suite open (the case's `finally` never ran, so its server and Chrome stayed), until stopped by hand; it
  passed on the next run. A case that times out should not keep its file alive.
- MS-13's "before" (`test/ms-golden.json`) and MS-3's and MS-14's were recorded by building `985f777` itself, before any
  change.

## 11. Snacks into the cart: measured on the live store, 2026-10-08 — the contract to write next

**The Advisor**, 2026-10-08: *"let's try to get the snack question resolved before we publish"*, then, once today's week
was seen to carry no snack list (version 1), *"Release now, snacks for 10-18"*: the page went out with the snacks question
shown and not carted (§ 9 item 3), and **carting is the next contract, for the week delivered 10-18**.

**Measured** (an anonymous, throwaway browser session on `/order?mpid=21`, the watch's own launcher; nothing submitted,
CHECKOUT never pressed; 09:47–09:49 PDT):

1. The plan's order page lists **27 meal cards** (*All Meals*) and **28 *Additions*** (*Additions (Additions)*), all
   `app-product-card`: the snacks (Superfood Bites, Smart Oats, Protein Dirt and Sand, ProNuts), and the bulk proteins and
   sides (cod, shrimp, rice, green beans, …).
2. **A snack card shows *Select Options***; pressed, it **expands in place** (no dialog, no navigation) to *"Size \* 1"*
   and **Add to Cart** with its price (*Smart Oats: Cookies & Cream* $4.00; *Relaxation Superfood Bites: Apple Crisp &
   Reishi* $10.00). Some additions show Add to Cart directly (*Cheesecake Brownie Bites* $9.00, the bulk items).
3. **Pressed, the snack is counted on its own card** (the counter reads 1, at 1280 and at 390) and listed under
   *"Add-On & Extra Meals … One Time Order"*; **the meals' minimum is untouched** (*"ADD 7 MORE MEALS TO CHECKOUT"*,
   disabled).
4. ⚠⚠ **The plan's count, as the block reads it (`plan()`), differs by width**: at **1280** the sidebar's
   `.cart__items-count` reads **"1 item"** (the add-on counted); at **390** the cart bar's `.mobile-cart-summary__stat-value`
   reads **"0"** (meals only). The block's CHECKOUT condition (`plan() === p.total`) must therefore expect *meals + snack
   units* on the sidebar and *meals* on the cart bar, or read the meals another way.

**What the contract must settle** (not settled here): the link's snack part (after the meals, `key*qty`, refused when a
snack key collides with a meal's); the press (Select Options when shown, then Add to Cart, the counter's "+" for more,
each confirmed by the card's own counter); the CHECKOUT condition per width (item 4); the Footer block's size (17,617
bytes against the refusal at 20,480); the stripped checkout's recap (*"{n} meals"*); the snack price on the page (still
unruled); the live proof: the watch's smoke with the built block pasted (`--script`) and a snack link (`--link`), at both
widths, never submitting; then the Advisor's paste, `snacks.carted: true`, and a version-2 picks file for 10-18 with its
snack lists (Fit AF's emitter, `emit_microsite_picks.spec.md` § 6, from his approval).
✅ **The site's suite no longer reads the committed snack flags** (2026-10-08). Measured first in a mirror of the
repository with `snacks.shown: false`: 16 of 615 failed, MS-3, MS-4 (2), MS-7's shown half, MS-8 (2), MS-9, MS-12 (2),
MS-14, MS-16 (2), PR-14, PR-15, S20 and CC-4 (prod). Now every case that asserts about snacks builds from its own copy of
`data/plans.json` with the flags it asserts (`test/ms-harness.mjs`: `pageOf({ snacks: SNACKS_SHOWN })` writes the copy
to a temporary directory and removes it; `withSnacks(flags)` is the same data for `renderPage` and `devPage`): those
fourteen and MS-7's hidden half, 15 cases. `node test/suite-in-mirror.mjs --set snacks.shown=false` runs the whole suite
in a mirror with the data changed there (no `--set`: the control, 615 of 615); it gives **613 of 615**, and the two are
**S20 and CC-4 (prod), by design**: they pin the production page's bytes (`test/s20-production-golden.json`, *"regenerate
only when production is MEANT to change"*), so a flip's own commit re-records that golden (`index.html` `6a548cd7…` →
`03fcc0c1…`), and with it the suite was 615 of 615 (in a mirror). ⚠ Storybook's stories build from the committed data
(the site's build takes no other plans file), and SM-5's walk of the *"… · snacks"* stories expects Q4: read, not run;
it moves with the flag too. `carted: true` is still refused by the build (§ 10 item 1), so that flip stops every build.

**The contract: [`SPEC-snacks-in-the-cart.md`](SPEC-snacks-in-the-cart.md)** (2026-10-08): the probe first (its § 1), then the
link's snack items, the block's press and CHECKOUT by width, the page's links, the live proof, and the release order (no
link carrying a snack before the Advisor's paste). Two choices open with defaults: the snack price (none on the page) and
who chooses the week's snacks.

## 12. Amendment, 2026-10-20: every default on the left, *Weekdays only* the default, and the snacks in the card's list. CONTRACT, before any code

**The Advisor's words** (2026-10-20, Fit AF's session 250): *"Please flip the semantics of these questions: "Weekdays
only" and "Every day"; "No breakfast" and "Add breakfast". That will mean that all of the defaults ("OR", "Weekdays", "No
breakfast") line up along the left side"*; asked whether *Weekdays only* also becomes the default and whether snacks flip
the same way: *"Yes – please also do snacks as well so the default of "no snacks" (or however we wrote it) is on the
left. Please unify snacks into the bottom of the meal list. That will clean up the bottom of the page ("Continue to
checkout", "Choose my own meals", "See all plans")."* Amends § 1's table and § 2's defaults; nothing else of §§ 1–11.

1. **The answers, each pair's default first (on the left)**:

   | | question | answers, left · right | default |
   |---|---|---|---|
   | Q1 | lunch or dinner, or both | *Lunch **or** dinner* · *Lunch **and** dinner* | none (unchanged: the card waits for Q1) |
   | Q2 | weekends | ***Weekdays only*** · *Every day* | ⚠ **weekdays** (was *every day*) |
   | Q3 | breakfast | *No breakfast* · *Add breakfast* | no breakfast |
   | Q4 | snacks | *No snacks* · *Add snacks* | no snacks |

   The words stay phrases in `data/messages.json` (Q2's *no* answer reads *"Weekdays only"*); the default is data
   (`data/plans.json` `selection_defaults.weekends: false`), and the order is the build's (each pair's default first,
   so a future default change keeps the default on the left: the order follows the default, it is not a second list).
2. ⚠ **What the default now means**: answering Q1 alone gives *or, weekdays* (5 a week, which the store fills as its
   4-meal plan, § 2's table) and *and, weekdays* (10), not 7 and 14. **§ 6's MS-3 inverts**: the default links are
   `or-5d` and `and-5d`. **Today's fragments keep their meaning** (§ 3): `#<size>-7` still opens *or, every day* and
   `#<size>-14` *and, every day*, and a fragment naming its days (`-7d`, `-5d`) is read as written.
3. **The snacks join the card's list**: with *Add snacks*, the one list holds the week's meals, then the snacks under a
   small *"Snacks"* heading inside the same list (the phrase `snacks_heading`, or a shorter one the build names), then
   *Continue to checkout* and *Choose my own meals*; no second box below the buttons. *"Snacks aren't added to your
   cart yet."* stays with the snacks, where § 11 shows it. With *No snacks* the card is as today.
4. **What changes, and what must not**: the development and production pages change, by design (the questions' order
   and the default, the card's layout): S20's production golden and the development goldens are re-recorded **once**,
   with every changed line listed in the build's notes. ⛔ **The week's content is byte-identical** (`npm run content`
   for 2026-10-18 and 2026-10-25, production and `--env dev`, against `cff49c0`), and the cart links and the store's
   Footer hand-off for every answer set are unchanged: the same answer set gives the same link. Storybook's stories that
   show the questions or the card are re-recorded.
5. **Cases, written first and run red**: each pair's default on the left; the default state (*weekdays*, no breakfast,
   no snacks) after Q1 alone, with its links `or-5d` / `and-5d`; the legacy fragments' meaning unchanged; with snacks, one
   list whose last lines are the snacks and the two buttons after it, no separate snacks box; without snacks the list as
   today; and **the switch's smokes** (`unattended-switch.spec.md` S7/S9, Fit AF): whether any of them selects an answer
   by position or by the old default. The build says which, and changes none of Fit AF's programs.
6. **Release**: the dev line, then a dev pin (`fitaf-infra`) and the Advisor's look on dev; ⛔ **production only on his
   word**, and not between Fit AF's rehearsal and Friday 2026-10-23's switch unless he says so (the switch's live smokes
   run against eatfitaf.com's page).

### 12.1 Built — found at the build, not ruled

Built on `boston/defaults-left` from `d15b48c` (this contract, on the dev line `cff49c0`), in three commits: `68ec5f9`
(the cases, red), `5f55cbc` (items 1–4), and this note's (the goldens, re-recorded once, and § 12.1). **To be re-gated by
the orchestrator**: the cases below were run one file at a time, never the whole suite, Storybook or `npm run contrast`.
§§ 0–12 are unchanged.

**The cases (item 5), and what they did before the code** (`node --test <file>`, alone, on `68ec5f9`):

| case | file | before | after (`5f55cbc` and this commit) |
|---|---|---|---|
| MS-17 (new): each pair's default on the left in this table's words, prod and dev; `selection_defaults` weekdays, no breakfast, no snacks; the left answers pressed after Q1; the order follows other defaults in a copy of the data | `ms-17-defaults-left.test.mjs` | 1 of 7 (the all-true defaults happen to be today's order) | 7 of 7 |
| MS-3, inverted (item 2): Q1 alone gives `or-5d` (the 4-meal plan, the rounded line) and `and-5d`, their fragments and figures, and with a week those carts' own links; `#<size>-7` / `#<size>-14` keep their meaning, byte-identical to `ms-golden.json`; `-7d` / `-5d` read as written | `ms-03-defaults.test.mjs` | 1 of 3 (the legacy fragments, a control) | 3 of 3 |
| MS-18 (new, item 3): with *Add snacks* the snacks inside `#cc-list` after the meals, under an `h4` reading *Snacks*, before *Continue to checkout*, *Choose my own meals* the card's last thing (not carted: the line after the snacks; carted: no line); *No snacks* reads as today; `.cc-snacks` draws no box, its heading smaller than the list's | `ms-18-snacks-in-the-list.test.mjs` | 1 of 4 (*No snacks*, a control) | 4 of 4 |
| MS-16: Q4's answers `no`, `yes` | `ms-16-snacks-shown.test.mjs` | 2 of 3 | 3 of 3 |
| A3's control: the page's answers compared as a set (their order is MS-17's subject) | `a03-refusals.test.mjs` | 4 of 4 | 4 of 4 |

**Where § 12 was silent, and what was done**

1. **Q1's order.** Q1 has no default (the card waits for it), so it keeps `QUESTIONS`' order, *or* then *and*: the
   Advisor's *"OR"* is on the left as he listed it.
2. **Where the order lives**: `build.mjs`'s `answerOrder(q, defaults)`, Q2–Q4's default answer first, read from
   `selection_defaults` (`true` → `yes`). Not `scripts/selection.mjs`, which the Worker reaches, so the Worker's files move
   by `data/plans.json` alone. `QUESTIONS` stays the vocabulary (A3's, and `src/worker/beacon.js` keeps its own copy
   unchanged); only the markup's order follows the default. `src/app.js` is unchanged: the new default reaches it as
   `#plan-data`'s `defaults`, and every answer is read by its `data-a`, never by position.
3. **The heading**: `chefs_choice.snacks_heading` itself shortened to *"Snacks"* (one phrase, not a second); an `h4`
   (`.cc-snacks-heading`, 600 15px, navy) under the list's `h3` (17px). Navy on white is a pair `npm run contrast`
   already measures, so `src/contrast-pairs.json` is unchanged (not run here).
4. **"Inside the same list"** is read as inside the list's box, `#cc-list`: the snack block keeps its own `ul`
   (`#cc-snack-list`, the meals' style) under its heading, between `#cc-meals` and `#cc-checkout` (`card.html`'s new
   `{{SNACKS}}` slot), rather than `li`s appended to `#cc-meals`, so the heading is not a list item and the card's script
   (`chefs-choice.js`) is unchanged, its ids all kept.
5. **The not-carted line** (*"stays with the snacks"*): committed, `snacks.carted` is true, so the line is not on the
   page (SPEC-snacks-in-the-cart § 4.3) and nothing shows it; with a copy's flags not carted, it sits inside the list
   after the snacks and before *Continue to checkout* (MS-18).
6. ⬜ **A fallback card shows no snacks now.** § 10 item 12 put the snack box on the card whether or not the answers had a
   cart; inside the list, it is hidden with the list. While carted no link could carry them anyway, and both committed
   weeks (10-18, 10-25) have a cart for all eight answer sets, so nothing a visitor sees today changes. For the Advisor,
   if a fallback card should show them.
7. **CC-7b** reads the card's words from `#cc-list`'s text, which now holds the snack block: it marks `snacks_heading`
   and `snacks_not_carted` too and builds from its own snack flags (shown, not carted: § 11's rule). CC-7a's source check
   keeps its four phrases (*"Snacks"* is also inside the script's own name `renderSnacks`); two comments were reworded so
   no card phrase is written in a source.
8. **WC-9's visible pages cannot be re-recorded by its recorder as it was** (it builds a commit `--on` a date, and no
   build embeds a week since SPEC-week-content § 7). `test/wc-09-record.mjs` gains `--visible-at <commit>`: `visible` is
   the page production's Worker serves from that commit's own tree with the week's content in its bucket, as WC-9c makes
   it; `picks_data`, `page_sha256` and the sheet stay 409b805's, so WC-9a's content comparison is unchanged.
9. **The build commit, `5f55cbc`, is red by design** on exactly the cases that pin the pages' bytes (S20, CC-4 prod,
   WC-8's control, WC-9c, U4) and the Worker's files (CC-8b, CC-8c, MS-9 ×2, PR-10: `data/plans.json`), because U4's and
   WC-9's recorders record from a commit's own tree: this commit records them from `5f55cbc`.
10. **Storybook** keeps no recorded image or golden: its stories build from the tree, so the stories that show the
    questions or the card show the new order and layout with no change to them; its walk reads answers by `data-a` and
    the snack block by its ids. Not run here.
11. **Not changed, stale**: `data/messages.json`'s `about` still says snacks are not carted.

**The switch's smokes (item 5)**: none selects an answer by position or relies on the old default. Fit AF's
`scripts/switch/unattended-switch.spec.md` S7 and S9 take each smoke's link from a page's own `#picks-data` (the page
fetched, never pressed) by the answer set's KEY, the cart's `links` or `snack_links` (its `smoke-link.ts`, with the job
config naming `or-5d`, `and-7d-b`, `and-7d` and `or-5d` for S7 and `and-7d` for S9); its one positional choice is the
size, the first of the cart's mpids sorted, over the content, which § 12 does not move. The watch's smoke opens the link
it is given on the store (`tools/storefront-watch/lib/smoke.mjs`), and nothing in the watch's `bin/` or `lib/` reads a
`data-q` or `data-a`. None of Fit AF's programs was changed.

**What did not change, shown** (the dev line's worktree at `cff49c0`, read only, against this branch):

- `npm run content -- --week 2026-10-18` and `2026-10-25`, each also `--env dev`, compared with `diff -r`: byte-identical
  (`week/picks-data.json` 3a7b7b5d… and 931a963b… for 10-18 prod and dev, 31,134 bytes; b0787e5b… and fe445c38… for
  10-25, 31,411 bytes; the sheets byte for byte).
- Every answer set's links: both committed weeks, prod and dev, three sizes, `#<size>-7`, `#<size>-14` and the eight
  answer sets with and without `-s` (216 states), each page made by its own tree's build and content and opened by the
  same reader: *Continue to checkout*, *Choose my own meals*, *Choose your meals*, the meals and the figures
  byte-identical (96 of the 216 links carry snacks). The same answer set gives the same link; only Q1 alone now lands on
  `or-5d` / `and-5d`.
- The visible page (wc-harness `visible()`) at 60 fragments per week and target: 6 byte-identical (no answer chosen,
  `#family`, `#individual`, each size alone), 54 byte-identical once § 12's three changes are undone (each pair's buttons
  swapped back, *Weekdays only* read as *Weekdays*, the snack block moved back after *Choose my own meals* with its old
  heading), 0 different otherwise.
- Every built file but the pages byte-identical (fonts, logo, photo sheets, QR codes).

**The goldens, re-recorded once (this commit)**

| golden | moved |
|---|---|
| S20 `test/s20-production-golden.json` | `index.html` alone, `ac981505…` → `03e39dbc…` |
| WC-8's `TODAY_NO_PICKS_SHA256` | `03fcc0c1…` → `bb17e256…` |
| U4 `test/u-04-golden.json` (`node test/u-04-record.mjs --commit 5f55cbc`) | the six served pages, and their visible page at the five answered fragments; all six contents and `(no fragment)` and `#family` byte-identical |
| WC-9 `test/wc-09-golden.json` (`node test/wc-09-record.mjs --visible-at 5f55cbc`) | `visible` at the 18 answered fragments; `""`, `#family`, `picks_data`, `page_sha256` and the sheet as before |
| CC-8 `test/cc-08-unchanged-golden.json` (CC-8b, CC-8c, MS-9, PR-10) | `worker["data/plans.json"]`, `4213f7b5…` → `46542b6f…`; the Footer block's text (`efcbc570…`) and the watch's expected Footer unchanged |

**Every changed line.** Production's `index.html` (no week, as every build writes it), 25 lines; each development page
(`/`, `demo/`, `boston/`, `seminar/`) changes by the same 25 lines at other line numbers (compared line for line), and
each served page (U4, WC-9) by the same lines, its `#picks-data` the unchanged content. Sizes, raw / gzip: production
40,195 / 11,878 → 40,324 / 11,947; development `/` 63,825 / 18,780 → 63,954 / 18,840 (`seminar/` 63,957 / 18,842), under
SPEC.md § 1's 61,440 gzip. (`diff`'s own output; the `#plan-data` line is one line of JSON, shown here by its
`defaults` alone, the only part that moved.)

```text
198,200c198,203
< /* The week's snacks (SPEC-meal-selection § 9 item 3): shown with Add snacks, below the card's links; never in a link */
< .cc-snacks { margin: 16px 0 0; padding: 16px 16px 4px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--white); }
< .cc-note { margin: 0 0 12px; color: var(--muted); font-size: 15px; }
---
> /* The week's snacks (SPEC-meal-selection § 9 item 3; § 12 item 3): with Add snacks, inside the card's one list, after the
>    meals and before the list's checkout link, under a small heading; no box of their own */
> .cc-snacks { margin: 0 0 16px; }
> .cc-snacks .cc-meals { margin-bottom: 0; }
> .cc-snacks-heading { margin: 0 0 4px; font: 600 15px/1.3 var(--head); color: var(--navy); }
> .cc-note { margin: 8px 0 0; color: var(--muted); font-size: 15px; }
257a261
>           <button type="button" class="choice" data-q="weekends" data-a="no" aria-pressed="false"><span class="choice-name">Weekdays only</span></button>
259d262
<           <button type="button" class="choice" data-q="weekends" data-a="no" aria-pressed="false"><span class="choice-name">Weekdays</span></button>
265d267
<           <button type="button" class="choice" data-q="breakfast" data-a="yes" aria-pressed="false"><span class="choice-name">Add breakfast</span></button>
266a269
>           <button type="button" class="choice" data-q="breakfast" data-a="yes" aria-pressed="false"><span class="choice-name">Add breakfast</span></button>
272d274
<           <button type="button" class="choice" data-q="snacks" data-a="yes" aria-pressed="false"><span class="choice-name">Add snacks</span></button>
273a276
>           <button type="button" class="choice" data-q="snacks" data-a="yes" aria-pressed="false"><span class="choice-name">Add snacks</span></button>
290a294,297
>             <div class="cc-snacks" id="cc-snacks" hidden>
>               <h4 class="cc-snacks-heading" id="cc-snacks-heading" hidden>Snacks</h4>
>               <ul class="cc-meals" id="cc-snack-list" hidden></ul>
>             </div>
294,297d300
<           <div class="cc-snacks" id="cc-snacks" hidden>
<             <h3 class="cc-heading" id="cc-snacks-heading" hidden>Snacks this week</h3>
<             <ul class="cc-meals" id="cc-snack-list" hidden></ul>
<           </div>
400c403
< <script type="application/json" id="plan-data">… "defaults":{"weekends":true,"breakfast":false,"snacks":false} …
---
> <script type="application/json" id="plan-data">… "defaults":{"weekends":false,"breakfast":false,"snacks":false} …
```
