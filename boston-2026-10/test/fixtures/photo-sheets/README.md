# test/fixtures/photo-sheets — a fixture, not photographs

What the plan page's photo-sheet cases build with (SPEC-plan-page-refinement.md § 3; PR-2, PR-3, PR-7): a
`photo-sheets.json` in `data/photo-sheets.json`'s shape, and the two sheets it names, **generated flat colours**
(40 × 150: five 40 × 30 cells; 24 × 72: three 24 × 24 cells). Nothing here is a photograph or comes from one; P1 names
each file by this manifest.

- The real manifest and sheets are **not in this repository**: § 3's producer is held (Fit AF's own pipeline makes
  them). Without `data/photo-sheets.json` the page has no photograph (PR-3).
- The Chef's Choice cells are keyed by `test/fixtures/picks/2026-10-04.json`'s invented names, exactly as written
  (the `🟠NEW:` tag included); its other meals get plain tiles.
- Regenerate the sheets (ffmpeg, bit-exact, no metadata):

```sh
ffmpeg -f lavfi -i color=c=0xc0392b:s=40x30 -f lavfi -i color=c=0x27ae60:s=40x30 -f lavfi -i color=c=0x2980b9:s=40x30 \
  -f lavfi -i color=c=0xf1c40f:s=40x30 -f lavfi -i color=c=0x8e44ad:s=40x30 \
  -filter_complex "[0][1][2][3][4]vstack=inputs=5,format=yuvj420p[o]" -map "[o]" -frames:v 1 -q:v 5 \
  -map_metadata -1 -fflags +bitexact -flags:v +bitexact -update 1 carousel.jpg
ffmpeg -f lavfi -i color=c=0xe67e22:s=24x24 -f lavfi -i color=c=0x16a085:s=24x24 -f lavfi -i color=c=0x34495e:s=24x24 \
  -filter_complex "[0][1][2]vstack=inputs=3,format=yuvj420p[o]" -map "[o]" -frames:v 1 -q:v 5 \
  -map_metadata -1 -fflags +bitexact -flags:v +bitexact -update 1 chefs-choice-2026-10-04.jpg
```
