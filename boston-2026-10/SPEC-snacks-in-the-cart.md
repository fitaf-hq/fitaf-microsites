# SPEC: snacks into the cart (the week delivered 10-18)

**Status: built 2026-10-08** (§ 1a the probe, § 3a the build's notes, § 6a the live proof); ⛔ **not pasted**: the
Footer block is the Advisor's to paste (§ 7 step 4), and `data/plans.json`'s `carted` stays false until then. It is `SPEC-meal-selection.md` § 11's *"the contract to write next"*, written from the
code it constrains (`src/storefront/fitaf-handoff.js` at `6662baa`, `scripts/handoff-link.mjs`, `scripts/selection.mjs`)
and from § 11's live measurements. **The Advisor**, 2026-10-08: *"Release now, snacks for 10-18"*. Two choices are
his and open (§ 9); each has the default this contract proceeds under.

**In one paragraph**: a hand-off link gains snack items after its meals; the Footer block presses each snack on its own
*Additions* card (its *Select Options* first, where the card shows one), confirms each by the card's own count as it
does a meal, never counts a snack toward the plan, and checks the plan's count at CHECKOUT the way each width shows it;
the plan page puts the week's snack list into the link of every answer set with *Add snacks*. Nothing about a meal
changes: a link without snacks is byte-identical to today's, and so is what the block does with it.

## 1. Measure the store before writing the code

A probe, not code (as `SPEC-rung2-fill-c.md` § 2): the live store, an anonymous throwaway browser session (the watch's
own launcher), **nothing submitted, PAY never pressed**, at **1280 and 390**, on the plan's order page of a 14-meal
plan. Record, by the store's own names:

1. **A snack card that shows *Select Options***: the button's element and label; after the press, the expansion's
   elements: the *Size* control (its element, whether a value is already chosen, and its choices), *Add to Cart* (its
   element, its label with the price, and whether it is inside `.product__actions`); after *Add to Cart*: the card's
   counter (`.product__actions .counter__value`, or what), its *"+"* (`aria-label="Increase value"`, or what), and
   whether the expansion closes.
2. **A snack card that shows *Add to Cart* directly** (§ 11 item 2: *Cheesecake Brownie Bites*): the same reads.
3. **Two units of one snack** (its *"+"*): the card's count; the sidebar's `.cart__items-count` at 1280 and the cart
   bar's `.mobile-cart-summary__stat-value` at 390, after the meals and after each snack unit. § 11 item 4 measured one
   unit (*"1 item"* at 1280, *"0"* at 390); this settles whether the sidebar counts **units** or **lines**.
4. **The checkout with a snack in it** (reached by the store's own CHECKOUT, then stopped): the snack's line and the
   group it sits in (*"Add-On & Extra Meals … One Time Order"*), and which of the block's hide rules (H1–H17,
   `fitaf-handoff.js`, the `DEEP` text) hide which part of it. The Total includes the snack.
5. **The snack's name**: its card's `.product__content-title` text beside its name in the week's catalog
   (`products.json`), so the link's key (`meal-key.js`, from the title as the page shows it) is computed from the right
   text.

Each selector and text becomes an entry in `storefront/dependencies.json`, so the watch catches a rename. ⛔ **If a
snack cannot be confirmed on its own card** (no count the store keeps current), or a size must be chosen that the link
cannot name, **this contract returns to the Advisor before any code.**

## 1a. Measured, 2026-10-08: found, not ruled

**The probe**: `tools/storefront-watch/bin/probe-snacks.mjs` (its run in `lib/probe-snacks.mjs`), headless, the watch's
own launcher, a fresh profile per run, `/order?mpid=23` (Lean, 14 meals a week) with no fragment; every press a
`.click()` on `app-product-card`'s own control, as the block presses; every read by **the block's own functions**
(`card`, `addButton`, `count`, `plus`, `plan`, `control` and the key, their text read from `fitaf-handoff.js` at
`7768dfe6…` and `meal-key.js`). **The batch**: [`storefront/probe-snacks/2026-10-08/`](storefront/probe-snacks/2026-10-08/README.md),
4 runs, 21:35–21:38Z, release `main-UMGPHR2R.js`, 2 at 1280 × 900 and 2 at 390 × 844; each answer below is the same in
all four runs unless a width is named. Nothing submitted: PAY never pressed, nothing typed, no size chosen.

**§ 1's stop condition does not hold.** The snack pressed (*Golden Oreo Protein Sand*, in 4 of 4 runs) is confirmed on
its own card by a count the store keeps current (`.product__actions .counter__value`, which `count()` reads unchanged: 1,
then 2; the other 14 snacks were opened and read, not pressed), and **every snack's Size already has a value when its
options open**: 15 of 15 snack cards, each opened and read, nothing chosen (14
dropdowns showing a value, the one radio, *Organic Bone Broth Soup: Southwest Chicken*'s *"Quart"*, checked; every form
`ng-valid`). ⚠ That value is the store's default, and it is a choice: two snacks' defaults carry a charge (*"5 +$10.00"*,
the Cognition and Relaxation Superfood Bites, whose cards show *"$0.00"*), and 13 of the 15 offer a larger size the link
cannot name (*"3 +$6.00"*, *"10 +$7.00"*, …). § 8 keeps choosing a size out of this contract; the per-snack table is the
batch's README.

1. **Select Options** (every snack card, 15 of 15): a `button.product__toggle` (label `span.product__toggle-label`
   *"Select Options"*, `aria-expanded="false"`) **outside `.product__actions`**; before it is pressed `addButton()`
   finds nothing on any of the 15 (the pressed snack's card has no `.product__actions` at all). Pressed, it expands in
   place (no overlay, the path still `/order`):
   the toggle reads *"Hide Options"*; `div.product__addons` holds the Size (`h4.product__addons-item-title` *"Size"*, its
   `span.product__addons-item-required` *"\*"*; `app-addon-controls > app-dropdown > div.dropdown[role=combobox]`, its
   `span.dropdown__value-text` *"1"* already; its choices a `div.dropdown__panel[role=listbox]` of
   `div.dropdown__option[role=option]` in a `.cdk-overlay-pane`, read on Cheesecake Brownie Bites: *"5"*
   `aria-selected="true"`, *"10 +$7.00"*); and **inside `.product__actions`**, `app-button > button.button` reading
   *"Add to Cart"* (`.product__actions-add_label`) and *"$9.00"* (`.product__actions-add_price`), which `addButton()`
   finds. After *Add to Cart* the button is replaced by the store's counter, `.product__actions > app-counter >
   div.counter[role=spinbutton]`, `span.counter__value` *"1"*, its "+" `button.counter__button[aria-label="Increase
   value"]` (`count()` and `plus()` read both); **the expansion stays open** (*"Hide Options"*, Size *"1"*). Both widths
   alike; at 390 on the hidden card, while the displayed `app-product-card-mobile` shows the Size inline and *"Add
   $9.00"*, with no *Select Options*, and counts with it.
2. **Add to Cart directly**: **no snack card shows it** (0 of 15); this morning's *Cheesecake Brownie Bites* (§ 11 of the
   meal selection, item 2) now shows *Select Options*, its Size the only optional one (no `*`, default *"5"*, a
   `button.dropdown__clear` *"Clear selection"*). The 13 other additions (bulk proteins and sides) do: on *93% Lean
   Free-Range Plain Ground Turkey*, `.product__actions … button.button` *"Add to Cart $13.00"*, pressed, the same counter
   as item 1, *"1"*, with its "+".
3. **Two units** (*Golden Oreo Protein Sand*, *Add to Cart* then its "+"): the card reads 1, then 2. The sidebar's
   `.cart__items-count` reads *"14 items"* after the meals, then *"15 items"*, *"16 items"* (and *"17 items"* with the
   turkey): **it counts units**, not lines (its rows went 14, 15, 15, 16). The bar's `.mobile-cart-summary__stat-value`
   (*"Items"*) reads **14 throughout: the plan's meals only** (its *"Cart Total"* went $168.00, $177.00, $186.00,
   $199.00). ⭐ **Both are in the page at both widths and each reads the same at both**; the width only decides which is
   displayed, so `plan()` reads 14, 15, 16, 17 at 1280 and 14 throughout at 390. The meals are in `hmp_pending_plan_items`
   (14 throughout), the snack in `hmp_local_cart` (1 entry at 1 unit and at 2). CHECKOUT stayed enabled.
4. **The checkout** (the store's CHECKOUT, then its extras dialog's *CONTINUE TO CHECKOUT*: see the notes): the snack's
   line is a `div.summary__item`, its `div.summary__item-name` *"Golden Oreo Protein Sand"* plus a child
   `span.summary__item-tag` *"Add-on"*, `div.summary__item-addons` *"Size: 1"*, the quantity *"2"*,
   `div.summary__item-price` *"$18.00"* / *"2 × $9.00"*. Its group is `div.summary__additions-section`, header
   `h4.summary__additions-header` *"Add-On & Extra Meals"* (both add-ons in it), **inside the plan's own
   `section.summary__plan-group`**, after the 14 meal lines and before `.summary__plan-total` *"Plan Total (14 items)
   $199.00"*. The Total, *"Total $199.00"*, includes the snack (14 × $12.00 + 2 × $9.00 + $13.00). **The hide rules**,
   evaluated without the class: on the snack's line **H11** (its price), **H12** (*"Size: 1"*), **H13** (its quantity
   control, which holds the remove button) and **H14** (the remove button); **nothing matches the line itself, its
   photograph, its name or its *Add-on* tag, the group, or the group's header**. In the same plan group H15, H16
   (*"Lean Plan 14 Meals"*, *"Remove plan"*) and H17 (*"← Return to Lean Plan 14 Meals"*) match.
   ⚠ **No *"One Time Order"* on the checkout**: no element of `app-checkout` says one-time, renews, recurring or
   subscription (H6 matched nothing). Those words are the order page's sidebar's, `span.segment-label` *"One Time
   Order"* under its total; so § 3 item 7 finds no one-time statement on the checkout for any rule to hide.
5. **The names**: 15 of 15 snack cards' `.product__content-title` equals the catalog's `name` exactly (the page's own
   `/catalog/products` response, read, never requested), two with the store's tag (*"🟠NEW: Caramel Apple ProNuts"*,
   *"🟠NEW: Cheesecake Brownie Bites"*, which `meal-key.js` strips); the phone cards' `.product-card-mobile__title`
   reads the same; no two of the page's 55 cards share a key. The 15 keys are in the batch's README (Golden Oreo
   Protein Sand `e2te4`). ⚠ The checkout's whole name, *"… Add-on"*, keys differently (`mb5f3`): a line is matched by
   the name element's own text, never its whole text.

**Notes for § 3, not ruled.** § 3 item 2's "ready" for a snack is its `button.product__toggle` (outside
`.product__actions`, so not `addButton()`'s); item 3's wait after it finds *Add to Cart* inside `.product__actions`;
item 5's sidebar rule is **meals plus snack units**; the bar's is meals. **The extras dialog opened in 4 of 4 runs**
(`app-extra-products-dialog`, *"Wait, don't forget these extras!"*, *CONTINUE TO CHECKOUT*; it lists the snacks, the one
in the cart with its counter, seen in its pictures, which are not committed): the probe does not write
`ecc_additions_prompt_handled` as the block does, so whether that write keeps it shut with a snack in the cart is for
§ 6's live proof. Candidates for `dependencies.json` (F2 needs each found in the release's files first; this probe
fetched none): `product__toggle`, `Select Options`, `product__addons`, `summary__additions-section`,
`summary__additions-header`.

**Not measured**: a snack's press the store drops or takes back (none was); more than 2 units, or two snacks; the
drawn size lists of 14 of the 15 snacks (the catalog's are in the table); the block's own run; 2560; a slowed network;
a signed-in visitor or the Advisor's devices; another week's menu. ⚠ At 390 the probe's cart-bar pictures failed (it
clipped to `.mobile-cart-summary`'s own box, which has no height); the bar's values are in every run file.

## 2. The link: snack items in the version-2 payload

- **A snack item is `_<key>` or `_<key>*<n>`**: the meal grammar with a leading `_`, `n` from 2 to 21 as for a meal.
  Snack items come **after the meals and before `~<code>`**; the link tool writes them in that order and the block
  refuses a meal after a snack.
- **A snack never counts toward the plan**: the full-plan rule (`COUNTS[mpid]`, `p.total`) reads meals only.
- **A key named twice is refused, across meals and snacks alike** (`named twice`); a snack whose key matches another
  card's is refused by `card()`'s existing rule (two cards sharing a key), at every lookup.
- **No version bump, deliberately**: version-2 links already published (saved links, emails) stay valid, and **a block
  without this change reads `_…` as a bad meal and refuses the whole link, pressing nothing** (the guard's ordinary
  stop). That is the safe failure a version 3 would give, at no bytes. So **no link carrying a snack is published before
  the block that reads it is pasted** (§ 7).
- **The link tool** (`npm run handoff:link`) gains `--snack "NAME:QTY"` (repeatable); its legend shows each snack's token
  beside its name, marked as a snack; it refuses what the block refuses.

## 3. The block (`src/storefront/fitaf-handoff.js`)

1. **`payload()`** parses snack items into `p.snacks` (`{ key, qty }`), in the link's order; `p.total` stays the meals'
   count and `p.units` is meals plus snack units.
2. **The wait for the cards** (`fillC`) treats a snack as ready when its card shows *Add to Cart* **or** *Select
   Options* (§ 1 items 1–2); every other rule of the wait is unchanged.
3. **The press** (`steps()`, `fill()`): every meal's units first, exactly as today; then each snack's. A snack's first
   unit presses *Select Options* when its card shows it, waits (polling, `MIN_GAP_MS` to `ACK_MS`) for the expansion's
   *Add to Cart*, and presses that; its count is read from its own card, as a meal's (`count()`, or what § 1 found);
   further units press its *"+"*. **The block never chooses a size**: it takes the store's default; no default (§ 1
   item 1) is § 1's stop. Re-presses, `RETRIES`, and *"never a second press on a clock alone"* hold for snacks as for
   meals.
4. **`said()`**, the over check and **`settle()`** include the snacks, each by its key; an over-count stops the fill
   (`SPEC-rung2-fill-c.md` § 7 a), naming it.
5. **CHECKOUT** (`checkout()`): `plan()` also says which element it read. The condition is **the sidebar** (1025 px and
   wider): meals plus what § 1 item 3 finds the sidebar counts (snack units, or snack lines); **the cart bar**: meals
   only. Each reading is pinned by a test (§ 5).
6. **The progress screen**: the bar's total is `p.units` (+ 1 for CHECKOUT); each snack has its slide like a meal (its
   card's title and photograph); the step line's words are unchanged. The checkout's recap (`N`) stays the meals'
   count; with snacks it reads `handoff.recap_snacks` in `data/messages.json` (a placeholder for the copy review:
   *"{n} meals · {s} snacks"*).
7. **The stripped checkout**: a snack's line shows its photograph and its name, as a meal's (§ 19's rules apply to every
   `.summary__item`). ⛔ **Whatever § 1 item 4 finds that states the snack is a one-time charge stays visible**: a
   commitment is never hidden (`SPEC-rung2-progress-and-checkout.md` § 3 item 3), so a hide rule that would remove it is
   narrowed, not kept.
8. **Size**: the built Footer block is reported in bytes against the refusal at 20,480 (17,617 before this change).
9. Nothing else changes: no new write to storage, no new timer kind, no `<` before a letter in the shipped text (R2-58).

## 3a. Built, 2026-10-08: found at the build, not ruled

Built on `boston/meal-selection` after `f415f33` (§ 1a), following § 1a where it and §§ 2–5 differ. The Footer block's
text is `ad25f93d…` (R2-32, PR-10 and CC-8 re-recorded for it, CC-8's golden `replaces` naming the pasted `76871ff9…`):
**18,323 bytes** as the Footer block (17,617 before, +706) and 18,304 as the console file, against the refusal at
20,480; every character ASCII, no `<` but the block's own two.

1. **Ready (§ 3.2)**: every snack showed Select Options on 2026-10-08, `button.product__toggle`, outside
   `.product__actions`; the block's wait takes it, or Add to Cart, for a snack. The Add to Cart path stays for a snack
   that shows it (SN-2's direct card); none did.
2. **The press (§ 3.3)**: Select Options is pressed **at most once per unit**, and only while its `aria-expanded` is not
   `"true"`; then the expansion's Add to Cart is waited for (MIN_GAP_MS, then polls to ACK_MS) and pressed as any unit's;
   none within ACK_MS is the stop `; no control`. ⚠ The first text pressed it again at every read while a slow store had
   not yet expanded (seven presses in SN-2c, without end in SN-2d): a second press on a clock alone. A lost Select
   Options is therefore a stop, never a re-press.
3. **The order (§ 3.3)**: every meal's units exactly as before, then each snack's, all of one snack's before the next.
   With no snack, the presses, the delays and the stop lines are byte for byte as before (SN-2b, FC-1 to FC-7, R2-*).
4. **K of N (§ 3.4)**: a stop's N is the link's units (meals and snack units); with no snack it is the meals', as before.
5. **CHECKOUT (§ 3.5)**: `plan()` returns `[count, sidebar?]`; the sidebar's count is checked against meals and snack
   units, the bar's against meals (SN-4, with a mutant each way).
6. **The words (§ 3.6)**: `handoff.recap_snacks` is *"{n} meals · {s} snacks ·"*, with the trailing separator `recap`
   has before the store's Total; the build requires `{n}` and `{s}` in it. The step line's words are unchanged, so a
   snack's slide reads *"… · 15 of 17 meals"*; that word is the copy review's.
7. **The stripped checkout (§ 3.7)**: no rule changed. § 1a found no one-time statement on the checkout to keep; on a
   snack's line H12 hides *"Size: 1"* as it hides a meal's portion, and the store's *Add-on* tag stays.
8. **The link (§ 2)**: `--snack` refuses with the item rules and words of `--item`; a name or key given twice across
   meals and snacks is refused; with no `--snack` the link is byte-identical (SN-6). The photo part's cells stay the
   meals'.
9. **The page (§ 4)**: `carted: true` is allowed; `carted` while not `shown` is refused (MS-6). **§ 4.5 is read per
   days**: while carted, Q4 is shown only where the live week has a snack list for the chosen Q2 (the committed fixture
   has none for 5 days, so Q4 hides on weekdays), and is hidden with no live week; a page built with no week omits Q4
   and the `-s` fragment (that page is byte-identical to the one with snacks not shown, `03fcc0c1…`). Each *Add snacks*
   link is the link tool's own, from `payloadFromArgs` with `--snack`, so a snack sharing a key with one of the cart's
   meals stops the build. Only *Continue to checkout* carries snacks; *Choose your meals* and *Choose my own meals* do
   not.
10. **Tests (§ 5)**: SN-1 to SN-6 (`test/sn-*.test.mjs`); the synthetic store's snack cards are `r2-harness.mjs`'s
    `snacks` (written from § 1a's names); MS-6's carted case replaced, MS-7 rewritten with its carted halves, MS-16 a
    carted case, MS-10 a mutant (the card ignoring the snack links fails MS-7); FC-4's and R2-58's anchors moved with the
    text; MS-6's *"snacks by default while not shown"* case now sets its own `carted` (in the mirror with `carted=true`
    it hit the new refusal first). ⚠ The block's code was written before its cases, not after; SN-2c and SN-2d were red
    on that first text for the reason they name, and SN-4's two mutants and MS-10's are each shown failing.
11. **Storybook (§ 5 item 5)**: unchanged; its stories read the committed `carted: false`. When `carted` flips, the
    *"or · weekdays · snacks, no list"* story moves with it (Q4 hidden on weekdays with no list).
12. **F2**: `storefront/dependencies.json` gains `"product__toggle"` and `"aria-expanded"`, each found in
    `main-UMGPHR2R.js`'s chunks by a read with the watch's own fetcher on 2026-10-08 (not by `watch --full`).
13. **The gates**: the site's suite 654 of 654; the mirror with `--set snacks.carted=true` and with
    `--set snacks.shown=false` 652 of 654 each, the two being S20 and CC-4 (prod), which pin the production page;
    `npm run contrast` 70 of 70; Storybook 40 of 40; the watch 169 of 169 (W21 added).
14. ⚠ **Phase 1's pictures (`f415f33`) broke P1**: they carry the store's food photographs and this repository is
    public. Untracked by `7ffe7ee` and ignored beside their run files; `f415f33` still holds them and is to be rewritten
    before any push.

## 4. The page

1. **`snacks.carted: true` is allowed** once § 3 exists: `scripts/selection.mjs`'s refusal (MS-6) is removed in the same
   change that carts.
2. **Every answer set with *Add snacks* gets its own link**: its cart's meals, then the week's snack list for its Q2
   (7 *every day*, 5 *weekdays*: § 2's row) as snack items. With *No snacks*, the link is today's, byte-identical.
3. **The not-carted line goes** while `carted` is true; the list keeps its heading. The snack price follows § 9 a.
4. **Picks version 2's `snacks` lists** (§ 5): `name` is the store's card title (the key), `display` the shown name, as
   for meals; the build checks each list's `qty` sums to 7 or 5.
5. **A week with no snack list, while `carted` is true**: Q4 is hidden for that week (the page never offers what the
   cart cannot hold). With `carted` false, § 9 item 3 of `SPEC-meal-selection.md` as today.

## 5. Tests (`node --test`, no network)

1. **The payload**: snack items accepted (bare, `*n`); refused: a bad key, `*1`, `*22`, a key named twice (meal and
   snack, two snacks), a meal after a snack, a snack after `~code`; the full-plan rule reads meals only.
2. **The synthetic store gains snack cards**: one with *Select Options* expanding in place to *Add to Cart*, one with
   *Add to Cart* directly, each with the counter § 1 measured; its seeded drop / late-acknowledge / take-back modes
   (`SPEC-rung2-fill-c.md` § 4 item 1) apply to snacks too. Over many seeds: **never silently short, never over**.
3. **CHECKOUT by width**: the sidebar's count with snacks, the bar's without, each failing the other's rule.
4. **The pasted block of today** (by its pinned SHA-256): a snack link is refused with nothing pressed.
5. **The page**: MS-7 and MS-16 rewritten for `carted: true` (links carry the snack items; *No snacks* links unchanged);
   the eight answer sets × snacks; Storybook's *"… · snacks"* stories (they read the committed flags).
6. Every suite green: the site's, Storybook's, `npm run contrast`, the watch's; the R2 hash pin re-recorded only for
   the new block.

## 6. The live proof, never submitting

The watch's smoke gains **`--link <fragment>`**. With the built console file (`--script`): a 14-meal link with a 7-snack
list, and one with 5, at **390 and 1280**, **5 runs each** (`SPEC-rung2-fill-c.md` § 7 d), reported as *K of R*; and a
link with no snacks, to show nothing else moved. Each run ends on the stripped checkout, looked at, PAY never pressed.

## 6a. The live proof, 2026-10-08: found, not ruled

[`storefront/smoke-snacks/2026-10-08/`](storefront/smoke-snacks/2026-10-08/README.md): the watch's smoke (`a3ed3c9`)
with `--script` the console file built at `1339c0a` (text `ad25f93d…`) and `--link` three links of the link tool on the
14-meal Lean plan (`mpid` 23): its 14 meals with the store's first seven snack cards, with the first five, and alone;
22:41–22:48Z, release `main-UMGPHR2R.js`; every run ended on the stripped checkout, looked at, PAY never pressed.

| link | 1280 | 390 |
|---|---|---|
| 14 meals + 7 snacks | **5 of 5** | **5 of 5** |
| 14 meals + 5 snacks | **5 of 5** | **5 of 5** |
| 14 meals, no snack | **1 of 1** | **1 of 1** |

Every run: `done: /checkout`; every meal and snack listed by name; *"Plan Total (14 items)"* beside the store's count
of units (*"21 items"*, *"19 items"*); the total the meals' and the snacks' card prices ($212.00, $204.00, $168.00);
the extras pop-up never opened (the block's key holds with snacks in the cart); the faces as before (W10–W20). Each
snack's line on the stripped checkout is its photograph, its name and the store's *Add-on* tag under *"Add-On & Extra
Meals"*, the Total after them (the pictures, one per width, are not committed: they carry the store's photographs). The
smoke now reads a link's snack items and prices them (W21), and `--shots` takes those pictures. ⬜ **Not run**: the
4-meal and 21-meal carts (SPEC-meal-selection § 8 item 9), a link with a photo part, `--live` (§ 7 step 5, after the
Advisor's paste), and 2560.

## 7. Order of release

1. § 1 measured and recorded (this file, an amendment). 2. § 3–§ 5 built; the orchestrator re-runs every gate.
3. § 6 with `--script`. 4. **The Advisor's paste** of the new Footer block. 5. The watch's smoke `--live` with a snack
link, both widths. 6. The page with `carted: true` and the 10-18 picks file with its snack lists, on the dev line.
7. **The Advisor's release.** ⛔ No link carrying a snack is published before step 4.

## 8. Not in this contract

Choosing a snack's size; a snack in a plan's count; snacks for a version-1 picks file; anything typed into the store's
admin by an agent; any write to the store's storage beyond the one key; removing anything from a visitor's cart.

## 9. Open, each with the default this contract proceeds under

| | the choice | default until ruled |
|---|---|---|
| a | the snack price on the page | **none on the page**: the store's cart and checkout show it (`data/plans.json` holds no snack price) |
| b | which snacks make the week's 7 and 5 | the picks file's snack lists, **chosen by a person on Fit AF's review page** from the week's snack cards (Fit AF's emitter contract) |
| c | the recap's words with snacks | *"{n} meals · {s} snacks"*, a placeholder for the copy review |
| d | the largest count of one snack | 21, the meal rule; the lists themselves carry 1 each unless the review says otherwise |
