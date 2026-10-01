# boston-2026-10 — the signage slideshow plays itself: no dots, a hidden legend leaves no button, a cross-dissolve every 7 s. CONTRACT

**Written 2026-10-01, before any code. Status: RULED** by the Advisor the same morning: *"Drop the progress dots"*;
*"When the Legend is hidden, also hide"* the *Legend (L)* button; *"Have the slideshow auto-advance with a basic
cross-dissolve. Let's say 7 seconds per slide with a 0.5 second transtion, but please assume that we'll end up
tweaking that."* **Who reads it**: whoever builds it, and whoever later builds the kiosk variant (§ 4).

⛔ Unchanged: the slides' content, photos, words and plans; the legend's content and its **L**, **N**, **F** keys; the
other three pieces; the page (`src/`), the Worker and the Footer block. `mockups/` and its tests only.

## 1. The changes (`mockups/slideshow.js`, its markup and `mockups.css`)

1. **No progress dots**: the `.dot` elements and their styles are removed.
2. **The legend's button goes with the legend**: while the legend is hidden, the *Legend (L)* toggle is hidden too; **L**
   still opens it, and when open the toggle shows as today (to close it). The legend's default (open on a wide screen,
   closed on a phone) is unchanged.
3. **Auto-advance with a cross-dissolve**: each slide shows for **7 s**, then dissolves into the next over **0.5 s**
   (opacity, both slides visible during the fade), wrapping at the end. The two durations are **named constants in one
   place** (or data beside the slideshow's other data), so a change is one edit. A key or click that moves the slide
   restarts the 7 s. The URL fragment follows the slide as today. Under `prefers-reduced-motion` the slide changes
   without the fade (it still advances).

## 2. Cases (the mock-ups' `node --test` suite)

| | case | expect |
|---|---|---|
| SS-1 | no dots | the built slideshow has no `.dot` element and no rule styling one |
| SS-2 | the button | with the legend hidden the toggle is not displayed; with it open, displayed (Chrome, computed) |
| SS-3 | ⭐ the timer | the two durations come from the one place; with a fake clock, the slide advances at 7 s and wraps; a key press restarts the count |
| SS-4 | the dissolve | during the 0.5 s both slides are present and their opacities change (Chrome); under reduced motion, no transition |

## 3. Not decided here

- The durations' final values (the Advisor: *"assume that we'll end up tweaking that"*).

## 4. ⭐ The intent this serves — recorded, not built

The Advisor, the same message: *"The intent for the slideshow (likely) is to acquire tablets, lock them into kiosk mode
and have them display the slideshow (which we may package in an offline-friendly variant so the slideshow works without
network connectivity). Then when setting up an event all the sales rep has to do is turn on the tablet(s) and ensure it
is sitting on its holder – and the slideshow "just works"."* For that variant, later: the legend closed and no control
on screen whatever the width (a landscape tablet is "wide" today); everything the slideshow loads packaged with it
(fonts, photos, the QR image) so nothing is fetched; and starting on its own when opened.

## 5. Built, 2026-10-01 — found at the build, not ruled

Red at `6805cc3`: the slideshow's files had 9 tests, 7 failing, and the Chrome cases 2 of 2 failing. Green at `ad79d22`:
the site's suite **468 of 468** (466 before), Storybook **25 of 25** (23 before), and `npm run contrast` 66 of 66.

- **Where the cases run**: SS-1 and SS-3 are in the site's suite (`test/ss-01-…`, `test/ss-03-…`). SS-2 and SS-4 are in
  Chrome, in `tools/storybook/test/ss-chrome.test.mjs`, beside the plan page's Chrome cases. The mock-ups have no Chrome
  checks of their own: their Chrome only renders PNGs. That file builds the mock-ups (`buildMockups`, no PNGs) into a
  temporary directory and opens `slideshow.html` at 1920 × 1080.
- **The one place**: `SLIDE_MS = 7000` and `FADE_MS = 500`, at the top of `mockups/slideshow.js`. The script sets
  `--fade` on the root, and `mockups.css` uses `var(--fade)` with no duration of its own.
- **The count**: every show of a slide restarts it: by the timer, a key, a click or the fragment. So a slide is on
  screen for 7 s from the start of its fade in, and the 0.5 s overlaps the start of the next slide's 7 s. It is not
  7 s plus 0.5 s.
- **The dissolve** is opacity on both slides. The slide leaving stays drawn (`visibility`, held back by the fade's
  length) until its fade ends. It applies only once the script plays the deck (`body.playing`), so without JavaScript
  the markup's `hidden` still shows the first slide. The first slide does not fade in on load.
- **The toggle**: `body:not(.legend-open) .legend-toggle { display: none; }`. On a phone (the legend closed by default)
  there is no button, and **L** opens the legend.
- **Updated**:
  - P6: a slide is shown by its `on` class, the dots' assertion goes with the dots, and its stand-in gains a clock that
    never runs.
  - P5: opacity is allowed only in the dissolve's two rules, and at rest only 0 or 1.
  - The dots' contrast pair is removed from `src/contrast-pairs.json`.
- **Not verified**: the look of the dissolve over a whole cycle, beyond the two screenshots; a real tablet; § 4's kiosk
  variant (not built).
