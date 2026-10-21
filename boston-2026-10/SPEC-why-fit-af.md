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

### 4.1 Gated on `e3c59e4` (the build's own run; to be re-run by the orchestrator)

Each with `nice -n 15`, the tree clean before and after (`git status` empty).

| gate | result | a failure's control on `6e0f6bd` (a temporary worktree, the same installs) |
|---|---|---|
| `npm --prefix boston-2026-10 test` | 878 of 879 | S22 alone (*the page has no element #save-offer-label*): fails there identically (868 of 872 there: S22, B1, S20 and one QC case) |
| `npm --prefix boston-2026-10 run contrast` | 70 of 70 pairs | none |
| `npm --prefix boston-2026-10/tools/storybook test` | 48 of 48 (41 before, and W2, W3 and the mutant's 7) | none |
| `npm --prefix boston-2026-10/tools/storefront-watch test` | 213 of 213 | none |

B1 and S20, failing on `6e0f6bd`, pass here (§ 4 items 4–5). QC (Chrome stalls timed by the clock) failed one case on
each of two runs of the contract's tree under the machine's load (a different case each time) and passed here.

## 6. Amendment, 2026-10-21: "Find your plan" inside the dialog, and Storybook's frame. CONTRACT, before any code

**Why.** § 4 items 14 and 15, put to the orchestrator: the /why/ page's one link (*Find your plan*, `href="/"`), pressed
inside the dialog, loads the plan page inside the frame (the page nested in its own dialog); and Storybook's
development stories serve no `why/`, so their frame is a 404. The orchestrator's ruling (Fit AF session 255, after
prompt 255 objective 6): **the dialog closes on that link**, as it closes on Esc; `/why/` itself is unchanged (§ 2 item 5).

1. **In `src/app.js`, from the frame's `load` listener** (the one that already makes Esc close the dialog, § 4 item 6):
   a click in the frame's document on a link whose URL, resolved against that document, is **this site's plan page**
   (same origin, path `/`) is prevented and **closes the dialog** (focus back on the button, as every close). The frame
   does not navigate. Any other link in the frame (none today) behaves as a link. Same origin only: nothing if the
   frame's document cannot be read (as Esc).
2. **Without script** nothing changes: the footer's link opens `/why/` as a page, whose *Find your plan* goes to `/`.
3. **Storybook**: `tools/storybook/microsite/layout.js` `ROOT_STATIC` gains `"why"`, so a development story's frame
   (`/why/`) loads the built page as the production story's (`why/`) does. No other Storybook change.
4. **Cases.** W2 gains: in Chrome, with the dialog open, a press on the frame's *Find your plan* closes the dialog,
   focus on the button, the top page's URL unchanged and no plan page loaded inside the frame (the frame's document
   still `/why/`, or the frame not navigated); production at 390 and development `/demo/` at 390. **Mutant**: the
   link's listener removed (the frame navigates and the dialog stays open): W2 red; its control green. Storybook's suite
   gains: a development story's frame `/why/` answers 200 with the built page (red before item 3). **The goldens**:
   `app.js` is inlined in the built page, so S20, U4 and WC-9 move once more, each re-recorded by its own recorder,
   every changed line listed in § 6.1 (as § 4 did); no other golden moves.
5. **Unchanged**: everything § 2 item 5 lists; `/why/`'s file; the plans dialog.

### 6.1 Built (to be filled by the build)

Built on `boston/why-button` from `84807ce` (this contract), in three commits: `9fae450` (the cases, red), `e2284f1`
(§ 6 items 1 and 3) and this section's (the goldens, re-recorded once, and § 6.1). **To be re-gated by the
orchestrator** (the site suite, contrast and the storefront watch were not run by the build). §§ 1–5 and § 6 items 1–5
are unchanged.

**The cases, and what they did before the code** (each file alone, `nice -n 15 node --test <file>`; before on `9fae450`,
after on `e2284f1` and this commit)

| case | file | before | after |
|---|---|---|---|
| W2, § 6 item 4: with the dialog open, a press on the frame's link whose URL, resolved against the frame's document, is this origin's `/` (found by where it goes, never by its words: *Find your plan.* is a phrase of `data/messages.json`, which SM-4 keeps out of every file under `tools/storybook/`) closes the dialog, focus on `#why-link`, the top page's URL unchanged, no `framenavigated` in the network's quiet after the press (750 ms), the frame's document still `/why/`; production at 390 (`#lean-7`) and development `/demo/` at 390 | `tools/storybook/test/w-why-chrome.test.mjs` | 0 of 2 (the dialog stayed open, the frame navigated to `/`, its document the plan page) | 2 of 2 |
| W2's § 6 mutant: a copy of the production build without the one line of its script that listens for a click on the frame's document (`doc.addEventListener("click"`, read from the page) fails it (*did not close the dialog*, *a frame to /*); the copy as built passes (its control) | the same | 0 of 1 (fixture control: no such line) | 1 of 1 |
| The file's other seven (W2's three, W3's three, W2's first mutant) | the same | 7 of 7 | 7 of 7 |
| SM-3, § 6 item 3: each story's page's frame (its one `<iframe src>`, resolved against the page's URL in the static build) answers 200 with the site's own build of `/why/` (`npm run build` / `npm run build:dev`, its `why/index.html`), byte for byte; every date, both builds | `tools/storybook/test/sm-3-one-source.test.mjs` | 0 of 1 (the four development pages' `/why/` answered 404; the four production pages' `why/` 200 and the built page, the control) | 1 of 1 |
| SM-3 and its mutant | the same | 2 of 2 | 2 of 2 |

`w-why-chrome.test.mjs`: 7 of 10 before, 10 of 10 after; `sm-3-one-source.test.mjs`: 2 of 3 before, 3 of 3 after.
`nice -n 15 npm --prefix boston-2026-10/tools/storybook test` on `e2284f1`'s code with these goldens: 52 of 52 (§ 4.1's
48, and W2's two, its § 6 mutant and SM-3's § 6 case).

**The goldens, re-recorded once (this commit)** — each case run alone on `e2284f1` before (red where its golden moved)
and after

| golden | before → after | moved |
|---|---|---|
| S20 `test/s20-production-golden.json` (every file of `e2284f1`'s production build, hashed) | 0 of 1 → 1 of 1 | `index.html`, `f1f0e04f…` → `c5a35d44…`; every other file (`why/index.html` among them, `43afc5ed…`) byte-identical |
| WC-8's `TODAY_NO_PICKS_SHA256` (its control's own computation, at each tree) | 2 of 3 → 3 of 3 | `1c68a68b…` → `21abbe56…` (`84807ce`'s tree reproduces `1c68a68b…`); its two visible-page cases did not fail |
| U4 `test/u-04-golden.json` (`node test/u-04-record.mjs --commit e2284f1`) | 0 of 1 → 1 of 1 | the six served pages, each +516 bytes (v1 fixture prod `d13822b4…` → `6725cbd4…`, dev `1b411c4b…` → `b5056032…`; v2 fixture prod `c56b6803…` → `e3e40f6f…`, dev `1d1b91a9…` → `ac582b7b…`; the committed week prod `f5a898cf…` → `263482a1…`, dev `bb3c301f…` → `286f1e51…`); all six contents and the visible page at all seven fragments byte-identical |
| WC-9 `test/wc-09-golden.json` (`node test/wc-09-record.mjs --visible-at e2284f1`) | 3 of 3 → 3 of 3 | `visible_at` alone (`f02807e` → `e2284f1`); all 20 visible pages byte-identical (see below) |
| CC-8 and every other golden | not moved | `cc-04`, `cc-08`, `m14-text-golden`, `ms-03`, `ms-04`, `ms-09`, `ms-13`, `ms-14`, `pr-10`, `qe15`, `r2-32`: each alone, green, on this tree |

**Every changed line.** Built from each commit's own tree (`git archive`, this package's `node_modules` linked), both
builds: every file but the pages byte-identical (`diff -rq`), `why/index.html` among them. Production's `index.html`
(no week, as every build writes it): 7 lines added, none removed, in three places; each development page (`/`,
`demo/`, `boston/`, `seminar/`) by the same 7 lines at `677a678,679`, `678a681,684`, `681a688` (compared line for line);
each served page (U4) by the same lines. Sizes, raw / gzip (`test/page-budget.mjs` `pageSizes`): production 42,074 /
12,424 → 42,590 / 12,594; development `/` and `demo/` 65,706 / 19,319 → 66,222 / 19,472, `boston/` 65,708 / 19,319 →
66,224 / 19,472, `seminar/` 65,709 / 19,321 → 66,225 / 19,474; under SPEC.md § 1's 61,440 gzip. (`diff`'s own output,
production.)

```text
571a572,573
>   // So does its link back to this site's plan page (SPEC-why-fit-af § 6), which would open the plan page inside its own
>   // dialog: pressed, the dialog closes and the frame stays. Any other link in the frame is a link.
572a575,578
>   function toPlanPage(el) {
>     var a = el && el.closest ? el.closest("a[href]") : null;
>     return !!a && a.origin === location.origin && a.pathname === "/";
>   }
575a582
>     if (doc) doc.addEventListener("click", function (e) { if (toPlanPage(e.target)) { e.preventDefault(); $("#why").close(); } });
```

`tools/storybook/microsite/layout.js`: `ROOT_STATIC` `["fonts", "assets"]` → `["fonts", "assets", "why"]`, its one line.

**Where § 6 was silent, and what was done** (found at the build, not ruled)

1. **WC-9 did not move.** § 6 item 4 says S20, U4 and WC-9 move. WC-9's golden holds only visible pages beyond
   `409b805`'s content, and `visible()` reads the page without its scripts; the change is script alone, so WC-9 passed
   on `e2284f1` before any re-record. Its recorder, run as item 4 asks, changed `visible_at` alone; that is committed
   (the test's pin `f02807e` → `e2284f1`). U4's visible pages and WC-8's two visible-page cases likewise did not move.
2. **"This site's plan page"** is read as the top page's origin and the path `/`, by the anchor's own `origin` and
   `pathname` (resolved against the frame's document). On a development event page (`/demo/`) the link's `/` is the
   development root, not the page the visitor is on; the dialog closes on it all the same, as § 6 item 1's "path `/`"
   says.
3. **A press with a modifier** (Ctrl or Cmd, which would open a new tab) is a `click` too, so it closes the dialog and
   opens nothing; a middle press is an `auxclick`, not handled, and opens the link as before. By the DOM's event model,
   not measured here.
4. **The new Storybook case is in `sm-3-one-source.test.mjs`**: it is SM-3's rule (what a story's frame loads is the
   site's own build) and reuses that file's static build; it has no case id of its own.
5. **Left as they are** (§ 6 item 3, "no other Storybook change"): `.storybook/main.js`'s header comment and the
   Storybook README's `.storybook/main.js` row still say the development build's `fonts/` and `assets/` are served at
   the root, as does SPEC-storybook-microsite.md § 7 (its build's notes); the root now also serves `why/`.
6. **"Not navigated" is read in a window**: W2's § 6 case waits for 750 ms of network quiet after the press and then
   finds no `framenavigated` and the frame's document still `/why/`. Its mutant shows the window catches the
   navigation the listener prevents.

### 6.2 Gated by the orchestrator on `0b6ab73` (2026-10-21, announced to the peers, each set at `nice -n 15`)

| gate | result | a failure's control |
|---|---|---|
| `npm --prefix boston-2026-10 test` | 878 of 879 | S22 alone (*the page has no element #save-offer-label*), and S22 fails identically on `6e0f6bd`'s own tree (`git archive` into a scratch folder, the same `node_modules`): the base's, not this branch's |
| `npm --prefix boston-2026-10 run contrast` | 70 of 70 pairs | none |
| `npm --prefix boston-2026-10/tools/storybook test` | **52 of 52**, run alone 16:29–16:31 PDT | ⚠ the first run (16:05, beside other builds, the 15-minute load average near 150) timed out PR-14 at 120 s and then hung idle in `pr-chrome` and `w-why-chrome` with no browser left; the orchestrator stopped those two files at 16:25 and re-ran the suite alone: every case green |
| `npm --prefix boston-2026-10/tools/storefront-watch test` | 213 of 213 | none |
| `tools/storybook/test/w-why-chrome.test.mjs` (W2, W3, § 6's case and the mutants), three runs | 10 of 10, three times | none |

Released by a dev pin, then the production pin (§ 5), the Advisor's go given 2026-10-21 (Fit AF's decision record § 7o item 6).
