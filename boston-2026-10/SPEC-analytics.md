# boston-2026-10 — analytics that identify no one, counted in our own Worker. CONTRACT

**Written 2026-10-13, before any code.** Status: **written**; built on branch `boston/analytics`. ⛔ It is merged into the
development line only after Friday 2026-10-16's release, and it is live before 2026-10-23 (§ 8).

**The Advisor's words**:
- *"I'd also like to get cookieless, GDPR/etc-friendly analytics working prior to Boston. We're just looking for unique
  visitor counts and how far they got down the funnel"* (2026-10-13).
- And on the design the same day (`AskUserQuestion`, `ts=2026-10-13T23:37:05.439Z`): *"If we can roll our own analytics via the Worker (perhaps leveraging an open source
  framework/library), then I more than happy to keep things simple and \*not\* involve PostHog. I'd like to see page +
  each answer + click-through. If possible, I'd also like to get a sense of session length and other general diagnostic.
  I really just want to gather \*non-intrusive\* analytics that truly can help improve the experience. I have zero desire
  to do any sort of complex AdTech / data broker approach … That's why I said GDPR in spirit – because even if it's a
  higher bar than we are mandated to hold ourselves to, I do think it is the correct bar for what we are doing."*

## 0. What it becomes

The Advisor can read, per day: **unique visitors**; **how far each visit got** (the page opened → each question answered
→ the result shown → the click-through to the store); **how long a visit lasted**; and a few **coarse diagnostics**
(device class, viewport width band, country, load time, whether a script error happened). The data identifies no one.
It is kept by the Worker that already serves the page, in Cloudflare's **Workers Analytics Engine** (our existing host;
no new company sees a visitor).

**Prior art, not adopted**: [Counterscale](https://github.com/benvinegar/counterscale) (MIT) is self-hosted analytics on
the same two Cloudflare products. Its tracker is a separate client script and it installs by `wrangler`, and neither fits
here: this page loads no script from a file (T5), and nothing is deployed by `wrangler` (the README, *"Deploys are not run
from here"*). We take its storage choice and write the rest small.

## 1. The bar: GDPR in spirit

1. **Nothing is stored on the device**: no cookie, no `localStorage`, `sessionStorage` or IndexedDB, nothing.
2. **Nothing that identifies a person leaves the Worker's memory**: not the IP address, not the user agent, not a query
   string, not text a visitor typed (the page has none). Every value recorded is either from a closed vocabulary (§ 3)
   or a number.
3. **No third party**: the page sends nothing to any host but its own, and the store's page gains nothing: the hand-off's
   *"⛔ Never … a request"* (`SPEC-rung2-progress-and-checkout.md`) stands. No PostHog, **no Meta pixel**, no ad tag,
   named here so their absence is not read as pending.
4. **Coarse by construction**: country from the platform's own header (`request.cf.country`), never a city or a region;
   device class (`phone` · `tablet` · `desktop`) derived in the Worker, the user agent then discarded; viewport width in
   four bands (`<400` · `400–767` · `768–1199` · `≥1200`).
5. **Retention** is the store's own limit (Analytics Engine's, read from Cloudflare's documentation at the build and
   stated in the build notes). Nothing is copied out except aggregate reports (§ 5).

## 2. Visitors and visits, without a cookie

- **A visitor** is `v` = the first 16 hex digits of SHA-256(`salt_d` ‖ IP ‖ user agent ‖ host). **`salt_d` is random, one
  per UTC day**, held only in a KV namespace with an expiry of at most 48 hours, and created on the day's first event.
  When a day's salt expires, nobody (including us) can link that day's visitors to another day's, or recompute a `v` from
  an IP. ⚠ Two isolates racing on a day's first events may create two salts; that counts some visitors twice on that
  day. The build measures how often, and states it.
- **A visit** is one page load: `s`, a random id made in the page's memory at load (`crypto.getRandomValues`) and never
  stored. Each event carries it. A reload is a new visit.

## 3. The events (a closed list; anything else is refused)

| event | when | carries |
|---|---|---|
| `open` | the page's script starts | `s`, the viewport band, load time in ms (`performance.now()`), the QR event id if the URL names one (§ 9) |
| `answer` | a question is answered | `s`, the question and the answer, each by the page's own id for it (the goal, and Q1–Q4 as `app.js` and `data/plans.json` name them; the build lists the vocabulary in its notes, never invents one) |
| `result` | the result card shows a plan | `s`, the answer set's key (`selection.mjs`'s, e.g. `or-5d`), the plan's `mpid` |
| `click` | a link to the store or "See all plans" is pressed | `s`, which link (`order` · `chefs-choice` · `all-plans`), the `mpid` where it has one |
| `leave` | `pagehide` (or `visibilitychange` to hidden, once) | `s`, the visit's length in ms, the deepest step reached |
| `error` | the first uncaught script error of the visit | `s` only: ⛔ never the message or stack |

The Worker adds `v`, the country and the device class to each. **The click-through is a beacon sent as the link is
pressed; the link itself is unchanged**, so the hand-off's URL and fragment are exactly as today.

## 4. Transport

- The page: **one** call site, `navigator.sendBeacon('/a', <JSON>)`, same-origin. At most 20 events a visit.
- **T5 is amended, not removed**: the built page may contain exactly one `sendBeacon` and its URL must be `/a`; still no
  `fetch`, no `XMLHttpRequest`, no script or stylesheet `src`, no other host.
- The Worker (`src/worker/site.js`, production and development): a route **`POST /a`** that checks the body against
  § 3's vocabulary (and the size: at most 2 KB). Anything else is dropped. It writes one Analytics Engine data point per
  event (`blobs`: the event and its fields; `doubles`: the numbers; `indexes`: `v`) and answers `204` in every case.
  ⛔ It writes no IP and no user agent in any field.
- `SPEC-week-content.md` § 4's *"ONLY two things"* becomes three, by the Advisor's word above.

## 5. Reading it

`npm run analytics -- --from YYYY-MM-DD --to YYYY-MM-DD [--env dev]`: Analytics Engine's SQL API, with a read-only token
taken from the environment (the Advisor's, never in this public repository), printing per day:
- unique visitors and visits;
- the funnel (`open` → each `answer` → `result` → `click`) with counts and the drop between steps;
- visit length (median and quartiles);
- device, viewport band and country splits;
- the number of visits with an `error`.

Aggregates only, never a row per visit.

## 6. Infrastructure (mirrored by the infrastructure code, applied by CI)

The two Workers gain an **Analytics Engine dataset** binding `ANALYTICS` (one dataset per environment) and a **KV
namespace** binding `SALTS`. `wrangler.jsonc` names them for local preview; the infrastructure repository mirrors them in
its own amendment, applied by CI. ⛔ Nothing is deployed from here.

## 7. Cases — `node --test`, no network (the Workers in Miniflare, as WC-1–WC-12 do)

| | case | expect |
|---|---|---|
| A1 | T5 amended | the built page has exactly one `sendBeacon`, to `/a`, and nothing else T5 forbids |
| A2 | a stub window whose storage APIs throw if touched | a whole visit (open, four answers, result, click, leave) touches none |
| A3 | `POST /a` with an event or a field outside § 3, or over 2 KB | `204`, nothing written |
| A4 | a request with a known IP and user agent | no written field contains either |
| A5 | the same IP and user agent, one day then the next | the same `v` within a day, a different `v` the next |
| A6 | the salt's KV write | an expiry of at most 172,800 s |
| A7 | one visit's events | one `s` |
| A8 | `leave` | carries a length ≥ 0 and the deepest step |
| A9 | pressing the order link | the beacon is queued and the link's `href` (with its fragment) is unchanged |
| A10 | `error` | carries no message or stack |
| A11 | `npm run analytics` against a fixture SQL response | the per-day report, aggregates only |

**Mutants**, each in a mirror, each killed by its own case: the IP written into a blob (A4) · `localStorage` used for
`s` (A2) · the salt written without an expiry (A6) · the vocabulary check removed (A3).

## 8. When

Built now, on `boston/analytics`. ⛔ **Not merged into the development line before Friday 2026-10-16's release**: the
unattended switch's chain must not meet a new route. After the release: the merge, the infrastructure's amendment by CI,
a look on dev (a visit made by hand appears in the report), then production **before 2026-10-23**, when the Owner may show
the page in Boston.

## 9. For the Advisor (not blocking the build)

1. **The consent wording** (`consent/DRAFT.md`, not approved): whether it should say that aggregate, cookieless counts are
   kept. Transparency costs one sentence; the wording is the Owner's.
2. **Per-event counts**: `data/events.json` has one event today, `https://eatfitaf.com/`. A QR code per occasion
   (`?e=<id>`) would let the report split the seminar on 10-23 from the event days 10-26 to 10-29. The page reads the
   id against `data/events.json`; anything else is recorded as no event.

## 10. Built — found at the build, not ruled (2026-10-13, the agent)

§§ 0–9 are unchanged. Red at `0749f8b` (the cases alone, on `a241cab`'s code), green at the commit that carries this
section.

**Gates, before and after** (each command's result line):

| | before | after |
|---|---|---|
| `npm --prefix boston-2026-10 test` (the whole `node --test` suite) | `a241cab`: `# tests 691` `# pass 691` `# fail 0` | `# tests 723` `# pass 723` `# fail 0` (32 new: A1–A11's 27 and the mutants' five) |
| the 44 new or amended cases (`a*`, T5, S18, WC-6), red | `0749f8b`, from a clean `git archive`: `ℹ tests 44` `ℹ pass 10` `ℹ fail 34` | all 44 pass in the suite above |
| `npm --prefix boston-2026-10 run contrast` (not in the test path; B2 runs it) | `70 pairs, 70 pass, 0 fail` | `70 pairs, 70 pass, 0 fail` |

The 10 that passed red pin what does not change: A2's harness control, S18's seven other cases, WC-6a and WC-6c. The
34 failed on the missing feature: `POST /a` was the assets' 404, the page sent no beacon, `scripts/analytics.mjs` did not
exist, and the mutants' anchors were not there. The hand-off's cases (`r2-*`, 255 tests: 253 named R2- and R2-73–75's
two mutants) pass unchanged, 255 of 255 run alone (`node --test test/r2-*.test.mjs`: `# tests 255` `# pass 255`), as
they did in `a241cab`'s 691; WC-1–WC-12 (39 tests) pass, `# tests 39` `# pass 39`, as before, but for the two amendments
below (WC-6b, WC-8's control).

**The mutants** (`test/a-mutants.test.mjs`, each in a mirror, `mutate-in-a-mirror`, each run through THE SAME check its
case runs, `test/a-checks.mjs`): the control (the unchanged mirror) passes A2, A3, A4 and A6 with no problem line. The IP
written into a blob (the country's blob holds `CF-Connecting-IP`): A4 red, 12 problems, `data point 1 carries
"203.0.113.7"`. `localStorage` used for `s`: A2 red, 7 problems, `touched localStorage`. The salt written without an
expiry: A6 red, 4 problems, `the salt written with no expiry` and `SALTS holds salt:2026-10-23 with no expiration`. The
vocabulary check removed (any JSON object an event): A3 red, 54 problems, `an event outside § 3: written (1 data
point(s))`.

**What was built**

- `src/analytics.js`, the page's script: inlined by the build (`build.mjs` `analyticsSlot`, the template's new
  `{{ANALYTICS}}` slot, one line before `#plan-data`) into every page, production's and development's, **before**
  `app.js`, so its `error` listener is there first. It reads what `app.js` and the Chef's Choice card render and changes
  nothing: `app.js`, the card's script and every link are byte-identical. The build writes `data/events.json`'s ids in
  place of its `/*QR_IDS*/[]` and removes its whole-line `//` comments, blank lines and indentation.
- `src/worker/beacon.js`, `POST /a`; `src/worker/site.js` routes it (`serveSite`, so the development Worker has it too).
- `scripts/analytics.mjs`, `npm run analytics`.
- `wrangler.jsonc`, both environments:

  ```jsonc
  "analytics_engine_datasets": [{ "binding": "ANALYTICS", "dataset": "fitaf_microsite_analytics_prod" }],  // dev: _dev
  "kv_namespaces": [{ "binding": "SALTS" }],
  ```

**The vocabulary** (§ 3; each list read from the file named, never invented; the Worker refuses anything else):

| field | values | from |
|---|---|---|
| `event` | `open` `answer` `result` `click` `leave` `error` | § 3 |
| `s` | 16 hex digits (64 random bits) | § 2 |
| `viewport` (`open`) | `<400` `400-767` `768-1199` `>=1200` | § 1.4, written in ASCII |
| `load_ms` (`open`), `length_ms` (`leave`) | an integer, 0 to 86,400,000 | `performance.now()` |
| `qr` (`open`) | `""` or an id of `data/events.json`: `demo` today | § 9 |
| `question` → `answer` (`answer`) | `goal` → `lean` `signature` `performance` (`data/plans.json`'s `individual` ids); `lunch_dinner` → `or` `and`; `weekends`, `breakfast`, `snacks` → `yes` `no` | `app.js`'s `data-goal`, `data-q`, `data-a`; `build.mjs`'s `QUESTIONS` (A3 holds the Worker's copy equal to it and to the built page's buttons) |
| `key` (`result`) | `or-7d` `or-5d` `and-7d` `and-5d` `or-7d-b` `or-5d-b` `and-7d-b` `and-5d-b` | `selection.mjs`'s `ANSWER_SETS` and `answerKey` |
| `mpid` | `result`: the 15 individual mpids of `data/plans.json`; `click`: those and Family's 35 | `data/plans.json` |
| `link` (`click`) | `order` (Choose your meals, Choose my own meals, a grid cell, the Family button), `chefs-choice` (the card's checkout link), `all-plans` (See all plans, no mpid) | § 3 |
| `step` (`leave`) | `open` `answer` `result` `click` | § 3 |

The Worker adds `country` (`request.cf.country`, two characters, else `""`), `device` (`phone` `tablet` `desktop`) and
`v`. **The data point** (§ 4): `index1` = `v`; `blob1`–`blob11` = `event`, `s`, `country`, `device`, `viewport`, `qr`,
`question`, `answer`, `key`, `link`, `step`; `double1`–`double3` = `load_ms`, `length_ms`, `mpid`; a field an event does
not carry is `""` or `0` (`beacon.js` `BLOBS`, `DOUBLES`, which the report reads its columns from).

**The retention, and the platform facts relied on** (read 2026-10-13 from Cloudflare's documentation):

- Workers Analytics Engine, *Limits*: *"Data written to Workers Analytics Engine is stored for three months"* — the
  retention § 1.5 asks for; nothing is copied out but the report's aggregates. Also there: *"up to twenty blobs, twenty
  doubles, and one index per call to `writeDataPoint`"*, *"The total size of all blobs in a request must not exceed 16
  KB"*, *"Each index must not be more than 96 bytes"*, *"a maximum of 250 data points per Worker invocation"* (one
  event is 11 blobs, 3 doubles, a 16-character index, one point per invocation).
- Analytics Engine, *Get started* and *SQL API*: the binding `analytics_engine_datasets: [{ binding, dataset }]`;
  `writeDataPoint({ blobs, doubles, indexes })`; the SQL API at
  `https://api.cloudflare.com/client/v4/accounts/<account_id>/analytics_engine/sql`, the query text the body of a `POST`,
  `Authorization: Bearer`, a token with *Account Analytics Read*; `FORMAT JSON` (the default) returns `meta`, `data`,
  `rows`; *"At very high volumes of data, Analytics Engine will downsample data"*, so counts use `_sample_interval`.
  Its *SQL reference*: `count(DISTINCT …)`, `quantileExactWeighted(q)(column, weight)`, `formatDateTime`, `toDateTime`.
- Workers KV, *Write key-value pairs*: `put(key, value, { expirationTtl })`, whose minimum is 60 seconds; *"Writes are
  immediately visible to other requests in the same global network location, but can take up to 60 seconds … to be
  visible in other parts of the world"*; *"a maximum of 1 write to the same key per second"* (a 429 thrown).

**The choices §§ 2–5 left open, and what was built**

1. **One event a beacon**, a JSON object of exactly its fields (above), sent as the event happens (`click` as the press
   happens, the link untouched, the press never prevented: A9). At most 20 a visit, the 20th kept for `leave` (A7).
2. **`result`**: each time the result card shows an answer set and plan it was not showing (after `app.js` renders: the
   check runs on a timer after `hashchange`, since this script's listener runs before `app.js`'s). Its `key` is
   `selection.mjs`'s, without the snacks mark, as § 3 says; Q4's answer is in its `answer` event only.
3. **`answer`**: every press of a goal or a meal question's button, by the button's own ids (a press of the answer
   already chosen is sent too). The Individual/Family tabs are not § 3's questions and send nothing; a Family visit's
   funnel is `open` → `click` (`order`, mpid 35).
4. **`leave`**: the first of `visibilitychange` to hidden and `pagehide`; its length is `performance.now()` then, which
   counts from the navigation's start (the load included); its step the deepest of `open` · `answer` · `result` ·
   `click` reached. A visitor who hides the tab and comes back has sent their `leave`; later events still go.
5. **`error`**: the window's `error` event (an uncaught script error; not a resource's failed load, which does not reach
   the window; not an unhandled rejection: the page has no promise), once.
6. **No storage, no beacon without the means**: a browser without Web Crypto or `performance.now()` sends nothing; the
   one call site is inside a `try`, so a browser without `sendBeacon` sends nothing either. The test environments
   (`page-sim.mjs`, `cc-harness`'s `openPlanPage`) have no Web Crypto, so every page case before this contract runs
   with the analytics off and is unchanged.
7. **The salt** (§ 2): the KV key `salt:<YYYY-MM-DD>` (the UTC day of the Worker's clock), 32 random bytes in hex, written
   on the day's first event with `expirationTtl` = the seconds to the end of its day + 60 (at least 60, KV's minimum;
   86,460 at 00:00, 120 at 23:59; never more than 172,800: A6). One being made in an isolate is shared by that isolate's
   concurrent first events; after its write the isolate reads the key back and uses what it reads, so two isolates in
   one location that both wrote use the last write. A failed write (KV's one write a second) reads it back too.
8. **`v`** = the first 16 hex digits of SHA-256 over the salt, `CF-Connecting-IP`, `User-Agent` and the URL's host,
   joined by a newline (a character none of them can hold). Nothing of them is kept: A4.
9. **The device class**: `tablet` for `iPad`, `Tablet`, `PlayBook`, `Silk`, `Kindle` or Android without `Mobile`; `phone`
   for `Mobi`, `iPhone`, `iPod`, `Android`, `Windows Phone`; else `desktop`.
10. **The size**: a `Content-Length` over 2,048, or a body that streams past 2,048 bytes, is dropped unread; exactly
    2,048 is read (A3 sends both). An empty body, not JSON, not an object: dropped.
11. **Only `POST /a` is routed**; another method at `/a` goes to the assets as before (their 404). Unbound (before the
    infrastructure's bindings exist) or failing, it writes nothing and still answers 204.
12. **`wrangler.jsonc`'s KV entry has no `id`** (local preview needs none; the namespace's id is the infrastructure's)
    and no name: wrangler's schema has no field for one (`binding`, `id`, `preview_id`, `remote`), so the namespaces'
    names (`fitaf-microsite-salts-prod`, `-dev`, the infrastructure's Amendment 1.8) are in its comment.
13. **The report** reads the token from `CLOUDFLARE_ANALYTICS_TOKEN` and the account from `CLOUDFLARE_ACCOUNT_ID` (the
    name the README already uses for wrangler). Eight `SELECT`s, each grouped by UTC day: visitors and visits
    (`count(DISTINCT index1)`, `count(DISTINCT blob2)`), the funnel's steps, the click-through by link, the visit length
    and **the load time** (median and quartiles, `quantileExactWeighted(…)(…, _sample_interval)`; the load time is § 0's
    diagnostic, not in § 5's list), and the device, viewport and country splits of `open`; and from the steps the
    visits with an `error`. Each step of the funnel shows its change from the step before, signed: Q2–Q4 have defaults,
    so a visit can reach a result without answering them and a later step can exceed an earlier one. Exit 0; 1 when
    the SQL API refuses; 2 for a refused command line or a missing variable, before any request (A11).

**§ 2's race, measured**: in one isolate, twenty first events of a day at once make one salt and one `v` (A5's second
case). Two isolates sharing one namespace in Miniflare (a measurement, not a case: 20 trials of 20 concurrent first
events alternating between them): 24 salts written (4 trials wrote two), and **0 trials with two `v`**, the read-back
after the write converging on the last. Not measurable here: across Cloudflare's locations KV is eventually consistent
(*"up to 60 seconds"*), so in the first minute or two of a UTC day two locations can each make a salt, and a visitor
whose events in that window reach both is counted twice that day; after the last write has propagated every location
reads the same salt.

**Goldens moved** (each meant): S20's `index.html` (`84e54136…` → `e8ea54fa…`, the only file), which is the page before
byte for byte once the analytics slot and its newline are removed; CC-8's Worker map (`site.js` moved; `beacon.js`,
`data/plans.json` and `scripts/selection.mjs` added), which MS-9 and PR-10 read too.

**Found (the contract, the brief or the tree said otherwise), not ruled**

- ⚠ **Two WC cases had to change, against "WC-1–WC-12 unchanged"**, because § 4 and § 6 change what they pin: WC-6b
  asserted production has no `kv_namespaces` (it now asserts `ANALYTICS` and `SALTS`, and no other); WC-8's control
  pinned `renderPage`'s bytes (it now pins them with the analytics slot removed: byte for byte the same `03fcc0c1…`).
  S18's dev T5 forbade `sendBeacon` on the development page and is amended as T5 is.
- ⚠ **The development build, with the card, is 61,389 bytes, 51 under 60 KB** (58,865 before); production's is 39,366.
  The script's slot is 2,524 bytes once its comments, blank lines and indentation are removed. S18 reads
  the budget on the development page without the card; A1 now reads it on every page the dev build writes, so the next
  addition to the development page will meet it.
- ⚠ **CC-8's Worker map now moves with `data/plans.json` and `scripts/selection.mjs`**: the Worker accepts the answers,
  answer sets and mpids those files name, so re-reading the store's plans changes the Worker.
- ⚠ **The suite already makes a network request** (before this contract): the WC harness starts Miniflare without a
  `cf` option, and Miniflare then reads `node_modules/.mf/cf.json` or, when it is absent or older than 30 days, fetches
  `https://workers.cloudflare.com/cf.json` (its `setupCf`). This build's first run on a fresh install fetched it (the
  file carries the machine's own network's colo and ASN; it is in `node_modules`, git-ignored). The analytics harness
  passes `cf: false`; `wc-harness.mjs` is unchanged.
- ⚠ **`wrangler.jsonc`'s comment that `env.dev` inherits no routes is not what wrangler 4.144 reads** (before this
  contract): `env.dev` resolves to the top level's custom domains, with the warning *"Deploying this environment will
  reassign these custom domains away from the top-level Worker"*. Nothing deploys with wrangler here; the infrastructure
  code is what is live.
- **A UTC day ends at 20:00 in Boston** (19:00 after 2026-11-01): a visitor active across it is two visitors, one on
  each day. § 2 says UTC; a day of `America/New_York` would be a change of one line and the report's grouping.
- **An iPad on iPadOS reports a Mac's user agent** and is counted `desktop`.
- **The SQL was read from Cloudflare's reference and never run against Cloudflare**: the first real run is the
  operator's, on dev, after the merge (§ 8). `count(DISTINCT …)` is not weighted by `_sample_interval`; were Analytics
  Engine ever to sample this dataset, visitors and visits would be undercounted.
- Storybook (`tools/storybook`) and the watch (`tools/storefront-watch`) were not run (Chrome; not in this gate). Their
  pages now send beacons to their own server's `/a`, which their request checks allow (they refuse only requests off
  127.0.0.1).
- **Not done here**: nothing deployed, no `wrangler` command run (its configuration reader only, in-process, as the WC
  cases use it), no Cloudflare API, no bucket, namespace or dataset touched, no push, no merge.
