# boston-2026-10 — rung 2's two faces: a progress screen while the cart fills, and a checkout with only the order and the payment. CONTRACT

**Written 2026-09-29, before any code**, on the Advisor's design of that day. **Status: DRAFT.** § 7 lists his open
choices, each with the default the build takes unless he rules otherwise. It extends the hand-off
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
2. **What**: a title; a progress bar; a step line; and a line that changes every 4 seconds. **Progress is fill B's
   own**: presses made of (the plan's count + 1), the last step being the store's CHECKOUT. As each meal is pressed,
   the step line names it as its card shows it (*"Added: Birria de Res Bowl"*). With `prefers-reduced-motion`, nothing
   moves and the changing line stays on its first.
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

   **Inside the checkout component (`app-checkout`), only H3 and H4 are hidden.** The order recap
   (`.checkout__summary`), the form (`.checkout__form`), the pay button, every contact, delivery, schedule, tip,
   discount and payment field, and the subscription switch all stay.
4. ⭐ **The payment is untouched, and it is measured**: the displayed controls inside `app-checkout` (`input`, `select`,
   `textarea`, `button`, `iframe` (the card field is the payment provider's frame), `a[href]`, `[role=switch]`,
   `[role=radio]`) are **the same set with the style as without it, except exactly H3 and H4**.

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
| R2-45 | the payment check (§ 3 item 4) on the synthetic checkout | equal, except H3 and H4 |
| R2-46 | ⭐ mutant: a hide rule that also matches a field of `.checkout__form` | R2-45 fails |
| R2-47 | the checkout component gone from the page (the visitor navigated away in the app) | nothing hidden |
| R2-48 | `prefers-reduced-motion` | no animation; the changing line never changes |
| R2-49 | fill B never reaches a verdict (a planted hang) | the screen gone at 90 s |
| R2-50 | the words and colours | from `data/messages.json` and the page's tokens: change a phrase and the built block changes; no phrase in the source |

**Live, in the watch's smoke** (`SPEC-storefront-watch.md` § 4: on each flag, and before any build is pasted), added to
F5's pass:

| | check | pass |
|---|---|---|
| W10 | the screen during the run | seen after the first press and gone at `done` |
| W11 | ⭐ § 3 item 4 on the live `/checkout`: the displayed controls inside `app-checkout` with `style#fitaf-deep` enabled, then disabled | equal, except H3 and H4; the pay button displayed in both |
| W12 | each of H1–H5 on the live checkout | found (a missing one fails open, showing; it is reported) |

`storefront/dependencies.json` gains the hide list's names, so F2 flags a release that renames one. **Before the paste**,
the Advisor runs the built console file in his own browser at both widths, as in the one-browser run, and looks.

## 6. The size

Both add to the Footer block: an estimated 2 KB (the screen's markup, style and words, and the checkout's style), so
**about 7 KB**: over the 5 KB target and under the 10 KB ceiling (the Advisor, 2026-09-29: *"We can go up to 10k for
the footer. 5k is a good target, but it's OK if we're above it slightly."*). § 7, choice 4.

## 7. The Advisor's choices (the default in bold is what the build takes unless he rules otherwise)

1. **The words**: **a title and four to six short lines in `data/messages.json`, drafted from the page's own phrases,
   for him to rewrite**; no claim about the food that the Owner has not made. **Each meal named as it is added: yes.**
2. **H5, the store's pop-ups on this checkout: hide.**
3. **The subscription switch** (*"Switch to subscription"*, which sends a guest to sign in): **keep**. It is the
   Owner's offer, and hiding it changes what he sells, not only what distracts.
4. **About 7 KB: accept** (under the ceiling).
