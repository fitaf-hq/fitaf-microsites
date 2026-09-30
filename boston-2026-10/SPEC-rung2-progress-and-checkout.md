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
