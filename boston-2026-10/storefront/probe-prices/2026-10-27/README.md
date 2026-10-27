# storefront/probe-prices/2026-10-27/

The first batch of the price probe (SPEC-rung2-progress-and-checkout § 36 item 7), on the live store, release
**`main-WMT2MEGW.js`** (⚠ not the watch baseline's `main-6IYBT337.js`: the store released again after the 04:24Z
accept), plan **Lean 7** (`/order?mpid=21`), the first 7 meals of the week's menu, both widths. Four run files,
two runs per width:

| file | width | the probe's code |
|---|---|---|
| `run-20261027T170434Z-1280.json`, `run-20261027T170545Z-390.json` | 1280, 390 | the first reader: each price element, its parent, its type and path |
| `run-20261027T171333Z-1280.json`, `run-20261027T171454Z-390.json` | 1280, 390 | as committed (`lib/probe-prices.mjs`): the same, and each price's card and section of the order page, the page's sections, and a skeleton of each container the struck figure may go in |

The second run was made because the first could not tell the plan's meals from the additions on the order page (both
draw their price in the same element). Both runs read the same prices at the same places. Every run: no error, 7 of 7
presses counted, the store's extras dialog opened after CHECKOUT and its CONTINUE TO CHECKOUT pressed, `/checkout`
reached; no `[fitaf-handoff]` line, no page error; nothing typed, nothing pressed on `/checkout`.

## Findings

Elements by the store's own names; boxes from the second run (CSS px, `y` from the page's top).

**The landing query is kept.** At both widths, on `/?fitaf_probe=1` and `/meal-plans?fitaf_probe=1`:
`location.search` is `?fitaf_probe=1` at the document's start, **at the Footer's injection** (the store's `<script>`
naming `fitaf-handoff` added 0.4–3.2 s after the start), and after the app settled (3 s after the page's first
price); the navigation entry's own query is `?fitaf_probe=1`. So a store address carrying `utm_source=eatfitaf` keeps
it while the store's Google Analytics reads the page, as far as this query shows (a UTM query was never loaded).

**(a) The meal plans page** (`/meal-plans`): one price per plan card, `article.meal-plan__fit-af-card` (Lean,
Signature, Performance, Family): a `strong` with no class, *"$11.50"*, *"$13.00"*, *"$14.00"*, *"$38.00"*, in
`div.meal-plan__fit-af-price` (*"As low as"* `span`, the `strong`, *"/meal"* `small`; flex row, baseline, gap 4 px;
229 px wide at 1280, 316 at 390). 24 px, weight 900. ⚠ **It is the plan's lowest price per meal** (each plan's 21-meal
price, Family's own), not a weekly price; it is one plain price of the plan, so it is struck. The front page (`/`)
draws **no price** at either width.

**(b) A plan's order page** (`/order?mpid=21`): two sections, `div.products__section`, each headed
`h2.products__section-title`: **"All Meals"** (28 cards) and **"Additions (Additions)"** (29: snacks with *Select
Options*, sides and extras at their own prices, *"From $9.00"* where a size is chosen). Each card is drawn twice, the
desktop `app-product-card` (shown at 1280) and the phone `app-product-card-mobile` (shown at 390), the other hidden. A
meal's price: **`span.product__content-price`** (desktop; 13 px, weight 600; alone in `div.product__content-meta`, a flex
row, space-between, at its right end) and **`span.product-card-mobile__price`** (phone; 12 px, weight 700; first in
`div.product-card-mobile__price-row`, a flex row, 164 px). Every meal of Lean 7 reads *"$12.50"*. The desktop card's
Add to Cart repeats it (`span.product__actions-add_price`, white in the button); the phone card's *Add* does not, except
on additions (`span.product-card-mobile__actions-add-price`). Add-on pills (`span.dropdown__value-text`, *"5 +$10.00"*,
*"Quart +$13.00"*) on two additions.

**(c) The cart summary**, after the 7 presses: at 1280 the sidebar (`app-cart`): each row
`app-cart-product-card` with `span.product__price-original` *"$12.50"* (10 px, in `div.product__price`, a flex row,
flex-end, gap 4 px), and the plan's figure **`span.segment-price`** *"$87.50"* above *"One Time Order"* in
`div.order-type__content-single` (a flex column, centred, gap 4 px, 348 px). At 390 the bar
(`div.mobile-cart-summary__bar`, at the viewport's foot): two stats, *"Items"* `7` and *"Cart Total"*
**`span.mobile-cart-summary__stat-value`** *"$87.50"*, each stat a flex column (label above value; the Cart Total
stat 45 px wide) in a flex row of 198 px with 117 px free, beside CHECKOUT. ⚠ The same class holds the item count
(`7`). Before any press the bar is `--hidden` and reads *"$0.00"*.

**(d) `/checkout`** (the store's full checkout: no hand-off link, so nothing of the block's applies): the **Plan
Total** row `div.summary__plan-total` (*"Plan Total (7 items)"*, a flex row, space-between), its figure
**`span.summary__plan-total-value`** *"$87.50"* alone in `span.summary__plan-total-prices` (a flex row, gap 6 px, at
the row's right end). Also priced, and ⛔ never struck (§ 36 item 4): each line's `span.summary__item-price-current`,
the header's `span.summary__total-preview` (the Total), the Subtotal and a *"$0.00"* row (`div.summary__row > span`),
`span.summary__total-value` (the Total), the phone bar's `span.summary__stat-value` (*"Total"*), and the pay button
(*"Pay now - $87.50"*).

**Against the contract** (§ 36 items 3 and 4): every price on the four surfaces is one plain price, `$` then dollars,
a point and two digits, no thousands separator seen. The meal plans page's price is per meal (above); the order page
shows no upcharge on a meal (every meal of the plan at the plan's price); the cart summary shows items and their sum,
no fee. Nothing found contradicts the contract outright.
