# boston-2026-10 — Storybook: where the microsite's UI is developed, first the deep-carting screen. CONTRACT

**Written 2026-09-30, before any code. Status: RULED** by the Advisor the same day: asked how to take the progress
screen's next design forward, *"Can we implement Storybook for this? OurFans uses it extensively for UI development"*;
asked how the stories get the screen, *"Extract the screen"* (`SPEC-rung2-progress-and-checkout.md` § 14, which is what
this asks of the Footer block). **Who reads it**: whoever builds the tool, and whoever designs in it next.

⛔ **Never**, in the tool or a story: a request to the store, a photograph, or anything that ships. A story renders the
screen's own module (rung 2 § 14); nothing of `tools/storybook/` is ever inlined into the Footer block or the site.

## 1. Where it lives

- **`tools/storybook/`, its own npm package** (`package.json` and `package-lock.json`), as `tools/README.md` requires:
  its dependencies never enter `boston-2026-10/`'s install, which the deploy and `fitaf-infra`'s CI run. The site's
  `package.json` and lockfile are unchanged by this contract.
- `npm --prefix boston-2026-10/tools/storybook run storybook`: the development server, on `localhost` only.
  `npm --prefix boston-2026-10/tools/storybook run build-storybook`: a static build into
  `tools/storybook/storybook-static/`, **git-ignored**. Nothing is published anywhere by this contract.
- A `README.md` in `tools/storybook/`, and its row in `tools/README.md`.

## 2. The stack

- **Storybook 10** (the major OurFans runs, `^10.2`), framework **`@storybook/html-vite`** (the screen is plain DOM, no
  framework), addons **`@storybook/addon-a11y`** and **`@storybook/addon-docs`**, exact versions in the tool's lockfile.
- The stories are **plain JavaScript** (`*.stories.js`, CSF): a story returns the DOM it renders.
- ⚠ **Not** the vitest addon for now: the screen's behaviour is proven by the site's and the watch's suites, on the
  shipped text; Storybook is where it is designed and looked at.

## 3. What a story renders

1. **The screen's own module**, `src/storefront/progress-screen.js`, imported, never copied (rung 2 § 14).
2. **The page's colours and the screen's words, through the build's own readers**: `screenTokens()` over
   `src/template.html` and `screenWords()` over `data/messages.json` (`scripts/build-storefront.mjs`), so a story shows
   the colours and words the block ships. No second parser, no copied value.
3. **Stand-in meal cards**: an element holding an `img` and a `.product__content-title`, as the screen reads a card.
   Their photos are **generated placeholders** (an inline SVG or a canvas, a tile of the plan's colour with the meal's
   initial): ⛔ **no image file is added**, since this repository is public and the photos are the Owner's.
4. **Meal names**: a stand-in list kept in the tool, never the live menu. (The synthetic store's `MEALS` is in a Node-only
   test module a browser story cannot import.)

## 4. The stories

| story | what it shows | controls |
|---|---|---|
| **Timeline** | the screen through the three waits measured on the live store (rung 2 § 13a): **A** the screen up with no meal yet, **B** the meals added 0.21 s apart, **C** CHECKOUT to the checkout, then the page *ready* and the screen removed; replayable | the profile: *unthrottled*, *Fast 4G*, *Slow 4G* (§ 13a's times, 1280 or 390); the meal count; photos: none, some, all |
| **Stage** | the screen held at one moment, for review: A, B at meal *k* of *t*, or C | the stage; *k* and *t*; photos |
| **Reduced motion** | a note on showing the screen under `prefers-reduced-motion` (the browser's rendering emulation); not a control, because a story cannot set that media feature | — |

- **Viewports**: the smoke's two widths, **1280** and **390**, offered as Storybook viewports.
- The screen is a manual popover over the whole viewport, so a story's controls are Storybook's own (its panel), never
  buttons on the canvas; and on the docs page each story renders in **its own frame** (not inline), or one story's
  screen would cover the page.

## 5. Cases (`node --test`, in the tool's own package; no network beyond the install)

| | case | expect |
|---|---|---|
| SB-1 | the site's `package.json` and lockfile | no Storybook package in either; `tools/storybook/` has its own lockfile |
| SB-2 | `build-storybook` | succeeds; its `index.json` lists **Timeline** and **Stage** |
| SB-3 | ⭐ one source | the stories import `src/storefront/progress-screen.js` and the build's two readers; the screen's style text appears nowhere under `tools/storybook/` (a copied rule fails the case) |
| SB-4 | no photograph | no image file tracked under `tools/storybook/` (the mock-ups' P1 rule, extended); the placeholders are made at run time |
| SB-5 | the timeline's times | the story's A, B and C durations for each profile equal § 13a's table (one data object, cited), so a new measurement changes one place |

## 6. Not decided here

- **The next design itself** (rung 2 § 13's direction: a *"wrapping up"* animation cut short when the page is ready, a
  morphing line in place of the bar, staged words, a sprite sheet): designed in this tool, contracted when it settles.
- **The size**: the Footer block is 9,614 bytes of 10,240 (`ace775b`); a richer screen may not fit, which is a question
  for that contract (a hosted script would be the first request the block makes), not for this one.
- **Publishing a static build** (for the Advisor to look at away from this machine): later, and his word.
