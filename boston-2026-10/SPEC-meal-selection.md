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

The file gains a **`selection`** table, one row per answer set, and a **`snacks`** row; `shown_counts` is retired with
the two buttons.

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
- **The result card shows the plan**: its meals a week, its price per meal and its weekly total, as today. When `plan` is
  below `meals`, one line says so (`plan_page.rounded`, a placeholder: *"{meals} meals go through as our {plan}-meal plan
  for now."*). ⚠ The snack price is not in `data/plans.json`; the card shows no snack price until a ruling says where it
  comes from.

## 3. The fragment

`#<size>-<or|and>-<7d|5d>[-b][-s]`, e.g. `#lean-or-7d`, `#signature-and-5d-b`. **Today's fragments keep working**:
`#<size>-7` opens *or*, every day; `#<size>-14` opens *and*, every day (a saved offer's link reopens the same choice);
`#family` is unchanged. An unknown fragment opens the page at its start, as today.

## 4. Chef's Choice for the answers

- The card shows **the cart for the chosen answers** from the week's picks file (§ 5): the heading as today
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

- The question words and the defaults (placeholders), and whether Q2–Q4 show before Q1 is answered.
- The snack price and whether snacks are carted (§ 4).
- Which other pick lists a visitor is offered, and by what names.
- The 3 × 2 grid: whether it grows to the store's other counts (4, 10, 21).
- **Prod**: the dev line and the test address first; eatfitaf.com only on the Advisor's go.
