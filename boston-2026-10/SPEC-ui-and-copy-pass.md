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
