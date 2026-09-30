# boston-2026-10 — this week's Chef's Choice on the plan page, and "Choose my own meals". CONTRACT

**Written 2026-09-30, before any code. Status: RULED** by the Advisor the same day: *"One of the refinements we'll do
with the microsite (and deep carting) is show what people are actually getting this week. So something like "see this
week's Chef Choice menu" that opens up the list of items (in the microsite) that will be deep carted if the prospective
customer continues with the checkout process."* And, in his words summarised: a *"choose my own meals"* option that,
for now, takes the visitor to the store's own catalogue and checkout. **Who reads it**: whoever builds it, and whoever writes the week's picks.

It builds what `SPEC-rung2-cart-handoff.md` § 0 planned as rung 2's input (*"the week's picks (Chef's Choice) …
`data/picks/<sunday-date>.json` — meal names and counts per plan … a person, weekly, from the Owner's picks"*) and
Flow 2 § 7's *"Rung 2 … adds a pre-filled cart"*. The store's side is live (the Footer block, fill B); this contract
adds only links to it.

⛔ **Unchanged**: the store's Footer block and everything under `src/storefront/`, the Worker, the save-offer flow, the
Family tab, the grid. **Without a picks file for the week, the page is exactly today's** (rung 1: *Choose your meals* →
the plan's order page).

## 1. The input: `data/picks/<sunday-date>.json`

One file per delivery week, named by its Sunday (`2026-10-04.json`), written from the KMS's Chef's Choice sitting (a
person's picks, made outside this repository). **Public fields only**:

```json
{ "delivery": "2026-10-04",
  "menus": { "7":  [ { "name": "Italian Chicken Trio", "qty": 1 }, … ],
             "14": [ { "name": "🟠NEW: Blackened Chicken Caesar Salad", "qty": 2 }, … ] } }
```

- `name` is the meal's name **exactly as the store's card shows it** (a `🟠NEW:` tag included): the key is taken over
  it (`src/storefront/meal-key.js`). It is also what the page shows.
- A menu's `qty` values add up to its count (`7` or `14`), each at most `MAX_QTY`, names distinct: **the link tool's own
  rules** (`scripts/handoff-link.mjs`: `checkDistinct`, the full-plan rule), applied by importing it. A file breaking
  any rule, or carrying any other field, **fails the build** (a wrong list must never reach a customer).
- ⛔ No internal identifier (no KMS slug, no product id), no price, no person.

## 2. Which week the page shows

The store switches to the next week on a **Friday** (the Advisor, 2026-09-25), and week B, delivered Sunday
2026-10-04, was open from Friday 2026-09-25 (his ruling, 2026-09-30). So a delivery Sunday `S` is open to order on the
dates **`S − 9` (a Friday) through `S − 3` (a Thursday)**.

- **The page chooses in the browser, on the visitor's date** in the enterprise's time zone (`data/save.json`
  `send_time_zone`), with **the same zoned-date helpers the offer uses** (imported, not copied): it shows the picks
  file whose window holds that date, and **none** otherwise, never last week's.
- The build embeds every picks file whose window has not ended on the build's date (`--on`, as the offer's), so a
  page built on a Thursday already carries Friday's week when its file exists.
- ⚠ The switch's time of day on Friday is not known; the page switches at the start of Friday in that zone.

## 3. The plan page (Flow 2's `CHOSEN` state, individual plans only)

When the week has picks for the chosen **count**:

- The result card's single *Choose your meals* becomes two:
  - **See this week's Chef's Choice** (the card's primary button): opens, in place below the figures, the week's list
    for that count: a heading (*"This week's Chef's Choice · 7 meals · delivered Sunday, October 4"*, the date from the
    file, written as the offer writes dates), each meal's name with *× n* when `qty` > 1, a line (*"These meals go into
    your cart. You can change them before you pay."*), and **Continue to checkout** →
    `https://fitafnutrition.com/order?mpid=<N>#fitaf=2.<keys>`, built by the link tool's `handoffLink` for the chosen
    size's `mpid` and the count's menu. A second press on *See this week's Chef's Choice* closes it
    (`aria-expanded`, `aria-controls`).
  - **Choose my own meals** (a plain link, secondary): the plan's order page, `…/order?mpid=<N>`, today's link, so the
    visitor chooses in the store's own catalogue and checkout.
- **The list is the same for every size**: a size is the plan (`mpid`, which sets the portion and the price), and the
  store's cart takes each meal at the plan's size.
- When the week has no picks for the count (or no file): the card is today's, *Choose your meals* alone.
- ⚠ **The words above are placeholders** for the Advisor's copy review, and live in `data/messages.json` (one place to
  change a phrase), not in the template or the script.
- No photographs in this contract (Flow 8 is later). No JavaScript: the card is not shown (today's rule), and the grid's
  links stay rung 1.

## 4. Cases (`node --test`, no network)

| | case | expect |
|---|---|---|
| CC-1 | a picks file for the week of `--on` | the built page carries, for each count with picks, the list and one checkout link per size; the plan page opens it from the result card |
| CC-2 | ⭐ the links | each decodes (with the shipped script's own reader of `#fitaf=`, as the R2 cases use it) to the menu's names' keys and quantities and the size's `mpid`; built through `handoffLink`/`mealKey` (a copied key function or encoder in the build fails the case) |
| CC-3 | the week's window | on `S − 10` (Thursday) no picks for `S`; on `S − 9` (Friday) and `S − 3` (Thursday) the file for `S`; on `S − 2` (Friday) not `S`; in the browser, by the zoned date, with the offer's helpers |
| CC-4 | no file | the page byte-identical to the same build without `data/picks/` |
| CC-5 | refusals | qty not adding to the count, a repeated name, qty over `MAX_QTY`, an unknown field, a file name not a Sunday: the build fails, naming the file |
| CC-6 | the controls | the list hidden until opened; the button's `aria-expanded` follows it; *Choose my own meals* is the rung 1 link; both reachable by keyboard |
| CC-7 | words | every phrase of § 3 comes from `data/messages.json` (the letterless-marker rule the page's cases already use) |
| CC-8 | unchanged | the Footer block's text, the watch's expected Footer, the Worker: byte-identical |

## 5. Not decided here

- **Who writes a picks file and how**: an emitter from the operator's saved picks, outside this repository, or by hand
  from them for the first week.
- **Photographs in the list**, and Flow 8's full menu: later.
- **Prod**: this lands on the dev line and the test address; the live page (rung 1) changes only with the Advisor's go.
- The KMS-side "menus" as rules (a default pick, per customer): later, his details.

## 6. Built, 2026-09-30 — found at the build, not ruled

Red at `cb8f197` (45 of CC-1–CC-8's 48 cases failing on the missing feature; CC-5's control, CC-8a and CC-8b, which
guard what must not change, passing), green at `e62e26b` (the suite 432 of 432). The build's reading and its
choices, where §§ 1–4 left one open; §§ 1–5 are unchanged.

**A defect the build found.** `build.mjs` ran its command line as a top-level `await`. With a picks file, `build()`
imports `scripts/chefs-choice.mjs`, which imports the link tool and so `build.mjs` back, still evaluating: the two
wait on each other and Node exits 13 with nothing built (`npm run build` only; the tests import `build.mjs` and never
met it). The command line now runs as a promise (CC-2c and CC-5's program case run `node build.mjs --on`).

**⚠ What a committed picks file does to two existing cases (not changed here; a ruling).** Both builds read
`data/picks/`, the production page included (§ 5: the live page changes only when a release pins a commit carrying
a file). So:

- **S20** compares the production build with its golden **on the day the suite runs** (the build's `--on` defaults to
  today in New York): from the day a picks file is committed until its window ends (S − 3; before the week opens
  too, since a page built early carries it), S20 fails; it passes again once every committed week has ended. Its own
  rule is to re-record the golden only when production is meant to change.
- **S24** builds the development page with the clock at 2026-09-15 and 2026-10-15: a committed week whose window ends
  between them (week B's, `2026-10-04.json`, ends 2026-10-01; `2026-10-11.json` ends 2026-10-08) is on the first page
  and not the second, and S24 fails.
- The choices: let S20 and S24 build without picks (`build()` takes `picksDir`), or keep the production build without
  picks until the Advisor's go (a switch), or re-record S20 per week. Nothing here decides it.
- **Ruled 2026-09-30 (the coordinator, an engineering choice):** S20's and S24's subject is the page without a week's picks, so both build with an empty picks directory through `build()`'s `picksDir`, their goldens unchanged; Chef's Choice stays covered by CC-1–CC-8. So does S18's build case (it compares `build:dev` with the page the tests read, which has no picks), found failing by this ruling's mirror proof.

**§ 1, the file**

- Every `*.json` in `data/picks/` is a picks file and must be named `YYYY-MM-DD.json` for a real Sunday; other files
  (a README) are not read. `delivery` must equal the file's own date.
- **Every file is checked**, a week that has ended included: a broken file fails the build whatever `--on` is.
- A file carries a menu for **any of the counts the page shows** (7, 14), at least one; a count the page does not show
  (`"10"`) is refused, as is an empty `menus`.
- `qty` must be a JSON whole number (`"2"`, as text, is refused, though the link tool would take it); then the tool's
  own range, 1 to `MAX_QTY`.
- **The rules are the link tool's `payloadFromArgs`, called once per size**, as `handoff:link --mpid N --item
  "NAME:QTY" …` takes them: `checkDistinct` (a name twice, or two names sharing a key) and the full-plan rule are
  inside it, and its words are the build's (*"the plan needs 7 meals; the link has 6"*), after the file's path and
  the menu (`data/picks/2026-10-04.json: menus.7: …`). The checkout link is its `handoffLink`; no key function and
  no encoder are in the build (CC-2c changes both in a mirror and the links follow).
- A name is shown and keyed **as the tool reads it**, whitespace collapsed and trimmed; so two names differing only in
  spaces are *"named twice"*.
- The build checks and refuses **before anything is written** (the development build's emptying of `dist-dev/`
  included).

**§ 2, the week**

- `--on` defaults to today in `data/save.json`'s `send_time_zone`, as the mock-ups' `--on`; a malformed `--on` is
  refused even without `data/picks/`. The build embeds each week with `daysBetween(--on, S − 3) ≥ 0`, so every future
  week with a file is embedded, not only next week's.
- The window is computed at the build (`addDays`: `valid_from` S − 9, `valid_to` S − 3) and **the browser decides with
  the offer's own `isLive`** over it, on `zonedDate(Date.now(), zone)`. The page inlines `formatter`, `zonedParts`,
  `pad`, `zonedDate` (with `const FORMATTERS = new Map();`), exactly as the offer box does, and `isLive`, from their
  modules' own source.
- They are inlined **inside one function scope**: the development page already declares the same names at its top
  level, and a second top-level `const FORMATTERS` throws in a browser (CC-1c runs the development page's scripts).
- The week is chosen **once, when the page loads**: a page left open across Friday's midnight keeps its week until it
  is reloaded.

**§ 3, the card**

- `app.js` is unchanged (it ships in the production page, byte for byte). The Chef's Choice script follows it: after
  `app.js` renders (its `hashchange` listener runs first), it reads whether the card is shown and the `mpid` `app.js`
  wrote into *Choose your meals*' link; the count is the menu whose links hold that `mpid`. *Choose my own meals* is
  given that same `href`.
- The order on the card: the button, the list (in place, when open), then *Choose my own meals*. The list's heading is
  an `h3`; the button is the page's orange `.cta` with the `+`/`−` of *See all plans*; *Continue to checkout* is an
  orange `.cta` link; *Choose my own meals* a centred navy text link. `npm run contrast` now reads the card's
  stylesheet (`src/chefs-choice/style.css`): it draws only pairs already measured, and no raw colour.
- The open state is **kept** when the size or count changes (the list is the same for every size); a count without
  picks hides the button, the list and the second link, and a count with picks shows them again as they were.
- **The date is `longDate`'s**, the offer's: *"October 4, 2026"*, so the heading reads *"… delivered Sunday, October 4,
  2026"*, with the year § 3's example leaves out. `Sunday` is the phrase's (a picks file is always a Sunday).
- *"× n"* is a phrase too, `chefs_choice.meal_qty` (`{meal} × {n}`); the heading's placeholders are `{count}` and
  `{date}`. The build refuses a phrase or placeholder missing. `chefs_choice.status` is `"placeholder"`.
- The heading and each meal's line are **filled at the build** and carried in `#picks-data`, so the browser script
  writes no word of its own (CC-7's markers). The card's markup, `src/chefs-choice/card.html`, takes its four words
  from `{{…}}` slots.
- The links carry **no offer code** (`~CODE`): none is ruled for Chef's Choice. They differ between sizes only in
  `?mpid=`.
- The card's two new links have no `href` in the HTML (the script sets them), so the page still carries exactly seven
  order links (T2, CC-6e).

**§ 4, the cases**

- CC-8's "before" is `test/cc-08-unchanged-golden.json`, recorded at `e431b55`: fill B's text (`c4ceb682…`, R2-32's
  pin), the watch's `expectedFooter`, and the SHA-256 of the 29 files the Worker's entry (`wrangler.jsonc`'s `main`)
  reaches by import (25 modules, 4 data files; `erase.js` is not reached from it). A Worker change meant later
  re-records it in its own commit.
- The fixture week (`test/fixtures/picks/2026-10-04.json`) carries invented names, one with a `🟠NEW:` tag.
- CC-2's reading of a link is R2's: the shipped fill-B text on the synthetic order page, its cards replaced by the
  menu's names; each meal pressed its count, `fill B, mpid N` logged, the store's CHECKOUT pressed.

**Not done here**: no `data/picks/` file is committed; nothing is deployed or run live; the page was not looked at in
a browser (its behaviour is proven over linkedom only); the copy review.
