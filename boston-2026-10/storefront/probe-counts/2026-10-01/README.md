# storefront/probe-counts/2026-10-01/

The first batch of the probe of the store's count ([`../../../SPEC-rung2-fill-c.md`](../../../SPEC-rung2-fill-c.md)
§ 2; its findings are that contract's § 2a). **14 runs** on the live store, 2026-10-01 from 21:33:34Z to 21:35:12Z
(17:33–17:35 in Boston), release `main-EIFLKDHS.js`, by the probe as committed at `c6d0af9`, run from the
repository's root:

```sh
npm --prefix boston-2026-10/tools/storefront-watch run probe-counts -- --ack-runs 5 --gap-runs 1 --nowait-runs 1 \
    --out boston-2026-10/storefront/probe-counts/2026-10-01
```

At 1280 × 900 and at 390 × 844 (×3, mobile): 5 runs pressing each next meal once the last showed its count, 1 with
200 ms between presses and 1 with none; each run 14 meals of `/order?mpid=23` (Lean, 14 meals a week) with no
`#fitaf=` fragment, in a fresh profile, pressing only each meal's Add to Cart. 196 presses.

| file | what |
|---|---|
| `run-<UTC time>-<width>-<spacing>.json` | one run: its settings and command, the 14 meals, the selectors read, every value the recorder saw change (`changes`, ms from the first press), each press's times (`presses`), take-backs, the state at the end |
| `summary.md` | generated over the 14 run files: latency per width and spacing, the other counts, take-backs, the selectors and texts seen, the runs |

**Two earlier runs of the same probe are not here**, and agree with this batch: a trial (one run at 1280, 21:26:20Z)
and a first batch of the same 14 runs (21:27:27Z–21:30:04Z, by `691f35f`), both on the release before,
`main-6RE6FSMC.js`: 196 of 196 presses counted, none taken back, the plan full in 14 of 14, the longest 95 ms. The
first batch's summary carried the command's `--out` as a home path; it was discarded uncommitted, the probe fixed
(`c6d0af9`) and the batch run again, by which time HMP had released `main-EIFLKDHS.js`.

## What a reader would misread

- **A median of 48 ms in the `ack` runs is the 50 ms read, not the store.** The recorder reads every 50 ms and the next
  press follows the read that saw the count, so the next count is seen about one read later. The `gap 200 ms` runs,
  whose presses fall at any point between reads, put the median at 23 ms. What the batch shows is that the count is
  never on the card when `.click()` returns (196 of 196) and is there by the first read after it, or the next when a
  read came late (the longest, 151 ms, beside a read 152 ms after the one before it).
- **Nothing here reproduces the shortfall the Advisor saw.** Every press counted, nothing was taken back, and the plan
  was full in all 14 runs, as in the Boston record § 46's headless runs.
