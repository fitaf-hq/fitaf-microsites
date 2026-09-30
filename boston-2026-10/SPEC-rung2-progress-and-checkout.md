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
