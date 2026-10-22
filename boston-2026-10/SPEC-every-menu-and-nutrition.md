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
   - ⚠ **Amended 2026-10-21, after both builds** (the orchestrator; the line above read as making `ingredients` required,
     which § 3 item 3 contradicts and Fit AF's emitter does not give): **each of `nutrition` and `ingredients` is
     optional, an entry carries at least one of them, and `contains` appears only beside `ingredients`.** `"meals": {}`
     is accepted. The emitter writes only what a meal's label row gives (Fit AF `emit_microsite_picks.spec.md` § 9.0
     item 5 and § 9.1): numbers with no declaration, or a declaration with no numbers that parse. A file this check
     refused would stop the switch's content step.
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

Built on `boston/every-menu` from `76ee36e` (this contract), in four commits: `a08b8db` (the cases, red), `9a19f48` (§§ 1–4),
`e3c9bb4` (Storybook's stories), and this section's (the goldens, re-recorded once, and § 9). **To be re-gated by the
orchestrator**: every case below was run one file at a time (`nice -n 15`), never the site's whole suite, Storybook's
whole suite or the storefront watch. §§ 1–8 are unchanged.

**The cases, and what they did before the code** (`nice -n 15 node --test <file>`, alone; "before" on `a08b8db`):

| case | file | before | after (`9a19f48` and this commit) |
|---|---|---|---|
| EM1, the file: the fixture week (`test/fixtures/picks-menus/2026-10-04.json`: Chef's Choice, the v2 fixture's carts and snacks; `fixture-two`, invented, three carts and its snacks; `meals` for four meals) builds and makes its content with the fixture's words (`test/fixtures/menus-words.mjs`); 15 refusals, each naming the file and its place | `test/em-01-the-file.test.mjs` | 1 of 17 (the fixture control); every other red on `the file: unknown field "meals"` | 17 of 17 |
| EM4, the words: `menus` and `nutrition` in `data/messages.json`, placeholders; no nutrition phrase in the sources; the letterless-marker rule over the card with both menus chosen in turn (its control: a name left with letters is caught); the build's refusals | `test/em-04-words.test.mjs` | 0 of 5 | 5 of 5 |
| EM5, the Worker and the content: the shape check passes the additions; production's and the development Worker inject them as WC-1 says, the served page offering both menus; 2026-10-25's content (prod and `--env dev`) byte-identical to `76ee36e`'s own tree, its report and message too | `test/em-05-worker-and-content.test.mjs` | 2 of 5 (EM5c, the invariance) | 5 of 5 |
| EM1's mutant and its control | `test/em-mutants.test.mjs` | 0 of 2 | 2 of 2 |
| EM2, the chooser (Chrome, 390): shown with Chef's Choice selected, the accessibility tree's two radios; the other menu pressed, then the arrow keys; its meals, heading, snacks and link (read by cc-harness `readWithFillB`, the shipped reader: its cart's presses and Lean's mpid for the plan, then Signature's after a size change); an answer it has a cart for keeps it, one it has none for returns to Chef's Choice, and back. A week of one list: no chooser, and `#result`'s text and every drawn box equal to `76ee36e`'s page, at three answer sets, 390 and 1280. EM3, nutrition (Chrome, 390): each size's line, a meal without an entry no line and no control, one without the size no line, the panel beneath the meal, `aria-expanded` following, Enter, each meal on its own. The two mutants with their controls | `tools/storybook/test/em-chrome.test.mjs` | 1 of 5 (the one-list week against the base) | 5 of 5 |

**The mutants (§ 6), each red on its case, its control green**

- *A list without words accepted* (`scripts/chefs-choice.mjs`: the refusal `if (!ctx.names.includes(name)) throw` made
  `if (false) throw`, in a mirror): EM1's list case reads `accepted` and `something was written`; the unchanged mirror
  refuses it and makes the fixture's content.
- *The checkout link built from Chef's Choice whatever is chosen* (a copy of the built page, the script's one `var links
  = cart && …` line taking Chef's Choice's cart for the answers): EM2 red, *the second menu's link decodes to {}, not its
  cart* (fill C finds none of its keys on the second menu's cards), and two more at Signature and with snacks; the copy as
  built passes EM2 whole.
- *The line read from the first size present* (the copy's one `return lines && has(lines, size) …` line made the first
  size's): EM3 red on seven lines (at Signature and Performance, Lean's numbers in their place, and on a meal with Lean
  alone; at Lean, a Performance-only meal's numbers); the copy as built passes EM3 whole.

**Where §§ 1–4 were silent, and what was done** (found at the build, not ruled)

1. **The content's shape** (§ 2's *"the same code that builds them today"*): a week of one list is byte for byte what
   it was. A week of more than one list adds `menus`, `[{ list, name }]` in the words' order, Chef's Choice first and
   without carts (its carts and snacks are the week's own `carts` and `snacks`, which the Worker checks), every other
   list with its `carts` and `snacks`, each cart made as Chef's Choice's (`cartOf`: `payloadFromArgs` per size,
   `handoffLink`). A week with `meals` adds `facts`, an entry per meal (`lines` by size, each `nutrition.line` filled;
   `ingredients` and `contains` filled from their phrases), and a cart holding such a meal its own `facts`, per meal the
   entry's place or `null`: each meal's text once, however many carts hold it. Fiber is carried in the file and checked,
   and not in the content (the line names four).
2. **The Worker is unchanged** (§ 5: *"its shape check passes it"*; CC-8 green, its golden unmoved). Its check reads the
   keys the script read before this contract, so the script reads `menus` and `facts` only in the shape the content
   writes (each other menu's carts and snacks as the Worker checks the week's) and otherwise shows one list without
   nutrition.
3. **`{menu}` and the committed heading.** `chefs_choice.heading` is unchanged (*"Chef's Choice ({week})"*: § 4's *"may
   carry"*), so a one-list week's heading is today's; a week of two or more lists whose heading has no `{menu}` is refused
   by the content (*"2 lists, and data/messages.json's chefs_choice.heading has no {menu} to name the menu shown"*), since
   § 2 item 2's heading must name the menu. The fixture's words carry `"{menu} ({week})"`; the change that names a second
   list (§ 4) adds `{menu}` to the committed heading in the same commit. ⚠ Done at `f2d1748` (below).
4. **`menus`' note.** `status` sits inside `menus` as in every words key; it is not a list. `chefs-choice` must be the
   first list named (*"menus must name chefs-choice first"*), § 4's *"chefs-choice first"*; a blank name is refused.
5. **The `meals` keys** are matched as the link tool reads a name (whitespace collapsed and trimmed) against every
   list's carts; a snack's name is refused (§ 1 item 2: *"no item's name in the file's carts"*), and two keys that read
   alike are *"named twice"*. **An entry's fields**: § 1 item 2 marks `contains` alone optional, so `nutrition` (any of the
   three sizes, possibly none) and `ingredients` are required; ingredients and Contains are shown whitespace-collapsed.
   ⚠ **Wrong, and amended** (`1fb2b19`; the build of it is below, after the changed lines).
6. **The size** the line reads is `#result`'s `data-accent`, the plan's id `app.js` writes with the result (the size of
   *Choose your meals*' mpid); `app.js` is unchanged.
7. **The control** (§ 3 item 2's *"its line is a disclosure control"* and the ruling's *"Tapping the meal"*): the meal's
   name and its line together are the `button`; a meal with ingredients but no numbers for the chosen size is still the
   button, without a line (§ 3 item 3 forbids the line, not the ingredients); a `+`, `−` when open, after its name
   (CSS, no letter). A panel left open stays open while only the size changes (the same menu and answers), and closes
   with any other change.
8. **The chooser** is a `fieldset` (`#cc-menus`, hidden in the markup) inside the list's box, above its heading; each
   menu a `label` holding a radio (`name="cc-menu"`, its `value` the list) drawn as a chip in the selected tab's colours
   (navy, white), the radio itself 1 px and transparent. ⬜ **For the Advisor: the group has no name of its own** (no
   `legend`): each radio is named by its menu; naming the group would be one more phrase in `data/messages.json`.
   ✅ Ruled 2026-10-21: *"Menu"* (below).
9. **Chef's Choice with no cart where another list has one**: the card falls back (*Choose your meals*), with no
   chooser (one list offered), unless that other list was the one chosen, which § 2 item 3 then keeps. No committed week
   has such an answer set.
10. **`npm run content` gains `--messages FILE`** (the words file instead of `data/messages.json`), for the cases and
    Storybook only, as `--picks`: a week of an invented second list is made only with its own words (§ 4).
11. **§ 2 item 5, the tiles.** Each meal's tile is still its cell of the week's photo sheet by `name`; a meal the sheet
    has no cell for shows a plain tile (`.cc-thumb`, the `--ice` colour, `thumbStyle` null) and its link's photo part
    names no cell for it (`photoPart`), as every breakfast does today (SPEC-meal-selection § 8 item 8). Another list's
    meals have cells only where Fit AF's photo emitter binds them.
12. **Other contracts' cases amended**: MS-10's *"a card that chooses its cart by mpid"* anchors on `chosen(sel, menu)`
    and chooses within the menu's carts; Storybook's SM-4 sets the menus' names apart (`copies.mjs`' `NOT_PHRASES`): the
    name *Chef's Choice* is also the state SPEC-storybook-microsite § 3 names, written in 10 files under
    `tools/storybook/`, every one of which SM-4 would otherwise flag. SM-3's fresh page and SM-5's walk take the new date.
13. **EM1's list case was reshaped at `9a19f48`**: it carried `meals`, which name the second list's meals, so its
    mutant, letting the list through, was still refused (*"meals "Charred Corn Chicken Plate": no meal of the file's
    carts has this name"*, the list dropped). Without `meals` the list alone decides. ⚠ Reshaped, it is green on
    `a08b8db`'s code too: the old constant (`SHOWN_LIST`) refused every other list; what is new is that the words decide,
    which the mutant shows.
14. **Storybook** (`e3c9bb4`): the Date control's fifth date, *the fixture week of two menus*, and the **Every menu**
    stories (*Two menus*, *Two menus · the other chosen*, *Nutrition · a meal opened*), each state reached on both
    builds' page in Chrome; SM-4 6 of 6 and SM-6 6 of 6. SM-2, SM-3 and SM-5 (each builds Storybook) not run.

**Found (the contract said otherwise)**

- ⚠ **WC-9 did not move.** § 5 lists it with S20 and U4; its recorder (`node test/wc-09-record.mjs --visible-at 9a19f48`)
  wrote every key as committed but `visible_at` (`f02807e` → `9a19f48`): the visible page at all 20 fragments is
  `f02807e`'s byte for byte. Not re-recorded; WC-9 is green as committed, and that is § 2 item 4 shown on the served page.
- § 5 says the changed lines are listed in § 7; they are here, § 9.
- The production page grows 8,768 bytes raw, 2,428 gzip (below), most of it the card's script, which ships with its
  comments, as the page's other scripts do.

**What did not change, shown**

- `npm run content` for 2026-10-25, production and `--env dev`: byte-identical to `76ee36e`'s, files, report and
  message (EM5c).
- Every built file but the pages byte-identical (`diff -rq`, both builds of `76ee36e` and `9a19f48`, each from its own
  tree): fonts, logo, photo sheets, QR codes, `why/index.html`.
- U4's six contents and the visible page at its seven fragments; WC-9's 20; WC-8's no-picks page (its constant not
  moved); the Worker and the Footer block (CC-8's golden not moved); `npm run contrast` 70 of 70, no new pair.

**The goldens, re-recorded once (this commit)**

| golden | moved |
|---|---|
| S20 `test/s20-production-golden.json` | `index.html` alone, `f1f0e04f…` → `031e8401…` (`9a19f48`'s production build from its own tree); every other file byte-identical |
| U4 `test/u-04-golden.json` (`node test/u-04-record.mjs --commit 9a19f48`) | the six served pages, each +8,768 bytes; all six contents and every visible fragment byte-identical. `u-04-normal-week.test.mjs` names `9a19f48` |
| WC-9 `test/wc-09-golden.json` | not moved (above) |
| WC-8's `TODAY_NO_PICKS_SHA256` | not moved |
| CC-8 `test/cc-08-unchanged-golden.json` | not moved |

**Every changed line.** Production's `index.html` (no week, as every build writes it): 14 lines removed and 168 added in
19 places; each development page (`/`, `demo/`, `boston/`, `seminar/`) by the same lines at other line numbers (compared
line for line); each served page (U4) by the same lines. Sizes, raw / gzip (`test/page-budget.mjs`): production 42,074 /
12,424 → 50,842 / 14,852; development `/` 65,706 / 19,319 → 74,474 / 21,762 (`seminar/` 65,709 / 19,321 → 74,477 /
21,763), under SPEC.md § 1's 61,440 gzip. (`diff`'s own output, `76ee36e`'s page against `9a19f48`'s.)

```text
213a214,234
> /* Every picked menu (SPEC-every-menu-and-nutrition § 2): above the list, a native radio group, each radio a chip; the
>    chosen one navy, as the selected tab; the radio itself kept for the keyboard and assistive technology, not drawn */
> .cc-menus { display: flex; flex-wrap: wrap; gap: 8px; min-width: 0; margin: 0 0 14px; padding: 0; border: 0; }
> .cc-menus[hidden] { display: none; }
> .cc-menu { position: relative; }
> .cc-menu input { position: absolute; top: 0; left: 0; width: 1px; height: 1px; margin: 0; opacity: 0; }
> .cc-menu span { display: block; min-height: 40px; padding: 9px 14px; border: 1px solid var(--line); border-radius: 20px; background: var(--white); color: var(--navy); font: 600 15px/1.3 var(--head); cursor: pointer; }
> .cc-menu span:hover { border-color: var(--field); }
> .cc-menu input:checked + span { border-color: var(--navy); background: var(--navy); color: var(--white); }
> .cc-menu input:focus-visible + span { outline: 3px solid var(--navy); outline-offset: 3px; }
> /* Each meal's nutrition (§ 3): its line for the chosen size under its name; with ingredients the meal is a button, + when
>    closed and − when open, opening them beneath it. A meal with neither keeps the row it always had */
> .cc-meals li.cc-detail { align-items: flex-start; }
> .cc-text { flex: 1; min-width: 0; }
> .cc-meal { display: block; width: 100%; padding: 0; border: 0; background: none; color: inherit; font: inherit; text-align: left; }
> button.cc-meal { cursor: pointer; }
> button.cc-meal .cc-name::after { content: "+"; margin-left: 8px; color: var(--navy); font-weight: 700; }
> button.cc-meal[aria-expanded="true"] .cc-name::after { content: "\2212"; }
> .cc-line { display: block; margin-top: 2px; color: var(--muted); font-size: 14px; }
> .cc-more { margin: 6px 0 2px; color: var(--ink); font-size: 14px; }
> .cc-more p { margin: 0 0 4px; }
299a321
>             <fieldset class="cc-menus" id="cc-menus" hidden></fieldset>
607a630,634
> // SPEC-every-menu-and-nutrition § 2: a week of more than one list (`menus`) offers, above the list, a radio group of the
> // menus with a cart for the answers (#cc-menus), Chef's Choice first; the chosen menu's cart, snacks and links are the
> // card's, by the same reading as Chef's Choice's. § 3: a meal with nutrition (`facts`) shows its line for the chosen size
> // (#result's data-accent, the plan app.js rendered) and, with ingredients, is a button opening them beneath it. What the
> // Worker's shape check does not read (`menus`, `facts`) is read here only in the shape the content writes.
620a648
>   var group = $("cc-menus"); // SPEC-every-menu-and-nutrition § 2: the chooser
621a650,652
>   var isList = Array.isArray;
>   var isMap = function (v) { return v !== null && typeof v === "object" && !isList(v); };
>   var isText = function (v) { return typeof v === "string"; };
622a654,678
>   // § 2: the week's menus in the words' order, Chef's Choice first (its carts and snacks the week's own); a week of one
>   // list carries none, and the card is as it was. Read only in the shape the content writes (each other menu's carts and
>   // snacks as the Worker checks the week's: lines, tiles and links), else as one list.
>   var isLines = function (v) { return isMap(v) && isList(v.meals) && isList(v.thumbs); };
>   var isCart = function (c) { return isLines(c) && isMap(c.links) && (c.snack_links === undefined || isMap(c.snack_links)); };
>   var each = function (o, ok) { return isMap(o) && Object.keys(o).every(function (k) { return ok(o[k]); }); };
>   var menus = (function (m) {
>     if (!isList(m) || 2 > m.length) return [];
>     for (var i = 0; m.length > i; i++) {
>       if (!isMap(m[i]) || !isText(m[i].list) || !isText(m[i].name)) return [];
>       if (i && (!each(m[i].carts, isCart) || (m[i].snacks !== undefined && !each(m[i].snacks, isLines)))) return [];
>     }
>     return m;
>   })(week.menus);
>   var picked = menus.length ? menus[0].list : null; // the menu chosen: Chef's Choice first (§ 2 item 2)
>   var cartsOf = function (menu) { return menu && menu.carts ? menu.carts : week.carts; };
>   var snacksOf = function (menu) { return menu && menu.carts ? menu.snacks : week.snacks; };
>   function menuNamed(id) {
>     for (var i = 0; menus.length > i; i++) if (menus[i].list === id) return menus[i];
>     return null;
>   }
>   // § 3: the week's nutrition entries; a cart's `facts` names each meal's entry, or null.
>   var entries = isList(week.facts) ? week.facts : [];
>   var opened = {}; // the meals left open, by menu, answers and place: kept while only the size changes
> 
628,630c684,686
<   // The chosen answers' cart (the selection without its snacks mark), and in it the chosen size's link (by its mpid):
<   // with snacks chosen and carted, the cart's snack link (SPEC-snacks-in-the-cart § 4.2), else today's.
<   function chosen(sel) {
---
>   // The chosen answers' cart in `menu` (the selection without its snacks mark), and in it the chosen size's link (by its
>   // mpid): with snacks chosen and carted, the cart's snack link (SPEC-snacks-in-the-cart § 4.2), else today's.
>   function chosen(sel, menu) {
632c688,689
<     var cart = has(week.carts, key) ? week.carts[key] : null;
---
>     var carts = cartsOf(menu);
>     var cart = has(carts, key) ? carts[key] : null;
635a693,743
>   }
> 
>   // § 3 item 3: a meal's line for the chosen size only, never another size's numbers.
>   function lineFor(lines, size) {
>     return lines && has(lines, size) && typeof lines[size] === "string" ? lines[size] : null;
>   }
> 
>   // A meal with its entry: the name and the size's line, as a button opening the panel beneath it (aria-expanded,
>   // aria-controls) when the entry has ingredients; a second press closes it, each meal on its own (§ 3 item 2).
>   function detail(li, name, entry, place) {
>     var line = lineFor(isMap(entry.lines) ? entry.lines : null, result.getAttribute("data-accent"));
>     var more = isText(entry.ingredients) ? entry.ingredients : null;
>     if (!line && !more) return li.appendChild(name);
>     li.className = "cc-detail";
>     var text = document.createElement("div");
>     text.className = "cc-text";
>     var meal = document.createElement(more ? "button" : "span");
>     meal.className = "cc-meal";
>     meal.appendChild(name);
>     if (line) {
>       var numbers = document.createElement("span");
>       numbers.className = "cc-line";
>       numbers.textContent = line;
>       meal.appendChild(numbers);
>     }
>     text.appendChild(meal);
>     li.appendChild(text);
>     if (!more) return;
>     var panel = document.createElement("div");
>     panel.className = "cc-more";
>     panel.id = "cc-more-" + place.split("|").pop();
>     var ingredients = document.createElement("p");
>     ingredients.textContent = more;
>     panel.appendChild(ingredients);
>     if (isText(entry.contains)) {
>       var contains = document.createElement("p");
>       contains.textContent = entry.contains;
>       panel.appendChild(contains);
>     }
>     text.appendChild(panel);
>     meal.type = "button";
>     meal.setAttribute("aria-controls", panel.id);
>     var show = function (open) {
>       meal.setAttribute("aria-expanded", String(open));
>       panel.hidden = !open;
>     };
>     show(!!opened[place]);
>     meal.addEventListener("click", function () {
>       opened[place] = meal.getAttribute("aria-expanded") !== "true";
>       show(opened[place]);
>     });
639,640c747,749
<   // from the manifest), or plain, so the rows align (SPEC-plan-page-refinement § 2 item 5).
<   function fill(ul, lines, thumbs) {
---
>   // from the manifest), or plain, so the rows align (SPEC-plan-page-refinement § 2 item 5). `facts` (a cart's, § 3)
>   // gives a meal its nutrition; `id` names the list for the meals left open.
>   function fill(ul, lines, thumbs, facts, id) {
651c760,762
<       li.appendChild(name);
---
>       var at = isList(facts) && typeof facts[j] === "number" ? entries[facts[j]] : null;
>       if (isMap(at)) detail(li, name, at, id + "|" + j);
>       else li.appendChild(name);
656,657c767,768
<   // Add snacks (§ 9 item 3): the week's snacks for the chosen days under their heading, and the not-carted line; with no
<   // list for those days, the line alone. While not carted, snacks are shown, never in a link. While carted
---
>   // Add snacks (§ 9 item 3): the chosen menu's snacks for the chosen days under their heading, and the not-carted line;
>   // with no list for those days, the line alone. While not carted, snacks are shown, never in a link. While carted
660c771
<   function renderSnacks(sel) {
---
>   function renderSnacks(sel, menu) {
663c774,775
<     var snacks = days && week.snacks && has(week.snacks, days[1]) ? week.snacks[days[1]] : null;
---
>     var all = snacksOf(menu);
>     var snacks = days && isMap(all) && has(all, days[1]) ? all[days[1]] : null;
671a784,819
>   // § 2 item 1: the radios of the menus offered, in their order, the chosen one checked; shown when there are two or
>   // more. Rebuilt only when the menus offered change, so a radio keeps the focus the arrow keys gave it. A week of one
>   // list never touches the group (item 4: the card as it was).
>   var offeredShown = "", radios = [];
>   function renderMenus(offered) {
>     if (!group || !menus.length) return;
>     group.hidden = 2 > offered.length;
>     var ids = offered.map(function (m) { return m.list; }).join("\n");
>     if (ids !== offeredShown) {
>       offeredShown = ids;
>       while (group.firstChild) group.removeChild(group.firstChild);
>       radios = group.hidden ? [] : offered.map(function (m) {
>         var label = document.createElement("label");
>         label.className = "cc-menu";
>         var radio = document.createElement("input");
>         radio.type = "radio";
>         radio.name = "cc-menu";
>         radio.value = m.list;
>         var name = document.createElement("span");
>         name.textContent = m.name;
>         label.appendChild(radio);
>         label.appendChild(name);
>         group.appendChild(label);
>         return radio;
>       });
>     }
>     radios.forEach(function (radio) { radio.checked = radio.value === picked; });
>   }
>   if (group && menus.length) {
>     group.addEventListener("change", function (e) {
>       if (!e.target || e.target.name !== "cc-menu") return;
>       picked = e.target.value;
>       render();
>     });
>   }
> 
672a821
>   // § 2 item 3: an answer change keeps the chosen menu when it has a cart for the new answers, else Chef's Choice.
675c824,828
<     var c = sel ? chosen(sel) : null;
---
>     var key = sel.replace(/-s$/, "");
>     var offered = menus.filter(function (m) { return sel && has(cartsOf(m), key); });
>     if (sel && menus.length && !offered.some(function (m) { return m.list === picked; })) picked = menus[0].list;
>     var menu = menuNamed(picked);
>     var c = sel ? chosen(sel, menu) : null;
678c831,832
<     renderSnacks(sel);
---
>     renderMenus(c ? offered : []);
>     renderSnacks(sel, menu);
681c835
<     fill($("cc-meals"), c.menu.meals, c.menu.thumbs);
---
>     fill($("cc-meals"), c.menu.meals, c.menu.thumbs, c.menu.facts, picked + "|" + key);
```

**§ 1 item 2, amended (`1fb2b19`, the orchestrator, 2026-10-21), built.** Item 5 above read `ingredients` (and `nutrition`)
as required; Fit AF's emitter writes only what a meal's label row gives, so that check would have refused its files and
stopped the switch's content step. Now `mealEntries` takes each of `nutrition` and `ingredients` as optional and refuses
an entry that carries neither (*"carries neither nutrition nor ingredients"*, a `nutrition` holding no size counting as
none) and `contains` without `ingredients` (*"contains without ingredients"*); `"meals": {}` is accepted and makes the
content of the same week without `meals` (no `facts`); `facts`' entries carry `lines`, `ingredients` and `contains`
only when the meal has them. The fixture week gains a meal of ingredients alone (*Turkey Chili Verde*, Chef's Choice) and
one of numbers alone (*Cumin Lamb Rice Bowl*, `fixture-two`). Cases first (`780447c`), red on `1fb2b19`'s code: EM1 10 of
23 failing (four acceptances; three new refusals refused for another reason, *"missing field …"*; the fixture's own content
and the two key cases behind it; `"meals": {}` accepted but carrying `"facts": []`), EM4, EM5 and the mutants' file 6 of 12,
the Chrome file 4 of 5 (the fixture refused). After the fix: EM1 23 of 23, EM4 + EM5 + the mutants 12 of 12, the Chrome
file 5 of 5. **EM3 needed no change to the card**: its script already shows a line only for the chosen size's numbers and
makes a meal a control only with ingredients; EM3 now reads both shapes (a control with no line, a line with no control).
The page's bytes do not move (S20's golden stands); a week without `meals` is as before (EM5c).

**The approved menu names, built** (the Advisor's ruling of 2026-10-21, Fit AF decision 2026-10-17 § 7q item 6, through
the orchestrator: the four names approved for this public repository; the chooser's own name *"Menu"*; the heading to
carry `{menu}`). Cases first (`68d4ca1`), then the code (`f2d1748`), then the goldens with this note.

- **The words**: `menus` gains, after `chefs-choice` and in this order, `poultry-and-fish` *"Poultry & Fish"*,
  `gluten-free` *"Gluten Free"*, `comfort-classics` *"Comfort Classics"*, `global-explorers` *"Global Explorers"*;
  `chefs_choice.heading` is `"{menu} ({week})"`; `chefs_choice.menus_label` is *"Menu"*, required by the build and written
  as the chooser fieldset's `aria-label` (`card.html`'s `{{MENUS_LABEL}}`). Every group's `status` stays `"placeholder"`.
  The fixture's words no longer override the heading; they add only the invented list's name.
- **A one-list week's heading reads exactly as before**: Chef's Choice's name fills `{menu}`, so 2026-10-25's reads
  *"Chef's Choice (October 26 – November 1)"* and the fixture week's *"Chef's Choice (October 5–11)"* (PR-17). The content
  of every committed week and fixture is byte for byte what it was (EM5c, W4, U4's six contents).
- **The cases**: EM4a holds the five names in order, *"Menu"* and a heading carrying `{menu}` and `{week}`; EM4c finds the
  marked group name as the chooser's `aria-label` (names of lists the week does not carry need not be shown); EM1 makes a
  week naming `gluten-free` with `data/messages.json` as committed, its menus `[["chefs-choice", "Chef's Choice"],
  ["gluten-free", "Gluten Free"]]`; EM2 (Chrome) reads the group's role and name in the accessibility tree (`group`,
  *"Menu"*). Cases that read the phrase follow it: PR-17's phrase, cc-harness's `headingFor` (fills `{menu}`), EM1's
  no-`{menu}` words, Storybook's SM-4 control (the footnote's piece, as the heading now begins with a placeholder).
- **Red on `7c08183`'s code**: the site's EM files with PR-17, CC-1, CC-3 and SM-4, 28 of 50 failing (every two-list
  content refused for the heading's missing `{menu}`; `gluten-free` *"is not a list the page shows"*; no approved names,
  no `menus_label`; PR-17's phrase); the Chrome file 4 of 5. **Green on `f2d1748`**: 96 of 99 with CC-1 to CC-9, then 63 of
  63 for EM1, the mutants and MS-6 once two pinned refusals were loosened (EM1's list case and MS-6's read *"(chefs-choice)"*;
  the refusal now names every list the words name); MS, U, WC, W1, W4, S18, T2, T5, P2, PR, A1 and the budget 211 of 213
  (S20 and U4, re-recorded here); Chrome 5 of 5, SM-6 6 of 6; after the goldens, S20, CC-4, U4, WC-8, WC-9, CC-8, EM5 and W4
  23 of 23.
- **The page's one changed line** (`diff`, `9a19f48`'s production page against `f2d1748`'s, each from its own tree; each
  development page by the same line):

  ```text
  321c321
  <             <fieldset class="cc-menus" id="cc-menus" hidden></fieldset>
  ---
  >             <fieldset class="cc-menus" id="cc-menus" aria-label="Menu" hidden></fieldset>
  ```

- **Goldens**: S20's `index.html` `031e8401…` → `5bd5d4e1…`, every other file byte-identical; U4 by its recorder
  (`--commit f2d1748`): the six served pages, each +18 bytes, all six contents and every visible fragment byte-identical;
  WC-9's recorder (`--visible-at f2d1748`) wrote every key as committed but `visible_at`, so not re-recorded; WC-8 and
  CC-8 not moved. Sizes, raw / gzip: production 50,842 / 14,852 → 50,860 / 14,858; development `/` 74,474 / 21,762 →
  74,492 / 21,769 (`seminar/` 74,495 / 21,770).


## 10. Amendment, 2026-10-21: every meal a surface sized for a fingertip, and its mark. CONTRACT, before any code

**Why.** The Advisor (Fit AF's decision record `2026-10-17-…` § 7q item 7): *"every meal is going to have the ability to get more info. This also goes to our design guidelines about tappable surfaces and the size of adult human fingertips"*, and *"we're going to allow customers to pick a menu as a start and then swap meals as much as they'd like – or start from a completely empty bag"*. The guideline is OurFans' (`ourfans:docs/arch/design-philosophy.md`, *"Real-world device ergonomics"*; its constants: a standard target **10 mm**, a primary **14 mm**, at a device's logical density of 153–163 CSS px per inch); this repository had none.

1. **Every target this card adds meets the standard target**: 10 mm in its smaller dimension at the densest logical density OurFans uses, so **at least 64 CSS px** (one named constant, its source in a comment). The menu chips; and **the meal's whole row** (its tile, its name and its line together) is the disclosure control, not a mark beside the name.
2. **The mark says "more", not "add"**: the + and − become a chevron that turns when the meal is open (drawn here, `currentColor`, `aria-hidden`), because + will mean *add a meal* in the picker to come. `aria-expanded` and `aria-controls` stay as built.
3. **Not here**: the page's other controls (the answers, *Continue to checkout*, *Choose my own meals*, *See all plans*): a site-wide rule is its own contract.
4. **Cases**: EM6 (Chrome, at 390 and 1280): every chip's and every meal control's bounding box at least 64 CSS px in its smaller dimension; a press anywhere on a meal's row (the tile, the name, the line) opens it; the mark is not the text "+". Mutant: the row's control shrunk to the name alone (EM6 red). The renders (`dist-dev/renders/`) re-made at 390 and 1280, opened and described.

### 10.1 Built (found at the build, not ruled)

Built in three commits after § 10's (`31783b9`): `93a2a71` (EM6, red), `f72040a` (items 1–2), and this section's (the
goldens, re-recorded once, the renders and § 10.1). **To be re-gated by the orchestrator** (single files only, as § 9).
§ 10 is unchanged.

| case | file | before (`93a2a71`) | after (`f72040a` and this commit) |
|---|---|---|---|
| EM6 (Chrome, 390 and 1280, each menu in turn): every chip and meal control at least 64 CSS px in its smaller dimension; a press on the first meal control's tile, name and line each opens it and its mark turns; no "+" or "−" as text or CSS content, a mark hidden from assistive technology; its mutant and control | `tools/storybook/test/em-chrome.test.mjs` | 0 of 2 (the chips 134 × 40 and 115.7 × 40 at 390; *Turkey Chili Verde*'s and *Basil Tofu Noodles*' controls 218 × 24.8, the name alone; every mark the CSS content "+", none hidden) | 2 of 2; the file 7 of 7 with EM2, EM3 and their mutants |

**The mutant**: the row's control shrunk to the name alone (a copy of the built page, the script's one line
`appendAll(meal, [tile, text, mark]);` putting the tile and the name's column back in the row and only the name and the
mark in the button): EM6 red, *"a press on its .cc-thumb did not open the meal"* and *".cc-line"*, at 390 and 1280; the
copy as built passes EM6 whole.

**Where § 10 was silent, and what was done**

1. **The constant** is a CSS custom property, `--touch-target: 64px`, declared once on `.cc-list` (the card's box, which
   holds every target § 10 names), its source in the comment above it: OurFans' *"Real-world device ergonomics"*, 10 mm
   at 163 CSS px per inch, 64.2. EM6 holds the contract's number on its own (`TARGET_PX`).
2. **The chips**: 64 px tall and at least as wide, their text centred, pill-shaped (`border-radius: 32px`); colours as
   built; EM6 measures each at both widths.
3. **The row**: a meal with ingredients is one `button` (`.cc-meal`, `display: flex`, the row's full width,
   `min-height: var(--touch-target)`) holding its tile, its name and line (one column, `.cc-text`) and its mark; the
   panel follows the button inside the `li`, indented to the name's column (68 px). A meal with numbers alone keeps a
   row beside its tile (no control, no mark: § 3 item 3); a meal without an entry, the row it always had.
4. **The mark** is a `span` (`.cc-mark`, `aria-hidden="true"`) the style draws as a chevron, two borders in
   `currentColor` (navy) turned 45°, pointing down; open, it turns to point up (`rotate(-135deg)`), in 0.15 s, which the
   page's reduced-motion rule already stops. No SVG and no glyph: nothing for a screen reader or a copy to read.
5. **EM6's mutant fails on the press, not the size**: the shrunk button keeps its style's 64 px (its `min-height` and the
   row's width), so it is the tile and the line, no longer inside the control, that open nothing. EM6 reads the mark's
   turn once its animation has finished (it first read the transition's first frame, equal to the closed state).
6. **§ 10 item 3 kept**: the answers, *Continue to checkout*, *Choose my own meals* and *See all plans* are unchanged.

**What did not change, shown**: every built file but the pages byte-identical (`diff -rq`, `f2d1748`'s and `f72040a`'s
builds, each from its own tree); U4's six contents and every visible fragment; WC-9's 20 visible pages (its recorder,
`--visible-at f72040a`, changed only `visible_at`: not re-recorded); WC-8 and CC-8; EM5c (2026-10-25's content);
`npm run contrast` 70 of 70 (navy on white and white on navy only, pairs already measured).

**The goldens, re-recorded once (this commit)**: S20's `index.html` `5bd5d4e1…` → `c0fde5fc…`, every other file
byte-identical; U4 by its recorder (`--commit f72040a`): the six served pages, each +1,407 bytes, all six contents and
every visible fragment byte-identical; WC-9, WC-8 and CC-8 not moved. Green after: S20, CC-4, U4, WC-8, WC-9, CC-8, EM5,
W4 23 of 23; the site's EM, CC, MS, U, WC, W1, W4, S18, T2, T5, PR, A1 and the budget 294 of 297 before the re-record (the
three golden cases).

**The renders** (`dist-dev/renders/`, never committed; the production build with the two-menu fixture week, every image
request refused, each cropped to the result card), re-made at `f72040a` at 390 and 1280: (1) Chef's Choice selected, the
chips 64 px tall, three meals with a chevron (two with their lines, *Turkey Chili Verde* with ingredients alone, no
line), two plain rows; (2) Fixture Two selected, three chevron rows and *Cumin Lamb with Rice × 2*'s line with no chevron
(numbers alone); (3) *Smoked Paprika Chicken Bowl × 2* opened, its chevron pointing up, *"Ingredients: Chicken breast,
brown rice, black beans, smoked paprika, lime, cilantro"* and *"Contains: Milk"* beneath it in the name's column.

**Every changed line.** Production's `index.html`: 31 lines removed and 48 added in 13 places; each development page
(`/`, `demo/`, `boston/`, `seminar/`) by the same lines (compared line for line); each served page (U4) by the same
lines. Sizes, raw / gzip (`test/page-budget.mjs`): production 50,860 / 14,858 → 52,267 / 15,368; development `/` 74,492 /
21,769 → 75,899 / 22,312 (`seminar/` 75,902 / 22,313), under SPEC.md § 1's 61,440 gzip. (`diff`'s own output, `f2d1748`'s
page against `f72040a`'s.)

```text
214,215c214,219
< /* Every picked menu (SPEC-every-menu-and-nutrition § 2): above the list, a native radio group, each radio a chip; the
<    chosen one navy, as the selected tab; the radio itself kept for the keyboard and assistive technology, not drawn */
---
> /* SPEC-every-menu-and-nutrition § 10 (the Advisor, 2026-10-21): every target this card adds is at least the standard
>    target of OurFans' design philosophy (docs/arch/design-philosophy.md, "Real-world device ergonomics": 10 mm), at the
>    densest logical density it uses (163 CSS px per inch: 10 mm is 64.2 CSS px), in its smaller dimension */
> .cc-list { --touch-target: 64px; }
> /* Every picked menu (§ 2): above the list, a native radio group, each radio a chip; the chosen one navy, as the selected
>    tab; the radio itself kept for the keyboard and assistive technology, not drawn */
220c224
< .cc-menu span { display: block; min-height: 40px; padding: 9px 14px; border: 1px solid var(--line); border-radius: 20px; background: var(--white); color: var(--navy); font: 600 15px/1.3 var(--head); cursor: pointer; }
---
> .cc-menu span { display: flex; align-items: center; justify-content: center; min-width: var(--touch-target); min-height: var(--touch-target); padding: 0 20px; border: 1px solid var(--line); border-radius: 32px; background: var(--white); color: var(--navy); font: 600 15px/1.3 var(--head); cursor: pointer; }
224,231c228,237
< /* Each meal's nutrition (§ 3): its line for the chosen size under its name; with ingredients the meal is a button, + when
<    closed and − when open, opening them beneath it. A meal with neither keeps the row it always had */
< .cc-meals li.cc-detail { align-items: flex-start; }
< .cc-text { flex: 1; min-width: 0; }
< .cc-meal { display: block; width: 100%; padding: 0; border: 0; background: none; color: inherit; font: inherit; text-align: left; }
< button.cc-meal { cursor: pointer; }
< button.cc-meal .cc-name::after { content: "+"; margin-left: 8px; color: var(--navy); font-weight: 700; }
< button.cc-meal[aria-expanded="true"] .cc-name::after { content: "\2212"; }
---
> /* Each meal's nutrition (§ 3): its line for the chosen size under its name. With ingredients the meal's whole row (its
>    tile, its name and its line) is the button (§ 10 item 1), at least the touch target tall, its mark a chevron that
>    turns when the meal is open (§ 10 item 2: "more", never the + of adding a meal), the ingredients beneath it. A meal
>    with neither keeps the row it always had */
> .cc-text { display: block; flex: 1; min-width: 0; }
> .cc-text .cc-name { display: block; }
> .cc-meals li.cc-control { display: block; }
> .cc-meal { display: flex; align-items: center; gap: 12px; width: 100%; min-height: var(--touch-target); padding: 0; border: 0; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
> .cc-mark { flex: none; width: 10px; height: 10px; margin: 0 8px 4px 4px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; color: var(--navy); transform: rotate(45deg); transition: transform .15s ease-out; }
> button.cc-meal[aria-expanded="true"] .cc-mark { transform: translateY(4px) rotate(-135deg); }
233c239
< .cc-more { margin: 6px 0 2px; color: var(--ink); font-size: 14px; }
---
> .cc-more { margin: 4px 0 2px 68px; color: var(--ink); font-size: 14px; }
633c639,640
< // (#result's data-accent, the plan app.js rendered) and, with ingredients, is a button opening them beneath it. What the
---
> // (#result's data-accent, the plan app.js rendered) and, with ingredients, its whole row is a button opening them beneath
> // it, its mark a chevron (§ 10). What the
700,702c707,714
<   // A meal with its entry: the name and the size's line, as a button opening the panel beneath it (aria-expanded,
<   // aria-controls) when the entry has ingredients; a second press closes it, each meal on its own (§ 3 item 2).
<   function detail(li, name, entry, place) {
---
>   // A meal with its entry (§ 3): its name and the size's line in one column beside its tile; with ingredients, § 10 item 1:
>   // the WHOLE ROW (tile, name, line) is the button opening the panel beneath it (aria-expanded, aria-controls), a second
>   // press closing it, each meal on its own; its mark (§ 10 item 2) a chevron the style draws, hidden from assistive
>   // technology, turning when the meal is open.
>   function appendAll(parent, children) {
>     children.forEach(function (child) { parent.appendChild(child); });
>   }
>   function detail(li, tile, name, entry, place) {
705,707c717,718
<     if (!line && !more) return li.appendChild(name);
<     li.className = "cc-detail";
<     var text = document.createElement("div");
---
>     if (!line && !more) return appendAll(li, [tile, name]);
>     var text = document.createElement("span");
709,711c720
<     var meal = document.createElement(more ? "button" : "span");
<     meal.className = "cc-meal";
<     meal.appendChild(name);
---
>     text.appendChild(name);
716c725
<       meal.appendChild(numbers);
---
>       text.appendChild(numbers);
718,720c727,739
<     text.appendChild(meal);
<     li.appendChild(text);
<     if (!more) return;
---
>     if (!more) {
>       li.className = "cc-detail";
>       return appendAll(li, [tile, text]);
>     }
>     li.className = "cc-control";
>     var meal = document.createElement("button");
>     meal.type = "button";
>     meal.className = "cc-meal";
>     var mark = document.createElement("span");
>     mark.className = "cc-mark";
>     mark.setAttribute("aria-hidden", "true");
>     appendAll(meal, [tile, text, mark]);
>     li.appendChild(meal);
732,733c751
<     text.appendChild(panel);
<     meal.type = "button";
---
>     li.appendChild(panel);
759d776
<       li.appendChild(tile);
761,762c778,779
<       if (isMap(at)) detail(li, name, at, id + "|" + j);
<       else li.appendChild(name);
---
>       if (isMap(at)) detail(li, tile, name, at, id + "|" + j);
>       else appendAll(li, [tile, name]);
```


## Integration (2026-10-21)

**Where.** Branch `boston/live-week-every-menu`, from `f4b04e7` (`boston/why-button`, what production served), so the
merged site can be released. Three merges, each `--no-ff`, in this order, then two commits of tests and goldens:

| commit | what |
|---|---|
| `768ca36` | merge of `boston/every-menu` at `78ede74` (this contract, §§ 1–10.1) |
| `0a0ea16` | merge of `boston/save-offer-production` at `9744c69` (SPEC-save-offer-production §§ 1–9.2; `data/save.json`'s `production` stays `false`, unchanged) |
| `596d116` | merge of `boston/analytics-json` at `9c40305` (SPEC-analytics § 11, `npm run analytics -- --json`) |
| `5dfe2c7` | SP3's base at the merge (below) |
| `c293a9a` | the goldens re-recorded once, from `596d116` |

**Conflicts, and how each was resolved.** No conflict was in code (`src/`, `scripts/`, `build.mjs`, the Worker): no code
file was changed by both sides of any merge.

- `README.md` (all three merges): the union. At `768ca36`, the test table's row gained every-menu's U4 note after
  why-button's (`e2284f1`, then `9a19f48`) and EM1, EM4 and EM5 after W1 and W4. At `0a0ea16`, SP1–SP10 inside S1–S31's
  entry and save-offer-production's U4 note (`1305f62`) after every-menu's. At `596d116`, analytics-json's
  `scripts/analytics.mjs` row (`--json`) and AJ1–AJ4 after A1–A11, its SPEC-analytics row beside this contract's row.
  Each resolved line was checked to be exactly the base plus both sides' insertions.
- `tools/storybook/README.md` (`768ca36`): the union; the `test/` row keeps why-button's § 6 words and gains EM2 and EM3.
- `test/u-04-normal-week.test.mjs` (`768ca36`, `0a0ea16`): the union of the comments, each branch's RE-RECORDED notes
  kept whole and in merge order (why-button's `e2284f1`; this contract's `9a19f48`, `f2d1748`, `f72040a`;
  save-offer-production's `1305f62`, `e11f775`); its pin stayed why-button's until the re-record, which names `596d116`.
- `test/s20-production-golden.json` and `test/u-04-golden.json` (`768ca36`, `0a0ea16`): never hand-merged; resolved to
  why-button's side at each merge and re-recorded once after all three (below).
- Auto-merged and checked against both sides: `data/README.md` and `test/cc-harness.mjs` (this contract's `headingFor`
  and save-offer-production's `consent/` in the mirror, both kept), `tools/storybook/microsite/layout.js` (`ROOT_STATIC`
  with `why`, and the `menus` date).

**A test made stale by the merge, not by a conflict: SP3** (`5dfe2c7`). SP3 (S20) and SP3 (T5) held the production page to
`63275a8`'s page with SPEC-save-offer-production § 9 item 2's reading alone; the merged page also carries why-button's
and this contract's lines, so both failed. `test/sp-production.mjs` `BASE` (read by SP3 alone) is now `768ca36`, the
merged tree before save-offer-production, so SP3 still says that branch changes the production page by § 9's reading
and nothing else. `63275a8` is `84807ce` plus that contract's text, and `768ca36` differs from it outside the tests only
in files neither Worker reaches, so SP3's Worker and CC-8b cases compare with the same files. A test-only change.

**The goldens, re-recorded once, from `596d116`** (`c293a9a`; its message carries the proof)

| golden | before → after | shown |
|---|---|---|
| S20 `test/s20-production-golden.json` (every file of `596d116`'s production build, hashed over its own tree) | `index.html` `c5a35d44…` (why-button's) → `37fe139c…`, 42,590 → 52,846 bytes, 15,560 gzip | only `index.html` differs from each branch's golden (why-button `c5a35d44`, this contract `c0fde5fc`, save-offer-production `6093af72`); the other 17 files, `why/index.html` among them, byte-identical; no `privacy/`. `git merge-file` of this contract's and then save-offer-production's page into why-button's, each over `84807ce`'s, gives `596d116`'s byte for byte; against `84807ce`'s page +7, +186 −15 and +7 −3 lines, +200 −18 in all |
| U4 `test/u-04-golden.json` (`node test/u-04-record.mjs --commit 596d116`) | `recorded_at` `e2284f1` → `596d116`; pages: v1 fixture prod `6725cbd4…` → `49e3cac4…`, dev `b5056032…` → `52ec8037…`; v2 fixture prod `e3e40f6f…` → `b6b5dc40…`, dev `ac582b7b…` → `bfc0eeab…`; the committed week prod `263482a1…` → `e90a3122…`, dev `286f1e51…` → `e39ad3f8…` | all six contents byte-identical to every branch's record; all 42 visible entries equal to save-offer-production's record (its six answered development fragments the only visible change of the three branches); each served page the `git merge-file` union, byte for byte (production +10,772 bytes, development +11,714 against `f02807e`'s record); analytics-json's pages why-button's |
| WC-9 `test/wc-09-golden.json` | not re-recorded | its recorder (`--visible-at 596d116`) changed `visible_at` alone; green as committed (`e2284f1`) |
| WC-8's `TODAY_NO_PICKS_SHA256` | not moved | its control green on the merged tree (`21abbe56…`) |
| CC-8b `test/cc-08-unchanged-golden.json` | not moved | save-offer-production's map, green |

Sizes, raw / gzip (`test/page-budget.mjs`): production 52,846 / 15,560; development `/` 77,420 / 22,822 (`seminar/`
77,423 / 22,823), under SPEC.md § 1's 61,440 gzip.

**Gated by the integration's own run, on `c293a9a`** (each at `nice -n 15`; the orchestrator re-runs every gate)

| gate | result |
|---|---|
| `npm --prefix boston-2026-10 test` (once, 20:35–20:38 PDT) | **978 of 979**. The one failure is **S22** (*"the page has no element #save-offer-label"*), the known failure of production's own tree (§ 6.2 of SPEC-why-fit-af shows it on `6e0f6bd`) |
| `npm --prefix boston-2026-10 run build` | exit 0; `dist/index.html` is S20's `37fe139c…` |
| `npm --prefix boston-2026-10 run build:dev` | exit 0 |
| `npm ci` in the package, `tools/storybook` and `tools/storefront-watch` | each exit 0, from the lockfiles (no branch changes a lockfile) |

Not run here, as asked: Storybook's suite, the contrast suite and the storefront watch.
