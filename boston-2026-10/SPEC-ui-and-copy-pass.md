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
