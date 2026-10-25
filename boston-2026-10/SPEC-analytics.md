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
  per day of `America/New_York`**, held only in a KV namespace with an expiry of at most 48 hours, and created on the
  day's first event. *(Amended 2026-10-13, the orchestrator's ruling as this contract's author, on the build's finding:
  it was one per UTC day, but a UTC day ends at 20:00 in Boston (19:00 after 2026-11-01), so an evening visit would
  count as two visitors; the business and its events run on Eastern time. The day is the platform's time-zone
  arithmetic, never a fixed offset, so across a DST change it is 23 or 25 hours.)*
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
taken from the environment (the Advisor's, never in this public repository), printing per day (§ 2's day,
`America/New_York`'s, since 2026-10-13; the dates given are New York dates):
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

§§ 0–9 are unchanged but for § 2's day and § 5's grouping (§ 10.1). Red at `0749f8b` (the cases alone, on `a241cab`'s
code), green at `c2e7b5b`; the figures below are that commit's, and § 10.1 has the counts after the orchestrator's two
changes.

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
7. **The salt** (§ 2): the KV key `salt:<YYYY-MM-DD>` (since § 10.1, the New York date of the Worker's clock; it was the
   UTC date), 32 random bytes in hex, written on the day's first event with `expirationTtl` = the seconds to the end of
   its day + 60 (at least 60, KV's minimum; never more than 172,800: A6). At the New York day's 00:00 that is 86,460 on a
   24-hour day, 90,060 on 2026-11-01's 25 hours, 82,860 on 2027-03-14's 23; 120 at 23:59. One being made in an isolate is shared by that isolate's
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
    name the README already uses for wrangler). Eight `SELECT`s, each grouped by day (since § 10.1 the New York day:
    `formatDateTime(timestamp, '%Y-%m-%d', 'America/New_York')`, bounded by `toDateTime('<date> 00:00:00',
    'America/New_York')`; it was UTC's): visitors and visits
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
(*"up to 60 seconds"*), so in the first minute or two of a day (since § 10.1, New York's midnight) two locations can
each make a salt, and a visitor
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
- ✅ fixed (§ 10.1) **The suite already made a network request** (before this contract): the WC harness started
  Miniflare without a `cf` option, and Miniflare then reads `node_modules/.mf/cf.json` or, when it is absent or older
  than 30 days, fetches `https://workers.cloudflare.com/cf.json` (its `setupCf`). This build's first run on a fresh
  install fetched it (the file carries the machine's own network's colo and ASN; it is in `node_modules`, git-ignored).
  The analytics harness passed `cf: false` from the start.
- ⚠ **`wrangler.jsonc`'s comment that `env.dev` inherits no routes is not what wrangler 4.144 reads** (before this
  contract): `env.dev` resolves to the top level's custom domains, with the warning *"Deploying this environment will
  reassign these custom domains away from the top-level Worker"*. Nothing deploys with wrangler here; the infrastructure
  code is what is live.
- ✅ ruled (§ 10.1) **A UTC day ends at 20:00 in Boston** (19:00 after 2026-11-01): a visitor active across it was two
  visitors, one on each day. The day is now `America/New_York`'s.
- **An iPad on iPadOS reports a Mac's user agent** and is counted `desktop`.
- **The SQL was read from Cloudflare's reference and never run against Cloudflare**: the first real run is the
  operator's, on dev, after the merge (§ 8). `count(DISTINCT …)` is not weighted by `_sample_interval`; were Analytics
  Engine ever to sample this dataset, visitors and visits would be undercounted.
- Storybook (`tools/storybook`) and the watch (`tools/storefront-watch`) were not run (Chrome; not in this gate). Their
  pages now send beacons to their own server's `/a`, which their request checks allow (they refuse only requests off
  127.0.0.1).
- **Not done here**: nothing deployed, no `wrangler` command run (its configuration reader only, in-process, as the WC
  cases use it), no Cloudflare API, no bucket, namespace or dataset touched, no push, no merge.

### 10.1 The orchestrator's two changes (2026-10-13), built

Re-gated by the orchestrator at `c2e7b5b` (723/723), then two changes on the same branch; green at the commit that
carries this section.

**1. The day is `America/New_York`'s, not UTC's** (the orchestrator's ruling as this contract's author, on § 10's
finding: a UTC day ends at 20:00 in Boston, so an evening visit counted twice; the business and its events run on
Eastern time). § 2's sentence and § 5's grouping are amended in place, saying what they were.

- **The Worker**: the salt's key is the New York date (`beacon.js` `saltDay`), and its expiry a minute after the next New
  York midnight (`saltTtl`), both by `src/worker/zoned-time.js`'s `zonedDate` and `nextDayAt`, the Intl arithmetic the
  save's send time already uses (two passes settle a DST change); never a fixed offset. Still at most 172,800 s: 86,460
  at 00:00 of a 24-hour day, 90,060 on 2026-11-01's 25 hours, 82,860 on 2027-03-14's 23.
- **The report**: `formatDateTime(timestamp, '%Y-%m-%d', 'America/New_York')` groups, and `toDateTime('<date> 00:00:00',
  'America/New_York')` bounds, so `--from`/`--to` are New York dates and the engine's own zone arithmetic places each
  day's ends; the heading says `days in America/New_York`. ⚠ The time-zone arguments are from Cloudflare's SQL
  reference (its `toDateTime` example interprets *"a date relative to New York time"*), not run against Cloudflare.
- **The cases**: A5, the same IP and user agent at 19:59 and 20:01 New York time are one `v` and at 23:59 and the next
  day's 00:01 two, and across both DST changes (2026-11-01's 00:30 EDT and 23:30 EST one day; 2027-03-14's 23:30 EDT
  and the 15th's 00:30 EDT two days); A6, the expiry at a New York day's first and last minute, and the salt living
  through a 24-, a 25- and a 23-hour day; A11, every query's day and bounds in the zone and no date read in UTC. Every
  instant is written in the cases with its own offset, from the calendar.
- **Red on `c2e7b5b`'s UTC code** (a clean `git archive`, these cases overlaid): `ℹ tests 11` `ℹ pass 5` `ℹ fail 6`:
  `19:59 and 20:01 in New York: the same v`, `2026-11-01 00:30 EDT and 23:30 EST: the same day`, `it lives the day's
  24 hours (72060 s)` (and 25, and 23 hours: 68460 s), and A11's report (its first assertion, the heading naming UTC days; its
  eight queries, read on their own, carry no New York bound); the five that pass do not depend on the day.
- **A fixed offset is caught** (a measurement in a mirror, not a committed mutant): `saltDay` and `saltTtl` at a fixed
  −04:00: green on 2026-10-23 (EDT), red on the 25-hour day, `2026-11-01 00:30 EDT and 23:30 EST: the same day` and
  `it lives the day's 25 hours (86460 s)`.

**2. The network fetch the suite made, fixed** (a pre-existing defect, § 10's Found): every Miniflare the suite starts
now passes `cf: false` (Miniflare's own placeholder `request.cf`, never `https://workers.cloudflare.com/cf.json`):
`test/wc-harness.mjs`'s two, as the orchestrator asked, and the two its aim ("no test reaches cf.json") also needed,
which the message did not name: `test/worker-harness.mjs` (the S and M cases' Worker) and `test/s07-send-at.test.mjs`.
Six of the six `new Miniflare(…)` in `test/` now pass it. **Measured**: `node_modules/.mf/cf.json` (written by the fetch
on this install, 2026-10-13 19:17) removed, then the whole suite: `# tests 726` `# pass 726` `# fail 0`, the file not
written again and no *"Unable to fetch the `Request.cf` object"* in the output. WC-1–WC-12 `39` of `39`, unchanged but
for the harness's option.

**Counts**: the site 723 → 726 (A5 two cases → three; A6 two → four). The mutants re-run on this tree, each in its
mirror: the control 0 problems on A2, A3, A4 and A6; the IP into a blob, A4 red (12 problems, `data point 1 carries
"203.0.113.7"`); `localStorage` for `s`, A2 red (7, `touched localStorage`); the salt without an expiry, A6 red (4,
`2026-10-24T03:59:00.000Z: SALTS holds salt:2026-10-23 with no expiration`: the New York day's last minute keys the
New York date); the vocabulary check removed, A3 red (54, `an event outside § 3: written (1 data point(s))`). CC-8's
Worker map moved again (`beacon.js` only). Contrast 70/70.

### 10.2 Corrections at the merge into `boston/integration-1022` (2026-10-18; the text above is left as it was)

Merged at `ac52905` (`boston/rung-4-save-offer` `cd99011` with `boston/event-codes` `0d1fac2`, then this branch). Two of
§ 10's statements are no longer true of the merged tree:

1. **`qr`'s vocabulary** (§ 10's table, *"`""` or an id of `data/events.json`: `demo` today"*; and § 9 item 2's *"one
   event today"*): since `SPEC-print-pieces.md` § 11 (2026-10-18) `data/events.json` holds `demo`, `boston` and
   `seminar`, so an `open`'s `qr` is `""`, `demo`, `boston` or `seminar`. The build writes the three into the page's
   `QR_IDS` and `beacon.js` reads the same file. The page's reading of them is `test/a-qr-event.test.mjs` (`a123be9`),
   which no case of § 7 covered: an `open` from `?e=boston` or `?e=seminar` carries that id, any other query none.
2. **The sizes** (§ 10's Found, *"The development build, with the card, is 61,389 bytes, 51 under 60 KB"*, production's
   39,366, the slot 2,524): the slot is now 2,542 bytes (the two ids). The development page was 61,282 bytes at
   `45b5e37`, before the merge, and is 63,825 after it (`demo/` 63,825, `boston/` 63,827, `seminar/` 63,828), over 60 ×
   1024 raw: the next addition met the budget, as § 10 said it would. **Ruled 2026-10-18** (the orchestrator; `SPEC.md`
   § 1's note of that day): the budget is the page gzip-compressed under 60 × 1024 bytes on every page the builds
   write, the raw size printed and not asserted. A1, S18 and T5 read it through `test/page-budget.mjs`. Now, raw / gzip:
   production 40,195 / 11,878; development 63,825–63,828 / 18,780–18,782.

## 11. Amendment, 2026-10-21: `--json`, the same report as data, for the Owner's graphs. CONTRACT, before any code

**Why.** The Advisor (Fit AF's decision record `2026-10-17-…` § 7o item 13): *"a lightweight visualization of the
microsite's analytics … "eCommerce analytics dashboard" is totally a fine inspiration. The one ask is that we incorporate
our palettes"*. The graphs are drawn outside this repository from a file the operator writes; § 5's text report is for
reading, not for drawing.

1. **`npm run analytics -- --from … --to … [--env dev] --json`** prints, instead of § 5's text, one JSON document with
   **exactly the text report's figures**, from one function both outputs read (the text becomes a formatting of it, so
   the two cannot disagree; the text output byte-identical to today's for the same answers):
   ```json
   { "dataset": "…", "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "zone": "America/New_York",
     "days": [ { "day": "YYYY-MM-DD", "data": true,
                 "visitors": 0, "visits": 0,
                 "funnel": [ { "step": "open", "visits": 0 }, { "step": "answer: <q>", "visits": 0 }, …,
                             { "step": "result", "visits": 0 }, { "step": "click", "visits": 0 } ],
                 "clicks": { "<link>": 0 },
                 "visit_length_ms": { "q1": 0, "median": 0, "q3": 0, "n": 0 },
                 "load_ms": { "q1": 0, "median": 0, "q3": 0, "n": 0 },
                 "device": { "<value>": 0 }, "viewport": { "<band>": 0 }, "country": { "<code>": 0 },
                 "errors": 0 } ] }
   ```
   Every day from `from` to `to` appears, in order; a day with no data is `{ "day", "data": false }`. A length or load
   with no visits is `null`. Counts are numbers; the splits' keys are the text's labels (an empty country is `""`).
2. ⛔ **Aggregates only**, as § 5: the document holds nothing per visit, and no visit id, salt, address or user agent.
3. The token and account as § 5; `--json` with any refusal of § 5 exits as § 5 does, writing nothing to stdout.
4. **Cases**: AJ1 a fixture of the SQL API's answers (the cases' existing stub) → the document, each figure equal to the
   text report's for the same answers; AJ2 the text output byte-identical to the base's for the same fixture; AJ3 a
   range with a day of no data; AJ4 no field but the shape's (a check that walks the document); **mutant**: the JSON
   computed by a second path that drops the funnel's last step (AJ1 red), its control green.

### 11.1 Built (2026-10-21, the agent)

§ 11 is unchanged. On `boston/analytics-json`: the cases at `8bf6ee8` (on `2ceb05a`'s code, red), the code at `116393b`,
this section after it.

**What was built**: `scripts/analytics.mjs` `reportData(scope, rows)` computes the report's figures once, as § 11 item
1's document; `reportText(doc)` is a formatting of that document (it took `(scope, rows)` before; nothing else in the
package calls it); `--json` prints the document in place of the text. The SQL, the refusals and the exit codes are as
they were.

**Cases, before and after** (each command's result line; `nice -n 15 node --test` over the files named, in the package,
no other file run; the whole suite was not run, as the brief asked):

| | before (`8bf6ee8`, `2ceb05a`'s code) | after (`116393b`) |
|---|---|---|
| `test/aj1-json-figures.test.mjs test/aj2-text-unchanged.test.mjs test/aj3-day-without-data.test.mjs test/aj4-shape-only.test.mjs test/aj-refusals.test.mjs test/aj-mutants.test.mjs` | `# tests 9` `# pass 1` `# fail 8` | `# tests 9` `# pass 9` `# fail 0` |
| `test/a11-report.test.mjs` | `# tests 4` `# pass 4` `# fail 0` | `# tests 4` `# pass 4` `# fail 0` |

The one that passed red is AJ4's control (the walk over the document written by hand and 13 broken ones), which runs no
report. The eight failed on the missing feature: `--json` was an unknown argument (exit 2, `analytics: unknown argument:
--json`), and the mutant's anchor was not in `scripts/analytics.mjs`. AJ2's first half (this tree's text equal to
`2ceb05a`'s) passes on the base by construction, its control; its second half (this tree's `reportText` over the
document `--json` printed, equal to that text) is the one that was red.

**The mutant** (`test/aj-mutants.test.mjs`, in a mirror, through THE SAME check AJ1 runs, `test/aj-checks.mjs`
`figureProblems`): the control (the unchanged mirror) has 0 problems. The JSON computed by a second path that drops the
funnel's last step (`--json` prints a copy of the document whose every funnel lacks its last entry; the text still from
the document): AJ1 red, 9 problems, eight of them one per day with data in each run, as `the fixture, 2026-10-23..25
2026-10-23: the funnel's step 8: the text's click 4, the document's none`, and the ninth the fixture's document unequal to
the one written by hand.

**The answers the cases run** (`aj-checks.mjs` `runs()`, a stand-in for `fetch`, nothing requested): A11's fixture over
2026-10-23..25, over 2026-10-22..25 and with `--env dev`; the fixture with 2026-10-24 thinned (no `leave` row, a load
over `n` `"0"`, no clicks or countries, a device row of 0 visits), so a day with data has both quartile sets `null` and
two empty splits; and no rows at all over 2026-10-30..11-02 (across a month's end). Derived in the module, not added as
fixture files.

**What § 11 was silent on, and what was built**

1. **The change between funnel steps** (the text's `-4 (27%)`, `+6`) is not in the document: it is the formatting's
   arithmetic over two adjacent `visits`, and AJ4 refuses a field outside the shape. Likewise the durations: the
   document carries the engine's quartiles in milliseconds as answered, and the text rounds them (`820 ms`, `15.5 s`,
   `1 min 12 s`). So AJ1 compares a duration within the text's rounding (±0.5 ms, ±50.5 ms, ±500.5 ms), and pins the
   exact values by the fixture's document written by hand.
2. **The splits' keys** are the values the text prints (`order`, `phone`, `<400`, `US`), the empty country `""` where
   the text writes `(none)`. Only values with visits appear, as in the text; a split with none is `{}` (the text's `none`, or no
   `click by link` line). Keys are inserted in the text's order (§ 10's link and viewport lists, else most visits
   first), but JSON's key order carries no meaning and the text sorts again, so it never depends on it.
3. **A row without its value column counts as `""`** (it was `r.value ?? r.link`, so a missing device printed
   `undefined`). The SQL API writes every column, so the text is unchanged for any answer it gives (AJ2).
4. **`null`** for `visit_length_ms` or `load_ms` exactly when the text says `no leave recorded` / `no open recorded`: no
   row for the day, or its `n` 0.
5. **The output**: `JSON.stringify(doc, null, 2)` and a closing newline; keys in the shape's order.
6. **`--json` takes no value**, anywhere on the command line; given twice it is the same; `--json yes` is refused as
   `unknown argument: yes` (exit 2). The usage line (stderr) names `[--json]`; the report's text is unchanged.
7. **§ 11 item 3 had no case in item 4**: `test/aj-refusals.test.mjs` is it. With `--json`, A11's seven refusals and
   `--json yes` each exit 2 with the reason and nothing on stdout, run as a program; the SQL API's three (a 403, an answer
   not JSON, an answer with no `data` list) each exit 1 after the first request, nothing on stdout.
8. **AJ2 reads `2ceb05a` from the repository's objects** (`git archive` of its `scripts/`, `src/worker/`, `data/` and
   `package.json`, as W4 does for its base), so a clone without that commit fails it.

**Found, not ruled**

- The worktree had no `node_modules`; they were installed with `npm ci --offline --ignore-scripts` from the local npm
  cache (no network, no install script run; `package-lock.json` unchanged; nothing committed). The suite therefore has
  not run on this install.
- The suite gains 9 tests (`test/*.test.mjs` takes the six new test files: AJ1, AJ2, AJ3 one each, AJ4 two, item 3 two,
  the mutant and its control two; `aj-checks.mjs` is not a test file).
- **Not done here**: the real report (no token here; the SQL API never reached), the whole suite, Storybook and the
  watch; nothing deployed, no merge.

## 12. Amendment, 2026-10-25: a tester's browser sends no analytics (`?no-tracking`). CONTRACT, before any code

**Why.** The Advisor, 2026-10-25: *"blacklisting my (and other) browsers from generating analytics while testing. I
think *an* option is adding a "?no-tracking"-style URL parameter when testing … it feels relatively low effort to
implement. That said, I am OK layering in multiple approach."* The analytics count from 2026-10-26 17:00 Eastern (one
hour before the Boston events); every visit of ours after that must not be counted.

1. **Switching it on.** A request that reaches either Worker's page routes (`assets.run_worker_first`: `/` and each event
   page, production's and development's) whose query string holds the parameter **`no-tracking`** (any value, or none)
   is answered **302** to the same URL **without that parameter** (every other parameter kept, in order; a browser keeps
   the fragment), with
   `Set-Cookie: fitaf_no_tracking=1; Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=Lax`. The page itself is
   unchanged: its script reads no cookie and touches no storage (T5, A1).
2. **Switching it off.** The parameter **`tracking`** the same way, its cookie `fitaf_no_tracking=; Path=/; Max-Age=0;
   Secure; HttpOnly; SameSite=Lax`. Both parameters at once: off wins (the cookie cleared), so a mistaken link never
   hides a real visitor.
3. **The beacon.** `POST /a` carrying the cookie `fitaf_no_tracking=1` is answered **204**, as every beacon is, and
   **nothing is done**: no data point, and the salt is neither read nor written (SALTS untouched). Any other value of the
   cookie, or none, is today's path.
4. **Nothing else changes**: every other request of SP3's and WC-6's lists answers as today, byte for byte; the save
   step, `/o`, `/confirm` and the cron ignore the cookie (a tester's save is a real save).
5. **Later layers, not built here**: an IP list held as a Worker secret (never in this public repository), and the
   report's own exclusion; each is its own amendment.
6. **Cases**, written first and run red: N1 `?no-tracking` → 302, `Location` without it (another parameter kept), the
   cookie with exactly those attributes, on both Workers; N2 `?tracking` → 302 and the clearing cookie; both → cleared;
   N3 `POST /a` with the cookie → 204, zero data points, no SALTS read or write; N4 the same beacon without it is
   written (control); N5 a request without either parameter is unchanged (SP3's and WC-6's lists); N6 the page carries
   no `cookie` read. **Mutants**, each caught: the beacon ignoring the cookie; the cookie without `HttpOnly`; the
   redirect dropping another parameter; `tracking` not clearing.
7. **When**: built on `boston/no-tracking` (from `c6dd3a5`, release (b)'s commit), released to dev, then with the next
   production pin, before 2026-10-26 17:00 Eastern.
