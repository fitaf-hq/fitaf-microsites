# storefront/probe-prices/

**Measurements, not inputs.** One dated directory per batch of the probe of the store's prices
([`../../SPEC-rung2-progress-and-checkout.md`](../../SPEC-rung2-progress-and-checkout.md) § 36 item 7): how the live
store draws each price on the four surfaces the struck prices go on (the meal plans page, a plan's order page, its cart
summary, `/checkout`), read before `src/storefront/fitaf-struck.js` is written, and whether the store's app keeps a
landing query. Nothing in the watch or the site reads these files.

Each directory is written by a program,
`npm --prefix boston-2026-10/tools/storefront-watch run probe-prices -- --out <dir>`
([`../../tools/storefront-watch/bin/probe-prices.mjs`](../../tools/storefront-watch/bin/probe-prices.mjs)): a JSON
file per run and width. Its own `README.md` is written by hand: which batch it holds, under which code, and the
findings.

## What a reader would misread

- **A batch is a fact about one release of the store, on one day, for one week's menu.** Each run file names the
  store's entry bundle (`release`); HMP releases without notice.
- **The marker in a run is the probe's, not a visit from eatfitaf.com.** The run's init script writes
  `sessionStorage` `fitaf_struck` = `"1"`; ⛔ no run ever carries a `utm_` parameter (the watch's visits must not count in
  the store's Google Analytics as ours). The landing query it measures is `?fitaf_probe=1`.
- **The probe presses the store's CHECKOUT and stops on `/checkout`.** It never presses PAY, never types, never touches
  the payment or the admin; "on the checkout" means read there, not that an order could be placed.
- **Not a check.** The watch's pass rules are elsewhere (`../../SPEC-storefront-watch.md`); a probe batch passes or
  fails nothing.
