# storefront/smoke-snacks/

**Measurements, not inputs.** One dated directory per batch of [`SPEC-snacks-in-the-cart.md`](../../SPEC-snacks-in-the-cart.md)
§ 6's live proof: the watch's smoke (`tools/storefront-watch/bin/smoke.mjs`) with a built console file (`--script`) and
a checkout link carrying snacks (`--link`), run on the live store at 1280 and 390, each run ending on the stripped
checkout, looked at, PAY never pressed. Nothing in the watch or the site reads these files; the contract quotes them.

Each run's report is the smoke's own (`--report`), written by the program; the directory's `README.md` is written by
hand and says which links, which built text and which runs it holds, and K of R per width and link.

⛔ **The pictures are never committed** (`--shots`: the stripped checkout carries the store's food photographs, and this
repository is public: P1). `.gitignore` keeps them beside the reports that name them.

## What a reader would misread

- **A batch is a fact about one release of the store, one week's menu and one built text.** Each report names the text
  pasted (its version line); the store releases without notice.
- **"PASS" is the smoke's rule, not an order placed.** Nothing is submitted; the checkout is read and the page closed.
