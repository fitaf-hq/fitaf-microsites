# eatfitaf.com's home page as a way into the store (2026-10-27). CONTRACT, before any code

**Why.** The Advisor, the morning after Boston's first event, `ts=2026-10-27T15:12:46.204Z`: *"The Owner and I are
concerned that there were zero conversions last night. There was one Boston order, but it is hard to tell where it came
from using the HMP tools"* ⇒ *"Turn eatfitaf.com into a redirect to the existing site. "Redirect" is a bit of a misnomer
because the microsite needs to fire off an analytics event and add a data field to the redirect URL. Then use the
redirect to trigger a footer script that adds struck-through pricing next to the actual HMP pricing. This should be
rather lightweight and purely cosmetic."* Then: *"Once we get the Boston event sorted, we can go back to working on the
microsite … connect it to targeted Meta ads and run A/B tests against the existing HMP site."* His answers
(`AskUserQuestion`, `ts=2026-10-27T15:20:48.053Z`): **instant and server-side** (the Worker records the visit, then
redirects); **the home page alone redirects** (the offer pages, confirm, privacy and Why stay); the destination ruled at
`ts=2026-10-27T16:03:46.679Z`, *"I agree – front page"*: **`https://fitafnutrition.com/`**, as **one setting**, so
`/meal-plans` (his own lean, *"to streamline the funnel"*) is a one-line change and a first A/B.

This file is the Worker's half: the redirect, its marker, its event and the report. The store's half (the Footer
block's struck prices for visitors carrying the marker, and § 35's *Save my offer* link removed) is
`SPEC-rung2-progress-and-checkout.md` § 36, built on the development line. The team's dashboard is Fit AF's
`analytics-worker.spec.md` § 13.

## 1. The redirect is a mode, set by one var

1. **`REDIRECT_TO`**, a Worker var on both Workers (fitaf-infra sets it; `wrangler.jsonc` names it in both
   environments, for local preview, as it names `SITE_URL`). When its value is an absolute `https://` URL (it parses as
   a URL, its protocol `https:`, no fragment), the home page redirects there. When it is absent, empty, or anything else,
   **the page is served exactly as today**, byte for byte. ⛔ No other switch: no build flag, no data file, nothing in
   `data/`. Production's value and development's: **`https://fitafnutrition.com/`**.
2. **The page stays.** Nothing is deleted: the build, the plan page, its assets, its cases and every SPEC are kept, and
   every existing case of the page runs with `REDIRECT_TO` absent. Switching back is the var made empty, released as
   any var change.
3. **Which requests.** A `GET` or `HEAD` whose path is exactly `/` (any query), on either host the Worker answers
   (`eatfitaf.com`, `www.eatfitaf.com`; development's workers.dev address). `/index.html` stays the assets' 307 to `/`,
   passed on as today. **Every other path is answered exactly as today**: `/o/<code>`, `/confirm/<token>`, `/privacy/`,
   `/why/`, `POST /a`, `/week/…`, `/api/save`, development's event pages `/<event-id>/`, and every asset.
   ⛔ **`/assets/` above all: every E1 already sent loads its slideshow, its logos and its halftone tiles from
   `https://eatfitaf.com/assets/…`** (`src/worker/email-style.js`, `src/worker/email-photos.json`).
4. **§ 12's switch comes first** (SPEC-analytics.md § 12): a `GET /` whose query names `no-tracking` or `tracking` is
   still answered with its own 302 to `/` and its cookie; the next `GET /` is then redirected. So a tester can still set
   the cookie on eatfitaf.com.
5. **The answer**: `302`, `Location` the var's URL with the marker (§ 2), `Cache-Control: no-store`, no body, no
   `Set-Cookie`. ⛔ **Never 301 or 308**: a browser keeps those, and a phone that had scanned once would never reach the
   page again after a switch back. ⛔ The visitor's own query is never passed on (not `e`, not `via`, nothing): only
   the marker. The `Location` carries no fragment; a browser then carries the request's own onto the store's address
   (`#from-email`, from the offer page's link), which the Footer block ignores (it reads only `#fitaf=`): stated, not
   prevented.
6. **Instant.** The data point (§ 3) is written after the answer is returned (`ctx.waitUntil`), so the visitor never
   waits on the salt or the dataset; a write that fails, or a binding that is absent, never stops the redirect.

## 2. The marker: three UTM parameters, for the store's Google Analytics and the Footer block

Appended to the var's URL (`?` if it has no query, else `&`), in this order:

- **`utm_source=eatfitaf`**, always. The Footer block's trigger (§ 36 of the checkout's SPEC) is this parameter at this
  value, and nothing else.
- **`utm_medium`**: `email` when the request's query has `via=email` (the offer page's links, § 4); else `qr` when its
  `e` names one of `data/events.json`'s ids (the page's own `qrEvent` rule, `src/qr-event.js`, read on the server);
  else `direct` (typed in, or any link without a code).
- **`utm_campaign`**: the event id when `e` names one (`boston`, `seminar`, `demo`); absent otherwise.

So `/` → `https://fitafnutrition.com/?utm_source=eatfitaf&utm_medium=direct`; `/?e=boston` →
`…?utm_source=eatfitaf&utm_medium=qr&utm_campaign=boston`; `/?e=boston&via=email` →
`…?utm_source=eatfitaf&utm_medium=email&utm_campaign=boston`; `/?e=nope` → `…&utm_medium=direct`.
These are his *"well-mannered entrance portals that send reasonable … data via referral codes"* (decision 2026-10-17
§ 7u items 27–28). ⚠ Whether the store's app keeps the query on landing (its router) is measured by § 36 item 7, not
assumed here; the Footer block does not depend on it.

## 3. The event: `redirect`, written by the Worker itself

SPEC-analytics.md § 3's closed list gains one event, the first not sent by a page:

| event | when | carries |
|---|---|---|
| `redirect` | the Worker answers item 5's 302 | `s`, 16 random hex digits made by the Worker for this request (one request, one visit); `qr`, as § 2 (`""` when none); `via`, `email` or `""` |

- The Worker adds `v`, the country and the device class exactly as `beacon.js` does for every event (§ 2's salt, the
  same `v` for the same visitor on the same day; `deviceOf`, `countryOf`). One data point, the existing layout: blob1
  `redirect`, blob2 `s`, blob3 country, blob4 device, blob6 `qr`, blob12 `v`, blob14 `via`; every other blob `""`, every
  double 0; the point's own index (§ 15). ⛔ No new blob. ⛔ **Never the query, the path, the referrer, the IP or the
  user agent in a field** (§ 1's bar; A4's rule holds for the new event).
- Written by the Worker directly (`env.ANALYTICS.writeDataPoint`), through the same functions as `POST /a`'s (imported,
  never copied), not by posting to `/a`.
- **Not counted** (the 302 is the same in every case): a request carrying § 12's cookie at `1`; a `HEAD`; a user agent
  that names a program rather than a person, by one closed list kept once in the code:
  `/bot|crawl|spider|slurp|preview|facebookexternalhit|curl|wget|python|go-http-client|headless/i` (a page's beacon
  needs a script to run, a redirect does not, so a link preview or a scanner would otherwise count as a visit).
- **The report's word for it**: a visit whose only event is `redirect` is **not a plan-page visit**, as § 16's `offer`.

## 4. The offer page names the email

Every link of the offer page `/o/<code>` that leads to the home page (`src/worker/redeem.js`: the saved offer's and the
welcome page's `/?e=<event>#from-email`, the ended page's `/?e=<event>`, the current page's `/`) gains **`via=email`**
in its query, before any fragment: `/?e=<event>&via=email#from-email`, `/?e=<event>&via=email`, `/?via=email`. In
redirect mode the Worker reads it (§ 2); with the page served, the page ignores it (its `open`'s `via` is still read from
the fragment, § 16 item 2, unchanged). Nothing else on the offer page changes: its words, its `offer` event, its look.
So E1's *Claim my offer* → the offer page → its link → the store, carrying `utm_medium=email`.

## 5. The report (`scripts/analytics.mjs`)

Every figure before this section is counted without the redirect-only visits (as § 16 item 3 did for offer pages), so
a window with no `redirect` row reads exactly as before. Each day gains **`redirects`**: the count, by source (each QR
id, `email`, `direct`) and by device; a text line and a member of the JSON's day (§ 11). AJ1–AJ4 hold.

## 6. Infrastructure

fitaf-infra adds the var `REDIRECT_TO` to both Workers (`stacks/dev`, `stacks/prod`), mirrored from `wrangler.jsonc`,
under its own amendment and cases (the orchestrator's, not the builder's). ⛔ Nothing is deployed from here.

## 7. Cases, written first and run red (`node --test`, the Workers in Miniflare)

| | case | expect |
|---|---|---|
| RD1 | `REDIRECT_TO` the store's front page; `GET /`, `/?e=boston`, `/?e=nope`, `/?e=boston&via=email`, `/?via=email`, `/?e=boston&x=1` | `302`, each `Location` exactly as § 2 (no other parameter, no `#`), `Cache-Control: no-store`, no `Set-Cookie`, no body; `HEAD /` the same `Location`; on `www.` too |
| RD1b | the var with a query of its own (`https://fitafnutrition.com/meal-plans?x=1`) | the marker appended with `&` |
| RD2 | the var set; every other path of § 1 item 3 | answered exactly as with the var absent (status, headers that matter, bytes); **each image E1 names** (the paths in `email-style.js` and `email-photos.json`) `200` with the built file's bytes |
| RD3 | the var absent, `""`, `http://…`, `not a url`, a URL with a fragment | `/` is the page, byte-identical to the build's, its week put in as today |
| RD4 | the var set: one counted `GET /` | exactly one data point, its blobs as § 3, blob2 16 hex digits; none for the cookie at `1`, a `HEAD`, and each kind of user agent in the list (one sample each); the `302` in every case |
| RD5 | a counted request with a known IP, user agent, query (`?e=boston&via=email&secret=x`) and referrer | no written field contains any of them |
| RD6 | `GET /?no-tracking` with the var set | § 12's 302 to `/` with its cookie, not the store |
| RD7 | the offer page for each kind | every link to the home page carries `via=email` as § 4, the fragment where it was; EM-A1 and EM-A2 hold |
| RD8 | `ANALYTICS` unbound, and a `writeDataPoint` that throws | still the `302`, the same `Location` |
| RD9 | the report over a fixture with redirect-only visits beside page visits | every earlier figure as without them; `redirects` by source and device as stated |

**Mutants**, each in a mirror and killed by its own case: a 301 (RD1); the visitor's query passed through (RD1, RD5);
`/assets/` redirected (RD2); the cookie ignored (RD4); the report counting redirect-only visits as visits (RD9).

## 8. When

Built now on `boston/redirect`, from the release line `boston/release-c` at `1f63e1c` (production's); the full site
suite and the watch's site cases on the merged line. Then dev with the var: `curl -sI` only, the `Location` read and
**never followed** (⛔ never load the store, eatfitaf.com or the dev host in a browser), one data point read back from
the dev dataset after about 90 s (a 204 proves nothing; a 302 neither). Production on the Advisor's word, with
fitaf-infra's var, and the dashboard's § 13 live first or in the same hour. **Boston's events run through 2026-10-29;
tonight's matters.**

## 9. Built — found at the build, not ruled (2026-10-27)

§§ 1–8 are unchanged. On `boston/redirect` (from `d59aec4`): the cases at `275a481` (on `d59aec4`'s code, red), the code
at `7b8f4fd`, the golden and the base it moves at `4b2450d`, the mutants at `6a4a29f`, this section after them.

**What was built**

- `src/worker/redirect.js` (new): the rules, and nothing that serves a page. `redirectTarget` reads the var (§ 1 item 1);
  `markerOf` reads the query (`qr` by the page's own `qrEvent` over `data/events.json`'s ids, `via` by
  `URLSearchParams`) and gives the medium; `markedLocation` appends the marker; `redirectResponse` is the 302
  (`no-store`, no body, no cookie); `PROGRAM_AGENT` is § 3's closed list, kept here alone; `recordRedirect` writes the
  event and never throws.
- `src/worker/site.js`: `serveSite(request, env, ctx)`. A GET is § 12's switch, then `redirectHome`, then the page; a HEAD
  is `redirectHome`, then the assets; every other method the assets, as before. `redirectHome` answers only a `GET` or
  `HEAD` of exactly `/` while the var is valid; a GET not carrying § 12's cookie at `1` and not from a program's user
  agent starts its write, hands it to `ctx.waitUntil` and returns the 302 without waiting. `{ fetch: serveSite }` and
  `withSaveStep` passed `ctx` already; `src/worker/index.js`'s `fetch(request, env, ctx)` now passes it to its final
  `serveSite`.
- `src/worker/beacon.js`: `writeEvent(request, env, event)`, the tail of the beacon's `record` (the salt, `v`, the country,
  the device, one data point) factored out and called by both; `visitorOf` exported; `randomId`, the 16 random hex digits
  of § 15's point index, now also the redirect's `s`; `REDIRECT_EVENT`. `redirect` is **not** in `EVENTS`: `POST /a`
  refuses it (RD4 holds it), so no page and no visitor can write one.
- `src/worker/redeem.js`: `homeFromEmail(event, fragment)`, the offer page's links to `/` with `via=email` before the
  fragment.
- `scripts/analytics.mjs`: the visitors query's condition is `blob1 != 'offer' AND blob1 != 'redirect'`; an eleventh
  query, `redirects` (`blob6 AS qr`, `blob14 AS via`, `blob4 AS device`, `count(DISTINCT blob2)`, event `redirect`); a day
  with redirects gains the member `redirects` and one text line; a day of redirects alone has data.
- `wrangler.jsonc`: `REDIRECT_TO` `https://fitafnutrition.com/` in the top level's vars and `env.dev`'s, each with a
  comment.
- README rows: the route table, `src/worker/`, the cases.

**What the contract was silent on, and what was built** (stated, not ruled)

1. **The report's member and line are on a day with redirects alone.** § 5 says each day gains `redirects`, and also that
   *"a window with no redirect row reads exactly as before"* and *"AJ1–AJ4 hold"* (no base moved, unlike § 16's). Both
   hold only if a day without a redirect carries neither, so the text and the JSON of a window without one are
   `d59aec4`'s byte for byte (RD9, over AJ's five answer sets), and AJ2's base did not move. The member,
   after `email_visits`: `"redirects": { "count": 3, "source": { "boston": 1, "email": 1, "direct": 1 }, "device": {
   "phone": 2, "desktop": 1 } }`; the line, after the offer pages' line: `  redirects to the store 3 (by source: boston 1
   · email 1 · direct 1; by device: phone 2 · desktop 1)`. AJ4's walk accepts the member when it is there (its keys and
   vocabularies), and AJ's text reader reads the line; A11 and AJ answer the new query with no row
   (`fixtures/analytics/redirects.json`), so their expectations did not move.
2. **A redirect's source** is `email` when its `via` is `email` (whatever its `qr`), else its QR id, else `direct`: the
   `utm_medium` rule with the QR id split out. Sources print in `data/events.json`'s order, then `email`, then `direct`;
   devices in `DEVICES`' order. An email redirect's event is in the dataset (blob6) and not split in the report.
3. **The count is `count(DISTINCT blob2)`**, each redirect its own `s`: the number of redirects, counted as `visits` is.
4. **A day of redirects alone is a day with data**, its plan-page figures those of no visit (§ 16.1 item 7's rule).
5. **`via=email`** is any `via` parameter whose value, decoded, is `email` (`URLSearchParams`' `getAll`); `e` is read by
   `qrEvent`, the page's rule (the first `e=`, as written). Nothing else of the query is read.
6. **The var's reading**: a value holding `#` anywhere (an empty fragment too) is refused before it is parsed; otherwise
   it must parse as a URL whose protocol is `https:` (the parser's own trimming of surrounding spaces kept). The Location
   is the parsed URL's `href` (a host alone gains its `/`), then `?` (or `&` after a query of its own), then the marker;
   `utm_campaign` is URL-encoded (the ids are `[a-z0-9-]`, which it leaves alone).
7. **A HEAD of `/`** is redirected and never counted. § 12's switch is a GET's alone (§ 12.1 item 2), so `HEAD
   /?no-tracking` gets the store's 302 too. A `POST` or `PUT` of `/` is the assets' as before.
8. **Without a `ctx`** the write is still started, not handed to `waitUntil`; no caller in the package omits it.
9. **The harnesses drop `REDIRECT_TO`** from `wrangler.jsonc`'s vars unless a case gives it (`a-harness.mjs`
   `withRedirectTo`, used by its `configuredSite`, `wc-harness.mjs`'s `configured` and `worker-harness.mjs`'s
   `startWorker`), by § 1 item 2. Without it every case that starts a Worker with the config's vars (N5, SP11, EM-A1's
   offer pages, N1 and the WC cases as configured, and the rest) would run in redirect mode once the var was committed.
   `startBeacon` and `startSite` take the Worker's vars from the case.
10. **"After the answer" is measured.** `a-harness.mjs`'s wrapper keeps every promise the Worker hands `waitUntil`, waits
    for them before it reads its log, and records how many points were written when each answer was returned; RD4 holds
    it at none. The wrapper also makes `writeDataPoint` throw for a request carrying `x-a-fail-write: 1` (RD8).
11. **RD5 also reads the Location** (`secret` must not reach it), so the mutant "the visitor's query passed through" dies
    on RD5 as § 7 says; § 7's table names only the written fields.
12. **RD2 is three checks**: the Worker script itself over each target's build behind a fake ASSETS (every request
    reaching it, as the development Worker's `/*/` and any path no asset matches do: the one check the mutant "/assets/
    redirected" can fail, since the real router serves `/assets/` without the script); both Workers as `wrangler.jsonc`
    configures them over their builds (the real router, the var as configured there, its value checked in both
    environments); and the save step's routes (`/o`, `/confirm`, `/api/save`) through `worker-harness.mjs`'s Worker (D1,
    the rate limiters), development's and production's. The event pages are the development Worker's.
13. **RD7 leaves the logo out** (item "Found" below) and checks the page's other links to `/`: exactly one, § 4's.
14. **The cases § 4 moves that § 7 did not name**, changed in the cases' commit: S11, SP11, SP12, SP15 and SP16 pin the
    offer page's link (now with `via=email`, `&amp;` in the markup); N5 compares `/o/…` with `c6dd3a5`'s Worker byte for
    byte, and now removes `via=email` from this tree's link first (and fails if it is not there), as it removes § 16's
    two elements. A11 and AJ's query lists gain `redirects`.

**Cases, before and after** (`nice -n 15 node --test` over the files named, absolute paths; the whole suite as
`nice -n 15 npm --prefix boston-2026-10 test`)

| | before the code (`275a481`, `d59aec4`'s code) | after |
|---|---|---|
| `test/rd*.test.mjs` (RD1 twice, RD2 three times, RD3 twice, RD4–RD9) | `# tests 13` `# pass 4` `# fail 9` | `7b8f4fd`: `# tests 13` `# pass 13` `# fail 0` |
| the gate set: `test/rd*`, `a*` (A, A11, AJ, AF), `n-*`, `sv*`, `ix*`, `em-a*`, `wc-*`, S11, SP11, SP12, SP15, SP16 | `# tests 175` `# pass 156` `# fail 19` | `7b8f4fd`: `# tests 175` `# pass 175` `# fail 0` |
| CC-8, MS-9, PR-10, SP3 (the golden's and the base's readers) | | `7b8f4fd`: 6 fail in the whole suite (below); `4b2450d`: `# tests 13` `# pass 13` `# fail 0` |
| `test/rd-mutants.test.mjs` | | `6a4a29f`: `# tests 6` `# pass 6` `# fail 0` |
| the whole suite | | `7b8f4fd`: `# tests 1385` `# pass 1379` `# fail 6` (CC-8b, CC-8c, MS-9 twice, PR-10, SP3's CC-8b: the golden and the base alone); `6a4a29f`: `# tests 1391` `# pass 1391` `# fail 0` (its first run there; the 1,385 and the six mutants) |

Red for the right reasons. RD1: `site GET eatfitaf.com/: 200, not 302`, `Location null`, `Cache-Control "no-cache", not
"no-store"` (each Worker, each host; the rollback the same). RD2 as configured: `production: wrangler.jsonc's
vars.REDIRECT_TO undefined, not https://fitafnutrition.com/` and the page's 200s. RD4: `site GET /: 200, not 302`, `0
data point(s), not 1`. RD5: `Location null, not § 2's`, `0 data point(s), not 1 (control)`. RD6: `site GET / carrying the
cookie: 200, not 302`. RD7: `links to the home page ["/?e=demo#from-email"], not ["/?e=demo&via=email#from-email"]`, and
`["/"], not ["/?via=email"]` for an unknown code. RD8: `site, ANALYTICS and SALTS unbound, GET /: 200, not 302`. RD9:
`2026-10-26: visitors 4, not 1`, `visits 4, not 1`, `redirects undefined`. Passed before the code, as guards: RD2's
script-itself and save-step checks and RD3 twice (a var the old code never read: equal by construction). Of the
existing cases, by § 4: S11, SP11 twice, SP12, SP15, SP16 (the link), N5 twice (`GET /o/ABCD2345: the offer page's link to
the home page names the email`); by § 5's eleventh query, A11 twice (`control: the report's queries are the fixture's`).
AJ1–AJ4 passed before and after, unchanged in their expectations.

**The mutants** (`test/rd-mutants.test.mjs`, each in a mirror through THE SAME check its case runs, `test/rd-checks.mjs`;
the tracked tree untouched, `git status` clean after every run; the counts measured by a scratch run of the same checks):
the control (the unchanged mirror) passes RD1, RD2, RD4, RD5 and RD9, 0 problems each. A 301 (`redirect.js`'s status):
RD1 red, 52 problems, `site GET eatfitaf.com/: 301, not 302`. The visitor's query passed through (`site.js`: the request's
query appended to the Location): RD1 red, 42 problems, `site GET eatfitaf.com/?e=boston: Location "…&utm_campaign=boston&e=boston"`
(a request with no query still right), and RD5 red, 4 problems, `site: the Location carries the visitor's query`.
`/assets/` redirected (`site.js`: a path under `/assets/` redirected as `/` is): RD2 red, 48 problems, `site, the var set
GET /assets/email/halftone-ink.png: 302 and 0 bytes, not 200 and the built file's` and `302 with the var, 200 without`.
The cookie ignored (`site.js`: `carriesNoTracking` dropped from the count): RD4 red, 12 problems, `site Cookie
"fitaf_no_tracking=1": written (1 data point(s))` and the salt read. The report counting redirect-only visits as visits
(the visitors query without its redirect condition): RD9 red, 7 problems, `2026-10-26: visitors 4, not 1`, `visits 4, not
1`, `2026-10-27: visits 3, not 0`.

**The golden and the base moved** (each from `7b8f4fd`'s own tree, `git archive`, the package's `node_modules` linked;
the recorder's control first reproducing the committed record):

- CC-8 (CC-8b, CC-8c, MS-9, PR-10): `cc-harness` `workerFiles` over `275a481`'s tree reproduces the committed map (39
  files); over `7b8f4fd`'s: `src/worker/site.js` `a769b2eb…` → `311dacc7…`, `index.js` `ddd8e1ab…` → `82e7b35e…`,
  `beacon.js` `f4d76a8b…` → `8ea4868c…`, `redeem.js` `4f45609c…` → `708ec51a…`, and added `src/worker/redirect.js`
  (`49f28617…`) and `src/qr-event.js` (`e97c0ae1…`, the page's file, now also the Worker's), 39 → 41 files.
- SP3's base (`sp-production.mjs` `LATER`): `275a481`..`7b8f4fd` over `src/worker/beacon.js`, every hunk taken; SP3's
  CC-8b then finds the patched base's `beacon.js` equal to `7b8f4fd`'s. `MOVED_WORKER_FILES` gains `src/qr-event.js` and
  `src/worker/redirect.js` (`site.js`, `index.js` and `redeem.js` named already).
- Not moved: S20, PV5, U4, WC-9, CC-4, T5, the budget and every other reader (the whole suite at `7b8f4fd`): no page the
  builds write changed.

**Found, not ruled**

- ⚠ **The offer page's logo** (`pages.js`'s `LOGO`, on every Worker page) also links to `/`, with no `via`. § 4's list names
  `redeem.js`'s links alone, so it was left: a press of the logo from the offer page is redirected `utm_medium=direct`.
  One line in `pages.js` if it should carry `via=email` too.
- ⚠ **§ 3's program list matches some people's phones**: `/bot/i` matches a model name holding `bot` (a Cubot phone's
  user agent), whose redirect is then not counted. The list is the contract's, as written.
- **RD9 evaluates the report's SQL in the case** (`em-a-checks.mjs`'s evaluator); the new query uses only forms it
  already read. None of it was run against Cloudflare.
- **The team's dashboard** (Fit AF `analytics-worker.spec.md` § 13) must leave the `redirect` rows out of its visits, as
  § 16's offer rows; it was not touched here.
- `HEAD /?no-tracking` and `HEAD /?tracking` are the store's 302 in redirect mode (item 7), so a tester sets the cookie
  with a GET, as before.

**Not done here**: Storybook (`wp-chrome` opens two offer pages, whose links now carry `via=email`; it starts its Worker
through `worker-harness.mjs`, which drops the var) and the watch; `npm run contrast` (no colour or style changed); the
SQL against Cloudflare; dev and production (§ 8's `curl -sI` and the data point read back are the orchestrator's);
fitaf-infra's var; nothing deployed, no `wrangler`, no merge, no pin.

## 10. Amendment, 2026-10-27: two follow-ups from § 9. CONTRACT, before any code

The Advisor (`AskUserQuestion`, `ts=2026-10-27T23:02:56.802Z`) chose both of § 9's open items to be done now:

1. **The offer page's logo names the email.** § 9 item 2 found that the logo (`src/worker/pages.js`'s `LOGO`, on every
   Worker page) links to `/` without `via=email`, so a press of it on the offer page is counted `direct`. On the offer
   page `/o/<code>` (each of its four kinds) the logo's link is `/?via=email`, as § 4's links are; every other Worker
   page (`/confirm/…`, the too-many page) keeps `/`. Nothing else changes: the logo's image, size, alt text and place.
2. **A Cubot phone is a person.** § 9 item 5 found that § 3's program list matches `bot` inside *CUBOT*, a phone
   maker's user agent (`… Android 11; CUBOT X30 …`). The list keeps every program it named, and no longer matches a
   phone's name that merely contains the letters: the rule is the builder's (for instance `bot` not preceded by `cu`),
   stated in § 10.1 with the samples it was tested on. ⛔ The list stays one closed list kept once in the code.
3. **Cases**, written first and run red: **RD7b** the offer page's logo `/?via=email` for each kind, and `/` on the
   confirm page; **RD4b** a Cubot phone's user agent (two real-shaped samples) counted, and each named program still
   not counted (Googlebot, bingbot, Slackbot, Twitterbot, facebookexternalhit, curl, a headless Chrome). **Mutant**:
   the list back to `bot` (RD4b).
4. **When**: on `boston/redirect-followups` from the release line `2bbc066`; the whole site suite; dev (`curl -s` of an
   unknown code's offer page, its logo's `href` read; a Cubot-agent GET read back from the dev dataset), then
   production on the Advisor's word.

### 10.1 Built — found at the build, not ruled (2026-10-27)

§ 10 is unchanged. On `boston/redirect-followups` (from `3dbfc51`, the contract on the release line `2bbc066`): the cases
at `1c11516` (on `3dbfc51`'s code, red), the code at `63e8721`, the golden it moves at `f9d28e4`, the mutant at
`f9fef56`, this section after them.

**What was built**

- `src/worker/pages.js`: `logo(href)`, the one element; `LOGO` its link to `/`, `OFFER_LOGO` its link to `/?via=email`.
  `page()` takes `OFFER_LOGO` when it is given an `offer`, which `redeem.js`'s four pages alone give (saved, welcome,
  current, ended, a known code's and an unknown one's); every other Worker page (the confirmation's landing pages,
  confirmed, declined, GONE, TOO_MANY) keeps `/`. The image, its size, its alt text and its place are unchanged.
- `src/worker/redirect.js`: `PROGRAM_AGENT`, still the one closed list kept once, its `bot` now `(?<!cu)bot`.

**The rule** (§ 10 item 2, the builder's): **`bot` not preceded by `cu`**, case-insensitive, as a lookbehind in the same
regular expression: `/(?<!cu)bot|crawl|spider|slurp|preview|facebookexternalhit|curl|wget|python|go-http-client|headless/i`.
Every other alternative is § 3's, as written. Tested on:

| | user agent | before § 10 | after |
|---|---|---|---|
| RD4b | `Mozilla/5.0 (Linux; Android 11; CUBOT X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.111 Mobile Safari/537.36` | program | **person**, counted, a phone |
| RD4b | `Mozilla/5.0 (Linux; Android 13; CUBOT KINGKONG 9 Build/TP1A.220624.014) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36` | program | **person**, counted, a phone |
| RD4b | Googlebot `Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)` | program | program |
| RD4b | bingbot `Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)` | program | program |
| RD4b | Slackbot `Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)` | program | program |
| RD4b | Twitterbot `Twitterbot/1.0` | program | program |
| RD4b | `facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)` | program | program |
| RD4b | `curl/8.4.0` | program | program |
| RD4b | a headless Chrome, `… HeadlessChrome/120.0.0.0 Safari/537.36` | program | program |
| RD4b (RD4's) | one sample each of `crawl`, `spider`, `slurp`, `preview`, `wget`, `python`, `go-http-client` | program | program |
| scratch | `… Android 10; CUBOT_NOTE_20) …`, `… Android 12; Cubot P60) …` | program | person |
| scratch | Applebot, AhrefsBot, YandexBot, DuckDuckBot, Discordbot, `TelegramBot (like TwitterBot)` | program | program |

The scratch rows were read from `PROGRAM_AGENT` itself by a scratch script, not by a case. RD4b's rows run through both
Workers in Miniflare (the 302 every time; one data point, device `phone`, for each Cubot; none, SALTS untouched, for each
program).

**Cases, before and after** (`nice -n 15 node --test` over the files named; the whole suite as
`nice -n 15 npm --prefix boston-2026-10 test`)

| | before the code (`1c11516`, `3dbfc51`'s code) | after |
|---|---|---|
| `test/rd4b-cubot.test.mjs test/rd7b-offer-logo.test.mjs test/sp15-worker-pages-look.test.mjs test/n-05-unchanged.test.mjs "test/rd[0-9]-*.test.mjs"` | `# tests 24` `# pass 21` `# fail 3` (RD4b, RD7b, SP15's logo) | in the next row's run |
| `"test/rd*.test.mjs"`, SP15, N5, `"test/em-a*.test.mjs"`, S11, SP11, SP12, SP16, CC-8, MS-9, PR-10, SP3 | | `63e8721`: `# tests 71` `# pass 66` `# fail 5` (CC-8b, CC-8c, MS-9 twice, PR-10: CC-8's map alone) |
| CC-8, MS-9, PR-10, SP3 (the golden's readers) | | `f9d28e4`'s tree: `# tests 13` `# pass 13` `# fail 0` |
| `test/rd-mutants.test.mjs` | | `f9fef56`: `# tests 7` `# pass 7` `# fail 0` |
| the whole suite | | `f9fef56`: `# tests 1394` `# pass 1394` `# fail 0` (its first run there: § 9's 1,391, RD4b, RD7b and the list's mutant) |

Red for the right reasons. RD4b: `site a Cubot phone (Mozilla/5.0 (Linux; Android 11; CUBOT X30) …): 0 data point(s), not 1
(a person's phone, counted)`, both samples on both Workers, every named program already uncounted. RD7b: `a save from
demo, its offer live, the code (saved): logo ["<a class=\"logo\" href=\"/\">…"], not ["<a class=\"logo\"
href=\"/?via=email\">…"]`, on every offer page of every kind (and the Worker pages `original`, `ended`, `current`), the
other Worker pages already `/`. SP15: `original: the logo, a link to /?via=email`. N5 passed before and after: its
removal of `via=email` from this tree's `/o/…` links (§ 9 item 14) takes the logo back to `/` too.

**The mutant** (`test/rd-mutants.test.mjs`, in a mirror through RD4b's own check; the tracked tree untouched, `git
status` clean after the run): the control (the unchanged mirror) passes RD1, RD2, RD4, RD4b, RD5 and RD9. The list back
to `bot` (`redirect.js`: `(?<!cu)bot` → `bot`): RD4b red, 4 problems, `<entry> a Cubot phone (…): 0 data point(s), not 1
(a person's phone, counted)` for both samples on both Workers; every named program still uncounted. The five mutants of
§ 7 still die on their cases.

**The golden moved** (from `63e8721`'s own tree, `git archive`; the recorder over `1c11516`'s tree first reproducing the
committed map, 41 files): CC-8 (CC-8b, CC-8c, MS-9, PR-10), `src/worker/pages.js` `6b8173ed…` → `69156378…` and
`src/worker/redirect.js` `49f28617…` → `02010f64…`, none added or removed. Not moved: SP3 (both files named in
`MOVED_WORKER_FILES` already), and every built page (no page the builds write changed).

**Cases changed with § 10** (in the cases' commit): SP15's logo check (the offer pages' `original`, `ended` and `current`
to `/?via=email`, the rest to `/`); N5's note only.

**Found, not ruled**

- ⚠ **`(?<!cu)bot` also counts a program whose name ends in `cubot`**, should one exist; none was found among the samples.
- ⚠ **The list misses some link previews**: WhatsApp's fetcher (`WhatsApp/2.23.20.0 A`) names no word of the list, so a
  link shared in WhatsApp and previewed is counted as a visit, before § 10 and after. The list is § 3's; adding a word is
  its own amendment.
- The offer page's logo now leads to `/?via=email`, so a press of it in redirect mode goes to the store marked
  `utm_medium=email` without a campaign (the logo carries no `e`); with the page served, the page ignores the query's
  `via`, as for § 4's links.

**Not done here**: Storybook (`wp-chrome` opens two offer pages, whose logo now links to `/?via=email`) and the watch;
`npm run contrast` (no colour or style changed); dev and production (§ 10 item 4's `curl -s` and the dataset read are the
orchestrator's); nothing deployed, no `wrangler`, no merge, no pin.
