# boston-2026-10 — the storefront watch: flag every store release, and smoke-test the hand-off on each flag. CONTRACT

**Written 2026-09-29, before any code**, on the Advisor's rulings of that day (via `AskUserQuestion`): the watcher runs
in **GitHub Actions** in this repository, hourly, with no secrets; and an automated headless browser may run the
hand-off on the **live** store as a smoke test, **on each flag** and before any new build of the script is pasted. His
reason: *"We know HMP drops surprise releases at random hours … we should flag any bundle changes for in-depth smoke
testing to make sure nothing breaks."*

**What it protects**: the cart hand-off (`SPEC-rung2-cart-handoff.md`), which presses the store's own buttons and so
depends on the store's page: its meal cards, its labels, its checkout path, and Fit AF's block in its Custom Scripts
Footer. A store release can change any of them without notice.

⛔ **Never**: a request to `backend.happymealprep.com` of our own (the headless page's own requests are the page's, as
for any visitor); a submitted order, or a keystroke into `/checkout`; a copy of the store's code committed (only the
few literal strings the dependency list names, as the contracts already quote); a secret; a photograph.

## 1. Where it lives

- **The code**, on the dev line: `boston-2026-10/tools/storefront-watch/`, **its own npm package and lockfile**
  (`puppeteer-core`, pinned), so the site's install and the deploy never get it (as `tools/render-flows/`).
- **The committed inputs**, beside the script they protect: `boston-2026-10/storefront/watch-baseline.json` and
  `boston-2026-10/storefront/dependencies.json`.
- **The workflow**, `.github/workflows/storefront-watch.yml`, on **`main` alone** (GitHub runs a schedule only from the
  default branch; `main` is production's page, so it gains this one file and nothing of the dev line). At run time it
  checks out `boston/rung-4-save-offer` (the dev line) for the code and inputs. Cron `17 * * * *` plus
  `workflow_dispatch`; `permissions: contents: read, issues: write`; the runner's own `GITHUB_TOKEN`, no other secret;
  the runner's installed Chrome.

## 2. Each hour: the cheap check (every request to `fitafnutrition.com`, nothing else)

1. Fetch `https://fitafnutrition.com/order?mpid=21` as HTML; list its script and module-preload URLs. **A request to
   any other host is refused by the code** (a test plants one).
2. Fetch the entry bundle (`main-*.js`) and list what it imports (static and dynamic `chunk-*.js`).
3. Compare with `watch-baseline.json` (the entry's name and the import list). **Unchanged: the run ends green**, having
   fetched two files. Changed: **flag F1** and go on to § 3.

## 3. On a flag (and on `workflow_dispatch`): the in-depth checks

| | check | flag if |
|---|---|---|
| F1 | the release: every JS file reachable from the entry, fetched, each file's SHA-256 | the file set or a hash differs from the baseline |
| F2 | **the dependencies**: each literal in `dependencies.json` (the meal card element, the title and actions classes, *Add to Cart*, *CHECKOUT*, *CHECKOUT NOW*, *CONTINUE TO CHECKOUT*, the pending-list and commit code, the Custom Scripts injection) found in at least one fetched file | any literal found nowhere |
| F3 | **Fit AF's Footer block**: one headless visit of `/order?mpid=21` with no fragment, a fresh profile; the injected block's version line and the SHA-256 of its text | absent, more than one, or not the baseline's expected block. ⬜ Before the block is placed the baseline's expected block is `null` and F3 is informational |
| F4 | **an ordinary visit costs nothing**: the same visit's console | any line from `[fitaf-handoff]`, or a page error from our block |
| F5 | **the smoke test** (§ 4), at two widths | anything but a pass |

**Run on F1** (and on dispatch): F2 to F5. F3 and F4 also run **once a day** (at 07:17 UTC, 03:17 in Boston:
the customers' quietest hour), because someone with admin access can change the Footer without a release.

## 4. The smoke test

- **Two widths**, each in a fresh profile: **1280 × 900** and **390 × 844 at ×3, mobile** (a phone in portrait).
- **The meals come from this week's menu, read from the page**: load `/order?mpid=21` (Lean, 7 meals a week) with no
  fragment, and pick the first 7 displayed meals whose card has an enabled *Add to Cart*. Build the link with the same
  payload code `npm run handoff:link` uses (imported, never re-implemented).
- **Which script**: if F3 found the live Footer block, the link alone is enough (the store runs our block: the real end
  to end); otherwise the built `fitaf-handoff.fill-B.console.js` is evaluated in the page, as a person pastes it, and the
  report says which.
- **Pass**: the console shows `[fitaf-handoff] done: /checkout`; `/checkout` lists **exactly the 7 chosen names** and
  "7 items", and the total equals 7 × the line price the page shows. The store's extras dialog may appear (fill B handles
  it). **Nothing is typed or pressed on `/checkout`**; the profile is discarded.
- **Before any new build is pasted**, a person or the orchestrator runs it locally (`npm --prefix
  boston-2026-10/tools/storefront-watch run smoke -- --script <built file>`), and the report is kept with the build.

## 5. The alert

- A flagged run **fails** and **opens an issue** labelled `storefront-watch`: its title names the flags and the entry's
  name (`main-…`); its body is the report (the diff of the file set, each missing dependency, the Footer check, the
  smoke result with its console lines). **One issue per release**: if an open issue already names this entry, the run
  comments only when the flags changed, else it adds nothing.
- **Accepting a release**: after the smoke passes (or the script is fixed), `npm --prefix
  boston-2026-10/tools/storefront-watch run accept` rewrites `watch-baseline.json` from the live store; the commit that
  lands it names the issue, which closes it.

## 6. Cases — `node --test`, no network (a synthetic store: a few lines of HTML and JS, none of HMP's code)

| | case | expect |
|---|---|---|
| W1 | the synthetic entry and imports, unchanged from its baseline | green; two fetches |
| W2 | one import renamed | F1, with the name in the diff |
| W3 | a dependency literal removed from the synthetic bundle | F2 names it; ⭐ mutant: the check that always passes, caught |
| W4 | a URL on another host in the HTML | refused, never fetched |
| W5 | the issue logic: no open issue / an open one for the same entry with the same flags / with different flags | open / nothing / a comment |
| W6 | the smoke's pass rule on recorded outcomes: done + exact names + total; a missing name; a wrong total; a `stopped:` line | pass / fail / fail / fail |
| W7 | `accept` on the synthetic store | writes exactly the baseline W1 then passes |

## 7. Amendment, 2026-09-29 — the release's time, and evidence when the smoke fails

1. **Each release's publish time**: when the cheap check finds a new entry bundle, it reads the entry's `Last-Modified`
   (one request, while the file is live: HMP **deletes** a release's files at the next release, measured 2026-09-29) and
   puts it in the report and the issue's body. The Advisor asked for a record of HMP's releases for the Owner; the issues
   are that record.
2. **When a smoke width fails, it records the page as text** (never a screenshot: the watch runs in a public repository
   and a screenshot shows the Owner's photographs): the path; every displayed button outside a meal card, with its
   label and whether it is disabled; any dialog's text; the counts of the store's pending list and cart (counts only,
   never their contents); and every console line of the page, not only ours, each cut to 200 characters, with anything
   that looks like a key or token (`AIza…`, `sk_…`, a long base64 run) replaced by `[REDACTED]`.
3. **The smoke waits for fill B's own verdict** (its `done` or `stopped` line) with a ceiling above fill B's longest wait
   (§ 11 of the rung 2 contract: 30 s after CHECKOUT).

| | case | expect |
|---|---|---|
| W8 | a synthetic release with a `Last-Modified` | the time appears in the report and the issue body |
| W9 | a synthetic smoke failure at 390 px (the store never routes) | the report lists the displayed buttons, the dialog text, the counts and the console, with a planted `AIza…` key redacted |

**Found at the build, 2026-09-29** (red first at `a355eab`, built at `c1764c1`). The build's choices, not rulings; § 7
above is unchanged.

- **The publish time** is read from the response to the entry request the hourly check already makes: no second
  request and no other method (W8 counts them). It is reported only when the entry's name differs from the
  baseline's, as the new entry's `Last-Modified` with the same instant in UTC and in Boston's time; an entry sent
  without one is reported as such. ⬜ Whether the live store sends `Last-Modified` for `main-*.js` was not checked at
  this build: it made no request to the store.
- **The evidence** is read before each page closes, at every width, and shown only for a width that failed; if fewer
  than 7 meals could be chosen, the menu page is the one recorded. A dialog is a displayed `[role=dialog]`,
  `[role=alertdialog]`, `dialog[open]` or `[aria-modal=true]`, the outermost only, read text node by text node and
  joined with spaces (on the synthetic store, W9d found `textContent` running a dialog's title into its buttons). The two lists are counted as
  entries: a list's length, or for an object the lengths of its lists added up; otherwise `absent`, `unreadable` or
  `not a list`. ⬜ The store's own shape of `hmp_pending_plan_items` was not established at this build.
- **Redaction**: `AIza` and 10 or more key characters; `sk_…`; any run of 32 or more base64 or base64url characters
  that holds a digit and a letter. It applies to every quoted string (button labels, dialog text, console lines, page
  errors); then each console line is cut to 200 characters (199 and `…`), so a key across the cut is never half shown
  (W9b). The tests' planted keys are assembled at run time: no key-shaped literal is committed.
- **The smoke's ceiling** is 96.4 s: fill B's longest run on a 7-meal plan, 81.4 s (10 s for the cards, 7 presses of
  200 ms, 10 s for an enabled CHECKOUT, 30 s after CHECKOUT, 30 s after CONTINUE TO CHECKOUT), plus 15 s. W9e reads
  fill B's poll constants from the built text and recomputes it.
- **W9d** runs the 390 px failure in headless Chrome against the synthetic store, whose CHECKOUT now can open a
  "Sign in to continue" dialog that never routes; it waits out fill B's real 30 s (about 40 s in all).

## 8. Amendment, 2026-09-29 — `accept` names the release it accepts, and refuses any other

**Why**: HMP released at least eight times on 2026-09-29, twice within the hour after a release had passed the watch's
checks. An `accept` run ~35 minutes after issue #2's checks passed recorded **whatever was live**, which was already the
**next** release (`main-BW2QKUMF.js`, never checked); it was noticed from the printed name and reverted (`349adcb`). An
operation named after a checked thing must take that thing's name.

1. **`--release <entry>` is required**: the entry bundle's file name exactly as the issue's title names it
   (`main-2HXLHIG7.js`). Without it, or with anything not of the form `main-<name>.js`, `accept` prints its usage,
   writes nothing, and exits non-zero.
2. **The live entry must be that one**: `accept` reads the page's entry first; if it is not the named release it
   refuses, printing both names (*"the live entry is main-X.js, not main-Y.js: a newer release has landed; its own
   checks run on the next flag"*), writes nothing, and exits non-zero. It reads the entry **again after** fetching the
   release's files, and refuses the same way if it changed meanwhile.
3. **What it prints on success** names the release, the issue's own words included: `accepted main-X.js`, then as
   now.
4. `--footer <file>` and `--footer null` are unchanged, and are refused like everything else when the release does not
   match. The baseline file's shape is unchanged.

| | case | expect |
|---|---|---|
| W7b | `accept --release <the synthetic entry>` | writes exactly W7's baseline; prints `accepted <entry>` |
| W7c | `accept --release main-OTHER.js` on the synthetic store | refused, naming both; the baseline file byte-identical to before; exit non-zero |
| W7d | `accept` with no `--release`, and with `--release chunk-X.js` | usage; nothing written; exit non-zero |
| W7e | the synthetic store's entry changes between the first read and the second | refused; nothing written |
| W7f | ⭐ mutant: the name check that always passes | W7c fails |

## 9. Found at the build, 2026-09-29 — W10–W13 in the smoke (SPEC-rung2-progress-and-checkout § 5), not ruled

Red first at `5acc962`, built at `7b0d74f`. § 4's pass rule (W6) is unchanged; a width passes only if it and W10–W13
(`lib/faces.mjs`) both pass.

- **W10** is read by a recorder installed before the page's own scripts (`evaluateOnNewDocument`, in both the paste
  and the live mode): a MutationObserver noting the screen's arrival and going, each text of its step line, our style
  and our mark. Pass: the screen appeared, showed a meal added, and was gone at done. A run that never reached done is
  judged by W10 alone (the screen must be gone at the end); the smoke's own rule has already failed it.
- **W11–W13** are read on `/checkout` after done: our `style#fitaf-deep` disabled, the displayed controls in
  `app-checkout` read, the style enabled again (W11; since the first live smoke, SPEC-rung2-progress-and-checkout § 9,
  the pay button is the displayed one of `.checkout__submit button` and the mobile bar's `.summary__pay-button`); H1,
  H2's `.footer`, H3 and H4 found and the conditional ones reported (W12, § 9), each found one hidden while the style
  is on, waiting up to 10 s for the required ones; no active subscription switch (class `…--active` or `aria-checked="true"`) and no *"renews every"*
  inside `app-checkout` (W13). Nothing is typed or pressed. The report gives each width one line for them.
- **W14** (SPEC-rung2-progress-and-checkout § 10): H7–H10 reported under W14, each conditional, a found one still
  displayed with our style failing; the Total found and displayed with it; W11's allowed controls re-stated (H3, H4,
  H6, H7, H8, H10). The reading also waits for the Total. `dependencies.json` gains § 10's 11 names (35 in all).
- **W15** (§ 12 of the same contract): a report per width, not a pass rule. The recorder notes the store's extras
  dialog and its `app-checkout` arriving; the report says whether the pop-up opened (expected: not) and the seconds
  from the last step line, written just after fill B's press of CHECKOUT, to the checkout. `dependencies.json` gains
  `"ecc_additions_prompt_handled"` (36).
- **`dependencies.json` gains 11 literals** (23 in all; 24 with § 9's `"summary__pay-button"`): `"app-checkout"`, the hide list's names, and
  `"checkout__submit"`, each found in the accepted release's files (checked over a local copy whose 156 files match the
  baseline's hashes; no request made). H2's footer is `[1,"footer"]`, since `"footer"` alone is in 23 files.
- **Cases**: W10a–W13a on recorded outcomes; W10b–W13b in Chrome against the synthetic store (a pass at both widths,
  then each made to fail: a text with no screen, R2-46's mutant, a store with no pop-up host, a plan defaulted to a
  subscription); and a check that F2 carries every name. The synthetic store gains the app's shell (H1, H2, H5), a
  synthetic `app-checkout` with the contract's names only, generated card images, a route delay, a planted hang and a
  top-layer pop-up. This package's suite also runs the site's rung 2 cases that need Chrome (R2-41c, R2-45–R2-52's
  browser half), because the site's install never gets puppeteer-core.
- ⬜ **Not run against the live store**: no request to it was made at this build. The first live smoke with W10–W13 is
  the orchestrator's, before any paste.

## 10. Found at the build, 2026-09-30 — W16 and the longest run (SPEC-rung2-progress-and-checkout § 15), not ruled

Red at `4657335`, built at `d57a273`. § 4's pass rule (W6) is unchanged; a width passes only if it, W10–W14 and W16
all pass.

| | case | expect |
|---|---|---|
| W16 | the Fit AF logo, live, both widths (§ 15.3 of the two faces' contract: the store's own `img.header__logo-image`, in an img of ours, alt "Fit AF") | reported found or absent on the progress screen and on the deep-carted checkout; **absent fails the width** |

- **W16 as built** (`lib/faces.mjs`): the recorder notes the logo arriving in `#fitaf-screen` (`img[alt="Fit AF"]`,
  once); on `/checkout`, read with W11–W14, the checkout's logo is an `img[alt="Fit AF"]` that is a **child** of
  `app-checkout` (where the block puts it, so an image of the store's own inside the checkout is never read as ours),
  **found and displayed**. Its own rule, `logoVerdict`, beside `facesVerdict` (`lib/smoke.mjs` runs both), judged only
  once fill B reached done, as W11–W14; a stopped run is failed by the smoke's own rule and judged by W10 alone. The
  report gives each width a W16 line.
- **Cases**: W16a on recorded outcomes (both found; absent on the screen; absent on the checkout; there but not
  displayed; the checkout not read; a run not done, not judged); W16b in Chrome against the synthetic store, both
  widths passing with both logos found and the header's image requested once per page the smoke loads and never by a
  logo of ours, and a store without a header logo failing on W16 alone, naming both. The synthetic store's header
  gains the store's logo as a generated SVG rectangle (`/img/logo.svg`, `no-store`; `missing: ["logo"]` leaves it
  out), never a photograph. The watch's R2-52 counts the slides' images as `#fitaf-screen .c img`, since the screen now
  carries the logo too.
- **The longest run (W9e)**: fill B now waits up to 30 s for the first meal card before its 10 s for the meals (§ 15.2
  of the two faces' contract), so `FILL_B_LONGEST_MS` is 111.4 s (30 s + 10 s + 7 presses of 200 ms + 10 s + 30 s +
  30 s, was 81.4 s) and the smoke's ceiling `HANDOFF_MS` 126.4 s (was 96.4 s). W9e reads the fourth constant,
  `NO_CARDS`, from the built text.
- ⬜ **`header__logo-image` is not in `dependencies.json`**: not asked, and not checked against the release's files (no
  request made). A rename shows as W16's absent at the next smoke.
- ⬜ **Not run against the live store**: no request to it was made at this build. The rehearsal (the smoke with
  `--script` on this build's console file, both widths) is the orchestrator's, before the paste; the baseline's
  expected Footer stays the live block's until the paste and `accept --footer`.

## 11. Found at the build, 2026-10-02 — the walk and W20 (SPEC-rung2-progress-and-checkout § 25), not ruled

The three-step checkout's build (`ba9eabc`); its § 26 has the whole of it. In short, for this contract:
- **The walk** (`lib/faces.mjs` `walkSteps`): when the block draws its steps (its foot, `#fitaf-nav`, in `app-checkout`),
  W10–W13's readings are taken at step 1 (done), after the block's OWN Continue (step 2), and after Continue again.
  ⚠ The smoke types nothing, and the store's step-2 fields are required, so the second Continue is **refused** (as the
  block's § 25.3 requires): the smoke records the refusal and enters step 3 by the block's own class, and its report
  says so. The smoke still presses nothing of the store's.
- **W11 as amended**: measured at each step with that step's allowance; the pay button displayed at step 3 and at no
  other; the hide list judged over all three steps. **W20** (not W19, which is § 21's): each step's sections and the
  Total, a line in the report. A block without steps (the live one before the paste): one reading, W20 *"no steps"*, not
  a failure.
- ⬜ Not run against the live store.

## 12. Amendment, 2026-10-09 — F6, the week's cutover. CONTRACT, before any code

**Why**: the store switches to the next week's menu on a Friday at a time nobody knows, and until the next week is
released the plan page offers no cart (`SPEC-chefs-choice.md` § 2). On 2026-10-09 the switch was watched by a loop on
one machine, outside any repository. **The Advisor**, 2026-10-09: *"we're supposed to have a process that's watching the
store for a cutover. This should be a FAST redeployment"*; and (2026-10-02) a ten-minute loop is the default for this
kind of check. The watch already runs every ten minutes, so the cutover becomes one of its checks.

1. **F6 — the menu**: one headless visit of `/order?mpid=21` with no fragment (the F3 visit's own launcher, a fresh
   profile; on a run where F3 runs, the same visit), reading **the page's own** `/catalog/products` response, as
   `lib/probe-snacks.mjs` reads it: **the watch's code never requests the backend's host** (§ 2's refusal stands and its
   test still passes), and the request's URL is recorded as host, path and parameter **names** only, never a value
   (the storefront's key travels in it). From the response: the names of the products in the `all-meals` category,
   each reduced to its key by `src/storefront/meal-key.js`.
2. **When**: on every scheduled run **from Friday 00:00 in New York** (`data/save.json`'s `send_time_zone`) **until
   a switch has been seen that Friday**, and on a dispatch. On any other day F6 does not run and the run fetches what it
   fetches today. A seen switch is recorded by its issue (item 4), so later Friday runs find it and stop.
3. **The flag**: `watch-baseline.json` gains `menu`: the accepted week's keys. **F6 flags when fewer than half of the
   baseline's keys are still in the page's menu** (a new week). Any smaller change (a meal added or renamed mid-week,
   as Thai Basil Beef was on 2026-10-09) is reported in the run's text and not flagged.
4. **The alert**: a flagged F6 opens an issue labelled `storefront-watch` titled *"storefront-watch: the menu switched
   (N of M keys new)"*, its body the new names in the page's order. It is a signal to start the next week's release,
   not a fault: the run fails so the issue opens, as every flag does (§ 5).
5. **Accepting**: `accept --menu` writes the live menu's keys into the baseline, in the commit that releases the next
   week; it names the issue, which closes it.
6. **Public**: names only (the store's own, as any visitor reads them); no price, no photograph, no key, no internal
   figure. Nothing is pressed and nothing is typed.

**Cases** (§ 6's synthetic store, no network): W22 the synthetic store serving menu A and the baseline A: F6 green;
serving B (a new week): F6 flags, the title counts the new keys; W23 one meal added to A: not flagged, reported; W24
a Tuesday: F6 not run, and the run's requests are today's; W25 an open *"menu switched"* issue for this Friday: F6 not
run; W26 the backend host is requested by the page and never by the watch's code (§ 2's planted request still refused);
W27 the report and the issue carry no parameter value. **Mutants**: the half-rule inverted fails W22/W23; the day
gate removed fails W24.
