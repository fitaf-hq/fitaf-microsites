# boston-2026-10 — rung 2's two faces: a progress screen while the cart fills, and a checkout with only the order and the payment. CONTRACT

**Written 2026-09-29, before any code**, on the Advisor's design of that day. **Status: RULED 2026-09-29** (§ 7: his
four answers the same evening). It extends the hand-off
(`SPEC-rung2-cart-handoff.md`, fill B, §§ 8–12), which it does not change: every press, wait and stop there stands.

**The Advisor's words**:
- *"a full-page modal containing a progress bar and some nice marketing copy to clean up the mechanical details of us
  adding things to the cart. Modern operating system installers tend to do a good job of this – if the operator is
  stuck waiting, might as well remind them of all the good things they're waiting for."*
- *"on the checkout page, I want to carefully remove extraneous elements. For instance: these are all net new
  customers, so they inherently can't sign back in to the platform. The checkout doesn't need a header or footer, etc.
  All it needs to do is recap what people are buying and let them enter their payment details. So just a little bit of
  CSS will do wonders in removing distractions while not impacting the core payment flow."*

⛔ **Never**, as in the hand-off: a request, a loaded image or font, storage, a keystroke into `/checkout`, a submitted
order. And now also: **a hidden payment or order control**, and **a change to what an ordinary visitor sees** (a visit
without `#fitaf=` still costs one read of `location.hash` and nothing more).

## 1. Where they live

- **In the Footer block, inside fill B**, and only after the link's payload and the plan's count have passed their
  checks (rung 2 §§ 7, 11). A link refused before that shows nothing new.
- **The words come from `data/messages.json`** (a new key, `handoff`), inlined by the build as the plan counts are, so
  one place changes them, as the page and the mock-ups already share it. **The colours are the page's own tokens**
  (`--navy`, `--cta`, `--ice`, `--white` in `src/template.html`), inlined. The type is the system's font stack.
- **Nothing is fetched**: no image, no font, no request. The build's size rule (rung 2 § 11 item 5) is unchanged.

## 2. The progress screen

1. **When**: at once after the checks in § 1 pass, before fill B's first poll. It covers the whole order page (fixed,
   the full viewport, above every layer of the store's, its dialogs included).
2. **What** (§ 7, choice 1): the title *"Assembling your order"*; a progress bar; and **a carousel of the meals being
   added**, one slide per meal as fill B presses it, **the meal as its own card shows it**: its name, and its photograph
   when the page has already loaded that photograph (the card's `img` is `complete` with a `naturalWidth`; the slide
   reuses its `currentSrc`, so nothing new is requested). Otherwise the slide is the name alone. **Progress is fill
   B's own**: presses made of (the plan's count + 1), the last step being the store's CHECKOUT, with a count line
   (*"3 of 7 meals"*) and, at CHECKOUT, *"Taking you to checkout"*. The carousel moves to each new meal as it is
   added; once all are added it cycles through them every 2.5 s until `done`. With `prefers-reduced-motion`, nothing
   slides and nothing cycles: the newest meal is shown.
3. **It holds no control**: no button, link, input, or element with a role of one; nothing focusable. So a person cannot
   act on it, and fill B's own scan of the displayed controls outside the meal cards (§ 10) finds exactly what it found
   without it. The step line is `role="status"`, `aria-live="polite"`.
4. **It goes**: at `done`, **after** § 3's mark and style are set, so the first thing the visitor sees is the stripped
   checkout; at **every** stop, before the stop's console line; and in any case **90 s** after it appeared (a timer set
   only on a `#fitaf=` link; fill B's longest run is 81.4 s). After a stop the visitor has the store's order page exactly
   as fill B left it, as today.
5. **It changes nothing of the store's**: no style on the store's elements, no class on its `body`; it is one element
   of its own, removed whole.

## 3. The checkout, stripped

1. **Only for a deep-carted visit**: at `done`, fill B puts the class `fitaf-deep` on `<html>` and adds one
   `<style id="fitaf-deep">`. **Never storage**: a reload of `/checkout` shows the store's full checkout.
2. **Only on the checkout**: every rule is written `html.fitaf-deep:has(app-checkout) …`, so it applies only while the
   store's checkout component is on the page. If the visitor leaves `/checkout` inside the store, its header and footer
   are back. A browser without `:has()` ignores the rules and shows the full checkout.
3. **Hiding only** (`display: none !important`): never moving, restyling or re-ordering. **The hide list** (the store's
   own names, read from its public code, release `main-2HXLHIG7.js`):

   | | hidden | what it is |
   |---|---|---|
   | H1 | `.sticky-header` | the top bar, the subscription banners, and the site header with its navigation |
   | H2 | `.footer`, `.app-hmp-credit` | the store's footer and the platform's credit line |
   | H3 | `a.checkout__guest-signin-banner` | *"Already have an account? Sign in for faster checkout"* |
   | H4 | `a.contact__sign-in` | the contact section's *"Sign in"* |
   | H5 | `app-storefront-popup-host` | the store's own pop-ups (§ 7, choice 2) |
   | H6 | `.summary__plan-subscription-controls:not(:has(.summary__subscription-toggle--active))` | the offer to subscribe (*"Switch to subscription"*, *"Subscribe & save"*, and the sign-in prompt behind it), **only while it is off** (§ 7, choice 3) |

   **Inside the checkout component (`app-checkout`), only H3, H4 and H6 are hidden.** The order recap
   (`.checkout__summary`), the form (`.checkout__form`), the pay button, and every contact, delivery, schedule, tip,
   discount and payment field all stay. ⭐ **A subscription that is on is never hidden**: if a plan's switch is active
   (or a plan requires one), its controls stay, and so do the lines that only an active subscription shows
   (`.summary__plan-group-renew`, *"Subscription — renews every …"*; `.summary__cart-frequency`, *"Subscription
   delivery — every …"*; `.summary__subscription-note`). The style may hide an offer; it never hides a commitment.
4. ⭐ **The payment is untouched, and it is measured**: the displayed controls inside `app-checkout` (`input`, `select`,
   `textarea`, `button`, `iframe` (the card field is the payment provider's frame), `a[href]`, `[role=switch]`,
   `[role=radio]`) are **the same set with the style as without it, except exactly H3, H4 and H6**.

## 4. What an ordinary visitor gets

Nothing new: no element, no style, no class, no timer. The rung 2 case for a visit without the fragment (R2-04) is
extended to say so, and the watch's F4 already fails on any line of ours in an ordinary visit.

## 5. Cases — `node --test`, no network (the rung 2 fixture page, plus a synthetic checkout with the names in § 3)

| | case | expect |
|---|---|---|
| R2-40 | an ordinary visit | no element, style, class or timer of ours (R2-04's list, extended) |
| R2-41 | a valid 7-meal link | the screen before the first press; progress 1 of 8 … 7 of 8, then 8 of 8 at CHECKOUT; the step line names each meal as its card shows it |
| R2-42 | `done` | `html.fitaf-deep`; one `style#fitaf-deep`; the screen gone; the style set **before** the screen went |
| R2-43 | each stop after the checks (not on this page; the plan holds meals; two meals share a key; `/checkout` not reached) | the screen gone; no mark; no style; the stop's own line |
| R2-44 | the screen's contents | no control and nothing focusable; § 10's scan finds the same controls with the screen as without |
| R2-45 | the payment check (§ 3 item 4) on the synthetic checkout | equal, except H3, H4 and H6 |
| R2-46 | ⭐ mutant: a hide rule that also matches a field of `.checkout__form` | R2-45 fails |
| R2-51 | the synthetic checkout with a plan's switch **active** | H6 hides nothing: the switch and the renewal and frequency lines are displayed; ⭐ mutant: H6 without its `:not(:has(…))`, R2-51 fails |
| R2-52 | the carousel: a card whose photo is loaded, and one whose photo is not | a slide with the photo (the card's `currentSrc`) and a slide with the name alone; no `img` is created from an unloaded photo |
| R2-47 | the checkout component gone from the page (the visitor navigated away in the app) | nothing hidden |
| R2-48 | `prefers-reduced-motion` | no animation; the carousel shows the newest meal and never cycles |
| R2-49 | fill B never reaches a verdict (a planted hang) | the screen gone at 90 s |
| R2-50 | the words and colours | from `data/messages.json` and the page's tokens: change a phrase and the built block changes; no phrase in the source |

**Live, in the watch's smoke** (`SPEC-storefront-watch.md` § 4: on each flag, and before any build is pasted), added to
F5's pass:

| | check | pass |
|---|---|---|
| W10 | the screen during the run | seen after the first press and gone at `done` |
| W11 | ⭐ § 3 item 4 on the live `/checkout`: the displayed controls inside `app-checkout` with `style#fitaf-deep` enabled, then disabled | equal, except H3, H4 and H6; the pay button displayed in both |
| W12 | each of H1–H6 on the live checkout | found (a missing one fails open, showing; it is reported) |
| W13 | the order is one-time | no active subscription switch and no *"renews every"* line on the deep-carted `/checkout` (a store change that defaulted a plan to a subscription fails the smoke) |

`storefront/dependencies.json` gains the hide list's names, so F2 flags a release that renames one. **Before the paste**,
the Advisor runs the built console file in his own browser at both widths, as in the one-browser run, and looks.

## 6. The size

Both add to the Footer block: an estimated 2 KB (the screen's markup, style and words, and the checkout's style), so
**about 7 KB**: over the 5 KB target and under the 10 KB ceiling (the Advisor, 2026-09-29: *"We can go up to 10k for
the footer. 5k is a good target, but it's OK if we're above it slightly."*). § 7, choice 4.

## 7. Ruled by the Advisor, 2026-09-29 (the evening; in his words)

| | the question put | his answer |
|---|---|---|
| 1 | the words: a title and four to six short lines from the page's own phrases | *"I think "assembling your order" or similar and then a legitimate carousel of the items we're adding."* ⇒ § 2 item 2: the title, and a carousel of the meals as their cards show them, in place of changing lines |
| 2 | hide the store's pop-ups on this checkout | *"Yes"* (H5) |
| 3 | keep the subscription switch, as the Owner's offer | *"Subscriptions should not be shown. … If we can hide it in ours, that would be an improvement. … a customer who goes down that path ends up in a worse than dead end."* ⇒ H6, only while the switch is off; W13 |
| 4 | the Footer at about 7 KB | *"Accept"* |

⚠ **The build's reading, not his words**: *"a legitimate carousel"* is read as **the real meals being added, each as
its own card shows it** (§ 2 item 2), with the card's photograph when the page already holds it; the Advisor sees it in
his own browser before any paste.

## 8. Found at the build, 2026-09-29 — the build's readings and choices, not rulings

Red first at `5acc962`, built at `7b0d74f`, R2-29's fixture at `b278a4b`, the screen moved to the top layer at
`ed422ad`. §§ 1–7 above are unchanged; this section says what the build did where they left a choice, and where the
store's page made a sentence of them impossible to meet as written.

- ⭐ **H6 also requires a switch** (`:has(.summary__subscription-toggle)`), found at the build, not ruled. The store's
  own template (release `main-2HXLHIG7.js`) renders **no switch at all** for a plan that requires a subscription: the
  controls hold only the label *"Subscription required"*. H6 as § 3 writes it (hide the controls whenever no ACTIVE
  switch is inside) would hide that label, and § 3 item 3 says a commitment is never hidden. As built, H6 hides the
  offer only while a switch is there and off: *"the offer to subscribe … only while it is off"*, and nothing of a plan
  that requires one. **R2-51b** pins it; its mutant is H6 as written, and it fails. The renewal and frequency lines were
  never in H6 either way; W13 still fails the smoke on any *"renews every"*.
- **H1, H2 and H5 never hide anything inside `app-checkout`** (`:not(app-checkout *)`): § 3 item 3's *"inside the
  checkout component, only H3, H4 and H6 are hidden"*, made structural, so a release that put a `.footer` inside the
  checkout could not hide a payment control between releases and the next smoke. The style is one rule:
  `html.fitaf-deep:has(app-checkout) :is(:is(H1, H2, H5):not(app-checkout *), H3, H4, H6){display:none!important}`.
- ⚠ **The screen's two clocks are CSS animations, not timers.** A 90 s `setTimeout` (or a 2.5 s one) would sit among
  fill B's polls, and R2-09, R2-10, R2-15, R2-16, R2-17 and R2-24 pin that fill B sets only 200 ms timers (*"only 200 ms
  polls"*), which this contract does not change. So the screen carries its own 90 s animation (`fitaf-e`, moving
  nothing) whose end removes it, and the carousel a 2.5 s repeating one (`fitaf-t`) whose every turn shows the next
  slide. They run on the browser's clock, so the screen goes at 90 s even when fill B's timers never fire again
  (R2-49 plants exactly that); the 90 s one is `!important` on the screen's own id, so a page-wide reduced-motion
  reset of every animation cannot end it at once (none in this release). With `prefers-reduced-motion`, everything
  inside the screen has `animation: none; transition: none`: nothing slides, nothing cycles, the clock runs on.
- **The count line and the step line are one line**, the one `role="status"`: `handoff.step`, *"{meal} · {n} of
  {total} meals"* (*"Chicken Pesto Pasta · 3 of 7 meals"*), then *"Taking you to checkout"* after CHECKOUT. Its words
  are `data/messages.json`'s, inlined as ASCII (`·` as `\u00b7`); the build refuses a `step` without `{meal}`, `{n}`
  and `{total}`, and a token that is not a hex colour. The colours are the page's `--navy` (the screen), `--white`
  (the text), `--ice` (the bar's track) and `--cta` (its fill), as custom properties on the screen's own rule; the
  type is `system-ui, sans-serif`.
- **"The newest meal"** (§ 2 item 2, reduced motion) is read as the meal of the latest press: a meal pressed again
  (its second of four, say) shows its slide again. For a link of distinct meals, as the smoke's, it is the last added.
- **The photo** is the card's first `img` (the store's header image, which it loads lazily: no `src` until the card
  scrolls into view). Complete with a width: the slide gets a new `img` whose `src` is its `currentSrc`, which Chrome
  draws from the page's own copy with no request, even for an image sent `no-store` (R2-52 counts the requests). At
  666 px and narrower the store hides `app-product-card` (fill B presses it all the same), so its photo is likely
  never loaded there, and the slide is the name alone.
- ⭐ **"Above every layer of the store's, its dialogs included" cannot be met by a `z-index`, and is met only in part.**
  The store's dialogs and pop-ups are Angular CDK overlays, and this release's CDK (`chunk-V5PSWOJ3.js`) shows them as
  **manual popovers, in the browser's top layer**, above any `z-index`, wherever the Popover API exists; no provider
  in the release turns that off. So the screen is a manual popover too (`popover="manual"`, `showPopover()` when it is
  appended; the popover's own box undone), with the largest `z-index` where there is no Popover API. It is above the
  page and **every overlay already open** (a pop-up shown at load: R2-41c, whose mutant, the screen by `z-index` alone,
  fails). ⚠ **An overlay the store opens after it is above it**: the top layer is ordered by opening, and moving the
  screen back on top would hide and re-show it, restarting its clocks. The one fill B meets is the extras dialog after
  CHECKOUT, which it presses within a poll (200 ms), though the dialog's CONTINUE is disabled while it syncs; a
  subscription plan's *"Sign in to continue"* would stay above the screen until fill B's stop, 30 s later. The
  Advisor sees which in his own browser; ⬜ whether that is acceptable is his to rule.
- **The pay button** (W11) was a displayed `button` inside the store's `.checkout__submit` (its label varies with the
  payment method: *Place order*, *PAY NOW*); ⚠ superseded by § 9 (a phone's is the mobile bar's `.summary__pay-button`); `checkout__submit` joins `dependencies.json` with `app-checkout` and the
  hide list's names (11 in all, each found in the release's files: 23 of 23 over a local copy whose 156 files match
  `watch-baseline.json`'s hashes; no request to the store). H2's footer is the literal `[1,"footer"]` (an element whose
  class is exactly `footer`), because `"footer"` alone is in 23 of the release's files and would never be missed.
- **W12 also asks that each found name be hidden while our style is on**, and waited up to 10 s for all six (the store
  renders its pop-up host deferred); since § 9, only for the required ones. **W10–W13 are judged only once fill B reached done**; a stopped run, already failed
  by the smoke's own rule, is judged by W10 alone (the screen must be gone).
- **Where the cases run.** R2-40–R2-44, R2-50 and R2-52 (the photo's state given) run in the site's suite on the
  shipped text; R2-41c (the top layer), R2-45–R2-49, R2-51 (with R2-51b) and R2-52 with real images need Chrome and
  run in the watch package's suite (`tools/storefront-watch/test/r2-*.test.mjs`), because the site's install never
  gets a browser driver (`tools/README.md`). They read the page with their own functions, not the watch's
  `lib/faces.mjs`. **R2-04** gains six names on its stub (`document`, `requestAnimationFrame`, `matchMedia`,
  `getComputedStyle`, `MutationObserver`, `clearTimeout`), and **R2-40** runs the ordinary visit on a real document,
  byte for byte.
- ⚠ **R2-29's fixture changed, not its rule** (a separate commit, `b278a4b`, to revert alone if R2-29 is one of the
  cases the build was told to leave unchanged). It padded fill B's own file up to 5,200 and 5,120 bytes, and a pad only
  adds: at 8,749 bytes the file cannot be padded down. The target's sizes are now built from a small source with the
  build's four slots; the ceiling's, from the real source padded, as before. Every other fill-B case passes unchanged.
- **The size** (§ 6): the Footer block **8,768** bytes and the console file **8,749** at `ed422ad`, both warned, under
  the 10,240 ceiling; the text was 5,161. The two faces cost 3,588 bytes, not the estimated 2 KB: the screen's code
  1,522 (making the screen and its slides, the top layer, the photo, the bar, the step line, the carousel's turn, the
  guard around it), the screen's style 1,304, the checkout's style 339 and the code that sets it 194, the words 124,
  and the hooks into fill B about 105. R2-32's pin moved from `054e6be8…` to `28ce3983…` at `7b0d74f`, then to
  `aa773aec65270cc4210e2ec64fe52a94865eb5676c764f826598d7eaf42caf08` at `ed422ad`.
- ⬜ **Not run on the live store**: any of it. The screen, the stripped checkout and W10–W13 are proven on the
  synthetic order page and the watch's synthetic store only. The live smoke, and the Advisor's own look at both widths,
  come before any paste (§ 5).

## 9. Amendment, 2026-09-29 — the first live smoke: the synthetic checkout modelled the checkout expected, not the one served

**The run** (the orchestrator, `c894f9c` pasted, release `main-2HXLHIG7.js`, 2026-09-30T01:33Z): at 1280 and 390 px
fill B reached `done: /checkout` with the 7 chosen meals and $87.50; the screen was seen (8 steps) and gone; the style
hid exactly 2 of the controls in `app-checkout` (58 at 1280, 62 at 390), the two sign-in links; the order one-time
(W13). **It failed on three checks, and each is the smoke's model of the store, not the page**:

1. **W11 at 390 px, "the pay button is not displayed with the style or without it"**: on a phone the store's pay
   control is **`PAY NOW`, in the order summary's mobile bar** (`.summary__pay-button`), displayed and enabled; W11
   looked only in `.checkout__submit`. ⇒ **The pay button is the displayed one of `.checkout__submit button` and
   `.summary__pay-button`**, and W11 requires at least one displayed, with the style and without it.
2. **W12, H2's `.app-hmp-credit` not found**: the store's layout renders it only in some cases (its footer's backlink
   fallback). ⇒ It is **conditional**.
3. **W12, H6 not found**: the checkout of this plan renders **no subscription switch at all**, at either width. ⇒ H6
   is **conditional**: it hides what appears, and its absence is not a fault.

⇒ **W12 is split**: **H1, H2's `.footer`, H3 and H4 must be found** (the store renders them on every guest checkout,
seen at both widths); **H2's `.app-hmp-credit`, H5 and H6 are conditional**: reported as found or absent, never a
failure (a rename of any of them is still F2's to catch, in the bundle).

**Fixed synthetic store first, red, then the checks** (the lesson of the watch's own first live run): the synthetic
checkout gains the mobile summary bar with its pay button (the desktop submit hidden below the store's breakpoint), a
variant **without** the credit line, and a variant **without** any subscription controls; W11 and W12 are red on the
new synthetic checkout before they change.

| | case | expect |
|---|---|---|
| W11b | the synthetic checkout at 390 px: only the mobile bar's pay button displayed | W11 passes |
| W11c | ⭐ mutant: the style also hides `.summary__pay-button` | W11 fails at 390 px |
| W12b | the synthetic checkout without `.app-hmp-credit`, and without subscription controls | W12 passes, reporting both absent |
| W12c | the synthetic checkout without `a.contact__sign-in` | W12 fails (a required target missing) |

**Built** (found at the build, not ruled; § 9 above governs). Red at `8e6471c`, built at `ec815f1`; the shipped text is
untouched (text sha256 `aa773aec…`, 8,768 and 8,749 bytes; R2-32's pin unmoved).

- **The synthetic checkout** now has the store's breakpoint, read from its public code: `@media (max-width: 1024px)`
  hides `.checkout__submit` and shows the summary's `.summary__mobile-bar`, whose pay button is an `app-button` with
  the class `summary__pay-button` around a real `<button>`. So W11's pay button is a displayed **button in**
  `.checkout__submit` or `.summary__pay-button`, and `"summary__pay-button"` joins `dependencies.json` (24 literals).
  R2-45's own reader takes the same two, and R2-45 now names the one shown at each width.
- **A conditional target found but still displayed with our style still fails W12**: § 9 makes absence never a
  failure; a style that finds the element and fails to hide it is a broken style, not an absent element.
- **The wait on `/checkout`** ends once the required targets are found; the conditional ones are reported as they are
  at that reading (the store renders its pop-up host deferred, so H5 may read absent on a fast page).
- **The case names**: the smoke's own cases of the first build, which used W11b and W12b for other checks, are renamed
  "in the smoke", so that W11b, W11c, W12b and W12c are § 9's. The earlier case "a release without the pop-up host
  fails on W12" now passes, reporting H5 absent. W12c passed on the red commit too: H4 is required under both rules.

## 10. Amendment, 2026-09-29 (evening) — the Advisor's first look: the pop-up under the screen, and five more on the checkout

**His look** (his own browser, the console file of `1179afd`): *"The progress bar looks great."* Then: *"Is there any way
to get rid of the upsell interstitial? It pops up over our progress bar and adds a pointless wait time."* And for the
checkout: *"Get rid of gift cards and discount codes … the app banner … all of this [the subtotal, shipping, tax and
total] since shipping and tax should be included (I'll double-check with the Owner) … Tip Our Team … the second gift
cards and discount codes"*, with *"I'll have more edits after this"*. The store's names below are read from its public
code (release `main-2HXLHIG7.js`).

1. **The extras pop-up, while the screen is up**: made **invisible, never removed**: `visibility: hidden` on the
   overlay pane that holds `app-extra-products-dialog` and on that overlay's backdrop, only while the progress screen
   is shown (a class fill B sets on `<html>` when the screen appears and removes with it). Fill B's own test for a
   displayed control (`getClientRects().length`) still finds CONTINUE TO CHECKOUT, so it presses it as before. ⚠ **The
   wait is the store's** (it fetches the extras before it opens the pop-up); this hides the interruption and does not
   shorten the wait. On any stop, the class goes with the screen, so a store dialog that stopped fill B is seen.
2. **H7, the discounts** (three placements: `.checkout-discounts`, in the payment section, as its own section, and in
   the summary): hidden **only when the link carries no offer code**. A link with a code (`~code`) keeps them, so the
   visitor can enter the offer (fill B still never types into `/checkout`). Fill B marks a coded link with a second
   class on `<html>`.
3. **H8, the app banner** (`.smartbanner`, a third-party app-install banner the store shows on phones): hidden, and the
   top margin the banner's library reserves on `<html>` is undone with it (the one exception to *hiding only*, because
   the space is the banner's).
4. **H9, the price breakdown**: the `.summary__row`s of the summary (Subtotal, Shipping, Tax) hidden, **except a
   discount row** (`.summary__row--discount`). ⭐ **The Total (`.summary__total`) is never hidden**: on a phone the pay
   button reads *PAY NOW* with no amount, so the Total is the only place the visitor sees what they will pay. ⬜ The
   Advisor is confirming with the Owner that shipping and tax are included; until then this item is built but its paste
   is his call.
5. **H10, the tip** (`section.checkout__section.tip`, and a bare `app-tip-selector` where the store places one): hidden
   **only while no tip is chosen** (the store shows `.tip-selector__remove-btn` once one is): the style may hide an
   offer, never a charge.

**The payment check (§ 3 item 4, W11) is re-stated**: the controls hidden are exactly H3, H4, H6 and now H7, H8 and
H10's (the discount and gift-card fields and their Apply buttons, the banner's links, the tip buttons); **every other
control is unchanged, and the pay button and the Total are displayed**. H8 and H10 are conditional (the banner shows on
phones only; the tip section only where the store enables tips).

| | case | expect |
|---|---|---|
| R2-53 | the extras pop-up opens while the screen is up | invisible; fill B presses CONTINUE TO CHECKOUT as before; after a stop it is visible |
| R2-54 | a coded link / a link without a code | the discounts displayed / hidden |
| R2-55 | the summary with a discount row | Subtotal, Shipping and Tax hidden; the discount row and the Total displayed; ⭐ mutant: a rule that also hides `.summary__total`, fails |
| R2-56 | a tip chosen (the remove button shown) | the tip section displayed; ⭐ mutant: H10 without its guard, fails |
| R2-57 | the banner and its reserved margin | hidden, and the page's top margin back to the store's own |
| W14 | live, both widths | H7–H10 reported (found or absent); the Total displayed; the payment check as re-stated |

**The size**: the block is 8,768 bytes and the ceiling 10,240. If these push it past about 9.8 KB, the build reports
what costs the bytes before it trims anything.

**Built** (found at the build, not ruled; § 10 above governs). Red at `a2bdea8`, built at `9e67484`.

- **Item 1's mark is the screen itself.** The rule that makes the extras overlay invisible (the pane holding
  `app-extra-products-dialog`, and the backdrop just before it: `:has(+ * app-extra-products-dialog)`, which covers the
  store's overlays shown as popovers and the older layout alike) is in the screen's own `<style>`, not behind a class
  on `<html>`: it goes with the screen at done, at every stop, and at the 90 s clock, with no second thing to remove.
  The store's wait is unchanged (R2-53 opens the synthetic dialog late and holds its CONTINUE disabled for 2 s).
- **H7's mark**: `fitaf-code`, set at done beside `fitaf-deep` for a link that carries `~<code>`, never on a stop.
  The rule is `.checkout-discounts:not(.fitaf-code *)` inside the one scoped rule, so every selector still begins
  `html.fitaf-deep:has(app-checkout) ` (R2-42b).
- **H8's margin** is the style's one rule that does not hide:
  `html.fitaf-deep:has(app-checkout)[data-smartbanner-original-margin-top]{margin-top:0!important}`. The banner's
  library (read from the release's code) sets `<html>`'s `margin-top` inline to the banner's height and keeps the
  original in that attribute; the rule applies only where it did, and sets 0, which is what this store's original is
  (the library records 0; CSS cannot read the attribute's value). R2-42b allows exactly this rule.
- **H9 never hides a row holding the Total**: `.summary__row:not(.summary__row--discount, :has(.summary__total))`, so
  the Total stays even if a release nests it in a row. H10 is `:is(section.checkout__section.tip, app-tip-selector)`
  without `.tip-selector__remove-btn` inside (its section and a bare selector alike).
- **The payment check** (R2-45, W11), as § 10 re-states it: on the synthetic checkout the style hides 19 controls,
  exactly H3's, H4's, H6's (4), H7's (12: three placements of a gift-card field, a code field and two Apply buttons)
  and H10's (3); H8's links are outside `app-checkout`. **W14** reports H7–H10 found or absent (each conditional; a
  found one still displayed with our style fails), and requires `.summary__total` found and displayed; the smoke's
  links carry no code and choose no tip, so on the live checkout it expects H7 and H10, where present, hidden.
- **The size**: the Footer block **9,299** bytes and the console file **9,280** at `9e67484` (531 more than `ed422ad`),
  under the ~9.8 KB this section set as the point to report the costs, and the 10,240 ceiling. R2-32's pin moved from
  `aa773aec…` to `c87cb754d9b7a07260795cf0619950401ad1a2b3f6347e641f36586c9e5334fc`.
- `dependencies.json` gains 11 literals (35 in all), each found in the release's files over the same local copy.

## 11. Amendment, 2026-09-29 (night) — the store's admin reads the block as HTML: no markup in the shipped text

**Found at the paste** (the Advisor, pasting `1179afd` into Custom Scripts → Footer; nothing saved): the admin's
validator, which its own screen calls a check before saving, reported *"<div> isn't allowed here — only <script>,
<noscript>, <style>, <link>, <meta> and comments"* and *"Attribute values can't contain < or >"*, and *"Some snippets
look like they'll be rejected — saving will tell you for certain."* It reads the text **inside** our `<script>` as HTML.
The only tag-like text in the block is the screen's markup string (`"<style>" + CSS + "</style><div><h2></h2><div
class=b>…"`); the short-link block `8945de1` has none. The validator's rules are not documented, so the contract states
what our text must be, not what the validator accepts:

1. **The shipped text holds no `<` followed by a letter, `/` or `!`**, except the block's own opening `<script>` and
   closing `</script>`. The screen and its style are built with `document.createElement` (the style's rules set as the
   element's `textContent`); no markup string, no `innerHTML`.
2. **Nothing else changes**: what the screen shows, the checkout's style, every case of §§ 5, 9 and 10.

| | case | expect |
|---|---|---|
| R2-58 | the built Footer block and console file, scanned | exactly one `<script` and one `</script>` in the Footer block, none in the console file; no other `<[A-Za-z/!]` in either; ⭐ mutant: the markup string restored, fails |

**Built** (found at the build, not ruled; § 11 above governs). Red at `e45dbe8`, built at `4697f19`. The screen is made
by one helper around `createElement` (the same elements as before, its style's rules as `textContent`); no `innerHTML`
and no markup string remain. The built Footer block holds exactly two tag-like sequences, its own `<script>` and
`</script>`, and the console file none. The Footer block is **9,523** bytes and the console file **9,504** (224 more
than `9e67484`). R2-32's pin moved from `c87cb754…` to
`5eb8416e34809b9c1ccca6fc3bb422c3e3179114145eb4bc3669ba5db8644037`. ~~R2-58 is a gate in the suite, not in the
build~~: superseded by the amendment below, which makes the build refuse.

**§ 11, amended the same night** (the Advisor, pasting `f27d2e4`; nothing saved): the validator reported *"<s> isn't
allowed here"*. It reads `<` followed by **whitespace** and a letter as a tag: the key function's `i < s.length` (and,
next, `n < it.qty`). The short-link block `8945de1` carries the same loop, so it would have been refused too. ⇒ Item 1
becomes: **the shipped text holds no `<` at all**, except the Footer block's own opening `<script>` and closing
`</script>`; comparisons are written the other way round (`s.length > i`). **The build refuses** a text that breaks it,
writing nothing (as it refuses a size above the ceiling), and R2-58 scans for any `<`. The key function's vectors
(R2-25) pin that the keys are unchanged.

**Built, as amended** (found at the build, not ruled). Red at `cce20bc`, built at `d1f0e36`. The key function's loop
test is `s.length > i` (`src/storefront/meal-key.js`; R2-25's vectors and 5,000 names agree unchanged) and fill B's
extra-press loop `it.qty > n`; those were the text's only two `<`. `npm run build:storefront` exports `storefrontFiles`
(the two files as it composes them) and **refuses, writing nothing, a file with any `<` but the Footer block's own
`<script>` and `</script>`**, quoting the text around it; the old `</script` check is part of it. R2-58 counts every
`<` (the Footer block's two, the console file's none); its mutants (a `<` comparison restored, the markup string
restored) are scanned as the build composes them, and R2-58b has the build refuse both. The Footer block is **9,523**
bytes and the console file **9,504**, holding **2** and **0** `<`. R2-32's pin moved from `5eb8416e…` to
`c67754610077710b8e194ec5605daee5b357baa9fe9bd7eee6fc5685075e3744`.

## 12. Amendment, 2026-09-29 (late) — LIVE since ~22:04 PDT; the progress bar must not restart, and the upsell is skipped

**The state**: `8f5ee58` is the store's Footer block (saved by the Advisor, verified 15 of 15 visits). His test of the
7-meal link: *"It worked! We need to refine the progress bar a little bit (it restarts when I think the pop-up fires),
but this is very, very good!"*

1. **The progress screen never goes back and never re-opens.** The lead (the orchestrator's, **unverified**): the screen
   is shown as an *auto* popover, and the store's own pop-up, shown in the top layer as a popover too, **light-dismisses**
   an auto popover; fill B then shows the screen again and its bar starts over. ⇒ **First reproduce it** on the
   synthetic store (its extras pop-up opened the way the store opens it), red; then the fix (a *manual* popover, which
   another popover cannot dismiss, is the expected one, but the test decides). **The screen is shown once per run; its
   progress only rises; it goes only at `done`, at a stop, or at the 90 s clock.**
2. **The upsell is skipped** (**ruled by the Advisor**, `AskUserQuestion`, 2026-09-29 ~23:05 PDT: *"Yes, that one key"*).
   The store opens its extras pop-up after CHECKOUT only if `sessionStorage['ecc_additions_prompt_handled']` is not
   `"true"`; it sets that key itself when a visitor dismisses the pop-up (read from its public code, release
   `main-6F2NMA4I.js`). ⇒ **Fill B sets exactly that key to `"true"`, in `sessionStorage` only, immediately before it
   presses the store's CHECKOUT, and at no other moment**; nothing else is ever written, and an ordinary visit still
   touches no storage (R2-04). **The pop-up handling stays** as the fallback: if the store ignores the key (a renamed
   flag), the pop-up opens under the screen, invisible, and fill B presses CONTINUE TO CHECKOUT as before.
   ⚠ This is the one exception to *fill B writes nothing* (§§ 6, 10 of the rung 2 contract), and it is the store's own
   key with the store's own meaning.
3. `storefront/dependencies.json` gains `ecc_additions_prompt_handled`, so F2 flags a release that drops it.

| | case | expect |
|---|---|---|
| R2-59 | the synthetic store honouring the key | the key is `"true"` only from the CHECKOUT press on (absent before it); no pop-up opens; `done: /checkout` |
| R2-60 | the synthetic store ignoring the key | the pop-up opens, invisible under the screen; fill B presses CONTINUE; `done: /checkout` (the § 10 path, unchanged) |
| R2-61 | the store's pop-up opened as a top-layer popover while the screen is up | the screen stays shown throughout; its progress never decreases; ⭐ mutant: the screen as an *auto* popover, R2-61 fails (if the reproduction shows another cause, the mutant is that cause) |
| R2-62 | an ordinary visit, and a link refused before CHECKOUT | no storage written (R2-04's list, and the refused link's) |
| W15 | live, both widths | the smoke reports whether the extras pop-up opened (expected: not) and the seconds from CHECKOUT to `/checkout` |

**Built** (found at the build, not ruled; § 12 above governs). Red at `3406b59`, built at `d5a371e`.

- ⚠ **The reproduction did not reproduce.** The screen has been a **manual** popover since `ed422ad` (and so at
  `8f5ee58`, the block live), and the store opens its overlays as manual popovers (its CDK: `popover="manual"`); a
  manual popover is closed by no other. R2-61 reads the screen every frame while the synthetic store's pop-up opens in
  the top layer, as a manual popover and as an auto one: on the live text it passes both, one screen, never closed,
  bar and count only rising. Its mutant (the screen made **auto**) is light-dismissed only by an **auto** pop-up, and
  then it closes and nothing shows it again: no restart either. **So the orchestrator's lead describes the mutant, not
  the live text, and the screen is unchanged.** ⬜ What the Advisor saw restart is not established here. One thing the
  screen does that looks like starting over, by § 2 item 2's design: once all meals are added its carousel cycles every
  2.5 s, and its first turn goes from the last meal back to the first, about 2.5 s after the seventh press, which is
  about when the store's extras pop-up would open. With the key below the pop-up no longer opens, and the carousel still
  cycles until done; whether it should stop on the newest meal is the Advisor's to rule.
- **The key**: `sessionStorage.setItem("ecc_additions_prompt_handled", "true")` after the fragment is removed and before
  the click on CHECKOUT, inside the screen's `try` (a storage that throws changes nothing). R2-59 on the synthetic page
  pins the order (the fragment removed, the key, the press) and that it is the only touch of storage; in Chrome, the key
  absent at every Add to Cart (the store clears it when its order page starts), `"true"` at CHECKOUT, no pop-up. R2-62:
  every link refused before CHECKOUT touches neither storage. The store's reading of the key is from its public code,
  release `main-2HXLHIG7.js` (`isHandled()` before it opens the pop-up; `clear()` in the order page's `ngOnInit`).
- **W15** is a report per width, not a pass rule: the recorder notes the extras dialog and `app-checkout` arriving; the
  seconds are from the last step line (written just after the press of CHECKOUT) to the checkout arriving.
- **The size**: the Footer block **9,614** bytes and the console file **9,595** (91 more than `d1f0e36`), no `<` but the
  block's own two. R2-32's pin moved from `c6775461…` (the block live) to
  `c4ceb682960ea0b048001f2babb9b1d4c75609f32c84fb17dd74a94bf9be12b8`.

## 13. Placed, and the Advisor's direction for the screen's next design (2026-09-30 ~00:10 PDT) — NOT YET CONTRACTED FOR BUILD

**Placed**: `ace775b` (§ 12: the upsell skipped by the store's own key) is the store's Footer block since 2026-09-29
~23:45 PDT, verified on 15 of 15 visits; the live smoke: the extras pop-up never opened, CHECKOUT to `/checkout` in
4.1–4.5 s. The Advisor's test: *"It looks almost perfect."*

**The "restart" explained** (his screen recording, 8 s, read frame by frame and kept off every repository): **the bar
never restarts**; after the seventh meal the carousel holds, then cycles back to the first meal (§ 2's 2.5 s cycle).
And most slides are names alone because the page had loaded only the first cards' photos (§ 2 item 2, as specified).

**His direction** (in his words; design to iterate, not a ruled build):
- *"This is where I think we're more deliberate with our animation. So, let's figure out what timing would look like of a
  4G network (i.e., decent but not great), and figure that we'll need to fill (roughly) 2 to 10 seconds. We want to have
  a smooth animation, and if the page reports back that it's ready before the animation is done, we can cleanly exit
  it."* ⇒ a *"wrapping up"* animation after the last meal, designed to be cut short by fill B's own `done`.
- *"The product images are maybe a placeholder. We might replace with this (totally making this up): 'Ensuring
  freshness', 'Aligning to goals', 'Planning delivery', etc."* (an example of what might be on the screen).
- *"I think we should generate a sprite sheet. That adds tooling to our pipeline, but we could send down thumbnails. This
  gets to a broader discussion about how photography works in the microsite and deep carting."*
- *"For now, let's consider some sort of morphing line animation – possibly in lieu of the progress bar altogether.
  Android boot screens have some nice approaches to this. Let's assume we're going to iterate on several different
  aspects of this."*

**Two constraints any contract for it must settle** (the orchestrator's): a sprite sheet sent down is **a request our
block makes** (the first exception to *nothing is fetched*, § 1) and puts photographs on Fit AF's host; and the
animation's clean exit keys on fill B's `done`, which already exists.

## 15. Amendment, 2026-09-30 — for the Advisor's 21:00 paste: the key ignores the store's tag, fill B waits for the cards, and the Fit AF logo

**Ruled by the Advisor** (2026-09-30): *"Please build and rehearse"* (the first two, proposed after the day's live
check) and *"We also want to make sure that the Fit AF logo appears on the interstitial and checkout pages."* The paste
is his, at a deployment session he set for 21:00 PDT. **Base**: the dev line at `56ef62e`, whose Footer block text is
the live block's (`ace775b`, `c4ceb682…`). ⚠ **Not** the Storybook branch (`boston/rung-2-screen-next`, the screen in
its own module, 236 bytes more): it is rebased on this after the paste.

**What the live check found** (2026-09-30, the test address's *Continue to checkout*): (1) the store dropped a `🟠NEW:`
tag from two meal names mid-week, so their keys stopped matching and fill B refused them; (2) in 2 of 7 runs the store
drew no meal card within fill B's 10 s, so fill B refused every meal of the link with no card on the page. Both failed
safe (nothing pressed, the plain order page).

### 15.1 The key ignores a leading marketing tag

`mealKey` (`src/storefront/meal-key.js`, the one function both the link tool and fill B carry) removes **a leading tag**
before it collapses whitespace and hashes: an emoji (a UTF-16 surrogate pair, or a character in U+2600–U+27BF), then
optional space, an uppercase word of 2 to 12 letters, optional space, a colon, and the space after it. So
*"🟠NEW: Blackened Chicken Caesar Salad"* and *"Blackened Chicken Caesar Salad"* share one key, and a name with no tag
keys **exactly** as today (every link built today still works). *"Smart Oats: Almond Joy"* is not a tag (no emoji).
⛔ **The shipped text stays ASCII**: the pattern is written with `\u` escapes, since the store's admin reads the block
as HTML. (The KMS's own badge rule, `N2`, names `🟠NEW:` alone; this is its generalisation to a future tag.)

### 15.2 Fill B waits for the cards before its 10 s

Today fill B's 10 s (50 polls of 200 ms) starts when it does. **Now it starts at the first poll that finds a titled
`app-product-card`.** Before that, fill B waits for the page's cards **up to 30 s**, then stops with `stopped: no meal
cards on this page`, pressing nothing. Every other rule is unchanged (§ 10's check that the plan is empty runs on every
poll; a meal still missing 10 s after the first card refuses the whole link, naming its key). The screen's 90 s clock is
unchanged. The watch's longest-run sum (`FILL_B_LONGEST_MS`, `SPEC-storefront-watch.md` W9e) moves with it.

### 15.3 The Fit AF logo on the screen and the checkout

The block shows **the store's own logo**: the `src` of the page's `img.header__logo-image` (the image the store's
header already loads, from its own image host), in an `img` the block creates with the DOM (no markup), `alt="Fit AF"`,
not a link and not focusable.
- **On the screen**: centred above the step line, about 48 px high.
  **Ruled by the Advisor, 2026-09-30, after seeing it: top, on a white plate** (*"Top, on a white plate"*; the mock-ups'
  logo plate, since the logo's grey tagline was faint on navy): the first thing on the screen, above the title, on a
  white rounded plate. The plate is the image's own padding and background (the screen's `--white` token): a separate
  plate element measured 10,308–10,309 bytes, over the 10,240 ceiling. The checkout's logo is unchanged.
- **On the deep-carted checkout**: centred above the checkout, about 40 px high, while the store's header stays hidden
  (H1). Only for a deep-carted visit (the page's mark, as every H rule).
- ⛔ **No image URL is written into the shipped text**: the `src` is read from the page, so no new host, no new file, and
  nothing of ours to host. **No header logo on the page: no logo, and nothing else changes.**

### 15.4 Size and text

The Footer block at most **10,240 bytes** (today 9,614; the build reports the new count); **every character ASCII**; no
`<` but the block's own two (§ 11).

### 15.5 Cases (`node --test`, no network; the site's and the watch's suites)

| | case | expect |
|---|---|---|
| R2-66 | the key and a tag | `🟠NEW: X` and `X` share a key; a name without a tag keys as before (R2-25's vectors unchanged); `Smart Oats: Almond Joy` keeps its words; the link tool and the shipped script agree |
| R2-67 | ⭐ fill B, cards late | the fixture page draws its cards 12 s after fill B starts: `done: /checkout` (today: refused); ⭐ mutant: the window counted from fill B's start, fails |
| R2-68 | fill B, no cards | none for 30 s: `stopped: no meal cards on this page`, nothing pressed |
| R2-69 | fill B, a meal missing | the cards drawn, one meal absent: refused 10 s after the first card, naming its key (unchanged) |
| R2-70 | the logo | with a header logo: the screen and the deep-carted checkout each show one `img` with its `src` and `alt="Fit AF"`, nothing focusable added; without one: none, and the fill unchanged |
| R2-71 | the text | every character of the Footer block and the console file is ASCII; no URL in them that the live block lacks; at most 10,240 bytes |
| W16 | the watch, live | the smoke reports the logo on the screen and on the checkout (found or absent); absent fails the width |

### 15.6 After the build, before the paste (the orchestrator's)

A clean-clone re-run; then **the rehearsal on the live store**: the watch's smoke with `--script` (this build's fill-B
console file, pasted into the live page by the smoke), at both widths, the standing rule's *"before a paste"*. After the
Advisor's paste: the smoke on the live block, and the watch's expected Footer moved by its accept command.

## 16. Built, 2026-09-30 — found at the build, not ruled

Red at `4657335` (R2-66–R2-71, W16, W9e's new sum) and `428e25a` (red (2): the tests' own reference key, below), built
at `d57a273`; the screen's logo moved to the top on a white plate by the Advisor's ruling after the rehearsal (§ 15.3),
red at `fad9947`, built at `ac6c8e8`. §§ 15.1–15.6 above are unchanged; this section says what the build chose where they left a choice, and
what it found.

- **The tag (15.1), as built**: `mealKey` first removes
  `/^\s*([\ud800-\udbff][\udc00-\udfff]|[☀-➿])\s*[A-Z]{2,12}\s*:\s/` (written with `\u` escapes; a pattern
  without the `u` flag reads a surrogate pair as two code units, which its first alternative matches), then collapses
  and trims as before. *"Optional space"* is read as any run of whitespace, or none, before the emoji, after it and
  before the colon, so a card's title keys alike before and after its whitespace is collapsed (R2-25c's rule). *"The
  space after it"* is required: `🟠NEW:X` is not a tag and keys as before; the rest of the space goes with the
  collapse and trim. **Not covered, by the contract's definition of an emoji**, and so keyed as before: a single
  character outside U+2600–U+27BF (`⭐`, U+2B50, pinned in R2-66b), an emoji followed by a variation selector (U+FE0F)
  before the word, and a flag (two surrogate pairs). The link tool and fill B carry the one function (R2-66c); it
  costs 88 bytes.
- ⚠ **Found running the whole suite after the first red commit: the tests' reference key hashed the tag.** The Chef's
  Choice fixture week (`test/fixtures/picks/2026-10-04.json`, invented names) names `🟠NEW: Maple Dijon Pork
  Tenderloin`, and CC-2a and CC-2c compute their expected links with `r2-harness.mjs`'s `refKey`. So a second red commit
  (`428e25a`) gives `refKey` the rule too, read independently (`refUntagged`: by code point, a first code point past 16
  bits or in U+2600–U+27BF), and CC-2c's changed-key model with it; R2-66 then checks every tagged form against it, and
  "keys as before" against § 11's key alone. That meal's links now carry `fi73q` (was `h2dau`). The committed week
  (`data/picks/2026-10-04.json`, `56ef62e`) names no tagged meal, so the page's links do not change.
- **"A titled `app-product-card`" (15.2)**: one whose `.product__content-title` has text, whitespace collapsed. The
  poll that first finds one is the first of the 50, so a page whose cards are there at once is refused at the 50th poll,
  9.8 s in, exactly as R2-10a has always counted; a meal missing is refused at the 50th poll counting the first card's
  (R2-69). Once started, the 10 s runs on whatever the page does after (cards removed and redrawn do not restart it).
- **How the 30 s is counted**: `NO_CARDS = 150` polls, counted as R2-28 counts the wait after CHECKOUT: the first poll at
  0 s, the 150th at 29.8 s the last; with no titled card by it, fill B stops there with `stopped: no meal cards on this
  page`, having set 149 timers (R2-68); cards drawn before the 150th poll are found by it (R2-68b). Its own constant
  rather than `AFTER_CHECKOUT`'s 150, so the two waits can change apart; W9e reads it from the built text. The § 10
  check runs on every poll of both waits.
- ⚠ **Fill B's longest run is now 111.4 s** (30 s for the first card, 10 s for the meals, 7 presses, 10 s for CHECKOUT,
  30 s and 30 s after it), **past the screen's 90 s clock**, which § 15.2 leaves unchanged: in the worst case the screen
  goes at 90 s before fill B's verdict, and the visitor sees the order page as fill B has it, as at a stop. The watch's
  `FILL_B_LONGEST_MS` is 111.4 s and its ceiling (`HANDOFF_MS`) 126.4 s (W9e).
- **The logo's source (15.3)**: *"the `src` of the page's `img.header__logo-image` (the image the store's header already
  loads)"* is read as the image the header **has loaded**: an img is made only once that image is `complete` with a
  `naturalWidth`, and its `src` is the header image's `currentSrc` (its `src`, when it has no `srcset`), as the carousel
  reuses a card's photo (§ 2 item 2) and for the same reason, § 1's *nothing is fetched*. W16b counts the requests on
  the synthetic store (`no-store`): one per page load, none by either logo of ours. A header image still loading gives no
  logo and no img until it has loaded (R2-70b); no header image, no logo, and the fill's presses, history writes, lines
  and timers are the same (R2-70).
- **On the screen** (as ruled after the rehearsal, § 15.3): the **first element of the screen's box, directly above
  the title** (the `h2`), inline style
  `display:block;margin:0 auto 16px;height:48px;padding:8px 10px;border-radius:8px;background:var(--white)`: the
  image's own padding, rounded corners and background make the white plate (the mock-ups' plate is 8px 10px of padding
  on `--white`); a plate element around it measured 10,308 bytes (a rule for it) and 10,309 (styled inline), over the
  ceiling. R2-70 reads it: first, above the title, a white background (the token, not a raw colour), a radius and
  padding. At `d57a273` it sat directly above the step line, as § 15.3 first read. Tried at every poll of fill B's wait
  and at every press until it is placed, once: on the live page the block runs when the store injects it, likely before
  its header's logo has loaded, so ⚠ **the logo can appear after the screen does**, pushing the title down as it
  arrives. The carousel's photo rule is `#fitaf-screen .c img` (the same slides), so the logo is not drawn as a slide.
- **On the checkout**: at done, after the mark and the style, the **first child of `app-checkout`**, inline style
  `display:block;margin:16px auto;height:40px`. Inside the component, so it goes when the component does, as every H rule
  stops applying (by construction: no case routes back and reads the logo); placed at done only, never on a stop (R2-70c); and with no rule in
  `style#fitaf-deep`, which still only hides (R2-42b unchanged). ⚠ Not placed again if the visitor leaves the checkout in
  the app and comes back (the H rules apply again; the logo does not). ⚠ If the store lays `app-checkout` out as a row,
  the logo sits beside the checkout rather than above it: the rehearsal at both widths shows which. It needs
  `app-checkout` on the page at done (on the synthetic store it is there when the address changes; on the live store,
  the rehearsal shows); without it, no logo, and W16 fails the width.
- **Not a link, nothing focusable**: an `img`, no `tabindex`, inside no link (R2-70 reads both).
- **W16, as built** (`SPEC-storefront-watch.md` § 10): the screen's logo is an `img[alt="Fit AF"]` the recorder sees in
  `#fitaf-screen`; the checkout's, one that is a child of `app-checkout`, found **and displayed**. Its own rule
  (`logoVerdict`) beside `facesVerdict`, judged only once fill B reached done, so W10a–W14a's recorded outcomes are
  unchanged. The synthetic store's header gains a generated logo; the watch's R2-52 counts the slides as `.c img`.
- **The size (15.4)**: the text **10,105** bytes, the Footer block **10,224**, the console file **10,205** at
  `ac6c8e8` (10,045, 10,164 and 10,145 at `d57a273`, before the plate's 60 bytes; 9,495, 9,614 and 9,595 at
  `d5a371e`); every character ASCII; no `<` but the Footer block's own two; no URL but the live
  block's `"/checkout"` and `"/order"` (R2-71). The three changes cost 750 bytes (about 88 for the key's tag, 181 for
  the wait, 477 for the logo), which took the Footer block to 10,395, **155 over the ceiling**. **Recovered by layout
  alone, no behaviour changed**: every line inside the block's function is indented one level less (a function's body
  starts at the left edge), 200 bytes; `git diff -w d57a273~ d57a273` shows the logic alone. The source's `//` lines say
  so.
- **The pins**: R2-32's moved from `c4ceb682…` to `adf6024c…` (`d57a273`), then, with the plate, to
  `914668ded95f6a8913e7ae0010661d26780700bd7443cbf93f9e4e8a875b41f6` (`ac6c8e8`). CC-8's golden (`test/cc-08-unchanged-golden.json`)
  pinned the text too: its `footer_text_sha256` moved the same way, both times, and its `watch_expected_footer` did not, since it
  names the block **live** in the store's Footer (`ace775b`, `c4ceb682…`), which this text replaces only at the paste;
  the golden now names that text as `replaces`, and CC-8a's control reads it. `storefront/watch-baseline.json` is
  untouched; after the paste, `accept --footer` moves it, and the golden's `watch_expected_footer` is regenerated and
  `replaces` removed in the same commit.
- **R2-71's "the live block"** is rebuilt from the commit the watch baseline's `expectedFooter` names, by this build,
  and checked against that SHA-256 before its addresses are read; it needs the repository's history (a shallow clone
  cannot rebuild it, and R2-71 then fails, saying so). R2-66b, R2-71 and R2-71b pass on the old text, as invariants
  must; every other new case was red for its own reason.
- ⬜ **`header__logo-image` is not in `storefront/dependencies.json`**: § 15 does not ask for it, and whether that
  literal is in the release's files was not checked (no request to the store). A rename shows as W16's absent at the
  next smoke; F2 would name it at the release if it were added.
- ⬜ **The Storybook branch** (`boston/rung-2-screen-next`, 236 bytes more than the block it was built on) does not fit on
  this text as it stands: 10,224 + 236 is over 10,240.
- ⬜ **Not run on the live store**: any of it. The rehearsal (§ 15.6) is the orchestrator's.

## 17. Amendment, 2026-10-01 — the screen shows Fit AF's own photographs, carried by the link

**Ruled by the Advisor** (`ts=2026-10-01T13:23:28.601Z`): *"For the interstitial, we can use our own images (which we
should have preloaded from the microsite) here. That should make this page work as intended (currently the HMP site
lags in downloading its images)."* And (`ts=2026-10-01T13:29:04.015Z`): *"I'm OK bumping the script limit to 15 kb just
to get through this meeting. Frankly we could be at 50 kb and still be lighter than most of the elements on the
page"* (a hosted script is the later path); on how the block learns each meal's photograph: *"We can optimize this
however we want."* **Base**: the dev line at `e8477d4` (the Footer block `914668de…`, live since the 2026-10-01 paste).

**Today** (§ 2 item 2): a slide shows its meal's photograph only once the store has loaded the card's image, so on a
slow store most slides are names alone.

### 17.1 The link carries each meal's photograph

- The microsite's checkout link (built by the link tool's `handoffLink`, used by `scripts/chefs-choice.mjs`) gains,
  **when the week's photo sheet has a cell for its meals**, what the block needs to show each meal's cell: **the sheet**
  and **each meal's cell**, read from `data/photo-sheets.json` by the tool — ⛔ no cell geometry is a literal in the
  block or the tool. The encoding is the builder's (the Advisor: *"however we want"*), as short as it can be.
- ⛔⛔ **The sheet's host is never a URL from the link.** A link is anyone's to write. The link names the host by a
  **code from a fixed list in the block** — the production site (`https://eatfitaf.com`) and the test address — and the
  block requests nothing else; an unknown code means no photograph.
- **Old links keep working exactly as today** (no photo part → today's slides). **And the new link must not reach a
  store whose block is older** before the Advisor pastes this block: the order is the rehearsal, his paste, then the
  microsite's release. The builder states how the live block (`914668de…`) treats a link with the photo part.

### 17.2 The slide shows Fit AF's photograph at once

At a meal's first press its slide shows **its cell of Fit AF's sheet** (the sheet's URL on the coded host, at the
slide's size, the cell's own pixels only), without waiting for the store's card image. The microsite has already loaded
that URL (its list shows it), so the browser reuses its copy. ⚠ eatfitaf.com serves `Cache-Control: public, max-age=0,
must-revalidate`: the browser revalidates (a conditional request); stated, not changed here. If the sheet fails to load,
the slide falls back to today's rule (the card's loaded image, else the name alone).

### 17.3 The size

The Footer block and the console file at most **15,360 bytes** (the Advisor's ruling, for this meeting); the 5,120-byte
warning stays. Every character ASCII; no `<` but the Footer block's two (§ 11). R2-71's *"no URL the live block lacks"*
is amended: the only addition is the fixed list of the sheet's hosts.

### 17.4 Cases

| | case | expect |
|---|---|---|
| R2-72 | the link | built from a fixture manifest, it carries each meal's cell; the block's reader decodes the same cells (one writer, one reader) |
| R2-73 | ⭐ the slide | on the synthetic store with the card images never loading, each slide shows its meal's cell from the coded host at its first press |
| R2-74 | old link | no photo part: slides exactly as today (R2-52 unchanged) |
| R2-75 | ⛔ unknown host code | no request to any host but the store's; today's slides |
| R2-76 | sheet fails | today's fallback per slide |
| R2-77 | the text | ≤ 15,360 bytes, ASCII, two `<`; the only new URLs are the listed hosts |
| W17 | the watch, live | given the microsite's own checkout link (`--link`), the screen's slides show Fit AF's sheet: found or not, per slide |

Existing pins (R2-32, CC-8's `footer_text_sha256`) move with the text, in the commit that changes it; the watch's
expected Footer moves only after the paste (`accept --footer`).
