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

Built on `boston/why-button` from `3d1867c` (this contract, on `6e0f6bd`), in four commits: `92a778c` (the cases, red),
`f02807e` (§ 2), `2026fce` (S29's proxy, below), and this section's (the goldens, re-recorded once, and § 4). **To be
re-gated by the orchestrator.** §§ 1–3 and 5 are unchanged.

**The cases, and what they did before the code** (`node --test <file>`, alone, on `92a778c`):

| case | file | before | after (`f02807e` and this commit) |
|---|---|---|---|
| W1: the footer's button beside *See all plans* (`.all-link js-only`, `#why-link`, its two `aria-` attributes), the dialog (`dialog.all.why#why`, its box, `#why-close` at its head, one `iframe.why-frame`, its title, `loading="lazy"`), the frame's `src` resolving to the built `/why/` page; production's page and every development page (`/`, `/<event-id>/`) | `test/w1-why-button.test.mjs` | 0 of 2 (no `#why-link`) | 2 of 2 |
| W2: in Chrome, the button opens the dialog modally, focus in, the frame loaded at `/why/` (its title the source's), inside the viewport and at least 3/4 of its height, the page scrolling inside it; Esc, the close button and the backdrop each close it, focus back on the button; production at 390 (`#lean-7`) and 1280 (`#family`), development `/demo/` at 390 | `tools/storybook/test/w-why-chrome.test.mjs` | 0 of 3 (no button to press) | 3 of 3 |
| W3: in Chrome with JavaScript off: neither the button nor the dialog nor its frame shown; the footer's one link, the button's label, to `/why/`, which opens it; the plans dialog still shown (control); the same three pages | the same | 0 of 3 | 3 of 3 |
| W2's mutant: a copy of the production build without the one script line naming `#why-link` (the button wired to nothing) fails W2 (*the button did not open the dialog*); the copy as built passes (its control) | the same | 0 of 1 (no such line) | 1 of 1 |
| W4: `npm run content` at this tree byte-identical to `6e0f6bd`'s own tree (`git archive`), 2026-10-25 and 2026-11-01, prod and `--env dev`: the files, the report, the message, the exit | `test/w4-content-unchanged.test.mjs` | 5 of 5 (an invariance case: nothing had changed) | 5 of 5 |

**Where § 2 was silent, or another contract's case stood in its way, and what was done** (found at the build, not ruled)

1. **T5 forbade any `<iframe>`**, and A1 and S18 with it: the cases' own pattern (`/<iframe\b/`), beyond SPEC.md § 4's
   words (no `<script src>`, no stylesheet to another host, no `fetch(`). Amended, not removed, as SPEC-analytics § 4
   amended T5 for one `sendBeacon`: exactly one `<iframe>`, the /why/ frame, its `src` the page's asset prefix +
   `why/` (`test/helpers.mjs` `assertOneWhyFrame`); `loadedUrls` now reads `<iframe src>`, so T5's, S18's and A1's
   same-origin checks cover it.
2. **S29** (SPEC-rung4-save-offer § 2b item 1, no dialog for Flow 1) read *"the page's one dialog is `#all`"* as its
   proxy; the page's dialogs are now `#all` and `#why`, neither Flow 1's (`test/save-end-fixture.mjs`, `2026fce`, found
   by the whole suite on `f02807e`: S29 and its mutant failing there).
3. **T2 and PR-8 counted every `<a href>` as an order link** (*"exactly 7 hrefs"*). The no-script link is the page's
   one other link: asserted there once (`whyHref()`) and set apart; the seven order links are checked as before.
4. **B1 failed on `6e0f6bd`** (the /why/ merge copies `why/index.html`, which nothing on the page loaded). The page now
   loads it in the frame: `loadedUrls` reads the frame, and B1 takes a directory's URL as its `index.html`.
5. **S20 failed on `6e0f6bd` too**, for the same file: the /why/ merge's `why/index.html` was never recorded. This
   section's re-record adds it (its SHA-256 the committed source's); it did not move here.
6. **Esc with focus inside the frame** (after a press or a scroll in it) reaches the frame's document, not the
   dialog's, and Chrome leaves the dialog open (measured). `src/app.js` listens on the frame's document on its `load`
   (same origin; nothing if it were not) and closes the dialog on Esc. W2 checks it, and checks the frame is not
   requested before the button is pressed (`loading="lazy"` measured, not assumed); both added to W2 at the build.
7. **The shared code path** (§ 2 item 3): the plans dialog's four listeners are one function, `modal(dialog, button,
   close)`, called for `#all` and `#why`; the plans dialog's behaviour is unchanged (PR-8's Chrome case).
8. **Both tabs.** *See all plans* is hidden on the Family tab (the grid is the individual plans'); the new button is
   not (the page is about the company), so it stands alone, centred, on Family. The dialog is in the footer, outside
   the tab panels (the plans dialog is inside the individual panel), so it opens from either tab.
9. **Beside**: 24 px between the two buttons (`.all-link + .all-link`), none while *See all plans* is hidden.
10. **Without script** (§ 2 item 4's two parentheses read as both needed): the link is an `<a class="all-link">` in a
   `<noscript>` after the button, in its style; and the no-script rule that shows `.all` is `.all:not([open]):not(.why)`.
11. **The frame's `id="why-frame"`** (not in § 2): the page cases' stand-in DOM (`test/page-sim.mjs`, S5, S17–S19)
    finds elements by id alone, and `app.js` reaches the frame by it.
12. **The analytics** (§ 2 item 5): unchanged; the button sends nothing (the beacon's click listener reads
    `[data-goal],[data-q],[href],#all-link`, and `#why-link` is none of them).
13. **W4's second week**: there is no `data/picks/2026-11-01.json` at either tree, so `npm run content` refuses that
    week at both (*no picks file*), the same message, nothing written; W4 compares that refusal. ⚠ W4 pins `6e0f6bd`'s
    inputs: the week's picks file, when it is committed, turns its 2026-11-01 half red by design.
14. ⬜ **The /why/ page's one link** (its button back to `/`), pressed inside the dialog, opens the plan page inside
    the frame: the page nested in its own dialog. /why/ is unchanged by § 2 item 5, so nothing was changed for it; for
    the Advisor: the dialog closing on it, a `target="_top"` on the /why/ page, or as it is.
15. ⬜ **Storybook's development stories** serve the development build's `fonts/` and `assets/` at the root
    (`tools/storybook/microsite/layout.js` `ROOT_STATIC`), not `why/`: in Storybook the development page's frame
    (`/why/`) is a 404, the production page's (`why/`, beside it) loads. One word, not added here (outside §§ 2–3).

**What did not change, shown**

- `npm run content` for 2026-10-25 and 2026-11-01, prod and `--env dev` (W4); U4's six contents, byte-identical.
- Every built file but the pages byte-identical (`diff -rq`, both builds, against `92a778c`'s): fonts, logo, photo
  sheets, QR codes, `why/index.html`.
- The visible page at WC-9's 20 fragments (production's Worker, the committed week): 0 byte-identical (the footer is on
  every one), 20 byte-identical to `6e0f6bd`'s once the three additions (the button, the `<noscript>` link, the dialog)
  are removed, 0 different otherwise.
- The Worker (CC-8b: every file its entry reaches) and the Footer block's text (CC-8a): CC-8's golden unchanged.

**The goldens, re-recorded once (this commit)**

| golden | moved |
|---|---|
| S20 `test/s20-production-golden.json` | `index.html`, `03e39dbc…` → `f1f0e04f…`; `why/index.html` ADDED, `43afc5ed…` (the /why/ merge's file, which `6e0f6bd` already wrote unrecorded); every other file byte-identical |
| WC-8's `TODAY_NO_PICKS_SHA256` | `bb17e256…` → `1c68a68b…` |
| U4 `test/u-04-golden.json` (`node test/u-04-record.mjs --commit f02807e`) | the six served pages (each +1,750 bytes production, +1,752 development) and their visible page at all seven fragments; all six contents byte-identical |
| WC-9 `test/wc-09-golden.json` (`node test/wc-09-record.mjs --visible-at f02807e`) | `visible` at all 20 fragments (`""` and `#family` too: the footer is on every one); `picks_data`, `page_sha256` and the sheet as before, so WC-9a is unchanged |
| CC-8 `test/cc-08-unchanged-golden.json` | not moved |

**Every changed line.** Production's `index.html` (no week, as every build writes it): 9 lines removed and 34 added in
four places; each development page (`/`, `demo/`, `boston/`, `seminar/`) by the same lines at other line numbers
(compared line for line), `href` and `src` reading `/why/`; each served page (U4, WC-9) by the same lines. Sizes, raw /
gzip (`test/page-budget.mjs`): production 40,324 / 11,947 → 42,074 / 12,424; development `/` 63,954 / 18,840 → 65,706 /
19,319 (`seminar/` 65,709 / 19,321), under SPEC.md § 1's 61,440 gzip. (`diff`'s own output.)

```text
172a173,180
> 
> /* Why Fit AF? (SPEC-why-fit-af § 2): a second button beside See all plans, in its style, opening the /why/ page in a
>    frame inside the plans dialog's box, as tall as the viewport allows; the page scrolls inside the frame */
> .all-link + .all-link { margin-left: 24px; }
> .all-link[hidden] + .all-link { margin-left: 0; }
> .why { height: calc(100% - 24px); }
> .why .all-box { display: flex; flex-direction: column; height: 100%; }
> .why-frame { flex: 1; display: block; width: 100%; min-height: 0; border: 0; }
207c215
< <noscript><style>.js-only { display: none !important; } .panel[hidden] { display: block; } .all:not([open]) { display: block; position: static; width: auto; max-width: none; margin: 12px 0 0; }</style></noscript>
---
> <noscript><style>.js-only { display: none !important; } .panel[hidden] { display: block; } .all:not([open]):not(.why) { display: block; position: static; width: auto; max-width: none; margin: 12px 0 0; }</style></noscript>
335c343,349
<   <div class="wrap"><button type="button" class="all-link js-only" id="all-link" aria-haspopup="dialog" aria-controls="all">See all plans</button><p class="footnote">Prices as of 2026-09-27.</p></div>
---
>   <div class="wrap"><button type="button" class="all-link js-only" id="all-link" aria-haspopup="dialog" aria-controls="all">See all plans</button><button type="button" class="all-link js-only" id="why-link" aria-haspopup="dialog" aria-controls="why">Why Fit AF?</button><noscript><a class="all-link" href="why/">Why Fit AF?</a></noscript><p class="footnote">Prices as of 2026-09-27.</p></div>
>   <dialog class="all why" id="why" aria-label="Why Fit AF?">
>     <div class="all-box">
>       <div class="all-head js-only"><button type="button" class="all-close" id="why-close" aria-label="Close">&times;</button></div>
>       <iframe class="why-frame" id="why-frame" src="why/" title="Why Fit AF?" loading="lazy"></iframe>
>     </div>
>   </dialog>
545,551c559,576
<   // See all plans: the grid in a modal dialog. Esc closes it (the browser's own); so do its close button and a press on
<   // the backdrop (the dialog itself, outside its box); focus goes back to the link.
<   var all = $("#all"), allLink = $("#all-link");
<   allLink.addEventListener("click", function () { all.showModal(); });
<   $("#all-close").addEventListener("click", function () { all.close(); });
<   all.addEventListener("click", function (e) { if (e.target === all) all.close(); });
<   all.addEventListener("close", function () { allLink.focus(); });
---
>   // See all plans (the grid) and Why Fit AF? (the /why/ page in a frame, SPEC-why-fit-af § 2 item 3): each a modal dialog
>   // its button opens. Esc closes it (the browser's own); so do its close button and a press on the backdrop (the dialog
>   // itself, outside its box); focus goes back to the button.
>   function modal(dialog, button, close) {
>     button.addEventListener("click", function () { dialog.showModal(); });
>     close.addEventListener("click", function () { dialog.close(); });
>     dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
>     dialog.addEventListener("close", function () { button.focus(); });
>   }
>   modal($("#all"), $("#all-link"), $("#all-close"));
>   modal($("#why"), $("#why-link"), $("#why-close"));
>   // A key pressed with focus inside the frame (after a click or a scroll in it) goes to the frame's document, not the
>   // dialog's, so Esc there would not close it: the /why/ page is this site's own, and its Esc closes the dialog too.
>   var whyFrame = $("#why-frame");
>   whyFrame.addEventListener("load", function () {
>     var doc = whyFrame.contentDocument;
>     if (doc) doc.addEventListener("keydown", function (e) { if (e.key === "Escape") $("#why").close(); });
>   });
```

## 5. Release

A dev pin, then the production pin (`fitaf-infra` `microsites.lock`), each by pull request through develop to main, on
the Advisor's go (given 2026-10-21 for both pushes).
