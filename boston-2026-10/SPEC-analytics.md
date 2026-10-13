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
