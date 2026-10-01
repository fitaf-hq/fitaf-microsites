# boston-2026-10 — fill C: the cart filled by confirmation, not by a clock; served from eatfitaf.com. CONTRACT

**Status: RULED, 2026-10-01.** Proposed by the orchestrator (session 218) from the Advisor's direction below; the
Advisor (`ts=2026-10-01T20:47:44.490Z`): *"Excellent! I agree with Fill C – please implement it."* Not built. Each
open choice in § 7 carries the default this contract proceeds under; a ruling replaces it.

**The direction.** The Advisor, after a 14-meal link left meals out of the plan in their own browser more than once on
2026-10-01 (`ts=2026-10-01T18:04:07.680Z`): *"Different devices are failing at different times. But now it works
again. I think we'll definitely need to rewrite this to significantly harden it. But it's definitely good enough for
now"*; and after the Owner meeting (`ts=2026-10-01T20:35:24.157Z`): *"Please feel free to begin the rewrite of the
script. If you want to plan to move it to being hosted on eatfitaf.com, we can. Otherwise I'm happy to paste updated
versions in as needed."*

**Who reads it**: whoever builds fill C, and whoever reviews a failed deep cart. It amends
[`SPEC-rung2-cart-handoff.md`](SPEC-rung2-cart-handoff.md) (fill B's rules, §§ 6–12) and
[`SPEC-rung2-progress-and-checkout.md`](SPEC-rung2-progress-and-checkout.md) (the screen and the checkout, §§ 1–25);
**every rule there not named here stands.**

## 0. Why fill B is not enough

- **The evidence** (the Boston record § 46): the link's first 11 meals of 14 in the plan, in order, and CHECKOUT never
  reached; on *"different devices … at different times"*; not reproduced in fresh headless profiles at 1920 and 2560 px,
  nor with the CPU slowed 4× and 8×. One second between presses (rung 2 § 23, live as `5d5fb72`) did not stop it.
- **The cause in the code**: fill B finds every meal's **Add to Cart**, then presses one every `PRESS_MS` and **never
  confirms the store counted a press**. When the store drops one (a race inside its own page, by every sign), the plan
  stays short, CHECKOUT stays disabled, and fill B stops after 10 s with `stopped: no checkout control`: the visitor
  sees a half-filled plan and no explanation. **A slower clock makes the race rarer; it cannot make it impossible.**
- **What the store shows instead** (the Advisor's screenshot, 2026-10-01): a meal the store has counted shows the card's
  own quantity stepper, **"− 1 +"**, where its Add to Cart was, and the plan's sidebar reads *"N items"* with
  *"Please add at least M meals to continue"* until the plan is full. **The store says when a press counted. Fill C
  waits for it to say so.**

## 1. Fill C: press, then wait for the store to count it

1. **One unit at a time.** For each unit of the link (a meal's first, then any second, in fill B's order, `steps()`):
   press its control, then **wait for the store's acknowledgement**: the card's own quantity reads the expected number
   (1 after Add to Cart, n + 1 after **+**). The next press waits for that, and at least `MIN_GAP_MS` (default 300)
   after the previous press.
2. **No acknowledgement within `ACK_MS`** (default 5000): read the card again. **Only if the store still shows the meal
   short** does fill C press again, and at most `RETRIES` times per unit (default 2). ⛔ **Never a second press on a
   clock alone**: a press the store counts late must not become two.
3. **Settled check.** After the last unit is acknowledged, wait `SETTLE_MS` (default 1000) and read every meal's
   quantity once more. A meal now short (the store took a count back) is completed by § 1.1–1.2, once.
4. **Before CHECKOUT, the plan's own count must equal the link's total**: the store's CHECKOUT enabled and its count
   (*"N items"*, or the bar's text, whichever § 2 finds reliable) equal to the plan's. If not, stop.
5. **Over-count**: a meal the store shows above its expected quantity (a late count plus a re-press) **stops fill C
   with nothing more pressed** (§ 7 a).
6. **Every stop names the counts**: `stopped: the store counted K of N; short: <keys>` / `over: <keys>`, and the screen
   says, in the visitor's words, that the cart could not be filled and that the store's own page is next.
7. **Unchanged from fill B**: it starts only on an empty plan (§ 10 there) and never removes a visitor's meal; whole
   plan or nothing at the refusal stage; it presses only the store's own controls; it never submits and never loads
   `/checkout`; the one storage write (the extras key); the screen, its photographs and its logo; the stripped
   checkout (H1–H17); the version line; **an ordinary visitor costs one read of `location.hash` and nothing more.**

## 2. Measure the store before writing the code

The first task is a probe, not code. On the live store, in the one-browser way (a console paste, nothing submitted),
at 1280 and 390 px, record:

1. the stepper a counted meal shows: its element, where its number is, and its "−" and "+" (the sidebar's and the
   card's, if both exist, and which one the store keeps current);
2. the plan's count: the *"N items"* text, the *"Please add at least M meals"* bar, and CHECKOUT's enabled state, each
   read after every press of a 14-meal fill;
3. how long the store takes to show a count, over at least 50 presses at each width, and whether any count appears
   and then goes (the race, seen from outside).

Each selector and text becomes an entry in `storefront/dependencies.json` (F2), so the watch catches a rename. **If
the store has no reliable per-meal count**, this contract returns to the Advisor before any code.

## 2a. Measured, 2026-10-01 — found, not ruled

**The probe**: `tools/storefront-watch/bin/probe-counts.mjs` (red `0fac0b4`, green `691f35f`, `c6d0af9`), headless,
not the one-browser console paste § 2 names: a fresh profile per run, `/order?mpid=23` (Lean 14) **with no `#fitaf=`
fragment**, the first 14 meals with an enabled Add to Cart, each pressed by a `.click()` in the page as fill B presses
it, nothing else pressed or typed. A recorder in the page read every 50 ms. **The batch**: `4686955`,
[`storefront/probe-counts/2026-10-01/`](storefront/probe-counts/2026-10-01/README.md), 14 runs, 21:33–21:35Z, release
`main-EIFLKDHS.js`; at 1280 × 900 and 390 × 844, 5 runs pressing each next meal once the last showed its count, 1 with
200 ms between presses, 1 with none: **196 presses**. A first batch of the same 14 runs on the release before
(`main-6RE6FSMC.js`, 21:27–21:30Z) agreed (196 of 196 counted, none taken back, the plan full in 14 of 14, the longest
95 ms) and is not committed: its summary carried a home path.
HMP released at least twice in the afternoon after `main-XIJ2UX3I.js`, the watch's baseline, which is now behind.

1. **The stepper.** A counted meal's Add to Cart is replaced by `app-counter > div.counter[role=spinbutton]`: the "−"
   `button.counter__button[aria-label="Decrease value"]`, the number `span.counter__value`, the "+"
   `button.counter__button[aria-label="Increase value"]`; **neither button has text** (an SVG each). It is in **both
   card layouts at every width**, the hidden one included: `app-product-card .product__actions` (fill B's card, hidden
   at 390) and `app-product-card-mobile .product-card-mobile__actions` (whose button read "Add"; hidden at 1280). The
   sidebar's row for the meal, `app-cart app-cart-product-card` (matched by its `h4.product__content-title`), has a
   stepper of its own with the same names. **The store keeps all three current, in the same 50 ms read: 196 of 196.**
   So fill C can read the very card it presses, at both widths.
2. **The plan's count.** `span.cart__items-count`, *"1 item"*, *"N items"* (absent while the plan is empty), in
   `app-cart`; and the phone's `.mobile-cart-summary__stat` labelled *"Items"*, its `.mobile-cart-summary__stat-value`
   *"N"* (*"0"* while empty). **Both are in the page at both widths** (one of them hidden) and moved together, with the
   cards, in every read; the store's `hmp_pending_plan_items` count moved with them in 14 of 14 runs.
   `p.cart__progress-label` reads *"Please add at least 14 meals to continue"* **whatever the count**: it is the plan's
   minimum, not a running count; at 14 it reads *"Minimum Met"*. CHECKOUT: `.cart__checkout button` (the sidebar,
   shown at 1280) *"ADD N MORE MEALS TO CHECKOUT"*, *"ADD 1 MORE MEAL TO CHECKOUT"*, disabled, then *"CHECKOUT NOW"*
   enabled; `.mobile-cart-summary__checkout-button button` (shown at 390) *"Add N more meals"*, *"Add 1 more meal"*,
   disabled, then *"CHECKOUT"* enabled. Both exist at both widths.
3. **How long, and whether a count went.** Every press's card showed its count **within 5 s: 196 of 196, none
   never**. ms from the press to the first read that showed it, median / p95 / max: **1280, 47 / 64 / 124 (98
   presses); 390, 48 / 62 / 151 (98)**. ⚠ That is the 50 ms read, not the store: the count was **never on the card
   when `.click()` returned (196 of 196)** and was there by the next read, or the one after when a read came late (the
   151 is in a run whose reads came at most 152 ms apart; the 124 in one at most 130 ms); presses that fell between
   reads (the 200 ms runs) give a median of 23. **No count went down in any run**: no card, phone card or row back to
   Add to Cart, no total decreasing, in the 3 s after the last press too; no card above 1; the plan full in 14 of 14
   (*"14 items"*, CHECKOUT enabled).
4. **Spacing changed nothing**: presses 11–66 ms apart (no wait), 221–262 ms (200 ms gaps) and count-gated were
   all counted, every one.

**The store has a reliable per-meal count** by every measure taken, so § 2's last sentence does not stop this contract.
⚠ **The race was not seen**: 28 runs and 392 presses (both batches) in fresh headless profiles counted everything, as
the Boston record § 46's runs did. So **what the store shows when it drops a press is not measured**: whether the card
never shows its count (§ 1.2's re-press) or shows it and takes it back (§ 1.3's settled check). The probe would tell
them apart; it did not happen. Nothing here argues against § 7 e's defaults (`ACK_MS` 5000 is 33 times the longest
count seen; the store counted presses 11 ms apart); nothing here tests them against the race either.

**Not measured**: the **"+"** (a second unit's count, n + 1: the probe pressed only Add to Cart); a width other than
1280 and 390 (§ 4.3's 2560); a slowed CPU or network; a headed browser, a profile with a past visit, a signed-in
visitor, the Advisor's devices; the page with fill B's screen over it (no fragment: our block did nothing, 0 lines);
what a press asks of the network; the sidebar's own "−" and "+". ⬜ **`dependencies.json` is unchanged**: F2 needs
each literal found in the release's files, and this probe fetched none. Its candidates, for the build: `app-counter`,
`counter__value`, `Increase value`, `Decrease value`, `cart__items-count`, `mobile-cart-summary__stat-value`,
`cart__checkout`, `mobile-cart-summary__checkout-button`, `Minimum Met`.

## 2b. The orchestrator, 2026-10-01: phasing

1. **Phase 2: fill C's behaviour**, § 1 with § 4.1, § 4.2 and § 4.4, **shipped as a Footer block exactly as fill B is
   today**: pasteable, at most 15,360 bytes, every character ASCII, no `<` but the block's own two. One script: fill
   B's press loop replaced, every other rule of fill B kept.
2. **Phase 3: § 3 (served from eatfitaf.com) and § 4.3 (the wider smoke).** Not before Phase 2 is built.
3. **§ 5 is its own contract**, as it says.

**A lead for the Advisor's shortfall, not measured.** The probe read the store's pending list as a count of
`localStorage` `hmp_pending_plan_items`, and in 14 of 14 runs that count moved with the cards and the plan's
*"N items"*: the plan's meals live in `localStorage`. **`localStorage` is one store for every tab of
`fitafnutrition.com` in one browser** (a property of the browser, not something the probe measured), and the store
reads the list when its page starts (`SPEC-rung2-cart-handoff.md` § 10's build note). So a second tab of the store, or
an earlier one still open, is a candidate cause of meals leaving the plan after they were counted, which no fresh
headless profile would show. § 1.3's re-read and § 1.4's check before CHECKOUT are there to catch exactly that: a count
taken back after it was shown.

## 2c. Built (Phase 2), 2026-10-01 — found at the build, not ruled

Red at `a077321`, built at `61352f9`, F2 at `b5220b0`. § 1 and § 4 are unchanged; this section says what the build chose
where they left a choice, and what it found. The text `1e3802b8592cd1a3271860a43895341aa6135d2949d7da83dc388c63fa4fb656`;
the Footer block **13,693 bytes**, the console file 13,674 (from `b5220b0`; 6 more from an uncommitted tree), every
character ASCII, two `<` and zero. **Not pasted**: the store's Footer runs fill B's `cbc6d1ec…` (`5d5fb72`), which
CC-8's golden names as the text this one `replaces`.

1. **"Counted" (§ 1.1) is the card's count above the unit's n**, not equal to n + 1: a press the store counts twice
   within the meal's count is accepted, and a later unit the card already shows is not pressed (FC-5c). **"Above its
   expected quantity" (§ 1.5) is above the link's count for that meal**, read at every one of fill C's reads, for every
   meal, not only the one being pressed; so another tab adding one of the link's meals stops it too (FC-4a).
2. **The press**: the card's Add to Cart while it shows no count, else the counter's "+" (`button.counter__button
   [aria-label="Increase value"]`, inside `.product__actions`); neither at a press or a re-press: a stop,
   `…; no control`. Fill C reads and presses `app-product-card` at every width, as fill B did: § 2a found the store keeps
   its counter current while hidden.
3. **The times, as its timers count them**: the first read MIN_GAP_MS (300) after a press, then 200 ms polls; the re-read
   of § 1.2 is the first poll at or past ACK_MS: **5.1 s**. A unit at its longest (a press and two re-presses) is 15.3 s.
   On a store that counts at once, presses are 300 ms apart (14 meals: 3.9 s of presses, then the 1 s settle).
4. **The settled read runs once** (§ 1.3): its completion goes straight to § 1.4, and a count taken back after it is
   § 1.4's to catch: the plan short, CHECKOUT disabled, a stop naming the meal after 10 s (FC-3b), never silent.
5. **§ 1.4 as built**: wait up to 10 s (fill B's 50 polls) for BOTH an enabled CHECKOUT and the plan's own count equal
   to the link's total. The plan's count is the displayed one of `.cart__items-count` (*"N items"*) and
   `.mobile-cart-summary__stat-value` read as a whole number (the bar's other value, the cart's total, is a price and
   never matches); 0 when neither is displayed (FC-4c: a renamed count stops it).
6. **The stop line (§ 1.6)**: `stopped: the store counted K of N` (K the sum of the cards' counts), then
   `; short: <keys>` and `; over: <keys>` in the link's order, and at § 1.4 `; the plan shows M` and, if CHECKOUT was not
   there at all, `; no checkout control` (where fill B's line was `stopped: no checkout control`). **Which stops name
   the counts**: every stop of fill C's own, between its first press and its press of CHECKOUT. The stops before the
   first press (not on this page, two meals share a key, the plan already holds meals, no meal cards) and after
   CHECKOUT (`/checkout not reached`) keep their lines, and their screen goes at once as before (R2-43).
7. **The screen at such a stop** ("then goes, as today" read as: goes on its own, after the words have been shown): it
   stays, its step line says `data/messages.json`'s new `handoff.stopped`, ⚠ a placeholder for the Advisor's copy
   review: *"We couldn't add all your meals. The menu is next, so you can finish your order there."*, and its own CSS
   clock (`fitaf-z`, **4 s**, in place of its 90 s one; a class `z`, so no timer) removes it. Chrome runs it (FC-6c).
   The smoke judges a stopped run by W10 (the screen gone at the end), so it now reads the faces once that clock has had
   its time (up to 6 s).
8. **The name**: `FILL = "C"`; the log line `fill C, mpid N`. The built files keep fill B's names
   (`fitaf-handoff.fill-B.console.js`), so a runbook that names them still works. The build requires and inlines only
   the words the source reads (`UI.<word>`), so R2-71 still rebuilds the live block byte for byte from its own commit.
9. ⚠ **A known limit (FC-2e)**: a store that counts presses but shows no count would get 1 + RETRIES presses of the
   first meal, all of them counted, before the stop. § 1.2 can only trust a count it is shown; § 2a found the store shows
   one, and F2 now flags a release that renames it.

**§ 4.1, as built** (the site's suite, the shipped text on a synthetic page in a clock: each callback at its due time):
the store drops 15 % of presses, counts the rest 0–2 s late and takes one count back 0–0.8 s after showing it. **FC-7,
200 seeds at both widths, the 14-meal link: 189 reached the full plan, 11 stopped naming the meals short (each a unit
the store dropped three times running), none over**, over 3,393 presses (469 dropped, 2,489 counted more than 300 ms
late, 200 taken back). FC-1 to FC-5 each carry a mutant made in memory that must fail them (fill B's clock with no
count, a re-press on the clock alone, no settled read, no plan count, no over check): all five fail.

**§ 4.2, as built**: fill B's cases run against fill C. Changed for what fill C does, each rule kept: the store's "+" in
place of a second Add to Cart (the synthetic page now draws the store's counter by its live names); the stop lines
naming the counts (R2-09d, R2-16, R2-28e, R2-43, R2-70c); fill C's delays (one MIN_GAP_MS per press, one SETTLE_MS) in
place of PRESS_MS (R2-82 rewritten as fill C's spacing); R2-43 split by stage; R2-74 comparing with the live block but
for the fill's name in its first line; R2-23's third mutant shown passing R2-19 on a page that keeps a held meal's Add
to Cart ("stays"), since the store's own counter now catches it in R2-19 too. **Retired**: R2-22's four "stays"
variants (a reload on a store that shows no count): fill C never reaches seven presses there; FC-2e pins what it does.
Site **508 of 508** (485 + FC-1–FC-7's 27, less those four); watch **144 of 144** (142 + FC-6c's two), in 271 s where
fill B's suite took 966 s (its one second per press is gone).

**§ 4.4, as built**: `LARGEST_PLAN` is read from `data/plans.json` (21 meals a week: Lean, Signature and Performance
21), and the smoke's ceiling is computed for it with fill C's own arithmetic, which W9e checks against the built text's
constants: 30 s for the first card + 10 s for the meals + 21 units at 15.3 s + the 1 s settle + 21 units again (a
completion of a plan whose every count was taken back) + 10 s for § 1.4 + 30 s + 30 s after CHECKOUT and CONTINUE =
**`FILL_LONGEST_MS` 753.6 s, `HANDOFF_MS` 768.6 s** (fill B's were 117 s and 132 s, sized from 7).
- ⚠ **The screen's 90 s clock is far below it**, as § 16 of the two faces' contract found for fill B at 111.4 s: in the
  worst case the screen goes first and the visitor sees the order page while fill C goes on. For 14 meals with the
  cards already drawn, about 16 presses the store drops (each costs one 5.1 s window) fit before CHECKOUT within 90 s.
  Unchanged here; not ruled.
- ⚠ **For Phase 3**: 768.6 s is the smoke's ceiling per width, reached only by a store that withholds nearly every
  count. The hourly workflow's 30-minute timeout holds two widths at that ceiling (25.6 min) but not § 4.3's three
  widths and five runs; Phase 3 sizes it.

**F2** (`b5220b0`): `storefront/dependencies.json` gains the five names fill C reads, each read first in the release's
files: `"counter__value"`, `"counter__button"`, `"Increase value"`, `"cart__items-count"`,
`"mobile-cart-summary__stat-value"`. `npm run watch -- --full --no-browser`: **51 of 51 found** on `main-N64VDY4M.js`
(published 21:59:37Z) and again on `main-SKN6QR4E.js` (22:12:59Z). F1 flagged both against this branch's older
baseline (`main-XIJ2UX3I.js`), as expected; the baseline is not accepted here. Not added: `app-counter` and *"Minimum
Met"*, which fill C does not read.

**The rehearsal** (`b5220b0`'s console file, pasted by the smoke on the live store, the microsite's own 14-meal link from
eatfitaf.com with its photo part; 22:24:01–22:24:50Z, release `main-SKN6QR4E.js`): **PASS at 1280 and 390**. Both:
14 of 14 chosen, `[fitaf-handoff] fill C, mpid 23` · `done: /checkout`, /checkout listing 14 names, *"14 items"*,
$168.00; the screen seen (15 step lines) and gone; the hide list as before, the Total and the pay button displayed,
one-time; the extras pop-up not opened, CHECKOUT to /checkout in 3.6 s and 3.2 s; the Fit AF logo on both faces; Fit
AF's sheet on 14 of 14 slides; 14 order lines in 782 px.

**Not done or not seen**: no paste (the Advisor's); the watch's baseline and expected Footer unchanged (`accept` after the
paste); ⚠ **the "+" has not been pressed on the live store**: the microsite's 14-meal link names 14 different meals, so
the rehearsal pressed Add to Cart only, and the counter's "+" is proven on the synthetic pages alone; a stop of fill C's
own, and its screen, seen only on the synthetic stores; the race itself, which no headless run has reproduced (§ 2a).
Hosting (§ 3) and the wider smoke (§ 4.3) are Phase 3.

## 3. Served from eatfitaf.com, with the paste kept as the way back

1. **The Footer block becomes a loader**: it reads `location.hash` and, only for a deep-cart fragment, creates one
   `script` element whose source is fill C on Fit AF's site; nothing else. ASCII, as few bytes as it can be, and the
   same two `<` the admin accepts.
2. **Two hosts, chosen by the fragment**: `#fitaf=` loads production's file; **`#fitaf-dev=` loads the development
   Worker's** (§ 7 b). So a new fill C is **rehearsed on the live store from the dev Worker, with no paste**, and
   released by the microsite's ordinary release (`fitaf-infra`'s pins).
3. **HMP sends no content security policy** on `/`, `/order` or `/checkout` (measured 2026-10-01, the Boston record
   § 46), so the browser loads the file. The watch checks for one on every release (a policy that appears is a new
   F-check failure, before any customer meets it).
4. **The file carries the version line**; the loader logs which host and which version it loaded.
5. **If the file does not load** (a network failure, an outage of ours): the loader logs
   `stopped: fill C did not load` and nothing is pressed; the visitor has the store's own order page.
6. **Caching**: a short lifetime (§ 7 c), so a release reaches visitors within minutes; a rollback is the previous pin.
7. ⚠ **The release path is GitHub Actions, and on 2026-10-01 GitHub held a release for over five hours.** So the
   build keeps producing the **whole fill C as a Footer block**, and pasting it remains the way back: the Advisor can
   always replace the loader with the full script, as today.
8. **The watch**: F3 compares the loader's text by hash, as today; a new check compares the served file with the
   released one, by hash; the hourly smoke runs through the loader.

## 4. Tests

1. **A store that drops presses.** The synthetic store gains a mode that, by a seeded schedule, drops a press,
   acknowledges late (up to 2 s), and takes one count back after acknowledging it. Fill C reaches the full plan, or
   stops naming its shortfall: **never silently short, never over**, over many seeds.
2. Fill B's cases that still hold run against fill C unchanged.
3. **The smoke**: the 14-meal link by default (the largest plan, not the 7); widths 390, 1280 and 2560; one run with
   the CPU slowed and one with the network slowed; repeated runs (§ 7 d) reported as *K of R passed*.
4. **Budgets sized from the largest plan**: every wait in the smoke and the watch computed for the largest plan the
   menu offers, with the arithmetic in the code (the Boston record § 46: today's were sized from 7 meals).

## 5. The watch on every new HMP release, with an alert

The Advisor (2026-10-01, before the meeting): headless end-to-end runs whenever a new HMP bundle appears, and an alert
when it breaks, *"so we can triage it (and so I can tell the Owner that HMP is breaking the site underneath us)"*. The
hourly watch already finds a new bundle and runs the smoke; **what it lacks is an alert beyond a GitHub issue.** A
separate contract (`SPEC-storefront-watch.md`), after fill C's tests exist.

## 6. Not in this contract

The three-step checkout (after the meeting, its own contract); anything typed into HMP's admin by an agent; any write
to the store's storage beyond fill B's one key; removing a visitor's meal.

## 7. Open, each with the default this contract proceeds under

| | the choice | default until ruled |
|---|---|---|
| a | an over-count fill C caused (a late count plus its own re-press) | stop, press nothing more; the store's own *"REMOVE 1 MEAL"* is the visitor's |
| b | the dev marker | `#fitaf-dev=`, the same payload |
| c | the served file's cache lifetime | 60 s |
| d | repeated smoke runs per width | 5 |
| e | `MIN_GAP_MS` · `ACK_MS` · `RETRIES` · `SETTLE_MS` | 300 · 5000 · 2 · 1000, to be revisited with § 2's measurements |
