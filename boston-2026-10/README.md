# boston-2026-10

The front door for the late-October 2026 Boston trip: a single static page, opened from a QR code,
that asks two questions (goal, then which meals) and hands the visitor to the plan's order page on the
Fit AF store. Rung 1 of [`SPEC.md`](SPEC.md), which is the contract. Everything here is public (see the
[repository README](../README.md)).

## What is here

| path | what | kind |
|---|---|---|
| `SPEC.md` | the contract, §§ 0–5 | authority |
| `data/plans.json` | the plan table, read off the store's public plans page on a date | INPUT |
| `data/events.json` | one entry per event URL that gets a QR code | INPUT |
| `src/template.html` | the page: markup and inline CSS, with `{{SLOT}}` placeholders | INPUT |
| `src/app.js` | the one small inline script: the two questions, tabs, "See all plans", URL fragment | INPUT |
| `build.mjs` | plain Node 22 ESM; fills the template from the data and writes the QR codes | build |
| `test/*.test.mjs` | T1–T7 of SPEC § 4, `node --test`, no network | tests |
| `dist/` | `index.html` and `qr/<event>.png` + `.svg` | OUTPUT, git-ignored |

**Nothing in `dist/` is hand-edited.** To change the page, change `data/` or `src/` and rebuild.

## Rebuild, test, deploy

```sh
npm --prefix boston-2026-10 install
npm --prefix boston-2026-10 test        # T1–T7
npm --prefix boston-2026-10 run build   # writes dist/
npm --prefix boston-2026-10 run deploy  # builds, then wrangler pages deploy dist --project-name fitaf-microsites
```

## What a reader would misread

- **Money is integer cents.** Per-meal prices are stored; weekly totals are always computed
  (`meals_per_week × price_per_meal_cents`) in `build.mjs`. The inline script only displays strings the
  build computed, so the arithmetic exists once.
- **The page shows 7 and 14 only** (`shown_counts` in `plans.json`); the 4/10/21 cells are held for the
  price ladder of a later rung. Adding a count to `shown_counts` is a data change, not a code change.
- **The choice lives in the URL fragment**: `#lean`, `#lean-7`, `#signature-14`, `#meals-14` (count
  without a goal), `#family`, `#individual`. Each choice pushes a history entry, so back and forward work.
- **There are exactly seven order links in the HTML**: the six grid cells and the Family button. The
  result card's "Choose your meals" has no `href` until the script sets it from the chosen cell, so a
  test counting links counts the table, not a duplicate of it.
- **Without JavaScript** the two questions are hidden and the grid and Family card are shown, so every
  link still works.
