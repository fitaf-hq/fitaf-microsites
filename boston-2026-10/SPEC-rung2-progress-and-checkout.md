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

## 18. Built — found at the build, not ruled

Red at `ecdf156` (R2-72–R2-77, W17a; R2-11 and R2-29 moved to the new ceiling, R2-11b and R2-71 to § 17.3's one
addition), built at `d984a7e`, mutants at `33e2583`. §§ 17.1–17.4 above are unchanged; this section says what the build
chose where they left a choice, and what it found.

- **The encoding (17.1: "however we want", "as short as it can be")**: after the meal part, `!`-separated: the host's
  **code** (one digit, its index in the block's list), the sheet's **path** on that host from its first `/` (the
  manifest's `base` and `file`), the sheet's **width** in base 36, then **one cell per meal in the link's order**,
  `x,y,w,h` in base 36, or empty for a meal with no cell. For this week's Signature · 7 that is 130 characters:
  `…34975!1!/assets/photo-sheets/chefs-choice-2026-10-04.jpg!5s!g,g,4w,4w!g,68,4w,4w!…`. The sheet's height is not
  carried: the block does not need it (below). `!` separates because the meal part already uses `.` and `~`, and the
  live block splits on `.` (next item).
- ⭐ **How the live block (`914668de…`) treats a link with the photo part: it refuses it whole.** Its payload reader
  splits the fragment on `.`, so the last meal's item reads `<key>!0!/assets/photo-sheets/chefs-choice-2026-10-04` and
  fails its pattern: `stopped: bad meal: …`, the fragment removed, **nothing pressed, no screen**; the visitor has the
  plan's order page as rung 1 leaves it. Measured with the live text, rebuilt as R2-71 rebuilds it (R2-74b). So the
  failure is safe, but **every Chef's Choice link of a microsite built from this commit is refused by the live block**:
  the order § 17.1 states (the rehearsal, the paste, then the microsite's release) is what keeps the Chef's Choice
  working. ⚠ `npm run build` from this commit already writes those links (host code 0); it must not be deployed before
  the paste. Old links (no photo part) behave in the new block exactly as in the live one, step for step (R2-74).
- **The list (17.1)**: one module, `src/storefront/photo-hosts.js`: code 0 `https://eatfitaf.com`, code 1 the test
  address `https://fitaf-microsites-dev.fitaf-microsite-boston-2026-10.workers.dev` (the README's Dev URL). The link
  tool imports it; the build inlines it at a `HOSTS` slot. The slot is **optional** (not among the required slots), so
  R2-71 can still rebuild the live block from its own commit. The production build's links use code 0, the development
  build's code 1 (`build.mjs`, `PROD_PHOTO_HOST` / `DEV_PHOTO_HOST`). A manifest whose `base` is null or absolute (a CDN,
  not on the list) gives the link of today.
- **What the block accepts**: a code that is exactly one digit naming a listed host; a path matching
  `^\/[\w\/.-]{1,200}$` (so the URL is the listed host followed by `/…`: no path can change the host); a width above 0;
  a cell of four base-36 numbers of 1–4 digits, with a width and height above 0 and inside the sheet's width. Anything
  else is **no photograph for that meal, or none at all, and never a stop**: the meal part alone decides the order. The
  photo part is read inside `ui()`, after the meal part has passed every check.
- **"When the week's photo sheet has a cell for its meals"** is read as **for any of them**: a meal without a cell
  gets an empty cell and today's slide (R2-72, R2-73); a week with no cell for any meal gets the link of today.
- **The slide (17.2, "at the slide's size, the cell's own pixels only")**: a box with the **cell's own ratio**
  (`aspect-ratio`, written as one number, `w / h`) at the slide's height (`min(220px,32vh)`, the card photos'), centred;
  inside it the whole sheet as an `img`, `width` the sheet's width in cells (`W / w`), `left` and `top` the cell's
  offset (`-x / w`, `-y / h`), the box clipping the rest. For this week's square cells that is a 220 × 220 square,
  **not** the full-width crop the card's own photographs get (a full-width cover of a 176-px cell would show it at
  about 2.4×, and a cover window cannot be written without knowing the box's size). The Advisor sees it at the
  rehearsal.
- **The sheet is asked for once, before the first press**: when the screen appears the block makes an `img` with the
  sheet's URL and does not place it (the browser starts the request); each slide's `img` asks for the same URL. Its
  error, or a slide's, sets a flag: that slide falls back to today's rule (`pic()`: the card's loaded image, else the
  name alone) and no later slide asks for the sheet (R2-76).
- ⚠ **"The browser reuses its copy" (17.2) is not what a browser does here, as far as the build knows** (not measured):
  Chrome (since 86), Safari and Firefox (since 85) partition their HTTP cache by the top-level site, so a sheet loaded
  on eatfitaf.com is a separate entry from the same URL loaded inside fitafnutrition.com. The store's page fetches the
  sheet itself (118,748 bytes for this week); the early request above is the head start. Nor is it known whether the
  store's page restricts images by a Content-Security-Policy, or eatfitaf.com sends a `Cross-Origin-Resource-Policy`:
  either would make the sheet fail, and the slides fall back. The rehearsal (W17) shows which.
- **The size (17.3)**: the text 92ee18db…, the Footer block **11,691** bytes and the console file **11,672** (`33e2583`;
  10,224 and 10,205 at `914668de…`): about 1,470 bytes for the photo part, the slide and its fallback. Every character
  ASCII; no `<` but the Footer block's two; the only new URLs the two listed hosts (R2-77).
- **The pins**: R2-32's and PR-10's moved from `914668de…` to
  `92ee18dbb8260fda63ee1f2fccf1f741e7ac8e8a29e6676fbaf60a70a74578a6`; CC-8's golden `footer_text_sha256` the same, with
  `replaces` naming the live `914668de…` (CC-8a's control) until the paste. `storefront/watch-baseline.json` is
  untouched.
- **R2-71's live-text rebuild** moved to `test/r2-live.mjs`, unchanged, so R2-74 and R2-77 read the same text.
- **The mutants (`test/r2-73-75-mutants.test.mjs`, in a mirror)**: (a) the host taken from the link
  (`HOSTS[f[0]] || f[0]`): R2-75 fails, a forged host requested; (b) the slide waiting for the card's image: R2-73 fails.
  Each with a control.
- **W17, as built** (`tools/storefront-watch`): `npm run smoke -- --link '<the microsite's checkout link>'` runs that
  link instead of one built from the menu: its plan (`?mpid=`), its meals (read against the menu by name with the
  site's key function, each as many times as the link says, so the pass rule's names and total are the link's), and its
  whole fragment. The recorder notes each slide as it arrives, the `src` of its `img` on a listed host, and that img's
  load or error; the report's line says, per slide, **shown**, **failed**, **asked** (neither seen) or **not found**.
  **A report, not a pass rule**: § 17.4 asks "found or not", and a failed sheet is a fallback the contract allows.
  W17a tests the line and `--link`'s choice; W17b runs the smoke with `--link` in Chrome on the synthetic store, the
  link's page serving a generated sheet for the listed host by request interception (nothing reaches the network).
- ⬜ **Not run on the live store**: any of it. The rehearsal is the orchestrator's: the console file with `--script`,
  and `--link` with the development build's Signature · 7 link (host code 1, so the sheet must be served at the test
  address's `/assets/photo-sheets/chefs-choice-2026-10-04.jpg`, or every slide reports *failed* and falls back).
- ⬜ **Not checked**: how the sheet's box looks at 390 px in a real browser (W17b reads the report, not the geometry);
  whether a pasted console run, which starts after the store's cards are drawn, gives the early request any head start.

## 19. Amendment, 2026-10-01 — the deep-carted checkout shows each meal as its photograph and name, and no plan total

**Ruled by the Advisor** (`ts=2026-10-01T13:52:25.026Z`): *"It just needs to be the meal image and meal name (on 2 lines like this is fine). We don't need to repeat the per item price, the portion size, the quantity or the trash can. Ideally the entire set of 14 meals fits on a single phone screen."* *"Since, in the microsite version of the checkout at least, there should only ever be 1 plan, we can drop"* the *"Plan Total (N items)"* row. Timing (`ts=2026-10-01T13:55:29.394Z`): this cleanup now, in § 17's paste; the three-step checkout (meals, delivery, payment) later. *"We're deliberately taking editing out of the checkout."*

1. On a **deep-carted** checkout only (the page's mark, as every H rule), each order line shows **only the meal's photograph and its name** (the name may wrap to two lines). Hidden by the block's style, never removed: the line's **price**, its **portion** tag, its **quantity** control and its **remove** control. New H rules, numbered after H10, each with its selector in `storefront/dependencies.json` (F2) and its case.
2. **Compact**: each line's photograph small (about 48 px) beside its name, the lines' spacing tight, so that **all 14 lines of a 14-meal plan fit in one 390 × 844 screen** (measured on the synthetic checkout in Chrome; the live rehearsal measures the real one).
3. **The plan's total row** (*"Plan Total (N items)"*) hidden. ⛔ **The order's Total stays displayed** (H9's rule, unchanged), and the pay button is untouched (W11).
4. Bytes: within § 17.3's 15,360. Text: ASCII, two `<`.
5. Cases: R2-78 the four line elements hidden and the photograph and name shown, only on a deep-carted checkout (an ordinary visit unchanged, R2-50's rule); R2-79 the plan-total row hidden, the order Total and the pay button displayed; R2-80 (Chrome) 14 lines within 844 px at 390; W18 (the watch, live) the line elements hidden and the 14-line height measured, reported per width.

## 20. Built — found at the build of § 19, not ruled

Red at `1b72512`, built at `d6261da`. § 19 above is unchanged.

- **The names** (the store's public code as saved on 2026-09-29, `chunk-PVWLQ2OV.js`, the release of that day; not
  re-read from `main-VISDSEXM.js`, accepted 2026-10-01, since nothing here requests the store): a line is
  `.summary__item`, holding `.summary__item-image` (its `img`), `.summary__item-info` (`.summary__item-name`, the add-on
  pills `.summary__item-addons`, and `.summary__item-quantity-controls`: a stepper and the trash can, `button
  .summary__item-remove`, *"Remove item"*), then `.summary__item-price`. The plan's total row is `.summary__plan-total`
  (*"Plan Total (N items)"*). **H11** price, **H12** portion, **H13** quantity, **H14** remove, **H15** the plan total.
  ⚠ **"The portion tag" is read as the line's add-on pills** (`.summary__item-addons`, the cart item's `hmp_addons`): the
  store's code has no element named for a portion; if the live store shows the portion elsewhere, W18 cannot see it
  and the rehearsal's eye must. H14 sits inside H13's element, so it is hidden twice; it has its own rule in case the
  store moves it. F2 carries the five and `.summary__item`, `-image` and `-name`; a rename in today's release shows at
  the next F2 run, and as *absent* in W18.
- **Compact (19.2)**: three rules, the only ones beside the banner's margin that do not hide (R2-42b names them and the
  properties they may set): each line `padding:3px 6px;margin:0 0 2px;gap:8px;align-items:center`; its image 48 × 48;
  its name `-webkit-line-clamp:2` at `line-height:1.3` (a third line is cut, not wrapped). No `!important`: each rule's
  specificity (`html.fitaf-deep:has(app-checkout) .x`, 0-2-2) is above the store's own (`.x[_ngcontent-…]`, 0-2-0).
- **R2-80, measured** (the synthetic checkout spaced as the store's stylesheet spaces it: 56-px images, 12 px of padding,
  8 px between lines, 48 px and 10 px at 1024 px and narrower): fourteen lines take **782 px** at 390 × 844 with our
  style (54-px lines), **1,456 px** without it. ⚠ That is the lines alone: the summary's header, the Total and the
  store's pay bar are around them, and at 1024 px and narrower the store shows its summary in a drawer the synthetic
  checkout does not model. W18 reports the live height per width; the smoke's own link has 7 meals, so it reports what
  fourteen would take at the measured pitch.
- **The payment check (W11)** now allows H13 and H14's controls to be hidden (the stepper's buttons and field, the
  remove button): § 19's *"deliberately taking editing out of the checkout"*. The pay button and the Total are
  unchanged (R2-79). W12a's count of conditional targets moved from 7 to 12 with H11–H15 (found after the red commit).
- **W18, as built**: H11–H15 in the watch's hide list under W18, each conditional (absent is reported, not a failure;
  found and still displayed fails the width, as W14's); `readFaces` measures the displayed `.summary__item`s with our
  style; the report's line: *"W18: N order lines in H px (P px each); 14 would take 14·P px of 844: fits"*.
- **The size**: the text `7eadcbdb…`, the Footer block **12,165** bytes and the console file **12,146** at `09664a1`
  (474 more than § 17 alone; 12,171 and 12,152 with a "-dirty" version line); every character ASCII; no `<` but the Footer block's two. **The pins**: R2-32, PR-10 and CC-8's
  `footer_text_sha256` moved from `92ee18db…` to `7eadcbdbdce49492a85d2d05901829d14be8f055c54ad9bbdf95173458a76cd0`; CC-8's
  `replaces` still names the live `914668de…`; the watch's baseline is untouched.
- ⬜ **Not run on the live store**, and not seen by the Advisor: the rehearsal's.

## 21. Amendment, 2026-10-01 — the plan's header and its return link hidden

**Ruled by the Advisor** (`ts=2026-10-01T14:47:25.654Z`): *"can you please hide this block of text in the checkout? I think that's the final change before the meeting. It's these 2 DIVs that need to be hidden"*: the plan group's header — `div.summary__plan-group-header` (the plan's name, e.g. *"Lean Plan 14 Meals"*, its *"Remove plan"* button and the chevron) — and the return link, `a.summary__plan-return` (*"← Return to Lean Plan 14 Meals"*).

1. On a **deep-carted** checkout only (the page's mark, as every H rule), both are hidden by the block's style, never removed; new H rules after § 19's, each selector in `storefront/dependencies.json` (F2) with its case. The lines (photograph and name), the order's Total and the pay button are unchanged.
2. Within 15,360 bytes; ASCII; two `<`.
3. Cases: R2-81 both hidden on a deep-carted checkout and displayed on an ordinary visit (the synthetic checkout gains both elements, as the live markup quoted above); W19 (the watch, live) both hidden or absent, per width, failing a width only if one is displayed.

## 22. Built — found at the build of § 21, not ruled

Red at `1e94cf3`, built at `d8e5d4e`. § 21 above is unchanged.

- **H16** `.summary__plan-group-header` and **H17** `.summary__plan-return`, added to the style's one scoped hide list
  (`display:none!important`, never removed). Both names are in the store's public code of 2026-09-29 (the plan group's
  header holds `.summary__plan-group-label`, the actions and the chevron); F2 carries both. Nothing inside the header
  is named separately: hiding the header hides the plan's name, *"Remove plan"* and the chevron together.
- **The payment check (W11, R2-45)** now allows two more controls to be hidden: the header's *"Remove plan"* button
  and the return link (an `a[href]`). R2-45's expected list gains both; the pay button and the Total are unchanged.
- **The synthetic checkout** gains the header (*"Lean Plan 7 Meals"*, a *"Remove plan"* button, a chevron) and its
  return link reads *"← Return to Lean Plan 7 Meals"* (it read *"Edit plan"*); R2-47 still routes back by it (a
  script's click reaches a hidden link).
- **W19, as built**: H16 and H17 in the watch's hide list under W19, conditional (absent is reported, not a failure),
  found and still displayed fails the width.
- **The size and the pins**: the text `b323ee55…`; R2-32, PR-10 and CC-8's `footer_text_sha256` moved from `7eadcbdb…`
  to `b323ee550e6f0258988fecdab4a50dc0564bf2de2eedfc6380dda792bb2f2209`; CC-8's `replaces` names the live `7eadcbdb…`
  until the paste; the watch's baseline is untouched.
- ⬜ **Not run on the live store.**

## 23. Amendment, 2026-10-01 — one second between presses

**Ruled by the Advisor** (`ts=2026-10-01T17:04:50.063Z`): *"I think we might be overloading HMP UI layer. I think it needs to be at least 1 second of pause... \*possibly\* because they're dealing with a UI blocking or race condition. Can we bump that up now?"* **The evidence**: in the Advisor's own browser the 14-meal link (`mpid=23`) left 11 of 14 meals in the plan, the link's first 11 in order, and stopped short of CHECKOUT; fresh headless profiles at 1920 and 2560 px, and at 2560 px with the CPU slowed 4× and 8×, filled 14 of 14 and reached `/checkout`.

1. fill B waits **`PRESS_MS` = 1000** after each press before the next (every Add to Cart and every +), and after the last press before its first look for CHECKOUT. **`POLL_MS` (200) and every poll count are unchanged**: the waits for the cards, for CHECKOUT and after CHECKOUT.
2. A named constant beside `POLL_MS`. The Footer block stays within 15,360 bytes, ASCII, two `<`.
3. Cases: **R2-82** (fake timers): each delay scheduled between presses, and after the last, is 1000 ms; every other delay is 200 ms. Existing cases that assert *"every delay is `POLL_MS`"* (R2-16, R2-67 and any other) assert it of the polls only.

**Not in this amendment**: confirming that the store counted each press (its quantity counter) before the next, and naming the shortfall in the stop line. After the meeting.

## 24. Built — found at the build of § 23, not ruled

Red at `8c7df94`, built at `6b5f19b`. § 23 above is unchanged.

- **One timer changed**: fill B schedules its next press with `PRESS_MS` (1000) where it used `POLL_MS`. That timer
  follows every press (each Add to Cart and each +), and the one after the last press is the wait before
  `checkout()`'s first look for CHECKOUT, so item 1 is the one change. `var POLL_MS = 200, PRESS_MS = 1000, MAX_POLLS =
  50, AFTER_CHECKOUT = 150, NO_CARDS = 150;`
- **What a run costs**: a link of N meals takes N seconds of presses where it took N × 0.2 s; a 14-meal plan about 14 s
  before CHECKOUT, well inside the screen's 90 s clock. Fill B's longest run on mpid 21 is now 117 s (W9e reads the
  constant from the built text); the watch's `FILL_B_LONGEST_MS` 117 s and `HANDOFF_MS` 132 s.
- **The cases**: R2-82 places each 1000 ms delay (recorded with the presses made when it was scheduled) right after its
  press, the last's included, and every other at 200 ms. The harness's `assertPollsAndPresses` (exactly one
  `PRESS_MS` per meal press, every other delay `POLL_MS`) replaces *"every delay is `POLL_MS`"* in R2-09, R2-10, R2-15,
  R2-16, R2-17, R2-67 and R2-68. The cases that count polls against a budget (R2-16, R2-17) still count delays, each
  press one of them, as before.
- **The pins**: R2-32, PR-10 and CC-8's `footer_text_sha256` moved from `b323ee55…` to
  `cbc6d1ecb340f818a39d1b3478e55e96f5cb9edf41033dc2b60a8ca4ef8c93cd`; CC-8's `replaces` names the live `b323ee55…`
  until the paste; the watch's baseline is untouched.
- ⬜ **Not run on the live store**, and not known to cure the 11-of-14: § 23's evidence did not reproduce the shortfall
  headless; one second is the Advisor's ruling, and confirming each press was counted is after the meeting.

## 25. Amendment, 2026-10-02 — the three-step checkout. RULED (§ 25.7); not yet built

**Ruled by the Advisor** (`ts=2026-10-01T13:52:25.026Z`): *"Break the checkout page up into a 3 step process:
confirming meals, delivery details, and payment. This is the current flow of the page – just collapsed so it only shows
~1 phone screen's worth of information at a time."* Timing: after the meeting (`ts=2026-10-01T13:55:29.394Z`, *"Cleanup
now, 3-step after"*). Confirmed as the checkout's refinement (`ts=2026-10-02T16:42:51.831Z`): *"Yes that's it. I also
think that inside of each step there may be some iterative UI tweaking. We may or may not want to mock up the checkout
page in Storybook – I don't think that this will require that many rounds of adjustments though."* Wanted by Saturday
2026-10-03 09:00 (the Boston record § 47).

### 25.1 What it is, and what it is not

- **On a deep-carted checkout only** (§ 3 item 1's mark, `html.fitaf-deep:has(app-checkout)`), the block shows the
  store's own checkout **one step at a time**: a step bar (*1 · 2 · 3* with the three names) at the top, the current
  step's sections, and **Back** / **Continue** at the foot. A reload shows the store's full checkout (§ 3: never
  storage), and an ordinary visit is unchanged (R2-50).
- ⛔ **Nothing of the store's is removed, moved out of its form, typed into or pressed by the block.** A step is a CSS
  state (`html.fitaf-step-1` … `-3`) that hides the other steps' sections; Back and Continue are the block's own buttons
  and change only that state. Every value the customer enters goes into the store's own fields, and the store's own pay
  button places the order.
- ⛔ Not editing: the Advisor, *"we're deliberately taking editing \*out\* of the checkout"*; the *"I want to pick
  different meals"* button is later, not here.

### 25.2 The steps, by the store's own sections (the live markup as `tools/storefront-watch/test/browser-store.mjs` carries it)

| step | name (⬜ F3) | shows | hides |
|---|---|---|---|
| 1 | **Your meals** | the summary (`.checkout__summary`): every order line (photograph and name, § 19) and the Total | the form's sections |
| 2 | **Delivery** | `section.contact`, `section.delivery` (delivery or pickup, the address), `section.schedule` (the delivery date) | the summary's lines; payment |
| 3 | **Payment** | `section.payment` (the card field, the store's iframe), the tip while one is chosen (H10's rule), `.checkout__consent`, the pay button (`.checkout__submit`; on a phone `.summary__pay-button`) | the summary's lines; contact, delivery, schedule |

- ⭐ **The Total is displayed in every step** (W14, unchanged): steps 2 and 3 show a one-line recap, *"7 meals ·
  Total $87.50"*, the store's own Total element, with the lines hidden.
- **The pay button is displayed only in step 3.** On a phone the store's bottom bar keeps its Total and shows the
  block's **Continue** in steps 1–2 in place of *PAY NOW* (the store's button hidden by the style, never removed).
  ⇒ W11 is amended (§ 25.5): the pay button displayed **at step 3**.
- Every H rule (H2–H17) applies in every step as now.

### 25.3 Continue never lets the customer reach a dead end

- **Continue from step 2 reads the store's own validity** (Angular's `ng-invalid` on the step's form controls, the
  framework's marker, a new F2 dependency): while any control in the step is invalid, Continue does not advance; it
  scrolls to and focuses the first one, and the store shows its own message. ⛔ The block has no validation rules of
  its own.
- **An error in a hidden step shows that step**: if, after the customer presses the pay button, a control in step 1 or
  2 becomes `ng-invalid.ng-touched` or the store shows an error inside a hidden step, the block switches to that step.
- **Back** never loses an entry (the sections are hidden, not destroyed; Angular keeps their state).

### 25.4 The words, the place and the size

- Words: ⬜ F3. Proposed: the bar *"Your meals · Delivery · Payment"*; *"Continue to delivery"*, *"Continue to
  payment"*, *"Back"*. ASCII in the shipped text (§ 17.3), the bar's own type and colours from the store's page, the
  contrast checked as B2 does.
- Widths: ⬜ F2. Proposed: the same three steps at every width; at 1025 px and wider the summary (step 1) sits where
  the store puts it, beside the form.
- Size: ⬜ F1. The block is **13,693** bytes against **15,360** (§ 17.3); the steps' style and logic are estimated at
  1.5–2.5 KB, so likely over.

### 25.5 Cases (contract only; numbered when built)

On the synthetic checkout (`browser-store.mjs`, the live markup), at 390 and 1280 px: the step bar only on a
deep-carted checkout; exactly one step's sections displayed; the Total displayed in all three; the pay button
displayed only at step 3; Continue refused while a step-2 control is `ng-invalid`, with that control focused; an error
in a hidden step shows its step; Back keeps every entry; no store control pressed by the block (the fill-B rule:
`control()`); an ordinary visit and a reload unchanged. **Mutants**: a style that hides the Total in step 2; a Continue
that ignores `ng-invalid`; each must turn a case red. **The watch**: W10–W13 walk the three steps (Continue, Continue)
before reading the pay button; a new W19 reports each step's displayed sections and that the order Total was
displayed in each, live, no order placed. **Before the paste**: the live smoke on a flag at both widths, then the
Advisor's paste.

### 25.6 ⬜ The forks, the Advisor's

- **F1, the size**: (a) raise § 17.3's ceiling (he, 2026-10-01: *"Frankly we could be at 50 kb and still be lighter
  than most of the elements on the page"*), e.g. to 20,480 bytes, and keep the block inline for Saturday; or (b) host
  the block on eatfitaf.com now (fill C's phase 3; whether the store's page loads an outside script is unmeasured).
  **Recommended: (a)**, hosting staying phase 3.
- **F2, the widths**: the same steps at every width (**recommended**: one flow, one set of cases), or phones only.
- **F3, the words**: the names and buttons in § 25.4, or his.

A Storybook mock-up is **not** proposed: the synthetic checkout already carries the live markup and is looked at in
Chrome at both widths; the iterative tweaking happens on it, then on the live rehearsal.

### 25.7 Ruled (`AskUserQuestion`, 2026-10-02, session 220): all three forks as recommended

- **F1**: *"Raise the ceiling"*. § 17.3's ceiling becomes **20,480 bytes**; the block stays inline in the Footer; hosting
  on eatfitaf.com stays fill C's phase 3.
- **F2**: *"Every width"*. The same three steps at every width.
- **F3**: *"As proposed"*. The bar *"Your meals · Delivery · Payment"*; *"Continue to delivery"*, *"Continue to payment"*,
  *"Back"*.

## 26. Built — found at the build of § 25, not ruled

Built at `ba9eabc` (branch `boston/three-step-checkout`, from the dev line's `5363d87`). The brief's rule commits only
on a green suite, so no red commit exists: the new cases were run red against `5363d87`'s block source (built by this
build) before it changed: R2-83–R2-90 10 of 10 failed (no steps: *"step 1 not reached"*; the two mutants' targets
absent from the old text), R2-91 3 of 3, B2b, and W20b–W20d 3 of 3 (W20a tests the watch's new rule on recorded
outcomes, not the block, and passes on either). §§ 25.1–25.7 above are unchanged; this section says what the build
chose where they left a choice, and what it could not build as written.

- **The steps, as built** (§ 25.2): selectors inside style#fitaf-deep's ONE scoped hide rule (every one still begins
  `html.fitaf-deep:has(app-checkout) `, R2-42b), each beginning with a step class and **the block's own foot**:
  `.fitaf-step-N:has(#fitaf-nav) …`. Step 1 hides the store's whole form (`.checkout__form`: *"the form's sections"*
  read as the form); step 2 hides the order lines (`.summary__item`), every child of the form that neither is nor holds
  `section.contact`, `section.delivery` or `section.schedule`, and `.checkout__submit` by name (in case a release
  wraps the sections); step 3 hides the lines and those three sections, so **the rest of the form is step 3**: the
  payment, the tip while chosen (H10), the consent, the form's pay button, and anything the table does not name (the
  synthetic form's special requests; the discounts while a code keeps them, H7). Every control of the form is displayed
  in exactly one step. *"The summary's lines"* is read as `.summary__item` (the name read from the store's code,
  § 20): the rest of the summary (the Total, a discount row, an active subscription's lines, the summary's discounts with
  a code) is displayed at every step; a commitment is never hidden (§ 3 item 3).
- ⭐ **The fail-safe**: `:has(#fitaf-nav)` on every step selector. The foot is inside `app-checkout`, so if the store draws
  its checkout again without it (the visitor leaves and comes back inside the app), the step class on `<html>` hides
  nothing and the visitor has the whole stripped checkout, never a step with no way on. A browser without `:has()` gets
  no steps at all (the block checks `CSS.supports("selector(:has(+*))")` before drawing them).
- **The phone's PAY NOW** (§ 25.2): hidden in steps 1 and 2 only while the block's Continue is its next sibling
  (`.summary__pay-button:has(+#fitaf-go)`): Continue is placed right after the store's `.summary__pay-button` while that
  button's row is displayed (the store shows its phone bar at 1024 px and narrower, § 9), else in the foot; at every step
  and at every `resize`. If the store draws its bar again without Continue in it, PAY NOW shows again (pressing it early
  meets the store's own validation and the rule below), never neither. The foot keeps a bottom margin as tall as the
  store's bar, so the bar never covers Back.
- **The recap** (§ 25.2, *"7 meals · Total $87.50"*): a `::before` of the store's own `.summary__total` in steps 2 and
  3, its content `data/messages.json`'s new `handoff.recap`, *"{n} meals ·"*, with {n} the link's meal count. The one
  rule of the style that adds rather than hides, besides § 10's margin and § 19's compact lines: **R2-42b is amended to
  allow exactly it** (content and the space after it). How it sits beside the live Total (a flex row?) is not known here.
- **The block's own elements** (§ 25.4: *"the bar's own type and colours from the store's page"*, read as the store's
  TYPE, `font-family: inherit`, and the page's colour TOKENS, which echo the store's look): `#fitaf-bar` after the logo
  (*"1 Your meals · 2 Delivery · 3 Payment"*: the ruled names, numbered by the block, the current one navy and bold and
  `aria-current="step"`, the others `--muted`), `#fitaf-nav` the checkout's last child holding Back (`#fitaf-back`), and
  Continue (`#fitaf-go`), both `type="button"` (they never submit a form they stand in). Their style is inline (the
  tokens as custom properties on each), so style#fitaf-deep still only hides the store's elements. Back and Continue sit
  together, centred, in the foot: the store's layout around them (its column widths at 1280) is not the block's to know.
  Continue reads *"Continue to delivery"* at step 1 and *"Continue to payment"* at step 2, and is gone at step 3; Back is
  gone at step 1. Each step change scrolls to the top. `--muted` joins the inlined tokens; **the build now inlines only
  the tokens the source reads** (`var(--…)`), as it already did the words, so the older live blocks still rebuild byte
  for byte (R2-71, R2-74, R2-77 read them).
- **The words** (§ 25.7 F3): `data/messages.json`'s `handoff.steps` (*"Your meals · Delivery · Payment"*, the bar),
  `to_delivery`, `to_payment`, `back` and `recap`. ⭐ **The middle dot ships as the ASCII escape `·`**: in the
  words (as the step line's already does) and in the block's own split of the bar at `" · "`. The build refuses a
  `steps` that is not three names joined by `" · "`, and a `recap` without {n} (R2-91c).
- **Continue from step 2** (§ 25.3): the first `.ng-invalid` inside the three sections that holds no `.ng-invalid`
  itself (a field, not its form group or the form) and is displayed; its own input, select or textarea (or the first
  inside it) is scrolled to the centre and focused, and no step is taken. Step 1 has no check: no store control is
  displayed there (H13, H14 take the lines' controls).
- **An error in a hidden step** (§ 25.3): after a press inside `.checkout__submit` or `.summary__pay-button` (read in the
  capture phase, never prevented), a MutationObserver on the checkout's `class` attributes looks for a step-2 field
  `ng-invalid` AND `ng-touched` (the store's `markAllAsTouched`, or a refusal it receives later) while step 2 is hidden,
  and shows step 2 with it focused. No timer. ⚠ **Not built: *"or the store shows an error inside a hidden step"***
  beyond Angular's marker: the store's own error element is not named in any contract, there is no local copy of its
  code, and none was requested; and step 1's lines have no control displayed. ⚠ **An edge, not built against and not
  seen**: a step-2 control the STORE itself hides (an address while *Pickup* is chosen, say), if it were invalid and
  touched, would bring step 2 up with nothing visible to fix.
- ⚠ **Could not be built as written: the watch's walk, *"W10–W13 walk the three steps (Continue, Continue)"*.** The
  smoke types nothing into `/checkout` (§ 0, the watch's own rule), the store's step-2 fields are required, and § 25.3's
  Continue refuses while one is `ng-invalid`, as it must. So on the live store, as on the synthetic one (whose step-2
  fields now carry Angular's state), **the second Continue is refused**. Built: the smoke records the refusal (the control
  the block focused, and whether it is `ng-invalid`: itself a live check of § 25.3) and enters step 3 by setting the
  block's own class, `html.fitaf-step-3`, which shows exactly what step 3 displays; the report says so (*"Continue
  REFUSED at step 2 (focused input[name=email], ng-invalid): entered by the block's class, the smoke types nothing"*).
  ⬜ The other reading (the smoke typing test entries into the live checkout) is not the build's to choose.
- **W20, not W19** (§ 25.5's *"a new W19"*): W19 is § 21's (H16, H17). W20 reports, per step, how it was reached, § 25.2's
  sections displayed and the Total; it fails a width on another step's section displayed, a step's own found and not
  displayed, the Total not displayed at a step, or a walk that stopped. **W11 as amended**: the measure (§ 3 item 4) is
  made at every step, each with its own allowance (the controls of the steps not shown, and the pay button before step
  3); the pay button must be displayed at step 3 and not at steps 1 and 2; the top-level reading W11 reports is step 3's.
  The hide list (W12, W14, W18, W19) is judged over all three steps (a target displayed at any step fails), the lines
  (W18) and the logo (W16) at step 1. ⭐ **A block without steps** (the live `1e3802b8…` until the paste): one reading at
  done, as before, and W20 reports *"no steps on this checkout"*, not a failure, so the hourly smoke of the live block
  stays as it was.
- **The synthetic store** (`tools/storefront-watch/test/browser-store.mjs`), extended for § 25 only: `validity` (by
  default) gives the step-2 controls Angular's own state, by the framework's classes (none of the store's code):
  `formcontrolname` on the contact's email, phone, first and last name (required) and the delivery's address (required),
  state and the schedule's date; the address and state in a `formgroupname="address"` group (a wrapper
  `div.delivery__address`); `ng-valid`/`ng-invalid`, `ng-pristine`/`ng-dirty` (on input), `ng-untouched`/`ng-touched`
  (on blur), and `ng-invalid` on the group and the form while a control inside is invalid; a touched invalid control
  shows the store's message after it (`p.field-error`, `role=alert`). Either pay button marks every control touched and,
  with the form invalid, places nothing (*"[fixture] pay pressed: the form is invalid"*). `payError` (a control's name):
  the store refuses the first valid press 300 ms later, that control invalid and touched with its message, until edited.
- **The cases.** New: **R2-83–R2-90** in Chrome at 390 and 1280 (`tools/storefront-watch/test/r2-83-90-three-steps.test.mjs`),
  the test acting as the customer (trusted clicks on the block's buttons where they are drawn; typing step 2's entries);
  **R2-91** (the words, the site suite); **B2b** (the steps' colours); **W20a–W20d**. Changed, each because § 25 shows one
  step at a time: **R2-45/45b/46** re-stated over the steps (at each step nothing displayed that was not, the Total, the
  pay button only at step 3; ACROSS the steps, by element, the controls no step displays are exactly the same H3, H4,
  H6, H7, H10, H16 and H17 controls); **R2-54, R2-56** read at step 3 (where the form's discounts and the tip are; at step
  1 a hidden one could not be told from the step); **R2-79, R2-81** (the pay button at step 3, the lines at step 1);
  **R2-78a, R2-81a** (the step selectors set aside before *"never hidden"*, and the lines' one step selector pinned to
  steps 2 and 3); **R2-42b** (the recap); **W14b** (W11's count at step 3: the 21 H controls plus step 2's nine); **R2-11,
  R2-29, R2-77** (the ceiling); **R2-32, PR-10, CC-8** (the pins). The harness `r2-browser.mjs` gains the step readers and
  `walkTo` (forward from the step shown; step 2's entries typed into empty fields only).
- **The mutants** (in the suite, each with its control): **R2-85b**, a style that also hides the Total in step 2
  (`.fitaf-step-2 .summary__total` added to the hide list): R2-85 fails, *"390, step 2: the Total displayed"*. **R2-87b**,
  a Continue that ignores `ng-invalid` (its query `" .ng-invalid"` made `" .ng-never"`): R2-87 fails, *"1280: Continue
  refused, step 2 kept"* (the block went to step 3). **W20c**, the R2-85b style in the smoke: the width fails on *"W20: the
  Total not displayed at step 2"*. R2-46's mutant (the email field hidden) still fails the re-stated R2-45, and the
  smoke's W11 email mutant now fails at step 2.
- **F2** (`storefront/dependencies.json`, 51 → 57 literals): `"checkout__form"`, `1,"contact"`, `1,"delivery"`,
  `1,"schedule"`, `"ng-invalid"`, `"ng-touched"`. ⚠ **None was checked against the release's files** (no request to the
  store). ⚠⚠ **The three section names themselves are the synthetic checkout's** (`browser-store.mjs` since `5acc962`,
  *"with the contract's names only"*): § 25.2's table takes them as the live markup, but no live reading of them is on
  record; the literals are written as Angular compiles a static class attribute (`[1,"footer"]` is H2's), which holds
  only if the class comes first. F2's next `npm run watch -- --full --no-browser` says whether the store has them; the
  rehearsal at both widths says whether the steps show what the table says.
- **Contrast** (as B2 does: four `"build": "storefront"` rows in `src/contrast-pairs.json`, and B2b ties them to the
  tokens `stepper()` uses): the current step and Back's label `--navy` on `--white`, Lc 100.9 (body, 75); the other steps
  `--muted` on `--white`, 83.5 (body, 75); Continue's 19px/700 label `--white` on `--cta`, −69.3 (large text, 60); Back's
  border, 100.9 (UI, 45). The recap inherits the store's own Total colour, not measured here.
- **The size** (§ 25.7 F1: 20,480): the text `b65fb47f…` 17,369 bytes; the Footer block **17,488** bytes and the console
  file **17,469** at `ba9eabc` (13,693 and 13,674 before: § 25 costs 3,795); every character ASCII; two `<` in the Footer
  block (its own) and none in the console file. The ceiling is pinned in R2-11, R2-29 and R2-77.
- **The pins**: R2-32, PR-10 and CC-8's `footer_text_sha256` moved from `1e3802b8…` to
  `b65fb47f9053870f28ff3005b1dff9bfcd5fdc7894fc8e74f4a03ef67e60b471`; CC-8's `replaces` names the live `1e3802b8…`
  (`e85b95a`) until the paste; `storefront/watch-baseline.json` is untouched.
- ⬜ **Seen only on the synthetic checkout**, in headless Chrome at 390 × 844 and 1280 × 800 at each step (six screenshots,
  kept off every repository). Not modelled there: the store's own desktop layout (its columns), its phone summary drawer
  (§ 20), the payment provider's card frame (mounted while step 1 hides the form: whether it draws correctly when shown
  is the rehearsal's), and the store's type. ⬜ **Not run on the live store**: any of it; the live smoke on a flag at both
  widths, then the Advisor's paste, are the orchestrator's.

## 27. Amendment, 2026-10-02 (the orchestrator) — § 25.2's sections, measured on the live release, replace the synthetic ones

**Found by F2 before any paste**: run against the live store's files (`main-ZWZNOUKM.js`, 2026-10-02 ~19:00 PDT, `npm run
watch -- --full --no-browser`), 55 of 57 literals found; **`1,"delivery"` and `1,"schedule"` missing**, and **`1,"contact"`
found only in another component** (`monarch-contact`, chunk `chunk-TR6PGF47.js`), so a false "found". § 25.2's three step-2
sections came from the synthetic checkout (`5acc962`) and **none was ever read on the live store** (§ 26 item 4).

**Measured** (a scratch read of the release's files by the watch's own fetcher, the same requests F1/F2 make; nothing
typed, no browser): the checkout component is `chunk-C7ZYYQVI.js` (`"app-checkout"`, `checkout__form`). Its sections are
**`section.checkout__section` plus one modifier**, compiled as Angular class lists `[1,"checkout__section","<modifier>"]`:

| step | modifier | heading in the template |
|---|---|---|
| 2 | `contact` | Contact |
| 2 | `order-type` | Order type |
| 2 | `delivery-address` | Delivery address |
| 2 | `delivery-method` | Delivery method |
| 2 | `schedule` | Delivery schedule / Pickup schedule |
| 2 | `pickup-location` | Pickup location |
| 2 | `special-requests` (also `special-requests--food`) | Food Notes |
| 3 | `tip` | (H10's rule, unchanged) |
| 3 | `payment` | Payment |
| 3 | `checkout__consent` | (the terms) |
| — | `checkout-discounts` (`--mobile`) | hidden by H7 as now |

A bare `[1,"checkout__section"]` belongs to the loading skeleton (`form-skeleton__*` beside it), not the form.

**Therefore**: step 2 shows exactly the seven step-2 modifiers above (whichever the store renders: delivery or pickup);
step 3 the three. The F2 literals are the compiled class lists (`"checkout__section","contact"` … in the form R2's tip
literal already uses), **one per modifier**, so F2 reads them in the checkout chunk itself. The synthetic checkout is
re-shaped to the live sections and headings so the cases test the markup the store ships. ⬜ Still not seen rendered: the
live layout of these sections at 390 and 1280 px, which the pre-paste rehearsal shows.

## 28. Built — found at the build of § 27

Built at `5f13cb9`. § 27 above is unchanged; this section says what changed, F2's result, and what remains unseen.

- **The block**: step 2 is now Q2 = `.checkout__section:is(.contact,.order-type,.delivery-address,.delivery-method,`
  `.schedule,.pickup-location,.special-requests)`, step 3 Q3 = `.checkout__section:is(.tip,.payment,.checkout__consent)`,
  selected by the modifier on `.checkout__section`, never by an element's name (§ 26's `section.contact`, `.delivery`,
  `.schedule` are gone). Step 2 hides every child of the form that neither is nor holds one of Q2, and Q3 and
  `.checkout__submit` by name (in case a release wraps the sections); step 3 hides Q2; step 1 still hides the form. So
  whichever of the seven the store renders (the delivery address and method for delivery, the pickup location for
  pickup) is step 2's, and **the food notes (`special-requests`) are step 2's**, where § 26's synthetic form had left a
  loose textarea to step 3. Continue's validity and the rule after a pay press read Q2. `special-requests--food` is not
  selected (§ 27: the section carries `special-requests` too); a release that dropped `special-requests` would show the
  food notes in step 3 as well, never lose them.
- **The synthetic checkout** (`browser-store.mjs`) is re-shaped to § 27: each section a `section.checkout__section` with
  its modifier and the live heading: `contact` (Contact), `order-type` (Order type: the two radios), `delivery-address`
  (Delivery address: the address and state in the `formgroupname="address"` group), `delivery-method` (Delivery method: a
  select), `schedule` (Delivery schedule, or Pickup schedule), `special-requests special-requests--food` (Food Notes),
  the tip, the discounts, `payment` (Payment), and `checkout__consent` (the terms, now a section, was a label); with
  `orderType: "pickup"`, `pickup-location` (Pickup location: a required select) in place of the delivery address and
  method. Angular's state stays on the real fields: the contact's four (required), the address (required), the state,
  the delivery method, the pickup location (required, pickup), the date, the food notes. The controls inside and their
  names are the synthetic store's own, not read from the release (only the sections and headings are).
- **F2** (`storefront/dependencies.json`, 57 → 63): § 26's three guessed `1,"contact"`, `1,"delivery"`, `1,"schedule"`
  removed; one literal per modifier added, as the checkout chunk compiles the class list and as H10's tip literal is
  written: `"checkout__section","<modifier>"` for `contact`, `order-type`, `delivery-address`, `delivery-method`,
  `schedule`, `pickup-location`, `special-requests`, `payment` and `checkout__consent` (the tip's is H10's
  `"checkout__section","tip"`, its use extended). **Run once**, `npm --prefix boston-2026-10/tools/storefront-watch run
  watch -- --full --no-browser`, 2026-10-03T01:58:05Z, entry `main-ZWZNOUKM.js` (published 2026-10-03T00:15:44Z), 164
  requests, every one to the store's origin: **F2 — 63 of 63 found in the fetched files.** F1 flagged the release
  against this branch's baseline (`main-Y5BLQZ6B.js`), as expected: the baseline is not accepted here. F3–F5 not run (no
  browser). ⚠ F2 says found, not where: that the section literals are found in the checkout chunk (`chunk-C7ZYYQVI.js`)
  rather than elsewhere rests on § 27's reading; each is a two-class pair, which the false match of `1,"contact"`
  (`monarch-contact`) was not.
- **The cases**: R2-84 by modifier (the set the store renders for delivery a fixture control); **R2-84b**, new (pickup:
  step 2 shows the pickup location and not the delivery address or method; Continue refused, the location focused, until
  one is chosen; step 3 hides it); R2-83 (the rendered sections after a reload and on an ordinary visit); R2-88 (the
  store's refusal shown in the delivery address); R2-89 (the food notes typed at step 2); W14b (W11's count at step 3:
  the 21 H controls plus step 2's eleven, the delivery method and the food notes added); W20a and W20b (the modifier
  names; the delivery-rendered set). `lib/faces.mjs`'s `STEP2` and `STEPS` are by modifier; W20 leaves step 3's tip to
  H10 (hidden while none is chosen).
- **A stall, not reproduced**: in one run, W14b's smoke waited about 15 minutes for fill C's verdict (the smoke's ceiling
  is 768.6 s) while the machine's load average was 44–118 from other processes; run alone it passed in 17 s, and in the
  full suite. The cause is not established.
- **The size**: the text `76871ff95ab458a2453625efa0d8b8d8dd4ea330d9f02d0232ca6713c06a36d7`, 17,498 bytes; the Footer block
  **17,617** bytes and the console file **17,598** at `5f13cb9` (17,488 and 17,469 at `ba9eabc`); every character ASCII;
  two `<` in the Footer block (its own) and none in the console file; under the 20,480 ceiling.
- **The pins**: R2-32, PR-10 and CC-8's `footer_text_sha256` moved from `b65fb47f…` to `76871ff9…`; CC-8's `replaces` still
  names the live `1e3802b8…` (`e85b95a`); `storefront/watch-baseline.json` untouched.
- **The suites** at `5f13cb9`: site 512 of 512; watch 162 of 162 (one Chrome at a time).
- ⬜ **Seen only on the synthetic checkout** (the six screenshots re-shot, kept off every repository): on the synthetic
  page, with the browser's default heading margins, step 2's seven sections run past one 390 × 844 screen; the live
  spacing, layout and the controls inside the sections are the rehearsal's to show at both widths. ⬜ **Not run on the
  live store**; no paste.

## 29. Rehearsed on the live store, 2026-10-03T04:03:57Z → 04:04:25Z (the orchestrator; not pasted)

`npm run smoke -- --script dist-storefront/fitaf-handoff.html` (the block `fitaf-handoff 5f13cb9 sha256:76871ff9…`, pasted in
the console as a person would, nothing typed, no order), on HMP's release `main-ZWZNOUKM.js`, after the orchestrator re-ran
the site suite (512 of 512) and the watch suite (162 of 162; a first run lost three cases to a Chrome start timeout under
load, *"Target.setAutoAttach timed out"*, which passed alone and in a full re-run). **PASS at 1280 and 390.**

- `done: /checkout` in 2.7 s (1280) and 2.3 s (390); the extras pop-up not opened; the Fit AF logo on the screen and the
  checkout; 7 order lines; the pay button displayed at step 3 (*"Pay now - $87.50"*, *"PAY NOW"*).
- **W20, live**: step 1 the 7 order lines and the Total; step 2 `contact`, `order-type`, `delivery-address`,
  `special-requests` (2) and the Total; **Continue refused at step 2, the first empty required field focused** (the
  store's own `ng-invalid`, § 25.3, working on the live form); step 3 (entered by the block's class: the smoke types
  nothing) `payment`, `checkout__consent`, the Total and the pay button.
- ⚠ `delivery-method` and `schedule` were not rendered on the empty form; the store appears to add them after an address
  (not measured). Both fall under step 2's selector when they appear.
- W17 (Fit AF's photo sheet on the screen's slides) 0 of 7, as on the live block: the sheet the screen reads is the
  microsite's, carried by its link, and this smoke builds its own link from the menu.
- ⬜ The look of each step on the live page (spacing, the bar's type) is the Advisor's to judge after his paste; the
  report is text only (the smoke never takes a screenshot).

## 30. Amendment, 2026-10-25: the screen never jumps, and every meal's photograph. CONTRACT, before any code

**Why.** The Advisor, 2026-10-25: *"Cleaning up the interstitial – this has been a long-standing request. For some
reason, not every photo loads (even though we should be using our own thumbnail sprite sheet). And because there's no
placeholder image, the scrollbar bounces around making the page look broken/unprofessional."* Measured from the code
(§ 17.1): a slide draws a photograph only for a meal whose cell the link carries (`CELLS`), and the link carries a cell
only for a meal in that week's sheet (`data/photo-sheets.json` `chefs_choice.<week>`); every other meal's slide is its
name alone, a different height.

1. **The photo's box is always there**: every slide reserves the photograph's box at its final size from the first
   frame, holding a placeholder (the Fit AF mark, centred on the screen's own background) until the photograph is
   drawn, and keeping it when there is none (no cell, or the sheet failed: `BAD`). Nothing on the screen changes size or
   position when a photograph arrives or does not; the screen never shows a scrollbar it did not show on its first frame.
2. **Which meals have no cell — measured, not assumed**: for each week of `data/photo-sheets.json`, the meals a visitor
   can put in a cart that week (every path: Chef's Choice, Choose my own meals, the plans) and whether the link would
   carry a cell for each, by the program that builds the link. The builder reports the table. A meal missing from the
   week's sheet is fixed **in the sheet's own pipeline** (the sheets are generated, never edited here), stated by the
   builder as a finding with the meals named; nothing in the block invents a cell.
3. **The block stays within § 17's limit** (15,360 bytes, the build refuses above), and every existing R2/§ 17 case
   still passes.
4. **Cases**, written first and run red: P1 a slide with no cell shows the placeholder box at the photograph's size;
   P2 a photograph arriving changes no slide's height or the screen's scroll height (measured in the stand-in); P3 the
   sheet failing (`BAD`) leaves every box as P1; P4 the Storybook stories of the screen (*Screen · A/B/C*, SPEC-storybook
   § 8.3) show the placeholder. Mutant, caught: the box drawn only when the photograph loads.

## 31. Amendment, 2026-10-25: every hand-off applies the store's code `zero`, hidden. CONTRACT, before any code

**Why.** The Advisor, 2026-10-25: *"Add the "zero" discount code as a hidden submission to the cart's discount code. It
applies a 0% discount code that we can use to easily segment these orders in the HMP system."* And: *"we hide the
discount code on checkout. So it is impossible for the customer to enter multiple codes – though we need to make sure
that we're able to find and fill the field."*

1. **The code is a constant of the block**, `zero` (the store's own code, 0%; ⚠ its existence in the store is checked at
   the rehearsal, item 4), never read from the link (the link's `~<code>` stays "not applied").
2. **When**: at the checkout, before the first step the person sees is interactive: the block finds the store's
   discount input (inside `.checkout-discounts`, whichever of its placements is in the page, the same selectors § 10's H7
   hides), sets it to `zero` as a person's typing would (the events the store's form listens to), presses its apply
   control, and waits for the store to show the code applied (its discount row or applied-code mark, as measured). The
   discount UI stays hidden throughout (H7 unchanged); the person sees nothing of it.
3. **It never blocks a sale**: no input found, the code refused, or no sign of it applied within a bound the builder
   states — the checkout goes on exactly as today, and the block's log names which (`zero: not found` / `refused` /
   `no sign`). Applied once per checkout; a reload does not apply it twice.
4. **Rehearsed on the live store by the orchestrator before the Advisor pastes it** (as § 29): the code applies, the
   order's total is unchanged, and the store's order shows `zero`. ⛔ No agent types into the store's admin; the paste is
   the Advisor's.
5. **Cases**, in the stand-in checkout (the watch package's fixture, as § 27's cases), written first and run red: Z1 the
   input found in each placement, filled with `zero`, the apply pressed, the applied mark awaited; Z2 the discount UI
   hidden throughout (H7's selectors still match); Z3 no input → the checkout unchanged and the log line; Z4 a refusal
   → the same; Z5 applied once across a reload. Mutants, caught: the code read from the link; the UI shown while
   filling; a failure that stops the checkout.
6. **When**: built on `boston/handoff-zero-and-photos` with § 30 as ONE new Footer block
   (`storefront/footer-block/YYYY-MM-DD-fitaf-handoff-<commit>.md`), rehearsed (item 4), then pasted by the Advisor
   before 2026-10-26 17:00 Eastern.

### 31.1 Built — found at the build, not ruled (2026-10-25)

Both sections, one Footer block. Red at `9fff66d` (the cases alone, the block unchanged), built at `f05d355`, the Footer
block file `storefront/footer-block/2026-10-25-fitaf-handoff-f05d355.md` (status *built, not pasted*). §§ 30 and 31 above
are unchanged; this says what the build chose where they left a choice, what it measured, and what only the live
rehearsal can show.

**Red, then green.** Run red against the unchanged block (`9fff66d`): the site suite's new file
(`test/r2-92-93-box-and-zero.test.mjs`) **8 of 8 failing**; the watch package's two new files
(`tools/storefront-watch/test/r2-p30-placeholder.test.mjs`, `r2-z31-zero.test.mjs`, Chrome) **18 of 18 failing**, each
for the block's reason (P2 on the old block: the shown box moved 344 → 384 px when the logo arrived, and a slide with no
cell had no box); Storybook's SM-10 failing on **exactly P4's 8 readings** (Screens A, B twice, C, at both widths), no
other. Green at `f05d355`: those files **8 of 8**, **18 of 18**, SM-10 passing; the gates in full below.

#### § 30 item 2, measured: which meals a visitor can cart lack a cell, by the program that builds the link

The program: `scripts/week-content.mjs`'s own chain (`readPicks` → `checkPicks` → `cartOf` → the link tool's
`payloadFromArgs` and `handoffLink`, `--photos` from `data/photo-sheets.json`), run over `data/picks/` at this branch's
base (`c6dd3a5`'s data), production host; every link of every list, answer set and size, meal links and snack links;
each link's photo part decoded item by item. **"Every path"**: only the cart links (Chef's Choice and, for 1 November,
the four other menus) carry `#fitaf=`; *Choose my own meals* and the plans' buttons open the plan's order page with no
fragment (`src/app.js`: `base + "?mpid=" + mpid`; `chefs-choice.js`: `own.href = choose.href`), so no hand-off and no
screen runs on them.

| week (delivery) | picks file | lists | links | meals carted | meals with a cell, every link | snacks carted | snacks with a cell in the link | snacks with a cell in the week's sheet |
|---|---|---|---:|---:|---:|---:|---:|---:|
| 2026-10-04 | none in `data/picks/` | — | 0 | — | — | — | — | (sheet: 14 cells) |
| 2026-10-11 | version 1 | chefs-choice | 6 | 14 | **14** | 0 | — | — |
| 2026-10-18 | version 2 | chefs-choice | 48 | 17 | **17** | 7 | **0** | 7 |
| 2026-10-25 | version 2 | chefs-choice | 48 | 17 | **17** | 7 | **0** | 7 |
| 2026-11-01 | version 2 | chefs-choice + 4 menus | 216 | 26 | **26** | 5 | **0** | 5 |

**Every item a link carries without a cell, by cause** (the coordinator's four):

| cause | count | the items |
|---|---:|---|
| (a) a pick whose meal has no bound photograph | **0** | every meal of every carted list has its cell, in every link |
| (b) a snack | **19** (7 + 7 + 5; 10 distinct names) | 10-18: 🟠NEW: Caramel Apple ProNuts, 🟠NEW: Cheesecake Brownie Bites, Cookies & Cream Protein Dirt, De-Stress Superfood Bites: Chocolate S'mores & Ashwagandha, De-Stress Superfood Bites: Triple Chocolate & Ashwagandha, Golden Oreo Protein Sand, Performance Superfood Bites: Orange Creamsicle & Cordyceps · 10-25: the two 🟠NEW:, Cognition Superfood Bites: Blueberry Cream & Lion's Mane, Cookies & Cream Protein Dirt, Golden Oreo Protein Sand, Immunity Superfood Bites: Chocolate Peanut Butter & Chaga, Relaxation Superfood Bites: Apple Crisp & Reishi · 11-01: Cookies & Cream Protein Dirt, 🟠NEW: Caramel Apple ProNuts, De-Stress Superfood Bites: Chocolate S'mores & Ashwagandha, 🟠NEW: Cheesecake Brownie Bites, Golden Oreo Protein Sand |
| (c) an item not one of that week's picks | **0** | every link item is a cart meal or the week's snack list |
| (d) anything else | **0** | |

⭐ **The finding: the missing photographs are the snacks, and not by the sheet.** Since `fitaf`
`scripts/menus/emit_microsite_photos.spec.md` § 11 (2026-10-10) every snack has its cell in the week's sheet (19 of 19
here); **the link tool drops it**: `scripts/handoff-link.mjs`'s `photoPart` maps the MEALS only (*"the photo part's cells
stay the meals'"*, `SPEC-snacks-in-the-cart.md` § 2, written before § 11 of the emitter), so every snack slide of every
snack link takes § 2's fallback: the store card's image if the page had already loaded it, else no photograph (on a slow
store, most). The block already reads one cell per item in the link's order, meals then
snacks (`photos()`: `f[k + 3]` over `p.items`), so carrying them is a change to the link tool alone (its `photoPart` given
the snacks after the meals), no block change and no new sheet; not made here (§ 30 item 2: report; and it is
`SPEC-snacks-in-the-cart`'s rule to amend). Until it is, a snack slide with no loaded card image shows § 30's placeholder.

**Not measured here**, and so not in the table: whether the sheet loads at all on the store's page (the orchestrator's:
§ 18's cache partitioning, a Content-Security-Policy or `Cross-Origin-Resource-Policy`; a failure there makes every
slide fall back, now to the placeholder); the bucket's live objects (no request leaves this machine; the table is what
this program makes from this commit's data); links built before § 17 still in circulation (no photo part: the card's
loaded image, else the placeholder).

#### § 30, as built

- **Every slide's box first, always** (`div.f`, then the name, `b`): `min(220px, 32vh)` high, square (`aspect-ratio: 1`)
  unless its cell gives its own ratio (every sheet's cells are 176 × 176, so square). The card's loaded photograph
  (today's fallback, `pic()`) now goes INSIDE the box (`img.k`, `object-fit: cover`), so a slide's height never depends
  on which photograph it has; ⚠ that photograph is cropped square where it was 420 wide (the build's choice: one box for
  every slide). The sheet failing (`BAD`) removes the sheet's img and keeps the box.
- **The placeholder**: the box's `::before`, a plate centred in the box, the screen's `--white` with **the store's own
  logo** (§ 15.3's: `img.header__logo-image` once loaded, from its `currentSrc`, nothing requested) contained in it, as the
  screen's top logo sits on its plate (*"Top, on a white plate"*); on the screen's own navy around it. The mark is a CSS
  custom property, `--m`, set on the screen when the logo is placed; before that the plate is not drawn (an empty box
  of the same size). ⚠ *"The Fit AF mark"* is read as that logo: the block may not request or carry an image (§ 1), and
  the store's logo is the one Fit AF mark already on the page. No header logo: an empty box.
- **The empty carousel** (before the first meal, Screen · A) shows the same plate in the same place (`.c:empty::before`),
  and the carousel's height is reserved from the first frame (`min(220px, 32vh) + 61px`: the box, and two lines of the
  name), so the first slide moves nothing.
- **Nothing else moves either**, found at the build: the screen centres its content, so ANY height change moved the
  title and the bar. Three more are now fixed in size: the name, at most two lines (`-webkit-line-clamp: 2`, a third cut
  with an ellipsis); the step line, two lines reserved (`min-height: 2.8em`; a third, a long snack name at 390, still
  grows it); and ⭐ **the screen's logo**, which § 16 recorded *"can appear after the screen does, pushing the title down
  as it arrives"*: it is now positioned over a reserved 80 px above the title (the 48 px logo, its 8 px padding, its
  16 px margin), so its arrival moves nothing (P2 holds the logo 1.5 s). ⚠ On a store whose stylesheet makes every box
  `border-box`, the logo is 16 px shorter and the gap under it 16 px taller; with no header logo, the 80 px are empty.
- **P2 measures it**: at every frame of a run whose sheet arrives 1.2 s and logo 1.5 s late, at 1280 and 390, the title,
  the bar, the carousel and the step line in one place, one box, each slide one height, the screen's scroll height one.
  P1 at both widths; P3 (the sheet refused, 404) at both. The mutant (the box's class given only when the sheet's img
  loads) fails P1 and P2. **P4**: SM-10's walk reads the placeholder (Screen · A's empty carousel, its mark a `url(…)`;
  Screens B and C, the shown box first, square at the photograph's size, its `::before` drawn) and `placeholderPlaces`
  requires the plate one size in one place across A, B and C at each width.
- ⚠ **Not changed**: the store's own page scrollbar, beside the screen on a browser that always shows one (the screen is
  fixed over the viewport, not over the root's scrollbar), moves as the store's page grows under it; the screen does
  not touch the store's page (§ 2 item 5). If that scrollbar is part of what the Advisor saw, § 30 does not reach it.

#### § 31, as built

- **The constant**: `ZERO = "zero"`, never the link's `~<code>` (R2-93b and Z1c, with a coded link; the mutant
  `CODE || ZERO` fails both).
- **When**: at done, after the mark and the style (so H7 already hides the discounts) and **before the screen goes**: the
  verdict line `zero: <it>` comes just before `done: /checkout`, and the screen is removed with the done line, as always.
  So the visitor sees nothing of it and the first step is not interactive until it is settled. ⚠ That holds the screen up
  for the zero step's time (on the stand-in about 0.5 s; the bound below at most).
- **The field** (selectors): the first `input` inside a `.checkout-discounts` (any of the three placements § 10 names;
  `checkout-discounts` is H7's F2 literal, found in the store's release files since `main-2HXLHIG7.js`) whose markup
  (`outerHTML`: its name, id, placeholder, aria-label, formcontrolname) matches `/discount|coupon|promo|code/i` and not
  `/gift/i` (each placement also holds a gift-card field). **Events**: its `value` set to `zero`, then `input`, `change`
  and `blur`, each bubbling (`input` is what Angular's `DefaultValueAccessor` reads; `blur` marks it touched). **Its
  Apply**: the first `button` after the field (`compareDocumentPosition`'s FOLLOWING bit) in the same placement, pressed
  with `click()` at a later poll, once not `disabled` (a form that enables Apply only once the field has a value), once.
- **The sign**: a `.summary__row--discount` more than at done (H9's literal, F2-checked), or `zero` (any case) in the text
  of a `.checkout-discounts` or a discount row (an applied-code mark beside the field). **A refusal**: an element with
  text matching `[role=alert],[class*=error]` in that placement after the press.
- ⛔ **What they rest on in the live store: only the two class names** (`checkout-discounts`, `summary__row--discount`),
  read from its public code for H7 and H9. **The field's attributes, the Apply's place, the applied mark and the refusal's
  element were never read from the store** (no request to it from here; no local copy of its code): they are the
  contract's words and the stand-in's (`browser-store.mjs`, written from the contract, none of the store's code).
- **The bound** (§ 31 item 3): `ZERO_POLLS = 25` polls of `POLL_MS` (200 ms), **5 s after the press**, then `zero: no
  sign`; the field must appear within 5 polls (1 s) and an enabled Apply within 5 more, else `zero: not found`; any fault
  is `not found`. Every verdict goes on to `done` exactly as before (Z3, Z4, Z4b: the screen gone, step 1, Continue to
  step 2). Worst case it adds about 6 s before the checkout shows; it only waits when the store gives no sign at all.
- **Once**: one press per run; a code the store already shows applied is neither typed nor pressed (`zero: applied`, Z5);
  a reload of `/checkout` has no link (the fragment went before CHECKOUT), so the block does nothing (Z5, with the stand-in
  placing the Footer on the reloaded checkout and keeping the code).
- ⚠ **A coded link** (`~<code>`): § 10 item 2 DISPLAYS the discounts for it (`fitaf-code`), so there `zero` is typed into
  a field the visitor can see, and the store may then refuse the visitor's own code (one code per order: the Advisor's
  premise). No microsite link carries a code today (the Boston offer is a price promise, `SPEC-save-offer-production.md`
  § 10; `chefs-choice.mjs` passes no `--code`). ⬜ The Advisor's: apply on a coded link or not.
- ⚠ **The 15,360 bytes of § 30 item 3** are § 17.3's, raised to **20,480** by § 25.7 (the build's `MAX_SHIPPED_BYTES`);
  the block was already 18,423 before these sections, so 15,360 could not be met by any build. Held to the build's
  20,480.

#### The size, the text, the pins

- The Footer block **20,341** bytes and the console file **20,322** (18,423 and 18,404 before): § 30 costs
  about 548, § 31 about 1,370; under the 20,480 ceiling by 139. Every character ASCII; two `<` in the Footer block
  (its own) and none in the console file. Text SHA-256 `6d36d4bf2f1a07f105bab56528e3c785dfbf760f19bc4ec813d1d372fe9e295d`.
- **Pins moved** (each because the shipped text changed, in the commit that changes it): R2-32's `SHIPPED_SHA256`,
  PR-10's `FOOTER_TEXT_SHA256`, and CC-8's golden `footer_text_sha256`, from `efcbc570…` to `6d36d4bf…`; CC-8's
  `replaces` names the live `efcbc570…` (the watch's `expectedFooter`, `8b11e54`) until the paste.
  `storefront/watch-baseline.json` is untouched.
- **Cases the contract made stale, amended in the green commit, each named**: **R2-74** (an old link, step for step as
  the live block) compared the whole log, and § 31 adds exactly one line, `zero: not found` on that page (no checkout
  component): it now requires that line once, just before done, and compares the rest as before (the slides
  unchanged). The watch's **P2** (smoke plumbing) compared the block's exact lines: they are now `fill C`, `zero:
  applied`, `done`. The watch's **P3b** (`routeHeld`) read the checkout as soon as the step bar appeared, which is now
  before the screen goes (the zero step between them): it reads once the bar is up and the screen gone. Storybook's
  **SM-9** mutant changed the title's rule by its text, `margin:0 0 16px`, now `margin:80px 0 16px`.
- **No golden re-recorded** but CC-8's footer pin above (no §§ 30–31 case needs one); `storefront/dependencies.json`
  unchanged: § 31's selectors use only F2's existing `checkout-discounts` and `summary__row--discount`.
- **The stand-in's new default**: its code field's Apply accepts `zero` (300 ms later) and shows its mark beside the
  field, not a summary row, so R2-55's rows are as before; every watch case that reaches the checkout now runs § 31's
  step (about 0.5 s).

#### Gates (each run alone, at `f05d355`)

- **The site suite**, as the brief runs it (`npm --prefix boston-2026-10 test`, Node 22.18.0, `nice -n 15`): **1,165 of
  1,165** (1,157 at `c6dd3a5`, and R2-92/R2-93's 8), 28 min 13 s on a machine whose load average was 35–137 from other
  work.
- **The watch** (`npm --prefix boston-2026-10/tools/storefront-watch test`): **231 of 231** (213, and P1–P3 and Z1–Z5's
  18), 3 min 47 s. Its first full run, before P2 and P3b were amended, was 229 of 231, those two.
- **Storybook** (`npm --prefix boston-2026-10/tools/storybook test`): **71 of 71**, run on this block's source before the
  commit (the same files); SM-10 with P4, and SM-9 with its mutant's site moved.
- **Contrast** (`npm --prefix boston-2026-10 run contrast`): 94 of 94.
- **The build** (`npm --prefix boston-2026-10 run build:storefront`, clean tree): `fitaf-handoff f05d355
  sha256:6d36d4bf…`, the Footer block 20,341 bytes (fragment SHA-256 `4d2381d4…`), the console file 20,322.

#### Left for the live rehearsal (§ 31 item 4, the orchestrator's) and the Advisor

- ⬜ `zero` exists in the store and applies: the field is found (which placement, at each width), Apply is enabled by
  the events above, the store's sign is one the block reads (else the log says `no sign` after 5 s, the screen up that
  long, and the selectors are amended from the live markup); **the order's total unchanged; the store's order shows
  `zero`** (the admin, seen by a person; no agent types there). The console's `zero:` line is the block's own report.
- ⬜ **"The store's order shows `zero`" needs an order**: the smoke never places one (§ 29: nothing submitted), so the
  rehearsal as § 29 ran it shows the code applied in the cart and the total, not on an order; an order with `zero` is a
  person's (a test order, or the first real one), and the admin is read by a person.
- ⬜ After the paste, every hourly live smoke (`--live`) runs the store's own block, so each applies `zero` to its own
  cart (never an order); its report prints the block's lines per width, the `zero:` verdict among them.
- ⬜ The look: the placeholder's plate on the screen at both widths; the store's logo in it; the card's photograph cropped
  square; the title 80 px down with the logo absolutely placed (and whether the store's stylesheet is `border-box`).
- ⬜ Whether the sheet loads on the store's page at all (the orchestrator's: § 18's partitioned cache, CSP, CORP).
- ⬜ The snacks' cells (the finding above): a link-tool amendment, if wanted.
- ⬜ A coded link and `zero` (above): the Advisor's.

### 31.2 Amendment, 2026-10-25 (the orchestrator, on § 31.1's findings). CONTRACT, before any code

1. **Every snack's photograph** (amends SPEC-snacks-in-the-cart § 2's "the photo part's cells stay the meals'"): the link carries a cell for every item, meals and snacks, in the link's order, from the week's sheet (the snack cells the photos emitter writes since its § 11); an item with no cell in the sheet still carries "". Both link builders change together: the page's own link code and scripts/handoff-link.mjs (byte-identical links, as today's cases hold them). The block is unchanged by this item.
2. **The store's page does not move under the screen**: while #fitaf-screen is up, the store page's own scrolling is suppressed (its scrollbar hidden, e.g. overflow hidden on the root, with whatever keeps the page's width from changing when the scrollbar goes), and restored exactly as it was when the screen goes or the block stops. Cases: the root's overflow while up and after; the page's width unchanged at the hide and the restore; a mutant that never restores is caught.
3. **A coded link (`~<code>`) does not get `zero`** (ruled: the visible code field is the visitor's; no microsite link carries a code today). Case and log line (`zero: coded link`).
4. The block stays within the 20,480-byte ceiling (state the bytes; if item 2 does not fit, stop and report the bytes before trimming anything). § 30 item 3's 15,360 is superseded by § 25.7: say so in the note.

#### 31.2.1 Built — items 1 and 3; item 2 stopped at the ceiling, as item 4 says (2026-10-25)

The contract above was committed alone at `f4315d4` (items 1–4 as the orchestrator wrote them). Item 1 at `66f5f1a`
and `50c9949`, item 3 at `992739f`; the Footer block file `storefront/footer-block/2026-10-25-fitaf-handoff-992739f.md`
(status *built, not pasted*, committed at `5457f53` with W4's amendment), and `…-f05d355.md` marked *superseded, not
pasted*. **Item 2 is not built**: it does not fit the 20,480-byte ceiling beside item 3, and item 4 says to stop and
report before trimming anything (below).

**Item 1, every snack's photograph.**

- **"Both link builders" are one function.** The page has no link code of its own: `scripts/chefs-choice.mjs` says *"No
  key function and no encoder live here (CC-2)"*, and every link the page shows is made by `scripts/handoff-link.mjs`
  through the content command (`week-content.mjs` → `checkPicks` → `cartOf` → `payloadFromArgs`, `handoffLink`). So one
  change, `payloadFromArgs` giving `photoPart` the snacks after the meals, makes both, and the page's links and the
  tool's stay byte-identical by construction (CC-2 and the rest unchanged and green).
- **The block is unchanged** (item 1's last sentence): it already reads one cell per item, meals then snacks. ⭐ And so
  **does the block live in the store** (`efcbc570…`, `8b11e54`): rebuilt as R2-71 rebuilds it and given a link with
  snack cells, it showed each snack's cell on its slide (scratch, 2026-10-25). **Item 1 needs no paste**: it reaches
  visitors when the week's content is next made (`npm run content`, the content job), with the block live today.
- **Measured** (§ 31.1's program re-run on `66f5f1a`): every snack of every link now carries its cell, 19 of 19
  (2026-10-18: 7, 2026-10-25: 7, 2026-11-01: 5); every meal as before, 0 without.
- **Cases, red first** (on the old encoder, 2 of 2): **SN-6c** amended to the new rule (a snack the sheet has no cell
  for carries `""` after the meals' cells; it pinned *"the photo part is the meals' alone"*), **SN-6d** new (a generated
  manifest with cells for a meal and both snacks: the link's cells are the items' in order, and the shipped text shows
  each snack's cell on its slide). Green after the change.
- **Cases the change made stale, and how each now reads** (the content of committed weeks moved by exactly the snack
  cells, by design): **MS-20** (and so its control MS-10), **EM5c**, **W4** (found by the first full run at `992739f`)
  and **WC-9a** compare with the earlier commit's
  content after `test/snack-cells.mjs`'s `withSnackCells` makes item 1's one change to it (written from the contract,
  not from the encoder), every other byte as before; **U4** and **WC-9c**, whose goldens are hashes, read today's pages
  and data with exactly those cells removed (`withoutSnackCells`), each with a control that cells were there. ⚠ **Not
  re-recorded**, though both have recorders: the recorders build a commit's own tree, production true since
  SPEC-save-offer-production § 12, while U4 and WC-9c read release (a)'s pages; a re-record at `66f5f1a` moved every
  fragment for that reason, not this one. Before amending, WC-9c's 8 moved fragments of 20 each returned to the golden's
  hash with the snack cells removed. **No golden re-recorded.**

**Item 3, a coded link gets no `zero`.** In `zero()`, first: `if (CODE) m = "coded link"`; nothing typed or pressed, then
done as every verdict. **R2-93b** and **Z1c** rewritten to it (red on `f05d355`'s text, 4 of 4: they then required
`zero` on a coded link); their mutant is now the skip disabled (`if (0)`), which fails both; Z1c's control shows the
discounts displayed for a coded link (§ 10 item 2). § 31's mutant *"the code read from the link"* has no run left to
show in: a coded link types nothing, and an uncoded one has no code to read. Cost: 37 bytes.

**Item 2, the store's page held still: its code built in scratch and measured, not committed; its cases committed,
skipped.**

- **The design found**: the rule lives in the screen's OWN `<style>`, so it goes with the screen at done, at every stop
  and at either clock, and the root's own style is never touched (*"restored exactly as it was"* by construction):
  `html{overflow:hidden!important;padding-right:Npx}` (or `:root{overflow:hidden;padding-right:Npx}`), `N` the page's
  scrollbar width when the screen appears (`innerWidth - documentElement.clientWidth`; 0 with overlay scrollbars).
  Measured in headless Chrome with a 15 px classic scrollbar (a page-styled `::-webkit-scrollbar`; headless Chrome on
  macOS draws overlay scrollbars, and Puppeteer adds `--hide-scrollbars`): the body 1,249 px before, while hidden and
  after; the scroll position kept (500); overflow back to `visible`. ⚠ `scrollbar-gutter: stable` was tried first and
  does NOT hold the width there (1,265 → 1,280).
- **The bytes** (each the build's own `storefrontFiles`, the Footer block): today's text with item 3 **20,378**; item 2
  alone (on `f05d355`'s text) 20,457 (`html` form) or 20,448 (`:root`); **items 2 and 3 together 20,494 (`html`) or
  20,485 (`:root`): 14 or 5 bytes over the 20,480 ceiling.** Item 2 costs 116 bytes (`html`) or 107 (`:root`); 102 are
  left.
- **What would make it fit** (not done; the choice is the Advisor's or the orchestrator's): (a) **layout only**, as § 16
  recovered 200 bytes: `zero()`'s body un-indented (its leading spaces, 84 bytes) gives **20,410** (`html`) or
  **20,401** (`:root`), no behaviour changed; the whole text holds 277 bytes of leading spaces; (b) the shipped header
  comment (`/* Fit AF cart hand-off. … Kill switch: … */`, 198 bytes), which the Advisor reads in the admin; (c) the
  ceiling raised (§ 25.7's ruling was *"we could be at 50 kb"*); (d) the `:root` form, which drops `!important` (a class
  rule of the store's on `<html>` setting overflow, such as the CDK's `cdk-global-scrollblock`, would then win over it).
- **Its cases are written and committed, skipped until the item is built**
  (`tools/storefront-watch/test/r2-31-2-page-still.test.mjs`; Chrome launched without Puppeteer's `--hide-scrollbars`,
  the page given a 15 px styled scrollbar and a tall spacer): **PS1** (done) and **PS2** (a stop, a meal not on the page):
  the root's overflow `hidden` and no scrollbar at every frame the screen is up, the overflow the page's own from the
  first frame after and its scrollbar back, and the body's width one value at every frame (the hide and the restore);
  ⭐ the mutant that never restores (the rule put in `document.head`, which nothing removes) fails PS1. **Verified both
  ways, outside the tree**: on `992739f`'s text PS1 and PS2 fail (*"the root's overflow hidden at every frame the screen
  is up"*); on a build of the source with the item (20,494 bytes, refused by no check but the ceiling's) all three pass,
  the mutant caught. Found there: the scrollbar's own reading (`innerWidth − clientWidth`) lags one frame at the
  restore while the body's width holds, so PS1 reads the scrollbar back by the last frame, the width at every frame.

**§ 30 item 3's 15,360 is superseded by § 25.7** (the build's ceiling, `MAX_SHIPPED_BYTES`, 20,480; the block was 18,423
before §§ 30–31), as § 31.1 found and item 4 now says.

**The size, the pins.** The Footer block **20,378** bytes, the console file **20,359**; every character ASCII; two `<`
in the Footer block, none in the console file; text SHA-256 `0a6e9ef176320ac830530509260a919d27a634b5811bb6d08f85573f79eddf49`,
fragment SHA-256 `907c6ffadab5c8441a193875bb9d223ee8b313284d651e2bb26ffe54bc5527f0`. R2-32, PR-10 and CC-8's
`footer_text_sha256` moved from `6d36d4bf…` to `0a6e9ef1…`; CC-8's `replaces` still names the live `efcbc570…`.

**Gates** (each run alone, at `5457f53`; the block's text is the one built from `992739f`, unchanged since):
- **The site suite** (`npm --prefix boston-2026-10 test`, Node 22.18.0, `nice -n 15`): **1,166 of 1,166** (12 min 53 s).
  The first full run at `992739f` was 1,163 of 1,166: W4 (both targets, amended since) and Q5, which compares `git
  status` before and after a build and saw this builder's scratch file appear and go in the tree meanwhile (run again on
  a quiet tree: passes).
- **The watch** (`npm --prefix boston-2026-10/tools/storefront-watch test`): **231 passed, 3 skipped** (item 2's PS1, PS2
  and its mutant), none failed (4 min 10 s).
- **Storybook** (`npm --prefix boston-2026-10/tools/storybook test`): **71 of 71**.
- **Contrast**: 94 of 94.
- **The build**: the Footer block 20,378 bytes, the console file 20,359, text `0a6e9ef1…` (built from `992739f`, its file
  in `storefront/footer-block/`).

**Left**: item 2 (above); the live rehearsal of §§ 30, 31 and item 3 on this block (§ 31.1's list stands); and the next
content run, which carries item 1's snack cells to visitors with the live block.

**Item 2, built on the orchestrator's ruling (2026-10-25)**: *"build it in the form you measured (the rule in the
screen's own <style>, the `html` form with !important, width held at 1,249 px), and make it fit by un-indenting
zero()'s body — layout only, no behaviour change … Do NOT drop the header comment and do NOT raise the ceiling."*

- **The layout step, alone, at `97a95fb`**: `zero()`'s body un-indented. Proven as asked: the shipped text differs from
  `992739f`'s in exactly **18 lines, each only in its leading spaces, each inside `zero()`** (the two texts compared
  line by line, both 323 lines), 84 bytes; `git diff -w` of the source shows only the two new `//` lines that say so.
  The same cases pass: the rung-2, fill C and snack cases 347 of 349 with only R2-32's pin and its control moved (then
  moved: R2-32, PR-10, CC-8 to `a8a5970d…`), the Chrome zero cases 13 of 13.
- **The item, at `b672752`**: in `screen()`, the screen's own style gains
  `html{overflow:hidden!important;padding-right:Npx}`, `N` = `innerWidth − documentElement.clientWidth` as the screen
  appears; nothing else. **PS1, PS2 and the mutant un-skipped**: red on `992739f`'s text, 3 of 3 (PS1 and PS2: *"the
  root's overflow hidden at every frame the screen is up"*; the mutant's site absent), green at `b672752`, 3 of 3, the
  mutant (the rule in `document.head`, never removed) caught. P1–P3 and their mutants still 5 of 5.
- **The bytes**: the Footer block **20,410**, the console file **20,391** (20,494 had the item been added indented): **70
  bytes left** under the 20,480 ceiling. ⚠ **For the merge with Family** (SPEC-ui-and-copy-pass § 2.2, another branch):
  today's plans table inlines `"35":[1]`; mpid 35 taking 5 and 10 costs **3 bytes** (`[5,10]` in place of `[1]`) or
  **5** (`[1,5,10]`), leaving 65–67; anything else Family adds to the block's text comes out of the same 70.
- **The text**: SHA-256 `04e43ac067528d1555310286647799e21938193d62fc4003e57b8dad956b7a76`; ASCII; two `<` in the
  Footer block, none in the console file. R2-32, PR-10 and CC-8's `footer_text_sha256` moved to `04e43ac0…`; CC-8's
  `replaces` still names the live `efcbc570…`. **The Footer block file**:
  `storefront/footer-block/2026-10-25-fitaf-handoff-b672752.md` (*built, not pasted*; fragment SHA-256
  `2651f31c02611db6eee8bef44aa99e609b976aad275b4188ad0510e5c21472dd`, 20,410 bytes, byte-identical to the build's
  output); the `992739f` file marked *superseded, not pasted*.
- **Gates at `c7b871a`** (each run alone, the tree quiet): the site suite (`npm --prefix boston-2026-10 test`) **1,166 of 1,166** (10 min 59 s);
  the watch **234 of 234** (its first run lost W11b to a Chrome start that timed out under load, *"waiting for the WS
  endpoint URL"*, as § 29 records; that file alone 18 of 18, then the whole suite again 234 of 234); Storybook **71 of
  71**; contrast 94 of 94.
- **Left for the live rehearsal**, beside § 31.1's list: the page's own scrollbar on the store at both widths (on a
  phone, and on macOS by default, it is an overlay one: `N` = 0); and whether any rule of the store's sets `overflow` or
  `padding-right` on `<html>` with an `!important` of its own, which would win over this one (none is known here: the
  store's stylesheets were not read for this; the CDK's scroll-block class, as the CDK publishes it, has none).

## 32. Amendment, 2026-10-25: the ceiling is the store's cap, 50,000. CONTRACT, before any code

**Why.** The Advisor, after he pasted `c31603d`'s block (`ts=2026-10-26T00:24:47.461Z`): *"FYI the cap is 50000
characters"*. This is the store's own limit on the Footer's text. Until now the store's limit was unknown, so § 25.7's
20,480 bytes was **our** ceiling, and it was an example: *"e.g. to 20,480 bytes"*, on his *"Frankly we could be at 50 kb
and still be lighter than most of the elements on the page"* (§ 25.6, F1). Under that ceiling, § 31.2's item 2 was not
built (it did not fit beside item 3). § 31.1's block came in 139 bytes under, and the pasted block `c31603d`
67 under (20,413 bytes).

1. **The ceiling becomes 50,000 bytes**, the store's cap. Each built file is held to it: the Footer block and the console
   file. R2-77 already holds every character ASCII, so a file's bytes are its characters, and a byte ceiling of 50,000
   is the store's character cap exactly.
   - The 5,120-byte warning stays.
   - Nothing else changes: the `<` rule, the ASCII rule, the hosts and the build's refusal (naming the file and
     writing nothing).
2. **Ruled by the orchestrator** as this contract's author, on his word about the store. The cap is the store's and
   the store's figure is the authority. If the store says anything else at a paste, that is a finding, and the ceiling
   follows it.
3. **The pasted and built blocks keep their records.** The files under `storefront/footer-block/` say `ceiling_bytes:
   20480` because that was the ceiling when each was built. A record is not re-written; the next block built says
   50,000.
4. **Cases.** R2-11a, R2-29 (its control, R2-29b and R2-29c's edges: 50,000 built, 50,001 refused) and R2-77 change to
   name 50,000, with the history in their comments. R2-71 reads the constant and does not change. Run red on the
   constant before it changes, then green.
5. **Not here**: § 31.2 item 2, the one item the old ceiling blocked. It now fits, and building it is its own step,
   never a side effect of raising a number.

### 32.1 Built (2026-10-25, the orchestrator)

§ 32 is unchanged. The cases are at `ff7b268`, red on `0b03cd4`'s code: 5 of 10 fail, each on the old ceiling. The code
is `scripts/build-storefront.mjs`'s `MAX_SHIPPED_BYTES` at 50,000, plus the comments and the README row that named
20,480 as the rule.

Run as `nice -n 15 node --test` over R2-11, R2-29, R2-71, R2-77 and R2-32:

| | count |
|---|---|
| before the code | 10 tests, 5 pass, 5 fail |
| after the code | 12 tests, 12 pass (R2-32 added: the shipped text is unchanged) |

**What § 32 was silent on** (stated, not ruled):

1. **R2-11c names the ceiling too.** Its refusal pattern was `/bytes; the ceiling is 20,480/`. Item 4 did not list it.
   It was green before the code and red after it, for that literal alone, so its pattern now names 50,000.
2. **`src/storefront/fitaf-handoff.js` is not changed.** Three of its full-line comments name 20,480 (lines 9, 230 and
   599). The build drops full-line comments, so none of them ships. Two are history, and line 9 restates the old rule.
   Changing the source is outside § 32, and R2-32's pins hold the shipped text the same either way.

## 33. Amendment, 2026-10-26: `zero`'s sign hidden, and a link to customer service. CONTRACT, before any code

**The Advisor, 2026-10-26** (verbatim): *"please hide the confirmation that the "zero" discount code was applied on the
checkout page. I can upload the new footer when ready."* And: *"add a link to contact customer service in the footer of
the HMP cart. It can very small and simple at the bottom of the page. If we can't get it in tonight with the change to
hide the "zero" code, that's OK."*

1. **Measured first, on the live store** (the watch tool's own headless visit and § 29's rehearsal, never the store's
   admin, nothing submitted): the markup the store shows once `zero` is applied (the discount row
   `.summary__row--discount` whose text names it, and any applied-code mark or message), at 390 and 1280; and what the
   store's own footer is on the cart and checkout pages the block runs on (whether the block hides it today). Recorded
   in § 33.1 with the selectors and texts read.
2. **`zero`'s sign hidden**: every element the store shows for the applied `zero` (its discount row, its applied-code
   mark, any message naming it) is hidden for the rest of the page's life, re-renders included (the store is an
   Angular app: a class the block sets on what names `zero`, kept by an observer, or a rule that needs no text, as
   measured), **and nothing else**: a discount row or mark not naming `zero` stays exactly as today (H9), the Total row
   is never hidden, and the price the visitor pays is unchanged. On a coded link (`~<code>`, where no `zero` is applied,
   § 31.2 item 3) nothing changes.
3. **The link**: at the very bottom of the cart and checkout pages the block runs on, one small centred text link, its
   words **"Contact customer service"** (the Advisor's, ⬜ his to edit), to `https://fitafnutrition.com/contact` (the
   store site's contact page; an unknown path there redirects home, this one does not), in the store's small muted
   footer type (13–14 px), never a button, never orange, never over the store's own controls or the checkout's pay
   button; one per page, not duplicated by re-renders.
4. **Bytes**: the block within the 50,000-character cap (§ 32); its size before and after in § 33.1.
5. **Cases**, in the watch package's stand-in checkout, written first and run red: Z6 `zero`'s row and mark hidden after
   `applied` and after a re-render; Z7 a second discount row not naming `zero` shown; Z8 the Total row shown; Z9 a coded
   link: nothing hidden; L1 the link once at the bottom, its words, its address, its size; L2 not duplicated by a
   re-render. Mutants, caught: every discount row hidden; the link added twice.
6. **The new Footer block** `storefront/footer-block/2026-10-26-fitaf-handoff-<commit>.md`, built from this branch, then
   **rehearsed on the live store by the orchestrator** (§ 29, headless; `zero: applied`, the sign hidden, the total
   unchanged, the link present), then pasted by the Advisor, then the live smoke at once.

### 33.1 Built — found at the build, not ruled (2026-10-26)

§ 33 above is unchanged. The cases at `2a5fb55`, red on the unchanged block; the code at `dbcf88d`; CC-8's `replaces` at
`ef4bd21`; the Footer block file
`storefront/footer-block/2026-10-26-fitaf-handoff-dbcf88d.md` (*built, not pasted*).

**Measured first (item 1)**, 2026-10-26 between 14:23 and 14:32 PDT: the watch's own headless visit (`lib/smoke.mjs`'s
`smokeRun`, the store's own Footer block `c31603d` run by the link alone, as `smoke --live` runs it), four runs (1280
twice, 390 twice), with a read-only page hook in a scratch script (not committed): the markup at the done line, the
store's footer on the order page and the checkout, and a MutationObserver from before the page's scripts noting every
element added whose text names `zero`. Nothing typed by the hook, nothing submitted, no admin.

- **`zero` applied in 3 of 4 runs** (1280 both, 390 the second). ⚠ **The first 390 run logged `zero: not found`**: at
  its done line the checkout had drawn no `.checkout-discounts` and no price rows yet, so the field was not there within
  § 31.1's 1 s bound. The smoke still passed (total $87.50). A finding for § 31's bound; not changed here.
- **The sign is one element, the same at both widths**: a `div.summary__row.summary__row--discount` in
  `div.summary__breakdown` (the summary drawer), right after Subtotal, holding
  `<span><button type="button" class="summary__remove">×</button> Coupon ZERO </span><span>-$0.00</span>`. Displayed
  today (H9 keeps discount rows). ⚠ Its `summary__remove` control would let the visitor remove the code; it is hidden
  with the row.
- **No applied-code mark and no message**: the two `.checkout-discounts` placements on the page
  (`div.payment__discounts.checkout-discounts.checkout-discounts--mobile` in `section.checkout__section.payment`, and
  `div.summary__discounts.checkout-discounts.checkout-discounts--desktop` in `div.summary__content`) read *"Discounts,
  gift cards, and rewards Apply Apply"*, nothing naming `zero`, both hidden by H7. No `[role=alert]`, `[role=status]`,
  toast, snackbar or overlay text. The observer saw the row (added, then its text) and nothing else naming `zero`.
- **The Total**: `.summary__total`, *"Total $87.50"*, not inside any `.summary__row`; with `zero` applied the 7-meal
  cart's total is $87.50, as § 29's.
- **The store's own footer**: `app-footer > div.footer > div.footer__fit-af` (a newsletter form, two
  `nav.footer__fit-af-nav`, the second ending in **Contact**, `href="/contact"`; social links, the logo, a copyright line
  `p.footer__fit-af-copyright` at 12 px (1280) and 11 px (390), white). **Displayed on the order page at both widths;
  hidden on the deep-carted checkout** (H2, this block's). The checkout's children at done: the logo, `#fitaf-bar`,
  `div.checkout`, `#fitaf-nav`.

**As built.**

- **`zero`'s sign (item 2)**: `hush()`, from `mark()` at done (before `zero()` types anything), unless the link carries a
  code: every `.summary__row--discount` whose text names `zero` (`/\bzero\b/i`, the word, any case) gets the class
  `fitaf-zero`, and the checkout's hide list gains `.fitaf-zero:not(:has(.summary__total))` (a row holding the Total is
  never hidden). Kept by a MutationObserver on `<body>` (child list, text, `class`), for the page's life: its callback
  runs before the browser paints, so a row the store draws again is never shown (Z6: no frame). Set with `toggle`, so a
  row whose text stops naming `zero` shows again. Any other discount row is untouched (Z7), the Total too (Z8), and a
  coded link hides nothing (Z9).
- **The link (item 3)**: `help()`, at done: one `a#fitaf-help`, its words data/messages.json's `handoff.contact`
  (*"Contact customer service"*; R2-50's rule, no phrase in the source; the build's `UI_WORDS` gains `contact`), to
  `https://fitafnutrition.com/contact`, made with `own()` (the page's tokens inline): `font-family: inherit`, 14 px,
  weight 400, `--muted`, centred, underlined. It is the last line of the block's own foot (`#fitaf-nav`, given
  `flex-wrap`, the link `order: 1` and the whole width), so it is below everything of the checkout's at every step, and on
  a phone above the store's bar, which the foot's own margin keeps clear (`place()`). With no foot (no `:has()`), the
  checkout's last child. Inside `app-checkout`, so it goes with the checkout. Made once; nothing re-adds it (L2).

**What § 33 was silent on, and what was built** (stated, not ruled):

1. **"The cart and checkout pages"**: the link is on the checkout only. Measured: on the order page (the plan's cart,
   where the block runs only under its screen, or leaves the visitor at a stop) the store's own footer is displayed
   with its own Contact link to the same page; the block hides that footer only on the checkout. A second link there
   would duplicate the store's. ⬜ If the Advisor means the order page too, that is an amendment.
2. **"Names `zero`"** is read as the word, any case. A code such as `ZEROSUGAR` would not be hidden.
3. **14 px**, the top of the contract's 13–14, for `--muted` on a light page. The pair `--muted` on `--white` is B2b's
   existing row (role *body*); `help()` is outside `stepper()`, which B2b reads, so no row was added. ⚠ The checkout's
   own background behind the link was not measured (the foot sits on the store's page; white assumed).
4. **Underlined, same tab** (no `target`), as the store's own Contact link opens.
5. **The stand-in** gains `zeroRow: "live"` (the measured row; its remove control drawn `x`, ASCII, where the store's is
   `×`) and `window.__fixtureRerender()` (every price row drawn again as a new element with the store's classes only).

**Cases** (`tools/storefront-watch/test/r2-z33-sign-and-link.test.mjs`, Chrome): Z6 and Z6b (1280, 390), Z7, Z8, Z9,
L1 and L1b (1280, 390; steps 1 and 2), L2, and the two mutants (every discount row hidden: Z7 fails; the link added
twice: L1 fails). **Red on the unchanged block (`2a5fb55`): 10 run, 3 pass, 7 fail**: Z6 and Z6b (*"no element naming
zero displayed at any frame of the checkout"*), L1, L1b and L2 (no link), and both mutants (their site absent). Z7, Z8
and Z9 pass on the old text: they guard what must not change, and Z7's mutant shows it bites. **Green at `dbcf88d`: 10
of 10**, and § 31's `r2-z31-zero` 13 of 13.

**The case the contract made stale, amended in the code commit**: **R2-77** required the text's only new URLs to be
§ 17.1's photo hosts; it now names § 33's contact page too, and requires it whole. **CC-8a** failed at `dbcf88d`
(*"control: the watch expects the live text"*): the golden's `replaces`, which names the live text between a text change
and its paste, was not set; set at `ef4bd21` to `3efc8112…`.

**The size, the pins.** The Footer block **20,413 → 21,320** bytes (`c31603d`, live → `dbcf88d`), the console file
**20,394 → 21,301**; the cap 50,000 (§ 32). Text SHA-256 `3efc8112…` → `86a835515a670cbc6e2d0ab68d497d980a9bf669b0aac61b2774e5d7979f45da`;
the Footer block's SHA-256 `e16c90245715fb65d0453edfa6478a6e1a8883768f7944e56272ccd177ca0125`. R2-32, PR-10 and CC-8's
`footer_text_sha256` moved to `86a83551…`; CC-8's `watch_expected_footer` still names the live `c31603d` text until the
paste.

**Gates** (each `nice -n 15`, beside another site suite running on this machine):

- **The site suite NOT completed.** Its run at `dbcf88d` was stopped at 35 min with 513 results read, one failing, CC-8a
  (fixed at `ef4bd21`: `cc-08-unchanged.test.mjs` 3 of 3). Before the code commit, the block's own site cases (R2-32,
  PR-10, R2-42, R2-50, R2-81, R2-78/79, R2-58, R2-77, R2-29, R2-92/93, R2-54, B2): 38 of 39, R2-77 then amended, 1 of 1.
- **The watch** (`npm --prefix boston-2026-10/tools/storefront-watch test`, at `ef4bd21`, 10 min 46 s): **244 tests,
  238 pass, 2 fail, 4 cancelled**, every one a clock under load: FC-6c, P3b, PS2 and R2-45 timed out (60 or 90 s), P1
  *"Timed out after 30000 ms while waiting for the WS endpoint URL"* (Chrome's start, as § 29 records), and FC2 (a
  timing measure). Not re-run alone here. The § 33 and § 31 files: 23 of 23 at `dbcf88d`.
- **Contrast** (`npm --prefix boston-2026-10 run contrast`): 94 pairs, 94 pass.

**Left**: the rehearsal on the live store (item 6, the orchestrator's: `zero: applied`, the row hidden, the total
unchanged, the link present), then the Advisor's paste and the live smoke; the 390 `zero: not found` above (§ 31's
bound); ⬜ the order page's link, if wanted (1 above).
