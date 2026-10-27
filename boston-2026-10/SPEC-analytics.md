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

### 12.1 Built (2026-10-25)

§ 12 is unchanged. On `boston/no-tracking`: the cases and the code at `07133ed`, CC-8b's golden at `87fbc44`, this
section after them.

**What was built**: all of it in `src/worker/site.js`'s `serveSite`, through which both Workers reach the page (the
development Worker after its own routes; production's directly, or as the development Worker's handler while
`production` is true). A GET whose query names `no-tracking` or `tracking` (`trackingSwitch`) is answered by
`switchTracking` with the 302 and the cookie, before the assets are asked or the bucket read; `POST /a` carrying the
cookie at `1` (`carriesNoTracking`) is answered with a bare 204 before `serveBeacon`, so nothing reads the body, writes a
data point or touches SALTS. `src/worker/beacon.js` is unchanged.

**Cases, before and after** (`nice -n 15 node --test` over `test/n-01`…`n-06` and `test/n-mutants.test.mjs`, then the
whole suite as `nice -n 15 npm --prefix boston-2026-10 test`):

| | before the code (`8d21da2`'s code) | after (`07133ed`) |
|---|---|---|
| the seven N files | `# tests 18` `# pass 6` `# fail 12` | `# tests 18` `# pass 18` `# fail 0` |
| N1 and N2 with the "//" case (added after the first code, run on it) | `# tests 5` `# pass 1` `# fail 4` | `# tests 5` `# pass 5` |
| the whole suite | (1,157 of 1,157 at `c6dd3a5`) | at `07133ed`: 1,175 tests, 1,170 pass, 5 fail (CC-8b, CC-8c, MS-9 twice, PR-10: CC-8's golden alone); at `87fbc44`: 1,175 of 1,175 (its first run there: 1,174, Q28's print build failing on Chrome exiting 2, "Teardown watchdog expired", a test that builds the flyer and reaches no Worker; it passed at `07133ed` and on the re-run, unchanged) |

Red for the right reasons: N1, N2 and N3 (each on both Workers and on the rollback) on the missing switch (`200, not
302`, no Location, no Set-Cookie; a beacon with the cookie written, the salt read and made); the mutants' control on
the same; the four mutants on their anchors, absent from `site.js` until the code. N4 (the control), N5 (three: today's
answers, by construction equal before any code) and N6 (two: the page reads no cookie) passed before the code, as
guards. The suite gains 18 tests: N1 three, N2 two, N3 two, N4 one, N5 three, N6 two, the mutants five.

**The mutants** (`test/n-mutants.test.mjs`, each in a mirror through THE SAME check its case runs, `test/n-checks.mjs`):
the control (the unchanged mirror) passes N1, N2 and N3; the beacon ignoring the cookie fails N3 on both Workers (a data
point written, SALTS used); the cookie without `HttpOnly` fails N1 (its Set-Cookie named, on both); the redirect dropping
another parameter fails N1 (`/?e=boston&no-tracking` goes to `/`), while a request with no other parameter stays right;
`tracking` not clearing fails N2 (`?tracking` alone a 200, both at once setting the cookie).

**CC-8's golden** moved by one entry, by construction (the development Worker reaches `site.js`): `src/worker/site.js`
`8a07b89d…` → `a769b2eb…`, none added or removed, re-recorded once from `07133ed`'s own tree (`git archive`) on the
orchestrator's approval. No other golden moved: S20, WC-9, U4 and PV5 pass unchanged.

**What § 12 was silent on, and what was built** (stated, not ruled)

1. **The Location is absolute**: the request's own origin, joined to its path and the kept query as text. A relative
   Location (the first code's) named another host for a path beginning `//`: `//other.example/?no-tracking` resolved to
   `https://other.example/` (measured red on N1 and N2). "The same URL" is on the same host; N1 and N2 hold it.
2. **Which requests are switched**: every GET `serveSite` would answer as the page. In production that is `/` and
   `/index.html` (`run_worker_first`) and also any path no asset matches (assets-first falls through to the script),
   which gets the 302 and then the assets' 404; in development `/*/` sends every path ending `/` too. An asset is served
   without the script and never switched (N1, as configured). HEAD, POST and PUT to a page route with either parameter
   are the assets' as today (by the code; no case asks); `/week/` is never switched; `/o`, `/confirm` and `/api/save` are the development Worker's
   own routes, before `serveSite`, and ignore both the parameters and the cookie (N5).
3. **A parameter's name** is what precedes its `=`, decoded as `URLSearchParams` decodes it, so `no%2Dtracking` counts;
   a value that is `no-tracking` (`?e=no-tracking`) or a longer name (`?no-trackings`) does not (N1's controls). Empty
   pieces (`&&`) are dropped from the redirect's query; every other piece is kept as the request's URL holds it.
4. **The cookie is counted out only at exactly `fitaf_no_tracking=1`**, one of the Cookie header's `;`-separated pairs
   (spaces trimmed), alone or among others; `=0`, empty, `=true`, `=11`, and a cookie whose name ends in it are today's
   path (N4).
5. **No `Cache-Control` on the 302**: the contract named none and none was added (a 302 carrying no freshness is not
   cacheable by default, RFC 9111 § 4.2.2).
6. **N5's "today" is `c6dd3a5`**, read from the repository's objects (`git archive` of its `src/worker/`, `data/`,
   `scripts/` and `package.json`): a later contract that changes one of those answers moves it, as SP3's base is moved,
   and a clone without that commit fails it.

**Not done here**: Storybook, the watch and contrast (the page is unchanged); nothing deployed, no merge; the release to
dev and the production pin are the orchestrator's (§ 12 item 7).

## 13. Amendment, 2026-10-25: Family counted, and the first question. CONTRACT, before any code

**Why.** Round 2 (SPEC-ui-and-copy-pass §§ 2 and 2.2, the Advisor's rulings of 2026-10-25) made *Who is this for?* the
first question, and gave Family a size and a question of its own. This file's vocabulary was written before either.
Read at `da5f943` (the release line, production's `ad7c0b0` plus the record of the Footer paste):

1. **A press of a `data-who` or `data-family` button sends nothing.** `src/analytics.js`'s click listener reads only
   `[data-goal],[data-q],[href],#all-link`.
2. **Family's result is refused.** The result card sends `result` with Family's mpid 35, but the Worker's `RESULT_MPIDS`
   holds only the individual plans' mpids. § 10's table was written when Family's card had no result.
3. **A3 saw neither gap.** Its reading of the built page (`test/a-harness.mjs` `pageAnswers`) reads only the
   `data-goal` and `data-q` buttons. So *"nothing else is offered"* held over a page that offered two more questions.

So a Family visit is recorded today as `open` → `click` → `leave`. It counts as a visit but is invisible in the funnel.
Counting starts **2026-10-26 17:00 Eastern** (Fit AF's decision record `2026-10-17-…` § 7u item 11), and this lands
before then. It was ruled by the orchestrator as this contract's author (session 259), not by the Advisor.

1. **The vocabulary** (§ 3; § 10's table) gains two questions, each named by the page's own id for it:
   - `who`, with answers `individual` and `family`: the button's `data-who`, build.mjs's `WHO`. The Worker cannot
     import the build, so it holds a copy, as it does for the meal questions' answers.
   - `family`, with answers `or` and `and`: the button's `data-family`. The Worker reads them from `data/plans.json`'s
     `family.selection` (each row's `lunch_dinner`).

   `result`'s mpids gain Family's: `family.counts`' mpids, de-duplicated, which today is 35. Nothing else in the
   vocabulary changes:
   - `answer` keeps its two fields, `question` and `answer`.
   - Family's `result` key is the answer set whose cart Family takes (`or-5d` or `and-5d`, `checkFamily`'s), which is
     already in `ANSWER_KEYS`. Its mpid is what tells it apart from an individual result.
   - The key and the mpid are still checked separately, not as a pair.
2. **The page** (`src/analytics.js`) sends an `answer` for each press of a `data-who` button (`question: "who"`, with its
   `data-who`) and of a `data-family` button (`question: "family"`, with its `data-family`), as it already does for the
   goal and the meal questions. A press of the answer already chosen is sent too. There is still one call site, under
   T5 as amended. The built page stays within T5's size ceiling: state its bytes before and after, on both targets.
3. **The report** (`scripts/analytics.mjs`, §§ 5 and 11) lists the funnel's answer steps in the page's order since
   round 2: `who`, `lunch_dinner`, `weekends`, `breakfast`, `snacks`, `goal`, then `family`.
   - `answer: family` branches off `who`; it is not a step after `goal`. The text prints it with no change figure.
   - The JSON keeps § 11's shape, with one more step named `answer: <q>`.
   - AJ1–AJ4 hold. Their fixture gains rows for `who` and `family`.
   - AJ2's base text moves with this section. Record it once from the new code, and the commit says so.
   - **The Analytics Worker's dashboard (fitaf `scripts/analytics-tool/`, a marked fork) is not changed here.** It
     reads its steps by name, so it keeps working, and its *"Saw a plan"* now includes Family's results. Its own
     funnel (a goal step first, no `who` or `family`) belongs to the Advisor's feedback on that page.
4. **A3 sees every question the page offers.** Its reading of the built page takes **every `button.choice`**. Each must
   carry exactly one of the attributes the page's script reads (`data-goal`, `data-q` with `data-a`, `data-who`,
   `data-family`), and if one carries none, the case fails and names it.
   - The set of (question, answer) pairs this yields equals the Worker's vocabulary in **both directions**: every pair
     offered is accepted, and every pair accepted is offered.
   - A future button of a kind the script does not read fails here before it ships.
5. **Cases**, written first and run red:
   - **F1**: A3 as item 4 says, on both targets' built pages.
   - **F2**: a whole Family visit in the page's stub (`a-harness.mjs`'s `openVisit`): open, *Me and my family*, *lunch
     or dinner*, the result shown, the result card's order link, leave. It sends `open`, `answer` who/family,
     `answer` family/or, `result` (`or-5d`, 35), `click` (`order`, 35) and `leave` (step `click`), and **each is
     accepted by `checkedEvent`**, the Worker's own check, not a copy of it.
   - **F3**: the same for *lunch and dinner* (`and-5d`, 35), and *Just me* then a goal, which shows today's path is
     unchanged apart from the added `who` answer.
   - **F4**: the report over a fixture holding `who` and `family` rows lists them in item 3's order, and `answer:
     family` has no change figure.

   **Mutants**, each in a mirror and each killed by its own case:
   - the page's selector without `[data-who]` (F2);
   - `RESULT_MPIDS` without Family's (F2);
   - A3's reading without `data-family`, so a Family button goes unread (F1, which must name the button).
6. **When.** Build on `boston/analytics-family` (from the release line `da5f943`), then merge into `boston/release-c`.
   Then the dev pin, and then the production pin on the Advisor's word, before 2026-10-26 17:00 Eastern.
   - ⛔ No Footer block moves: the store's page gains nothing (§ 1 item 3).
   - The week's content is in the bucket, not the pin, so it is not re-run.

### 13.1 Built (2026-10-25)

§ 13 is unchanged. On `boston/analytics-family`: the cases at `133994b` (on `da5f943`'s code, red), the code at
`f9273c0`, the goldens it moves at `6ec12ac`, U4's apart at `5f58d3f` (its recorder needed a change), this section after
them.

**What was built**: `src/worker/beacon.js`'s `QUESTIONS` gains `who` (`individual`, `family`: build.mjs's `WHO`, copied)
and `family` (data/plans.json's `family.selection`, each row's `lunch_dinner`), its keys now in the page's order since
round 2; `RESULT_MPIDS` gains Family's mpids, de-duplicated (35). `src/analytics.js`'s click listener reads `[data-who]` and
`[data-family]` too and sends each press as an `answer` (one call site still). `scripts/analytics.mjs` lists the funnel in
`QUESTIONS`' order and prints `answer: family` with no change figure. `build.mjs`'s `WHO` comment says WHO is in the
analytics' vocabulary. A3's reading (`test/a-harness.mjs` `pageChoices`, which `pageAnswers` now returns the answers of)
takes every `button.choice`.

**Cases, before and after** (`nice -n 15 node --test` over the files named; the whole suite was not run, as the
orchestrator asked: it runs once on the merged release line):

| | before | after |
|---|---|---|
| `test/af*.test.mjs` (F1–F4, the mutants and their control) | `133994b`: `# tests 9` `# pass 1` `# fail 8` | `f9273c0`: `# tests 9` `# pass 9` `# fail 0` |
| `test/a*.test.mjs` and `test/n*.test.mjs` (with `af*` and `aj*`) | `0fd55e3`: `# tests 64` `# pass 64`; with the cases (`133994b` but for F2/F3's comparison, fixed before that commit, red either way): `# tests 73` `# pass 61` `# fail 12` | `f9273c0`: `# tests 73` `# pass 72` `# fail 1` (AJ2, against `2ceb05a`); `5f58d3f`: 73 of 73 |
| the goldens' readers (CC-8, MS-9, PR-10, S20, CC-4, PV5, SP3, U4, and WC-8, WC-9, QE15, T5, S18, the budget) | `0fd55e3`: `# tests 39` `# pass 39` | `f9273c0`: `# tests 39` `# pass 26` `# fail 13` (every reader of S20, CC-8, PV5, U4 and SP3's base); `5f58d3f`: the eight that read a re-recorded golden, 19 of 19 |
| the last run, once, at `5f58d3f` | | `test/a*.test.mjs test/n*.test.mjs` and CC-8, MS-9, PR-10, S20, CC-4, PV5, SP3, U4: `# tests 92` `# pass 92` `# fail 0` |

Red for the right reasons. F1: `prod: offered, and refused by the Worker: who individual` (and `who family`, `family or`,
`family and`; dev the same). F2: `a Family visit, or: refused by the Worker's own check: result or-5d 35`, and its events
sent as `open · result or-5d 35 · click order 35 · leave click`, no answer. F3: the same for `and-5d`, and *Just me* with no
`who` answer. F4: the document's funnel with `answer: goal` second. The control and the two code mutants: their anchors
not yet in `src/analytics.js` and `src/worker/beacon.js`. The reading mutant passed red: it needs the reading alone. Of the
existing cases, A3's third (`who individual` written by no data point), A11, AJ1 and the AJ mutant's control (the funnel's
order) were red with them, each by § 13 items 3 and 4.

**The mutants** (`test/af-mutants.test.mjs`, each in a mirror through THE SAME check its case runs, `test/af-checks.mjs`;
the tracked tree untouched, `git status` clean after every run): the control (the unchanged mirror) passes F1 and F2, and
the mirror's own copy of the reading passes F1, 0 problems. The page's selector without `[data-who]` fails F2, 1 problem:
`a Family visit, or: sent open · answer family or · result or-5d 35 · click order 35 · leave click; the contract's: open ·
answer who family · …`. `RESULT_MPIDS` without Family's fails F2, 1 problem: `a Family visit, or: refused by the Worker's own
check: result or-5d 35`. A3's reading without `data-family` (over a mirror holding a copy of `test/`, its own `af-checks.mjs`
run, which imports its mutated `a-harness.mjs`) fails F1, 10 problems, naming each Family button on both targets: `prod: a
button.choice the page's script does not read (data-goal, data-q with data-a, data-who: it carries none of them): <button
type="button" class="choice" data-family="or" aria-pressed="false">`, the same for `and`, then `control: the page offers no
family answer` and `accepted by the Worker, and offered by no button: family or` (and `and`).

**The goldens and bases moved** (each re-recorded once from `f9273c0`'s own tree, `git archive`, the package's
`node_modules` linked in; each recorder's control first reproducing the committed record):

- CC-8 (CC-8b, CC-8c, MS-9, PR-10): one entry, `src/worker/beacon.js` `2896b313…` → `b77377db…`; none added or removed.
  `cc-harness` `workerFiles` over `133994b`'s tree reproduces the committed map (35 files).
- S20 (and CC-4; SP3's S20 case): `index.html` alone, `04eb2bd2…` → `1e8317f2…`, 67,025 → 67,227 bytes (production false).
  Built as S20 builds it, `133994b`'s tree reproduces `04eb2bd2…`.
- PV5 (`pv-05-record.mjs --commit f9273c0 --release-a`; at `5eaad96` it reproduces `5eaad96`'s record byte for byte): the
  same five pages as § 2.2's (production's `index.html`, development's `index.html`, `demo/`, `boston/`, `seminar/`).
- U4 (`u-04-record.mjs --commit f9273c0 --release-a --without-snack-cells`): the six pages, +202 bytes each; all six
  contents and every visible page byte-identical (item 11 below).
- SP3's base (`sp-production.mjs` `LATER`): `0fd55e3`..`f9273c0` over `src/analytics.js` and `src/worker/beacon.js` (item
  10 below).
- AJ2's base: `2ceb05a` → `f9273c0`, as § 13 item 3 says. `2ceb05a`'s text over the fixture with its new rows was
  `133994b`'s, byte for byte.
- Not moved: WC-8 (its pin removes the analytics slot), WC-9 (its visible pages read the markup without its scripts),
  QE15, T5, S18, the budget.

**The page's bytes** (every page the builds write, `test/page-budget.mjs`'s gzip; `133994b` → `f9273c0`): each page that
carries the analytics slot gains 202 bytes raw, by three lines of the script alone (its selector and the two `answer`
lines; both trees' pages compared line by line, no visible text changed); privacy/ and why/ unchanged.

| build | page | raw | gzip |
|---|---|---|---|
| production (as committed, `production` true) | `index.html` | 100,313 → 100,515 | 29,618 → 29,656 |
| production with `production` false | `index.html` | 67,025 → 67,227 | 19,961 → 20,009 |
| development | `index.html`, `demo/` | 107,182 → 107,384 | 31,455 → 31,487 |
| development | `boston/` | 107,184 → 107,386 | 31,453 → 31,486 |
| development | `seminar/` | 107,185 → 107,387 | 31,456 → 31,488 |

T5's ceiling is 61,440 bytes gzip; the largest page is 31,488.

**What § 13 was silent on, and what was built** (stated, not ruled)

1. **The case files are `af1`–`af4`**, beside the analytics' `a*`: `test/f1-flow-renders.test.mjs` already holds an F1
   (the flow renders'). Their titles say `F1 (analytics § 13)`. `test/a*.test.mjs` takes them.
2. **F1 asks the Worker's check, not Miniflare**: every pair offered through `checkedEvent`, and "every pair accepted" read
   as the Worker's `QUESTIONS`, each of its pairs on some button. A3's third case still posts each offered pair to the
   Worker in Miniflare, and with the new reading it posts the `who` and `family` pairs too.
3. **The reading names a button by its opening tag**, never its words; a button carrying two kinds, or a `data-q` without
   its `data-a`, is unread as well as one carrying none. Each question's answers are listed once (the old reading listed
   the goals once and the meal answers as found; the page has each once).
4. **F2 and F3 run on the production page** (`builtPage`, no week), as A2 does; F1 on both targets.
5. **F3's "today's path is unchanged"** is shown within the tree: the same visit without the *Just me* press is the
   control (open, four answers, a result, the click, the leave, no `who`), and the visit with it is that visit with
   `answer who/individual` after `open`. It is not compared with `da5f943`'s page.
6. **A3's refusals**: *a result's mpid not an individual plan's* (35) became *a result's mpid no plan has* (99), since
   § 13 item 1 accepts 35; added, a `who` answer and a `family` answer outside the vocabulary.
7. **The report's order is `QUESTIONS`' key order** (beacon.js, now the page's), which the report already read; the branch
   is `BRANCHES` in `scripts/analytics.mjs`. **The step after the branch (`result`) is compared with the step before it
   (`goal`)**. The JSON marks no branch (AJ4's shape); a reader knows it by its name.
8. **The fixture's new rows** (`steps.json`: `who` 13 and 3, `family` 3 and 1) are invented; A11's text and AJ1's
   document are re-written by hand from the fixture, as they were written. The AJ mutant's step number is no longer
   pinned (the funnel is ten steps; the mutant drops the last).
9. **`ORDER_MPIDS`** is the same set as before, Family's 35 once where it was listed twice.
10. **SP3's base takes the diff with one line of context** (a new `LATER` option, `context`). The base's
    `src/analytics.js` predates § 9 item 2's reading, two of whose lines are in the context of the click listener's hunk;
    with git's three lines that hunk lands with fuzz 2 (Apple's `patch` 2.0-12u11, exit 0 under `--silent`). With one,
    every hunk lands with no fuzz, and the patched base's `analytics.js` is `f9273c0`'s but for § 9 item 2's lines.
11. **U4's recorder reads as U4 does** (a new `--without-snack-cells`). Since the hand-off's merge (`c31603d`, SPEC-rung2-
    progress-and-checkout § 31.2 item 1) U4 compares the week's content and the page with each link's snack cells removed,
    and its note said the recorder was not re-run for that. This was the first record after that merge. The bare recorder
    at `f9273c0` moves the committed week's content (31,257 → 32,985 bytes), its page by +1,930 and two visible pages by
    those cells, which § 13 does not touch and U4 would fail on. Controls: the recorder with `--release-a` alone at
    `5eaad96` reproduces the committed golden byte for byte; with both flags at `0fd55e3` its record is the committed one.

**Found, not ruled**

- **`basePackage`'s "`patch` refuses one that does not apply cleanly"** holds only up to fuzz 2 on this machine's `patch`;
  whether an earlier `LATER` entry lands with fuzz was not measured.
- **The Worker's dashboard** (fitaf `scripts/analytics-tool/`) was not changed, as § 13 item 3 says. Its *Saw a plan* now
  counts Family's results.

**Not done here**: the whole suite, Storybook, the watch and contrast; nothing deployed, no merge, no pin.

## 14. Amendment, 2026-10-26: a saved offer counted. CONTRACT, before any code

**Why.** The Advisor, the evening of Boston's first event: *"I'd like to shape the visits into a funnel and add the
"saved an offer" count"*, then *"Yes please deploy as needed"*. The analytics have never recorded a save: § 3's list
was written before the save step, and a save lives only in the save step's database, beside the address it was saved
for. The count belongs in this file's data, which identifies no one, read by the same read-only token as every other
figure; ⛔ never by giving a reader a key to the database. The team's dashboard (Fit AF `scripts/analytics-tool/`,
its contract § 8) counts a visit with a `save` as *Saved an offer*.

1. **The vocabulary** (§ 3) gains one event:

   | event | when | carries |
   |---|---|---|
   | `save` | the save step's Worker answered an **offer** save as stored (`src/save/flow1.js`: the answer `ok` and its JSON's `ok` `true`, the step going to `SAVED`) | `s` only |

   - An **expansion** save (*tell me when you deliver*, `EXPANSION_SAVED`) sends nothing: it is not an offer.
   - Nothing the visitor typed, no code, no ZIP, no address, no consent: `s` only, as `error`.
   - A save that fails, is refused or is still being checked sends nothing.
   - The Worker's `FIELDS` gains `save` with no fields beyond `event` and `s`; the data point's layout is unchanged
     (`blob1` the event, `blob2` the visit). `leave`'s `step` vocabulary is unchanged: a save is not a step of the
     funnel's `STEPS`.
2. **The page.** There is still **one** call site (§ 4, T5 as amended): `src/analytics.js`'s `send`. The save step
   tells it by a DOM event: `flow1.js` dispatches `fitaf:saved` on `document` once, when it goes to `SAVED` from a
   stored answer, and `analytics.js` listens for it and sends `save`. ⛔ The event carries no detail. Pages without
   the save step, or without `analytics.js`, are unchanged. The built page stays within T5's size ceiling: state its
   bytes before and after, on both targets.
3. **The report** (`scripts/analytics.mjs`, §§ 5 and 11): each day gains `saves`, the visits with a `save` (a tenth
   line of the text, *"saved an offer N"*, after the funnel; one more member of the JSON's day). AJ1–AJ4 hold; AJ2's
   base moves with this section, recorded once from the new code.
4. **Cases**, written first and run red:
   - **SV1**: a whole visit in the page's stub (`a-harness.mjs`'s `openVisit`), the save step answering a stored offer
     save: it sends `open` … `save` (`s` only) … `leave`, and `save` is accepted by `checkedEvent`.
   - **SV2**: the same visit answered with an error, with a refusal, and an expansion save stored: no `save`.
   - **SV3**: the report over a fixture holding `save` rows prints and returns `saves`.
   - A3's both-directions check still holds (no button is added).
   **Mutants**, each in a mirror and killed by its own case: `flow1.js` dispatching on an error too (SV2); the
   Worker's `FIELDS` without `save` (SV1).
5. **When.** Built on `boston/analytics-save` (from the release line `79f03f8`) with § 14's item for the missing
   `result` (stated below once diagnosed, before its code), merged into `boston/release-c`, then the dev pin, then the
   production pin on the Advisor's word above. ⛔ No Footer block moves. The week's content is not re-run. Counting
   saves starts at the production release; the dashboard says so.

### 14.1 Built (2026-10-26)

§ 14 is unchanged. On `boston/analytics-save`: the cases at `9cdf963` (on `e1dda21`'s code, red), the code at `1fb4831`,
the goldens and bases it moves at `67bc48c`, this section after them. § 14 item 5's item for the missing `result` is not
in this branch.

**What was built**: `src/save/flow1.js`, when `/api/save` answers ok with its JSON's `ok` `true` and the step goes to
`SAVED`, calls `tellSaved`, which dispatches `fitaf:saved` on `document` with no detail, inside a `try`; an expansion's
`EXPANSION_SAVED`, an error, a refusal and an answer not yet come dispatch nothing. `src/analytics.js` listens for it and
sends `save` through its one `send` (one call site still), `s` only. `src/worker/beacon.js`'s `EVENTS` and `FIELDS` gain
`save`, with no field beyond `event` and `s`. `scripts/analytics.mjs`'s `reportData` gains each day's `saves`, the visits
with a `save`, and `reportText` prints `saved an offer N` after the funnel.

**Cases, before and after** (`nice -n 15 node --test` over the files named; the whole suite was not run, as the
orchestrator asked: it runs once on the merged release line):

| | before | after |
|---|---|---|
| `test/sv*.test.mjs` (SV1 twice, SV2, SV3, the mutants and their control) | `9cdf963`: `# tests 7` `# pass 0` `# fail 7` | `1fb4831`: the seven pass, within the next row's run; `67bc48c`: `# tests 7` `# pass 7` `# fail 0` |
| `test/a*.test.mjs test/n*.test.mjs test/sv*.test.mjs` | `e1dda21` (without `sv*`): `# tests 73` `# pass 73` `# fail 0`; `9cdf963`: `# tests 80` `# pass 64` `# fail 16` | `1fb4831`: `# tests 80` `# pass 79` `# fail 1` (AJ2, against `f9273c0`); `67bc48c`: `# tests 80` `# pass 80` `# fail 0` |
| the goldens' readers (CC-8, MS-9, PR-10, S20, CC-4, PV5, SP3, U4, and WC-8, WC-9, QE15, T5, S18, the budget, UC3, UC12, SP5) | `e1dda21`: `# tests 58` `# pass 58` `# fail 0` | `1fb4831`: `# tests 58` `# pass 45` `# fail 13` (every reader of S20, CC-8, PV5, U4 and SP3's base); `67bc48c`: `# tests 58` `# pass 58` `# fail 0` |
| the last run, once, on the tree committed as `67bc48c` | | 126 files (`test/a*`, `n*`, `sv*`, `s[0-9]*`, `sp*`, `uc*`, `uf*`, `uq*`, and CC-4, CC-8, EM5, MS-9, MS-10, MS-20, PR-10, PV5, U4, W4, WC-8, WC-9, QE15, T5, the budget): `# tests 432` `# pass 432` `# fail 0` |

Red for the right reasons. SV1: `prod, an offer save stored: sent 0 save(s), not 1` (dev the same), its events sent as
`open · answer goal lean · answer lunch_dinner or · result or-5d 20 · answer weekends yes · result or-7d 21 · answer
breakfast no · leave result`, the contract's with `save` before the `leave`; its Worker half `site: 0 data point(s)
written for a save, not 1` (`index` the same). SV2 on its control alone: `prod: control: the same visit answered as stored
sent 0 save(s), not 1` (dev the same); its twelve visits each reached their state and sent no save, as guards. SV3: `the
fixture 2026-10-23: the document's saves`, `undefined` for 2. The mutants' control on SV1 and SV2, and the two mutants on
their anchors, not yet in `src/save/flow1.js` and `src/worker/beacon.js`. Of the existing cases, by `VALID`'s `save`: A3
twice and the A mutants' control (`control save: 0 data points written, not 1`), A4 (`control: 6 data points, not 7`) and
N4 (`site POST /a save, no Cookie: 0 data point(s), not 1`); by the fixture's save rows: A11 (no saved line), AJ1 and the AJ
mutant's control (the document's `saves`) and AJ4 (`days[0]: no "saves"`). AJ2 passed there by construction (this tree's
text, as `f9273c0`'s, prints no saved line), the control for its base's move.

**The mutants** (`test/sv-mutants.test.mjs`, each in a mirror through THE SAME check its case runs, `test/sv-checks.mjs`;
the tracked tree untouched, `git status` clean after every run): the control (the unchanged mirror) passes SV1's visit and
SV2, 0 problems (and SV1's Worker half, 0, measured in the same mirror by a scratch run, not asserted by the file). `flow1.js` dispatching on an error too (the answer's error branch calls `tellSaved`) fails SV2, 12
problems, the six visits whose answer reaches that branch on both targets: `prod, an error (500, store_failed): sent 1
save(s), not none`, and the same for `a refusal (429, rate_limited)`, `(403, turnstile_failed)`, `(400, email_invalid)`, `an
answer ok whose JSON's ok is not true` and `an answer not ok whose JSON's ok is true`. The Worker's `FIELDS` without `save`
fails SV1, 2 problems: `prod, an offer save stored: refused by the Worker's own check: save` (dev the same); and, measured
by the same scratch run, SV1's Worker half, `site: 0 data point(s) written for a save, not 1` (`index` the same).

**The goldens and bases moved** (each re-recorded once from `1fb4831`'s own tree, `git archive`, the package's
`node_modules` linked in; each recorder's control first reproducing the committed record):

- CC-8 (CC-8b, CC-8c, MS-9, PR-10): one entry, `src/worker/beacon.js` `b77377db…` → `a5331c5d…`; none added or removed.
  `cc-harness` `workerFiles` over `9cdf963`'s tree reproduces the committed map (35 files).
- S20 (and CC-4; SP3's S20 case): `index.html` alone, `aa9e9ad1…` → `5270858d…`, 79,976 → 80,046 bytes (production
  false), by the listener's three lines. Built as S20 builds it, `9cdf963`'s tree reproduces `aa9e9ad1…`.
- PV5 (`pv-05-record.mjs --commit 1fb4831 --release-a`; at `4b77513` it reproduces the committed record byte for byte, at
  `9cdf963` the same record but `recorded_at`): the same five pages as § 13.1's, production's +70 bytes, development's four
  +484.
- U4 (`u-04-record.mjs --commit 1fb4831 --release-a --without-snack-cells`; with both flags at `8f36711` it reproduces the
  committed record byte for byte, at `9cdf963` the same record but `recorded_at`): the six pages, production's +70 bytes,
  development's +484; all six contents and every visible page byte-identical.
- SP3's base (`sp-production.mjs` `LATER`): `e1dda21`..`1fb4831` over `src/analytics.js` and `src/worker/beacon.js`; every
  hunk lands with no fuzz (a `patch --dry-run` over the base before the entry: exit 0, none reported), and the patched base's
  `analytics.js` is `1fb4831`'s but for § 9 item 2's lines (as § 13.1 item 10 found), its `beacon.js` `1fb4831`'s.
- AJ2's base: `f9273c0` → `1fb4831`, as § 14 item 3 says. `f9273c0`'s text over the fixture with its save rows was
  `9cdf963`'s, byte for byte.
- Not moved: WC-8 (its pin removes the analytics slot), WC-9 (its visible pages read the markup without its scripts),
  QE15, T5, S18, the budget, MS-20, W4, EM5; the preview build (built at both trees: byte-identical, it carries neither
  script).

**The page's bytes** (every page the builds write, `test/page-budget.mjs`'s gzip; `9cdf963`, `e1dda21`'s code → `1fb4831`):
each page that carries the analytics slot gains 70 bytes raw, the listener's three lines once the build has removed its
comments and indentation; each page that carries the save step gains 414 more, `flow1.js`'s lines, which the build inlines
with their comments (both trees' pages compared line by line: script lines alone, no visible word); privacy/ and why/
unchanged.

| build | page | raw | gzip |
|---|---|---|---|
| production (as committed, `production` true) | `index.html` | 115,219 → 115,703 | 33,812 → 33,971 |
| production with `production` false | `index.html` | 79,976 → 80,046 | 23,819 → 23,836 |
| development | `index.html`, `demo/` | 122,088 → 122,572 | 35,691 → 35,855 |
| development | `boston/` | 122,090 → 122,574 | 35,689 → 35,852 |
| development | `seminar/` | 122,091 → 122,575 | 35,693 → 35,857 |

T5's ceiling is 61,440 bytes gzip; the largest page is 35,857.

**What § 14 was silent on, and what was built** (stated, not ruled)

1. **The case files are `sv1`–`sv3`**, with `sv-checks.mjs` and `sv-mutants.test.mjs`; `test/a*.test.mjs` does not take
   them, so the brief's set names `test/sv*.test.mjs` beside it. SV1 is two tests: the visit, and a `save` posted to both
   Workers written as one data point in § 10's layout (blob1 `save`, blob2 the visit, the country and device, every other
   blob `""`, every double 0), since item 1's *"the data point's layout is unchanged"* had no case in item 4.
2. **SV1's whole visit**, on both targets with the fixture week (the step is drawn only beside a week's checkout,
   SPEC-ui-and-copy-pass § 1 item 2): Lean, lunch or dinner, every day, no breakfast (`or-7d`, 21), *Not ready?*, the form
   submitted, the page left. It sends no `click` (the save is the visitor's other way out). Its events are compared with the
   same visit with no save (the control), `save` added before the `leave`, not written out from § 3; the `leave`'s step
   (`result`) is the same, a save not being a step.
3. **`openVisit` gained `date`** (the browser's clock, on which the step chooses its offer: page-sim's `PAGE_NOW_MS`, so no
   case depends on the day it runs; `cc-harness`'s `clockAt`, now exported) and **`globals`** (`uc-harness`'s `saveStubs`:
   Turnstile and `/api/save`), and the window's `Event` (linkedom's), as a browser's window has one.
4. **The dispatch is `new Event("fitaf:saved")`**, neither bubbling nor cancelable, after the step has rendered `SAVED`, in
   a `try`: the promise chain's `catch` (which would show a stored save as a network error) is never reached from it. The
   other page harnesses have no `Event` (`cc-harness` `openPlanPage`) or no `dispatchEvent` (`page-sim`'s document): there it
   throws inside the `try` and the save still shows as saved; their pages run with the analytics off (no Web Crypto) anyway.
   S18 and the UC, SP and UF save cases pass unchanged (the 126 files above).
5. **"Once"** is read as once per going to `SAVED`, in the answer's handler and never in `render`: a later render of
   `SAVED` (a hashchange, the step following the card) dispatches nothing (measured, not a case: after the save and two
   answers, one `save`). A second stored save in one visit could come only through `#save-reopen`, which is hidden at
   `SAVED`; pressed anyway, it sends a second `save` (measured, not a case). The report counts visits (`count(DISTINCT
   blob2)`), so its figure is the same.
6. **SV2's errors and refusals**, twelve: the Worker's 500 (`store_failed`) and the network failing; its refusals, 429
   (`rate_limited`), 403 (`turnstile_failed`), 400 (`email_invalid`); an answer ok whose JSON's `ok` is not `true`, and one
   not ok whose JSON's `ok` is `true` (each half of item 1's condition); the page's own refusal of an address (no request),
   Turnstile failing and Turnstile not loaded (no request); still being checked (the request never answered, the step
   busy); and an expansion save stored. Each has a control that it reached that state. SV2's own control, the same visit
   answered as stored sending one `save`, keeps "no save" from holding of a page that never sends one; it is what made SV2
   red at `9cdf963`.
7. **The first mutant** adds the dispatch to the answer's error branch, so the six visits whose answer reaches that branch
   kill it; the network failing (the promise's `catch`) and the page's and Turnstile's refusals do not reach it.
8. **`VALID` gains `save`** (`a-harness.mjs`), so A3's and A4's controls and N4's post one too; A3's refusals gain a save
   carrying an address, a ZIP code, its kind, a consent, and one without `s`. `EVENTS` gains `save` beside `FIELDS` (nothing
   reads it; it is § 3's list).
9. **The report's `saves`** comes from the funnel's own query (`event` `save`, no question), so no SELECT is added (A11's
   eight requests). Its text line is the day's tenth at the day's own level (two spaces in), after the funnel's steps and its
   click-by-link line and before the visit length, with no change figure (not a step); the JSON member follows `clicks` (its
   key order carries no meaning, § 11.1 item 2). A day with data and no save row is `saved an offer 0` and `0`; a day of no
   data has neither.
10. **The fixture's save rows** (`steps.json`: 2 on 2026-10-23, 1 on 2026-10-24) are invented; A11's text and AJ1's
    document are re-written by hand from the fixture, as they were written; AJ4's shape holds `saves` as a count and its
    control refuses three broken ones.
11. **"Pages without the save step … are unchanged"** is read as their behaviour: every page carries the analytics slot, so
    the production page with `production` false gains the listener's 70 bytes (S20 moved) and has nothing that dispatches
    to it. The preview page carries neither script and is byte-identical.

**Found, not ruled**

- `flow1.js` is inlined with its comments (`analytics.js`'s are removed), so the step's two comment lines cost each page
  carrying it about 230 raw bytes; well within the budget.
- **The Worker's dashboard** (Fit AF `scripts/analytics-tool/`) was not touched here; its contract § 8 reads a visit with a
  `save` as *Saved an offer*.

**Not done here**: the whole suite, Storybook, the watch and contrast (no colour or style changed); nothing deployed, no
merge, no pin.

## 15. Amendment, 2026-10-26: no data point thinned (each its own index), and a result read after the page's first draw. CONTRACT, before any code

**Why.** Measured the evening of Boston's first event (Fit AF's decision record `2026-10-17-…` § 7u item 26): since
2026-10-26 00:00 Eastern, 9 of 52 `result` rows, 26 of 149 `answer` rows and 4 of 60 `open` rows carry
`_sample_interval` 2, each standing for a point Analytics Engine did not keep. Cloudflare's sampling page: *"At write
time, we sample if data points are written too quickly into one index"*, and the index is § 4's `v`. A visit's `result`
goes 4–16 ms after its meal-size `answer`, into the same index, and a venue's Wi-Fi gives every phone of one iOS
version the same `v`. So 3 of 7 plans reached that evening had no `result`. A reproduction on the release line
(Chrome and WebKit, throttled; the Worker in Miniflare) sent and wrote every one: the page and the Worker are right, and
the store thins what they write. The Advisor: *"We are all clear for updates now that the event is over"*, *"Please
merge as needed"* (2026-10-26).

1. **Each data point its own index.** `dataPoint` (§ 4) writes `indexes: [<16 random hex digits, new for each point>]`
   (`crypto.getRandomValues`), never the same value twice by design, so no index is ever written to twice and write-time
   sampling has nothing to thin at this page's volume. The index identifies nothing: it is not stored anywhere else and
   is never read by the report.
2. **The visitor moves to a blob.** `BLOBS` gains `v` as **`blob12`**, appended: blobs 1–11 keep their places, so every
   query of § 5 and § 11 reads what it read. `v` itself is unchanged (§ 2: the salted hash, its salt per New York day).
   ⛔ Still no IP and no user agent in any field (A4 reads the new blob too).
3. **The report** (`scripts/analytics.mjs`): `visitors` counts `count(DISTINCT if(blob12 = '', index1, blob12))`, so a
   window holding rows of both layouts (before and after this release) counts each row's visitor where it is. Nothing
   else in its queries changes. AJ1–AJ4 hold; AJ2's base moves with this section.
4. **A plan shown at load is read after the page's first draw.** `src/analytics.js`'s `result()` also runs once on
   `DOMContentLoaded` (after every inline script, `app.js` included, has run), besides its `setTimeout(result, 0)` and
   `hashchange`. Today a page opened at a fragment carrying a whole answer set (a reload, a restored tab, Back from the
   store without the page cache, a shared link) shows the plan and sends no `result`: the timer runs while the parser is
   paused between the analytics script and `app.js`, before `app.js` has drawn it. `shown` still keeps one `result` per
   plan shown.
5. **Cases**, written first and run red:
   - **IX1**: through the Worker (`a-harness.mjs`'s `startBeacon`, both entries), a visit's seven events give seven
     data points with seven different indexes, each 16 hex digits, and `blob12` the visit's `v` on every one (the same
     `v` A5 computes today).
   - **IX2**: A4's search for the IP and the user agent covers `blob12` and the index.
   - **IX3**: the report's `visitors` over a fixture holding rows of both layouts counts each visitor once.
   - **IX4**: the page opened at `#lean-and-7d` (the whole answer set) sends `result` (`and-7d`, its mpid) with no tap,
     in the stub where the analytics script runs before `app.js` as on the built page; and the plan shown, then a tap
     elsewhere that changes nothing, sends no second `result`.
   - A5 and A6 move from `index1` to `blob12` (their meaning unchanged: one visitor a day, a salt's expiry).
   **Mutants**, each in a mirror and killed by its own case: the index written as `v` (IX1); `blob12` left empty (IX1);
   the `DOMContentLoaded` read dropped (IX4).
6. **When.** Built on `boston/analytics-index` (from the release line `a5d3ae2`), merged into `boston/release-c`, the
   full site suite and Storybook, then dev, then production. ⛔ No Footer block moves; the week's content is not re-run.
   The team's dashboard (Fit AF `scripts/analytics-tool/`) reads `v` the same way in its own contract (§ 10).

### 15.1 Built (2026-10-26)

§ 15 is unchanged. On `boston/analytics-index`: the cases at `5a129e0` (on `23e7653`'s code, red), the code at `3f40698`,
the goldens and bases it moves at `dc2f3c7`, this section after them.

**What was built**: `src/worker/beacon.js`'s `dataPoint` writes `indexes: [pointIndex()]`, 16 random hex digits from
`crypto.getRandomValues`, new for each point, and `BLOBS` gains `v` as blob12, appended. `scripts/analytics.mjs`'s
`visitors` query counts `count(DISTINCT if(blob12 = '', index1, blob12))`; nothing else in its queries changes, and its
text and JSON are unchanged for the same answers. `src/analytics.js` adds `d.addEventListener("DOMContentLoaded", result)`
beside its timer and `hashchange`; `shown` is unchanged.

**Cases, before and after** (`nice -n 15 node --test` over the files named; the whole suite was not run, as the
orchestrator asked: it runs once on the merged release line):

| | before | after |
|---|---|---|
| `test/ix*.test.mjs` (IX1–IX4, the mutants and their control) | `5a129e0`: `# tests 8` `# pass 0` `# fail 8` | `3f40698`: all eight pass, within the next row's run; `dc2f3c7`: `# tests 8` `# pass 8` `# fail 0` |
| `test/a*.test.mjs test/n*.test.mjs test/sv*.test.mjs test/ix*.test.mjs` | `23e7653` (without `ix*`): `# tests 80` `# pass 80` `# fail 0`; `5a129e0`: `# tests 88` `# pass 72` `# fail 16` | `3f40698`: `# tests 88` `# pass 88` `# fail 0`; `dc2f3c7`: `# tests 88` `# pass 88` `# fail 0` |
| the goldens' readers (CC-8, MS-9, PR-10, S20, CC-4, PV5, SP3, U4, and WC-8, WC-9, QE15, T5, S18, the budget, SP5) | `23e7653`: `# tests 42` `# pass 42` `# fail 0` | `3f40698`: `# tests 42` `# pass 29` `# fail 13` (every reader of S20, CC-8, PV5, U4 and SP3's base); `dc2f3c7`: `# tests 42` `# pass 42` `# fail 0` |
| the last run, once, on the tree committed as `dc2f3c7` | | 132 files (`test/a*`, `n*`, `sv*`, `ix*`, `s[0-9]*`, `sp*`, `uc*`, `uf*`, `uq*`, and CC-4, CC-8, EM5, MS-9, MS-10, MS-20, PR-10, PV5, U4, W4, WC-8, WC-9, QE15, T5, the budget, P1): `# tests 445` `# pass 445` `# fail 0` |

Red for the right reasons. IX1: `site: 7 data points share 1 index(es)`, `its index is the visitor's v`, `11 blobs, not 12`,
`blob12 undefined, not the visit's v` (`index` the same). The `v` the case computes from § 2 was the old index1 on
every point, so "the same `v` A5 computes today" was measured, not assumed. IX2, on its control: `data point 1: 11 blobs and 1
index(es), not 12 and 1 (control: the fields A4 reads)`; its four planted searches found each needle. IX3: `2026-10-26: the
report's visitors, count(DISTINCT index1), over the fixture`, 5, not 3. IX4: `prod, #lean-and-7d, the timer run between the
scripts: sent no result with no tap, not result and-7d 23` (dev the same). Where the timer ran after every script it
sent one. The mutants' control on IX1 and IX4, and the three mutants on their anchors. Of the existing cases, by § 15
item 2: A4's control (`v (blob12): 16 hex digits`), A5 three times (`control: the data point's v (blob12)`), A6 three
times (`control: the first event's v`) and SV1's Worker half (eleven blobs, not twelve). A11 and AJ2 passed before the
code and after it, as they should.

**The mutants** (`test/ix-mutants.test.mjs`, each in a mirror through THE SAME check its case runs, `test/ix-checks.mjs`;
the tracked tree untouched, `git status` clean after every run): the control (the unchanged mirror) passes IX1 and IX4, 0
problems (IX2 too, 0, measured in the same mirror by a scratch run, not asserted by the file). The index written as `v`
fails IX1, 16 problems: `site: 7 data points share 1 index(es)` and `data point N (…): its index is the visitor's v` for
each of the seven (`index` the same). `blob12` left empty fails IX1, 14 problems: `site: data point N (…): blob12 "", not
the visit's v <v>` for each of the seven (`index` the same). The `DOMContentLoaded` read dropped fails IX4, 2 problems:
`prod, #lean-and-7d, the timer run between the scripts: sent no result with no tap, not result and-7d 23` (dev the same).

**The goldens and bases moved** (each re-recorded once from `3f40698`'s own tree, `git archive`, the package's
`node_modules` linked in; each recorder's control first reproducing the committed record):

- CC-8 (CC-8b, CC-8c, MS-9, PR-10): one entry, `src/worker/beacon.js` `a5331c5d…` → `b21f8e51…`; none added or removed.
  `cc-harness` `workerFiles` over `5a129e0`'s tree reproduces the committed map (35 files).
- S20 (and CC-4; SP3's S20 case): `index.html` alone, `5270858d…` → `2dc1bbd4…`, 80,046 → 80,094 bytes (production
  false), by the one line. Built as S20 builds it, `5a129e0`'s tree reproduces `5270858d…`.
- PV5 (`pv-05-record.mjs --commit 3f40698 --release-a`; at `1fb4831` it reproduces the committed record byte for byte, at
  `5a129e0` the same record but `recorded_at`): the same five pages, +48 bytes each.
- U4 (`u-04-record.mjs --commit 3f40698 --release-a --without-snack-cells`; with both flags at `1fb4831` it reproduces the
  committed record byte for byte, at `5a129e0` the same record but `recorded_at`): the six pages, +48 bytes each; all six
  contents and every visible page byte-identical.
- SP3's base (`sp-production.mjs` `LATER`): `23e7653`..`3f40698` over `src/analytics.js` and `src/worker/beacon.js`.
  `patch --dry-run --verbose` over the base before the entry exits 0 with no fuzz: `analytics.js`'s hunk lands at an
  offset of −2 lines, `beacon.js`'s three exactly. The patched base's `analytics.js` is `3f40698`'s but for § 9 item 2's
  lines, and its `beacon.js` is `3f40698`'s.
- AJ2's base: `1fb4831` → `3f40698`, as § 15 item 3 says. The text did not move: AJ2 passed at `3f40698` against
  `1fb4831` before the base moved.
- Not moved: WC-8, WC-9, QE15, T5, S18, the budget, MS-20, W4, EM5; the preview build (built at both trees: byte-identical).

**The page's bytes** (every page the builds write, `test/page-budget.mjs`'s gzip; `5a129e0`, `23e7653`'s code →
`3f40698`): each page that carries the analytics slot gains 48 bytes raw. The build keeps the `DOMContentLoaded` line and
removes its comments and indentation. Both trees' pages were compared line by line: that line alone, no visible word.
privacy/ and why/ are unchanged.

| build | page | raw | gzip |
|---|---|---|---|
| production (as committed, `production` true) | `index.html` | 115,703 → 115,751 | 33,971 → 33,986 |
| production with `production` false | `index.html` | 80,046 → 80,094 | 23,836 → 23,852 |
| development | `index.html`, `demo/` | 122,572 → 122,620 | 35,855 → 35,871 |
| development | `boston/` | 122,574 → 122,622 | 35,852 → 35,869 |
| development | `seminar/` | 122,575 → 122,623 | 35,857 → 35,873 |

T5's ceiling is 61,440 bytes gzip; the largest page is 35,873.

**What § 15 was silent on, and what was built** (stated, not ruled)

1. **The case files are `ix1`–`ix4`**, with `ix-checks.mjs` and `ix-mutants.test.mjs`; `test/a*.test.mjs` does not take
   them, so the brief's set names `test/ix*.test.mjs` beside it.
2. **IX1's `v`** is computed in the case from § 2 and § 10 item 8. It takes the salt the Worker wrote (the harness records
   the write), the request's IP, user agent and host, joined by a newline, and the first 16 hex digits of SHA-256 over
   them. IX1 also refuses an index equal to `v`, so "seven different indexes" cannot hold of a Worker that writes `v`
   seven times.
3. **"Never the same value twice by design"** is 64 random bits per point from Web Crypto in the Worker. A repeat is
   possible by chance (about one pair in 2^64), not by construction. The index is stored nowhere else and read by nothing.
4. **The visitor reaches the blobs as `dataPoint`'s field `v`** (`BLOBS`' name). A beacon cannot carry a `v` of its own:
   `checkedEvent` takes exactly an event's fields, and `v` is none of them. So blob12 is always the Worker's.
5. **IX2 reads A4's search, factored as `a-checks.mjs` `needlesIn`** (the same needles; A4's messages unchanged). Its
   control is the layout the search reads (twelve blobs, one index), and its four plants show that it reads those fields.
6. **IX3 cannot run ClickHouse.** The case takes the report's own `visitors` query, reads its two `count(DISTINCT …)`
   arguments and evaluates them over invented raw rows. It understands two forms: a column, and `if(column = 'text', a,
   b)`. Any other form fails the case, naming it. That a blob never written reads as `""` is the contract's reading of
   Analytics Engine, not a measurement, and the SQL was not run against Cloudflare.
7. **IX4's stub.** `yieldBetweenScripts` runs the page's timers after each inline script, a model of the parser's pause
   between scripts. `DOMContentLoaded` is now dispatched on every `openVisit`, after the scripts. No page script listened
   for it before § 15, and every existing case passed with it at `5a129e0`. Every other case still runs its timers after
   every script, as before.
8. **IX4's "a tap elsewhere that changes nothing"** is two taps: on the result card (no link) and on the answer already
   pressed (lunch and dinner), which sends its `answer` and no `result`. "No second result" is shown chiefly where the
   timer runs after every script: there both reads find the plan, and `shown` keeps one. Its mpid, 23, is read from
   `data/plans.json` (and-7d's row, plan 14, Lean's 14-meal mpid).
9. **AJ2's base moved by § 15 item 3's word** though its text did not move.
10. **A11's aggregates-only check** now removes every `count(DISTINCT …)` argument whole, nested parentheses included, and
    looks for `blob12` too.
11. **SV1's Worker half (§ 14's) moved with item 2**: twelve blobs, blob12 a `v`.

**Found, not ruled**

- The stub's `yieldBetweenScripts` is a model. Whether a browser runs the analytics script's timer before `app.js` depends
  on how its parser yields, and the evidence that it happens is the coordinator's reproduction in Chrome and WebKit. IX4
  holds the page to one `result` under both orders.
- Points written before the release keep their layout (index1 the visitor, no blob12). A report window across the
  release counts both through the `if`. The team's dashboard (Fit AF `scripts/analytics-tool/`) reads `v` by its own
  contract's § 10 and was not touched here.

**Not done here**: the whole suite, Storybook, the watch and contrast (no colour or style changed); nothing deployed, no
merge, no pin.

## 16. Amendment, 2026-10-27: the offer email's clicks, and its visitors as their own source. CONTRACT, before any code

**Why.** The Advisor, the morning after Boston's first event, `ts=2026-10-27T13:57:48.438Z`: *"I also want to try to
understand the behavior of the people who got the offer email. I know we can't track open rates, but can we track their
initial click? And can we put them into their own segment so we can compare funnel dynamics?"*; told it would be an
anonymous count (a repeat open counted again), not each person's first click, which would tie a click to a saved email
the privacy notice does not cover, `ts=2026-10-27T14:20:58.576Z`: *"Please start building this – I'd like to get it
deployed as soon as we can."*

Today E1's one button opens the offer page `/o/<code>` (`src/worker/redeem.js`), which sends nothing; its *Build my
plan* link opens the plan page at `/?e=<the save's event>#from-email`, so an email visitor is counted as a visit from
that event's QR code (`boston`), mixed with the flyer's.

1. **The offer page counts its own opening.** The vocabulary (§ 3) gains one event:

   | event | when | carries |
   |---|---|---|
   | `offer` | the offer page's script starts, once per page load | `s`; `qr`, the save's event id (`demo` · `boston` · `seminar`, as the page's own link names it; `""` for an unknown code); `kind`, which page it is: `saved` (the save's offer live), `welcome` (ended, the current offer shown), `current` (an unknown code), `ended` (no offer current) |

   - ⛔ **Never the code, the path, the query, the referrer or anything from the save's row but its event id.** The
     page's script is given `kind` and `qr` by the Worker as data; it does not read `location`.
   - Sent by the page's script in the browser (as every event is), so a link scanner or mail proxy that fetches the
     page without running it sends nothing. The same transport (§ 4: `POST /a`, the same `s` rule) and § 12's tester
     cookie (`fitaf_no_tracking`, a tester's browser sends nothing) hold; ⛔ no second transport.
   - The page sends nothing else: no `leave`, no `error`. A visit of the offer page is one data point.
   - The Worker's `FIELDS` gains `offer` with `qr` and `kind`; `kind` is a new blob, **`blob13`**, appended (blobs
     1–12 keep their places); its vocabulary is the four words above, anything else refused.
2. **The plan page names an email visit.** `open` (§ 3) gains `via`: `email` when the page's script starts at the
   fragment `#from-email` exactly (the offer page's link), else `""`. It is **`blob14`**, appended. ⛔ Read once, at
   the start, from the fragment only; the fragment is not rewritten by it.
3. **The report** (`scripts/analytics.mjs`, §§ 5 and 11): a visit whose only event is `offer` is **not a plan-page
   visit**: the visits, visitors, funnel and every figure before this section are counted without them, exactly as
   before. Each day gains `offer_pages` (the visits with an `offer`, by `kind`) and `email_visits` (the plan-page visits
   whose `open` has `via` `email`), a text line each and members of the JSON's day. AJ1–AJ4 hold; AJ2's base moves once.
   The team's dashboard (Fit AF `analytics-worker.spec.md` § 12) reads the same two fields.
4. **Privacy.** Nothing new identifies anyone: no code, no address, no click tied to a save. § 1's bar holds; the
   privacy notice is unchanged. A repeat opening of the offer page is counted again, and the report says so.
5. **Cases**, written first and run red:
   - **EM-A1**: the offer page in Miniflare for each `kind` (a stored save with its offer live, ended, an unknown
     code, no offer current): its script sends exactly one `offer` with that `kind` and the save's event id, and the
     payload holds neither the code (with and without its hyphen) nor `/o/`.
   - **EM-A2**: the plan page opened at `#from-email` sends `open` with `via` `email`; at no fragment, `#save` and
     `#lean-or-7d`, `via` `""`.
   - **EM-A3**: the Worker accepts `offer` with each `kind` and refuses another `kind`, an `offer` with a `via`, and an
     `open` with `via` other than `email` or `""`; the data point's blob13 and blob14 as stated, blobs 1–12 unchanged.
   - **EM-A4**: with the tester cookie, the offer page's beacon is not written (§ 12's case, for the new page).
   - **EM-A5**: the report over a fixture with offer-only visits and email visits: every earlier figure as without
     them, `offer_pages` by kind and `email_visits` as stated.
   **Mutants**, each in a mirror and killed by its own case: the offer page's script reading `location` (EM-A1); `via`
   read from the query instead of the fragment (EM-A2); the report counting offer-only visits as visits (EM-A5).
6. **When.** Built on `boston/analytics-email` from the release line; merged into it; the full suites; dev, where a
   test of each event is read back from the dataset (a 204 from `/a` proves nothing); production on the Advisor's word,
   **after** the dashboard's § 12 is live, so no card counts an offer page as a visit.
