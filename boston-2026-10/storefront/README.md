# storefront/

The committed INPUTS of the storefront watch ([`../SPEC-storefront-watch.md`](../SPEC-storefront-watch.md)),
kept beside the hand-off they protect ([`../src/storefront/`](../src/storefront/)). Both are public: file names,
hashes and a few literal strings of the store's public bundle, never its code or its config.

- **`dependencies.json`** (F2): each literal string of the store's public code that the cart hand-off depends on
  (the meal card element, the title and actions classes, *Add to Cart*, *CHECKOUT*, *CHECKOUT NOW*, *CONTINUE TO
  CHECKOUT*, the pending list and its commit, the Custom Scripts injection; and, for rung 2's two faces, the checkout
  component `app-checkout`, the hide list's names H1–H6 and the pay buttons' containers `checkout__submit` and, on a
  phone, `summary__pay-button`; and § 10's: the extras dialog and its overlay, the discounts, the app banner and the
  margin it reserves, the price rows, the Total, the tip), with what the hand-off uses it for and the contract section
  that says so; and § 12's `ecc_additions_prompt_handled`, the store's key the fill sets before CHECKOUT; and fill C's
  five (`SPEC-rung2-fill-c.md` § 1.1, § 1.4): the card's counter (`counter__value`, `counter__button`, its *"Increase
  value"*) and the plan's own count (`cart__items-count`, `mobile-cart-summary__stat-value`), 51 literals since
  2026-10-01, each found in release `main-N64VDY4M.js`'s files. **Edited by a person**, when the hand-off comes to depend on something
  new, or a release renames something it depends on (and the hand-off is changed to match).
- **`watch-baseline.json`** (§§ 2, 3, 5): the release the watch compares with: the order page's script list, the
  entry bundle's name, its imports, every JS file reachable from it with its SHA-256, and `expectedFooter`, the
  version line of the Footer block Fit AF has pasted (`null` until one is). **Written by a program only**:
  `npm --prefix boston-2026-10/tools/storefront-watch run accept -- --release main-<name>.js` (from the live store's
  public files, for the release the watch's issue names, and only while it is the live one: SPEC § 8), with
  `--footer <dist-storefront/fitaf-handoff.html>` once a build is pasted in the Footer. The commit that lands a new
  baseline names the watch's issue.
- **[`probe-counts/`](probe-counts/README.md)** is **not an input**: measurements of how the live store shows a press
  counted ([`../SPEC-rung2-fill-c.md`](../SPEC-rung2-fill-c.md) § 2), one dated directory per batch, written by the
  watch package's `probe-counts`. Nothing reads them; the contract quotes them.
- **[`probe-snacks/`](probe-snacks/README.md)** is **not an input** either: measurements of a snack in the store's cart
  (its *Select Options*, Size, count and "+", the plan's counts, its line and group on `/checkout` and the hide rules
  that touch them; [`../SPEC-snacks-in-the-cart.md`](../SPEC-snacks-in-the-cart.md) § 1), one dated directory per
  batch, written by the watch package's `probe-snacks`. Nothing reads them; the contract quotes them.
- **[`smoke-snacks/`](smoke-snacks/README.md)** is **not an input** either: the live proof of snacks in the cart
  ([`../SPEC-snacks-in-the-cart.md`](../SPEC-snacks-in-the-cart.md) § 6), the watch's smoke with a built console file and
  links carrying snacks, its reports one dated directory per batch. Pictures beside them are never committed.
- **[`footer-block/`](footer-block/README.md)** is **not an input** either: each Footer block built for the Advisor to
  paste, as Markdown with YAML front matter and the fragment byte for byte between fences, so the pasted text is version
  controlled and the KMS can ingest it.

## What a reader would misread

- **A green hour is not a tested hand-off.** The baseline is whatever release was last accepted. `accept` is run
  after the smoke test passes on that release, not instead of it.
- **`expectedFooter` is what is KEPT, not what is live**: a build's version line. F3 compares the live page with it.
