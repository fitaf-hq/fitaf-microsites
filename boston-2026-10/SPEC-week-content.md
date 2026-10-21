# The week as content: each Worker serves the week from its bucket. CONTRACT, before any code

**Written 2026-10-11 (Fit AF session 236), before any code.** The authority is the Advisor's, recorded in Fit AF's
`docs/decisions/2026-10-11-the-week-is-content.md` (`fitaf @ 16ca0d43`): *"When we detect a change in it, we change
the microsite … The most amount of "downtime" we should see between the microsite and the HMP site is on the order of
minutes"* and *"if the microsite requires fitaf-infra, fitaf-infra should be pre-built. We should not need 15 minutes
of CI time just to push out changes to ~24 pieces of content."* Its § 3 is the design; this contract is this
repository's part. `fitaf-infra`'s part (the buckets, the token, the Workers' bindings, the content job) is its own
contract; **the names in § 1 are the interface between the two and do not change without both**.

**Why.** Today a week's Chef's Choice is baked into the build: a picks file and a photo sheet under `data/` and
`src/assets/`, embedded into `index.html` by `scripts/chefs-choice.mjs`, so every week is a release (a pin in
`fitaf-infra`, a build, a Terraform apply on two environments: about 15 minutes of CI, measured 2026-10-10), and the
page drops a week at its `S − 3` (SPEC-chefs-choice § 2) while the store switches during the next day, so the page
offered no cart for about 16½ hours on 2026-10-09. After this contract the infrastructure is built once, and a week is
two objects written to a bucket.

## 1. The interface (fixed)

| | dev | prod |
|---|---|---|
| R2 bucket | `fitaf-microsite-content-dev` | `fitaf-microsite-content-prod` |
| the Worker's binding | `WEEK` | `WEEK` |
| the week's data | object `week/picks-data.json` | the same |
| a photo sheet | object `week/<file>.jpg`, served at `/week/<file>.jpg` | the same |
| the Worker's entry module | `src/worker/index.js` (unchanged; gains § 4's two behaviours) | **`src/worker/site.js`** (new: § 4's two behaviours and nothing else; `index.js` imports its handlers rather than copying them) |

- `week/picks-data.json` is **exactly the JSON the page's `#picks-data` element holds today** (`pageData()`'s output),
  for **one** week, with every photo-sheet URL in it pointing at `/week/<file>.jpg`.
- The buckets are **not public**: they are read only through the Worker's binding.

## 2. The page

1. **The build always carries the Chef's Choice card** (the `PICKS_STYLE`, `PICKS_CARD` and `PICKS_SCRIPT` slots), with
   a `#picks-data` holding **no week** when the build has none to embed. With no week the card is hidden and the page
   is today's fallback (*Choose your meals*): CC-4's behaviour, now reached by data rather than by leaving the slots out.
2. **The page shows the week its `#picks-data` holds; no date decides it.** The script shows the one week present
   (refusing quietly, i.e. no card, if there is more than one or none). `valid_from`/`valid_to` may stay in the data;
   the script no longer reads them. ⚠ This supersedes SPEC-chefs-choice § 2's window **for the served page**; say in
   that section's text that the window now only decides what the content command (§ 3) and a no-bucket build embed.
3. Everything else on the page is unchanged: the answer sets, the cards' words, the links, the snacks, the tiles.

## 3. The content command

`npm run content -- --week YYYY-MM-DD --out <dir>` (a Sunday; never inferred) writes, from the commit it runs in:

- `<dir>/week/picks-data.json`: `pageData()` over that one week, through the same checks as the build (§ 1 of
  SPEC-chefs-choice: `checkPicks`, the link tool's `payloadFromArgs`), with the photo sheets' URLs at `/week/<file>.jpg`;
- `<dir>/week/<file>.jpg`: each photo sheet that week's data names, copied byte for byte from `src/assets/`;
- on stdout, each file's path, size and SHA-256. **Deterministic**: two runs over one commit are byte-identical. No
  clock, no network. Exit non-zero, writing nothing, on any refusal the build would make, or a week with no picks file.

## 4. The Worker (both environments)

1. **Production gains a script** (`main`). ⛔ It does **only** what this section says: no D1, no rate limiters, no
   cron, no other route. The development Worker keeps everything it has and gains the same two behaviours.
   *(2026-10-13: the two are three since [`SPEC-analytics.md`](SPEC-analytics.md) § 4, by the Advisor's word: `POST /a`, the page's analytics, with the `ANALYTICS` and `SALTS` bindings of its § 6.)*
   *(2026-10-21: and with `data/save.json`'s `production` true, rung 4's routes, its D1, rate limiters and cron, by [`SPEC-save-offer-production.md`](SPEC-save-offer-production.md) § 4 item 2, which amends "no D1, no rate limiters, no cron" for production; its content and analytics behaviours unchanged.)*
2. **The page**: for a request that would be served the page carrying `#picks-data` (find every such route: `/`,
   `/index.html`, and any other the assets serve it under), the Worker reads `week/picks-data.json` from `WEEK`. If it
   exists, parses as a JSON object, and carries a `weeks` array of exactly one week with the shape `pageData()` makes
   (check the keys the page's script reads; do not re-implement the content command's checks), it **replaces the text
   of the `#picks-data` element** in the asset's HTML with it (`HTMLRewriter`), escaped exactly as `scriptJson` escapes
   it at build. Otherwise the asset is served **unchanged** (no week, no card), and nothing is thrown at the visitor.
3. **The photo sheets**: `GET /week/<file>.jpg` (a plain file name, `.jpg` only, no `/` or `..` in it) is served from
   `WEEK` with `Content-Type: image/jpeg`; any other `/week/` request, or an object that is absent, is a 404.
4. **Freshness**: a write must be what visitors get within a minute. Say what `Cache-Control` the page and the sheets
   now carry and why, and whether Cloudflare's own caching of assets can serve a stale page past it.
5. **The Worker must run before the assets for the page's routes** (today a request reaches the script only when no
   asset matches). Use the platform's own setting for that, name it, and keep every other route assets-first.
6. `wrangler.jsonc` mirrors the bindings and settings for both environments, as it does today (nothing is deployed from
   here; `fitaf-infra` mirrors it).

## 5. Cases (`node --test`, no network; a fake `ASSETS` and a fake `WEEK`)

| | case | expect |
|---|---|---|
| WC-1 | the bucket holds a valid one-week `picks-data.json`; a request for `/` | the response's `#picks-data` is the object's JSON, escaped as at build; the rest of the HTML byte-identical to the asset |
| WC-2 | the object absent | the asset byte for byte |
| WC-3 | the object not JSON; JSON with `weeks: []`; with two weeks; with a week missing a key the script reads | the asset byte for byte, each |
| WC-4 | `/week/chefs-choice-2026-10-18.jpg` present | its bytes, `image/jpeg` |
| WC-5 | `/week/../x.jpg`, `/week/a/b.jpg`, `/week/x.png`, an absent `.jpg` | 404 each, the bucket never read for the first three |
| WC-6 | production's Worker: any other route (`/api/save`, `/confirm/x`) | not handled by the script (assets, as today) |
| WC-7 | the page's script given one week whose `valid_to` has passed | the card shown (was: hidden) |
| WC-8 | the build with no picks files | the card markup present and hidden; the visible page equal to today's no-picks page |
| WC-9 | ⭐ **the regression**: `npm run content -- --week 2026-10-18` at this commit | `picks-data.json` equal to the `#picks-data` the production build of `409b805`, built `--on 2026-10-11`, embeds for that week, except the photo sheet's URL (now `/week/…`); the sheet byte-identical to `src/assets/photo-sheets/chefs-choice-2026-10-18.jpg` |
| WC-10 | the content command twice | byte-identical |
| WC-11 | ⭐ mutants, each red on its own cases: the rewrite skipped; the shape check that always passes; the date filter kept in the script; a path check that allows `..` | — |

The existing suites stay green: the site (654), contrast (70), the watch (192), Storybook (41). Say which goldens move
(S20's production `index.html` will, once) and why; re-record a golden only when the change is meant.

## 6. Not in this contract

`fitaf-infra`'s Terraform, token and content job; Fit AF's switch; moving anything else (offers, words) to content;
removing `data/picks/` (it stays: the content command reads it, and a commit is a week's record).

## 7. Built — found at the build, not ruled

Red at `6682bf8` (39 of the 51 new or changed cases failing on the missing feature; the 12 passing pin what does not
change: CC-4, S18's page cases, WC-8's and WC-9's controls, WC-9b), green at the commit that carries this section. §§ 1–6 are unchanged.

**What was built**

- `src/worker/site.js`, production's entry: `sheetKey`, `isWeek`, `servePage`, `serveSheet` and `serveSite` (both
  behaviours, and the assets for everything else); its default export is `{ fetch: serveSite }`. It imports one module,
  `src/worker/script-json.js`: the build's `scriptJson`, moved there so the Worker and the build share one function
  (`build.mjs` re-exports it). `src/worker/index.js`'s last step is `serveSite(request, env)` where it was
  `env.ASSETS.fetch(request)`; its own routes still come first.
- The page: `scripts/chefs-choice.mjs`'s `chefsChoice()` always returns the three slots (`dir: null`, no picks
  directory, reads nothing), and `build.mjs` always calls it. `src/chefs-choice/chefs-choice.js` shows
  `picks.weeks[0]` when `picks.weeks` holds exactly one week, else none; the zoned-date helpers are no longer inlined.
- `scripts/week-content.mjs`, `npm run content`.
- `wrangler.jsonc`: production gains `main`, an `ASSETS` binding, `run_worker_first` and the `WEEK` bucket; dev gains
  `run_worker_first` and its `WEEK` bucket:

  ```jsonc
  // top level (production)
  "main": "src/worker/site.js",
  "assets": { "directory": "./dist", "binding": "ASSETS", "run_worker_first": ["/", "/index.html"] },
  "r2_buckets": [{ "binding": "WEEK", "bucket_name": "fitaf-microsite-content-prod" }],
  // env.dev (main, D1, rate limiters, cron, vars unchanged)
  "assets": { "directory": "./dist-dev", "binding": "ASSETS", "run_worker_first": ["/", "/index.html", "/*/", "/*/index.html"] },
  "r2_buckets": [{ "binding": "WEEK", "bucket_name": "fitaf-microsite-content-dev" }],
  ```

**The choices, where §§ 2–4 left one open**

1. **The page's routes (§ 4.2, § 4.5), measured** with Miniflare's asset router under the default `html_handling`
   (`auto-trailing-slash`), through wrangler's own translation of the file: the assets answer the page with a 200 only at
   `/` (any query); `/index.html` and `/index` are their 307 to `/`. In dev, `/` and each event's `/<event-id>/`;
   `/<event-id>/index.html` is a 307, `/<event-id>` a 307 to `/<event-id>/`. `run_worker_first`'s patterns are globs over
   the path, `*` any characters, `/` included (workers-shared's `generateGlobOnlyRuleRegExp`): `/*/` is any path ending
   `/`, which only an event page answers with an asset. `/index.html` is listed so a 200 there (another
   `html_handling`) would still get the week; today the Worker passes the 307 on (WC-6c). `/week/…` needs no rule: no
   asset matches it, so it reaches the script assets-first.
2. **The Worker decides "the page" by the assets' answer** (a 200 with `text/html`), not by a list of paths, so the
   list is in one place, `wrangler.jsonc`. Any other answer (a 307, a 404, a font) is passed on as it came. A non-GET
   request goes to the assets untouched (WC-6a).
3. **Freshness (§ 4.4).** The page: `Cache-Control: no-cache`, no `ETag`, no `Last-Modified`, with or without a week;
   the assets are asked without the visitor's `If-None-Match`, `If-Modified-Since`, `If-Match`, `If-Unmodified-Since`,
   `If-Range` and `Range`. Why: the asset's ETag names the template, which does not change when the bucket does, so a
   forwarded `If-None-Match` gets the assets' 304 and the browser keeps the old week indefinitely; `no-cache` without a
   validator makes every visit fetch the page whole (WC-1c). A sheet: `no-cache` with the R2 object's own ETag, and a
   matching `If-None-Match` is a 304 (R2's `onlyIf`), so a sheet re-written under the same name (as 6cf288d re-wrote
   10-18's) is seen at the next request at the cost of one revalidation (WC-4). **Cloudflare's own caching cannot serve
   a stale week**: the week is never in an asset (the asset is the build's page, fixed per deployment); the Worker's
   response is made per request after `env.ASSETS.fetch` and is not put in Cloudflare's cache (no Cache API, no
   `cacheEverything`); a binding's R2 read is strongly consistent. So a write is what the next request gets; the only
   cache left is the browser's, which `no-cache` makes ask every time. ⚠ That is the platform's documented behaviour,
   not measured on Cloudflare (nothing is deployed from here): a zone rule on eatfitaf.com that caches responses would
   be the infrastructure's to rule out.
4. **WC-2's "the asset byte for byte"** is read as its body, status and content type; the page's cache headers (3)
   are set on that branch too, so a page kept without a week is not kept with a validator.
5. **The shape check (§ 4.2)** is the keys `chefs-choice.js` reads, no more: an object whose `weeks` is a list of
   exactly one week; `carted` absent or true/false; the week's `carts` an object of carts (`heading` text, `meals` a list
   of text, `thumbs` a list of text or null, `links` an object of text, `snack_links` absent or an object of text); its
   `snacks` absent or an object of `{ meals, thumbs }`. Not checked: `zone`, `delivery`, `valid_from`, `valid_to`
   (unread), the lengths of `thumbs` against `meals`, the form of a link. An object over 1 MiB is not read (the week
   delivered 10-18 is 31,134 bytes).
6. **The sheet's name (§ 4.3)** is matched as it arrives, never percent-decoded: `[A-Za-z0-9][A-Za-z0-9._-]*\.jpg`,
   with no `..` and no `/`. Only a GET is served: a HEAD, like any other method under `/week/`, is a 404, as § 4.3's
   letter says ("any other /week/ request").
7. **The content file** is the element's text as the build writes it: `scriptJson`'s compact JSON, every `<` as
   `\u003c`, no trailing newline. For 2026-10-18 it is 31,134 bytes, `3a7b7b5d…`.
8. **"Every photo-sheet URL" (§ 1) includes the checkout links' photo part** (SPEC-rung2-progress-and-checkout § 17.1),
   `!0!/week/<file>!…` where the build writes `!0!/assets/photo-sheets/<file>!…`: the store's Footer block asks the
   link's host for that path (it takes any `^/[\w/.-]{1,200}$`), so the progress screen's photograph comes from the
   bucket too. A manifest whose `base` is null (no photograph) is kept; an absolute one (a CDN) is kept as written and
   nothing is copied.
9. **`--env dev`, added** (accepted by the rulings below, with exactly what it changes in the output): the development
   Worker's content; the default is production's, so `npm run content -- --week … --out …` is the contract's command
   unchanged. fitaf-infra's content job passes it for the dev bucket.
10. **The content's refusals** are the build's that bear on it: every picks file read and checked as the build does (a
    broken one beside the week refuses), `checkSelection`, the `chefs_choice` words, and every sheet the manifest names
    present (`copyStatic`'s refusal); and a week with no picks file, a `--week` not a Sunday, a missing `--week` or
    `--out`, an unknown argument, and a `--out` already holding `week/` (so two weeks' objects never meet). Everything
    is made in memory first; a refusal writes nothing (WC-10). The template and the QR codes are not built.
11. **The build** needs `data/messages.json`'s `chefs_choice` words always now (the card is always carried); they were
    needed only with a week. ⛔ It embeds no week at all: the rulings below, ruling 1.

**Mutation results (WC-11, each in a mirror, `mutate-in-a-mirror`)**: the control (the unchanged mirror) passes WC-1,
WC-3, WC-5 and WC-7 (and, since the rulings, WC-12; its mutant is in § 7.1). The rewrite skipped: WC-1 red (`/: the asset unchanged`). The shape check always passing: WC-3 red
on 15 of its 17 shapes (`two weeks`, `a week without carts`, `weeks: []` among them); `not JSON` and `JSON null` survive
it, as they should: the parse fails, or there is nothing to put in, before the shape check is asked.
The date filter kept in the script (the week only until its `valid_to`): WC-7 red (`after valid_to: the week's list is
not shown`). A path check that allows `..` (only the `.jpg` ending checked): WC-5 red (`sheetKey("/week/../x.jpg")` a
key; `/week/a/b.jpg` a 200 from the bucket). Its narrow form (the `..` refusal alone removed): WC-5 red (`/week/x..jpg`
a 200).

**WC-9**: the content for 2026-10-18 at this commit equals 409b805's `#picks-data` (built `--on 2026-10-11` from its own
tree; page `c60bad49…`) once the sheet's URL is rewritten: 143 lines of the pretty-printed JSON differ, every one the
sheet's URL (the tiles' `url("assets/photo-sheets/…")` and the links' `!0!/assets/photo-sheets/…!`, now `/week/…`);
the sheet is byte-identical (`57a1e5a9…`). The page production's Worker serves with it is visibly 409b805's at the 20
fragments WC-9c reads (each answer set at one size with and without snacks, the Family tab, today's two, none).

**Counts**: the site 654 → 690 (WC-1–WC-11 are 37 cases; CC-3's five became four). Contrast 70/70. Storybook 41/41
(the count unchanged; PR-14's file builds from the fixture week, below). The watch 192/192 (unchanged; on the unchanged
tree it read 191/192, R2-52's Chrome failing to launch, `Target.setAutoAttach timed out`, while other work ran).

**Goldens moved**: S20's `index.html` (`03fcc0c1…` → `84e54136…`, the only file: the card's style, markup and script
holding no week; Q4's markup; `plan-data`'s `snacks` true); CC-8's Worker map (`index.js` moved, `site.js` and
`script-json.js` added; the Footer's text and the watch's expected Footer did not). WC-9's golden is new.

**Found (the contract, or the tree, said otherwise)**

- ⚠ **§ 2.1's "the page is today's fallback" holds visibly, not at every fragment.** With snacks carted, a week can
  reach `#picks-data` at run time, and only that element is replaced, so Q4 must be in the markup of a page with no week
  (`plan-data`'s `snacks` true), hidden by the card's script as it already was on a page whose week was not live. A `-s`
  fragment is then taken as its answer set without snacks (*Choose your meals*), where today's no-picks page takes it as
  the size alone. SPEC-snacks-in-the-cart § 4.5's "a page with no week never offers Q4" holds visibly (Q4 is never
  shown), not in the markup. MS-7's no-week case is rewritten to that; WC-8 reads no `-s` fragment and says why.
- ✅ ruled (ruling 4) **A page carrying two weeks shows none.** Storybook's PR-14 met it first: built `--on 2026-09-30`
  from `data/picks/`, the page carried 10-11's and 10-18's weeks, and so read Q4 hidden; it read Q4 shown before only
  because the browser chose 10-18's week by the real clock (it would have failed from 2026-10-16 anyway). Its file's
  page now carries the fixture week as content (one week, a snack list for 7 days), as Storybook's fixture date does.
- ✅ ruled (ruling 1) **The deployed asset carried the week of its build's date**: CI's `npm run build` embedded every
  week whose window had not ended that day, so with the bucket empty or its object invalid the page would have shown
  THAT week, with no date to retire it. No build embeds a week now.
- **WC-3's `weeks: []`**, written as the content with no week (`{ zone, carted, weeks: [] }`), is byte for byte the
  no-week build's own `#picks-data`, so a Worker that took it would still serve the asset's bytes: the case could not see
  it. WC-11's shape mutant showed it (that subcase survived it); the case uses `{ "weeks": [] }`.
- **The assets must be asked with the request's own redirect mode**: a `new Request(url, …)` follows, and the first
  build served the page at `/index.html` with a 200 where the assets give a 307 (WC-6c).
- **WC-9 pins 409b805's inputs**: an intended change to the week's inputs (the `chefs_choice` words, `data/plans.json`,
  10-18's picks file or sheet) turns it red, and it is then re-recorded (`node test/wc-09-record.mjs`) or retired.
- **Not done here**: nothing deployed, no `wrangler deploy`, no bucket written, no Cloudflare login; the page was not
  looked at in a browser on Cloudflare (Miniflare's workerd and asset router only).

### 7.1 Rulings on § 7's open questions (the orchestrator's, engineering, 2026-10-11), and what was built for them

1. **The deployed builds embed NO week.** `npm run build` and `npm run build:dev` emit `#picks-data` with `weeks: []`
   whatever `--on` is and whatever `data/picks/` holds; the bucket is the only source of a served week, so an empty or
   invalid bucket means no card, as § 4.2 says. `data/picks/` stays, and only the content command reads it.
   - **Built**: `build.mjs` reads nothing of `data/picks/`; `chefsChoice()` (scripts/chefs-choice.mjs) takes
     `{ plans, messages, zone }` and its `#picks-data` is `pageData([])`. **Removed**: the build's `--on` and `--picks`
     (and `build()`'s `on` and `picksDir`, its `picks` result and its `picks: …` report lines), `openOn`, and the test
     harness's `noPicksDir`. Nothing in the build depends on a date now. The build has always ignored an argument it does
     not know, so a command that still passes `--on` builds the same page (WC-12 runs it so). **Moved**: `--picks DIR`
     to the content command (`npm run content -- … --picks DIR`, relative to the working directory), for Storybook's
     fixture week and the cases, never the bucket's job.
   - **The case**: WC-12, `npm run build` and `npm run build:dev` run as programs in the package (`node build.mjs [--env
     dev] --on 2026-10-11 --out <tmp>`), with `data/picks/2026-10-18.json` committed (its window, 2026-10-09 to
     2026-10-15, holds 2026-10-11; a control says so): `#picks-data` holds `weeks: []` for both. Its mirror mutant, in
     WC-11: `chefsChoice` made to embed `data/picks/`'s week whose window has not ended on 2026-10-11, red on WC-12 for
     both builds (`build: #picks-data holds ["2026-10-18"], not []`). And the case run on `f4b0845`'s own tree (git
     archive, this package's node_modules linked), the commit before the ruling: red the same way.
   - **The cases that relied on a build-embedded week, and where each now takes its week.** One mechanism: the page
     the build writes (no week) with a week's CONTENT put in its `#picks-data` by `pageWithWeek`
     (scripts/week-content.mjs: the Workers' rewrite done on a file), the content made by `weekData` (the content
     command's own reading of a picks directory, every week in it, or one).
     - From a **fixture** (test/fixtures/picks, picks-v2, or a temporary picks directory a case writes): every case
       through `test/cc-harness.mjs`'s `builtPage`/`pageWithPicks`, `test/ms-harness.mjs`'s `pageOf` and
       `test/pr-harness.mjs`'s `photoPage`: CC-1, CC-2, CC-3, CC-6, CC-7, CC-8c, CC-9, MS-2–MS-5, MS-7–MS-11, MS-13,
       MS-16, PR-2, PR-7, PR-12, PR-13, PR-17; and WC-1, WC-3 and WC-7 (the content by `weekContent`, or `pageOf`). CC-2c's and CC-9's mirror cases and PR-3's run the two
       programs in their mirror (`pr-harness`'s `programBuild`: `node build.mjs`, then `node scripts/week-content.mjs
       --week S`). Storybook's fixture date and its PR Chrome cases: the content command with `--picks` the fixture.
     - From the **content command's reading of the committed weeks** (`data/picks/`, the latest committed, never a
       literal): PR-1's `bothPages`, PR-3's committed-tree case, MS-5's control (every committed week, read), and
       Storybook's *a week with picks* and *today* (the committed week whose window holds today, if any) dates.
     - **Expectations that moved with it**: a tile's sheet is the content's URL, `/week/<file>` (CC-9, PR-3, PR-7);
       CC-3e now reads the window as the content's `valid_from`/`valid_to` (the build's window cases, S − 2 and S + 5,
       are gone); CC-4 builds four mirrors (`data/picks/` as committed, removed, emptied, the fixture alone) and finds
       one page holding no week; CC-5's and MS-6's picks-file refusals are the content command's (CC-5's "a bad --on"
       case is removed with `--on`; its "ended week" case asks another week's content; its program case finds
       `npm run build` building and `npm run content` refusing); WC-8 reads the build as it is; WC-9b (the build still
       embeds the week) is removed, WC-12 being its inversion. Storybook: `microsite/pages.mjs` builds, then runs the
       content command for a date with a week and serves its sheets at `/week/`; `dates.mjs` names *today*'s week;
       SM-3's fresh page is `npm run build` then `npm run content`; a caption names the page's week, not `--on`.
     - **S20 did not move**: the page with no week is the page it was (`84e54136…`); the build no longer reads
       `data/picks/`, which S20's empty picks directory already kept out. Its empty directory (and S18's and S24's) is
       gone with `picksDir`.
2. **The `-s` fragment with no week**: accepted as built (Found, the first item).
3. **`--env dev` on the content command**: accepted; fitaf-infra's job passes it for the dev bucket. **What it changes
   in the output, exactly** (§ 3): only `week/picks-data.json`, and in it only the host code of each checkout link's
   photo part (SPEC-rung2-progress-and-checkout § 17.1): `!0!/week/<file>!` (eatfitaf.com, `PHOTO_HOSTS[0]`) becomes
   `!1!/week/<file>!` (the test address, `PHOTO_HOSTS[1]`), so the progress screen asks the development Worker, and its
   bucket, for the sheet. Nothing else: not the tiles' URLs, not the link's path, mpid or keys, not the size; the sheets
   are byte-identical. For 2026-10-18: 48 links (8 carts × 3 sizes × a link and a snack link), both files 31,134 bytes,
   `3a7b7b5d…` (production) and `931a963b…` (`--env dev`), equal once `!0!/week/` is read as `!1!/week/`.
4. **`HEAD /week/…` a 404, two weeks no card, WC-9's re-record path**: accepted as built.

**Counts after the rulings**: the site 690 → 691 (WC-12's two cases and WC-11's new mutant added; WC-9b removed; CC-5's
three window and program cases became two, "a bad --on" going with `--on`). Contrast 70/70, Storybook 41/41 and the
watch 192/192, their counts unchanged. S20's golden did not move.

## 8. Amendment, 2026-10-16: an *updating* week, the fallback at a stop after the store's switch. CONTRACT, before any code

**Why.** Fit AF's `scripts/switch/menu-mismatch.spec.md` § 5, ruled by the Advisor (`ts=2026-10-16T23:44:50.877Z`):
*"Any stop after the switch"*: once the store has turned over, last week's carts no longer work, so the page must not
keep offering them. Built by Fit AF's `scripts/switch/menu-bands.spec.md` § 5, whose file shape is the interface here.

1. **A week's picks file may be exactly** `{"delivery": "<Sunday>", "version": 2, "updating": true, "lists": {}}`
   (`data/picks/<delivery>.json`, written by Fit AF's emitter, `--updating`). The Chef's Choice check (`checkPicks`)
   accepts it; it refuses `updating` with any value but `true`, and an `updating` file with any list.
2. **The content command** (§ 3) over it writes `week/picks-data.json`: that one week, `"updating": true`, **no carts
   and no links**, no photo sheet; deterministic, as § 3.
3. **The page**: a week whose data says `updating` shows, in the Chef's Choice card's place, a card reading *"We're
   updating this week's menu."* (its words in the build's words file, `data/messages.json`, never a literal in the
   script), and the page's existing fallback stays as it is (*Choose your meals*, the store's own order page). **No
   form**: the menu-open alert's consent wording is not ruled (Fit AF `menu-mismatch.spec.md` § 5 item 5), so its form
   is a later amendment. A week without `updating` is unchanged (CC-1 to CC-9 and WC-1 to WC-12 green as they are).
4. **The Worker is unchanged**: it serves `week/picks-data.json` whatever it holds.
5. **Cases** (written first, run red; `node --test`, no network): **U1** the page over an updating week: the card shown
   with its words, no Chef's Choice cart, no checkout link anywhere in the card · **U2** the content command over an
   updating file: exit 0, `"updating": true`, no carts, no photo sheet, byte-identical on a second run · **U3** an
   updating file with a list, and `updating: "yes"`, refused by `checkPicks` · **U4** a normal week byte-identical to
   before (the page and the content). **Mutants** (each in a copy of the package): `updating` ignored by the page (U1);
   lists allowed beside `updating` (U3).

### 8.1 Built — found at the build, not ruled

Red at `552e634` (10 of U1–U4's 11 cases failing on the missing feature; U4 passing, as it must: it pins what does not
change), green at `425feee` (11 of 11; the site 716 → 727), the mutants and these notes at the commit that carries this
section (the site 730). § 8 is unchanged.

**What was built**

- `data/messages.json`: `chefs_choice.updating`, *"We're updating this week's menu."*; the build requires it, as every
  `chefs_choice` phrase (`chefsChoiceWords`).
- `src/chefs-choice/card.html`: `<p class="cc-updating" id="cc-updating" hidden>{{UPDATING}}</p>`, the card's first
  line; `style.css`: one rule, the list's box and the heading's type (tokens only, navy on white, a pair already
  measured). `src/chefs-choice/chefs-choice.js`: a week whose data says `updating: true` un-hides the card and is then
  **no week** for everything after it.
- `scripts/chefs-choice.mjs`: `checkPicks` takes the updating file (`updatingWeek`); `pageData` writes
  `"updating": true` for it. `scripts/week-content.mjs`, the build and the Worker are unchanged (CC-8 green).
- The content for an updating week, as built (production; the snacks shown and carted as committed), 166 bytes for
  2026-11-01: `{"zone":"America/New_York","carted":true,"weeks":[{"delivery":"2026-11-01","valid_from":"2026-10-23",`
  `"valid_to":"2026-10-29","updating":true,"carts":{},"snacks":{}}]}`; `--env dev` byte-identical (no link to carry a
  host code).

**The choices, where § 8 left one open**

1. **"No carts" (item 2) is `"carts": {}`, not the key left out.** Production's Worker puts the bucket's object in the
   page only if its shape check passes (`isWeek`, § 7 choice 5), and that check requires `carts` to be an object of
   carts; a week without the key would be dropped, silently, and the visitor would get the no-week page, no card. With
   `{}` the unchanged Worker serves it (U1c, through `site.js` in Miniflare). `snacks` is `{}` too while snacks are
   shown, and `valid_from`/`valid_to` are kept (unread), so the week has pageData's one shape. The page's script decides
   on `updating` before it reads `carts`, so it shows the card with the key absent as well (U1e).
2. **The page over an updating week is the page with no week, plus the card.** The script sets the week aside, so Q4,
   the snack box and *Choose your meals* (the plan's order page, the rung 1 link) behave as with no week. U1 checks it at
   all 48 individual fragments (three goals, eight answer sets, with and without snacks), both builds: the card shown
   with the phrase, no list, no *Choose my own meals*, *Continue to checkout* without a link, no control in the card, no
   `#fitaf=` anywhere in the page, and the visible page without the card equal to the no-week page's; the card hidden
   before a plan is chosen and on Family.
3. **The card's place**: inside the result card after *Choose your meals* (the `PICKS_CARD` slot follows `#result-cta`
   in the template), where the list would be. ⚠ A visitor reads *Choose your meals* and then, beneath it, *"We're
   updating this week's menu."*; whether the notice should come first is a copy and layout question, not changed here.
4. **The words are the build's, in the markup** (`{{UPDATING}}`), not in the content: a change of words is a release,
   and the content carries only `"updating": true`.
5. **The refusals' words**: `updating must be true, got "yes"` (or `false`, `null`); `an updating week carries no
   list; lists has "chefs-choice"` (any list, the shown one or another, empty or not); `lists must be an object, empty in
   an updating week`; a version-1 file with `updating` is `unknown field "updating"`; a missing `lists` is the existing
   `missing field`. The selection is still checked. Through `readPicks` (the content command) each names the file.
6. **U4's "byte-identical to before (the page and the content)"**: the content is compared whole. The page cannot be
   byte-identical, since its script must read `updating` and the build carries the card's markup and style on every page
   (§ 2.1); so § 8 adds **whole lines only, each naming `updating`** (seven in the production page) and changes none
   that was there, and U4 compares the page with those lines removed to `d1dac5b`'s byte for byte, with the visible page
   at seven fragments compared whole. "Before" is `d1dac5b`'s own tree (git archive), recorded by
   `node test/u-04-record.mjs` into `test/u-04-golden.json`, for the two fixtures and the committed 2026-10-18, both
   targets. ⚠ Like WC-9 it pins `d1dac5b`'s inputs: an intended change to them turns it red and it is re-recorded.
7. **U2 asks "no photo sheet" of a week whose manifest names one**: a mirror's `data/picks/2026-10-25.json` made
   updating (the committed weeks beside it, all checked), `npm run content` as the program: `week/picks-data.json`
   alone, though `data/photo-sheets.json` names `chefs-choice-2026-10-25.jpg`.

**Found**

- ⚠ **Item 4's "it serves `week/picks-data.json` whatever it holds" is not so of the Worker as it stands**: it serves
  what passes its shape check and drops anything else (§ 4.2). It holds for the updating week only because the content
  is made to pass the check (choice 1).
- ⚠ **Item 5's "the page … byte-identical to before" cannot hold literally** (choice 6), and S20's golden moved for it:
  `index.html` `84e54136…` → `51203bcc…`, for § 8 alone (S20 and CC-4 were green on `d1dac5b`; every asset and QR code
  unchanged). CC-1–CC-9 and WC-1–WC-12 are green as they were; CC-4 reads S20's golden, so it is green with it.

**Mutants (item 5, each in a mirror, `test/u-mutants.test.mjs`)**: the control (the unchanged mirror) passes U1 and
U3. `updating` ignored by the page (the script's branch never taken): U1 red at all 48 fragments, *the updating card is
not shown* (and nothing else: the rest of the page is still the no-week page). Lists allowed beside `updating` (the
list refusal removed): U3 red, the three updating files with a list accepted.

**Gates**: the site 716 of 716 on `d1dac5b`, 727 of 727 at `425feee`, 730 of 730 at this section's commit; `npm run
content -- --week 2026-11-01` in a copy of the package over § 8 item 1's file: exit 0 twice, one file, 166 bytes,
`398b26fd…`, byte-identical. **Not run**: Storybook and the watch (their own packages; Storybook's SM-4 reads
`chefs_choice`); the page in a browser (linkedom only); nothing deployed, no bucket written.
