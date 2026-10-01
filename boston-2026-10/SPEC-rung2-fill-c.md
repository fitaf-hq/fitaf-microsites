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
