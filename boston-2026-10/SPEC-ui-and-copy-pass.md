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
