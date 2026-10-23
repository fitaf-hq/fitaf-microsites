# `print/assets/` — images only the printed pieces use

`print/build-print.mjs` copies every `*.png` here into its stage's `assets/`, beside the page's own logo; the page's build
(`copyStatic`, `src/assets/`) never sees them, so the site's built files do not change.

| file | what it is |
|---|---|
| `fitaf-logo-reversed.png` | the logo drawn for a dark ground (`SPEC-print-pieces.md` § 15 item 1): the green box and its white letters as drawn, the logo's own white field transparent, the tagline white; 1600 × 690 px |
| `fitaf-logo-reversed-white.png` | the same, the second word's letters white instead of green |

Both are derived in Fit AF's own record from the vector logo the Owner's label files carry (rendered at 1200 dpi, then
recoloured by region), never from a flyer's raster; regenerated there byte for byte.
