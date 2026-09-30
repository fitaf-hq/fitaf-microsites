# boston-2026-10 — the photo slots: the surface a photo is judged against. CONTRACT, PROPOSED

**Written 2026-09-29, before any photo is chosen and before the page has a photo slot.** ⬜ **PROPOSED**: the numbers
below are the agent's, for the Advisor to change; they stand until he does. ✅ **Sent to the family's image team for
its first job with the Advisor's go** (2026-09-29: *"Yes please send"*, on a message naming these numbers). **Who reads it**: the family's new image
team (its first job is ~10 of Fit AF's photos, for the Advisor to narrow to 3–5 winners **before the Owner meeting of
2026-10-01**), and whoever builds the page's photo slot. It is the *"written surface"* the engine judges against; the
engine applies it and owns none of it.

⛔ **No photograph is ever committed here** (this repository is public; a photo's usage rights are the Owner's). This
file describes slots, never photos. **Which dish a photo shows, and whether that dish is on the current menu, is not
decided here or by the engine**: it comes from Fit AF's own reviewed mapping.

## 1. The device: a phone, in portrait

The Advisor: *"If anything, the microsite will primarily be viewed on phones in portrait orientation."* **Print is
never a criterion.**

| | value | why |
|---|---|---|
| layout width | **390 CSS px** (judge also at 360 and 430) | the common width of current phones in portrait; 360 and 430 bound the band |
| device pixel ratio | **3** | a photo is judged at the pixels the phone actually draws |
| how to render it | a frame of **exactly** the layout width, asserting the page's own width | headless Chrome lays a page out at a 500 px minimum and crops, so a "390 px" screenshot is a 500 px layout (a sibling team's finding) |

## 2. The slots, in order of importance

| slot | where | shape | drawn at (CSS px, at 390) | pixels needed (×3) | what must hold |
|---|---|---|---|---|---|
| **`page-hero`** | the page, full width, directly above the offer box | **4:3**, landscape | 390 × 293 | **1170 × 878** | the dish reads as food at a glance; the offer box stays visible in the first screen below it |
| **`square`** | the tent card's small tiles; any list or social use | **1:1** | 120 – 390 | **1170 × 1170** | the dish is still recognisable at 120 px |
| **`slide`** | the slideshow (a screen share today) | **16:9**, and **9:16** on a phone | full screen | **1920 × 1080** (a screen) / **1170 × 2080** (a phone) | the subject clears the **lower 40%**, where a solid navy panel with the plan's line sits over the photo |

- A crop may never be **enlarged** to reach its pixels: a photo that cannot fill a slot at ×3 from its own pixels does
  not qualify for that slot (it may still qualify for a smaller one).
- **Text never sits directly on a photo**: every word over a photo region is on a solid panel (the mock-ups' contrast
  rule). So no photo is judged for text legibility, only for leaving the panel's region free (`slide`).
- The same photo may win in one shape and lose in another; the Advisor's pipeline runs the crops per shape.

## 2a. Amendment, 2026-09-30 — the screen slide's panel at the side

**Proposed by the image team** (after its first job: of all the shapes, the 16:9 screen slide *"needs the most help ...
it's really like 16:5"*, the Advisor's words to it), and **ruled by the Advisor** (2026-09-30 00:34:51 PDT (07:34:51Z), *"Yes, the
right side"*): on a **screen** (16:9) the navy panel is the **right 40%, full height**, and the photo fills the **left
60%**, a window of **1152 × 1080** px at 1920 × 1080, nearly square. The lower-40% band left a 1920 × 648 strip, a
slice across a round plate.

| slide | panel | the photo's window | pixels needed |
|---|---|---|---|
| **screen** (16:9) | the right 40%, full height | the left 60% | **1152 × 1080** (replaces 1920 × 1080 above) |
| **phone** (9:16) | the lower 40% band, unchanged | above the band | **1170 × 2080**, unchanged |

⚠ **Found at the change**: the mock-ups' landscape slide never drew the lower-40% band this file described; its panel
was a box floating at the bottom left. Both shapes now draw what this file says. The mock-ups apply it by orientation
(`mockups/mockups.css`), so a screen share at another landscape size keeps the same proportions.

**Picked the same night** (the Advisor's round 13 on the re-cut): the side-panel cut won for all five of his screen
slides, with a small margin at the plate's rim. His earlier band crops still work for some of them, **should a band
layout return** (his words: *"if not now, in the future"*); nothing is built for it.

## 3. The weight budget (the page only)

| file | budget | format |
|---|---|---|
| `page-hero` at 1170 w | **≤ 150 KB** | AVIF, with a WebP fallback of **≤ 190 KB** |
| `page-hero` at 780 w (for ×2 phones) | **≤ 80 KB** | the same |

It is the page's largest element on a phone, so it sets how soon the page looks ready; this page's point is to be
fast at a gym table on a phone's data. Compression is a light, logged edit (the brief: *"cropping, color balance,
exposure"*); nothing that changes what the photo shows.

## 4. What this does NOT decide

- **Which photos** (the Advisor picks from the ~10), and **which dish** each shows (Fit AF's mapping).
- **Where derived images live**: the new team's (its Q5), within one bound Fit AF holds for its photos: a crop or a
  compressed copy of the Owner's photo is still the Owner's photo and **stays outside every repository**.
- The page's photo slot itself: it is built from this file after the winners are chosen, as its own change with its
  own cases.
