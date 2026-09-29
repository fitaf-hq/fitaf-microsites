# flows/rendered — the flow diagrams as images

**The rule of this directory**: everything here is an **output**. The source of each picture is a
` ```mermaid ` block in [`../*.md`](../README.md); to change a diagram, change its block and rebuild. Never
edit a file here by hand.

| file | what | kind |
|---|---|---|
| `<flow>.svg` | one per mermaid block, e.g. `01-save-offer.svg`; a file with several blocks gives `-1`, `-2` … (`03-follow-up-email-1.svg`); `../README.md`'s journey is `00-journey.svg` | OUTPUT, committed |
| `<flow>.png` | the same diagram at 2× (for a screen share) | OUTPUT, git-ignored |

## Rebuild

```sh
npm --prefix boston-2026-10/tools/render-flows ci
npm --prefix boston-2026-10 run render:flows
```

`render:flows` delegates to [`../../tools/render-flows/`](../../tools/render-flows/README.md), a separate
npm package (the site's own install never contains mermaid-cli or puppeteer). It draws every block with
`@mermaid-js/mermaid-cli` in the Chrome already installed on the machine (its `.puppeteerrc.cjs`; set
`PUPPETEER_EXECUTABLE_PATH` for another path). Nothing is downloaded. It rewrites every file here and
removes any that no block draws.

## What a reader would misread

- **The look is the page's.** Colours and fonts come from the `:root` tokens and `@font-face` rules of
  `../../src/template.html`, read at render time (`../../scripts/flow-theme.mjs`): navy on ice, Poppins
  for state and node names, Open Sans for everything else (sequence participants at 600), the orange
  accent for start and end. A token change reaches the diagrams on the next render.
- **Each SVG opens with a stamp**: the SHA-256 of the block it was drawn from and of the theme.
  `npm test` (case F1) recomputes both, **with no browser**, and fails on a render that is stale (the
  block or the theme changed), missing, or orphaned. After editing a flow's diagram, run
  `render:flows` and commit the SVG with the `.md`.
- **The SVGs carry their fonts**: the page's own WOFF2 files, inlined (SIL Open Font License; the
  license texts are `../../src/fonts/OFL-*.txt`), so a picture looks the same wherever it is opened.
  That base64 is most of each file's size.
- **The layout is mermaid's.** Where a line crosses a label, the fix is in the block, not here.
