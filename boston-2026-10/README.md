# boston-2026-10

The front door for the late-October 2026 Boston trip: a single static page, opened from a QR code,
that asks two questions (goal, then which meals) and hands the visitor to the plan's order page on the
Fit AF store. Rung 1 of [`SPEC.md`](SPEC.md), which is the contract. Everything here is public (see the
[repository README](../README.md)).

## What is here

| path | what | kind |
|---|---|---|
| `SPEC.md` | the contract, §§ 0–5 | authority |
| `data/plans.json` | the plan table, read off the store's public plans page on a date | INPUT |
| `data/events.json` | one entry per event URL that gets a QR code | INPUT |
| `data/messages.json` | the campaign's phrases: the tagline (meta description), the headline, intro line and top bar (since SPEC-plan-page-refinement § 1 shown by the mock-ups only; kept), and the mock-ups' own; one place to change a phrase. Its `plan_page` key is the plan page's own words (the meals buttons, `*or*` emphasised; the footnote; the carousel's dots; ⚠ placeholders). Its `handoff` key is the hand-off's progress screen (rung 2's two faces), read by `npm run build:storefront` only; its `chefs_choice` key is the result card's Chef's Choice words (⚠ placeholders), read by `npm run build` only when a week is open | INPUT |
| `data/picks/<sunday>.json` | this week's Chef's Choice, one file per delivery Sunday (`2026-10-04.json`): `delivery` and, per count the page shows, the meals by the name the store's card shows and their `qty`; public fields only. Checked by the link tool's own rules; a broken file fails the build. **None is committed yet**: without one the page is exactly as before. See *This week's Chef's Choice* below | INPUT, weekly |
| `src/template.html` | the page: markup and inline CSS, with `{{SLOT}}` placeholders | INPUT |
| `src/app.js` | the one small inline script: the two questions, tabs, "See all plans" (a modal `<dialog>`), the carousel (4 s, none under reduced motion), URL fragment | INPUT |
| `data/photo-sheets.json` + `src/assets/photo-sheets/` | ⛔ **not committed yet**: the plan page's photographs as sprite sheets and the one manifest naming them (SPEC-plan-page-refinement § 3: `base`, and per sheet its file, size and cells, the carousel's by position, Chef's Choice's by store name). Every photo URL is `base` + file (a relative base is copied beside the page; an absolute one is a CDN). The producer is held (made by Fit AF's own pipeline, not here); **without the manifest, or with `base: null`, the page has no photograph**: no carousel, plain tiles (PR-3). A sheet the manifest names but the directory lacks refuses the build | INPUT, when it lands |
| `src/fonts/` | Poppins 600/700 and Open Sans 400/600, Latin WOFF2 subsets (Fontsource 5.3.0), with `OFL-*.txt` | INPUT, copied to `dist/fonts/` |
| `src/assets/fitaf-logo.png` | the store's public logo, 330×210, byte-identical to the store's file | INPUT, copied to `dist/assets/` |
| `src/contrast-pairs.json` | every colour pair the page draws, by token, with its role and minimum APCA Lc | INPUT to `npm run contrast` |
| `scripts/contrast.mjs` | `npm run contrast`: prints the APCA table; exits 1 on a failing pair, a raw colour outside `:root`, or an unmeasured token | tool |
| `build.mjs` | plain Node 22 ESM; fills the template from the data and writes the QR codes; `--on YYYY-MM-DD` is its date for the Chef's Choice weeks; `--out DIR` writes there instead of `dist/` (or `dist-dev/`), for Storybook's pages (`tools/storybook/`, SPEC-storybook-microsite.md) | build |
| `scripts/chefs-choice.mjs` | the build's side of this week's Chef's Choice: reads and checks `data/picks/`, and fills the page's three `PICKS_*` slots; imported by `build.mjs` only when `data/picks/` exists | build |
| `test/*.test.mjs` | T1–T7 of SPEC § 4, B1 (brand assets), B2 (contrast, with mutants), S1–S26 of rung 4 (`sNN-*.test.mjs`), M1–M21 of rung 5 (`mNN-*.test.mjs`; M14–M21 are the emails' look), R2-01–R2-33 of rung 2 (`r2-NN-*.test.mjs`, with `r2-harness.mjs` and the synthetic `r2-order-page.html`; fill A's cases are retired, listed under Rung 2 below) and R2-40–R2-52 and R2-66–R2-71 of its two faces (with `r2-screen.mjs`; the cases that need Chrome run in the watch package, below), P1–P6 of the mock-ups (`pN-*.test.mjs`), F1 (the flow renders are current, with mutants) and CC-1–CC-8 of the Chef's Choice (`cc-NN-*.test.mjs`, with `cc-harness.mjs`, the fixture week `fixtures/picks/2026-10-04.json` (invented meal names) and `cc-08-unchanged-golden.json`), PR-1–PR-10 of the plan page's refinement (`pr-NN-*.test.mjs`, with `pr-harness.mjs` and the fixture photo sheets `fixtures/photo-sheets/`, generated flat colours; PR-4's layout, PR-6 and PR-8's behaviour need Chrome and run in `tools/storybook/`), one file per case; `node --test`, no network | tests |
| `dist/` | `index.html`, `fonts/`, `assets/` and `qr/<event>.png` + `.svg` | OUTPUT, git-ignored |
| `SPEC-rung3-lead-capture.md` | rung 3's contract: claim the offer, a lead record built to be destroyed (its claim endpoint and tables are retired by rung 4) | history |
| `SPEC-rung4-save-offer.md` | rung 4's contract: save the offer first, the lead lifecycle, `/confirm` and `/o`; cases S1–S26 | authority |
| `SPEC-rung5-sending.md` | rung 5's contract: the real sender (Resend), dev only, behind an allowlist; cases M1–M9, § 8 (the derived token) M10–M13, and § 9 (the emails in the page's look) M14–M21 | authority |
| `SPEC-photo-slots.md` | the photo slots (PROPOSED): a phone in portrait at 390 px ×3; `page-hero` 4:3, `square`, `slide`; the page photo's weight budget. The surface a photo is judged against; no photo is ever committed | authority |
| `consent/DRAFT.md` | the consent wording (v0.3, ⛔ not approved): the page (§§ 1–2), the emails (§ 3) and `/confirm` (§ 4) show it verbatim | authority |
| `flows/` | the multi-step flows (save the offer, build a plan, the next-day email, text (off for October), return, the lead record, the calendar cart, this week's menu), each with a Mermaid diagram: states, transitions, data, consent points, written **before** they are built | design; the contracts win where a flow and a contract disagree about something built |
| `flows/rendered/` | each flow's diagram as an SVG (committed, stamped with its block's hash) and a 2× PNG (git-ignored), for a screen share; see its README | OUTPUT of `npm run render:flows` |
| `data/save.json` | the save endpoint, the wording version the page sends and the versions the Worker accepts, the send hour and zone, the lapse periods | INPUT |
| `data/offers.json` | the offers, ⛔ **placeholders** (`"status": "placeholder"`): which one a save gets, which is current, and the label the dev page's offer box shows | INPUT |
| `src/save/` | **dev build only**: Flow 1 (`section.html`, `flow1.js`), the share panel (`share-panel.html`, `share.js`), the one arithmetic module (`calculator.js`), `banner.html`, `style.css` | INPUT |
| `src/chefs-choice/` | the result card's Chef's Choice, inlined only when a week is open: `card.html` (the list, always open since SPEC-plan-page-refinement § 2 item 5, and the two links; its words are `{{…}}` slots), `chefs-choice.js` (chooses the week and follows `app.js`'s card), `style.css` (tokens only; `npm run contrast` reads it) | INPUT |
| `src/worker/` | the Worker (below) | INPUT |
| `src/worker/email-tokens.json` | the emails' copy of `src/template.html`'s `:root` tokens, written by `npm run email:tokens` (a Worker cannot read the template at run time); M17 fails when it differs | DERIVED, committed, never hand-edited |
| `migrations/` | D1 schema, applied in order: `0001_claims.sql`, `0002_contacts.sql` (rung 3), `0003_saves.sql` (rung 4: drops rung 3's tables), `0004_sending.sql` (rung 5: attempts, Resend's id, the send claim) | INPUT |
| `scripts/` | `seed-dummy.mjs` + `dummy-saves.mjs` (dummy data, dev only), `purge.mjs`, `erase.mjs`, `d1-cli.mjs`; `email-tokens.mjs` (`npm run email:tokens`) and `preview-emails.mjs` (`npm run preview:emails`); `flow-sources.mjs` + `flow-theme.mjs` (the flow diagrams' blocks, stamps and theme, browser-free: used by F1 and by the renderer) | tools |
| `tools/render-flows/` | the flow-diagram renderer (`npm run render:flows` delegates to it): **its own npm package and lockfile**, so mermaid-cli and puppeteer are never in this package's install, which the deploy runs; see its README | tool, separate package |
| `mockups/` | ⭐ **four marketing mock-ups for a screen share** (tent card, flyer, banner, slideshow), built from the page's own data, tokens, logo and QR code; photos by manifest, never committed. See [`mockups/README.md`](mockups/README.md) | INPUT + build |
| `dist-mockups/` | the mock-ups: HTML, PNGs and the photos they show | OUTPUT, git-ignored |
| `dist-dev/` | the development pages: `index.html` and `<event-id>/index.html` per event (rung 1's page, Flow 1 on top, Flow 2 as a meal size, the share panel); `email-preview/e1.html` and `ex.html` from `npm run preview:emails` | OUTPUT, git-ignored |
| `SPEC-rung2-cart-handoff.md` | rung 2's contract: the cart hand-off, § 6 (the store's Custom Scripts Footer) and § 12 (fill B is the mechanism; fill A is retired) govern | authority |
| `SPEC-storefront-watch.md` | the storefront watch: an hourly GitHub Actions check of the store's public bundle, the dependencies the hand-off presses, Fit AF's Footer block, and a live smoke test of the hand-off on each flag (never submits); an issue per release | authority |
| `SPEC-chefs-choice.md` | this week's Chef's Choice on the plan page and *Choose my own meals* (ruled 2026-09-30): `data/picks/<sunday>.json`, the week chosen in the browser by the Friday switch, links through the link tool; cases CC-1–CC-8. § 6 is the build's notes | authority |
| `SPEC-rung2-progress-and-checkout.md` | rung 2's two faces (ruled 2026-09-29): *"Assembling your order"* with a carousel of the meals as fill B adds them, and a checkout stripped by style to the order and the payment for a deep-carted visit only (the offer to subscribe hidden while it is off); the payment's controls measured unchanged, live; cases R2-40–R2-52, W10–W13. Built at `ed422ad`; § 8 is the build's notes (H6 also requires a switch; the screen in the browser's top layer; its clocks CSS animations; the size). § 15 (ruled 2026-09-30, for the 21:00 paste): the key ignores a leading marketing tag (`🟠NEW:`), fill B's 10 s counts from the first titled card (up to 30 s for one), and the Fit AF logo (the store's own header image) on the screen and the checkout; cases R2-66–R2-71, W16; built at `d57a273`, § 16 its notes | authority |
| `tools/storefront-watch/`, `storefront/` | the watch itself, its own npm package (puppeteer-core; the site's install never gets it), and its committed inputs `storefront/dependencies.json` and `storefront/watch-baseline.json` (written by its `accept`, which since § 8 names the release it accepts, `--release main-<name>.js`, and refuses when another is live). Its § 7: a new release's publish time (the entry's `Last-Modified`) in its report and issue, and a failed smoke width's page as text, redacted, never a screenshot. Its smoke also checks rung 2's two faces live (W10–W15, and W16, the Fit AF logo), and its suite runs this package's rung 2 cases that need Chrome | tool; INPUT |
| `src/storefront/fitaf-handoff.js` | rung 2: the hand-off script, fill B, the one fill (§ 12), with its two faces (the progress screen, the stripped checkout); its `//` lines are for maintainers and do not ship, and every line that ships is pinned byte for byte (R2-32) | INPUT |
| `src/storefront/meal-key.js` | rung 2 § 11: a meal's key, ONE function: `handoff:link` imports it and the build inlines its text into fill B; since the two faces' § 15.1 a leading marketing tag (`🟠NEW: `) is not part of the name as keyed | INPUT |
| `scripts/build-storefront.mjs` | `npm run build:storefront`: two files of one text, the plan counts, the key function, the screen's words (`data/messages.json`) and colours (`src/template.html`'s tokens) inlined, the version line; warns above 5,120 bytes and refuses above 10,240 (§ 11), and refuses any `<` but the Footer block's own script tags (the two faces' § 11) | build |
| `scripts/handoff-link.mjs` | `npm run handoff:link`: prints a test link (payload version 2) and each meal's key beside its name | tool |
| `dist-storefront/` | `fitaf-handoff.html` (the Footer block) and `fitaf-handoff.fill-B.console.js` (the same text, for a browser console) | OUTPUT, git-ignored |

**Nothing in `dist/` is hand-edited.** To change the page, change `data/` or `src/` and rebuild.

## Rebuild and test

```sh
npm --prefix boston-2026-10 install
npm --prefix boston-2026-10 test        # T1–T7, B1–B2, S1–S26, M1–M21, R2-01–R2-71, P1–P6, F1, CC-1–CC-8, PR-1–PR-10
npm --prefix boston-2026-10 run contrast  # the APCA table; exit 1 if any pair is under its minimum
npm --prefix boston-2026-10 run build   # writes dist/ (-- --on YYYY-MM-DD: the date for data/picks/; default today in New York)
npm --prefix boston-2026-10 run email:tokens    # after a :root token change: the emails' copy (M17 fails until then)
npm --prefix boston-2026-10 run preview:emails  # dist-dev/email-preview/{e1,ex}.html, for a screen share
npm --prefix boston-2026-10 run build:mockups  # the four mock-ups -> dist-mockups/ (mockups/README.md)
npm --prefix boston-2026-10/tools/render-flows ci  # the renderer's own install (not part of the one above)
npm --prefix boston-2026-10 run render:flows  # flows/rendered/: every flow diagram as SVG + 2x PNG (installed Chrome)
```

## Rung 2 — the cart hand-off in the store's Footer

[`SPEC-rung2-cart-handoff.md`](SPEC-rung2-cart-handoff.md) § 6 (fill B's finish: § 8; the short link: § 11; fill B the mechanism: § 12). A link
to `https://fitafnutrition.com/order?mpid=<N>#fitaf=<payload>` fills the visitor's cart and goes to `/checkout`; the
payload never leaves the browser. **Any failure removes the fragment and stops**, leaving the plan's order page
exactly as rung 1 does. A visit without `#fitaf=` costs one read of `location.hash` and nothing else.

- **The link, payload version 2 (§ 11)**: `#fitaf=2.<key>[*n].<key>[*n]…[.~CODE]`, ASCII, dot-separated. Each meal
  is its **key**, 5 base-36 characters: 32-bit FNV-1a over the UTF-8 bytes of its name as the page shows it
  (whitespace collapsed and trimmed), the last 5 characters (`src/storefront/meal-key.js`, the one function
  `handoff:link` and fill B share); `*n` is its count, 2 to 21 (a count of 1 is the bare key). The plan is **not**
  in the fragment: the script reads the page's own `?mpid=`. The 7-meal Lean link is 90 characters:
  `https://fitafnutrition.com/order?mpid=21#fitaf=2.t1fkl.8avab.ihshe.1i5s0.tyv72.rgr2m.6uf54`. **Version 1
  (base64 JSON) is retired**: a v1 link is refused as an unknown version.

- **The full-plan rule** (fill B, and `handoff:link`): the counts must add up to **exactly** the plan's
  `meals_per_week` in `data/plans.json` (7 for mpid 21; Family, mpid 35, is 1), else the payload is refused before
  any press or write with *"the plan needs N meals; the link has M"*. The store's order page will not check out
  short of the plan (*"Please add at least 7 meals to continue"*): the one-browser run of 2026-09-29 (fill B,
  mpid 21) added 2 of 7 correctly at the store's own price, opened `/checkout`, and the checkout failed.
- **Fill B is the mechanism; fill A is retired (§ 12, the Advisor's ruling of 2026-09-29, after his browser test of the
  v2 link passed).** Fill A wrote the store's cart storage (`hmp_local_cart`) and could not read a v2 link (it needed a
  product id per meal). Its code, its console file and its tests are removed; the history keeps them. **The retired
  cases, 73, last present at `cc8a752`** (`git show cc8a752:boston-2026-10/test/<file>`): R2-06
  (`r2-06-fill-a-line.test.mjs`, 2 cases), R2-07 (`r2-07-fill-a-refusals.test.mjs`, 9) and R2-08
  (`r2-08-fill-a-guard.test.mjs`, 4), whole; R2-01b; R2-02's 29 `fill A refuses: …`; R2-03's 10 `fill A on …`;
  R2-04's 7 `fill A, hash …`; R2-05b; R2-12c (the `FILL` switch picking the Footer's fill); R2-14a, R2-14b and R2-14c
  `fill A`; R2-27's 6 `fill A refuses …`; and fill A's halves of R2-02's and R2-27's controls and of R2-14e. Every
  fill-B case is kept; R2-29 now pads fill B's console file (the file it padded to 5,120 was fill A's).
- **Fill B** waits (200 ms polls, at most 10 s) until every meal's card and its **Add to Cart** are on the
  page — one missing means nothing is pressed — then presses each meal once, then the extra presses. It finds a
  meal's card by **key** (§ 11): it keys every card's title and presses the card whose key the link names. Two cards
  sharing a key the link names: `stopped: two meals share a key: <key>`, nothing pressed (the same meal rendered in
  two cards counts as two); a key no card has: `not on this page: <key>`. ⚠ What Add to
  Cart becomes after a press is not known: B presses it again if it is still there, else an increase / plus / `+`
  button in the same card's actions (never a favourite or wishlist). If there is neither, B **stops after the
  first press of each meal**, without going on to checkout.
- **Fill B's finish (§ 8): it presses the store's own CHECKOUT; it never loads `/checkout` itself.** On a
  meal-plan page, Add to Cart puts a meal in the plan's *pending* list; only the store's checkout control commits
  it and routes to `/checkout` in the app (loading `/checkout` found *"Your cart is empty"*). After the last meal
  B waits (the same 200 ms polls, at most 10 s) for an enabled, displayed button reading exactly `checkout` or `checkout now`, not
  inside a meal card; removes the fragment; presses it once; then waits for `/checkout` (logs `done: /checkout`),
  pressing the extras dialog's `continue to checkout` once if the store opens it. **Each wait after the store's
  CHECKOUT (and after CONTINUE) is at most 30 s** (§ 11: one live phone-width run stopped at 10 s with the store
  still committing). None found:
  `stopped: no checkout control`, the meals left in the visitor's pending list. B writes no storage.
  **Two labels** (§ 8, amended): below 1025 px the store's CHECKOUT bar reads *"CHECKOUT"*; at 1025 px and wider
  its cart sidebar reads *"CHECKOUT NOW"*. Both run the store's same checkout, and B takes whichever is displayed.
- **Fill B starts only on an empty plan (§ 10).** Before its first press, if the store displays any control in its
  checkout slot for this plan, enabled or not (below 1025 px the cart bar's *CHECKOUT*, *"Add N more meal(s)"*,
  *"Limit Exceeded"*; at 1025 px and wider the sidebar's *CHECKOUT NOW*, *"ADD N MORE MEAL(S) TO CHECKOUT"*,
  *"REMOVE N MEAL(S) TO CHECKOUT"*), B stops with `stopped: the plan already holds meals` and presses nothing: the
  store shows none of them for an empty plan (its bar hidden, its sidebar reading *"Your cart is empty"*; § 10's
  build note has the files). It never removes a visitor's meals, so a reload or a second run of a link adds nothing.
  The check runs on every poll of B's wait, the last just before the first press: a meal already chosen shows the
  store's counter instead of *Add to Cart*, so a reload never "finds" the link's meals. Every stop has its own line:
  `not on this page: …`, `two meals share a key: …`, `the plan needs N meals; the link has M`, `the plan already
  holds meals` (all before any press), `no checkout control` (after the meals), `/checkout not reached` (after
  CHECKOUT). A malformed link stops with its own reason (`unknown version`, `bad meal: …`, `bad code`, `named
  twice: …`, `no mpid on this page`) before it looks at the page's content.
- **The offer code** is checked but not applied in this build.
- **Rung 2's two faces** ([`SPEC-rung2-progress-and-checkout.md`](SPEC-rung2-progress-and-checkout.md), ruled
  2026-09-29; its § 8 is the build's notes). Once the link and the plan's count pass their checks, fill B shows **one
  element of its own**, `#fitaf-screen`, over the whole order page (in the browser's top layer, as a manual popover,
  since the store's own overlays are there too; ⚠ one the store opens after it, its extras dialog after CHECKOUT, is
  above it): *"Assembling your order"*, a bar at the presses made
  of the plan's count + 1 (the last is the store's CHECKOUT, then *"Taking you to checkout"*), and a carousel of the
  meals as their cards show them (the card's photo only if the page has already loaded it, its `currentSrc` reused:
  nothing is requested), one slide per meal as fill B presses it, cycling every 2.5 s once all are added; with
  `prefers-reduced-motion` nothing slides or cycles. The words are `data/messages.json`'s `handoff`, the colours the
  page's own tokens, both inlined by the build. It holds no control and nothing focusable. It goes at `done` (after
  the checkout's style is set), at every stop (before the stop's line), and in any case 90 s after it appeared. ⚠ Its
  clocks are **CSS animations**, not timers: fill B's timers stay its 200 ms polls. **At `done`**, `html.fitaf-deep` and
  one `style#fitaf-deep` hide, only while the store's `app-checkout` is on the page, the header, footer, credit line and
  pop-ups (H1, H2, H5), and inside the checkout only the two sign-in links (H3, H4) and the offer to subscribe while its
  switch is off (H6). Never storage: a reload of `/checkout` is the store's full checkout. **An ordinary visit gets
  nothing** (R2-04, R2-40). **§ 10** (the Advisor's first look): the store's extras pop-up is made invisible, never
  removed, while the screen is up; and the checkout also hides the discounts unless the link carries an offer code (H7),
  the app banner with the top margin it reserves (H8), the Subtotal, Shipping and Tax rows but never a discount row or
  the Total (H9), and the tip while none is chosen (H10). **§ 12** (the Advisor's ruling): immediately before it
  presses CHECKOUT, and at no other moment, fill B sets the store's own `sessionStorage['ecc_additions_prompt_handled']`
  to `"true"`, so the store skips its extras pop-up; the one thing fill B writes. A store that ignores it gets the § 10
  handling, the pop-up invisible and its CONTINUE pressed.
  **Where its cases run**: R2-40–R2-44, R2-50 and R2-52's first half here (linkedom, the shipped text); the ones that
  need a browser (`:has()`, what is displayed, the top layer, motion, the 90 s clock, real images: R2-41c,
  R2-45–R2-49, R2-51, R2-52 in Chrome) in `tools/storefront-watch/test/r2-*.test.mjs`, because that package is the one that drives Chrome and this
  one never installs it. The live checks W10–W16 are in the watch's smoke. **§ 15** (for the 21:00 paste): a leading
  marketing tag (`🟠NEW: `) is not part of a meal's key (R2-66); fill B's 10 s for the meals starts at the first poll
  that finds a titled card, and with none for 30 s it stops, `no meal cards on this page`, pressing nothing (R2-67–R2-69);
  the Fit AF logo, the store's own loaded header image, is shown at the top of the screen on a white plate (ruled after
  the rehearsal) and at the top of the checkout
  component (R2-70, W16); the text stays ASCII, within 10,240 bytes and names no new address (R2-71).
- ⛔ **Not yet run on the live store**: the full-plan rule, fill B's second presses of a meal (the
  2026-09-29 run pressed each of its two meals once), fill B's § 8 finish, and fill B's § 10 check. Nor any v2
  link (§ 11): matching by key, the two-card refusal and the 30 s wait are proven here on the synthetic page only.
  Nor the two faces: the screen and the stripped checkout are proven on the synthetic page and the watch's synthetic
  store only; the live smoke (with W10–W13) runs before any paste, and the Advisor looks in his own browser.

```sh
npm --prefix boston-2026-10 run build:storefront   # writes dist-storefront/, prints each file's size and version line,
                                                   # and a warning for each file over 5,120 bytes
npm --prefix boston-2026-10 run handoff:link -- --mpid 21 --item "Birria de Res Bowl:2" --item "…:5" \
    [--code CODE]   # prints the v2 link, then each meal's key (and count) beside its name; the counts must make the
                    # plan's weekly count (here 7: "Birria de Res Bowl:2" + …:5). --pid-for is retired with v1.
```

- **`dist-storefront/fitaf-handoff.html`** is the Footer block: `<script>`, a version line
  `/* fitaf-handoff <commit> sha256:<hex> */` (the hash of the text after it, so what is live can be compared with
  what is kept; `-dirty` if an input was uncommitted), the script, `</script>`. It carries fill B, the one fill (§ 12).
- **`fitaf-handoff.fill-B.console.js`** is the same text, for pasting into a browser console on the live order page
  with a test link (the one-browser run of § 6); it keeps its name, so a runbook that names it still works. There is no
  fill-A file.
- ⭐ **The shipped text is pinned (§ 12 item 3, R2-32)**: its SHA-256, the one in each version line, is
  `914668ded95f6a8913e7ae0010661d26780700bd7443cbf93f9e4e8a875b41f6` since the two faces' § 15 (`d57a273`: the key's
  marketing tag, the wait for the cards, the Fit AF logo; `ac6c8e8`: the screen's logo at the top on a white plate, as
  the Advisor ruled after the rehearsal; `adf6024c…` between them), **not yet pasted**. ⭐ **The block live in the store's Footer
  since 2026-09-29 ~23:45 PDT is `c4ceb682…`** (`ace775b`, the two faces' § 12: the store's own extras key set just
  before CHECKOUT; the watch's baseline expects it, and CC-8's golden names it as the text § 15's `replaces`). Before
  it: `c6775461…` (`8f5ee58`, live from ~22:04 PDT, § 11 as amended: no `<` in the text, which the store's admin reads
  as HTML), `5eb8416e…` (`4697f19`), `c87cb754…` (`9e67484`), `aa773aec…` (`ed422ad`), `28ce3983…` (`7b0d74f`), and
  `054e6be87aa3d690814be2b8165b29830d36f1503a5da418d4cc6b2a680bb2b8` (`8945de1`'s text, the first block placed in the
  Footer, 2026-09-29). Changing a shipped line is a separate amendment, with the live smoke before its paste, and moves
  the pin in the same commit; only the source's `//` lines change freely.
- **The size (§ 11, the Advisor's ruling)**: each whole file should be at most 5,120 bytes, which the build **warns**
  above, and must be at most 10,240, which it **refuses** above, writing nothing. **Built 2026-09-29 at `c1764c1`**:
  the Footer block 5,180 bytes and `fitaf-handoff.fill-B.console.js` 5,161 (both warned: the key function and the
  v2 reader cost more than v1's reader saved); 6 more each from an uncommitted tree. The same two sizes since § 12:
  the text did not change. **With the two faces (`ed422ad`)**: the Footer block **8,768** bytes and the console file
  **8,749**, both warned, under the ceiling; the Advisor accepted *about 7 KB*, and the two faces cost 3,588 bytes, not
  the 2 KB the contract estimated (SPEC-rung2-progress-and-checkout § 8 has the breakdown). **With its § 10
  (`9e67484`)**: **9,299** and **9,280**; **with § 11 (`4697f19`, `d1f0e36`)**: **9,523** and **9,504**; **with § 12
  (`d5a371e`)**: **9,614** and **9,595**; **with § 15 (`d57a273`, `ac6c8e8`)**: **10,224** and **10,205**, under the ceiling only
  once every line inside the block's function was indented one level less (the three changes cost 750 bytes; the
  layout gave back 200; the white plate cost 60 more; SPEC-rung2-progress-and-checkout § 16). ⛔ **The
  shipped text holds no `<` at all** but the Footer block's own `<script>` and `</script>`: the store's admin reads the
  text inside the block as HTML and `<` before a letter, even across a space, as a tag. The build **refuses** such a
  text, writing nothing (R2-58, R2-58b); write a comparison the other way round (`s.length > i`). R2-29 reaches the target's
  edges from a small source since then (a pad only adds). The build never touches `dist/`, so `npm run build` stays
  byte-identical (S20).
- ⛔ **The kill switch is deleting our block from the Footer.** Never the store's *"Inject these scripts"* switch:
  it stops every vendor's script at once.

## This week's Chef's Choice — the result card ([`SPEC-chefs-choice.md`](SPEC-chefs-choice.md))

- **The input** is `data/picks/<sunday>.json`, one per delivery week, written by a person from the week's picks:
  `{ "delivery": "2026-10-04", "menus": { "7": [{ "name": "…", "qty": 2 }, …], "14": […] } }`. `name` is the meal
  exactly as the store's card shows it (a `🟠NEW:` tag included or not: since the two faces' § 15.1 a leading tag does
  not change the key); nothing else, no id, no price. Each menu, for each
  size, goes through `handoff:link`'s own `payloadFromArgs` (qty 1–21, names distinct, no two sharing a key, the
  counts making the count), so the build refuses what the link tool refuses, naming the file, before it writes.
- **The week**: delivery Sunday S is open from S − 9 (Friday, the store's switch) through S − 3 (Thursday). The
  build embeds every file whose window has not ended on `--on` (so a page built on a Thursday carries Friday's
  week); the page picks, **in the browser**, the week whose window holds the date in New York (the offer's own
  `zonedDate` and `isLive`, inlined), or none: never last week's.
- **The card**: with picks for the chosen count, *Choose your meals* gives way to the week's list, **always open**
  since SPEC-plan-page-refinement § 2 item 5 (the heading, each meal with its count and a tile to its left, its photo
  sheet's cell or plain, and *Continue to checkout*, the size's `#fitaf=2.…` link) and *Choose my own meals* (the plan's
  order page, the rung 1 link). The list is the same for
  every size. The words are `data/messages.json`'s `chefs_choice` (⚠ placeholders for the copy review).
- **Without a picks file** (or none open, or none for the count) the page is exactly as before: the template's
  three `PICKS_*` slots are empty (CC-4, S20). The grid's links, the Family tab, the Footer block and the Worker are
  unchanged (CC-6, CC-8).
- ⚠ **Committing a picks file changes the production page until its week's window ends.** S20, S24 and S18's build
  case build with an empty picks directory (their subject is the page without picks; `SPEC-chefs-choice.md` § 6,
  ruled 2026-09-30), so a committed week moves none of them; Chef's Choice is CC-1–CC-8's.

```sh
npm --prefix boston-2026-10 run build -- --on 2026-09-30   # prints "picks: 2026-10-04 (open 2026-09-25 to 2026-10-01; …)"
```

## ⛔ Deploys are not run from here (retired 2026-09-29)

Both Workers — production and `dev` — and the dev Worker's secrets are managed as **infrastructure as code,
applied by CI**. CI checks out a **pinned commit** of this repository, runs `npm run build` (or `build:dev`)
and uploads the result; for dev it first runs `npm run db:migrate:dev`. So a commit here changes nothing
live until a pin moves to it, and **a release is a pin change**, reviewed where the pin lives.

- **Retired**: `deploy`, `deploy:dev` (and their `predeploy` hooks), `secret:resend:dev`,
  `secret:allowlist:dev`, `secret:token-key:dev`. ⛔ Do not add them back: a second path that writes the
  same Worker would let the live Worker drift from the code that is supposed to describe it.
- **Kept, because CI or a person still runs them**: `build`, `build:dev`, `db:migrate:dev`, and the dev
  data scripts below; `preview` and `preview:dev` run locally only.
- ⚠ `wrangler.jsonc` now drives only local preview and `db:migrate:dev`. The deployed Workers' settings
  (vars, bindings, the cron, `workers.dev`, the custom domains) are **mirrored** in the infrastructure
  code: a change to this file reaches nothing live until it is mirrored there too.

## Rungs 3–4 — development only

⛔ **Nothing below touches production.** The top level of `wrangler.jsonc` is the production Worker and is
unchanged: no script, no bindings, no cron. Rung 4 ([`SPEC-rung4-save-offer.md`](SPEC-rung4-save-offer.md))
lives in its `dev` environment — Worker `fitaf-microsites-dev`, D1 `fitaf-leads-dev` (dummy data only),
Cloudflare's published Turnstile **test** keys. The production build (`npm run build`) leaves every
development slot empty and every reworded slot at its old text, so `dist/` is byte-identical to the build
before rung 4 (test S20 compares SHA-256s with `test/s20-production-golden.json`).

```sh
export CLOUDFLARE_ACCOUNT_ID=…            # never committed
npm --prefix boston-2026-10 test                      # T1–T7, B1–B2, S1–S26, M1–M21, R2-01–R2-71, P1–P6, F1, CC-1–CC-8, PR-1–PR-10 (Miniflare, no network)
npm --prefix boston-2026-10 run db:migrate:dev        # D1 migrations -> fitaf-leads-dev (0003 drops rung 3's tables; 0004 adds sending)
npm --prefix boston-2026-10 run seed:dev              # 20 dummy saves, 5 marked exported
npm --prefix boston-2026-10 run purge:dev             # DRY RUN: counts only
npm --prefix boston-2026-10 run purge:dev -- --apply  # delete exported saves' contacts; mark them purged
npm --prefix boston-2026-10 run erase:dev -- --email dummy-0001@example.com          # DRY RUN: counts only
npm --prefix boston-2026-10 run erase:dev -- --email dummy-0001@example.com --apply  # erase on request
npm --prefix boston-2026-10 run build:dev             # writes dist-dev/ (CI builds and uploads it)
```

Dev URL: `https://fitaf-microsites-dev.fitaf-microsite-boston-2026-10.workers.dev/` (`/<event-id>/` per event).

**The page** (flows 1 and 2): the offer first, with **Save my offer** (email, ZIP, an unticked marketing
box) and **Build my plan →**; an out-of-area ZIP is caught in the page and offered the expansion list; Flow
2's first question is a meal size; the share calculator's targets never leave the browser. `#from-email`
opens at Flow 2 with Flow 1 collapsed. The offer box shows the `label` of the offer a save made now would
get: the Worker's own `offerForSave` on the New York date, run in the browser (inlined, like the ZIP check)
over `data/offers.json`'s ids, labels and dates — never a code — so the build stays date-independent (§ 2a).
Per flow: one state object, one `render(state)` that alone writes the DOM, transitions named after the flow's
rows (`src/save/flow1.js`, `src/save/share.js`). Flow 2's own script is still rung 1's `src/app.js`, unchanged
so production stays byte-identical.

**The Worker** (`src/worker/`):

| route or trigger | module | what it does |
|---|---|---|
| `POST /api/save` | `index.js`, `validate-save.js`, `save-store.js` | a save (`offer` or `expansion`), idempotent per (event, kind, email); returns `{ ok: true }` only |
| `/confirm/<token>` | `confirm.js` | GET renders LANDING or GONE and changes nothing; POST `action=yes\|no` |
| `/o/<code>` | `redeem.js` | ORIGINAL · WELCOME_BACK (one reissued code per original per offer) · CURRENT |
| cron, every 5 minutes | `scheduled.js` → `send-due.js`, `lapse.js`, `purge.js` | send what is due, then the lapse, then the purge; counts only |

- **Nothing is sent without the Resend key** (rung 5, below). Without `RESEND_API_KEY` the cron's `Sender`
  is `NullSender` (`senders.js`), which sends nothing and leaves each message `scheduled`. `NullRedemptions`
  knows of no redemption: the order source is still open. Tests use a recording sender and a stubbed `fetch`.
- **E1 goes at 09:00 America/New_York on the next calendar day** (`zoned-time.js`, with `Intl`: there is no
  `Temporal` in the Workers runtime or in Node 22). An expansion request's E-X goes at once.
- **The `/confirm` token** is made when its message is sent, 32 bytes; only its SHA-256 is stored. Since rung
  5 it is derived from the save id with `CONFIRM_TOKEN_KEY` (below), so every attempt carries the same one.
- **The lapse** (`lapse.js`): an offer save without confirmed marketing 30 days after its offer ends; an
  expansion request unconfirmed after 7 days; a confirmed one after `expansion_retention_days` (365,
  proposed). Each deletes the contact and sets `lapsed`; the save row stays.
- **Every run a person starts is a dry run by default** (`purge.mjs`, `erase.mjs`), and the seeder, the
  purge and the erase refuse any database but `fitaf-leads-dev`. Dummy contacts are `dummy-NNNN@example.com`.
- **The rate limits are per IP per minute** (a Workers rate-limit binding counts over 10 or 60 seconds):
  saves, and lookups (`/confirm`, `/o`), 5 each. The IP is the limiter's key and nothing else.
- **The Worker's pages draw no colour** (browser defaults), so `npm run contrast` has no pair to measure for them.
  The emails do; see *Branding*.
- **The mutant cases never write a committed file**: T7 swaps a copy of the data; S15 and S14b import a
  mutated copy of `lapse.js` / `purge.js`. `LAPSE_MODULE=<copy> node --test test/s14-lapse.test.mjs` shows
  S14 failing on a copy (and `PURGE_MODULE=<copy>` the purge case).

## Rung 5 — sending through Resend, dev only, to an allowlist

[`SPEC-rung5-sending.md`](SPEC-rung5-sending.md). ⛔ **Development Worker only**; production is unchanged.
The development database holds dummy `@example.com` addresses, which accept no mail: sending to them would
**bounce**, and bounces damage a new sending domain's reputation. So the real sender runs **only to
addresses on an allowlist**.

**The three secrets — set by the infrastructure code (since 2026-09-29), never committed here, never typed:**
`RESEND_API_KEY` is a sending-only key, `SEND_ALLOWLIST` is configuration kept a secret binding because it
may name a real address, and `CONFIRM_TOKEN_KEY` is generated (random, 44 characters) and seen by nobody.
Until 2026-09-28 they were set with `wrangler secret put` scripts in this package; those are retired (see
*Deploys are not run from here*). Replacing the token key changes every `/confirm` link in an email not yet
sent; links already sent keep working, because the database holds their hashes.

- **`SEND_ALLOWLIST`**: a comma-separated list of exact addresses and `@domain` entries (a whole domain, not
  its subdomains; case does not matter). A message to anyone not on it is **held**: nothing is requested,
  it stays `scheduled`, and it is neither sent nor failed. **Unset or empty sends nothing.** For a first
  check, use Resend's published test addresses
  ([Resend: send test emails](https://resend.com/docs/dashboard/emails/send-test-emails)):
  `delivered@resend.dev` (accepted and delivered) and `bounced@resend.dev` (the receiving server refuses it),
  each also with a `+label` (`delivered+first@resend.dev`); an allowlist of `@resend.dev` admits exactly
  those.
- **`RESEND_API_KEY`** present → `ResendSender` behind the allowlist; absent → `NullSender`, rung 4's
  behaviour (`choose-sender.js`). With the Resend key, **`CONFIRM_TOKEN_KEY` is required**: without it (or
  under 32 characters) the sender refuses to start and the cron run fails, sending nothing (M13).
- **The `/confirm` token is derived, not drawn** (§ 8 of the contract): `base64url(HMAC-SHA-256(
  CONFIRM_TOKEN_KEY, "<save_id>:confirm"))`, by Web Crypto (`confirm-token.js`). Only its SHA-256 is stored,
  as in rung 4, and whether it still works is decided by the database, not by the token.
- **`MAIL_FROM`** is public config in the `dev` vars of `wrangler.jsonc` (mirrored in the infrastructure
  code, which is what the deployed Worker uses): ⬜ the placeholder `Fit AF <offers@eatfitaf.com>` until the
  Owner names the sender. Its domain must be verified in Resend; `eatfitaf.com` was, on 2026-09-29.

**The sender** (`resend-sender.js`, from Resend's documentation read 2026-09-27): `POST
https://api.resend.com/emails` with `Authorization: Bearer`, a `User-Agent`, and an `Idempotency-Key` of
`<save_id>:<E1|EX>`; the body is `{ from, to: [email], subject, html, text }`, the HTML and the text part
rendered from one list of lines (`messages.js`). Accepted → `sent` and Resend's `id` stored in
`provider_message_id`. A permanent refusal (a 4xx other than 429) → `failed` at once. Temporary (429, 5xx, a
network error or a 10 s timeout, and 409 `concurrent_idempotent_requests`) → stays `scheduled`,
`send_attempts + 1`; the fifth → `failed`. A `sent` or `failed` message is never selected again.

**Every attempt for one message sends a byte-identical body** (the token is derived), so Resend's
idempotency key replays within its 24-hour window: an accepted send whose database write was lost is
retried under the same key and comes back with the first request's id, and is marked `sent` without a
second email (M10, M11). A 409 `invalid_idempotent_request` (the key reused with a different body) can then
only mean a defect: it is `failed` and counted.

**A send in flight is never requested twice**: each run first **claims** a due message
(`send_lease_until`, 15 minutes) and every outcome clears the claim; a later run that finds the claim
skips the message (`inflight`). The idempotency key covers what the claim cannot, a send accepted and then
forgotten; the claim covers what the key alone would answer with a 409, two runs at once.

**The cron logs one line of counts** — `due · suppressed · sent · failed · deferred · held · retrying ·
inflight` — and nothing else: no address, token, code or key (test M7).

**The manual check on dev**: save to `delivered+<label>@resend.dev` (an offer's E1 goes at 09:00
America/New_York on the next day; an expansion request's E-X on the next cron), then open the email in
Resend's dashboard and follow its `/confirm` link. Every dummy `@example.com` save must stay `scheduled`.
✅ **Run 2026-09-29**: an E-X saved at 02:57Z was delivered to its `@resend.dev` test address, and its
`/confirm` link rendered the landing page for that save (its ZIP, both buttons).

**Mutants on copies**: M5 imports a copy of `allowlist.js` with the check removed and shows M4 failing;
M9b copies `src/worker/` and `data/` to a temporary directory, removes the claim's lease condition from
`send-due.js` there, and shows M9 failing; M12 imports a copy of `confirm-token.js` that draws a random
token per attempt and shows M10 failing. Each runs its case on the real module first, as a control.

## Branding — the store's look, and where it departs

The page echoes the store: a slim navy top bar over a white header with the logo, Poppins headings,
Open Sans body, white plan cards with a hairline border and each plan's colour as its top bar (Lean
`#48aeee`, Signature `#8cc63f`, Performance `#f7941d`, Family `#f5bb00`), and teal chips with navy digits.
**Every colour is a token in `:root`**, and `npm run contrast` measures every pair in
`src/contrast-pairs.json` with APCA (`apca-w3`): body text |Lc| ≥ 75, large or bold text (≥ 24px, or
≥ 18.66px at 700) ≥ 60, UI components and large headings ≥ 45, non-text accents ≥ 30.

Departures from the store, each for legibility:

- **The button orange is darker.** The store's white-on-`#ff931e` measures Lc −48.1 — under 60 even at
  19px bold (and the store's 14px label would need 75). Navy on `#ff931e` is 55.5, also under. The page
  uses **`#d66400`** (hover `#c25a00`) with the store's white uppercase bold label, at 19px: Lc −69.3.
  `#ff931e` survives as a non-text accent (the rule above the heading, the save section's top bar).
- **Muted text is `#5b5b5b` only** — the store's other grey, `#6c757d`, is Lc 72.6 on white (under 75).
  `#6c757d` is kept for input borders, where 45 is the bar.
- **Teal carries navy digits at 19px bold only** (Lc 65.7); the store's 11px navy-on-teal would need 75.
- **Plan colours are never behind text** — accents only (bar, check disc; the check itself is navy).

**The emails** (E1 and E-X, [SPEC-rung5 § 9](SPEC-rung5-sending.md)) wear the same look with only what email
clients honour: one centred table at most 600 px, inline styles (no `<style>`, no web font: the page's own
font stacks fall back to system fonts), the logo from `SITE_URL/assets/fitaf-logo.png` under a navy bar, the
draft's bold in navy, one button per email (E1's *See my offer*, E-X's *Yes, tell me*: a bulletproof table-cell
button on `--cta`), and the last line as a muted footer under a hairline. **E1's marketing consent is a quiet
link**, underlined navy in its sentence, as easy to withhold as to give (the Advisor, 2026-09-29; M21); E-X's
confirmation stays a button because it is that email's only purpose. ⛔ **Their words are the draft's, unchanged**: the text part is
byte-identical to the one before (M14), and the HTML shows exactly its wording (M18). Colours and fonts come
from `src/worker/email-tokens.json`, the template's `:root` copied by `npm run email:tokens`, because the
Worker cannot read the template at run time; M17 fails when the copy drifts. Their pairs are in
`src/contrast-pairs.json` as `"build": "email"`: body 16px Lc 102.4, the bold 100.9, the consent link 100.9,
the footer 13px 83.5, the button label −69.3 (the page's own button), the button's shape 63.8, the navy bar 100.9.
`npm run preview:emails` renders both for a screen share into `dist-dev/email-preview/` (git-ignored; run it
after `build:dev`, which empties `dist-dev/`).

- **Money is integer cents.** Per-meal prices are stored; weekly totals are always computed
  (`meals_per_week × price_per_meal_cents`) in `build.mjs`. The inline script only displays strings the
  build computed, so the arithmetic exists once.
- **The page shows 7 and 14 only** (`shown_counts` in `plans.json`); the 4/10/21 cells are held for the
  price ladder of a later rung. Adding a count to `shown_counts` is a data change, not a code change.
- **The choice lives in the URL fragment**: `#lean`, `#lean-7`, `#signature-14`, `#meals-14` (count
  without a goal), `#family`, `#individual`. Each choice pushes a history entry, so back and forward work.
- **There are exactly seven order links in the HTML**: the six grid cells and the Family button. The
  result card's "Choose your meals" has no `href` until the script sets it from the chosen cell, so a
  test counting links counts the table, not a duplicate of it. The Chef's Choice card's two links (when a
  week is open) are the same: no `href` in the HTML; the week's links are in `#picks-data` (CC-6e).
- **Without JavaScript** the two questions are hidden and the grid and Family card are shown, so every
  link still works.

## ⛔ Running wrangler — only through this package's scripts

**Always** `npm --prefix boston-2026-10 run <script>` (`db:migrate:dev`, `cf:whoami`, `cf:versions`, …) —
`npm run` sets the working directory to this package, so wrangler reads `wrangler.jsonc` here. ⛔ **Never**
`npm exec wrangler …` or `npx wrangler …` from any other directory: on 2026-09-27 a `pages project create`
run that way from a private repository let wrangler's automatic setup pick that repository's own build
folder and **upload it publicly**; it stayed reachable at a version preview URL until the Worker was
deleted. If an operation has no script yet, add one here first — **except a deploy or a secret**, which
belong to the infrastructure code (see *Deploys are not run from here*).
