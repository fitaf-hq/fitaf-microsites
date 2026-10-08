// Shared by the sn-*.test.mjs files (SPEC-snacks-in-the-cart § 5: snacks into the cart). Not a test file itself. The
// shipped text runs as fill C's cases run it (fc-harness.mjs: a fresh V8 context whose only global is a fake `window`, on
// the synthetic order page, on a clock), on the 14-meal page with SNACK cards beside the meals (r2-harness's `snacks`,
// written by hand from § 1a's names): one whose Select Options expands in place to Add to Cart, as every snack did on
// 2026-10-08, and one with Add to Cart directly, as § 1 item 2 expected. The links are written from refKey (the
// contract's key, implemented a second time), never by the link tool, except where SN-6 tests the tool itself.
import assert from "node:assert/strict";
import { fcPage, FC_PATH, FC_PAYLOAD } from "./fc-harness.mjs";
import { clockTimers, fakeWindow, fragmentFor, LOG_PREFIX, run, script, untouchableStorage } from "./r2-harness.mjs";

/** Two invented snacks: one behind Select Options (the store's every snack on 2026-10-08), one with Add to Cart directly. */
export const TOGGLED = "Protein Bites: Vanilla Almond";
export const DIRECT = "Cold Brew Oat Cup";
/** The page's snack cards, by default both. */
export const SNACK_CARDS = [{ name: TOGGLED }, { name: DIRECT, toggle: false }];
/** The 14-meal link plus one unit of the toggled snack and two of the direct one: 17 units, 14 of them meals. */
export const SN_PAYLOAD = { ...FC_PAYLOAD, snacks: [{ name: TOGGLED, qty: 1 }, { name: DIRECT, qty: 2 }] };
export const SN_UNITS = 17;

/**
 * The shipped text (or `text`) on the 14-meal page with `cards` (snack cards) at `width` on a clock, the link's fragment
 * `fragment` (default: `payload`'s), every press's fate from `fates`; run until nothing is left to run. As fcRun.
 */
export async function snRun({ text = null, payload = SN_PAYLOAD, fragment = null, cards = SNACK_CARDS, width = "bar", fates = null, path = FC_PATH, ...options } = {}) {
  const timers = clockTimers();
  const page = await fcPage({ fates, width, snacks: cards, ...options });
  const h = fakeWindow({ path, fragment: fragment ?? fragmentFor(payload), page, timers, storage: untouchableStorage() });
  run(text ?? (await script()), h.window);
  h.timers.drain();
  const ours = h.info.filter((l) => l.startsWith(LOG_PREFIX));
  return { h, page, timers, last: ours.at(-1) ?? null, ours };
}

/** As snRun, but not run to its end: the window and the page just after the text starts, the clock still to step. */
export async function snStart({ text = null, payload = SN_PAYLOAD, cards = SNACK_CARDS, width = "bar", fates = null, ...options } = {}) {
  const timers = clockTimers();
  const page = await fcPage({ fates, width, snacks: cards, ...options });
  const h = fakeWindow({ path: FC_PATH, fragment: fragmentFor(payload), page, timers, storage: untouchableStorage() });
  run(text ?? (await script()), h.window);
  return { h, page, timers };
}

/** The presses of units (a meal's or a snack's Add to Cart or "+"), not of a snack's Select Options. */
export const unitPresses = (page) => page.log.filter(([, label]) => label !== "Select Options");

/** At CHECKOUT, the plan held exactly the link's meals and the cart exactly its snacks, each its count. */
export function assertFullCart(page, payload = SN_PAYLOAD) {
  const units = (list) => list.flatMap((it) => Array(it.qty).fill(it.name)).sort();
  assert.deepEqual([...(page.atCheckout ?? [])].sort(), units(payload.items), "the plan at CHECKOUT is the link's meals");
  assert.deepEqual([...(page.cartAtCheckout ?? [])].sort(), units(payload.snacks ?? []), "the cart at CHECKOUT is the link's snacks");
}

/** No meal's or snack's count ever above the link's count for it: never over. */
export function assertNeverOverAll(page, payload = SN_PAYLOAD) {
  for (const it of [...payload.items, ...(payload.snacks ?? [])]) {
    assert.ok((page.max.get(it.name) ?? 0) <= it.qty, `${it.name} reached ${page.max.get(it.name)} of ${it.qty}`);
  }
}

/** The presses made on one card, in order: its labels. */
export const labelsOf = (page, name) => page.log.filter(([meal]) => meal === name).map(([, label]) => label);
