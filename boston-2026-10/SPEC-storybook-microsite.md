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
