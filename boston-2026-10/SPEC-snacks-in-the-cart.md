# SPEC: snacks into the cart (the week delivered 10-18)

**Status: contract, unbuilt.** It is `SPEC-meal-selection.md` § 11's *"the contract to write next"*, written from the
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
