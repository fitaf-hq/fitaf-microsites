# storefront/

The committed INPUTS of the storefront watch ([`../SPEC-storefront-watch.md`](../SPEC-storefront-watch.md)),
kept beside the hand-off they protect ([`../src/storefront/`](../src/storefront/)). Both are public: file names,
hashes and a few literal strings of the store's public bundle, never its code or its config.

- **`dependencies.json`** (F2): each literal string of the store's public code that the cart hand-off depends on
  (the meal card element, the title and actions classes, *Add to Cart*, *CHECKOUT*, *CHECKOUT NOW*, *CONTINUE TO
  CHECKOUT*, the pending list and its commit, the Custom Scripts injection), with what the hand-off uses it for
  and the contract section that says so. **Edited by a person**, when the hand-off comes to depend on something
  new, or a release renames something it depends on (and the hand-off is changed to match).
- **`watch-baseline.json`** (§§ 2, 3, 5): the release the watch compares with: the order page's script list, the
  entry bundle's name, its imports, every JS file reachable from it with its SHA-256, and `expectedFooter`, the
  version line of the Footer block Fit AF has pasted (`null` until one is). **Written by a program only**:
  `npm --prefix boston-2026-10/tools/storefront-watch run accept` (from the live store's public files), with
  `-- --footer <dist-storefront/fitaf-handoff.html>` once a build is pasted in the Footer. The commit that lands a
  new baseline names the watch's issue.

## What a reader would misread

- **A green hour is not a tested hand-off.** The baseline is whatever release was last accepted. `accept` is run
  after the smoke test passes on that release, not instead of it.
- **`expectedFooter` is what is KEPT, not what is live**: a build's version line. F3 compares the live page with it.
