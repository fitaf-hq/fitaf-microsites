# Every picked menu on the plan card, and each meal's nutrition. CONTRACT, before any code

**Written 2026-10-21, before any code.** The Advisor's rulings (Fit AF's decision record `2026-10-17-…` § 7q items 3
and 4, `AskUserQuestion` 2026-10-21): the week's menus as **a chooser on the plan card** (*"A row of menu names above
the meal list, with Chef's Choice selected. Choosing another one refills the meals and the checkout link for the same
plan and size."*), and nutrition as **a line, tap for more** (*"Under each meal name, one line of numbers for the size
chosen. Tapping the meal opens its ingredients and Contains."*). Nutrition is the Owner's label sheet's, the same numbers
Fit AF puts into the store; Fit AF's emitter writes it (its `scripts/menus/emit_microsite_picks.spec.md` § 9).

**Amends**: `SPEC-chefs-choice.md` §§ 1, 3 and 7.2; `SPEC-meal-selection.md` § 4 (*"Which list a visitor sees"*) and
§ 5 (the file); the shape check of `SPEC-week-content.md` § 4 item 2 (it must accept the additions). Nothing else.

## 1. The file (`data/picks/<sunday>.json`, version 2): two additions

1. **`lists` may hold more than `chefs-choice`.** Each list is checked exactly as `chefs-choice` is
   (`SPEC-meal-selection.md` § 5: every cart through `payloadFromArgs`, rows of `selection`, the snack lists). ⛔ **A list
   the page has no name for is refused** (the build and `npm run content`, naming the list): the page's words
   (§ 4, `messages.json` `menus`) are what make a list one *"the page shows"*, so § 4's rule of `SPEC-meal-selection.md`
   (*"The file carries only the lists the page shows"*) is now enforced by the words rather than by one constant.
   `chefs-choice` is still required.
2. **`meals`** (optional): one entry per meal, keyed by the meal's `name` (the store's name, the only key):
   ```json
   "meals": { "<name>": {
       "nutrition": { "lean": { "cal": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0 },
                      "signature": { … }, "performance": { … } },
       "ingredients": "…", "contains": "…" } }
   ```
   - A key that is no item's `name` in the file's carts is refused. Not every item needs an entry.
   - `nutrition` holds any of the three individual sizes (`data/plans.json` `individual[].id`); a size present carries
     **all five** numbers, each a non-negative integer (grams, and calories). Family has none (`SPEC-chefs-choice` § 3:
     the card is the individual plans').
   - `ingredients`: text, not blank. `contains`: text, not blank, optional. No other field anywhere in `meals`.
   - ⛔ Public fields only, as today: no KMS slug, no product id, no price, no person.
3. **A file without these additions reads exactly as today**: every committed week, and every week emitted before Fit
   AF's § 9 lands.

## 2. The chooser (the card's `CHOSEN` state, individual plans)

1. **When the week holds a cart for the visitor's answers in more than one list**, a single-choice group of the menus'
   names sits above the meal list (a native radio group styled as a row of chips is the expected shape: keyboard
   reachable, its state exposed to assistive technology). **Its order is the words' order** (§ 4); a list appears only
   when it has a cart for the current answers.
2. **Chef's Choice is selected first.** Choosing another menu **refills the meal list, its snacks and the checkout
   link** from that list's cart for the same answers, by the same code that builds them today (`handoffLink` through
   `payloadFromArgs`, the chosen size's `mpid` for the row's `plan`). The heading names the menu (§ 4's `{menu}`).
3. **Changing an answer** keeps the chosen menu when it has a cart for the new answers, and otherwise returns to Chef's
   Choice.
4. **One list in the week** (every week today): no chooser, and the card's visible page exactly today's.
5. The tiles: each meal's tile as today, by its `name` in the week's photo sheet; a meal the sheet has no cell for shows
   what a cell-less meal shows today (the build reports what that is).
6. ⛔ Unchanged: the fragment (the menu is not written to the URL), the analytics beacon (no new event), *Choose my own
   meals*, the Family tab, the grid, the save step.

## 3. Nutrition (the card, individual plans)

1. **The line**: under each meal's name, when `meals[name].nutrition[<the chosen size>]` exists, one line from the phrase
   `nutrition.line` (`{cal}`, `{protein}`, `{carbs}`, `{fat}`). Fiber is carried and not shown (the ruling's line names
   four). Choosing another size changes the numbers.
2. **Tap for more**: when the meal has `ingredients`, its line is a disclosure control (a button, `aria-expanded`,
   `aria-controls`) that opens beneath it the ingredients (`nutrition.ingredients`, `{text}`) and, when present,
   *Contains* (`nutrition.contains`, `{text}`); a second press closes it. Each meal opens on its own.
3. ⛔ **No data, no claim**: a meal with no entry, or no numbers for the chosen size, shows no line (never another size's
   numbers, never a figure computed here); one with no `ingredients` is not a control.
4. All text is written with `textContent`, never as markup. Snacks show no nutrition in this amendment.

## 4. The words (`data/messages.json`)

- **`menus`**: `{ "<list id>": "<the menu's name>" }`, in display order, `chefs-choice` first.
- **`nutrition`**: `line`, `ingredients`, `contains`.
- **`chefs_choice.heading`** may carry `{menu}`.
- `status: "placeholder"` until the Advisor approves the words; the build refuses a missing phrase or slot, as it does
  for `chefs_choice`. ⛔ **No list but `chefs-choice` is named in this repository until the Advisor has approved its
  name and the same change ships it**: the cases build with invented lists in their own fixture words.

## 5. Unchanged, shown

- `npm run content` for a week without the additions (2026-10-25), production and `--env dev`: byte-identical to the
  base's.
- The Worker: a week carrying the additions is injected as any week (`WC-1`'s rule); its shape check passes it.
- The store's Footer block, the hand-off, the watch's expected Footer (`CC-8`): byte-identical.
- The production page changes (the card's script, markup and style, the words): S20, U4 and WC-9 re-recorded **once**,
  every changed line listed in § 7; no other golden moves. The page stays under `SPEC.md` § 1's gzip budget.
- Every colour a `:root` token; any new pair in `src/contrast-pairs.json`.

## 6. Cases (written first, each run red before its code)

- **EM1, the file**: a fixture week with two lists and `meals` builds and contents. Refused, each naming its place: a
  list without a name in the words; a `meals` key no cart carries; a number negative, fractional or not a number; a size
  missing one of the five; blank `ingredients`; an unknown field in `meals`, a size or an entry.
- **EM2, the chooser** (Chrome, as W2): two lists for the answers → the group shown, Chef's Choice selected; choosing the
  second shows its meals, and its checkout link decodes (the shipped reader of `#fitaf=`) to **that list's** cart and the
  size's `mpid`; an answer change to a set the second list has no cart for returns to Chef's Choice; a week of one list
  → no group and the card's visible page equal to the base's.
- **EM3, nutrition** (Chrome): each size's numbers on the line, changing with the size; the control opens and closes the
  ingredients and *Contains*, `aria-expanded` following; a meal without an entry: no line, no control; a meal without the
  chosen size: no line.
- **EM4, the words**: every phrase from `messages.json` (the letterless-marker rule); a missing `menus` name refused.
- **EM5, the Worker and the content**: a week with the additions injected and contented; 2026-10-25 byte-identical.
- **Mutants** (each red on its case, its control green): the checkout link built from Chef's Choice whatever is chosen
  (EM2); the line read from the first size present rather than the chosen one (EM3); a list without words accepted (EM1).
- The site suite, contrast, Storybook and the storefront watch: green, or each failure shown to be the base's own by a
  control run on the base.

## 7. Release, and the order with Fit AF

1. The dev line, a dev pin and the Advisor's look; **production on his word, after Fit AF's Friday 2026-10-23 switch**
   (`SPEC-meal-selection.md` § 12 item 6: not between the rehearsal and that switch).
2. ⛔ **Fit AF's emitter writes more lists or `meals` only after this is on the dev line the switch writes into**
   (`boston/rung-4-save-offer`): until then that line's build refuses a list other than `chefs-choice` and any field
   it does not know, and the switch's content step would stop. Fit AF's § 9 states the same order.
3. A week shows another menu only when the Advisor has approved that list for that week (the approval's `lists`, Fit
   AF's) and its name (§ 4).

## 8. Not here

The save step (its own contract), analytics for the chooser, a fragment for the menu, snacks' nutrition, a swap of one
meal inside a menu (the Owner's note; the store's cart already lets a visitor change meals before paying).

## 9. Built (to be filled by the build)
