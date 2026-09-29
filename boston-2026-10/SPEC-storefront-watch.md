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
