> **On this line, Storybook starts with the microsite: [`SPEC-storybook-microsite.md`](SPEC-storybook-microsite.md)** (ruled 2026-09-30) governs `tools/storybook/` here. This contract's §§ 3–5 and 7 describe the progress screen's stories, which stay on `boston/rung-2-screen-next` until rung 2 § 14's extraction lands (SPEC-storybook-microsite.md § 1).

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

## 7. Built, 2026-09-30 — found at the build, not ruled

Red at `c8979f0`, built at `4b87deb`. `storybook`, `@storybook/html-vite`, `@storybook/addon-a11y` and
`@storybook/addon-docs` at **10.6.1** (what `^10.2.1`, OurFans's range, resolves to), `vite` 7.3.6, in the tool's
lockfile.

- **The readers reach the stories through Node**: a browser story cannot run `scripts/build-storefront.mjs`, so
  `.storybook/main.js` runs `screenWords` and `screenTokens` when Storybook builds and serves their output to the
  stories as a virtual module, `virtual:fitaf-screen-inputs`. They come from `scripts/screen-inputs.mjs`, where the
  build now takes them from (rung 2 § 14's build note): importing the build itself would need the site's install.
- **The development server may read this package and the site's `src/storefront/`, nothing else of the site**; setting
  only the latter first shut out the stories themselves (a 403, seen on the first run and fixed before the commit).
  Telemetry and "what's new" are off; `storybook` serves on `localhost:6016` without opening a browser.
- **The Timeline's unthrottled profile is partly assumed**: § 13 measured only its checkout wait (4.1–4.5 s; the story
  plays 4.3), so A is shown as 0 s and B as § 13a's 1.3 s, and its caption says the source. The four 4G columns are
  § 13a's table exactly (SB-5 reads the table from the contract).
- **The placeholders are tiles in the screen's navy** with the meal's initial in white: the plan's own colour is not
  among the build's readers, and a second reader of the template is what § 3 item 2 rules out.
- **`beforeEach` clears a story's timers and removes its screen** before the next story renders, so one screen is up at
  a time; the Timeline replays on a remount or with its `loop` control.
- ⬜ **Not tested by a case**: that the development server renders a story (checked by hand at the build, in headless
  Chrome); SB-2 proves the static build only.
