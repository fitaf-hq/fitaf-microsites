# storefront/probe-snacks/2026-10-08/

The batch of the probe of a snack in the store's cart ([`../../../SPEC-snacks-in-the-cart.md`](../../../SPEC-snacks-in-the-cart.md)
§ 1; its findings are that contract's § 1a). **4 runs** on the live store, 2026-10-08 from 21:35:22Z to 21:38Z
(17:35–17:38 in Boston), release `main-UMGPHR2R.js`, by the probe committed with this directory
([`../../../tools/storefront-watch/bin/probe-snacks.mjs`](../../../tools/storefront-watch/bin/probe-snacks.mjs), its
run in `lib/probe-snacks.mjs`), started as `node boston-2026-10/tools/storefront-watch/bin/probe-snacks.mjs` with the
arguments below (each run file records the same command in its `npm run probe-snacks` form, which runs the same file):

```sh
npm --prefix boston-2026-10/tools/storefront-watch run probe-snacks -- --runs 2 \
    --out boston-2026-10/storefront/probe-snacks/2026-10-08                # runs 1 and 2, with pictures
npm --prefix boston-2026-10/tools/storefront-watch run probe-snacks -- --runs 1 --shots none \
    --out boston-2026-10/storefront/probe-snacks/2026-10-08                # runs 3 and 4
```

The first command stopped at its third run: the probe's no-picture path left an element handle's promise unawaited,
and it rejected as the page closed. Fixed before the second command (a skipped picture now awaits its handle);
runs 1 and 2 take pictures and never ran that path. Together the two commands made what `--runs 2` makes: a round at
1280, then 390, twice, pictures in the first round.

## The method

Each run: a fresh profile (`lib/browser.mjs`, the watch's own launcher, deleted on close; no user agent set, the
browser's own, as `probe-counts`); `/order?mpid=23` (Lean, 14 meals a week) **with no `#fitaf=` fragment**, so Fit AF's
Footer block does nothing (0 `[fitaf-handoff]` lines in every run); at 1280 × 900 or 390 × 844 (×3, mobile). Every
press is a `.click()` in the page on the store's own control of `app-product-card`, the card the block presses at every
width (hidden at 390). In order:

1. **The choices card**, *🟠NEW: Cheesecake Brownie Bites* (the first snack whose Size the catalog marks not required):
   *Select Options*; its Size dropdown's trigger pressed to open the store's listbox, the options read, the trigger
   pressed again to close it; *Hide Options*. Nothing chosen, nothing added.
2. **The survey**: the 13 other snack cards showing *Select Options*, each opened, read (the Size control, whether a
   value is already chosen, the form's validity, *Add to Cart*) and closed again. Nothing chosen, nothing added.
3. **The plan's 14 meals**: the first 14 meal cards' *Add to Cart*, one at a time, each once the last showed its count.
4. **The snack**, *Golden Oreo Protein Sand* (the first snack card whose Size the catalog marks required): *Select
   Options*, then *Add to Cart*, then the counter's "+".
5. **An addition with *Add to Cart* directly**: no snack card shows one, so the first addition that does, *93% Lean
   Free-Range Plain Ground Turkey*, once.
6. **CHECKOUT**, found as the block finds it (`control(/^checkout( now)?$/i)`), pressed once enabled. The store opened
   its extras dialog in every run, and the probe pressed that dialog's *CONTINUE TO CHECKOUT* once, as the block does
   when it opens. ⚠ The probe does NOT write `ecc_additions_prompt_handled`, the key the block sets just before its
   press of CHECKOUT.
7. **`/checkout`, read only**: every order line; the snack's line, its parts, its group and the group's header; the
   group's container and its children; every element of `app-checkout` whose own text says one-time, renews, recurring
   or subscription; and the block's hide rules H1–H17: `DEEP`'s text read from `src/storefront/fitaf-handoff.js`
   (SHA-256 `7768dfe6e0e32c06…`), split into its rules, each labelled by the name it begins with, evaluated with
   `document.querySelectorAll` (the class `fitaf-deep` and the style never added): how many elements each matches, and
   for the line, each part of it, the group and the header, which rules match it or an ancestor (`el.closest(rule)`).
   The § 25 step rules need the block's step classes and are listed, not evaluated.

A recorder in the page logs, every 100 ms, the snack's and the addition's card state and the plan's counts whenever
they change. **The reads use the block's own functions**: `card`, `addButton`, `count`, `plus`, `plan` and `control`,
their text read from `fitaf-handoff.js`, and the key from `src/storefront/meal-key.js`, installed in the page; so
"`count()` reads 2" is what the block would read. **The page's own catalog response** (its request for
`/api/v1/tenant/catalog/products`) was read as it arrived, never requested by the probe; only each product's name,
categories, price and Size field are recorded, and of the request only its host, path and parameter names, no values.

⛔ Nothing typed anywhere; nothing pressed on `/checkout`; PAY never pressed; no size chosen; the profile, and the
plan and cart in it, discarded.

## The files

| file | what |
|---|---|
| `run-<UTC time>-<width>.json` | one run: its settings and command; the block's file hash and its hide rules; the catalog's snack products; every addition card's title beside the catalog's name and both keys (`names`); the page's cards (`inventory`); each step's reads (`steps`: `start`, `choices card`, `survey`, `meals`, `snack Select Options`, `snack Add to Cart`, `snack "+"`, `direct Add to Cart`, `before CHECKOUT`, `CHECKOUT`); the recorder's log; the extras dialog; the checkout's reads (`checkout`); the pictures |
| `run-…-1280-NN-<what>.png` | run 1's pictures, each of one element: the snack's card before, after *Select Options*, after *Add to Cart*, at 2 units; the sidebar (`app-cart`) after the meals and after each snack unit; the turkey's card; the checkout's snack line and its group |
| `run-…-390-NN-<what>.png` | run 2's: the phone's card (`app-product-card-mobile`, the one displayed at 390; the presses are on the hidden `app-product-card`) at the same steps; the turkey's phone card; the checkout's snack line and its group |

**Left out**: each first-round run's `09-extras-dialog.jpg` (taken mid fade-in, the page beneath showing through it;
its heading and button are in the run file); at 390 the three cart-bar pictures were never made (the probe clipped to
`.mobile-cart-summary`'s own box, which has no height in the viewport: `Cannot take screenshot with 0 height`, in the
run file's `screenshots`); the bar's values are in every run file. Hence the gaps in run 2's numbering.

## The snacks, as the page showed them (run 1; the same in all four)

Every snack card shows *Select Options*; the Size is what the expansion showed before anything was chosen (the survey,
the snack's own expansion, the choices card); the options are the catalog's (only Cheesecake Brownie Bites' were read
from the store's listbox: *"5"*, selected, and *"10 +$7.00"*).

| card title (= the catalog's name) | key | card price | Size | required | shown when opened | catalog options (+$) | *Add to Cart* |
|---|---|---|---|---|---|---|---|
| Golden Oreo Protein Sand | `e2te4` | $9.00 | dropdown | yes | "1" | 1 · 3 +16 | $9.00 |
| Cookies & Cream Protein Dirt | `oeo2k` | $9.00 | dropdown | yes | "1" | 1 · 3 +16 | $9.00 |
| Smart Oats: Cookies & Cream | `6bmyc` | $4.00 | dropdown | yes | "1" | 1 · 3 +6 | $4.00 |
| Smart Oats: Almond Joy | `snggo` | $4.00 | dropdown | yes | "1" | 1 · 3 +6 | $4.00 |
| Immunity Superfood Bites: Chocolate Peanut Butter & Chaga | `7zip8` | $10.00 | dropdown | yes | "5" | 5 · 10 +8 | $10.00 |
| Smart Oats: S'mores | `o9y0r` | $4.00 | dropdown | yes | "1" | 1 · 3 +6 | $4.00 |
| Smart Oats: Apple Cinnamon | `c58c2` | $4.00 | dropdown | yes | "1" | 1 · 3 +6 | $4.00 |
| Smart Oats: Strawberry Banana | `2ppo5` | $4.00 | dropdown | yes | "1" | 1 · 3 +6 | $4.00 |
| Smart Oats: Blueberry Muffin | `fqxas` | $4.00 | dropdown | yes | "1" | 1 · 3 +6 | $4.00 |
| Cognition Superfood Bites: Blueberry Cream & Lion's Mane | `0wx0s` | $0.00 | dropdown | yes | "5 +$10.00" | 5 +10 · 10 +18 | $10.00 |
| Relaxation Superfood Bites: Apple Crisp & Reishi | `xgi99` | $0.00 | dropdown | yes | "5 +$10.00" | 5 +10 · 10 +18 | $10.00 |
| Organic Bone Broth Soup: Southwest Chicken | `tculz` | $12.00 | radio | yes | Quart (checked) | Quart | $12.00 |
| Organic Bone Broth Soup: Hearty Chicken & Garden Veggie | `8upbi` | $12.00 | dropdown | yes | "Quart" | Quart | $12.00 |
| 🟠NEW: Caramel Apple ProNuts | `1pupx` | $7.00 | dropdown | yes | "3" | 3 · 6 (Two packs of 3) +6 | $7.00 |
| 🟠NEW: Cheesecake Brownie Bites | `ckqkl` | $9.00 | dropdown | no | "5" | 5 · 10 +7 | $9.00 |

The other 13 additions (the bulk proteins and sides, $5.00–$21.00) show *Add to Cart* directly.

## What a reader would misread

- **The milliseconds are the 100 ms read, not the store.** Every press in every run was seen counted at the first or
  second read after it; that bounds the store, it does not time it.
- **At 390 the presses are on the hidden card**, as the block's are; the pictures are of the displayed phone card,
  which the store kept current (its counter 1, then 2) but which the probe never pressed. The phone card shows the
  Size inline and *"Add"*, with no *Select Options*.
- **"Shown when opened" is the store's own default**, never a choice of the probe's; the probe opened only Cheesecake
  Brownie Bites' list.
- **The extras dialog opened because the probe does not write the block's key.** Whether the block's write keeps it
  shut with a snack in the cart is not measured here.
- **One snack, at most 2 units, one addition.** The answers for the other 14 snacks are what their cards showed, not
  what a press of them did.

## Earlier runs, not here

Before this batch, the same day, all anonymous throwaway sessions on `/order?mpid=23`, nothing submitted: three
exploratory visits reading a snack card's structure (two at 1280, one at 390; in each one *Select Options* pressed, and
in two of them that card's Size dropdown opened and closed; nothing added); four trials of the probe as it was being
written (21:22:41Z to 21:30:55Z); a batch of 4 runs without the survey (21:26:58Z–21:28:13Z) and a batch of 4 with it
(21:31:38Z–21:33:06Z), each agreeing with this one on every answer it recorded (the first has no survey), set aside only
for their pictures (at 390, full viewports of 1.8 MB each); and this batch's interrupted third run. 20 sessions in all;
none put more in its throwaway plan and cart than 14 meals, two units of one snack and one other addition.
