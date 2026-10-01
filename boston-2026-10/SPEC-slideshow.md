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
