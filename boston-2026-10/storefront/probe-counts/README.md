# storefront/probe-counts/

**Measurements, not inputs.** One dated directory per batch of the probe of the store's count
([`../../SPEC-rung2-fill-c.md`](../../SPEC-rung2-fill-c.md) § 2): how the live store shows that a press of a meal's
Add to Cart counted, read before fill C is written. Nothing in the watch or the site reads these files.

Each directory is written by a program,
`npm --prefix boston-2026-10/tools/storefront-watch run probe-counts -- --out <dir>`
([`../../tools/storefront-watch/bin/probe-counts.mjs`](../../tools/storefront-watch/bin/probe-counts.mjs)): a JSON
file per run and `summary.md` over every run in the directory. Its own `README.md` is written by hand and says which
batch it holds and under which commit of the probe.

## What a reader would misread

- **A batch is a fact about one release of the store, on one day.** Each run file names the store's entry bundle
  (`release`); HMP releases without notice, and a later release can show its count differently.
- **The probe never presses CHECKOUT.** "Plan full at the end" means the store's own count and its CHECKOUT control
  said so, not that an order could be placed.
- **Not a check.** The watch's pass rules are elsewhere (`../../SPEC-storefront-watch.md`); a probe batch passes or
  fails nothing.
