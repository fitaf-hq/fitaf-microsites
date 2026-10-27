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
