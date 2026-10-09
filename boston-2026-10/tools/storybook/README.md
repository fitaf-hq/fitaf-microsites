# tools/storybook — the microsite's states, for styling feedback

[`../../SPEC-storybook-microsite.md`](../../SPEC-storybook-microsite.md) is the contract (ruled 2026-09-30, the Advisor:
*"We need to start with the microsite please"*). Every state of the page a visitor can reach, at the phone's and the
laptop's width, by name, so a comment can say *which* state. Since its § 8 (ruled 2026-10-07: *"I have UI tweaks for the
microsite, interstitial and checkout"*), also the **hand-off's two faces**, the progress screen and the three-step
checkout, as the Footer block ships them, over the storefront watch's synthetic store (the **Hand-off** group).
[`../../SPEC-storybook.md`](../../SPEC-storybook.md) is the package's first contract (the progress screen's module
stories), which join this package when rung 2 § 14 lands.

**The rule of this directory**: its own npm package and lockfile (Storybook 10.6.1, `@storybook/html-vite`,
`@storybook/addon-a11y`, `@storybook/addon-docs`; `puppeteer-core` 25.12.0 for its cases), so none of it enters the
site's install, which the deploy and CI run; **nothing here ships, and nothing of the page is written here** (no markup,
no style, no word: SM-4; nor any rule of the block). A story shows the page **the site's own build writes**, in a frame;
a Hand-off story shows **the block `scripts/build-storefront.mjs` builds**, running on the watch's synthetic store.

## Run

```sh
npm --prefix boston-2026-10 ci                                   # the site's install: its build needs it
npm --prefix boston-2026-10/tools/storybook ci                   # this package's own install
npm --prefix boston-2026-10/tools/storybook run storybook        # the development server: http://localhost:6016/ (localhost only)
npm --prefix boston-2026-10/tools/storybook run build-storybook  # a static build in storybook-static/ (git-ignored); published nowhere
npm --prefix boston-2026-10/tools/storybook run pages            # rebuild the pages and the store's block while the server runs; reload a story
npm --prefix boston-2026-10/tools/storybook test                 # SM-1 to SM-11 (node --test; static builds and headless Chrome)
```

**When Storybook starts (and when it builds)** it runs the site's build, `node build.mjs` as the deploy runs it
(`--env dev` for development), once per build and date, with that date's `--on` and an `--out` of its own:
`node_modules/.cache/fitaf-microsite/<build>/<date>/` (git-ignored with the install; `MICROSITE_PAGES_DIR` moves it).
Storybook serves them under `/microsite/`. A change to `src/template.html`, a stylesheet or `data/messages.json` shows
after a restart, or after `npm run pages` and a reload of the story (a new picks file needs a restart: the dates are
read at the start).

**At the same moment, for the Hand-off stories** (`handoff/store.mjs`): the block is built by
`scripts/build-storefront.mjs`'s own `buildStorefront()`, imported and given a directory of its own (its command line has
no `--out`, and its `dist-storefront/` is what is pasted, so it is never written); the watch's synthetic store
(`tools/storefront-watch/test/browser-store.mjs`, imported by path) is started on 127.0.0.1 for the build only, and for
each story's store (one set of the fixture's own options) its page, carrying the block as the store's Custom Scripts
Footer runs it, is fetched and written as it came; the links are `scripts/handoff-link.mjs`'s `handoffLink`, with the
fixture's own meals, for 7 and 14 meals (the counts the microsite links to). All into
`node_modules/.cache/fitaf-storefront/` (`STOREFRONT_PAGES_DIR` moves it), kept under `store/` in a static build. **The
store is served at its own paths, `/order`, `/checkout` and `/img/`** (the block runs only there), the query's `?store=`
naming the store; `.storybook/middleware.js` and the cases' server apply `handoff/serve.mjs`'s one rule. A change to the
block's source or words shows after a restart, or after `npm run pages` and a reload.

| path | what |
|---|---|
| `.storybook/main.js` | the stories, the two addons, `@storybook/html-vite`, telemetry and "what's new" off; the build hook (`staticDirs`: the pages under `/microsite/`, and the development build's `fonts/` and `assets/` at the root, where that page asks for them); the virtual module `virtual:microsite-pages` (the pages' manifest) |
| `.storybook/middleware.js` | the development server sends the pages with `microsite/serve.mjs`'s policy, and serves the Hand-off stories' store at `/order`, `/checkout` and `/img/` by `handoff/serve.mjs`'s rule |
| `.storybook/preview.js` | the two widths as viewports, 390 (the default) and 1280; a full-bleed canvas |
| `microsite/pages.mjs` | the build hook: the site's build for each build × date, the clock script where the date is fixed, and `pages.json` beside them (`npm run pages` runs it) |
| `microsite/dates.mjs` | the Date control's dates from `data/picks/` and `data/save.json`, with the site's own `src/worker/zoned-time.js`; since SPEC-meal-selection § 9 a fourth, the fixture week (the site's `test/fixtures/picks-v2/`, invented names in the picks file's version 2), built with the site build's `--picks` |
| `microsite/clock.mjs` | the one script a story adds to a page, placed before the page's own first script |
| `microsite/serve.mjs` | the policy the pages are served with: nothing from another host |
| `microsite/layout.js`, `paths.mjs` | the builds, dates, widths and URLs the stories and the hook share; where the site and the pages are |
| `stories/states.js` | each state: its fragment, what it waits for, and the page's own control it presses (by the page's element ids) |
| `stories/frame.js` | one story: the frame, its caption, the wait and the press; the controls |
| `stories/*.stories.js` | **Individual** (Start, Chosen, Chef's Choice, always open since SPEC-plan-page-refinement § 4, No picks this week, All plans (the modal)), **Family**, **Whole page** (Scroll), **Meal selection** (`meal-selection.stories.js`, SPEC-meal-selection § 6 and § 9: Goal buttons; the eight answer sets with Q4 answered no, named as the contract's table, `or · every day` … `and · weekdays · breakfast`; `and · every day · breakfast · snacks` and `or · weekdays · snacks, no list`, on the fixture week, each scrolled to its subject; while `data/plans.json`'s `snacks.carted` is true, *no list* shows Q4 hidden, as the page hides it for days with no snack list: `states.js`'s `whileCarted`, the flag reaching the stories in the pages' manifest), **Hand-off** (`handoff.stories.js`: Screen · A, Screen · B with its *k* and *t* controls, Screen · C, Checkout · 1 Your meals, · 2 Delivery, · 3 Payment, · ordinary visit) |
| `handoff/store.mjs` | the Hand-off stories' store, built at Storybook's start: the block, the links, each story's store page from the fixture, the images, and `store.json` (`node handoff/store.mjs` runs it alone) |
| `handoff/serve.mjs`, `layout.js`, `paths.mjs` | the store's one serving rule (its paths, `?store=`, the policy); the names the stories and the build share; where the block, the fixture and the store's files are |
| `handoff/tiles.mjs` | the placeholder photographs: each meal's tile, a page colour token and the meal's initial, generated as SVG text |
| `stories/handoff-states.js`, `handoff-frame.js` | each Hand-off state (its store, its link, what it waits for, the block's own control it presses) and the story itself: a frame the viewport's exact size, its caption, the wait and the press; Screen · C's *Release* |
| `stories/About.mdx`, `story-list.js` | the docs page: what is shown, how to name a state, the hand-off's stories and their limit, and every story by group, read from the stories themselves |
| `test/` | SM-1 to SM-11 (SM-5's walk also reads the Meal selection stories: each card's answer set, its answers, its cart's lines and its snacks, against the fixture week), PR's Chrome cases (`pr-chrome.test.mjs`) and MS-15's (`ms-chrome.test.mjs`: one facts block per goal, each line one line box, with a mutant), one file per case (SM-5, SM-8, SM-10 and SM-11 share one walk), with their mutants in the suite: SM-3 (a served page with one CSS rule changed), SM-4 (a copied phrase, a copied rule, a copied rule of the block), SM-5 (a *Chef's Choice* story on the *no picks* date), SM-7 (a photograph's bytes among the store's images), SM-8 (a server without the policy, for the pages and for the store), SM-9 (a store page whose block has one rule changed), SM-10 and SM-11 (one mirror: a *Checkout · 2* that stops at step 1, a *Checkout · 3* that presses the pay button) |

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
  build only; the Hand-off stories' images are generated when the store is built (the fixture's logo, a flat rectangle;
  each meal's tile).
- **The Hand-off store answers at `/order` and `/checkout`, not under `/store/`.** The block refuses any path but the
  order page's and finishes at `/checkout`, so the store must be at those paths of Storybook's own origin; only its files
  are kept under `store/`. A static build served by anything but this package's servers shows no Hand-off store at all
  (and, as above, no policy).
- **A held screen goes after 90 s** (the block's own clock, rung 2 § 2 item 4), and Screen · C after the block's own 30 s
  wait for `/checkout` unless *Release* is pressed: reload the story to see it again. That is the block, not the story.
- **The checkout is the watch's synthetic stand-in**: the store's names, not its look. Its stories show which sections
  each step shows and hides, the step bar, Back and Continue, the recap and the words; the store's own fonts, colours
  and spacing are only on the live store, where a tweak to how its own parts look is still checked.
- **The slides show the store's card images, not Fit AF's photo sheet**: a link's photo part makes the block ask one of
  its two listed hosts for the sheet, which no story may reach; the stories' links carry none, so each slide shows its
  card's image, as on a link without one (rung 2 § 2 item 2).
- **Checkout · 3 types invented entries into step 2's required fields** before its second Continue: the block refuses
  Continue while one is invalid, as on the live store. Nothing presses the pay button (SM-11).
- **The frame is the viewport's exact size** (390 × 844, 1280 × 900), so the screen centres and sizes as on that
  screen; at 390 the canvas scrolls below the caption.
