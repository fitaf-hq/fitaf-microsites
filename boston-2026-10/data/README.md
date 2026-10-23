# data/

The committed INPUTS of the page and the Worker. All are public. Change these, then `npm run build`; never edit `dist/`.

- **`plans.json`**: the plan table of SPEC § 2, read by a person off `read_from` on `read_on`. Every
  plan × count carries `mpid`, `meals_per_week` and `price_per_meal_cents` (integer cents). No totals are
  stored. `order_base_url` is the one place the doors point; re-point it for a future store.
  ⚠ `mpid`s are HMP configuration and are **not in order** (Signature 14 is `29`, 21 is `28`). Re-read
  them from the store; never infer one from its neighbours.
- **`save.json`** (rung 4): the save endpoint, the wording version the page sends (`v0.3-draft`) and the
  versions the Worker accepts, the send zone and hour (09:00 America/New_York), and the lapse periods
  (30 days after an offer ends; 7 days for an unconfirmed expansion request; `expansion_retention_days`, 365,
  ⬜ proposed). When the wording is approved, add `v1` to `known_wording_versions` and point
  `wording_version` at it. ⭐ **`production`** (`SPEC-save-offer-production.md` § 3): `false`, the production page and
  Worker are as they were (S20, SP3); `true`, the production page carries the save step and the production Worker its
  routes and cron, and `npm run build` **refuses, naming each**, until the wording is `v1` (DRAFT.md's status line with
  its date, no Owner placeholder left), `offers.json` is `approved`, `delivery-zips.json` is `official`, and production's
  `MAIL_FROM` (an address at eatfitaf.com: since § 10 `Fit AF <offers@eatfitaf.com>` is the decided sender, not a
  placeholder) and `TURNSTILE_SITE_KEY` (wrangler.jsonc's top level) are real. **`privacy_notice_url`**: where the step's
  last line links the privacy notice (DRAFT § 6); `null` shows DRAFT § 1's `[Privacy notice]` placeholder, which a
  production build refuses. Since § 9 (2026-10-21) **`"/privacy/"`**: the page the build makes from DRAFT § 6 (the
  development build always, marked DRAFT; the production build only with `production` true).
- **`offers.json`** (rung 4): ⭐ since `SPEC-save-offer-production.md` § 10.7 (the Advisor, 2026-10-22) **one offer,
  every visitor's**: the Boston offer (`applies_to: "general"`), its approved label, `code_mode: "none"`, held until
  **2026-10-29**; after that day no offer is offered (the page draws no save step, an offer save is refused `offer_ended`,
  `/o` and E1 say *"This offer has ended"*). An extension is its `valid_to`, released as the page is. The `status` stays
  `placeholder` until the switch-on approves the file; nothing in it is a placeholder. What follows was the file before:
  ⛔ **placeholders** (`"status": "placeholder"`; every `label` is `[The offer]`, every `shared_code` `PLACEHOLDER`) until
  the Owner's offers are approved. Dates are calendar dates in New
  York, inclusive. A save gets the live `event` offer, else the current `general` one; **at most one
  `general` offer is current on any date** (test S11b; it was *exactly one* until § 10.7). The past offer exists so the expired paths can be
  exercised in development. ⭐ Since `SPEC-save-offer-production.md` § 10 (2026-10-22) an offer's `code_mode` may be
  **`none`**: a price promise, not a discount code. It carries no `shared_code`; a save issues no code (the save's
  token is only the `/o/` link's identifier); E1 and `/o` say *"Your pricing is held until"* its `valid_to`; and the
  production build refuses a `none` offer carrying a code. The Boston event's offer is one, held until **2026-10-29**
  with its approved label *"Sign up today to save 25%"* (`label_approved` 2026-10-21, § 10.2: the same two fields as
  `boston/print-final`'s); the file's `status` stays `placeholder`, every other offer still `[The offer]`.
- **`messages.json`**: the campaign's phrases (the M of POEMS). The page's headline, intro line, tagline (the
  first sentence of its meta description) and top bar come from here (`build.mjs` `messageSlots`), and so
  do the same phrases on the four mock-ups (`mockups/`), plus the mock-ups' own (the scan prompt, the
  "from {price} a meal" line). Change a phrase here and both change; `event_line` is a list of parts that
  the page joins with `&middot;`. **`handoff`** is the cart hand-off's progress screen on the store's order
  page (`SPEC-rung2-progress-and-checkout.md` § 2): `title`, `step` (after each meal: `{meal}` as its card
  shows it, `{n}` added so far, `{total}` the plan's meals; the build refuses a `step` missing one) and
  `checkout`. Only `npm run build:storefront` reads it (inlined into the Footer block, non-ASCII as `\u`
  escapes); `npm run build`'s page does not change with it (S20). **`chefs_choice`** is the result card's
  Chef's Choice (`SPEC-chefs-choice.md` § 3): `open`, `heading` (`{count}`, `{date}`), `meal_qty` (`{meal}`,
  `{n}`), `note`, `checkout`, `own`; ⚠ placeholders (`status`) for the copy review. `npm run build` reads it only
  when a week in `picks/` is open, and refuses a missing phrase or placeholder. **`menus`** (since
  `SPEC-every-menu-and-nutrition.md` § 4) names each list a week may carry, in the chooser's order, `chefs-choice` first
  (`status` is its note), then the four the Advisor approved on 2026-10-21 (Poultry & Fish, Gluten Free, Comfort
  Classics, Global Explorers); a list without a name here is refused, and ⛔ a name joins only on his approval.
  `chefs_choice.heading` carries `{menu}`, and `chefs_choice.menus_label` is the chooser's own name. **`nutrition`**: `line` (`{cal}`, `{protein}`, `{carbs}`, `{fat}`), `ingredients` and
  `contains` (`{text}`); placeholders, refused missing.
- **`picks/<sunday>.json`**: this week's Chef's Choice, one file per delivery Sunday, written by Fit AF's emitter
  from the week's picks (never by hand): `{ "delivery", "menus": { "<count>": [{ "name", "display", "qty" }] } }`;
  `name` as the store's cards show it (the only key), `display` the KMS's name, which the page shows
  (`SPEC-chefs-choice.md` § 7), public fields only; a version-2 week (`SPEC-meal-selection.md` § 5) may carry, since
  `SPEC-every-menu-and-nutrition.md` § 1, a list `menus` names besides `chefs-choice`, and `meals` (each meal's
  nutrition per size, ingredients and Contains). Only `.json` files here are read, each named by its Sunday; every
  one is checked by the link tool's own rules and a broken one fails the build. The page carries each week whose
  window (the Friday nine days before to the Thursday three days before) has not ended on the build's `--on`.
  ⚠ Until its window ends, a committed file changes the production page (`SPEC-chefs-choice.md` § 6).
- **`events.json`**: one entry per QR code, `{ "id", "name", "url" }`; `id` names `dist/qr/<id>.png` and
  `.svg`, and (rung 4, dev) `dist-dev/<id>/index.html`, whose saves carry that `event_id`; `name` is the
  event as E1 names it, after *"You saved this offer at"* (since `SPEC-save-offer-production.md` § 9: `demo`
  *"eatfitaf.com"*, `boston` *"Fit AF's Boston event"*; E1 is the only place it is shown). A save names the `?e=` code its
  page was opened with when it is one of these ids (read once, by `src/qr-event.js`, for the analytics and the save
  alike), else the page's own event. ⚠ An event id and name are public; neither may name a person.
  The `demo` URL is `https://eatfitaf.com/` (the vanity domain, attached 2026-09-27). QR codes printed before
  that point at the old `workers.dev` address, which still serves the same page.
  ⭐ Since `SPEC-print-pieces.md` § 11 (2026-10-18): **`boston`** (`https://eatfitaf.com/?e=boston`, the trip's days)
  and **`seminar`** (`?e=seminar`, for the organizers' slide) after `demo`, which **stays first**: the mock-ups'
  default, the development page at `/` and the save step's built-in id read the first event. The printed pieces carry
  `boston` by default (`print/build-print.mjs` `PRINT_EVENT`). Both URLs serve the production page as `/` does.
- **`delivery-zips.json`**: ⭐ since `SPEC-save-offer-production.md` § 10 (2026-10-22) **the store's official Boston
  delivery zone** (`"status": "official"`, `"match": "exact"`): its 316 five-digit codes, read 2026-10-22, sorted, each
  `{ "zip" }` in `prefixes` (the key `src/worker/zip-class.js` reads). A snapshot: re-read it from the store when the
  zone changes. Its `near_ring` is still ⛔ **a MOCK** by three-digit prefix (the areas just outside the mocked reach, so
  an out-of-area expansion request is classed `near` or `far`, `flows/01-save-offer.md` § 5), read by prefix whatever
  the list's `match`: a code on the list is `in`, one in the ring's prefixes but not on the list `near`. A production
  build refuses a `mock` list.
