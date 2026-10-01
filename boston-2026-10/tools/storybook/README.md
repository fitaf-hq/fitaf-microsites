# tools/storybook — where the microsite's UI is designed, first the deep-carting screen

[`../../SPEC-storybook.md`](../../SPEC-storybook.md) is the contract (ruled 2026-09-30, the Advisor: *"Can we implement
Storybook for this? OurFans uses it extensively for UI development"*). Its first subject is the progress screen fill B
shows while it fills the cart ([`../../SPEC-rung2-progress-and-checkout.md`](../../SPEC-rung2-progress-and-checkout.md)
§ 2, and § 14, which moved the screen into its own module for this).

**The rule of this directory**: its own npm package and lockfile (Storybook 10, `@storybook/html-vite`,
`@storybook/addon-a11y`, `@storybook/addon-docs`), so none of it enters the site's install, which the deploy and CI
run; and **nothing here ships**. A story renders the screen's own module, `src/storefront/progress-screen.js`, the one
the build inlines into the Footer block; it is imported, never copied.

## Run

```sh
npm --prefix boston-2026-10/tools/storybook ci                 # once, and after this lockfile changes
npm --prefix boston-2026-10/tools/storybook run storybook      # the development server: http://localhost:6016/ (localhost only)
npm --prefix boston-2026-10/tools/storybook run build-storybook  # a static build in storybook-static/ (git-ignored); published nowhere
npm --prefix boston-2026-10/tools/storybook test               # SB-1 to SB-5 (node --test; SB-2 runs a static build, ~10 s)
```

The site's own install is not needed: the screen's module has no imports, and the words and colours are read by
`scripts/screen-inputs.mjs`, which needs node's own modules only. Telemetry and "what's new" are off in the config.

| path | what |
|---|---|
| `.storybook/main.js` | the stories, the two addons, `@storybook/html-vite`; the build's own readers (`screenWords`, `screenTokens` from `scripts/screen-inputs.mjs`, the functions `scripts/build-storefront.mjs` inlines) run here, in Node, and hand the words and colours to the stories as the virtual module `virtual:fitaf-screen-inputs`; the development server may read this package and the site's `src/storefront/`, nothing else |
| `.storybook/preview.js` | the smoke's two widths as viewports (1280 × 900, 390 × 844), a full-bleed canvas, and every story in its own frame on the docs page (the screen covers its whole viewport) |
| `stories/progress-screen.stories.js` | **Timeline** (the three waits of rung 2 § 13a, played: A the screen up with no meal, B the meals 0.21 s apart, C CHECKOUT to the checkout, then the screen removed; controls: the profile, the meal count, photos, loop), **Stage** (held at A, B at meal *k* of *t*, or C), and **Reduced motion** (a note: the browser's rendering emulation, which a story cannot set) |
| `stories/timeline-data.js` | the live store's times, ONE data object citing rung 2 § 13a (and § 13 for the unthrottled checkout wait); SB-5 checks it against the contract's table |
| `stories/stand-ins.js` | stand-in meal names (never the live menu) and stand-in cards (an `img` and a `.product__content-title`, as the screen reads a card), their photos **generated at run time** (an SVG tile in the page's navy with the meal's initial) |
| `test/` | SB-1 (own package), SB-2 (the static build lists Timeline and Stage), SB-3 (one source, with its mutant), SB-4 (no image file), SB-5 (the times are § 13a's) |

## What a reader would misread

- **A story is not the store.** The cards are stand-ins, the photos placeholders, and nothing is fetched. What the
  screen does on the store's page is proven by the site's suite and the watch's, on the shipped text.
- **The unthrottled profile is partly assumed**: § 13 measured only its checkout wait (4.1–4.5 s); the story shows A
  as 0 s and B as § 13a's 1.3 s, the same on every profile, and says so in its caption.
- ⛔ **No photograph, ever**: no image file is added here (SB-4), since this repository is public and the photos are the
  Owner's. The plan's own colour is not among the build's readers, so the tiles use the screen's navy.
