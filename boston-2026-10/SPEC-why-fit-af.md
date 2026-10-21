# SPEC-why-fit-af.md — "Why Fit AF?" on the plan page

**Why.** The Advisor, 2026-10-21, releasing the plan page's flip with `/why/` to production before showing the Owner:
*"Flip and /why/ and a button to open it as a modal/accordion somewhere on the page (we can refine it later)"*, and
*"If we want to do this as 2 pushes (whatever we have now plus the "why" button/UI), that totally works"*. The first
push is `6e0f6bd` (the flip, `SPEC-meal-selection.md` § 12, merged with `/why/`, `9311235`). This is the second.

## 1. The page, as it stands (`9311235`, not changed here)

`/why/` is one static file, `src/why/index.html`, which the build copies beside the plan page (`build.mjs`, the
`{ dir: "why" }` entry): "Why Fit AF?" draft 2's words, for the Advisor's review with the Owner, the template's fonts and
colours, no script. The Worker serves it as it serves the page's other static files.

## 2. The button and its dialog. CONTRACT, before any code

1. **The button**: in the page's footer, beside *See all plans* and in its style (`.all-link`, `js-only`), a button
   *Why Fit AF?* (`id="why-link"`, `aria-haspopup="dialog"`, `aria-controls="why"`).
2. **The dialog**: a `<dialog class="all why" id="why" aria-label="Why Fit AF?">` built as the plans dialog is (`#all`:
   its box, its close button at the head, `aria-label="Close"`), holding one `<iframe class="why-frame">` whose `src` is
   the `/why/` page by the page's own asset prefix (so the dev and production builds each frame their own), `title="Why
   Fit AF?"`, `loading="lazy"`, filling the box (a height that fits the viewport; the page scrolls inside it).
3. **Opening and closing** as the plans dialog's: the button opens it modally; the close button, Escape and a click on
   the backdrop close it; focus returns to the button. The same code path as `#all` where it can be shared.
4. **Without script**: no button and no dialog content shown; the footer carries a plain link *Why Fit AF?* to `/why/`
   instead (a `<noscript>` link, or the dialog kept out of the page's existing `<noscript>` rule that shows `.all`).
5. **Unchanged**: the Worker, `wrangler.jsonc`, the week content (`npm run content` byte-identical for the current
   weeks, both environments), `/why/` itself, every other part of the page, the analytics beacon (no new event; the
   button may send none).

## 3. Cases (written first and run red)

**W1** the built page (production and `--env dev`) carries the button and the dialog, the iframe's `src` resolving to
the built `/why/` file; **W2** in Chrome, the button opens the dialog modally with the iframe loaded at `/why/`, and the
close button, Escape and a backdrop click each close it (the plans dialog's own case is the model); **W3** without
script, the footer's link to `/why/` and no visible dialog; **W4** `npm run content` byte-identical to `6e0f6bd`'s for
the weeks of 2026-10-25 and 2026-11-01 (prod and dev). **Goldens**: the page's goldens change, on purpose, once: each
re-recorded by its own recorder, and **every changed line listed** in this file's § 4 (as `235ae87` did for § 12 of
`SPEC-meal-selection.md`); no other golden moves. **Mutant**: the button wired to nothing (its listener removed) fails
W2; its control passes. The site suite, contrast, Storybook and the storefront watch: green, or each failure shown to be
the dev line's own by a control run on `6e0f6bd`.

## 4. Built (to be filled by the build)

## 5. Release

A dev pin, then the production pin (`fitaf-infra` `microsites.lock`), each by pull request through develop to main, on
the Advisor's go (given 2026-10-21 for both pushes).
