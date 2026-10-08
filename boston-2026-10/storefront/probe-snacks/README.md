# storefront/probe-snacks/

**Measurements, not inputs.** One dated directory per batch of the probe of a snack in the store's cart
([`../../SPEC-snacks-in-the-cart.md`](../../SPEC-snacks-in-the-cart.md) § 1): how the live store shows a snack's
*Select Options*, its Size, its *Add to Cart*, its count and its "+", how the plan's counts move with it, and where its
line sits on `/checkout` and which of the Footer block's hide rules would touch it, read before the block presses
snacks. Nothing in the watch or the site reads these files.

Each directory is written by a program,
`npm --prefix boston-2026-10/tools/storefront-watch run probe-snacks -- --out <dir>`
([`../../tools/storefront-watch/bin/probe-snacks.mjs`](../../tools/storefront-watch/bin/probe-snacks.mjs)): a JSON
file per run and, in the runs `--shots` names, a picture per step. Its own `README.md` is written by hand and says
which batch it holds, under which commit of the probe, and which pictures were left out and why.

## What a reader would misread

- **A batch is a fact about one release of the store, on one day, for one week's menu.** Each run file names the
  store's entry bundle (`release`); HMP releases without notice, and the snack cards changed between the morning's
  read (`SPEC-meal-selection.md` § 11) and the first batch here.
- **The probe presses the store's CHECKOUT and stops on `/checkout`.** It never presses PAY, never types, never
  chooses a size; "on the checkout" means read there, not that an order could be placed.
- **Not a check.** The watch's pass rules are elsewhere (`../../SPEC-storefront-watch.md`); a probe batch passes or
  fails nothing.
