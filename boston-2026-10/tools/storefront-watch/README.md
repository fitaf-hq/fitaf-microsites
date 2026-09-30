# tools/storefront-watch — the storefront watch

[`../../SPEC-storefront-watch.md`](../../SPEC-storefront-watch.md) is the contract (§§ 1–8, cases W1–W9 and W7b–W7f), with
W10–W13 from [`../../SPEC-rung2-progress-and-checkout.md`](../../SPEC-rung2-progress-and-checkout.md) § 5. HMP
releases the store's app without notice; the cart hand-off ([`../../SPEC-rung2-cart-handoff.md`](../../SPEC-rung2-cart-handoff.md))
presses the store's own buttons, so a release can break it. This package flags every release within the hour and
smoke-tests the hand-off on the live store on each one.

**Why this is its own package**: it needs `puppeteer-core` (a browser driver, no browser download), and the site
never does. The site's install and the deploy never get it (the rule of [`../README.md`](../README.md)). It pins
`qrcode` too, at the site lockfile's version: the smoke imports the site's own payload code
(`scripts/handoff-link.mjs` → `build.mjs` → `qrcode`), and in CI only this package is installed;
`lib/site-deps-hook.mjs` resolves a site module's bare import from here when the site has no install of its own.

## Run

```sh
npm --prefix boston-2026-10/tools/storefront-watch ci          # once, and after this lockfile changes
npm --prefix boston-2026-10/tools/storefront-watch test        # W1–W13 (no network), F3/F4 verdicts, E1, P1–P2, W9d,
                                                               # W10b–W13b, rung 2's browser cases R2-41c, R2-45–R2-52 (a local
                                                               # synthetic store in headless Chrome; skipped without Chrome;
                                                               # W9d waits out fill B's real 30 s; about 2 minutes in all)
npm --prefix boston-2026-10/tools/storefront-watch run watch                  # the hourly check (§ 2)
npm --prefix boston-2026-10/tools/storefront-watch run watch -- --full        # F1–F5 regardless (as a dispatch)
npm --prefix boston-2026-10/tools/storefront-watch run watch -- --daily       # plus F3 and F4 (as at 07:17 UTC)
npm --prefix boston-2026-10/tools/storefront-watch run watch -- --full --no-browser   # F1 and F2 only: static
npm --prefix boston-2026-10/tools/storefront-watch run smoke -- --script <built file>  # § 4: a build before it is pasted
npm --prefix boston-2026-10/tools/storefront-watch run smoke -- --live --width 1280   # the store's own Footer block
npm --prefix boston-2026-10/tools/storefront-watch run accept -- --release main-<name>.js   # §§ 5, 8: the baseline, for that release
npm --prefix boston-2026-10/tools/storefront-watch run accept -- --release main-<name>.js \
    --footer boston-2026-10/dist-storefront/fitaf-handoff.html                               # and the Footer block pasted
```

`watch` exits 0 green, 1 flagged, 2 if it failed itself; `--issue` (CI) opens or updates the issue with `gh`,
`--report <file>` writes the report. `smoke` exits 0 if every width passed. `accept` exits 0 once it has written the
baseline (its first line: `accepted <entry>`), 1 when it refuses because the release named is not the live entry (on
its first read, or on a second read after the release's files), 2 on a usage error (no request made) or its own
failure; it writes nothing unless it exits 0. Chrome: `CHROME_PATH` (or
`PUPPETEER_EXECUTABLE_PATH`, or `CHROME_BIN`), else the usual install path.

| path | what |
|---|---|
| `bin/watch.mjs` | §§ 2–3 and 5: the hourly check; on a flag, F1–F5; the report; the issue |
| `bin/smoke.mjs` | § 4 on its own: `--script`, `--live`, `--width`, `--report` (`--origin` accepts only a local fixture) |
| `bin/accept.mjs` | § 5, § 8: the baseline from the live store's public files (static only), for the release `--release main-<name>.js` names and only while it is live; `--footer <file>` / `--footer null` |
| `lib/accept-command.mjs`, `lib/baseline.mjs` | `accept` itself (its arguments, lines and exit code; the tests run it against the synthetic store), and the baseline it writes, with § 8's name check before and after the release's files are read |
| `lib/store-fetch.mjs` | every request the watch makes: to `https://fitafnutrition.com`, nothing else, redirects included |
| `lib/page-scripts.mjs`, `lib/bundle-imports.mjs`, `lib/read-store.mjs` | the page's scripts, the entry, the import closure, the hashes |
| `lib/watch.mjs` | one run: which checks run when, and what flags |
| `lib/dependencies-check.mjs` | F2 |
| `lib/footer-check.mjs` | F3 (the block's version line and its text's SHA-256) and F4 (our console lines, our page errors) |
| `lib/visit.mjs` | the one ordinary headless visit F3 and F4 judge |
| `lib/smoke.mjs`, `lib/smoke-verdict.mjs` | F5: the run at each width, and its pass rule (W6); before each page closes, the page read as text (§ 7, W9) |
| `lib/faces.mjs` | rung 2's two faces, live (W10–W13, added to F5's pass): a recorder from before the page's scripts (the progress screen coming and going, its step lines, our style and mark); on `/checkout` after done, the displayed controls in `app-checkout` with our style enabled and disabled (W11), each of H1–H6 found and hidden (W12), and no active subscription switch nor *"renews every"* (W13); the rule, `facesVerdict` |
| `lib/redact.mjs` | § 7: every quoted page string redacted (`AIza…`, `sk_…`, a long base64 run → `[REDACTED]`), each console line then cut to 200 characters |
| `lib/site-code.mjs`, `lib/site-deps-hook.mjs` | the site's payload code and storefront build, imported, never re-implemented |
| `lib/issue.mjs` | § 5: one issue per release (a marker in each body and comment carries the entry and the flags) |
| `lib/report.mjs` | the report: printed, the issue's body, the CI job summary; a new entry's `Last-Modified` (§ 7, W8); a failed smoke width's page as text; the smoke's own report (`bin/smoke.mjs`) |
| `test/` | `w1`–`w7` (§ 6), `w8`–`w9` (§ 7), `w7-accept-release` (§ 8: W7b–W7f, W7f a mutant), `w10-w13-faces` (W10a–W13a on recorded outcomes, W10b–W13b in Chrome, and F2 carrying the hide list's names), `f3-f4-verdicts`, `e1` (a browser check that cannot run is a flag, not an abort), `p1`/`p2` and W9d (plumbing in a real browser, against `test/browser-store.mjs` on 127.0.0.1) |
| `test/r2-*.test.mjs`, `test/r2-browser.mjs` | ⭐ **the SITE's rung 2 cases that need a browser** (SPEC-rung2-progress-and-checkout § 5 and its § 8: R2-41c, the screen above a pop-up in the top layer, with its mutant; R2-45 and its mutant R2-46, R2-47, R2-48, R2-49, R2-51 with its mutants and R2-51b, R2-52 with real images): here because this package drives Chrome and the site's install never gets puppeteer-core. They run the site's own built text on the synthetic store, with their own readers (not `lib/faces.mjs`); the site's suite has the rest |
| `test/browser-store.mjs` | the synthetic store on 127.0.0.1: the order page, the app's shell (H1, H2, H5: links and text only), and a synthetic `app-checkout` with the contract's names only (none of the store's code or markup); options for the subscription's state, a missing shell part, generated card images (loaded, no src, still loading), a route delay, a planted hang and a pop-up in the browser's top layer |

**Inputs** (committed, beside the script they protect): [`../../storefront/`](../../storefront/README.md),
`dependencies.json` and `watch-baseline.json`.

## The checks, when

| run | fetches | then |
|---|---|---|
| hourly | the page and its entry (two requests) | unchanged: green. Changed: **F1**, then F1 in depth, F2–F5 |
| daily, 07:17 UTC | the same | also F3 and F4 (one headless visit), because the Footer can change without a release |
| dispatch | the page and every JS file reachable from its entry | F1–F5 |

- **F3 picks the smoke's script.** Our block on the live page: the link alone runs it (the store's own block).
  None: `fitaf-handoff.fill-B.console.js`, built from the checked-out source, is evaluated in the page once the
  meal cards are shown, as a person pastes it. For a paste, our once-per-load marker is set before the page's
  scripts run and removed just before the paste, so a block already on the page never runs instead.
- **The smoke reads `/checkout`; it never presses or types anything anywhere.** Fill B presses the store's
  buttons on the order page, as its contract says; the smoke only picks the meals, opens the link and reads.
- **A release's publish time (§ 7)** is the new entry file's `Last-Modified`, read from the one request the hourly
  check already makes for the entry (no second request), and shown in UTC and in Boston's time. The store deletes a
  release's files at its next release, so the time can only be read while the release is live: the issue keeps it.
- **W10–W13 (rung 2's two faces) are part of F5's pass.** A recorder, installed before the page's own scripts, notes
  the progress screen and our checkout style as they come and go (W10: seen after the first press, gone at done).
  After done, on `/checkout`, the smoke disables our `style#fitaf-deep`, reads the displayed controls in
  `app-checkout`, enables it again (W11: equal except H3, H4 and H6; a pay button displayed both ways: the displayed
  one of `.checkout__submit button` and, at 1024 px and narrower, the summary's mobile bar's `.summary__pay-button`,
  PAY NOW), reads each of H1–H6 (W12, § 9 of the two faces' contract: H1, H2's `.footer`, H3 and H4 must be found;
  H2's `.app-hmp-credit`, H5 and H6 are conditional, reported found or absent and never a failure for being absent;
  any found one must be hidden while our style is on; it waits up to 10 s for the required ones and the Total), checks
  the order is one-time (W13), and, by § 10, reports H7–H10 (the discounts, the app banner, the price rows, the tip;
  each conditional) and requires the Total (`.summary__total`) displayed (W14), W11 allowing exactly H3, H4, H6, H7,
  H8 and H10's controls to be hidden. It presses and types nothing.
  A run that never reached done is judged by W10 alone (the screen must be gone); the smoke's own rule has failed it.
- **A failed width's evidence is text (§ 7), never a screenshot**: the path, the displayed buttons outside meal cards
  (label, disabled or not), each dialog's text, the counts (never the contents) of `hmp_pending_plan_items` and
  `hmp_local_cart`, and every console line of the page, redacted and cut to 200 characters. The smoke waits for fill
  B's own verdict up to 96.4 s: fill B's longest run on a 7-meal plan (81.4 s: 10 s for the cards, 7 presses, 10 s for
  CHECKOUT, 30 s after CHECKOUT and 30 s after the extras dialog's CONTINUE) plus 15 s.

## The workflow (on `main` only; its copy is kept here)

GitHub runs a schedule only from the default branch, so `.github/workflows/storefront-watch.yml` lives on
`main`, alone, and checks out the dev line for this code and its inputs. This is its text:

```yaml
# The storefront watch (boston-2026-10/SPEC-storefront-watch.md). Each hour: has the store released a new build of
# its public bundle? On a release (or a dispatch): check what the cart hand-off depends on, and smoke-test the
# hand-off on the live store at two widths (never submitting anything). Once a day: check Fit AF's Footer block.
# A flagged run fails and opens (or updates) an issue labelled storefront-watch.
#
# It is on main only because GitHub runs a schedule from the default branch alone. The code and its inputs are the
# dev line's, checked out at run time: boston-2026-10/tools/storefront-watch/ (see its README) and
# boston-2026-10/storefront/. No secret: the runner's own GITHUB_TOKEN, for the issue.
name: storefront-watch

on:
  schedule:
    - cron: "17 * * * *" # hourly, at 17 minutes past (UTC)
    - cron: "17 7 * * *" # daily, 07:17 UTC (03:17 in Boston): also F3 and F4
  workflow_dispatch:
    inputs:
      ref:
        description: The branch or commit whose tool and inputs to run
        required: false
        default: boston/rung-4-save-offer

permissions:
  contents: read
  issues: write

# At 07:17 both schedules fire; the second run waits for the first, so it sees the first's issue.
concurrency:
  group: storefront-watch
  cancel-in-progress: false

jobs:
  watch:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Check out the dev line
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          ref: ${{ inputs.ref || 'boston/rung-4-save-offer' }}
          persist-credentials: false

      - name: Node 22
        uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: 22
          package-manager-cache: false

      # The watch's own package and lockfile only (puppeteer-core, no browser download): the site's install never
      # runs here. The browser is the runner's installed Google Chrome.
      - name: Install the watch
        run: npm ci --prefix boston-2026-10/tools/storefront-watch

      - name: Watch
        env:
          GH_TOKEN: ${{ github.token }}
          GH_REPO: ${{ github.repository }}
          MODE: ${{ github.event_name == 'workflow_dispatch' && '--full' || (github.event.schedule == '17 7 * * *' && '--daily' || '') }}
        run: npm --prefix boston-2026-10/tools/storefront-watch run watch -- --issue $MODE
```

## What a reader would misread

- **Green means "the release we accepted", not "the hand-off works".** Only the smoke test runs the hand-off, and
  only on a flag or a dispatch. Accept a release after its smoke passes.
- **`accept` takes the release by name, and refuses any other (§ 8).** HMP released eight times on 2026-09-29, twice
  within the hour after a release had passed; an accept that recorded whatever was live once took a release nobody had
  checked (reverted, `349adcb`). Name the entry the issue's title names; if another is live by then, accept writes
  nothing and says which is, and that release's own checks run on the next flag.
- **The hourly check reads names, not bytes.** Every file name in the store's bundle is a content hash, so any
  change renames the files up to the entry, and a new entry name is a release. F1 in depth compares bytes.
- **`runtime-config.js` is listed, not hashed.** It is in the page's script list the hourly check compares, but it
  is not reachable from the entry, so F1 does not hash it (SPEC § 3: "every JS file reachable from the entry").
- **The workflow's copy above is a copy.** The file on `main` is what runs; change both, in the same breath.
