# test/fixtures/previews — invented weeks, never a planned menu

What the preview cases read (SPEC-preview-sites.md §§ 2–4; PV1–PV7): two **preview files** in the shape Fit AF's
emitter writes in its preview mode (the version-2 picks shape plus `"preview": true` and `"approved"`), and the one
week's **sheet entry** the first has. ⛔ **A real preview's data never enters this repository** (§ 2, amended
2026-10-20: it is committed in `fitaf-infra`); these are invented weeks only.

- `2026-11-01.json`: `approved: false`. `2026-10-25.json`: `approved: true`, every name suffixed ` (week two)`, so a
  page shows which week it carries. Both are `test/fixtures/picks-v2/2026-10-04.json`'s carts and snacks with each
  meal's `display` as its `name` too (a preview's names are Fit AF's: no store name exists yet).
- `photo-sheets/chefs-choice-2026-11-01.json`: 2026-11-01's sheet entry, **one file per week** (§ 2, ruled
  2026-10-20), `{ file, width, height, cells }` (one `data/photo-sheets.json` `chefs_choice` entry), cells keyed by
  those names. 2026-10-25 has none: plain tiles. **The sheet itself is not committed** (P1 names every tracked image
  one by one): `test/pv-harness.mjs` copies this directory into a temporary directory and writes the sheet beside the
  entry there, a byte copy of `test/fixtures/photo-sheets/chefs-choice-2026-10-04.jpg` (generated flat colours, no
  photograph).
- This directory is **inside this repository's tree**, so the content command refuses it as `--from` (PV7): every
  case reads a temporary copy.
