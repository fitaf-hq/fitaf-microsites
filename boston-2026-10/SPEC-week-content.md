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
