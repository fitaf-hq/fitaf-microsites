# storefront/smoke-snacks/2026-10-08/

[`SPEC-snacks-in-the-cart.md`](../../../SPEC-snacks-in-the-cart.md) § 6's live proof (its findings are that contract's
§ 6a). **11 invocations of the watch's smoke, 22 width runs**, on the live store, 2026-10-08 from 22:41:00Z to 22:48:21Z
(18:41–18:48 in Boston), release `main-UMGPHR2R.js` (read at 21:35Z by the probe and again at 22:48:47Z), the built
console file `boston-2026-10/dist-storefront/fitaf-handoff.fill-B.console.js` of `1339c0a` (its version line:
`fitaf-handoff 1339c0a sha256:ad25f93d…`), pasted by the smoke as a person pastes it, the block of ours already in the
store's Footer (`76871ff9…`) held off. The smoke as committed at `a3ed3c9`.

## The links

Each written by the link tool (`npm run handoff:link`), `mpid` 23 (Lean, 14 meals a week); the 14 meals are the
week's first 14 meal cards (as the probe chose them, `../../probe-snacks/2026-10-08/`), one of each; the snacks are the
store's first seven snack cards in its order, one of each (`snacks-7`), and the first five (`snacks-5`); `no-snacks` is
the same 14 meals alone. No photo part.

```text
snacks-7   …/order?mpid=23#fitaf=2.nfelz.6t0uy.qeom6.1vb7k.8s8vg.oqhxo.s7umt.h0u29.3eaxx.m8q7r.t0gkc.hpyxi.9d7jd.g5d3h._e2te4._oeo2k._6bmyc._snggo._7zip8._o9y0r._c58c2
snacks-5   …/order?mpid=23#fitaf=2.nfelz.6t0uy.qeom6.1vb7k.8s8vg.oqhxo.s7umt.h0u29.3eaxx.m8q7r.t0gkc.hpyxi.9d7jd.g5d3h._e2te4._oeo2k._6bmyc._snggo._7zip8
no-snacks  …/order?mpid=23#fitaf=2.nfelz.6t0uy.qeom6.1vb7k.8s8vg.oqhxo.s7umt.h0u29.3eaxx.m8q7r.t0gkc.hpyxi.9d7jd.g5d3h
```

The snacks: Golden Oreo Protein Sand (`e2te4`, $9.00), Cookies & Cream Protein Dirt (`oeo2k`, $9.00), Smart Oats:
Cookies & Cream (`6bmyc`, $4.00), Smart Oats: Almond Joy (`snggo`, $4.00), Immunity Superfood Bites: Chocolate Peanut
Butter & Chaga (`7zip8`, $10.00), Smart Oats: S'mores (`o9y0r`, $4.00), Smart Oats: Apple Cinnamon (`c58c2`, $4.00); each
at the store's own default size, never chosen.

## The runs

```sh
node boston-2026-10/tools/storefront-watch/bin/smoke.mjs --script boston-2026-10/dist-storefront/fitaf-handoff.fill-B.console.js \
    --link "<link>" [--shots boston-2026-10/storefront/smoke-snacks/2026-10-08] --report boston-2026-10/storefront/smoke-snacks/2026-10-08/<link>-run<N>.md
```

Five rounds of `snacks-7` then `snacks-5`, then `no-snacks` once; each invocation runs 1280 × 900, then 390 × 844 (×3),
each in a fresh profile; pictures in `snacks-7`'s first round only.

| link | 1280 | 390 | /checkout, every run |
|---|---|---|---|
| `snacks-7` | **5 of 5** | **5 of 5** | 21 names; *"Plan Total (14 items)"*, *"21 items"*; total $212.00 (14 × $12.00 + $44.00) |
| `snacks-5` | **5 of 5** | **5 of 5** | 19 names; *"Plan Total (14 items)"*, *"19 items"*; total $204.00 (14 × $12.00 + $36.00) |
| `no-snacks` | **1 of 1** | **1 of 1** | 14 names; *"14 items"*; total $168.00 |

In all 22: `[fitaf-handoff] fill C, mpid 23` · `[fitaf-handoff] done: /checkout`, nothing else of ours; the progress
screen seen (one step line per unit and one for CHECKOUT: 22, 20, 15) and gone; the extras pop-up never opened
(CHECKOUT to /checkout in 2.9 to 3.6 s); the hide list as before (H6 absent: no switch), the Total and the pay button
displayed (*"Pay now - $212.00"* and so on at 1280, *"PAY NOW"* at 390), the order one-time; every order line displayed
(W18: 21, 19, 14); the Fit AF logo on both faces; the three steps walked (W20: the block's own Continue to step 2, its
Continue there refused with the store's fields empty, step 3 entered by the block's class), nothing of the store's
pressed on /checkout and nothing typed; PAY never pressed.

| file | what |
|---|---|
| `<link>-run<N>.md` | the smoke's own report of that invocation, both widths (`--report`): the meals and snacks chosen with their prices, what /checkout listed, the console, the two faces |
| `<UTC time>-<width>-checkout.png` | ⛔ **not committed** (ignored): `snacks-7`'s first round, the stripped checkout at step 1 with the snacks' group at the window's top; they carry the store's photographs |

## What a reader would misread

- **"21 items" is the store's count of units**; the plan's is *"Plan Total (14 items)"*. The smoke's rule reads the
  plan's (`need`, 14) and lists every meal and snack by name.
- **The prices are the cards' at the store's default size** (the phone card's *Add $…*); a size the store defaults
  differently another week changes the total, not the rule.
- **One week's menu and one release.** The link names this week's cards; a later week's snacks are other cards.
