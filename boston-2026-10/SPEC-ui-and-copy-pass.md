# The Advisor's UI and copy pass, by rounds. CONTRACT, before any code

**Written 2026-10-23 (Fit AF session 258), before any code**, from the Advisor's notes on the review page of every
screen and state (Fit AF's decision record `2026-10-17-…` § 7s item 1: *"a detailed UI and copy pass … several tweaks I
want to do throughout"*). Each note is cited by its id on that page (`01-landing-start` a screen; `f-…` a finding). The
pass is iterative (*"I'll definitely have more changes after this, so we should plan to continue iterating"*): each
round is a section here, built on the development line for his look. **The words become `v1` on his word**, after he
has seen a round on dev (SPEC-save-offer-production § 6 item 3), not by this contract.

## 1. Round 1 (2026-10-23): the save step, the card and the small words, before Monday 2026-10-26

**Why first.** The save step goes to production before Monday 2026-10-26 on today's layout; the landing page's redesign
(`01-landing-start`'s second half) is round 2, built after this one, and does not hold the save step.

1. **The offer at the top** (`01-landing-start`): the box loses its heading *"Your Boston offer"*; the offer's line is
   the box's heading, **more prominent**, with a touch of the printed pieces' treatment of the offer (SPEC-print-pieces
   §§ 13–15: the orange field, the heading font, the ribbon), the builder's first proposal, drawn at 390 and 1280 px.
   Its words are a new field of the offer, **`headline`** (`data/offers.json` `offers[].headline`, the Advisor's *"Today
   only: sign up to save 25%"*, *"I'm OK with iterating on it"*); the page box prints `headline`, and **`label` is
   unchanged** wherever it prints today (the save step's line, E1, `/o`): *"Today only"* would be false in a next-morning
   email. An offer without `headline` prints `label`, as now. The box keeps its accessible name.
2. **"Not ready today?" only beside checkout** (`f-save-after`): the save step shows only while the card's *Continue to
   checkout* button shows (*"This is a UX evolution from the initial brief"*), and **after a save it goes away**: the
   form, the lead and the fine print hide; the done line stays where the step was.
3. **Messages where they belong** (`f-save-errors`): an error about a field (the email, the ZIP code) shows under that
   field and marks it (`aria-invalid`, `aria-describedby`); an error about the whole save (the check, the network, the
   offer) shows directly above the button; the out-of-area and done lines in the step's place. Their words unchanged.
4. **"held until", everywhere** (`f-good-until`): `/o`'s *"Good until"* (the unknown link, and the lapse) and every
   *"good until"* a code's line prints read *"held until"* / *"Held until"*, with `consent/DRAFT.md`'s copies.
5. **The privacy page** (`f-privacy-ref`, decision § 7t item 1): § 6's *"As in § 5."* is § 5's retention written out
   (a reader can't follow a section reference); § 6's *"our email providers (Resend, to send; [Mailchimp], for those who
   confirmed)"* names Resend alone (no export to an email provider is built), so no `[bracket]` is left in what the page
   prints. Both edits in `consent/DRAFT.md`, whose status stays a draft until `v1`.
6. **The card's count** (`f-meal-count`): *"N meals/week"* is the number of meals the card lists (the answer set's
   `meals`), not the store plan's count; the price stays the plan's. ⚠ The builder confirms from SPEC-rung2-fill-c § 8
   that the store charges the plan's price for that cart (a 4 plan taking 5 meals, a 14 taking 15); if it does not, the
   build refuses and the report says so.
7. **"See all plans" as discounts** (`f-meal-count`: *"the See All Plans modal should show this all as discounts"*):
   while an offer is current, each plan's weekly price shows **struck through, with its price after the offer's 25%
   beside it** (the percentage read from the offer, never a literal; a total rounded to the cent). ⚠ The Advisor's
   meaning is asked in the same breath; this is the default until he answers.
8. **The chips and the quantities** (`f-wrap`): the five menu chips sit evenly at 390 px (no row of one), the builder's
   layout measured in Storybook at 390 and 1280; **a quantity above 1 is a circled count on the top-right corner of the
   meal's tile** (an app icon's unread badge: the template's tokens, contrast held), not *"× 2"* in the line; a
   quantity of 1 shows nothing. The count is in the row's accessible name (*"2 × Scramble"*).
9. **After the offer ends, the step still saves** (`f-offer-ended`: *"We should still save – we are going to do a
   backup/second chance offer (to be determined)"*), replacing SPEC-save-offer-production § 10.7 item 2's *"no save step"*:
   after the last offer's `valid_to` the step still renders and saves the email and ZIP code (and the tick) **with no
   offer**, under words of its own, a draft (*"Not ready today? Save your plan and we'll email you when our next offer
   opens."*, the button *"Save my plan"*), and **sends nothing**: no E1 is due for a save with no offer until the second
   chance's email exists (a later round; `f-ended-email` is flagged for it). Its record keeps the retention a save's
   rules give it. The lapse pages (`/o`) are unchanged.
10. **Cases first**, each run red before its code: one per item (the page through `page-sim.mjs` on the fixed clocks;
    the Worker through `worker-harness.mjs`; the layout items at 390 and 1280 in `tools/storybook/`), and a mutant for
    items 2, 6 and 9. Every golden that moves is re-recorded once, from the code's own tree, with its proof (S20 moves:
    the card is in the production page). The whole site suite, Storybook, the watch and `npm run contrast` green.
11. **Then** (the orchestrator's): the development pin, and the Advisor's look on dev at 390 px.

**Flagged, not in round 1**: the landing page's redesign (`01-landing-start`, round 2: the offer as a page header with an
angled edge over the carousel, the flyer's logo treatment, *Why Fit AF?* as a text link, the chooser behind *Build my
plan* and a new *Explore this week's offerings*); the Family tab (`f-family-total`, *"improve it overall"*); the ended
email's rewrite (`f-ended-email`); every visitor seeing the Boston offer (`f-boston-everyone`: kept, *"the only people
arriving at the site should be people who came in via the Boston event"*); the Why page's content (`f-why-draft`: the
Owner's answers first, then its draft header goes); the Contains lines (`f-allergens`: the label sheet's, through Fit
AF).

### 1.1 Built — found at the build, not ruled

Built on `boston/ui-copy-pass` from `e875280` (this contract), 2026-10-23. Every case was run one file at a time (or a
named set of files) at `nice -n 15`, beside another team's heavy gates (load average 120 to 400 all afternoon); the whole
site suite once and Storybook's once, each alone, at the tip. `data/save.json`'s `production` is still **false** and the
wording still **`v0.3-draft`**. **Items 6 and 9 are not built** (below: each needs a ruling, and what was found). Item 11
is the orchestrator's.

**Commits**

| commit | what |
|---|---|
| `b8684d8` | items 1–5's cases first, run red on `e875280`'s code; the cases they amend |
| `ce6b54e` | items 1–5, the code; the cases it made stale |
| `aa91b5c` | items 7–8's cases first, run red on `ce6b54e`'s code |
| `ede2e07` | items 7–8, the code; the cases it made stale |
| `dc66868` | the goldens, re-recorded once each from `ede2e07`'s own tree |
| `92b9846` | PV5's golden, missed in `dc66868` and found by the whole suite there, re-recorded once from the same tree |
| the next commit | this section; the README rows; the step's renders in Chrome (`uc-chrome.test.mjs`, test-only) |

**Cases, before and after** (`nice -n 15 node --test <file>`; red on the code before each item's, green at its code)

| case | file | red | green |
|---|---|---|---|
| UC1, the headline (item 1) | `test/uc1-offer-headline.test.mjs` | 2 of 7 (an offer without a headline prints its label; `/o` prints the label: guards) | 7 of 7 |
| UC1 in Chrome, 390 and 1280 | `tools/storybook/test/uc-chrome.test.mjs` | 0 of 1 | 1 of 1 |
| UC2, the step beside checkout, gone after a save (item 2), its mutant | `test/uc2-step-beside-checkout.test.mjs` | 0 of 7 | 7 of 7 |
| UC3, each message in its place (item 3) | `test/uc3-messages-in-place.test.mjs` | 0 of 7 | 7 of 7 |
| UC4, "held until" (item 4) | `test/uc4-held-until.test.mjs` | 0 of 4 | 4 of 4 |
| UC5, the privacy notice (item 5) | `test/uc5-privacy-page.test.mjs` | 0 of 4 | 4 of 4 |
| UC7, See all plans as discounts (item 7) | `test/uc7-plans-as-discounts.test.mjs` | 0 of 5 | 5 of 5 |
| UC8, the count badge (item 8) | `test/uc8-quantity-badge.test.mjs` | 0 of 2 | 2 of 2 |
| UC8 in Chrome, 390 and 1280 (the chips, the badge), and the step's states and See all plans at 390 | `uc-chrome.test.mjs` | 0 of 2 (the chips 1 / 2 / 1 / 1 at 390; no struck price; the step's open, error and saved states already held) | 2 of 2 |

- **UC2's mutant** (item 10's mutant for item 2; on a copy of the built page, in memory): the step placed by the result
  card alone, as before this contract (`besideCheckout`'s one `return` line) fails UC2 at *"#lean-or-5d: no Continue to
  checkout, so no step: Flow 1 is not shown"*; the page as built is its control. ⚠ Items 6's and 9's mutants are not
  built, with their items.
- **Amended with the cases, by what the contract changes** (red first where they pin it): S18 6 of 8 → 8 of 8 (the box's
  markup, the ZIP's message under its field), S22 (the word changed is the one the box prints), S27 1 of 2 → 2 of 2,
  S28 2 of 5 → 5 of 5, S30 1 of 3 → 3 of 3 and S31 0 of 2 → 2 of 2 (the step beside a week's checkout, none on Family,
  one anchor), SP1 4 of 6 → 6 of 6, SP9 4 of 5 → 5 of 5, SP12 4 of 5 → 5 of 5, SP15 5 of 6 → 6 of 6, SP16 and SP17 (the
  pages with the fixture week, run as a browser runs them; green before and after).
- **Made stale by the code, amended with it** (each green after): S11b (an offer may carry `headline` and
  `savings_percent`), S19 and S18 (the step reads `#cc-checkout`, which a page without the card lacks), S23 (save-data's
  headline, and the build's `after`), S26's control (the page takes its date twice now, by the same call), SP4 (no § 6
  placeholder left; the step on the approved page with the fixture week), the SP fixture (no DRAFT fill left; its
  "bracket in § 6" case puts `[Mailchimp]` back to show the gate still refuses one), MS-18 (a line's hidden words read with
  its name), EM8 (the count's badge is not the mark), and in Chrome EM2 (a counted meal's name, badge and hidden words held
  apart, every other box `76ee36e`'s, the line read whole) and W2 (the chips' side padding is now the grid's fit, not their
  look; the button keeps its own).

**Goldens, each re-recorded once from `ede2e07`'s own tree** (`dc66868`; its message carries each line)

- **S20**: `index.html` alone, `34c6b298…` → `23f86157…`, 59,660 → 63,569 bytes (gzip 19,035): both trees' production
  pages differ by 7 lines removed and 57 added in 8 places, every one item 8's (the card's stylesheet: the tile positioned,
  the badge's rules, the chips' grid; `#cc-list`'s `data-meal-qty`; the card's script); every other file byte-identical
  (`diff -rq`). CC-4 reads the same pin.
- **U4** (`node test/u-04-record.mjs --commit ede2e07`): six contents byte-identical; production's three pages +3,909
  bytes each, their visible page at the answered fragments; development's three +9,720 bytes each, their visible page at
  every fragment (the Family anchor is gone).
- **WC-9** (`node test/wc-09-record.mjs --visible-at ede2e07`): `visible` at the 18 answered fragments; `""` and
  `#family`, `picks_data`, `page_sha256` and the sheet unchanged.
- **CC-8b**: `data/offers.json`, `src/worker/messages.js` and `src/worker/redeem.js`; none added or removed; the Footer's
  text and the watch's expectation unchanged (MS-9 and PR-10 read the same golden).
- **M14**: E1's code line, ticked and unticked, *"· good until"* → *"· held until"*, one line each.
- **SP3's base** (`sp-production.mjs` `LATER`): `e875280..ede2e07` over `src/chefs-choice/` and
  `scripts/chefs-choice.mjs`, so the production page is still the base's with SPEC-save-offer-production § 9 item 2's
  reading alone. Items 1–5 and 7 move only the pages that carry an offer, which that page (production false) does not.
- **PV5** (`92b9846`, `node test/pv-05-record.mjs --commit ede2e07`; missed in `dc66868`, found by the whole suite):
  production's `index.html` (S20's pin) and development's `index.html`, `demo/`, `boston/`, `seminar/` and
  `privacy/`, exactly the files the two trees' builds differ in; `recorded_at` `544e496` → `ede2e07`.
- **Not moved**: WC-8's no-picks page, MS's golden, W4 and QE15 (the content of every committed week is byte-identical:
  item 8 reads the count back on the page, so the content does not change).

Sizes, raw / gzip: production 63,569 / 19,035; development `/` 99,913 / 29,685; under SPEC.md § 1's 61,440 gzip.

**The gates at the tip** (each alone, `nice -n 15`; the orchestrator re-runs every gate)

| gate | result |
|---|---|
| `npm --prefix boston-2026-10 test` at `dc66868` (16:26–16:40 PDT) | **1141 of 1143**. The two failures were **PV5** (prod and dev), a golden `dc66868` missed (it pins both builds); re-recorded once at `92b9846` (`node test/pv-05-record.mjs --commit ede2e07`: production's `index.html`, S20's same pin, and development's four pages and `privacy/`, exactly the files the two trees' builds differ in), PV5 alone then 2 of 2. S22 passes (fixed on the dev line). Not re-run whole after `92b9846`, which changes `pv-05-golden.json` alone |
| `npm --prefix boston-2026-10/tools/storybook test` (16:41–16:43 PDT, with `UC_RENDERS`) | **70 of 70** |
| `npm --prefix boston-2026-10/tools/storefront-watch test` | **210 of 211** (16:43–17:06 PDT). The one failure is `test/r2-45-payment-untouched.test.mjs`, a file whose Chrome sat 22 minutes under the machine's load (load average about 200) until its process was stopped by hand; run alone at once after (17:07), 3 of 3 in 21 s. Nothing this contract changes reaches the watch (the Footer block's text and the watch's expectation are CC-8's, unmoved) |
| `npm --prefix boston-2026-10 run contrast` | 94 pairs, 94 pass, 0 problems |

**Where the contract left a choice, and what was chosen**

1. **The box's accessible name** (item 1, *"keeps its accessible name"*): kept as it was, *"Your Boston offer"*, in an
   element the box names it by and does not draw (`<span id="save-title" hidden>`); the step, named by the same element,
   keeps its own. The box's one heading is the offer's line, `h2#save-offer-label` (the headline, else the label).
   Chrome's accessibility tree reads the region by that name (UC1 in Chrome). DRAFT § 1 gains a layout note, not words.
2. **The look** (item 1, *"the builder's first proposal"*): the box an orange ribbon: `--cta` with `--on-cta` words (the
   store button's measured pair, Lc as before; a heading, not a button), Poppins 700 at `clamp(26px, 7vw, 34px)` (27 px at
   390, 34 at 1280: the heading it replaces was 24 px, the line 16), centred and balanced, the print banner's notched
   ends as a 16 px `clip-path` (SPEC-print-pieces § 15 item 2), the words clear of the notches. No banner words: the
   print's banner line is the flyer's, not the page's. Renders below.
3. **The production gate** refuses a placeholder headline as it refuses a placeholder label: the page fills the box in
   the browser, so the build's printed-text check cannot see it.
4. **"Only while the card's Continue to checkout shows"** (item 2) is read off `#cc-checkout` as drawn (it, its list, the
   result card and the panel shown). The step's scripts now run after the card's (the template's `DEV_SCRIPT` after
   `PICKS_SCRIPT`; the production page's bytes do not change, its slot is empty), so on the page's load and on each
   fragment change the step reads what the card has drawn. Family has no checkout button, so no step: the Family anchor
   (`SAVE_FAMILY`) went. A page with no week has no step at all; today's production week gives every answer set a cart.
5. **After a save** (item 2): the step's offer line goes too (*"it goes away"*), with the lead, the form and its fine
   print; the development page's DRAFT tag stays (a development marking). The expansion's save the same.
6. **Messages** (item 3): a field's error is a `p.field-error` directly after its field's label (inside the label it
   would join the input's name), `role="alert"` as the one error was; the field carries `aria-invalid="true"` and
   `aria-describedby` naming it only while it shows. The Worker's own `email_invalid` and `zip_invalid` show there too.
   An error about the whole save is `#save-error`, directly above *Save my offer*, or `#save-expansion-error`, directly
   above *Tell me when you deliver here* (an expansion's). **"In the step's place"** for the out-of-area line is read as
   in place of the offer's own parts: the tick, *Save my offer* and its fine print hide, and the out-of-area line and its
   button read directly after the fields, which stay so the ZIP code can be corrected (editing it brings the offer's parts
   back); Turnstile's slot moved above the tick so an interactive challenge still has a place out of area. Every word
   unchanged (UC3 holds the seven).
7. **The privacy notice** (item 5): § 6's *How long we keep it* is § 5's *Kept for* word for word (UC5 holds the two
   equal). ⚠ It carries *"After export to the email service, deleted from our records"*: no export is built and § 6 now
   names no export provider, so that sentence is for the wording pass (not changed: the contract asked for § 5's
   retention written out). § 6's *Where it's kept* reads *"our email provider (Resend, to send) receives only what it
   needs"*: the singular for one provider.
8. **See all plans** (item 7): the percentage is the offer's new `savings_percent` (25, the one its words name; a whole
   number from 1 to 99 or the build refuses, naming the offer). The build computes each cell's weekly total after it,
   rounded half up to the cent (money in one place: `pricesAfter`, `money()`), into save-data's `offers[].after`; a small
   script of its own (`src/save/plan-prices.js`; Flow 1's render writes only Flow 1) strikes each weekly price through and
   writes the price after it beside it, while that offer is current (`offerForSave` on the send zone's date, as Flow 1
   chooses). At 390 the cells are narrow, so the price after the offer sits under the struck one. The cells'
   `aria-label` is as built: a screen reader hears the list price alone (words for the other are the Advisor's).
9. **The chips** (item 8): a grid of six tracks: three to a row, two for two or four menus, one row for two or three, the
   last two of five sharing theirs (3 + 2 at 390 and 1280), each chip's words wrapping inside it, the chips of a row one
   height; their side padding 20 → 10 px (at 390 a third of the row is 90 px).
10. **The badge** (item 8): a navy circle with white figures, ringed in white, 24 px, on the tile's top-right corner
    (`.cc-qty`, its figure drawn by the style from `data-qty`, hidden from assistive technology). The count is read back
    from the meal's line by the words' `meal_qty` (the build puts it on `#cc-list`), so **the content does not change**
    (every committed week byte-identical; a page and content of different commits degrade to the line as before). The
    line's words stay in the page, the count's part visually hidden, so **the row's accessible name is the line as the
    content wrote it, *"Sizzling Chorizo & Organic Egg Scramble × 2"*** (Chrome's tree, UC8), not the contract's example
    *"2 × Scramble"*: that order would be a new phrase. The snacks' list reads the same way.
11. **The page cases** (item 10, *"the page through `page-sim.mjs` on the fixed clocks"*): UC1–UC3, UC7 and UC8 run the
    page through cc-harness `openPlanPage` (linkedom, its scripts in one context) on `page-sim.mjs`'s fixed clock
    `PAGE_NOW_MS`, the save's Turnstile and Worker stood in for (`uc-harness.mjs`): since item 2 the step shows only
    beside the card, whose script `page-sim.mjs`'s stand-in elements cannot run. S18 and the cases that type into the
    form (S5, S21, SP4, SP10, SP14, SP16) still run through `page-sim.mjs`. The Worker's cases run through
    `worker-harness.mjs` (UC1's `/o` and E1, UC4).

**Found at the build**

1. ⛔ **Item 6 is not built: the store does not charge the plan's price for a 5-meal cart.** SPEC-rung2-fill-c § 8.1 left
   *"whether the store takes a fifth meal on the 4 plan, at what price, and what /checkout shows"* to item 6's smoke. The
   smoke's record (`storefront/footer-block/2026-10-16-fitaf-handoff-8b11e54.md`, `proof`; Fit AF's decision record
   2026-10-16 § 2 item 7, measured 2026-10-16 19:37 PDT): **5 of 5 meals at $13.00, total $65.00** on Lean's 4 plan
   (mpid 20), whose weekly price is **$52.00** (4 × $13.00). The store charges the plan's price per meal for each meal,
   not the plan's weekly price for the cart, so the card's *"5 meals/week"* beside *"$52.00/week"* would understate the
   cart by $13.00. The 14 plan with 15 meals was not measured. What the card should say and price for those carts is the
   Advisor's (§ 8.1's ⬜ already names it). The card still shows the plan's count, as before.
2. ⛔ **Item 9 is not built: no rule gives a save with no offer a retention, and it cannot be stored without one.** The
   lapse deletes an offer save's contact 30 days after **its offer's** `valid_to` (`src/worker/lapse.js` rule A, by
   `offer_id`); a save with no offer has none, so its email and ZIP would be kept with no end, against DRAFT § 5 and the
   step's own fine print (*"We delete your details 30 days after the offer ends unless you've confirmed"*). Also, as
   built: a save always writes `message_state` `scheduled` (`save-store.js`), so *"sends nothing"* needs a state of its
   own; `saves` requires a token for kind `offer` (its CHECK); and the tick's confirmation link travels in E1, so with no
   E1 a tick could never be confirmed (*"We'll ask you to confirm"*). Needed, by 2026-10-30 (the first day it applies):
   how long such a save is kept, and the fine print and tick its step shows. Until then § 10.7 stands: after the last
   offer, no step (the render below), and a page left open past midnight on 10-29 still gets *"Something went wrong"* for
   `offer_ended`, its words unchanged.
3. ⚠ **Item 7's default prints a price the store does not charge.** SPEC-save-offer-production § 10 item 1: *"A customer
   pays the store's list price … No code is issued"*. The struck price is the list price; the price beside it (Lean 7:
   $87.50 → $65.63) is not charged anywhere. On the development page that is the Advisor's to look at; on eatfitaf.com
   (once `production` is true) it would be a public price promise. His answer to *"as discounts"* is needed before the
   production pin. (The brief's own framing, *"Estimated value ~120–160% of current list price; Your value: current list
   price"*, would strike a value above the list price and show the list price beside it: the other way round.)
4. A page that carries a week but no cart for the answers (`#lean-or-5d` in the fixture) shows *Choose your meals* and,
   since item 2, no step; every answer set of the week delivered 2026-11-01 has a cart.
5. CC-7a refuses the card's words in `build.mjs`'s comments; the step's comments name `#cc-checkout`.

**Renders** (Chrome, the development build with the week delivered 2026-11-01 or none, every photograph refused, the
clock at noon in New York on 2026-10-24; written by `UC_RENDERS=<dir> node --test tools/storybook/test/uc-chrome.test.mjs`,
never committed; the build's were written to a scratch directory outside this repository and handed to the orchestrator):
- `uc1-offer-box-390.png`, `uc1-offer-box-1280.png`, `uc1-offer-box-in-page-390.png`: the offer box, its headline on the ribbon;
- `uc2-step-open-390.png`: the card with Continue to checkout, then the step open;
- `uc3-step-email-error-390.png`: an email refused, its message under the field;
- `uc2-step-saved-390.png`: after a save, the done line alone;
- `uc9-after-the-offer-top-390.png`, `uc9-after-the-offer-end-390.png`: on 2026-10-30, no box at the top and no step after the card (§ 10.7, item 9 not built);
- `uc8-card-390.png`, `uc8-card-1280.png`: the five chips three then two, and the breakfasts' badges (the week delivered 2026-11-01, Lean, weekdays, breakfast);
- `uc7-all-plans-390.png`: See all plans, each weekly price struck through, its price after 25% beside it.

### 1.2 Rulings, 2026-10-23 (night): the card's price, the plans' marked-down prices, and a save after the offer. CONTRACT, before any code

**The Advisor** (Fit AF's decision record `2026-10-17-…` § 7t item 15), on § 1.1's three open items.

1. **Item 6, the card's count and price** (*"yes please fix this math"*): the card's count is the meals it lists, and
   **its weekly price is the plan's price a meal times that count**, as the store charges it (the 2026-10-16 smoke: five
   meals on Lean 4 at $13.00, $65.00): *$65.00/week · $13.00/meal · 5 meals/week*; the 15-meal cart on the 14 plan by the
   same rule. A row whose meals equal its plan's count is unchanged. Every place the card's weekly total prints follows.
2. **Item 7, corrected: the store's price is the price paid; the struck price is the higher one.** ⛔ § 1 item 7's
   default and § 1.1's build had it backwards (the list price struck and a lower price beside it, a price nobody can pay).
   The record (Fit AF's decision `2026-10-17-…` § 7d: *"The price a customer pays is today's list price in every case;
   only the value we say it is worth changes"*; § 7r item 5: the 25% *"was a marketing exercise … we're showing marked
   down prices on the site"*, from his note *"Estimated value: {~120-160% of current list price}; Your value: {current
   list price}"*); and the Advisor now: *"The HMP storefront \*effectively\* has the discount applied. The microsite shows
   the un-discounted price struck through. It is currently \*impossible\* to pay the non-discounted price."* So while an
   offer is current, **See all plans shows each plan's weekly price as the store charges it, and beside it, struck
   through, that price ÷ (1 − the offer's share)**, rounded to the cent (Lean 7: ~~$116.67~~ **$87.50**); the share is a
   number of the offer (`data/offers.json` `offers[].percent_off`, 25, beside its label; the build refuses a label whose
   percentage disagrees with it), never a literal in the code. With no current offer, the list price alone, as before.
3. **Item 9, a save after the offer ends** (*"This whole section is going to get updated – but your ideas are good so
   please implement them"*): after the last offer's `valid_to` the step still renders, worded *"Not ready today? Save
   your plan, and we'll email you when our next offer opens."* and its button *"Save my plan"* (draft words, the page's
   words file); it saves the email, the ZIP code and the tick **with no offer**, and **sends nothing**: no E1 is scheduled
   for it (a state of its own, not `scheduled`). **It is kept 30 days from the save, or until the second-chance offer's
   email is sent, whichever is first**, then deleted unless its tick was confirmed; the tick's confirmation travels in
   that email when it exists. Its fine print says so in the step's own words (a draft). The out-of-area path unchanged.
4. **Cases first**, red on `9b1438c` before the code: the card's total for a 5-meal and a 15-meal row and an unchanged row;
   See all plans' struck price for each plan and the price beside it equal to the store's (no price below the list); the
   refusal of a label/`percent_off` mismatch; a save after `valid_to` stored with no offer, no E1 due, purged at 30 days
   and kept while confirmed; the step's words after the end. Mutants: the struck price computed from the wrong side
   (list × 0.75), and an E1 scheduled for a save with no offer. Goldens moved once, with proof; the whole site suite,
   Storybook, the watch and contrast green.

### 1.2.1 Built — found at the build, not ruled

Built on `boston/ui-copy-pass` from `9b1438c` (§ 1.1's tip), with `bd80a41` (§ 1.3's contract) beneath the code,
2026-10-23 (night, Pacific). As § 1.1: each case one file at a time (or a named set) at `nice -n 15`, beside other teams'
gates (load average 150 to 560); the whole site suite and Storybook's alone at the tip, twice (the help line, 2, came
after the first run; § 1.3.1).
`data/save.json`'s `production` is still **false** and the wording still **`v0.3-draft`**.

**Commits**

| commit | what |
|---|---|
| `ab847b1` | the cases first, run red on `9b1438c`'s code; the cases they amend |
| `eae4d94` | item 1, the code, alone (so SP3's base can take its diff); MS-3 and MS-10 amended |
| `dbfcb62` | items 2–3, the code; DRAFT § 1's *After the offer ends*, §§ 5–6's retention of such a save; S11b, S23 and SP3's list of moved Worker files amended |
| `58cbd2a` | EM2 in Chrome amended for item 1 (test-only) |
| `057a5b1`, `c84a5dc` | the goldens, re-recorded once each from `dbfcb62`'s own tree; the date in S20's note |
| `190d012` | found in Chrome at the build (below, 2): the email field's help line after the end, its cases first, red on `c606b2e` |
| `e8fd524` | its code: the field's own help line after the end |
| `774e4db` | PV5 and U4 re-recorded once from `e8fd524`'s tree: the development pages alone |

**Cases, before and after** (red on `9b1438c`'s code, green at the code)

| case | file | red | green |
|---|---|---|---|
| UC6, the card's count and weekly price (item 1) | `test/uc6-card-price.test.mjs` | 2 of 3 (the control and the unchanged rows: guards) | 3 of 3 |
| MS-1, the eight rows' figures, the same rule | `test/ms-01-eight-rows.test.mjs` | 1 of 2 | 2 of 2 |
| UC7, See all plans corrected (item 2), its mutant in a mirror (the struck price from the wrong side, list × 0.75) | `test/uc7-plans-as-discounts.test.mjs` | 1 of 6 | 6 of 6 |
| UC9, a save after the offer's end (item 3), its mutant in a copied Worker tree (an E1 scheduled for a save with no offer) | `test/uc9-save-after-the-offer.test.mjs` | 1 of 6 (the live offer's control); with the help line, 4 of 6 on `c606b2e` | 6 of 6 |
| S14 and S15 (the lapse's fourth rule, `no_offer`), S18 (§ 1 ends at the step after the end), SP16 (after the end, the step with no offer and the save kept) | `test/s14-*`, `s15-*`, `s18-*`, `sp16-*` | amended with the cases | green |
| In Chrome at 390: the struck price above the price paid; the step after the end; the card of a 5-meal row | `tools/storybook/test/uc-chrome.test.mjs` | amended with the cases | green |

**Made stale by the code, amended**: MS-3 (the default rows: five meals at the 4 plan's price); MS-10's rounding-up mutant
(MS-1 now sees it by the 7 plan's price a meal, $12.50 for $13.00, the meals being five either way); S11b (an offer may
carry `percent_off`; `savings_percent` went); S23 (save-data's `struck`); SP3's moved Worker files (`lapse.js`,
`save-store.js`, `scheduled.js`); EM2 in Chrome (the one-list week opens `#performance-or-5d`, a 5-meal row: its two
figures as item 1 makes them, the boxes of those two and their units held apart, every other box the base's).

**Goldens**, once each, from `dbfcb62`'s own tree (`git archive`), each against `9b1438c`'s: S20 (and CC-4)
`index.html` alone, by item 1 (3 lines out, 5 in: `#plan-data`'s meals and totals, `app.js`'s lines writing them; every
other file byte-identical by `diff -rq`); WC-8's no-picks page; U4 (production's three pages +531 bytes, development's
+2,451); WC-9 (the four fragments of the two answer sets above their plan); PV5; CC-8b (`data/offers.json`,
`data/save.json`, `src/worker/index.js`, `lapse.js`, `save-store.js`, `scheduled.js`); SP3's base takes
`bd80a41..eae4d94` over `src/app.js` and `build.mjs`.

**Found at the build, not ruled**

1. ⚠ **Item 3's *"or until the second-chance offer's email is sent"* has no email to wait for.** Nothing in this build
   sends a save with no offer anything: `data/offers.json` holds no next offer, and E1 is the only message that carries
   the tick's confirmation link. So today every such save is deleted at 30 days whatever its tick; *"kept while
   confirmed"* (UC9) is reached only by marking the contact confirmed in the store directly, never by a visitor. The
   second chance's email, and the confirmation it carries, need a contract of their own once that offer exists.
2. ⚠ **Found in Chrome, not by a case: after the end the email field still said *"we'll send your link here
   tomorrow"*,** a link never sent (the step after the end kept *"the fields … as above"*). The field now has its own help
   line after the end, proposed: *"we'll email you here when our next offer opens"*; UC9 and the Chrome case hold it. The
   tick's *"We'll ask you to confirm"* is unchanged: true only once the second chance's email exists (1).
3. **The step's email help line, fine print and done line after the end are proposed words** (DRAFT § 1 *After the
   offer ends*); only the lead and the button are the Advisor's. Fine print: *"We'll keep your email and ZIP code for 30 days, or until we email
   you about our next offer, whichever comes first, and then delete them unless you've confirmed. Only if you tick the box
   and then confirm it will we send you anything else. We don't sell your information."* Done line: *"Saved — we'll
   email you at (their email) when our next offer opens."* No offer line and no date held are drawn.
4. **The share's check reads the first percentage in the label and in the headline** (`25%`); a label naming none
   passes, and a second percentage in one field is not read. Boston's label and headline each name 25%.
5. **The struck price is the store's weekly price × 100 ÷ (100 − the share), rounded to the cent** (Lean 7: $87.50 →
   $116.67, 11,666.67¢); it is above the price paid by construction, so *"never below the list"* holds for every share
   the build accepts (1 to 99).
6. **SP3's base** cannot take item 1's doc-comment hunk (the base's comment, `768ca36`, predates the preview build's
   wording), so SP3 leaves out a hunk whose every changed line is a comment (`codeOnly`, for that entry alone); its code
   hunks apply and the base builds S20's page.
7. **The out-of-area path is unchanged after the end** (an expansion save never needed an offer); no case of its own
   was added for it after the end.

### 1.3 The privacy page in production before the drawing, apart from the save step. CONTRACT, before any code

**The Advisor** (Fit AF's decision record `2026-10-17-…` § 7u item 1, *"yes please"*), on a measurement: the entry
cards printed for the Boston events (`SPEC-print-pieces.md` § 17) say *"Privacy: eatfitaf.com/privacy/"*, and production
answered **404** there (2026-10-23 about 23:20 PDT, `curl`; `/privacy` and `/privacy/index.html` too), because the
production build writes `/privacy/` only with `data/save.json` `production` true (SP9). The events start Monday 10-26.

1. **Production carries `/privacy/` once `consent/DRAFT.md` § 6 is approved, whatever `production` says.** § 6's
   approval is one line inside § 6, `<!-- approved YYYY-MM-DD -->` (the words files' convention), written only on the
   Advisor's word, never by the build or an agent. With it and `production` false, the production build writes
   `privacy/index.html` exactly as with `production` true (no DRAFT tag; § 6's paragraphs; no script) and **nothing
   else changes**: `index.html` and every other file byte for byte (S20; PV5 moves by that one file). Without it, as
   today. With `production` true, as today (its v1 refusals unchanged).
2. **A bracket left in an approved § 6 refuses the production build**, naming the page (SP9's rule, now with `production`
   false too); so does a marker whose date is not a real date.
3. **§ 6 gains the drawing's paragraph**, after *What we collect and why*, in § 6's own form (a blockquote line opening
   with a bold heading). Draft words, until his look:

   > **Our Boston drawing.** If you entered our drawing at a Boston event (October 26–29, 2026), we keep only the email
   > on your card — nothing else from a business card — to draw the winner on October 30, tell them, and email you about
   > our meals and offers, as the card says. Photos of the cards are deleted once the winner has accepted, and the cards
   > are shredded. Unsubscribe from any email at any time, or ask us to delete your entry: privacy@eatfitaf.com.

   The development build's `/privacy/` carries it at once (DRAFT-tagged, as now).
4. **Cases first**, red on § 1.2's tip: SP9 amended (`production` false with § 6 approved: the page, § 6's paragraphs
   in order, no DRAFT tag, no script, the template's tokens; without the marker: no page; a bracket with the marker, or
   a marker with a bad date: refused, naming the page); the drawing's paragraph on both builds' `/privacy/`, in its place.
   Mutant: the marker ignored (a production build without it writes the page). Goldens moved once, with proof (PV5 by
   exactly the privacy pages). The whole site suite, Storybook, the watch and contrast green.
5. **Not here**: the marker itself (after his look at the development page at 390 px); the production pin (`fitaf-infra`);
   `privacy@`'s mail, which has no MX until `fitaf-infra` 1.12's forwarding (release (a)): until then the page names an
   address that bounces, which is his to weigh.

### 1.3.1 Built — found at the build, not ruled

Built from § 1.2's tip (`c84a5dc`), 2026-10-23 into 2026-10-24 (night, Pacific), as § 1.2.1 says. ⛔ **The committed
`consent/DRAFT.md` carries no approval line**: the cases write theirs into a copy (`build()`'s `draftPath`), and SP9
holds the committed file to none (a control). So the production build is unchanged (S20), and `/privacy/` reaches
production only when the Advisor's line is written and the site released.

**Commits**

| commit | what |
|---|---|
| `c94e470` | SP9's cases first, run red on `c84a5dc`'s code |
| `b1e29d7` | the code: § 6's approval line read; with it and `production` false, the production build's `/privacy/`; the drawing's paragraph in § 6 |
| `ef64d79` | PV5 re-recorded once from `b1e29d7`'s own tree: the development `privacy/index.html` alone |
| `c606b2e` | the development `/privacy/` in Chrome at 390 (test-only); the README rows |
| the next commit | §§ 1.2.1 and 1.3.1; `uc-chrome`'s server closed when Chrome fails to launch (test-only, below) |

**Cases, before and after**

| case | file | red | green |
|---|---|---|---|
| SP9 amended: approved with `production` false (the page, § 6's paragraphs in order, no DRAFT tag, no script, the template's tokens, the same bytes `production` true writes, every other file byte for byte; without the line no page); a bracket, or a malformed line, refused naming the page; the drawing's paragraph on both builds' page; its mutant in a mirror (the approval line ignored) | `test/sp9-privacy-page.test.mjs` | 3 of 9 | 9 of 9 |
| The development `/privacy/` in Chrome at 390: § 6's paragraphs drawn in order, the drawing's after *What we collect and why*, the DRAFT tag, no sideways scroll | `tools/storybook/test/uc-chrome.test.mjs` | (new with the code) | 1 of 1 |

**Goldens**: PV5 alone, by the development `privacy/index.html` (one paragraph added; `diff -rq` of both trees'
builds). S20 and every production file unchanged.

**Found at the build, not ruled**

1. **The line is exactly `<!-- approved YYYY-MM-DD -->`, one, inside § 6** (between its heading and § 7's), its date a
   day of the calendar. The flyer's words files mark approval with `<!-- approved -->` and no date; in § 6 that form is
   refused, as is a second line or any words after the date (*"<!-- approved 2026-10-26 by me -->"*). A line outside
   § 6 is not read.
2. **A malformed line refuses every build**, the development and preview builds too: the line is read before the
   target is, so it is caught before a deploy of either. A well-formed line changes the production build alone.
3. **With the line and `production` false, the page is held to the production step's rule for printed words** (no
   bracket, no draft tag: `scripts/production-inputs.mjs` `printedRefusals`, now exported). The step's other v1
   refusals (the wording's version and status line, the offers, the ZIP list, the sender, the site key) are not asked:
   the page prints none of them. With `production` true, as before.
4. **No production page links to `/privacy/` while `production` is false** (the step, which carries the link, is not on
   it): the page is reached by its address, from the cards.
5. ⚠ **The page now names `privacy@eatfitaf.com` three times** (*Who we are*, the drawing's, *Your choices*), and § 1.3
   item 5 stands: it has no MX until `fitaf-infra` 1.12's forwarding.
6. ⚠ **§ 6's *How long we keep it* does not mention the drawing**, and the drawing's paragraph gives no period for the
   entrant's email (it does for the photos, until the winner accepts, and the cards, shredded); read together, the email
   is kept until an unsubscribe or a request. Whether *How long* (and § 5's *Kept for*, which UC5 holds it to) gains the
   drawing is his; nothing was added to either.

**Gates at the tip, for §§ 1.2 and 1.3** (`774e4db`, each alone, `nice -n 15`, beside other teams' gates at load
average 60 to 560):

- the whole site suite, `npm --prefix boston-2026-10 test`: **1,157 of 1,157** (also 1,157 of 1,157 at `ef64d79`,
  before the help line);
- Storybook's, `npm --prefix boston-2026-10/tools/storybook test`: **70 of 71** in the one run; UC1 failed on Chrome's
  launch (*"Timed out after 30000 ms while waiting for the WS endpoint URL"*, load about 370), and the file then did not
  exit: its `withPage` started the static server before the launch and closed it only inside a `try` the failed
  launch never entered. Stopped after 20 minutes; the server now closes when the launch fails (test-only, the next
  commit), and `uc-chrome.test.mjs` **re-run alone: 4 of 4**. (71 of 71 at `c606b2e`, before the help line.) ⚠ Five
  other Chrome files start their server the same way (`em-`, `ms-`, `pr-`, `ss-`, `w-why-chrome.test.mjs`); not
  changed here;
- the watch, `npm --prefix boston-2026-10/tools/storefront-watch test`: **213 of 213**;
- contrast, `npm --prefix boston-2026-10 run contrast`: **94 of 94**.

**Renders** (Chrome at 390, the development build with the week delivered 2026-11-01 or none, every photograph refused;
`UC_RENDERS=<dir> node --test tools/storybook/test/uc-chrome.test.mjs`, never committed, handed to the orchestrator):
- `uc7-all-plans-390.png`: See all plans on a day of the offer, each plan's weekly price as the store charges it, beside
  it the higher one struck through (Lean 7: ~~$116.67/wk~~ $87.50/wk);
- `uc6-card-5-meals-390.png`: the card of five meals on the Lean 4 plan, *$65.00/week · $13.00/meal · 5 meals/week*;
- `uc9-step-after-the-offer-390.png`: on 2026-10-30, the step after the card, its own lead, help line, button and fine
  print, no offer line;
- `uc13-privacy-390.png`: the development `/privacy/`, DRAFT-tagged, the drawing's paragraph after *What we collect
  and why*;
- and § 1.1's, redrawn: `uc1-*`, `uc2-*`, `uc3-*`, `uc8-*`, `uc9-after-the-offer-top-390.png`.

## 2. Round 2, changeset 1 (2026-10-25): who it is for first, the goal last, the portion-size helper beside it. CONTRACT, before any code

**The Advisor, 2026-10-25** (verbatim): *"First, please move "What's your goal" to the *end* of the set of questions
(after snacks). Then near "What's your goal", add a "Find my portion size" (or similar) that expands to include our
calorie/protein calculator (which is currently arbitrarily placed near the bottom of the page). Then change "Invididual /
Family" into a question (it will now be the first one). … If "Family" is selected, we should stay on this page and ask
all of the same questions."* And: *"Update "Prices as of 2026-09-27." to "Prices as of 2026-10-25." please."*

1. **The order of the questions** (SPEC-meal-selection § 1's questions, their answers and defaults unchanged): first
   **who it is for** (item 2), then the four meal questions in today's order (lunch or dinner, weekends, breakfast,
   snacks), then **What's your goal?** last. Every question still answers where it is; the result (the price, the card,
   *Choose your meals*) still appears once the questions it needs are answered — which now means after the goal, the
   last. The card and the cart are unchanged by the order (same answers, same cart).
2. **Individual / Family becomes the first question**, in the look of the other questions (a heading and two answer
   buttons), replacing the two tabs. Its heading is **"Who is this for?"** (the tabs' own accessible name today,
   `aria-label="Who is this for?"`; ⚠ the Advisor's wording to rule, item 7) and its answers **Individual** and
   **Family**, Individual the default on the left (§ 12's rule). Its phrases live in `data/messages.json` as every
   question's. The fragment's `#family` and `#individual` still land on that answer.
3. **Family, until item 7 is ruled**: choosing Family shows today's Family section (`familySection`: its promise, its
   price, its door) in place below the question, and hides the four meal questions, the goal and the individual result;
   choosing Individual brings them back with every answer kept. ⬜ *"stay on this page and ask all of the same
   questions"* for Family is item 7's.
4. **Find my portion size**: directly below *What's your goal?*'s answers, a disclosure button **"Find my portion size"**
   (⚠ wording to rule, item 7), collapsed by default, that opens the existing calculator (`src/save/share-panel.html`,
   *"What share of my day is that?"*, its fields, help line and arithmetic unchanged) **moved there** from its place below
   the save section; nowhere else on the page. Opening it moves nothing above it; its state is not remembered (no storage).
5. **The price date**: `data/plans.json` `read_on` becomes `2026-10-25` **only once the prices have been re-read off
   `read_from` that day** (its rule, `data/README.md`: "read by a person off `read_from` on `read_on`"); the
   orchestrator does the reading and gives the builder the result: unchanged prices change only the date; a changed price
   is its own ruling.
6. **Cases**, written first and run red: the order of the five headings on the page (who it is for, the four, the goal);
   the result only after the goal; `#family`/`#individual` land on their answers; Family hides the rest and shows the
   Family section, Individual restores every answer; the disclosure collapsed by default, opening the calculator, which
   is in the page exactly once; no storage touched (T5); the footnote's date is `plans.json`'s. Goldens that pin the page
   (S20, PV5, U4, WC-8/9, CC-4) move by exactly these changes and are re-recorded in their own commit, each named. The
   Storybook stories of the page follow (SPEC-storybook-microsite).
7. ⬜ **Open for the Advisor** (the builder builds items 1–6 and states these, never decides them): the first question's
   wording; the disclosure's wording; and **Family with "all of the same questions"**: the store sells Family as one
   product today (`plans.json` `family`: 1 meal a week, 3–4 servings, mpid 35, $38 a meal), so what the four meal
   questions and the goal choose for a family (how many family meals, whether the goal applies, whether Chef's Choice
   applies) is his to say before it is built.

### 2.1 Built — found at the build, not ruled (2026-10-25)

Built on `boston/round-2-questions` from `81a1199` (this contract), 2026-10-25. Each case run one file at a time at
`nice -n 15`, beside other teams' gates; the whole site suite and Storybook's alone at the tip.

**Rulings received at the build** (the Advisor, 2026-10-25, through the orchestrator), built in: (1) item 2's words, the
heading *"Who is this for?"*, the answers *"Just me"* (the default, on the left) and *"Me and my family"*; (2) item 4's
words, *"I'm fine keeping it whatever copy we have"*: the disclosure's label is the calculator's own heading, *"What share
of my day is that?"*, and *"Find my portion size"* is printed nowhere; (3) item 5 is the builder's: the orchestrator
re-read every price on the store that day (the 15 individual plans' order pages and Family's) and every price and minimum
matched, so `read_on` alone changes; (4) item 7, Family: a line in the Family section that it serves a family of 3–4,
from `plans.json`'s `servings`; Family's own questions are § 2.2's contract, not built here.

**Commits**

| commit | what |
|---|---|
| `9ac1f43` | the cases first, run red on `81a1199`'s code; the cases they amend |
| `8bfe4f8` | items 1–6, the code; the cases it made stale |
| `99f4680` | the goldens, once each from `8bfe4f8`'s own tree; the three recorders' `--release-a`; SP3's base |
| the next commit | this section; the README rows; Chrome PR-14 amended (below) |

**Cases, before and after** (`nice -n 15 node --test <file>`; red on `81a1199`'s code, green from `8bfe4f8`)

| case | file | red | green |
|---|---|---|---|
| UQ1, the order (item 1): the five headings, the result after the goal, the result waiting for the goal and Q1 in either order, the same card whatever the order | `test/uq1-question-order.test.mjs` | 2 of 4 fail (the waiting and the card: guards) | 4 of 4 |
| UQ2, the first question (item 2): no tabs; its look, words and order; `#family` / `#individual`; a press's fragment; its words data's; three refusals | `test/uq2-who-question.test.mjs` | 8 of 8 | 8 of 8 |
| UQ3, Family (item 3, § 2.1's line): its section directly below the question, the individual parts hidden, every answer back; the line data's, refused missing | `test/uq3-family.test.mjs` | 3 of 3 | 3 of 3 |
| UQ4, the calculator (item 4): below the goal's answers behind its heading, collapsed; once on the page, moved, its words `81a1199`'s; opening moves nothing above; its arithmetic `ms-golden.json`'s; no storage; none on production | `test/uq4-portion-size.test.mjs` | 5 of 6 (production's none: a guard) | 6 of 6 |
| UQ5, the footnote's date (items 5–6): *"Prices as of 2026-10-25."* on both builds; `plans.json` otherwise `81a1199`'s; the footnote follows `read_on` | `test/uq5-footnote-date.test.mjs` | 1 of 3 | 3 of 3 |
| UQ1–UQ4 in Chrome, 390 and 1280 | `tools/storybook/test/uq-chrome.test.mjs` | 10 of 10 | 10 of 10 |

- **Amended with the cases, by what the contract changes** (red first): PR-14 1 of 1 (the headings' order), PR-9 1 of 1
  (the date), MS-4 1 of 4, MS-12 2 of 5, S28 1 of 5, S30 2 of 3 (the tabs are the first question's answers, `#who-*`),
  S27 1 of 2 and S31 2 of 2 (question 1 is `#q-who`, read first on Family too), W1 2 of 2, and in Chrome W2/W3 8 of 12
  (the Why button directly above the first question), MS-8 2 of 19 (five questions' words), MS-13 1 of 1 (the Family
  panel as before with exactly two changes undone, each found once). ⚠ W3 passed on the old page in the first red run
  (its walk ran to the end of `main` with no `#who`): its control that the first question is in the markup was added
  and W3 run again red, 3 of 3, before the code.
- **Made stale by the code, amended with it**: PR-2 (the carousel above the first question), T1 (`read_on`'s literal,
  found by the whole suite), UQ4's count of the heading (it counted `share.js`'s own comment: a defect of the case, found
  at green), `uc-chrome`'s render span (`#who` for `main .tabs`); and found by Storybook's whole run at `99f4680`, the
  Chrome PR-14 (six headings centred, not five; red on `81a1199` by construction, not run there).

**Goldens, each re-recorded once from `8bfe4f8`'s own tree** (`99f4680`; its message carries each line). The contents
are unchanged everywhere; the pages move by § 2's lines alone (both trees' production and development pages compared
line by line: the tab rules, the panels' padding and the 720 px rule out; the first question in the tabs' place; the
panels' tab roles out; the goal's group after the meal questions; the Family line split; the footnote's date; `app.js`'s
`tab` named `who` and the tabs' wiring replaced; on the development page also the calculator moved, its heading a
button, and `share.js`'s toggle).

- **S20** (CC-4 reads it): `index.html` alone, `23b3af63…` → `841949a3…`, 64,100 → 64,197 bytes (built with production
  false, as S20 builds since SPEC-save-offer-production § 12).
- **PV5**, **U4**, **WC-9**: recorded by `pv-05-record.mjs --commit 8bfe4f8 --release-a`, `u-04-record.mjs --commit
  8bfe4f8 --release-a`, `wc-09-record.mjs --visible-at 8bfe4f8 --release-a`. PV5: production's `index.html` and the
  development `index.html`, `demo/`, `boston/`, `seminar/`; `privacy/` unchanged. U4: the six contents byte-identical,
  production's pages +97 bytes, development's +1,738, the visible page at every fragment. WC-9: `visible` at all 20
  fragments; `picks_data`, `page_sha256` and the sheet 409b805's.
- **WC-8**: `f3cd8763…` → `b4a168dc…` (`c6dd3a5`'s tree reproduces `f3cd8763…`).
- **CC-8** (CC-8a/b/c, MS-9, PR-10) and **R2-32**: item 5 moves `data/plans.json` in the Worker's reach (`46542b6f…` →
  `3c1f8ed6…`) and the Footer block's text (below, 1).
- **SP3's base** (`sp-production.mjs` `LATER`): below, 3.

Sizes, raw / gzip: production (production false) 64,197 / 19,205; development `/` 104,388 / 30,780; under SPEC.md § 1's
61,440 gzip.

**Where the contract left a choice, and what was chosen**

1. **The first question's markup**: `div.step#who`, a group named by its `h2.step-label#q-who`, as every question's;
   its answers two `button.choice` in the meal questions' style (`.choices.counts`), `data-who="individual|family"`,
   `#who-individual` / `#who-family`, each `aria-controls` its panel and `aria-pressed`. Not `data-q`: that is the meal
   selection's vocabulary (A3's, and the analytics beacon's), and the tabs were never counted, so the first question is
   not either (⚠ whether to count it is the Advisor's). `js-only`, as the tabs were: without script both panels show,
   as before. The panels keep their ids; their tab roles went. The default is the page's own start (the individual plan,
   as the tabs'), not a data default (`plans.json` changes by `read_on` alone), and its answer is first (`WHO`).
2. **The tabs' arrow keys went with them**: the two answers are reached by Tab, as every question's.
3. **The Why button stays directly above the chooser** (SPEC-every-menu-and-nutrition § 11 item 5), now the first
   question, centred above it; the question spans the column, so the 720 px rule that centred the button on the 420 px
   tabs went, and its entry in the preview build's cut list (`PREVIEW_WITHOUT_WHY`) with it. The panels' own 28 px went
   too: each question's margin keeps them apart, as before.
4. **The calculator is the development page's alone** (`devSlots`' `SHARE_PANEL`; the production page has never carried
   it), so the disclosure is too: eatfitaf.com shows no calculator, as before. ⚠ Whether production should carry it is
   not this contract's.
5. **The disclosure** (ruling 2): the calculator's heading's words became its button, inside the `h3` (the phrase
   printed once), `aria-expanded`, `aria-controls="share-body"`; the help line, the fields, the hint and the lines
   collapse beneath it, their markup `81a1199`'s word for word (UQ4); a chevron that turns; the panel's box 12 px below the
   goal's answers, inside the goal's group. Collapsed on every load; the open state is kept nowhere.
6. **Family's line** (ruling 4): *"Serves a family of 3–4."*, `plan_page.family_serves` (`{min}`, `{max}`, from
   `family.servings`), a line of its own in place of the promise line's *"· serves 3–4"*, which said it in passing (two
   lines saying it would repeat it). ⚠ The words are the builder's reading of *"a line in the Family section saying it
   serves a family of 3–4"*; the Advisor's own was *"(or that it serves a typical family of 3-4 people)"*.
7. **"Hides … the individual result"** (item 3): the save step and the calculator are inside the individual panel and
   hide with it; See all plans hides on Family, as on the Family tab.

**Found at the build**

1. ⚠ **Item 5 changes the Footer block's text.** `scripts/build-storefront.mjs` inlines the plans' table with a comment
   naming `read_on` (*"/\* data/plans.json, read_on 2026-10-25 \*/"*), so the built text is `b68257d5…` where the pasted
   block is `efcbc570…`: that comment is the only difference (both trees' text compared), no code. R2-32, PR-10 and CC-8
   move; CC-8's `replaces` names the live text, so the watch's expectation is unchanged. Nothing needs pasting for
   behaviour; it rides with § 2.2 item 4's block. R2-32's own rule asks for a live smoke before a changed text is pasted.
2. ⚠ **The three recorders had stopped recording what their cases compare.** Since `c6dd3a5` (release (b), production
   true) U4, PV5 and WC-9c build as release (a) did (`productionFalseSavePath`, `withReleaseAWording`), but
   `u-04-record.mjs`, `pv-05-record.mjs` and `wc-09-record.mjs` still built each commit's own `data/save.json`: re-run as
   they were, they recorded production-true pages (U4's production page +33 KB, PV5 a `privacy/`) that the cases would
   then refuse. Each gains `--release-a`, building exactly as its case; the control: at `c6dd3a5` each reproduces its
   committed record exactly.
3. **SP3's base had never taken the preview build** (it moved no page), and § 2 changes lines it added (`renderPage`'s
   `orderLinks`, `familySection`'s, the template's `{{PREVIEW_STYLE}}`, the preview's words). The base now takes the
   preview build's own diff (`544e496..4e73661`) and then § 2's, each with one hunk left out by a new `dropHunks` option
   (the preview's `build()` target branch, whose context the base's `build()` predates; the preview's Why cut list),
   which refuses a pattern that drops nothing. With § 2's `data/plans.json` in the base, the moved-Worker-files entry
   `8bfe4f8` had added was wrong and went in `99f4680`.
4. QC (`qc-chrome-stall.test.mjs`, the mock-ups' Chrome stall) failed once in the first whole run (the machine under
   other teams' load); alone, 4 of 4, and in the whole run at `99f4680`. Not this contract's.
5. The calculator's hint (*"Pick a meal size and how many meals, and type either target or both."*) is unchanged; once
   both are chosen it still reads so until a target is typed, as before.

**Item 7, stated**: its first two questions are ruled (above, 1 and 2); Family with *"all of the same questions"* is
ruled too (one meal question, 5 or 10 family meals, no goal; § 2.2's contract), not built here.

**The gates at `99f4680`** (each alone, `nice -n 15`):

| gate | result |
|---|---|
| `npm --prefix boston-2026-10 test` (09:58–10:08 PDT) | **1,181 of 1,181** |
| `npm --prefix boston-2026-10/tools/storybook test` (10:08–10:11 PDT) | **80 of 81**: the Chrome PR-14 (above); amended, `pr-chrome.test.mjs` alone 6 of 6; SM-4 after the README rows, 6 of 6 |
| `npm --prefix boston-2026-10 run contrast` | 94 pairs, 94 pass |

The storefront watch was not run (nothing here reaches it: the Footer block's built text moves by a comment, its
expectation is the live text's).

**Renders** (Chrome at 390, the week delivered 2026-11-01, every photograph refused, the clock at noon in New York on
2026-10-24; `UC_RENDERS=<dir> node --test tools/storybook/test/uq-chrome.test.mjs`, never committed, handed to the
orchestrator): `uq1-questions-production-390.png` and `uq1-questions-development-390.png` (the first question, the four,
the goal, the card); `uq3-family-390.png` (the Family section below the question, its line); `uq4-calculator-closed-390.png`
and `uq4-calculator-open-390.png` (the calculator below the goal's answers, collapsed and open).

### 2.2 Family's own questions (2026-10-25). CONTRACT, before any code

**The Advisor, 2026-10-25**: *"for Family, the goal does *not* apply (this should be very clear from out documentation
about it – including macro calculation). Family *is* effectively a goal size. For now, let's simplify it to just "lunch
OR dinner"/"lunch AND dinner" and menu choice. We'll drop breakfasts and snacks for now. Somewhere we should say that
that Family contains 4 portions (or that it serves a typical family of 3-4 people)."* And: *"Let's do 5 or 10 meal a week
please – I want to try to streamline the "family" choices."* **Measured on the live store, 2026-10-25 (the
orchestrator, headless, read only)**: `/order?mpid=35` lists the week's meals under the same names as the individual
plans' pages, each at **$38.00**, and asks *"Please add at least 1 meals to continue"*; `/meal-plans` sells Family as
*"3-4 Delicious Servings"*, $38.00 a meal.

1. **Me and my family** asks **one** meal question, *lunch or dinner* / *lunch and dinner* (its heading and answers as
   the individual's), and nothing else: no weekends, no breakfast, no snacks, no goal, no calculator. **5 family meals a
   week for *or*, 10 for *and*.** Every individual answer is kept while Family is chosen and comes back with *Just me*.
2. **The data**: `data/plans.json` `family` carries its two counts, **5 and 10, each mpid 35 at 3800 cents**, and the
   Family answer → count mapping, as data (the builder chooses the shape, as `selection` is shaped; no count or price is
   a literal in code). `servings` 3–4 stays. ⚠ `read_on` is unchanged by this (the prices were re-read the same day).
3. **The result for Family**: the weekly total (N × $38.00) and the per-meal price, the Family promise, the line that it
   serves a family of 3–4 (four portions), and the menu choice exactly as the individual's: **Chef's Choice** (the week's
   picks, N of them, chosen from the picks file as the individual 5- and 10-meal carts choose theirs) and **Choose my own
   meals** (the store's `/order?mpid=35`, rung 1's door). The offer and the save step apply to Family as to individuals.
4. **The hand-off**: a Family Chef's Choice link carries N meals to `/order?mpid=35`; the block's full-plan rule reads
   mpid 35's counts from the data (5 and 10), so a 5- or 10-meal family cart passes and any other count is refused as
   today. ⚠ This changes the built Footer block (its COUNTS), so it ships in the **same** new block as §§ 30–31 of
   SPEC-rung2-progress-and-checkout (one paste): build the block on this branch to prove it, but the block file that is
   pasted is built from the merged line.
5. **Documentation**: the Family section's wording and SPEC-meal-selection gain one line that Family has no goal and no
   macro targets (it is a size, four portions), so no later change reads a goal into it.
6. **Cases**, written first and run red: Family shows exactly one meal question; *or* → 5 and *and* → 10 at $38.00 a
   meal, from the data; Chef's Choice carries 5 or 10 picks to mpid 35; the block accepts 5 and 10 for mpid 35 and
   refuses 7; Just me restores every individual answer; the calculator and the goal are absent for Family; the
   fragment `#family` lands on Family. Goldens move by exactly these changes, re-recorded in their own commit, each
   named. Storybook's Family stories follow.
7. **Rehearsed on the live store by the orchestrator** (a 5-meal Family Chef's Choice cart reaching the stripped
   checkout), before the block is pasted.

#### 2.2.1 Built — found at the build, not ruled (2026-10-25)

Built on `boston/round-2-questions` from `502669f` (this contract), 2026-10-25, as § 2.1 says: each case one file at a time
at `nice -n 15`, beside other teams' gates (load average 6 to 110); the whole site suite and Storybook's alone at the tip.
⛔ Item 7 (the live rehearsal) is the orchestrator's: nothing here opened the live store.

**Commits**

| commit | what |
|---|---|
| `e29c72a` | the cases first, run red on `502669f`'s code; the cases they amend |
| `077f472` | items 1–5, the code; the cases it made stale |
| `8b01f87` | the goldens, once each from `077f472`'s own tree; SP3's base |
| `5eaad96` | found by Storybook's whole run at `8b01f87`: the Family door hidden in a browser too (below, 2); SM-2's list of stories |
| `112215b` | the goldens that rule moves, once each from `5eaad96`'s own tree |
| the next commit | this section; the README rows |

**Cases, before and after** (`nice -n 15 node --test <file>`; red on `502669f`'s code, green from `077f472`)

| case | file | red | green |
|---|---|---|---|
| UF1, the one question (item 1): Q1's heading and answers, nothing else asked, no goal, no calculator; `#family`, `#family-or`, `#family-and`; each side's answers kept | `test/uf1-family-question.test.mjs` | 3 of 3 | 3 of 3 |
| UF2, the data (item 2) and the figures (item 3): 5 and 10 at mpid 35, 3800 cents; or → or-5d, and → and-5d; N × $38.00 from the data; six refusals | `test/uf2-family-data.test.mjs` | 9 of 9 | 9 of 9 |
| UF3, the menu choice (item 3, and item 5's no macros): the checkout carrying the cart's meals to mpid 35 (the shipped fill); Choose my own meals the Family order page; no Family link where the cart does not hold the count; the content's Family links exactly there, never a snack link; no rings on Family | `test/uf3-family-chefs-choice.test.mjs` | 5 of 5 | 5 of 5 |
| UF4, the block (item 4): 35 takes 5 or 10 in the table and the built block; 5 and 10 to /checkout, 7 and 1 refused; the link tool alike | `test/uf4-family-block.test.mjs` | 6 of 6 | 6 of 6 |
| UF5, the save step on Family (item 3): beside a Family cart's checkout, never without one; a save from Family the same save | `test/uf5-family-save-step.test.mjs` | 2 of 2 (its second case's control, that the step is shown, added before the code: a hidden form still submits) | 2 of 2 |
| Family as drawn, 390 and 1280, both builds | `tools/storybook/test/uf-chrome.test.mjs` | 4 of 4 | 4 of 4 (at `5eaad96`; 0 of 4 at `8b01f87`, below, 2) |
| Storybook's Family story *and · 10 meals* | SM-5 (`sm-5-8-states-no-request.test.mjs`, `walk.mjs`) | 1 of 10 (the story at both widths and builds) | green |

- **Amended with the cases, by what § 2.2 changes**: UQ1 (the five headings the first question's and the individual
  panel's; the result after the goal as read; 0 of 4 red: a guard), UQ3 1 of 3 (the Family card's price is the result
  card's; its door hidden by the script), PR-14 1 of 1 (Family's heading after the goal's) and its Chrome half (the drawn
  headings only), MS-13 (the card's lines as § 2 made them; a guard), T1 1 of 1 (Family's two counts share its one
  product's mpid), R2-14 3 of 8 (17 cells; 5 passes, 1 refused *"takes 5 or 10"*), FC-8 3 of 21 (its contract table: 35
  takes 5 or 10; FC-8f's plans *§ 8 leaves as it was* without Family; FC-8g's 5-meal or-5d carrying Family's link too),
  `save-end-fixture.mjs`'s store button (the result card, Family's too), and `r2-harness.mjs`'s synthetic store (a product
  of two counts taken from the smaller to the larger, read from the data; the live store's measured *"at least 1"*).
- **Made stale by the code, amended with it**: UC2's mutation site (`flow1.js`'s line), MS-10's anchor (the call passes
  Family's row), FC-8's mutant (Family's totals its own, untouched by it), SP2 (Family's store button the result card's
  once answered; none before), UQ5 (`plans.json` differs from `81a1199` by `read_on` and § 2.2's Family alone), CC-9b's
  anchor (fixed in the code instead: `cartOf`'s `argvOf` builds every link's arguments once), and the content compared
  with older trees, MS-20, W4, EM5c and WC-9a, each with the Family links taken out (`uf-harness.mjs`
  `withoutFamilyLinks`), every other byte compared as before. Found by Storybook's whole run: SM-2's list of stories.

**Goldens** (`8b01f87` from `077f472`'s tree, `112215b` from `5eaad96`'s; each recorder at the commit before reproduces
its committed record exactly; the messages carry each line):

- **S20** (CC-4): `index.html` alone, `841949a3…` → `5ad49f73…` → `04eb2bd2…`, 64,197 → 66,858 → 67,025 bytes.
- **U4**: the v1 fixture's contents byte-identical; the v2 fixture's and the week of 10-18's +100 and +267 bytes, by
  Family's link on and-5d alone; every page +2,661 to +2,928 (production) and +2,627 to +2,894 (development), then +167;
  the visible page at every fragment (the result card's place in the markup), not moved by `5eaad96`.
- **PV5**: production's `index.html` and development's four pages, twice; `privacy/` unchanged.
- **WC-9**: `visible` at all 20 fragments (`077f472`); not moved by `5eaad96`.
- **WC-8**: `b4a168dc…` → `72ed1f9d…` → `6447ecd8…`.
- **CC-8** (CC-8a/b/c, MS-9, PR-10) and **R2-32**: `data/plans.json` in the Worker's reach (`3c1f8ed6…` → `144f74c1…`);
  the Footer block's text `b68257d5…` → `ef5697aa…`, by the plans table's entry for mpid 35 alone (`[1]` → `[5,10]`).
- **SP3's base**: § 1's own template change (`e875280..ce6b54e`, the empty `{{SAVE_FAMILY}}` gone; it moves no
  production-false page), which § 2.2's markup sits beside, then § 2.2 (`8bfe4f8..5eaad96`, `scripts/family.mjs` with
  it), its import line put after the selection import by a new `insertAfter` option (an anchor found once, else the base
  is refused).

Sizes, raw / gzip: production (production false) 67,025 / 19,961; development `/` 107,182 / 31,379; under SPEC.md § 1's 61,440
gzip.

**Where the contract left a choice, and what was chosen**

1. **The data's shape** (item 2): `family.counts` two cells, 5 and 10, both mpid 35 at 3800 cents (so Family's counts
   share its one product's mpid); `family.selection` one row per Q1 answer, shaped as `selection`'s rows (`lunch_dinner`,
   `weekends`, `breakfast`, `meals`): the answers name the individual cart Family takes (weekdays, no breakfast: or-5d and
   and-5d, the individual 5- and 10-meal carts) and `meals` what they come to, one of the counts. `scripts/family.mjs`
   checks it (outside the Worker's reach, so the Worker's files move by `data/plans.json` alone).
2. **One result card for both**: the result card, its Chef's Choice and the save step moved out of the individual panel,
   below whichever panel shows, so Family's menu choice is the individual's card itself (one card, its ids once). The
   Family panel is its card (its name, promise and line; its figures moved to the result card) and then its one question
   (`#family-question`, `data-family`, Q1's words). The Family card's door, rung 1's, stays for a visitor without script,
   whom no question can reach, and the script hides it: with script the result card's links are Family's door. ⚠ Found in
   Chrome, not by a linkedom case: `.cta`'s `display: flex` outranks the browser's own `[hidden]`, so the hidden door was
   still drawn beside the result card's link; `.family-card .cta[hidden] { display: none; }` (`5eaad96`), as the card's
   stylesheet already keeps `.result .cta[hidden]`.
3. **The fragment**: `#family` is Family with nothing answered, `#family-or` and `#family-and` its answers; each side's
   answers are kept while the other shows. The result card's accent is Family's colour (`data-accent="family"`).
4. **The content carries Family's link** (item 3): a cart Family takes carries a link to mpid 35, made by the link tool
   from the same meals as every link is, when they come to Family's count; never a snack link. The page builds no link.
5. **The synthetic store** (`r2-harness.mjs`, test only): a product of two counts is taken from the smaller to the larger;
   `planCounts` gives an mpid's smaller count. What the live store takes above 10 for mpid 35 is item 7's.

**Found at the build**

1. ⚠ **Two committed weeks and both fixtures hold 4 meals in their or-5d cart** (made before the extra meal: the weeks
   delivered 2026-10-18 and 2026-10-25, `test/fixtures/picks-v2/` and `picks-menus/`); only 2026-11-01's hold 5. So
   Family's *or* has no Chef's Choice in those weeks and shows *Choose your meals* (to the Family order page) alone; *and*
   (and-5d, 10 in every week) has one. The live week (2026-11-01) has both.
2. ⚠ **The week's content moves**: every committed week whose and-5d (or or-5d) cart holds the family count gains a
   Family link (U4's contents; MS-20, W4, EM5c and WC-9a show nothing else moved), so the next content run puts it in the
   bucket. Fit AF's switch smokes take *the first of the cart's mpids sorted* (§ 12.1's reading of them, not run here): 35
   sorts after 20–34, so they are unaffected.
3. ⚠ **The analytics**: Family's question is not counted (`data-family` is outside the beacon's vocabulary, as the tabs
   were), and a Family result's event (key and-5d, mpid 35) is refused by the Worker, whose `RESULT_MPIDS` are the
   individual plans': the funnel sees a Family visit's open and its checkout click (mpid 35 is an order mpid) but not its
   result. Whether to count Family is the Advisor's (SPEC-analytics § 3's vocabulary).
4. ⚠ **The Footer block** (item 4): its `COUNTS` gains mpid 35's `[5,10]` (one entry), with § 2's `read_on` comment the
   block's only change on this branch; it ships in the same paste as SPEC-rung2-progress-and-checkout §§ 30–31, built
   from the merged line; CC-8's `replaces` still names the live text (`efcbc570…`).
5. **No rings on Family** (item 5): a meal's numbers are an individual size's, so on Family its panel shows its
   ingredients alone (UF3). The documentation lines: SPEC-meal-selection § 1, `data/README.md`, `data/messages.json`'s
   `about`.
6. **"(four portions)"** is not printed: the line is § 2.1's *"Serves a family of 3–4."*.
7. **SP3's base** needed § 1's template change replayed and the `insertAfter` option (above).
8. `pr-chrome.test.mjs` hung once in the red run, on a Chrome launch under load (the hang § 1.3.1 recorded for five
   Chrome files): stopped by hand; whole, and green, in Storybook's run at `8b01f87`.

**The gates at `112215b`** (each alone, `nice -n 15`):

| gate | result |
|---|---|
| `npm --prefix boston-2026-10 test` (14:47–15:01 PDT) | **1,205 of 1,206**: QE13 failed in its temporary Chrome profile's cleanup (`ENOTEMPTY` on `rmdir`); alone at once, 4 of 4. Nothing on this branch reaches the print pieces. The whole run at `8b01f87` (before the door's rule and its goldens): 1,206 of 1,206 |
| Storybook | the Family stories alone, by the Advisor's direction (*"we are burning cycles on repeated tests"*): `uf-chrome.test.mjs` 4 of 4 and SM-2 1 of 1 at `5eaad96`; SM-5, with the Family story, green in the whole run at `8b01f87` (80 of 85 there: SM-2 and uf-chrome, both `5eaad96`'s). Nothing they read changed after `5eaad96`. ⚠ A whole run begun at `112215b` was stopped during its static build, so its 12 failures are that stop's, not results |
| `npm --prefix boston-2026-10 run contrast` | 94 pairs, 94 pass |

The storefront watch was not run (its expectation is the live block's; the built block moves by `COUNTS`' Family entry).

**Renders**: none made here (the orchestrator pins the branch to dev for the Advisor's look at once).

## 3. The desktop column (2026-10-26), the workaround for the giant header. CONTRACT, before any code

**The Advisor, 2026-10-25** (verbatim): *"Deal with the fact that the microsite has a giant header on desktop. I don't
like it, but for now I'm willing to force the entire site into a maximum width column (and put it on a matching or
cooordinating background) as a workaround rather than fully figuring out responsivness for it today (we will need to
come back to it – possibly as soon as Tuesday)."* And 2026-10-26, before the Owner's review at 07:30 PDT: *"I want to
show as much as we can get done between now and then."*

1. **The column**: on a screen wider than the column, the whole page (the top with its carousel and logo, the offer box,
   the questions, the result, the save step, the foot) sits in one centred column **480 px** wide; nothing in the page
   is wider than it. One token, `--column: 480px`, declared on `html` inside the media query (⚠ amended at the build,
   § 3.1: not in `:root`, whose tokens are copied into the emails, the Worker's pages and the privacy page), and the media
   query's breakpoint (`min-width: 481px`, the column plus one: CSS cannot read a token in a media query) are the only
   places the width is written.
2. **The background**: outside the column, `--navy` (the page's `theme-color`, the store's bar). The column keeps the
   page's white and fills the screen's height. No text sits on the navy, so no contrast pair is added.
3. **The carousel in the column**: its 4:3 window at the column's width, `calc(var(--column) * 3 / 4)` tall (360 px), with
   no band above or below; outside the media query its rule is unchanged (`min(75vw, 640px)`).
4. **The phone is unchanged**: at 480 px and narrower nothing changes; every rule is inside the one media query.
5. **Why 480** (the orchestrator's choice, renders at 1280×800 on 2026-10-26, his to change in one line): the page was
   designed and reviewed at 390–430; at 480 the carousel is 360 px tall and the first question is above the fold on a
   laptop, where 720 (the content's `.wrap`) leaves a 540 px carousel and 560 a 420 px one. `--ice` was the other
   background considered.
6. **Not in this section**: the dialogs (*See all plans*, *Why Fit AF?*) are modal and keep their own widths over the
   backdrop; the /why/, /privacy/ and Worker pages already set their text in a 680 px column on white and are untouched
   (⛔ the Why page changes only on his ruling); real responsiveness is later (his *"we will need to come back to it"*).
7. **Cases**, written first and run red, on both builds that carry the page (development, and production with
   `production` true): the media query exists once, at the column plus one; inside it `html`'s background is `--navy`,
   `body`'s maximum width is the token, centred, at least the screen's height, `.slides`' height the token's 3/4; the
   token is 480 px; outside it `.slides`' rule is unchanged; no raw colour in the block. Goldens that pin the page (S20,
   PV5, U4, and whichever others read it) move by exactly this block and are re-recorded in their own commit, each named.

### 3.1 Built — found at the build, not ruled (2026-10-26)

Built by the orchestrator on `boston/desktop-column` from `7b705a1` (the release line), 2026-10-26 06:08–06:36 PDT, for
the Advisor's 07:30 PDT review with the Owner.

**Commits**

| commit | what |
|---|---|
| `cc23afd` | this contract |
| `2b409bb` | the cases, `test/uc10-desktop-column.test.mjs` (UC10a–e), run red: 4 of 5 fail, UC10e (the carousel's own rule unchanged) passing before as after, as it must |
| `50515d9` | the code, first: `--column: 480px` in `:root` and the one `@media (min-width: 481px)` block; UC10 5 of 5, contrast 94 of 94 |
| `7e9abc3` | its goldens; merged into the release line as `8925271`, whose whole suite gave **1,245 of 1,247**: M17 and SP15 (below) |
| `0233dbe` | the fix: the token declared on `html` inside the block, not in `:root`; UC10b reads it there and that `:root` carries none (item 1 amended) |
| the next commit | the goldens again, from `0233dbe`'s own tree, and this section |

**Found by the suite (item 1 amended)**: `:root`'s tokens are copied, whole, into three derived places: the emails'
`src/worker/email-tokens.json` (M17), the Worker's pages' `src/worker/page-style.json` (SP15) and the privacy page
(`build.mjs`); the storefront hand-off reads the page's tokens too (`scripts/build-storefront.mjs`). A token in `:root`
moved all of them, a Worker file among them. Declared on `html` inside the block, the column moves none: M17, SP15 and
the privacy page are unchanged, and CC-8's Worker map with them.

**The goldens and bases moved** (each re-recorded once from `0233dbe`'s own tree, `git archive`, each control first
reproducing the committed record; the readers with UC10, M17 and SP15: 52 of 52):

- S20 (and CC-4; SP3's S20 case): `index.html` alone, `1e8317f2…` → `a52b4366…`, 67,227 → 67,913 bytes (+686, the block
  and its comment). `2b409bb`'s tree, built as S20 builds it, reproduces `1e8317f2…`.
- PV5 (`pv-05-record.mjs --commit 0233dbe --release-a`; at `2b409bb` it reproduces `f9273c0`'s record, `recorded_at`
  apart): the same five pages, +686 bytes each; every other file byte-identical, the privacy page included.
- U4 (`u-04-record.mjs --commit 0233dbe --release-a --without-snack-cells`; at `2b409bb` it reproduces `f9273c0`'s
  record, `recorded_at` apart): the six pages +686 bytes each; all six contents and every visible page byte-identical.
- WC-8's reference: `6447ecd8…` → `02fe24d1…`; its control at `2b409bb`'s tree passes against `6447ecd8…`.
- SP3's base: `LATER` gains `2b409bb`..`0233dbe` over `src/template.html` (it applies with no fuzz).
- Not moved: CC-8 and its readers (MS-9, PR-10), WC-9, QE15, T5, S18, M17, SP15.

**Renders** (headless Chrome over a local build on `localhost`; never eatfitaf.com), from the first code, whose CSS
reads the same token: at 1280×800 the carousel is 360 px tall and *Who is this for?* with its answers is above the fold;
at 1280×2600 the white column runs to the bottom of the screen below the footnote. **The phone**: headless Chrome will
not make a window narrower than about 500 px (a `--window-size=390,844` render is wider than 480, so it shows the
column), so the phone was read through a 390 px `<iframe>`, whose own viewport the media query reads: before
(`7b705a1`'s build) and after, the screenshots are byte-identical files.

**Not done here**: Storybook's stories of the page at 1280 (SPEC-storybook-microsite) are not re-rendered; the /why/,
/privacy/ and Worker pages keep their 680 px text column on white over the whole screen (item 6), so on a desktop the
site is two looks until real responsiveness is built.

## 4. Round 2, changeset 2 (2026-10-26): the questions revealed one by one, *Not ready?* in a dialog, *Why Fit AF?* at the foot. CONTRACT, before any code

**The Advisor, 2026-10-26** (verbatim): *"The questions should progressively reveal (we're ultimately going to add a
progress bar). Once they're all revealed they should stay revealed, even as the user taps around. Since individual and
family are the same, it is OK for us to have a fallback rule that says something like: If *any* question sequence has
started and the user flips to the other individual/family choice, consider *all* questions revealed. … As part of this,
count the meal size as the final "question""*. *"Add a "Not ready?" secondary call to action link/button (we can edit the
copy) after the checkout button (they should both reveal at the same time). When tapped, that shows a modal with the
contents of the "save offer form". I think that will cleanup the flow."* *"The "Why Fit AF?" button needs to look less
like a transactional button and more of a … "actionable banner" or "non-intrusive ad-like unit" … It's also sitting
awkwardly in the flow. For now, let's try putting it towards the bottom of the page (after checkout/save offer – and it
should always be visible in the page flow, though it may scroll out of the viewport)."*

### A. The questions, revealed one by one

1. **The sequence**, top to bottom as today (§ 2): *Who is this for?*, then for the individual plan *lunch or dinner*,
   *weekends*, *breakfast*, *snacks* (when `plans.json` `snacks.shown`), and **the meal size** (*What's your goal?*, the
   last question, the portion-size disclosure beneath it as § 2 item 4); for Family, its one question (§ 2.2). The result
   card (the price, *Choose your meals*, item B's *Not ready?*) is the step after the last question, as today.
2. **What shows at the start** (a link carrying no answer and no size: `""`, `#individual`, `#family`): *Who is this for?*
   with its default pressed (*Just me*, § 2 item 2; or *Me and my family* for `#family`) **and the first question below
   it**: the first question has an answer by default, so the next is shown. Nothing else of the panel.
3. **Revealing**: answering a question by a tap (either answer, the one already pressed included) shows the next one in
   the sequence; answering the last (the meal size; Family's one question) shows the result card. **A question once shown
   stays shown** for the page view, whatever is tapped after, the browser's back and forward included; the revealed
   point never moves back up.
4. ⚠ **The newest question has no answer pressed until it is tapped** (the orchestrator's default, ⬜ his to rule): the
   meal questions' defaults (`selection_defaults`) still hold for the price and the cart, but a question the visitor has
   not yet answered shows neither answer pressed, so a pressed default never reads as an answer given. Every question
   above it was tapped and shows its answer. Once all are revealed (item 6), every question shows its answer, defaults
   included, as today.
5. **A link that carries answers or a size** (`#lean`, `#lean-or-5d-b`, `#meals-and-7d`, `#lean-7`, `#family-or`, the
   QR codes', the emails' `/o` links back): **every question is revealed** at load (all answers it carries pressed; the
   rest at their defaults, pressed, as today), and the result card when the answers make one.
6. **The fallback** (his): once any question below *Who is this for?* has been answered by a tap in this page view,
   switching *Who is this for?* to the other answer reveals **every question of both panels**, for the rest of the page
   view. Switching before any such answer only changes the panel, its first question shown (item 2).
7. **Kept out of the link**: the revealed point is the page view's own; it is not in the fragment, not stored, not sent.
   The fragment stays the answers' (`serialise`, unchanged). Without JavaScript nothing changes (the questions are
   script-only today; the no-script page is its table).
8. **Hidden means hidden**: a question not yet revealed is `hidden` (out of the accessibility tree and the tab order);
   revealing one does not move focus or scroll the page (the visitor's own scroll; the progress bar is later).

### B. *Not ready?*: the save step in a dialog

1. **The link**: a secondary call to action, **"Not ready?"** (his words, ⬜ the copy his to edit), directly below *Choose
   your meals* in the result card, shown and hidden with it (A item 1). It is never orange (the store's button stays the
   page's one `--cta`): a text button in the look of *See all plans* (navy, underlined), centred, at least 44 px tall.
2. **The dialog**: tapping it opens a modal dialog holding **the save step's whole contents** (`src/save/section.html`:
   the offer line, the lead, the form, Turnstile, the consent words, the out-of-area and expansion parts, every done and
   error message, the menu link), moved there from the page; **nothing of the save step remains in the page's flow**.
   The dialog behaves as *See all plans* and *Why Fit AF?* do (`modal()` in `app.js`): Esc, its close button (×) and a
   press on the backdrop close it, and focus returns to *Not ready?*. Its accessible name is the save step's own.
3. **The save step's behaviour is unchanged inside it** (`flow1.js`: the states, the requests, Turnstile, the done
   messages, `?no-tracking`'s cookie untouched); only where it is shown moves. Its collapsed state (*save-collapsed*,
   *Save my offer* to reopen) exists because the step sat beside checkout in the flow; inside a dialog it is not needed
   unless the builder finds a state that relies on it (say which, do not decide).
4. **Which pages**: the pages that carry the save step today (development, and production with `production` true). The
   production page with `production` false (S20's, the rollback) has no save step, so no *Not ready?*.
5. **The offer box at the top** (*"Today only: sign up to save 25%"*) is unchanged; if anything in it pointed into the save
   step, it now opens the dialog (say what was found).

### C. *Why Fit AF?* as a banner at the foot

1. **Its place**: after the result card and the save step's link, **before the foot** (*See all plans* and the
   footnote), in the page's flow, **always shown**: not hidden by A's revealing, not by the result being hidden, on both
   panels. Its no-script link in the same place. It leaves its place above *Who is this for?*.
2. **Its look, an actionable banner** (the orchestrator's reading of *"non-intrusive ad-like unit"*, ⬜ his to rule): a
   card the column's width (inside `.wrap`), `--ice` background, the hairline `--line` border, the radius, at least
   64 px tall, its words *Why Fit AF?* left-aligned in the heading type (Poppins 600, 17–19 px, navy) and a "→" at the
   right edge; the whole card is the button (the same `#why-link` and dialog). Hover darkens its border as the cards'
   do; the page's focus ring. Never orange, not a pill, not centred like a button.
3. **Words**: unchanged (*Why Fit AF?*). No new copy (⛔ copy changes on his ruling).

### D. Cases and goldens

1. **Cases**, written first and run red (one file per part, in `test/uc11-*.test.mjs`, `uc12-*`, `uc13-*`, over both
   builds that carry the page, the production page with `production` true and the development page, driven by the page's
   own script as the UC cases are): A: the start (items 2, 5); one tap reveals one question; the result after the meal
   size; a shown question stays shown through a re-tap above it and through back/forward (hashchange); item 4's no
   pressed answer on the newest; item 6's fallback, and the switch before any answer that does not reveal; Family's
   one question; hidden questions out of the tab order. B: *Not ready?* shown with the result and hidden with it; opening
   it shows the dialog with every save-step element inside it and none outside; Esc, × and backdrop close it, focus back;
   a save through the dialog reaches `/api/save` as today (the UC9 path); the production-false page has neither. C: the
   banner after the result and the save link and before the foot, shown at the start and with no result, on both panels;
   its look's rules (UC10d's no raw colour; contrast pairs declared for `--navy` on `--ice` if not already).
2. **Cases amended**: every existing case that assumed all questions shown at once, the save step in the flow, or
   *Why Fit AF?* above the first question, amended in the commit with the code, each named with what changed.
3. **Goldens** that pin the page (S20, PV5, U4, WC-8, CC-4, SP3's base; and CC-8 if a Worker file moves) re-recorded once
   each, in their own commit, from the code commit's own tree (`git archive`), each control first, as § 3.1 did.
4. **The look**, at 390 and at 1280 (the § 3 column): the start, the middle of the sequence, all revealed with the result
   and *Not ready?*, the dialog open, the banner: Storybook's stories of the page re-rendered (SPEC-storybook-microsite),
   and the PNGs named in the build note.
5. **Analytics** (SPEC-analytics): every answer event is sent as today (a reveal is not an event); A3 still reads every
   `button.choice`. *Not ready?* and the banner send nothing new (⬜ whether to count them is his, later, with the progress
   bar).

### E. Open for the Advisor (the builder builds A–D and states these, never decides them)

The start (A item 2: the first meal question shown with *Who is this for?*, or *Who is this for?* alone); A item 4 (the
newest question shows no pressed answer); *Not ready?*'s words; the banner's look and whether it carries a second line.

### 4.1 Built — found at the build, not ruled (2026-10-26)

Built on `boston/round-2-changeset-2` from `f69175d` (this contract, on the release line's `4699cad`), 2026-10-26. Each
case run one file at a time at `nice -n 15`, beside other teams' gates (load average about 25); the whole site suite and
Storybook's alone at the tip.

**Commits**

| commit | what |
|---|---|
| `62b8627` | D item 1, the cases first (UC11–UC13 and their Chrome half), run red on `f69175d`'s code |
| `d0f1a97` | A, B and C, the code (one commit: the three share `app.js`, the template and the slots); the cases it made stale |
| `6aa2728` | D item 3, the goldens, once each from `d0f1a97`'s own tree, each control first at `62b8627` |
| `24d2e88` | found by Storybook's run, § 3's not § 4's: PR-13 in Chrome read against the page's column (below, Found 5) |
| `3b923d4` | D item 4, Storybook's stories of the page: *One answered* and *Not ready?* |
| `1462b05` | found by Storybook's whole run at `3b923d4`: EM2's text in Chrome, made stale by B and missed by `d0f1a97`; EM2's boxes and EM9 at 1280, § 3's (below, Found 9) |
| the next commit | this section; the README rows |

**Cases, before and after** (`nice -n 15 node --test <file>`; red on `f69175d`'s code, green from `d0f1a97`)

| case | file | red | green |
|---|---|---|---|
| UC11, A: the start (`""`, `#individual`, `#from-email`; `#family`); one tap one question, the meal size the result, both builds with snacks carted and both with snacks shown and not carted (Q4 in the sequence); Q4 the card's while carted; the fragment the answers' alone; stays shown through a re-tap above and back and forward; a link with answers or a size shows every question; the fallback; a switch before an answer, and the same answer pressed again; Family's one question; hidden questions `hidden`, no focus moved, nothing scrolled; one answer event a tap, nothing for a reveal, nothing stored | `test/uc11-questions-revealed.test.mjs` | 7 of 11 (the four passing are guards: Q4 the card's, the fragment, Family's question, the events) | 12 of 12 (one case added with the code: a fragment the page view never wrote, Choices 6) |
| UC12, B: *Not ready?* in the result card after its checkout, shown with *Continue to checkout* and hidden without it; every id of `src/save/section.html` in one `<dialog>`, none read in the page's flow, its name the step's; opened by *Not ready?*, closed by × and the backdrop, focus back; a save through it reaches `/api/save` with exactly the save's fields; none on the production page with `production` false; never orange, See all plans' look, centred, 44 px; the offer box pointing nowhere into the step; no event | `test/uc12-not-ready-dialog.test.mjs` | 7 of 9 (passing: a control on `section.html`'s parts, and production false's none) | 9 of 9 |
| UC13, C: after the result card and *Not ready?*, before the foot, its no-script link directly after it, nothing drawn between it and the foot, no longer above the first question; always shown (eight fragments, both panels, after switching); the same button, dialog and words; its rules (`--ice`, the `--line` hairline, the radius, 100 %, at least 64 px, Poppins 600 18 px navy, left, the arrow, hover `--field`, never orange, not a pill, not centred); no raw colour, `--navy` on `--ice` declared at body text's role; no event. Three pages: both builds and S20's | `test/uc13-why-banner.test.mjs` | 2 of 6 (its place, its look; passing as guards: always shown, the same button, no raw colour, no event) | 6 of 6 |
| UC11–UC13 in Chrome, 390 and 1280, both builds: the start drawn, a tap drawing the next question with the scroll and the focus left where they were, the result with *Not ready?*; *Not ready?* below the checkout, centred, 44 px, navy, underlined; the dialog modal (`:modal`), the form drawn in it, its accessible name the step's (Chrome's tree), Esc, × and the backdrop closing it with focus back; the banner the column's width, 64 px, `--ice`, Poppins 600 navy, words left and the arrow right, not a pill, hover `--field`, at the start, on Family and after *Not ready?* | `tools/storybook/test/uc11-13-chrome.test.mjs` | 12 of 12 (see Found 7) | 12 of 12 |

- **Made stale by the code, amended with it** (`d0f1a97`), each by what § 4 changes: `save-end-fixture.mjs` (`storeButton` the
  last thing read before *Not ready?*; *Flow 1 directly after the store button* is now *Not ready?* there and Flow 1
  whole in its dialog, opened by the page's own button and closed again; *Flow 1 absent* includes its link; S29's helper
  `assertFlowOneInItsDialog`, B reversing rung 4's § 2b item 1 *no modal* by his ruling: Flow 1 in exactly one modal
  element, its own dialog), S29 (its mutants: Flow 1 out of its dialog, in a second dialog, an overlay; each fails), SP4
  (the helper's name), `uc-harness.mjs` `neighbours` and `sp-fixture.mjs`'s offer line (read in the step's dialog), MS-4
  and MS-12 (a size's link reveals every question: Q2–Q4 shown at their defaults, where § 7's *After Q1* hid them), MS-18
  (*Not ready?* the card's last thing on the production page), UQ1 (a size's link shows every question), UQ4 (the calculator hidden with the meal
  size at the start), W1 (the button at the foot of `main`, after the result and *Not ready?*); in Chrome W2/W3 (the
  banner's place and look, W3's link at the foot below both panels, the footer mutant's message, § 11.2's chip-look case
  now the banner's focus ring, a chip's) and `uc-chrome`'s save-step states (reached through *Not ready?*, Esc before See
  all plans). Found by the first whole run, before the commit: 81 of 1,273, most of them `flow1.js` calling
  `hasAttribute` on page-sim's stand-in elements (Found 4), fixed in the code. ⚠ Missed by that commit and found by
  Storybook's whole run: EM2's text in Chrome (`em-chrome.test.mjs`: the result card's text against the base 76ee36e's,
  where *Not ready?* is now the card's last line), amended at `1462b05` (its line and its box left out).
- **My own cases, corrected at green**: `uc11-13-chrome`'s UC11 waited for the next heading's presence (the reveal lands
  after the browser's `hashchange`, asynchronous) and measured puppeteer's own scroll to press: it now waits for the
  question drawn and puts the answer in view first; its middle render spans the newest question's answers; the cases'
  dialog stand-in sets `open`.

**Goldens, each re-recorded once from `d0f1a97`'s own tree** (`6aa2728`; each control at `62b8627`, § 4's cases and the
code before, reproducing the committed record):

- **S20** (CC-4 reads it): `index.html` alone, `a52b4366…` → `cc3f2473…`, 67,913 → 72,282 bytes: A's script, the banner
  and its place, `#plan-data`'s `snacks_carted`; nothing of B (production false has no save step). Both trees' production
  pages compared line by line.
- **PV5** (`pv-05-record.mjs --commit d0f1a97 --release-a`): production's `index.html` and development's four pages;
  every other file byte-identical, `privacy/` included.
- **U4** (`u-04-record.mjs --commit d0f1a97 --release-a --without-snack-cells`): all six contents byte-identical; every
  page moves (production's +4,369 bytes, development's +6,291) and every visible page.
- **WC-9** (`wc-09-record.mjs --visible-at d0f1a97 --release-a --without-snack-cells`): `visible` at all 20 fragments;
  `picks_data`, `page_sha256` and the sheet 409b805's. The recorder's new flag: Found 3.
- **WC-8**: `02fe24d1…` → `fd75caac…`.
- **SP3's base**: `LATER` gains `62b8627..d0f1a97` over `src/template.html`, `src/app.js`, `build.mjs` (`codeOnly`: the
  `saveSlots` note, a comment, left out).
- Not moved: CC-8 and its readers (MS-9, PR-10), R2-32, MS-20; no Worker file and no content moved.

Sizes, raw / gzip (Node's default level, as T5 measures): production (production false) 72,282 / 21,732 (from 67,913 /
20,250); development `/` 114,361 / 33,533; under SPEC.md § 1's 61,440 gzip.

**Where the contract left a choice, and what was chosen** (stated, not ruled)

1. **Q4 while snacks are carted** (`data/plans.json` as committed): the Chef's Choice card shows Q4 only beside a result
   (its answer set is empty until the result shows; SPEC-snacks-in-the-cart § 4), so in the sequence Q4 could never be
   shown before the meal size, and revealing it there would have left the visitor stuck at a hidden question. Built: Q4
   is out of the sequence while carted (breakfast reveals the meal size) and its `hidden` stays the card's; it shows above
   the meal size once the result does, for days with a snack list, with its answer pressed, as today. With snacks shown
   and not carted it is in the sequence, between breakfast and the meal size. The page reads the flag from `#plan-data`'s
   new `snacks_carted`.
2. **When *Not ready?* shows** (B item 1, *"shown and hidden with it"*): exactly while the save step showed since § 1
   item 2 (the Advisor: *"only appear when the Checkout button appears"*): beside the card's *Continue to checkout*
   (flow1.js's `beside`, unchanged), never beside *Choose your meals* alone; so on Family, beside a Family cart's checkout
   (UF5's rule). Read so because his words for B are *"after the checkout button (they should both reveal at the same
   time)"*.
3. **Where *Not ready?* sits**: the result card's last thing, after *Choose my own meals* (the card's last link, where
   the save step sat since § 1), centred. The other reading, directly under *Continue to checkout* inside the list's box,
   would put it between the checkout and *Choose my own meals*.
4. **The Family section at the start** (A item 2, *"Nothing else of the panel"*): read as nothing else of the panel's
   questions and no result. Family's card (its name, promise and *Serves a family of 3–4.*) stays with its panel, above its
   one question, as it says what Family is.
5. **A link carrying a size alone** (`#lean`, A item 5): every question shown; Q1 with no answer (it has no default), Q2–Q4
   at their defaults, pressed (*"the rest at their defaults, pressed"*); § 7's *After Q1* (Q2–Q4 hidden until Q1) gives
   way to it. `pressed()` no longer requires Q1 for Q2–Q4.
6. **A fragment the page view never wrote** (a link followed within the page, the address bar): a link too; carrying
   answers or a size, it shows every question. Back and forward land on fragments the view wrote or opened at and change
   nothing shown (A item 3). The revealed point is still not in the fragment, not stored (A item 7).
7. **A tap on a question not yet shown** (possible only by a script) shows the questions up to and after it, as a tap in
   order does (`Math.max`); no visitor can press a hidden button.
8. **The same answer to *Who is this for?* pressed again** is no switch (A item 6's *"flips to the other"*).
9. **The dialog's look**: the plans dialog's (`.all`: white, the radius, the navy backdrop at 60 %, × at its head), at most
   the column's width (`min(var(--column, 100%), calc(100% - 24px))`: 480 px on a desktop, the screen less 24 px on a
   phone), where See all plans takes 680; inside it the step's own box, its orange bar and border kept, its margin
   dropped. Its accessible name is `#save-title` (*"Your Boston offer"*), the step's.
10. **The collapsed state** (B item 3, say which, do not decide): two states rely on it and it is kept unchanged. PLAN,
    from `#from-email` (the emails' `/o` link back, `src/worker/redeem.js`): there the dialog opens holding the one line
    *Save my offer*, which opens the form in place; and MENU, after *See this week's menu* (`data/menu.json`; none today).
11. **The dialog closes if the checkout goes while it is open** (a visitor's back): otherwise an open dialog would hold a
    hidden step. One line in `flow1.js`'s render (where focus lands then, *Not ready?* being hidden, was not measured).
12. **The banner's measures**: Poppins 600 18 px, padding 12 px 18 px, 8 px below it (the foot's own 12 px above *See all
    plans*), the arrow 20 px, drawn by `::after` with an empty alternative (`content: "\2192" / ""`, the plain form first
    for older browsers), so its accessible name stays *Why Fit AF?*; its no-script link the same look. Its card is the
    column's width inside `main.wrap` (448 px in the 480 px column, 358 px at 390).
13. **Analytics**: nothing new is sent (*Not ready?*, the banner, a reveal); `#not-ready` and `#why-link` are not
    `button.choice`, so A3's reading is unchanged.

**Found at the build**

1. ⚠ **A item 5's examples carry no answers.** The QR codes are `https://eatfitaf.com/?e=boston` (and `?e=seminar`, `/`),
   no fragment; the emails' `/o` link back is `/?e=<event>#from-email`. Neither carries an answer or a size, so by item
   5's rule they open at the start (item 2), and UC11 holds `#from-email` among the starts. Built by the rule; that these
   links should open with every question shown would be his ruling.
2. ⚠ Snacks carted (Choices 1): the card hides Q4 whenever no result is shown, so the contract's sequence with Q4 in it
   could not be built as written while carted.
3. **The WC-9 recorder no longer reproduced its record**: WC-9c reads each visible page with a snack link's cells removed
   (since SPEC-rung2-progress-and-checkout § 31.2), and the recorder did not, so re-run as it was it differed at
   `62b8627` in `visible` alone. It gains `--without-snack-cells`, as `u-04-record.mjs` has it; with it, at `62b8627` it
   reproduces the record.
4. **page-sim's stand-in elements have no `hasAttribute`**: `flow1.js` reads the dialog's `open` property instead (81 of
   1,273 in the first whole run, most of them this).
5. ⚠ **PR-13 in Chrome was red at 1280** (the carousel at 400, 480 wide, not 0, 1280): § 3's column, which § 3.1 did not
   run Storybook's cases for; inferred, not run, to be red since `0233dbe`. Amended in a commit of its own (`24d2e88`):
   the carousel spans the page's column, the viewport at 390 and 480 px at 1280.
6. The preview build's cut list (`PREVIEW_WITHOUT_WHY`) finds the moved button, its no-script link, its dialog, its
   rules and the script's lines once each, unchanged: their text is the same and they stay together (PV1–PV8 green).
7. The Chrome cases' red run was made while the code was being written; its failures are the pre-code build's (the meal
   size drawn at the start, no `#not-ready`, the banner the 128 px pill).
8. Storybook's `node_modules` in this worktree is a link to the dev-line's install, as the release-c worktree has it
   (nothing installed); its static builds write their pages to temporary directories.
9. ⚠ **Two more of § 3's, in Chrome** (found by Storybook's whole run at `3b923d4`; § 3 changes no card, so neither is
   § 4's): EM2's boxes at 1280 (the card 410 px wide in the column, the base's 650: the base is now read at the column's
   width, as the page draws the card there) and EM9's one row of rings at 1280 (in the column they wrap as on a phone,
   § 11 item 4's own rule: one row is held wherever the panel holds the five rings and their gaps side by side, the gap
   read from the page); EM9's two mutants failed at their controls by the same cause. Amended at `1462b05`;
   `em-chrome.test.mjs` alone 9 of 9. Like PR-13 (Found 5), inferred, not run, to be red since `0233dbe`.

**E, stated** (built as the contract's defaults, his to rule): the start, *Who is this for?* and the first meal question
(A item 2, as built); the newest question with no answer pressed (A item 4, as built); *Not ready?*'s words (the
working label, as built); the banner's look (C item 2, as built) and a second line (none built).

**The gates at `3b923d4`** (each alone, `nice -n 15`):

| gate | result |
|---|---|
| `nice -n 15 npm --prefix boston-2026-10 test` (08:07–08:15 PDT) | **1,273 of 1,274** (`# tests 1274`, `# pass 1273`, `# fail 1`): QC (`qc-chrome-stall.test.mjs`, the mock-ups' Chrome stall: under load it stalled twice where its case expects once); alone at once, 4 of 4. Nothing here reaches the mock-ups' Chrome runner, and nothing after `3b923d4` is read by this suite |
| `npm --prefix boston-2026-10 run contrast` | 94 pairs, 94 pass, 0 fail |
| `nice -n 15 npm --prefix boston-2026-10/tools/storybook test` (08:15–08:19 PDT) | **89 of 97** (`# tests 97`, `# pass 89`, `# fail 8`): EM2, EM9 and EM9's two mutants (amended at `1462b05`, Found 9; `em-chrome.test.mjs` alone there 9 of 9); and SM-5, SM-8, SM-10 and SM-11, which read one walk, which timed out (120 s) waiting on a story while the suite's other Chrome files ran beside it (load about 25): alone at once, `sm-5-8-states-no-request.test.mjs` 10 of 10 (08:22–08:24 PDT), the two new stories among those it walks. SM-2 lists them; UC11–UC13 in Chrome 12 of 12, W2/W3, `uc-chrome`, UQ, UF and PR-13 green |

**Renders** (Chrome at 390 and 1280, the week delivered 2026-11-01, every photograph refused, the clock at noon in New
York on 2026-10-24; written by Storybook's whole run at `3b923d4` with `UC_RENDERS=<dir>`, never committed, handed to
the orchestrator), each `-production-` and `-development-`, `-390` and `-1280`: `uc11-start-*` (the start),
`uc11-middle-*` (Q1 answered, the next question unanswered), `uc11-all-revealed-*` (every question, the result card,
*Not ready?*), `uc12-dialog-*` (the dialog open, the viewport), `uc13-banner-*` (the result card to the foot). Storybook:
*Individual · Start*, *· One answered*, *· Chosen*, *· Not ready?*, and *Whole page · Scroll* for the banner.

### 4.2 The Advisor's rulings on E (2026-10-26). CONTRACT, before any code

**The Advisor, 2026-10-26** (verbatim): *"Yes, let's start with just the question. We're ultimately going to add a "let's
get started" call to action at the top of the flow (making the choice between going down the selection funnel or
learning more about Fit AF)."* *"Let's try: "Not ready to checkout? Save your offer now.""* *"I'm open to either banner
treatment – we can keep whatever you have now and I can give feedback."*

1. **The start is *Who is this for?* alone** (A item 2 amended): at the start (a link carrying no answer: `""`), the
   first question shows with **neither answer pressed** (A item 4's rule now holds for it too), and nothing of either
   panel shows: no meal question, no Family card, no result. Tapping *Just me* shows the first meal question; tapping *Me
   and my family* shows Family's card and its one question. Each is then revealed as § 4 A says.
2. **`#individual` and `#family`** carry the first question's answer: that answer pressed, and its panel's first step
   shown (as if tapped). A link carrying a meal answer or a size still reveals every question (A item 5, unchanged).
3. **The fallback** (A item 6) is unchanged: it starts with an answer below *Who is this for?*.
4. **What the start does not change**: the foot (*Why Fit AF?*'s banner, *See all plans*, the footnote) shows at the
   start; the price and the cart are still made only from answered questions (the result needs the last); every answer
   event is sent on its tap as today (the first question's included).
5. **A item 4 is kept** as built (the newest question shows no pressed answer until tapped; not objected to).
6. ***Not ready?*'s words** (B item 1): **"Not ready to checkout? Save your offer now."**, his words exactly, the link's
   text and its accessible name. Nothing else of B changes.
7. **The banner** (C item 2): kept as built (§ 4.1 item 10); his feedback to follow.
8. **Cases**: UC11's start and link cases, and every case or story the start moves, amended first and run red; UC12's
   words; the goldens re-recorded once each from the code commit's own tree, as § 4.1 did; § 4.2.1, the build note.

#### 4.2.1 Built — found at the build, not ruled (2026-10-26)

Built on `boston/round-2-changeset-2` from `ae68171` (§ 4.2), 2026-10-26, as § 4.1: each case one file at a time at
`nice -n 15`; the whole site suite and Storybook's alone at the tip.

**Commits**

| commit | what |
|---|---|
| `ae68171` | § 4.2, the contract (the orchestrator's) |
| `d03fafb` | the cases first, amended and run red on `ae68171`'s code |
| `cb0980f` | the code; UF1's amendment corrected (below) |
| `a828182` | the goldens, once each from `cb0980f`'s own tree, each control first at `d03fafb` |
| the next commit | this section |

**Cases, before and after** (`nice -n 15 node --test <file>`; red on `ae68171`'s code, green from `cb0980f`)

| case | file | red | green |
|---|---|---|---|
| UC11: the start (`""`, `#from-email`, `#nope`): *Who is this for?* alone, neither answer pressed, neither panel, no Family card, no result, the foot (*Why Fit AF?*, *See all plans*, the footnote) shown, no fragment written; `#individual` and `#family` press their answer and show their panel's first step (and Family's card); from the start *Just me* shows the first meal question, *Me and my family* Family's card and its question, each writing its fragment; every walk now begins with *Just me*; the first question's answer event sent on its tap, and on a tap of the answer `#individual` already pressed (Choices 2); back to the start after an answer, then the other answer, every question shown (Choices 4) | `test/uc11-questions-revealed.test.mjs` | 2 of 14 (the start; the return to it): the rest are guards, true on either code, or walks that begin with *Just me* | 14 of 14 |
| UC12: the link's words, *"Not ready to checkout? Save your offer now."*, its text and its accessible name | `test/uc12-not-ready-dialog.test.mjs` | 1 of 9 | 9 of 9 |
| UC11 in Chrome, 390 and 1280, both builds: the start drawn as the first question alone with the foot, no meal question, no Family card; the walk from *Just me* | `tools/storybook/test/uc11-13-chrome.test.mjs` | 4 of 12 (UC11's four; UC12 and UC13 guards) | 12 of 12 |

- **Moved by the start or the words, amended with the cases** (`d03fafb`, red first): UQ2 1 of 8 (`""` and `#nope` the
  start, neither pressed, neither panel), UF1 1 of 3 (`#family-both` and `#family-` the start), MS-4 1 of 4 (the start
  shows no panel; a size's link the individual panel), MS-18 3 of 4 (the words); Storybook's *Start* (it waits for the
  first question, not the individual panel) and *One answered* (it opens at `#individual`, its panel's first step), both
  reachable on either code.
- **A defect of my own case, corrected with the code**: UF1's amendment had `#family-or-5d` the start; its `or-5d` is a
  meal answer (every fragment's answer part is read so), so it is the individual page, as before.
- Nothing else moved: the whole site suite on the code before its commit failed only the goldens below and QC (load).

**Goldens, each re-recorded once from `cb0980f`'s own tree** (`a828182`; each control at `d03fafb`, the cases and
the code before, reproducing the committed record):

- **S20** (CC-4 reads it): `index.html` alone, `cc3f2473…` → `241c4dbd…`, 72,282 → 73,252 bytes, by `app.js`'s start and the
  first question's markup; both trees' production pages compared line by line.
- **PV5** (`pv-05-record.mjs --commit cb0980f --release-a`): the same five pages; every other file byte-identical.
- **U4** (`u-04-record.mjs --commit cb0980f --release-a --without-snack-cells`): all six contents byte-identical; production's
  pages +970 bytes, the visible page at no fragment alone; development's +1,003 (the link's words +33), the visible page at
  no fragment and at each fragment with the card's checkout.
- **WC-9** (`wc-09-record.mjs --visible-at cb0980f --release-a --without-snack-cells`): `visible` at the empty fragment alone.
- **WC-8**: `fd75caac…` → `3ad17ec1…`.
- **SP3's base**: `LATER` gains `d03fafb..cb0980f` over `src/app.js` and `build.mjs`, every hunk (`app.js`'s comments are in
  the page).
- Not moved: CC-8 and its readers (MS-9, PR-10), R2-32, MS-20. The readers, 40 of 40.

Sizes, raw / gzip: production (production false) 73,252 / 22,018.

**Where § 4.2 was silent, and what was built** (stated, not ruled)

1. **What `serialise` writes for the start**: nothing. The start is no answer, and no tap makes it (every press answers
   the first question or one below it), so no fragment is ever written for it; a visitor's back to the page's first
   entry (no fragment) returns to the start, the revealed point kept as § 4 A item 3 has it. `serialise` returns `""` for
   it, which no tap reaches.
2. **The first question's answer event on a tap of the answer a link already pressed**: sent. § 4.2 item 4's *"every
   answer event is sent on its tap as today"* read as a tap being an answer, as a tap on any pressed answer has always
   been (A3's reading, unchanged); at `#individual`, *Just me* tapped sends `answer who individual`. Nothing is sent for the
   start itself (no tap).
3. **"A link carrying no answer"** is any fragment the page does not read as an answer: none, `#from-email` (the `/o`
   link back), the QR codes' (no fragment), and one it does not know (`#nope`, `#family-both`, `#family-`, `#7`,
   `#meals`). A fragment whose answer part is a meal answer is the individual page with every question shown, whatever
   its first word (`#family-or-5d`, `#meals-or-7d`), as before.
4. **The fallback after a return to the start** (§ 4.2 item 3, *"unchanged"*): *"the other"* answer is the other than the
   one last chosen in the page view, so after an answer below it, back to the start (neither pressed), then the other
   answer shows every question of both panels; from a fresh start there is no other, and either answer shows its panel's
   first step.
5. **The first question's markup has neither answer pressed** (`build.mjs`: `aria-pressed="false"` on both, where *Just
   me* was `"true"`), so the page before its script runs matches the start; the script presses the answer a link carries.
6. ***See all plans* at the start**: shown (§ 4.2 item 4, the foot), hidden on Family as before.
7. **The link's look** is § 4's (B item 1): the longer words wrap inside the card where they must: two centred lines at
   390, one line at 1280 (in the column).
8. **Storybook**: *Start* waits for the first question (the panel is no longer drawn there), and *One answered* opens at
   `#individual`, its panel's first step, then presses the first meal question's first answer.

**Gates at `a828182`** (each alone, `nice -n 15`)

| gate | result |
|---|---|
| `nice -n 15 npm --prefix boston-2026-10 test` (09:33–09:42 PDT; the machine's load average rising to about 240) | **1,276 of 1,276** (`# tests 1276`, `# pass 1276`, `# fail 0`). On the code before its commit (09:23–09:31 PDT) the whole run had failed only the nine golden cases and QC's two timing cases; QC alone then 2 of 4 at load about 30 and 4 of 4 straight after at about 17 (the mock-ups' Chrome stall, which nothing here reaches) |
| `npm --prefix boston-2026-10 run contrast` | 94 pairs, 94 pass, 0 fail |
| `nice -n 15 npm --prefix boston-2026-10/tools/storybook test` (09:42–09:45 PDT, with `UC_RENDERS`) | **97 of 97** (`# tests 97`, `# pass 97`, `# fail 0`): the walk (SM-5, SM-8, SM-10, SM-11) green in the whole run, so not run alone |

**Renders** (Chrome at 390 and 1280, both builds, the week delivered 2026-11-01, every photograph refused; written by
Storybook's whole run at `a828182` with `UC_RENDERS=<dir>`, never committed, handed to the orchestrator):
`uc11-start-*` (the start: the first question alone, neither pressed, and the foot), `uc11-middle-*` (*Just me*, then Q1
answered: the next question unpressed), `uc11-all-revealed-*`, `uc12-dialog-*`, `uc13-banner-*` (the result card with
the link's words, to the foot), each `-production-` and `-development-`, `-390` and `-1280`. Storybook: *Individual ·
Start* and *· One answered*.

## 5. Round 2, changeset 3 (2026-10-26): the result card reordered, *Choose my own meals* a menu, the page's scroll stops. CONTRACT, before any code

**The Advisor, 2026-10-26** (verbatim, the result card): *"move up "Choose my own meals" to under the 5 preset menu
options. We might tweak this copy but for now we just need to join it in as an alternative option versus the preset
menus."* *"Please drop "15 meals go through as our 14-meal plan for now." and other variants. That's internal site
mechanics that doesn't affect customers."* *"Add a new call to action that's similar to "Explore our menus" (we'll
tweak the copy) above Chef's Choice etc. I think we can use the same type treatment as the questions."* *"Make "Choose
my own meals" effectively a toggle. *For tonight*, if someone selects it, please change the behavior of the checkout
button to send them to the HMP catalog (where "choose my own meals" currently goes. In the future (likely for tomorrow
night) we'll move this to a proper menu builder inside the microsite. So this is just some bridge code that will be
removed shortly – my concern is not breaking the "choose my own meals" flow while also refactoring the overall microsite
flow. This means that (for now) selecting "choose my own meals" should just show the full list of products with a note
that says they will select which ones they want in the *next* step."* *"This moves all of the pricing information to
above the checkout button (which makes more sense)."* *"Put the meal list into a scroll box thats ~80% the height of the
mobile screen."* *"Please add a scroll anchors/stops/notches/etc for: the top of the questions, the meal list, the
checkout button … the screen should naturally settle on one of those stops (unless the person is fine-scrolling the
screen)."* *"Please increase the text weight on the meal names – either semi-bold or a stop lighter please."* *"Add meal
descriptions to the compact/closed representation of the meals."*

1. **The result card's order**, top to bottom: the heading **"Explore our menus"** (⬜ his words to edit; in the
   questions' heading style, `.step-label`: Poppins 600 20 px, navy, centred); the menu chips (the five menus as today)
   **and *Choose my own meals* joined to them** as a sixth chip in the same look, after the last menu; the meal list
   (item 5); **the price** (the weekly total, the price a meal, the meals a week: today's block, unchanged in look),
   moved from the card's top to here; **the checkout button**; then *Not ready to checkout? Save your offer now.* (§ 4
   B). The old *Choose my own meals* link below the checkout button is gone.
2. **The rounded line is gone**: `#result-rounded` (*"15 meals go through as our 14-meal plan for now."* and every
   other text `answers[…].rounded` makes, Family's included) is never printed. The figures and the cart are unchanged
   (internal: the store's plan, its mpid, the price a meal).
3. **⛔ BRIDGE (for one day; removed by the menu builder): *Choose my own meals* as a menu.** Its chip is a toggle among
   the menus: pressing it presses it and releases the menu; pressing a menu releases it. While it is pressed: the list
   shows **the week's full list of meals** (every meal of every menu's cart for the answer set, each once, in the
   order they first appear, then the week's snacks when snacks are carted), with its photo cells as today and **a note
   above it** (⬜ his words to edit): *"You'll choose your meals in the next step."*; and **the checkout button's link is
   the store's plan page** (today's *Choose my own meals* `href`, `cc-own`: the result's `data.base + "?mpid=…"`),
   its words unchanged. Every line of this bridge carries the comment `BRIDGE (SPEC-ui-and-copy-pass § 5 item 3)` so it
   can be found and removed whole. Analytics: the checkout click is sent as today (its `href` and mpid as the link
   carries); nothing new.
4. **Meal names** in the closed row: weight **600** (semi-bold; the loaded face; no new font file).
5. **The meal list in a scroll box**: the list (the meals and, when carted, the snacks; the note of item 3 inside it or
   just above) in a box at most **80 % of the screen's height** (`max-height: 80svh`, falling back to `80vh`), scrolling
   inside (`overflow-y: auto`), the box's edge visible (the card's hairline). A meal opened inside it (its panel) scrolls
   with it.
6. **Scroll stops** (CSS scroll snap, no library): the page snaps by **proximity** (`scroll-snap-type: y proximity` on
   the root), so a slow scroll rests anywhere; three stops: **the top of the questions** (*Who is this for?*'s step,
   `start`), **the meal list's box** (`center`), and **the checkout button** (`center`). Under `prefers-reduced-motion`
   the snapping stays (it is not an animation) but no smooth scrolling is added. Stops exist only while their element
   is shown.
7. **Meal descriptions** in the closed row, under the name, in the muted line style (`--muted`, 14 px, two lines at most
   with an ellipsis): **shown when the week's data carries one** (a new optional `description` per meal in the picks
   file's `meals` map: `scripts/chefs-choice.mjs`'s `ENTRY_OPTIONAL_FIELDS` and its check, text, not blank). ⚠ **No
   committed week carries one today** (the emitter writes none); the orchestrator finds the source separately. With
   none, the row is as today. A fixture with descriptions proves the display.
8. **Cases**, written first and run red, over both builds that carry the card: item 1's order; item 2's absence (no
   `rounded` text anywhere, for every answer set with one); item 3: the chip toggles, the list is the union in order
   with the note, the checkout link is the plan page's while pressed and the cart's when a menu is pressed again; item 4
   the weight; item 5 the box's height at 390 and 1280 (Chrome); item 6 the three stops and proximity (Chrome); item 7
   a description shown from a fixture and absent without one, and the schema's check refusing a blank one. Amended
   cases named; the goldens re-recorded once each from the code commit's own tree, controls first; Storybook's stories of
   the card re-rendered; the build note § 5.1.
9. ⬜ **Open for the Advisor** (built as the defaults above, stated in § 5.1): the heading's and the note's words; the
   chip's place (last) and its words (*Choose my own meals*, unchanged); the box at 80 % on the desktop column too.

### 5.1 Built — found at the build, not ruled (2026-10-26)

Built on `boston/round-2-changeset-2` from `b70ece4` (§ 5), each case one file at a time at `nice -n 15`.

| commit | what |
|---|---|
| `fb7b110` | the cases, red on `b70ece4`'s code: UC14 3 of 3, UC15 3 of 3, UC16 3 of 4 (the fourth, no description no `.cc-desc`, a guard), `uc14-16-chrome` 4 of 4 |
| `27cc0df` | the code, the stale cases amended and named in its message; all of the above green |
| `62591ec` | the goldens, once each from `27cc0df`'s tree, each control first at `fb7b110` (S20 `241c4dbd…` → `566159e8…`; PV5, U4, WC-9, WC-8, SP3's `LATER`) |
| `4578c46` | UC16's fixture descriptions in the form Fit AF's emitter writes (one plain line, the store's short description joined by ` | `, only on entries with nutrition or ingredients); UC8 in Chrome, six chips |
| `8f36711` | item 6's stops live from the first rested scroll with the result shown (below, 9); Storybook's stale cases (EM6, PR-14, SM-4, the walk's Scroll frame) |
| `4e954d5` | the goldens again from `8f36711`'s tree, control at `4578c46` (S20 `566159e8…` → `aa9e9ad1…`; PV5, U4, WC-8, SP3's `LATER`; WC-9 unmoved) |

**Where § 5 was silent, and what was built** (stated, not ruled):

1. **The words** (item 9): `chefs_choice.explore` *"Explore our menus"* and `chefs_choice.own_note` *"You'll choose your
   meals in the next step."*, new in `data/messages.json`; the chip's words `chefs_choice.own`, unchanged; the chip last.
2. **A week of one list** (every committed week before 2026-11-01), and an answer set only Chef's Choice has a cart for:
   its one chip (named by its heading) is shown beside *Choose my own meals*, so the toggle exists there too. Before,
   such a card had no chips.
3. **While *Choose my own meals* is pressed**: the menu's heading is hidden, the note in its place above the box; the
   price is the plan's, unchanged; snacks the week's (Chef's Choice's), as for any `-s` answer; each meal's photo cell
   and nutrition its first appearance's. It stays pressed across answer changes.
4. **The card's old outer box** (`.cc-list`'s border) is gone: the hairline is the list's scroll box's; the heading and
   the chips sit above it. The box is `80svh` at 1280 too (item 9).
5. **Continue to checkout** left the card's markup for a slot of its own after the price (`PICKS_CHECKOUT`,
   `src/chefs-choice/checkout.html`), hidden with the list.
6. **The rounded line**: `answers[].rounded` dropped from the page's data; the phrase `plan_page.rounded` stays in
   `data/messages.json` (the build still checks its placeholders), printed nowhere.
7. **A description** sits with the name in one column (`.cc-words`); an entry still needs nutrition or ingredients (a
   description alone does not make one).
8. **Retired**: Storybook's EM2 one-list case held the card's text and every box to `76ee36e`'s; § 5 reorders the card
   for every week, so it now holds the two chips, the heading and the list. **A defect of my own case**: Chrome's
   computed `scroll-snap-type` reads `y` for `y proximity` (the default left out); `uc14-16-chrome` accepts both.
9. **⚠ Item 6 against § 4 A, found by Storybook's UC11**: the browser re-snaps after every change of layout, so with the
   stops live from the start, a tap that drew the next question or the result pulled the page to a stop (41 to 151 px).
   Built nearest: the stops are live from the visitor's first scroll with the result shown, once it rests 200 ms
   (`app.js` adds `html.snaps`), and the page's first box (a banner or the carousel) is a resting place too, so a page at
   its top is not pulled to the first question. Once live, a later change of layout (a menu pressed, an answer changed)
   may settle the page on the stop it rests at. In Storybook the story is named *The own chip pressed* (SM-4: no page
   phrase there).
10. **The descriptions arrive** (2026-10-26): `data/picks/2026-11-01.json` replaced by Fit AF's emitter's output
    (`85d8ed3`, 25 of 26 meals described); it moves UC8 alone (a row's words now hold the description under the name;
    amended in `eec5c4c`) and no golden.

## 6. The save dialog opened by a link, `#save` (2026-10-26). CONTRACT, before any code

**Why.** The Advisor, 2026-10-26: *"add a "save my offer" call to action on the final step of the HMP checkout (where
customers enter their credit card)"*; then, to the plan for tomorrow evening's slate, *"let's do the slate for tomorrow
evening first"*. The store's page sends nothing to us (SPEC-analytics § 1 item 3; the hand-off's *"⛔ Never … a
request"*), so its call to action is a **link** to this page, which opens the save step. A save needs no plan: it holds
the offer's pricing against an email and a ZIP (SPEC-rung4 §§ 3–4), so the link carries no answers. Its Footer block half
is SPEC-rung2-progress-and-checkout § 35.

1. **At `#save`** (the page's address's fragment exactly that), once the page's scripts have run, the plan page opens
   the save dialog (`#save-dialog`) as pressing *Not ready?* opens it (§ 4 B), the save step at its first state
   (`OFFER`), and the page behind it at its start (`#save` carries no answer, so `app.js` reads it as no fragment).
   Closing the dialog (its button, Esc, the backdrop) leaves the page at its start; the fragment is not rewritten by
   the opening. A page without the save step (production `false`, `/why/`, `/privacy/`) does nothing with `#save`.
2. **What it records**: the save's event is the page's own (`qrEvent(location.search)`, else `save.json`'s
   `event_id`), as for every save; the link from the store carries no `?e=`, so such a save names the default event and
   its E1 reads *"at eatfitaf.com"* (the Advisor's, ⬜ to confirm; carrying the event through the hand-off is later
   work). The analytics: the visit's `open` as any; a stored save sends `save` (SPEC-analytics § 14).
3. **Unchanged**: every other fragment, the dialog's contents and words, *Not ready?* itself.
4. **Cases**, written first and run red: **SL1** the page opened at `#save` has the dialog open after load, at the
   save step's `OFFER`, on both targets with the save step; **SL2** closed, the page is at its start and no answer is
   pressed; **SL3** the page opened at `#lean-and-7d`, `#from-email` or no fragment opens no dialog; **SL4** production
   `false`: `#save` opens nothing. **Mutant**: the opening on any fragment (SL3).
5. **When.** Built on `boston/save-link` (from the release line `5fbe44f`), merged into the release line, the full
   suites, dev, then production, **before** the Footer block of § 35 is pasted (its link must lead somewhere live).
