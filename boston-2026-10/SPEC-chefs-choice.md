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
