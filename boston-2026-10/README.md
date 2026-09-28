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
| `src/template.html` | the page: markup and inline CSS, with `{{SLOT}}` placeholders | INPUT |
| `src/app.js` | the one small inline script: the two questions, tabs, "See all plans", URL fragment | INPUT |
| `src/fonts/` | Poppins 600/700 and Open Sans 400/600, Latin WOFF2 subsets (Fontsource 5.3.0), with `OFL-*.txt` | INPUT, copied to `dist/fonts/` |
| `src/assets/fitaf-logo.png` | the store's public logo, 330×210, byte-identical to the store's file | INPUT, copied to `dist/assets/` |
| `src/contrast-pairs.json` | every colour pair the page draws, by token, with its role and minimum APCA Lc | INPUT to `npm run contrast` |
| `scripts/contrast.mjs` | `npm run contrast`: prints the APCA table; exits 1 on a failing pair, a raw colour outside `:root`, or an unmeasured token | tool |
| `build.mjs` | plain Node 22 ESM; fills the template from the data and writes the QR codes | build |
| `test/*.test.mjs` | T1–T7 of SPEC § 4, B1 (brand assets), B2 (contrast, with mutants), and S1–S20 of rung 4 (one file per case, `sNN-*.test.mjs`); `node --test`, no network | tests |
| `dist/` | `index.html`, `fonts/`, `assets/` and `qr/<event>.png` + `.svg` | OUTPUT, git-ignored |
| `SPEC-rung3-lead-capture.md` | rung 3's contract: claim the offer, a lead record built to be destroyed (its claim endpoint and tables are retired by rung 4) | history |
| `SPEC-rung4-save-offer.md` | rung 4's contract: save the offer first, the lead lifecycle, `/confirm` and `/o`; cases S1–S20 | authority |
| `consent/DRAFT.md` | the consent wording (v0.3, ⛔ not approved): the page (§§ 1–2), the emails (§ 3) and `/confirm` (§ 4) show it verbatim | authority |
| `flows/` | the multi-step flows (save the offer, build a plan, the next-day email, text (off for October), return, the lead record, the calendar cart, this week's menu), each with a Mermaid diagram: states, transitions, data, consent points, written **before** they are built | design; the contracts win where a flow and a contract disagree about something built |
| `data/save.json` | the save endpoint, the wording version the page sends and the versions the Worker accepts, the send hour and zone, the lapse periods | INPUT |
| `data/offers.json` | the offers, ⛔ **placeholders** (`"status": "placeholder"`): which one a save gets, which is current | INPUT |
| `src/save/` | **dev build only**: Flow 1 (`section.html`, `flow1.js`), the share panel (`share-panel.html`, `share.js`), the one arithmetic module (`calculator.js`), `banner.html`, `style.css` | INPUT |
| `src/worker/` | the Worker (below) | INPUT |
| `migrations/` | D1 schema, applied in order: `0001_claims.sql`, `0002_contacts.sql` (rung 3), `0003_saves.sql` (rung 4: drops rung 3's tables) | INPUT |
| `scripts/` | `seed-dummy.mjs` + `dummy-saves.mjs` (dummy data, dev only), `purge.mjs`, `erase.mjs`, `d1-cli.mjs` | tools |
| `dist-dev/` | the development pages: `index.html` and `<event-id>/index.html` per event (rung 1's page, Flow 1 on top, Flow 2 as a meal size, the share panel) | OUTPUT, git-ignored |

**Nothing in `dist/` is hand-edited.** To change the page, change `data/` or `src/` and rebuild.

## Rebuild, test, deploy

```sh
npm --prefix boston-2026-10 install
npm --prefix boston-2026-10 test        # T1–T7, B1–B2, S1–S20
npm --prefix boston-2026-10 run contrast  # the APCA table; exit 1 if any pair is under its minimum
npm --prefix boston-2026-10 run build   # writes dist/
npm --prefix boston-2026-10 run deploy  # builds, then wrangler deploy
```

## Rungs 3–4 — development only

⛔ **Nothing below touches production.** The top level of `wrangler.jsonc` is the production Worker and is
unchanged: no script, no bindings, no cron. Rung 4 ([`SPEC-rung4-save-offer.md`](SPEC-rung4-save-offer.md))
lives in its `dev` environment — Worker `fitaf-microsites-dev`, D1 `fitaf-leads-dev` (dummy data only),
Cloudflare's published Turnstile **test** keys. The production build (`npm run build`) leaves every
development slot empty and every reworded slot at its old text, so `dist/` is byte-identical to the build
before rung 4 (test S20 compares SHA-256s with `test/s20-production-golden.json`).

```sh
export CLOUDFLARE_ACCOUNT_ID=…            # never committed
npm --prefix boston-2026-10 test                      # T1–T7, B1–B2, S1–S20 (Miniflare, no network)
npm --prefix boston-2026-10 run db:migrate:dev        # D1 migrations -> fitaf-leads-dev (0003 drops rung 3's tables)
npm --prefix boston-2026-10 run seed:dev              # 20 dummy saves, 5 marked exported
npm --prefix boston-2026-10 run purge:dev             # DRY RUN: counts only
npm --prefix boston-2026-10 run purge:dev -- --apply  # delete exported saves' contacts; mark them purged
npm --prefix boston-2026-10 run erase:dev -- --email dummy-0001@example.com          # DRY RUN: counts only
npm --prefix boston-2026-10 run erase:dev -- --email dummy-0001@example.com --apply  # erase on request
npm --prefix boston-2026-10 run deploy:dev            # builds dist-dev/, then wrangler deploy --env dev
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

- **Nothing is sent yet.** The cron's `Sender` and `Redemptions` are the null implementations of
  `senders.js`: `NullSender` sends nothing and leaves each message `scheduled`; `NullRedemptions` knows of no
  redemption. Resend and the order source replace them in a later rung. Tests use a recording sender.
- **E1 goes at 09:00 America/New_York on the next calendar day** (`zoned-time.js`, with `Intl`: there is no
  `Temporal` in the Workers runtime or in Node 22). An expansion request's E-X goes at once.
- **The `/confirm` token** is minted when its message is sent, 32 random bytes; only its SHA-256 is stored.
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

**Always** `npm --prefix boston-2026-10 run <script>` (`deploy`, `cf:whoami`, `cf:versions`, …) — `npm run`
sets the working directory to this package, so wrangler reads `wrangler.jsonc` here. ⛔ **Never**
`npm exec wrangler …` or `npx wrangler …` from any other directory: on 2026-09-27 a `pages project create`
run that way from a private repository let wrangler's automatic setup pick that repository's own build
folder and **upload it publicly**; it stayed reachable at a version preview URL until the Worker was
deleted. If an operation has no script yet, add one here first.
