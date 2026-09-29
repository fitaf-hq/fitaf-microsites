# fitaf-microsites

Small, standalone public sites that act as **front doors** to Fit AF's store — one directory per
microsite. The first is [`boston-2026-10/`](boston-2026-10/), for the late-October 2026 Boston
prospecting trip.

## The rule of this repository

- ⛔ **Everything here is PUBLIC.** A file in this repository is published or could be. Only material
  anyone outside the enterprise can already reach goes in: plan names, public prices, public meal names
  and photographs, the storefront's own URLs. **No customer data, no staff data, no internal figures, no
  credentials** — and no pointer into a private repository's files.
- **A microsite is an OUTPUT.** It is built from a small set of committed inputs (a plan table, a
  week's menu) by a build script. Nothing on a page is hand-edited; to change a page, change its input
  or its template and rebuild.
- **Each microsite is self-contained**: its own inputs, template, build, tests and deploy target. Shared
  code moves to a top-level directory only when a second microsite needs it.
- **The destination is the store, not this repository.** Today that is the HMP-backed storefront at
  `fitafnutrition.com`; later it may be the Shopify store. A link's target is data, so the doors can
  be re-pointed without rewriting a page.

## What a reader would misread

- **`mpid`s are HMP configuration, read on a date.** They change when the store's plans change, and
  they are not in order (Signature 14 is `29`, 21 is `28`). Re-read, never infer.
- **A pre-filled cart is not assumed.** Links degrade to the plan's order page when the hand-off is not
  available; see the microsite's spec.

## Conventions

- Commit messages carry **no** tool-attribution trailer; `scripts/git-hooks/commit-msg` rejects one
  (`bash scripts/setup-git-hooks.sh` once per clone).
- `main` holds released work; changes land on topic branches and merge `--no-ff`.
- `.github/workflows/storefront-watch.yml` is the storefront watch (`boston-2026-10/SPEC-storefront-watch.md`): it is here only because GitHub runs a schedule from the default branch, and it runs the dev line's `boston-2026-10/tools/storefront-watch/`.

## Not on the family channel — by ruling

This repository does **not** join the cross-project channel; **its parent team (Fit AF) speaks for it.**
The Advisor, 2026-09-27: *"I agree about the Fit AF microsites – please record it."* — agreeing with
Anodyne's channel convention (`4.1`, § 2 rule 11): *a public or content-only repository does not join the
channel.* Nothing crosses in either direction, and a public member is where an internal pointer would
become a publication. Revisited only if this repository takes on engineering or needs family protocols.

## Hosting

Deployed to Cloudflare as a static-assets Worker, `fitaf-microsites` (config in each microsite's
`wrangler.jsonc`; the account comes from `CLOUDFLARE_ACCOUNT_ID` at deploy time and is never committed).
✅ **On Fit AF's own Cloudflare account since 2026-09-27** (it started on the Advisor's personal account
as a stopgap; that copy is his to delete). ⭐ **The address is `https://eatfitaf.com/`** (and `www.`), attached
2026-09-27 as Worker custom domains in the same account. The `workers.dev` address
(`https://fitaf-microsites.fitaf-microsite-boston-2026-10.workers.dev/`) still serves the same page.
