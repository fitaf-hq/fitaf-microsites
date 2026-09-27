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
| `build.mjs` | plain Node 22 ESM; fills the template from the data and writes the QR codes | build |
| `test/*.test.mjs` | T1–T7 of SPEC § 4, `node --test`, no network | tests |
| `dist/` | `index.html` and `qr/<event>.png` + `.svg` | OUTPUT, git-ignored |
| `SPEC-rung3-lead-capture.md` | rung 3's contract: claim the offer, a lead record built to be destroyed | authority |
| `consent/DRAFT.md` | the consent wording (v0.2, ⛔ not approved) the claim section shows | authority |
| `data/claim.json` | the event id, the claim endpoint, the wording version the page sends and the versions the Worker accepts | INPUT |
| `src/claim/` | the claim section: `banner.html`, `section.html`, `style.css`, `claim.js` — **dev build only** | INPUT |
| `src/worker/` | the Worker: `index.js` (`POST /api/claim`), `validate.js`, `claim-store.js`, `offer-code.js`, `turnstile.js`, `purge.js` | INPUT |
| `migrations/` | D1 schema, applied in order: `0001_claims.sql`, `0002_contacts.sql` | INPUT |
| `scripts/` | `seed-dummy.mjs` + `dummy-claims.mjs` (dummy data, dev only), `purge.mjs`, `d1-cli.mjs` | tools |
| `dist-dev/` | the development page (the rung-1 page plus the claim section) | OUTPUT, git-ignored |

**Nothing in `dist/` is hand-edited.** To change the page, change `data/` or `src/` and rebuild.

## Rebuild, test, deploy

```sh
npm --prefix boston-2026-10 install
npm --prefix boston-2026-10 test        # T1–T7
npm --prefix boston-2026-10 run build   # writes dist/
npm --prefix boston-2026-10 run deploy  # builds, then wrangler deploy
```

## Rung 3 — development only

⛔ **Nothing below touches production.** The top level of `wrangler.jsonc` is the production Worker and is
unchanged: no script, no bindings. Rung 3 lives in its `dev` environment — Worker `fitaf-microsites-dev`,
D1 `fitaf-leads-dev` (dummy data only), Cloudflare's published Turnstile **test** keys. The production build
(`npm run build`) leaves every rung-3 slot empty and is byte-identical to rung 1's.

```sh
export CLOUDFLARE_ACCOUNT_ID=…            # never committed
npm --prefix boston-2026-10 test                      # T1–T7 and C1–C10 (Miniflare, no network)
npm --prefix boston-2026-10 run db:migrate:dev        # D1 migrations -> fitaf-leads-dev
npm --prefix boston-2026-10 run seed:dev              # 20 dummy claims, 5 marked exported
npm --prefix boston-2026-10 run purge:dev             # DRY RUN: counts only
npm --prefix boston-2026-10 run purge:dev -- --apply  # delete exported claims' contacts; mark them purged
npm --prefix boston-2026-10 run deploy:dev            # builds dist-dev/, then wrangler deploy --env dev
```

Dev URL: `https://fitaf-microsites-dev.fitaf-microsite-boston-2026-10.workers.dev/` (pick a plan to see
the claim section).

- **The purge is a dry run unless `--apply` is passed.** Its logic is `src/worker/purge.js`, one module
  for the CLI now and the Worker later; the CLI runs it through `wrangler d1 execute`.
- **The seeder and the purge refuse any database but `fitaf-leads-dev`.** Dummy contacts are
  `dummy-NNNN@example.com` and `+1 617 555 01xx` (the range reserved for fiction), and pass through the
  Worker's own validation.
- **The rate limit is per IP per minute, not per hour**: a Workers rate-limit binding can only count
  over 10 or 60 seconds. The IP is the limiter's key and nothing else; it is not stored, not logged and
  not sent to Turnstile.
- **A 1-in-2^40 offer-code collision** fails the UNIQUE constraint and draws a new code.
- **The mutant cases never write a committed file**: T7 swaps a copy of the data, C9 imports a mutated
  copy of `purge.js`. `PURGE_MODULE=<copy> node --test test/c08-purge.test.mjs` shows C8 failing on it.

## What a reader would misread

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
