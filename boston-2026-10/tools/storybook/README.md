# tools/storybook — the microsite's states, for styling feedback

[`../../SPEC-storybook-microsite.md`](../../SPEC-storybook-microsite.md) is the contract (ruled 2026-09-30, the Advisor:
*"We need to start with the microsite please"*). Every state of the page a visitor can reach, at the phone's and the
laptop's width, by name, so a comment can say *which* state. [`../../SPEC-storybook.md`](../../SPEC-storybook.md) is the
package's first contract (the progress screen's stories), which join this package when rung 2 § 14 lands.

**The rule of this directory**: its own npm package and lockfile (Storybook 10.6.1, `@storybook/html-vite`,
`@storybook/addon-a11y`, `@storybook/addon-docs`; `puppeteer-core` 25.12.0 for its cases), so none of it enters the
site's install, which the deploy and CI run; **nothing here ships, and nothing of the page is written here** (no markup,
no style, no word: SM-4). A story shows the page **the site's own build writes**, in a frame.

## Run

```sh
npm --prefix boston-2026-10 ci                                   # the site's install: its build needs it
npm --prefix boston-2026-10/tools/storybook ci                   # this package's own install
npm --prefix boston-2026-10/tools/storybook run storybook        # the development server: http://localhost:6016/ (localhost only)
npm --prefix boston-2026-10/tools/storybook run build-storybook  # a static build in storybook-static/ (git-ignored); published nowhere
npm --prefix boston-2026-10/tools/storybook run pages            # rebuild the pages while the server runs; reload a story to see them
npm --prefix boston-2026-10/tools/storybook test                 # SM-1 to SM-8 (node --test; three static builds and headless Chrome)
```

**When Storybook starts (and when it builds)** it runs the site's build, `node build.mjs` as the deploy runs it
(`--env dev` for development), once per build and date, with that date's `--on` and an `--out` of its own:
`node_modules/.cache/fitaf-microsite/<build>/<date>/` (git-ignored with the install; `MICROSITE_PAGES_DIR` moves it).
Storybook serves them under `/microsite/`. A change to `src/template.html`, a stylesheet or `data/messages.json` shows
after a restart, or after `npm run pages` and a reload of the story (a new picks file needs a restart: the dates are
read at the start).

| path | what |
|---|---|
| `.storybook/main.js` | the stories, the two addons, `@storybook/html-vite`, telemetry and "what's new" off; the build hook (`staticDirs`: the pages under `/microsite/`, and the development build's `fonts/` and `assets/` at the root, where that page asks for them); the virtual module `virtual:microsite-pages` (the pages' manifest) |
| `.storybook/middleware.js` | the development server sends the pages with `microsite/serve.mjs`'s policy |
| `.storybook/preview.js` | the two widths as viewports, 390 (the default) and 1280; a full-bleed canvas |
| `microsite/pages.mjs` | the build hook: the site's build for each build × date, the clock script where the date is fixed, and `pages.json` beside them (`npm run pages` runs it) |
| `microsite/dates.mjs` | the Date control's three dates from `data/picks/` and `data/save.json`, with the site's own `src/worker/zoned-time.js` |
| `microsite/clock.mjs` | the one script a story adds to a page, placed before the page's own first script |
| `microsite/serve.mjs` | the policy the pages are served with: nothing from another host |
| `microsite/layout.js`, `paths.mjs` | the builds, dates, widths and URLs the stories and the hook share; where the site and the pages are |
| `stories/states.js` | each state: its fragment, what it waits for, and the page's own control it presses (by the page's element ids) |
| `stories/frame.js` | one story: the frame, its caption, the wait and the press; the controls |
| `stories/*.stories.js` | **Individual** (Start, Chosen, Chef's Choice, always open since SPEC-plan-page-refinement § 4, No picks this week, All plans (the modal)), **Family**, **Whole page** (Scroll) |
| `stories/About.mdx`, `story-list.js` | the docs page: what is shown, how to name a state, and every story by group, read from the stories themselves |
| `test/` | SM-1 to SM-8, one file per case (SM-5 and SM-8 share one walk), with their mutants in the suite: SM-3 (a served page with one CSS rule changed), SM-4 (a copied phrase, a copied rule), SM-5 (a *Chef's Choice* story on the *no picks* date), SM-8 (a server without the policy) |

`STORYBOOK_STATIC=<dir> node --test test/<case>` runs a case against an existing static build (a copy, to watch it
fail there); the suite as committed builds its own, in a temporary directory, every run.

## What a reader would misread

- **The development page's Turnstile script is refused, not loaded.** That page asks challenges.cloudflare.com for it;
  the contract says no request leaves this machine and the page's bytes are the build's, so the development server
  sends the pages with a policy that refuses another host (`microsite/serve.mjs`). Served by anything else (a static
  build opened from another server), the development page **would** make that request.
- **The Date control's fixed clock starts at noon in New York and runs on**; a story on *today* is the real clock, and
  from Friday 10-02 the week's picks are gone from *today*'s page, as from the real one.
- **A click inside a frame is the page's own**: a link to the store leaves Storybook as it leaves the page.
- ⛔ **No photograph**: no image file is added here (SM-7). The page's logo reaches the stories through the site's
  build only.
