# boston-2026-10 — Storybook for the microsite: the page's states, for the Advisor's styling feedback. CONTRACT

**Written 2026-09-30, before any code. Status: RULED** by the Advisor the same day. Asked about the page's styling:
*"Do we have Storybook fully setup? I think that will be easier to give feedback against"* (`ts=2026-09-30T23:22:54.625Z`);
told that the only Storybook built is the progress screen's (`SPEC-storybook.md`, on `boston/rung-2-screen-next`, not
merged): *"We need to start with the microsite please"* (`ts=2026-09-30T23:28:39.919Z`). **Who reads it**: whoever builds
it, and the Advisor, who gives his feedback against its stories.

**What it is for**: one place where every state of the page a visitor can reach is shown, at the phone's and the
laptop's width, by name, so a comment can say *which* state (*"Chef's Choice · open · 390: the list's line height"*).
⛔ **Nothing here touches the Footer block, the Worker, or anything a visitor gets.** The page is shown exactly as the
site's own build writes it.

## 1. Where it lives

- **`tools/storybook/`, its own npm package**, as `SPEC-storybook.md` § 1 ruled and `tools/README.md` requires: its
  dependencies never enter `boston-2026-10/`'s install. **The package is taken from `boston/rung-2-screen-next` @
  `fc0aa49`** (`package.json`, `package-lock.json`, `.storybook/`, `README.md`): Storybook **10.6.1**,
  `@storybook/html-vite`, `@storybook/addon-a11y`, `@storybook/addon-docs`, telemetry and "what's new" off,
  `localhost:6016`. **Without the screen's stories and the screen's virtual module**, which need rung 2 § 14's
  extraction (not on this line). They join this package when § 14 lands; this contract changes nothing of them.
- `npm --prefix boston-2026-10/tools/storybook run storybook` (the development server, `localhost` only) and
  `run build-storybook` (a static build into the git-ignored `storybook-static/`). **Nothing is published.**
- `SPEC-storybook.md` is brought to this line unchanged (its §§ 3–5 and 7 describe the screen's stories, on the other
  branch until § 14), with a line at its top pointing here.

## 2. ⭐ What a story shows: the page the build writes, never a copy

1. **The site's own build makes the page.** When Storybook starts (and builds), it runs the site's build **as the
   deploy runs it**, in Node, into a directory outside the site's `dist/` and `dist-dev/` (the build's `outDir`; a
   `--out DIR` flag may be added to `build.mjs`'s command line for this, and nothing else of the site changes):
   the **production** page (eatfitaf.com's) and the **development** page (the test address's), each with the
   committed `data/picks/`. Storybook serves those files as static files.
2. **A story shows one page in a frame** (an `iframe` of that page's URL, the width of the chosen viewport), at a
   **fragment** (`#signature-7`, `#family`, …: the page's own way of reopening a choice, `SPEC.md` § 1 item 7), and
   where a state needs a press (the Chef's Choice list open, *See all plans* open), **the story presses the page's own
   control in the frame** (`#cc-toggle`, `#all-toggle`), as a visitor would.
3. ⛔ **No markup, style or word of the page is written under `tools/storybook/`.** A copied rule or phrase fails a
   case (§ 5). A change to `src/template.html`, a stylesheet or `data/messages.json` shows in the stories after a
   restart (or a rebuild on change, the builder's choice, stated).
4. **The clock.** The page chooses the week's Chef's Choice **in the browser, on the visitor's date**
   (`SPEC-chefs-choice.md` § 2), so from Friday 10-02 week B's card is gone from the real page. A story that shows the
   card **fixes the frame's clock** to a date inside a committed week's window, by **one script placed before the
   page's own**, the page's bytes otherwise exactly the build's; the story's caption names the date. The **Date**
   control offers: *today* (the real clock), *a week with picks* (the latest committed week's Thursday, `S − 3`, noon in
   `data/save.json`'s `send_time_zone`), and *no picks* (the day after the last committed window). The build's `--on`
   is the same date, so the page carries that week.
5. ⛔ **No request leaves the machine**: the page makes none (`SPEC.md` § 1), and Storybook's own are off.

## 3. The stories

Each at **390** and **1280** (Storybook viewports; 390 the default), with the **Build** control (*production* —
eatfitaf.com, the default — or *development* — the test address), and the **Date** control of § 2 item 4:

| group | story | the state |
|---|---|---|
| **Individual** | *Start* | no fragment: the Individual tab, *What's your goal?* |
| | *Chosen* | a fragment from the **Goal** (Lean · Signature · Performance) and **Meals** (7 · 14) controls: the result card |
| | *Chef's Choice · closed* | *Chosen* in a week with picks: the card's *See this week's Chef's Choice* and *Choose my own meals* |
| | *Chef's Choice · open* | the same, the button pressed: the list, its heading, the line, *Continue to checkout* |
| | *No picks this week* | *Chosen* on the *no picks* date: *Choose your meals* alone |
| | *All plans* | *Chosen*, *See all plans* pressed: the 3 × 2 grid |
| **Family** | *Family* | `#family` |
| **Whole page** | *Scroll* | the page at the chosen state, the frame as tall as the page (no inner scroll), for a look at the whole length |

- The development page's own sections (the save-offer, rung 4) appear in these stories as the page draws them;
  **their states get stories of their own later**, when the Advisor's review reaches them.
- A story that presses a control **waits for the page's own script** to have rendered (the result card shown), and
  fails visibly in its frame (a caption) if the control is absent, never silently shows the wrong state.

## 4. The docs page

The package's docs page lists every story by group, and says, in one paragraph: what is shown (the build's own page,
§ 2), how to name a state in feedback (group · story · width · build), and that the Date control's fixed clock is the
only thing a story adds to a page.

## 5. Cases (`node --test`, in the tool's own package; no network beyond the install)

| | case | expect |
|---|---|---|
| SM-1 | the site's install | the site's `package.json` and lockfile carry no Storybook package; `tools/storybook/` has its own lockfile (SB-1's rule) |
| SM-2 | `build-storybook` | succeeds; its `index.json` lists every story of § 3 |
| SM-3 | ⭐ one source | the page a story's frame loads is **byte-identical** to the site's build output for that build and date, apart from the one clock script of § 2 item 4 (checked by reading both); ⭐ mutant: a page served from a copy with one CSS rule changed fails |
| SM-4 | no copy | no file under `tools/storybook/` (outside `node_modules/` and `storybook-static/`) carries a rule of the page's stylesheets or a phrase of `data/messages.json` of ten characters or more |
| SM-5 | ⭐ the states | in headless Chrome over the static build, at 390 and 1280: *Chef's Choice · open* shows the committed week's names for the count, *No picks this week* shows no Chef's Choice button, *All plans* shows the grid, *Family* the Family panel; each story's frame at the viewport's width |
| SM-6 | the clock | *a week with picks* and *no picks* resolve to § 2 item 4's dates from the committed `data/picks/`; *today* adds no script |
| SM-7 | no photograph | no image file tracked under `tools/storybook/` (SB-4's rule) |
| SM-8 | no request | during SM-5, no request leaves `localhost` |

⚠ SM-5 needs a browser: it uses the Chrome the storefront watch already drives (`tools/storefront-watch`'s
`puppeteer-core` and its Chrome), from this package's own dev dependency or by path; the builder chooses and states it.

## 6. Not decided here

- **Publishing a static build** (for the Advisor away from this machine): later, his word.
- **The screen's stories** (`SPEC-storybook.md` §§ 3–5): with rung 2 § 14's extraction, on its own branch.
- **The checkout**: HMP's page; its styling is reviewed on the live store and the recordings.
- **The copy**: the words stay `data/messages.json`'s; a story shows them, and a change to them is the Advisor's review.

## 7. Built, 2026-09-30 — found at the build, not ruled

Red at `71fea5a` (17 tests in 7 files; 10 failing on the missing feature; SM-1, SM-4 with its two mutants, and SM-7,
which guard what the skeleton already satisfied, passing), green at `7103fa6` (17 of 17; the site's suite 446 of 446,
as on `c58313b`; the Footer block's text `914668de…`, 10,224 bytes, unchanged). The build's reading and its choices,
where §§ 1–6 left one open; §§ 1–6 are unchanged.

**⚠ A premise the build found false (§ 2 item 5).** *"The page makes none"* holds for the production page only. The
development page carries `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit">`
(`build.mjs`'s `TURNSTILE_SCRIPT_URL`: rung 4's bot check, invisible, run only when *Save* is pressed). The page's bytes
must stay the build's (§ 2 item 1, SM-3), and Chrome refuses to show a same-origin page in a frame carrying a `csp`
attribute unless the page's server opts in (tried at the build), so the refusal is the server's: every response under
`/microsite/` carries `Content-Security-Policy: default-src 'self' 'unsafe-inline' data: blob:` (`microsite/serve.mjs`),
sent by the development server (`.storybook/middleware.js`) and by SM-5's server. At rest the development page draws the
same without it; *Save* pressed in a story shows the page's own *loading* error. ⚠ A static build served by anything else
(a publish, § 6) does not send it, and the development page would then make the request. ⚠ So § 4's *"the fixed clock is
the only thing a story adds to a page"* is true of the page's bytes; the docs page also says the pages are served with a
policy refusing other hosts. **For the Advisor**: refuse it in the stories (built), or let the development page fetch
Turnstile there.

**§ 1, the package**

- From `fc0aa49`: `package.json` (its description; the development server's script gains `--no-version-updates`, since
  without it Storybook asks storybook.js.org for its latest version, a request of its own; `pages` added),
  `package-lock.json` (Storybook 10.6.1 and vite 7.3.6 unmoved), `.storybook/` (the screen's virtual module and its
  `fs.allow` removed; the smoke's viewports kept, 390 × 844 now the default, 1280 × 900), `README.md` (rewritten).
- **`puppeteer-core` 25.12.0**, the watch's exact version, is this package's own dev dependency (SM-5, SM-8); Chrome is
  the one the watch's own `chromePath()` finds (`tools/storefront-watch/lib/browser.mjs`, imported by path:
  `CHROME_PATH`, else the platform's usual place), so the watch's install is not needed. The lockfile gains 24 packages;
  none it held moved.

**§ 2, the page**

- **The build**: `node build.mjs`, `--env dev` for development, as `npm run build` and `build:dev` run it, with the
  date's `--on` and an `--out` of its own; `build.mjs` gains only the `--out DIR` flag (`build({ outDir })` existed).
  ⚠ The development build empties its `--out` first, so the flag must name a directory of its own. Six builds per start
  (two builds × three dates), in parallel, about 3 s. They need the site's install (`qrcode`; `wrangler` reads the
  development build's config); without it Storybook does not start, and says why.
- **Where**: `tools/storybook/node_modules/.cache/fitaf-microsite/<build>/<date>/`, git-ignored with the install and
  outside `dist/` and `dist-dev/`; SM-4 does not read it (the site's output, not a file of the tool's).
  `MICROSITE_PAGES_DIR` moves it (the cases do, so no two builds share one). Served under `/microsite/`. The development
  page asks for `/fonts/…` and `/assets/fitaf-logo.png` at the site's root, so its build's `fonts/` and `assets/` are also
  served at Storybook's root (in the static build, beside Storybook's own `assets/`, with distinct names).
- **A change** shows after a restart, or after `npm run pages` (the pages rebuilt in place while the server runs) and a
  reload of the story. No watch: a new picks file changes the dates, read at the start.
- **The clock** starts at the instant and runs on (`Date.now()`, `new Date()`; a `Date` given a value, and the rest of
  `Date`, untouched: a `Proxy` over the browser's own). It goes immediately before the page's first `<script>` (the
  production page's first is `#plan-data`, a JSON block), as `<script data-storybook-clock="<ISO instant>">`. *No picks*
  is noon too (§ 2 item 4 names no time). With the committed `2026-10-04.json`: *a week with picks* 2026-10-01 12:00 in
  New York (16:00Z), *no picks* 2026-10-02 12:00 (16:00Z); *today* is `zonedDate(Date.now(), send_time_zone)` when
  Storybook starts. *Committed* is read as the files in `data/picks/`, as the build reads them.
- **What the stories offer** (the builds, the dates, the goals and counts of `data/plans.json`) reaches them as the
  virtual module `virtual:microsite-pages`, the pages' own `pages.json`: the Goal control's names are the data's.

**§ 3, the stories**

- Titles `Microsite/Individual`, `Microsite/Family`, `Microsite/Whole page` (a root for when the screen's stories join);
  the group in feedback is the last part. The width is Storybook's viewport (its toolbar), not a story or a control; the
  frame is set to the viewport's width in pixels.
- Defaults: Build *production*; Date *today*, but *a week with picks* for *Chef's Choice · closed* and *· open* and *no
  picks* for *No picks this week*; Goal and Meals the first of `data/plans.json` (`#lean-7`). *Whole page · Scroll* has a
  **State** control (any other story's state; default *Chosen*) beside Build, Date, Goal and Meals.
- A story waits up to 10 s for the page's own script (the result card shown; the Individual panel for *Start*; the
  Family panel for *Family*). *Chef's Choice · closed* and *· open* need `#cc-toggle` shown, *No picks this week* needs
  it not; a press is a `click()` on the page's own control, then what it opens must show. **A pressed control is scrolled
  to the frame's top**, where the visitor who pressed it is looking (on the development build at 390 the save section is
  above the card), except in *Scroll*. A state not reached turns the caption red, with the reason; the caption is above
  the frame, since nothing is written into the page.

**§ 4**: `Microsite/About these stories` (MDX); its list is read from the three story modules, so it lists the stories
Storybook shows.

**§ 5, the cases** (17 tests in 7 files, about 35 s here; each file that needs a static build makes its own in a
temporary directory, so three builds a run, and a fourth, the SM-5 mutant's mirror):

- **SM-1** pins the four Storybook packages at exactly 10.6.1. **SM-2** wants exactly § 3's eight stories under
  `Microsite/`, and a docs entry.
- **SM-3** reads each page over HTTP at the URL the stories use, builds the same build and date afresh with the site's
  own npm scripts (`npm run build` or `build:dev`, `-- --on D --out DIR`), and wants the served page to be that one with
  exactly one clock script removed (none for *today*), placed before the page's first script, carrying the date's
  instant. Its mutant: the served `production/today` page with `body { margin: 0;` made `1px` (killed: *"not
  byte-identical to the site's build"*).
- **SM-4**: *a rule* is each `selector{declarations}` of `src/template.html`'s `<style>` elements and of `src/**/*.css`
  (an `@media`'s rules one by one, an `@font-face` whole) and each `:root` custom property, compared with whitespace,
  comments and quote style set aside. *A phrase* is each string of `data/messages.json` but its two notes about itself
  (`about`; `status`, whose `"placeholder"` is a marker, not a phrase), cut at its `{placeholders}`, each piece of ten
  characters or more, compared after the escapes a copy would carry (`&#39;`, `\'`) are undone. The cases are under
  `tools/storybook/` too, so they quote no rule and no phrase: each is read from the site when they run. Its mutants: a
  phrase with an apostrophe, JavaScript-escaped, and a rule laid out differently, each in a new file of a mirror.
- **SM-5 and SM-8 are one walk, in one file** (`sm-5-8-…`: SM-8 is *"during SM-5"*): Storybook's own manager, each story
  at both viewports, for both builds, with its own defaults, and *Chef's Choice · open* at 14 meals too, 40 visits. Read:
  the story's state; its frame's and its page's widths; the page's path (the build and the date); the open list's shown
  lines against the committed week's names for the count (`meal_qty` for a `qty` over 1); no shown `#cc-toggle` and a
  shown `#result-cta` for *No picks this week*; the grid's six links; the Family panel; the *Scroll* frame at least its
  page's height. **SM-8**: every request the browser makes not to 127.0.0.1 is recorded and refused, so nothing leaves
  even when a case fails; none was made in the walk (the manager, 40 visits, the docs page). Mutants: SM-5's, a mirror of
  the package whose *Chef's Choice · open* does not press (`press: null`), built and walked (killed: *"the list is not
  shown"* at every width, build and count); SM-8's, a server without the policy, where the development page's request for
  Turnstile's script appears.
- **SM-6** works the expected dates out from the file names by its own calendar arithmetic and `Intl`, adds a fixture of
  two weeks and one of none, reads the six pages' clock scripts, and runs the clock script in a `vm` sandbox.
  **SM-7** is SB-4's first half.

**Found, not changed**

- The a11y addon's panel audits the story's own element (0 violations, 6 passes, 1 inconclusive, on the two stories
  looked at), **not the page in the frame**.
- A link pressed in a frame leaves Storybook as it leaves the page (the store's addresses): a reviewer's click is not
  stopped.
- The site's suite on `c58313b`, before any change: twice 444 tests with 443 passing, one file crashing each time on
  Miniflare's `read ECONNRESET` under a load average near 500 (S14's, then S10's; each passes alone, 3 of 3); a third run
  at a lower load, 446 of 446.

**Checked by hand, not by a case**: the development server (`npm run storybook`) in headless Chrome: the pages under
`/microsite/` sent with the policy, the logo served at `/assets/`, *Chef's Choice · open* (390, development), *All plans*
(1280, production) and *Scroll* (390, development) ready at their widths, the pressed control scrolled into view, no
request beyond localhost; it listens on `[::1]:6016` only.

**Not done here**: nothing published or deployed; Safari and Firefox not tried (a static build elsewhere, above); the
page's own a11y; the screen's stories (§ 6).

## 8. Amendment, 2026-10-07 — the hand-off's two faces: the interstitial and the checkout, as the Footer block ships them

**Ruled by the Advisor, 2026-10-07** (Fit AF session 228): *"I have UI tweaks for the microsite, interstitial and
checkout. This is where having Storybook available will be helpful if possible."*; asked when, *"Tonight, after
picks"*. This revises § 6's *"The checkout: HMP's page; its styling is reviewed on the live store"* for the parts that
are ours, and leaves the screen's module stories (`SPEC-storybook.md`, rung 2 § 14) where they are.

### 8.1 What a story shows: the shipped block over the watch's synthetic store

1. **The block is the build's**: `scripts/build-storefront.mjs`'s output (the Footer block's text), run at Storybook's
   start as § 2 item 1 runs the site's build. ⛔ No line of the block is copied or edited under `tools/storybook/`.
2. **The store is the watch's browser fixture**, `tools/storefront-watch/test/browser-store.mjs` (the synthetic order
   page and checkout, with the store's class and element names and none of its code), **imported by path**, never
   copied, and served by Storybook's development server and static build under `/store/`, with the block placed as the
   store's Custom Scripts Footer places it. Its options (meal names, `hangAfter`, the subscription offer, the tip) are
   the fixture's own.
3. **A story opens the synthetic order page with a test link** (`#fitaf=2.…`, built by `scripts/handoff-link.mjs`'s
   `handoffLink`, the meals the fixture's own `MEALS`), in a frame of the viewport's width, and lets the block run.
4. **Photographs**: the screen and the checkout's lines show the photographs a link carries (rung 2 § 17, § 19); a story
   carries **generated placeholders** (a tile of a token colour with the meal's initial, served by the story server),
   ⛔ never a photograph file (SM-7).
5. ⛔ **No request leaves the machine** (§ 2 item 5): the fixture's own off-host references (its font link) are refused
   by the serve policy, as the development page's Turnstile script is.

### 8.2 ⚠ What the checkout stories can and cannot show

**The interstitial is entirely ours** (`#fitaf-screen` covers the page), so its stories are what a visitor sees, apart
from the photographs. **The checkout is the store's page with our block's marks and style over it**, and the fixture
is a stand-in carrying the store's names, **not its look**: a checkout story shows **which sections each step shows and
hides, our step bar, Back and Continue, the recap line and our words**, over plain markup. The store's own fonts,
colours and spacing are **only on the live store**: a tweak to how the store's own parts look is still checked live (the
rehearsal of rung 2 § 29), and each checkout story's caption says so.

### 8.3 The stories (group **Hand-off**, at 390 and 1280)

| story | the state | how it is held |
|---|---|---|
| *Screen · A* | the screen up, no meal added yet | held before the first count: ⚠ the fixture's `hangAfter` reads `0` as *off* (`if (cfg.hangAfter && …)`), so this needs a fixture option of its own, added in the watch package with a case there (builder's choice, stated) |
| *Screen · B* | meal *k* of *t* added (controls: *k*, *t* up to the fixture's meals) | `hangAfter: k` |
| *Screen · C* | every meal added, CHECKOUT pressed, before the checkout is ready | the fixture routes to `/checkout` without drawing it until the story's control releases it (builder's choice, stated) |
| *Checkout · 1 Your meals* | the deep-carted checkout, step 1 | after the hand-off, no press |
| *Checkout · 2 Delivery* | step 2 | the story presses the block's own **Continue** once |
| *Checkout · 3 Payment* | step 3 | **Continue** twice |
| *Checkout · ordinary visit* | the checkout reached without the hand-off: the store's own, unchanged (R2-50) | the checkout URL with no link |

A press is the block's own control in the frame, as § 2 item 2. ⛔ No story presses the pay button (the fixture logs
`[fixture] ORDER PLACED` if anything does; a story that logs it fails).

### 8.4 Cases (added to § 5)

| | case | expect |
|---|---|---|
| SM-9 | ⭐ one source | the block a story's store page carries is **byte-identical** to `build-storefront.mjs`'s output; the store's files are `browser-store.mjs`'s. Mutant: a block served with one rule changed fails |
| SM-10 | the states | in headless Chrome (SM-5's walk): *Screen · A* shows `#fitaf-screen` with no slide; *Screen · B* at *k* = 2 of 7 shows the step line for meal 2 of 7 (the screen's words, `handoff.step`); *Checkout · 1–3* show exactly § 25.2's sections for the step, the Total in each; *ordinary visit* shows no step bar |
| SM-11 | never pays | no story's walk logs `[fixture] ORDER PLACED` |
| SM-4, SM-7, SM-8 | extended | no copied rule or phrase of the block; no image file; no request beyond localhost, in the new stories too |

### 8.5 Not decided here

- Publishing a static build; the copy (the block's words stay `data/messages.json`'s `handoff`).
- The screen's module stories (`SPEC-storybook.md`): with rung 2 § 14.
