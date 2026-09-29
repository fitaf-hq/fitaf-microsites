# boston-2026-10

The front door for the late-October 2026 Boston trip: a single static page, opened from a QR code,
that asks two questions (goal, then which meals) and hands the visitor to the plan's order page on the
Fit AF store. Rung 1 of [`SPEC.md`](SPEC.md), which is the contract. Everything here is public (see the
[repository README](../README.md)).

## What is here

| path | what | kind |
|---|---|---|
| `SPEC.md` | the contract, §§ 0–5 | authority |
| `data/plans.json` | the plan table, read off the store's public plans page on a date | INPUT |
| `data/events.json` | one entry per event URL that gets a QR code | INPUT |
| `data/messages.json` | the campaign's phrases: the page's headline, intro line, tagline (meta description) and top bar, and the mock-ups' own; one place to change a phrase | INPUT |
| `src/template.html` | the page: markup and inline CSS, with `{{SLOT}}` placeholders | INPUT |
| `src/app.js` | the one small inline script: the two questions, tabs, "See all plans", URL fragment | INPUT |
| `src/fonts/` | Poppins 600/700 and Open Sans 400/600, Latin WOFF2 subsets (Fontsource 5.3.0), with `OFL-*.txt` | INPUT, copied to `dist/fonts/` |
| `src/assets/fitaf-logo.png` | the store's public logo, 330×210, byte-identical to the store's file | INPUT, copied to `dist/assets/` |
| `src/contrast-pairs.json` | every colour pair the page draws, by token, with its role and minimum APCA Lc | INPUT to `npm run contrast` |
| `scripts/contrast.mjs` | `npm run contrast`: prints the APCA table; exits 1 on a failing pair, a raw colour outside `:root`, or an unmeasured token | tool |
| `build.mjs` | plain Node 22 ESM; fills the template from the data and writes the QR codes | build |
| `test/*.test.mjs` | T1–T7 of SPEC § 4, B1 (brand assets), B2 (contrast, with mutants), S1–S20 of rung 4 (`sNN-*.test.mjs`), M1–M13 of rung 5 (`mNN-*.test.mjs`) and P1–P6 of the mock-ups (`pN-*.test.mjs`); `node --test`, no network | tests |
| `dist/` | `index.html`, `fonts/`, `assets/` and `qr/<event>.png` + `.svg` | OUTPUT, git-ignored |
| `SPEC-rung3-lead-capture.md` | rung 3's contract: claim the offer, a lead record built to be destroyed (its claim endpoint and tables are retired by rung 4) | history |
| `SPEC-rung4-save-offer.md` | rung 4's contract: save the offer first, the lead lifecycle, `/confirm` and `/o`; cases S1–S20 | authority |
| `SPEC-rung5-sending.md` | rung 5's contract: the real sender (Resend), dev only, behind an allowlist; cases M1–M9, and § 8 (the derived token) M10–M13 | authority |
| `consent/DRAFT.md` | the consent wording (v0.3, ⛔ not approved): the page (§§ 1–2), the emails (§ 3) and `/confirm` (§ 4) show it verbatim | authority |
| `flows/` | the multi-step flows (save the offer, build a plan, the next-day email, text (off for October), return, the lead record, the calendar cart, this week's menu), each with a Mermaid diagram: states, transitions, data, consent points, written **before** they are built | design; the contracts win where a flow and a contract disagree about something built |
| `data/save.json` | the save endpoint, the wording version the page sends and the versions the Worker accepts, the send hour and zone, the lapse periods | INPUT |
| `data/offers.json` | the offers, ⛔ **placeholders** (`"status": "placeholder"`): which one a save gets, which is current | INPUT |
| `src/save/` | **dev build only**: Flow 1 (`section.html`, `flow1.js`), the share panel (`share-panel.html`, `share.js`), the one arithmetic module (`calculator.js`), `banner.html`, `style.css` | INPUT |
| `src/worker/` | the Worker (below) | INPUT |
| `migrations/` | D1 schema, applied in order: `0001_claims.sql`, `0002_contacts.sql` (rung 3), `0003_saves.sql` (rung 4: drops rung 3's tables), `0004_sending.sql` (rung 5: attempts, Resend's id, the send claim) | INPUT |
| `scripts/` | `seed-dummy.mjs` + `dummy-saves.mjs` (dummy data, dev only), `purge.mjs`, `erase.mjs`, `d1-cli.mjs` | tools |
| `mockups/` | ⭐ **four marketing mock-ups for a screen share** (tent card, flyer, banner, slideshow), built from the page's own data, tokens, logo and QR code; photos by manifest, never committed. See [`mockups/README.md`](mockups/README.md) | INPUT + build |
| `dist-mockups/` | the mock-ups: HTML, PNGs and the photos they show | OUTPUT, git-ignored |
| `dist-dev/` | the development pages: `index.html` and `<event-id>/index.html` per event (rung 1's page, Flow 1 on top, Flow 2 as a meal size, the share panel) | OUTPUT, git-ignored |

**Nothing in `dist/` is hand-edited.** To change the page, change `data/` or `src/` and rebuild.

## Rebuild and test

```sh
npm --prefix boston-2026-10 install
npm --prefix boston-2026-10 test        # T1–T7, B1–B2, S1–S20, M1–M13, P1–P6
npm --prefix boston-2026-10 run contrast  # the APCA table; exit 1 if any pair is under its minimum
npm --prefix boston-2026-10 run build   # writes dist/
npm --prefix boston-2026-10 run build:mockups  # the four mock-ups -> dist-mockups/ (mockups/README.md)
```

## ⛔ Deploys are not run from here (retired 2026-09-29)

Both Workers — production and `dev` — and the dev Worker's secrets are managed as **infrastructure as code,
applied by CI**. CI checks out a **pinned commit** of this repository, runs `npm run build` (or `build:dev`)
and uploads the result; for dev it first runs `npm run db:migrate:dev`. So a commit here changes nothing
live until a pin moves to it, and **a release is a pin change**, reviewed where the pin lives.

- **Retired**: `deploy`, `deploy:dev` (and their `predeploy` hooks), `secret:resend:dev`,
  `secret:allowlist:dev`, `secret:token-key:dev`. ⛔ Do not add them back: a second path that writes the
  same Worker would let the live Worker drift from the code that is supposed to describe it.
- **Kept, because CI or a person still runs them**: `build`, `build:dev`, `db:migrate:dev`, and the dev
  data scripts below; `preview` and `preview:dev` run locally only.
- ⚠ `wrangler.jsonc` now drives only local preview and `db:migrate:dev`. The deployed Workers' settings
  (vars, bindings, the cron, `workers.dev`, the custom domains) are **mirrored** in the infrastructure
  code: a change to this file reaches nothing live until it is mirrored there too.

## Rungs 3–4 — development only

⛔ **Nothing below touches production.** The top level of `wrangler.jsonc` is the production Worker and is
unchanged: no script, no bindings, no cron. Rung 4 ([`SPEC-rung4-save-offer.md`](SPEC-rung4-save-offer.md))
lives in its `dev` environment — Worker `fitaf-microsites-dev`, D1 `fitaf-leads-dev` (dummy data only),
Cloudflare's published Turnstile **test** keys. The production build (`npm run build`) leaves every
development slot empty and every reworded slot at its old text, so `dist/` is byte-identical to the build
before rung 4 (test S20 compares SHA-256s with `test/s20-production-golden.json`).

```sh
export CLOUDFLARE_ACCOUNT_ID=…            # never committed
npm --prefix boston-2026-10 test                      # T1–T7, B1–B2, S1–S20, M1–M13, P1–P6 (Miniflare, no network)
npm --prefix boston-2026-10 run db:migrate:dev        # D1 migrations -> fitaf-leads-dev (0003 drops rung 3's tables; 0004 adds sending)
npm --prefix boston-2026-10 run seed:dev              # 20 dummy saves, 5 marked exported
npm --prefix boston-2026-10 run purge:dev             # DRY RUN: counts only
npm --prefix boston-2026-10 run purge:dev -- --apply  # delete exported saves' contacts; mark them purged
npm --prefix boston-2026-10 run erase:dev -- --email dummy-0001@example.com          # DRY RUN: counts only
npm --prefix boston-2026-10 run erase:dev -- --email dummy-0001@example.com --apply  # erase on request
npm --prefix boston-2026-10 run build:dev             # writes dist-dev/ (CI builds and uploads it)
```

Dev URL: `https://fitaf-microsites-dev.fitaf-microsite-boston-2026-10.workers.dev/` (`/<event-id>/` per event).

**The page** (flows 1 and 2): the offer first, with **Save my offer** (email, ZIP, an unticked marketing
box) and **Build my plan →**; an out-of-area ZIP is caught in the page and offered the expansion list; Flow
2's first question is a meal size; the share calculator's targets never leave the browser. `#from-email`
opens at Flow 2 with Flow 1 collapsed. Per flow: one state object, one `render(state)` that alone writes the
DOM, transitions named after the flow's rows (`src/save/flow1.js`, `src/save/share.js`). Flow 2's own
script is still rung 1's `src/app.js`, unchanged so production stays byte-identical.

**The Worker** (`src/worker/`):

| route or trigger | module | what it does |
|---|---|---|
| `POST /api/save` | `index.js`, `validate-save.js`, `save-store.js` | a save (`offer` or `expansion`), idempotent per (event, kind, email); returns `{ ok: true }` only |
| `/confirm/<token>` | `confirm.js` | GET renders LANDING or GONE and changes nothing; POST `action=yes\|no` |
| `/o/<code>` | `redeem.js` | ORIGINAL · WELCOME_BACK (one reissued code per original per offer) · CURRENT |
| cron, every 5 minutes | `scheduled.js` → `send-due.js`, `lapse.js`, `purge.js` | send what is due, then the lapse, then the purge; counts only |

- **Nothing is sent without the Resend key** (rung 5, below). Without `RESEND_API_KEY` the cron's `Sender`
  is `NullSender` (`senders.js`), which sends nothing and leaves each message `scheduled`. `NullRedemptions`
  knows of no redemption: the order source is still open. Tests use a recording sender and a stubbed `fetch`.
- **E1 goes at 09:00 America/New_York on the next calendar day** (`zoned-time.js`, with `Intl`: there is no
  `Temporal` in the Workers runtime or in Node 22). An expansion request's E-X goes at once.
- **The `/confirm` token** is made when its message is sent, 32 bytes; only its SHA-256 is stored. Since rung
  5 it is derived from the save id with `CONFIRM_TOKEN_KEY` (below), so every attempt carries the same one.
- **The lapse** (`lapse.js`): an offer save without confirmed marketing 30 days after its offer ends; an
  expansion request unconfirmed after 7 days; a confirmed one after `expansion_retention_days` (365,
  proposed). Each deletes the contact and sets `lapsed`; the save row stays.
- **Every run a person starts is a dry run by default** (`purge.mjs`, `erase.mjs`), and the seeder, the
  purge and the erase refuse any database but `fitaf-leads-dev`. Dummy contacts are `dummy-NNNN@example.com`.
- **The rate limits are per IP per minute** (a Workers rate-limit binding counts over 10 or 60 seconds):
  saves, and lookups (`/confirm`, `/o`), 5 each. The IP is the limiter's key and nothing else.
- **The Worker's pages draw no colour** (browser defaults), so `npm run contrast` has no pair to measure for them.
- **The mutant cases never write a committed file**: T7 swaps a copy of the data; S15 and S14b import a
  mutated copy of `lapse.js` / `purge.js`. `LAPSE_MODULE=<copy> node --test test/s14-lapse.test.mjs` shows
  S14 failing on a copy (and `PURGE_MODULE=<copy>` the purge case).

## Rung 5 — sending through Resend, dev only, to an allowlist

[`SPEC-rung5-sending.md`](SPEC-rung5-sending.md). ⛔ **Development Worker only**; production is unchanged.
The development database holds dummy `@example.com` addresses, which accept no mail: sending to them would
**bounce**, and bounces damage a new sending domain's reputation. So the real sender runs **only to
addresses on an allowlist**.

**The three secrets — set by the infrastructure code (since 2026-09-29), never committed here, never typed:**
`RESEND_API_KEY` is a sending-only key, `SEND_ALLOWLIST` is configuration kept a secret binding because it
may name a real address, and `CONFIRM_TOKEN_KEY` is generated (random, 44 characters) and seen by nobody.
Until 2026-09-28 they were set with `wrangler secret put` scripts in this package; those are retired (see
*Deploys are not run from here*). Replacing the token key changes every `/confirm` link in an email not yet
sent; links already sent keep working, because the database holds their hashes.

- **`SEND_ALLOWLIST`**: a comma-separated list of exact addresses and `@domain` entries (a whole domain, not
  its subdomains; case does not matter). A message to anyone not on it is **held**: nothing is requested,
  it stays `scheduled`, and it is neither sent nor failed. **Unset or empty sends nothing.** For a first
  check, use Resend's published test addresses
  ([Resend: send test emails](https://resend.com/docs/dashboard/emails/send-test-emails)):
  `delivered@resend.dev` (accepted and delivered) and `bounced@resend.dev` (the receiving server refuses it),
  each also with a `+label` (`delivered+first@resend.dev`); an allowlist of `@resend.dev` admits exactly
  those.
- **`RESEND_API_KEY`** present → `ResendSender` behind the allowlist; absent → `NullSender`, rung 4's
  behaviour (`choose-sender.js`). With the Resend key, **`CONFIRM_TOKEN_KEY` is required**: without it (or
  under 32 characters) the sender refuses to start and the cron run fails, sending nothing (M13).
- **The `/confirm` token is derived, not drawn** (§ 8 of the contract): `base64url(HMAC-SHA-256(
  CONFIRM_TOKEN_KEY, "<save_id>:confirm"))`, by Web Crypto (`confirm-token.js`). Only its SHA-256 is stored,
  as in rung 4, and whether it still works is decided by the database, not by the token.
- **`MAIL_FROM`** is public config in the `dev` vars of `wrangler.jsonc` (mirrored in the infrastructure
  code, which is what the deployed Worker uses): ⬜ the placeholder `Fit AF <offers@eatfitaf.com>` until the
  Owner names the sender. Its domain must be verified in Resend; `eatfitaf.com` was, on 2026-09-29.

**The sender** (`resend-sender.js`, from Resend's documentation read 2026-09-27): `POST
https://api.resend.com/emails` with `Authorization: Bearer`, a `User-Agent`, and an `Idempotency-Key` of
`<save_id>:<E1|EX>`; the body is `{ from, to: [email], subject, html, text }`, the HTML and the text part
rendered from one list of lines (`messages.js`). Accepted → `sent` and Resend's `id` stored in
`provider_message_id`. A permanent refusal (a 4xx other than 429) → `failed` at once. Temporary (429, 5xx, a
network error or a 10 s timeout, and 409 `concurrent_idempotent_requests`) → stays `scheduled`,
`send_attempts + 1`; the fifth → `failed`. A `sent` or `failed` message is never selected again.

**Every attempt for one message sends a byte-identical body** (the token is derived), so Resend's
idempotency key replays within its 24-hour window: an accepted send whose database write was lost is
retried under the same key and comes back with the first request's id, and is marked `sent` without a
second email (M10, M11). A 409 `invalid_idempotent_request` (the key reused with a different body) can then
only mean a defect: it is `failed` and counted.

**A send in flight is never requested twice**: each run first **claims** a due message
(`send_lease_until`, 15 minutes) and every outcome clears the claim; a later run that finds the claim
skips the message (`inflight`). The idempotency key covers what the claim cannot, a send accepted and then
forgotten; the claim covers what the key alone would answer with a 409, two runs at once.

**The cron logs one line of counts** — `due · suppressed · sent · failed · deferred · held · retrying ·
inflight` — and nothing else: no address, token, code or key (test M7).

**The manual check on dev**: save to `delivered+<label>@resend.dev` (an offer's E1 goes at 09:00
America/New_York on the next day; an expansion request's E-X on the next cron), then open the email in
Resend's dashboard and follow its `/confirm` link. Every dummy `@example.com` save must stay `scheduled`.
✅ **Run 2026-09-29**: an E-X saved at 02:57Z was delivered to its `@resend.dev` test address, and its
`/confirm` link rendered the landing page for that save (its ZIP, both buttons).

**Mutants on copies**: M5 imports a copy of `allowlist.js` with the check removed and shows M4 failing;
M9b copies `src/worker/` and `data/` to a temporary directory, removes the claim's lease condition from
`send-due.js` there, and shows M9 failing; M12 imports a copy of `confirm-token.js` that draws a random
token per attempt and shows M10 failing. Each runs its case on the real module first, as a control.

## Branding — the store's look, and where it departs

The page echoes the store: a slim navy top bar over a white header with the logo, Poppins headings,
Open Sans body, white plan cards with a hairline border and each plan's colour as its top bar (Lean
`#48aeee`, Signature `#8cc63f`, Performance `#f7941d`, Family `#f5bb00`), and teal chips with navy digits.
**Every colour is a token in `:root`**, and `npm run contrast` measures every pair in
`src/contrast-pairs.json` with APCA (`apca-w3`): body text |Lc| ≥ 75, large or bold text (≥ 24px, or
≥ 18.66px at 700) ≥ 60, UI components and large headings ≥ 45, non-text accents ≥ 30.

Departures from the store, each for legibility:

- **The button orange is darker.** The store's white-on-`#ff931e` measures Lc −48.1 — under 60 even at
  19px bold (and the store's 14px label would need 75). Navy on `#ff931e` is 55.5, also under. The page
  uses **`#d66400`** (hover `#c25a00`) with the store's white uppercase bold label, at 19px: Lc −69.3.
  `#ff931e` survives as a non-text accent (the rule above the heading, the save section's top bar).
- **Muted text is `#5b5b5b` only** — the store's other grey, `#6c757d`, is Lc 72.6 on white (under 75).
  `#6c757d` is kept for input borders, where 45 is the bar.
- **Teal carries navy digits at 19px bold only** (Lc 65.7); the store's 11px navy-on-teal would need 75.
- **Plan colours are never behind text** — accents only (bar, check disc; the check itself is navy).

- **Money is integer cents.** Per-meal prices are stored; weekly totals are always computed
  (`meals_per_week × price_per_meal_cents`) in `build.mjs`. The inline script only displays strings the
  build computed, so the arithmetic exists once.
- **The page shows 7 and 14 only** (`shown_counts` in `plans.json`); the 4/10/21 cells are held for the
  price ladder of a later rung. Adding a count to `shown_counts` is a data change, not a code change.
- **The choice lives in the URL fragment**: `#lean`, `#lean-7`, `#signature-14`, `#meals-14` (count
  without a goal), `#family`, `#individual`. Each choice pushes a history entry, so back and forward work.
- **There are exactly seven order links in the HTML**: the six grid cells and the Family button. The
  result card's "Choose your meals" has no `href` until the script sets it from the chosen cell, so a
  test counting links counts the table, not a duplicate of it.
- **Without JavaScript** the two questions are hidden and the grid and Family card are shown, so every
  link still works.

## ⛔ Running wrangler — only through this package's scripts

**Always** `npm --prefix boston-2026-10 run <script>` (`db:migrate:dev`, `cf:whoami`, `cf:versions`, …) —
`npm run` sets the working directory to this package, so wrangler reads `wrangler.jsonc` here. ⛔ **Never**
`npm exec wrangler …` or `npx wrangler …` from any other directory: on 2026-09-27 a `pages project create`
run that way from a private repository let wrangler's automatic setup pick that repository's own build
folder and **upload it publicly**; it stayed reachable at a version preview URL until the Worker was
deleted. If an operation has no script yet, add one here first — **except a deploy or a secret**, which
belong to the infrastructure code (see *Deploys are not run from here*).
