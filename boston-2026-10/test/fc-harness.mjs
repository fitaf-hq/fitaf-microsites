// Shared by the fc-*.test.mjs files (SPEC-rung2-fill-c § 1 and § 4.1: fill C, the cart filled by confirmation). Not a
// test file itself. The shipped text runs as every rung 2 case runs it (r2-harness.mjs: a fresh V8 context whose only
// global is a fake `window`, on the synthetic order page), but on a CLOCK (clockTimers): fill C's waits are times
// (MIN_GAP_MS, ACK_MS, SETTLE_MS), and the store's own delays (a count shown late, a count taken back) must fall in
// time order among them. The page is the store's own shape (the counter, SPEC-rung2-fill-c § 2a), with 8 more meal
// cards for a 14-meal plan (mpid 23, Lean 14: the largest plan the microsite links to).
import assert from "node:assert/strict";
import {
  addCard,
  clockTimers,
  fakeWindow,
  fragmentFor,
  LOG_PREFIX,
  MEALS,
  orderPage,
  refKey,
  run,
  script,
  untouchableStorage,
} from "./r2-harness.mjs";
import { screenOf } from "./r2-screen.mjs";

/** Eight more meals, invented: a 14-meal plan needs more cards than the fixture's three. */
export const EXTRA = ["Herb Turkey Meatballs", "Lemon Garlic Shrimp", "Steak Fajita Bowl", "Teriyaki Salmon", "Pesto Chicken Wrap", "BBQ Pulled Pork", "Greek Chicken Bowl", "Thai Peanut Noodles"];
/** mpid 23, Lean 14: 2 + 1 + 3 of the fixture's meals and one of each of the eight. Counts above 1 exercise "+". */
export const FC_PAYLOAD = {
  mpid: 23,
  items: [{ name: MEALS[0], qty: 2 }, { name: MEALS[1], qty: 1 }, { name: MEALS[2], qty: 3 }, ...EXTRA.map((name) => ({ name, qty: 1 }))],
};
export const FC_PATH = "/order?mpid=23";
export const FC_TOTAL = 14;
/** Each meal of the link, by its key: what a stop line names. */
export const keyOf = (name) => refKey(name);
export const qtyOf = (name) => FC_PAYLOAD.items.find((it) => it.name === name)?.qty ?? 0;

/** The synthetic order page with the eight extra cards (the store's counter by default); `options` as orderPage's. */
export async function fcPage(options = {}) {
  const page = await orderPage(options);
  for (const name of EXTRA) addCard(page.document, name);
  return page;
}

/**
 * Fill C's text (or `text`, a mutant) on the 14-meal page at `width` on a clock, every press's fate from `fates`; run
 * until nothing is left to run. Returns the window (its log, its events, the clock), the page (its presses, with their
 * times), and the last line logged.
 */
export async function fcRun({ text = null, fates = null, width = "bar", payload = FC_PAYLOAD, path = FC_PATH, ...options } = {}) {
  const timers = clockTimers();
  const page = await fcPage({ fates, width, ...options });
  const h = fakeWindow({ path, fragment: fragmentFor(payload), page, timers, storage: untouchableStorage() });
  run(text ?? (await script()), h.window);
  h.timers.drain();
  const ours = h.info.filter((l) => l.startsWith(LOG_PREFIX));
  return { h, page, timers, last: ours.at(-1) ?? null, ours };
}

/** Fates from a table: press index -> its fate; every other press counted at once. */
export const fatesFrom = (table) => (i) => table[i] ?? {};

/** The meal presses of one meal, with their clock times: [[label, at]]. */
export const pressesOf = (page, name) => page.log.map(([meal, label], i) => [meal, label, page.at[i]]).filter(([meal]) => meal === name).map(([, label, at]) => [label, at]);

/** The store's CHECKOUT pressed, the store routed, fill C logged done. */
export function assertDone(r) {
  assert.equal(r.last, `${LOG_PREFIX} done: /checkout`, JSON.stringify(r.ours));
  assert.deepEqual(r.page.controls, ["checkout:shown"], "the store's CHECKOUT pressed once");
}

/** At CHECKOUT, the plan held exactly the link's meals, each its count. */
export function assertFullPlan(page, payload = FC_PAYLOAD) {
  const want = payload.items.flatMap((it) => Array(it.qty).fill(it.name)).sort();
  assert.deepEqual([...(page.atCheckout ?? [])].sort(), want, "the plan at CHECKOUT is the link's, meal for meal");
}

/** No meal's count ever went above the link's count for it (SPEC-rung2-fill-c § 4.1: never over). */
export function assertNeverOver(page, payload = FC_PAYLOAD) {
  for (const it of payload.items) assert.ok((page.max.get(it.name) ?? 0) <= it.qty, `${it.name} reached ${page.max.get(it.name)} of ${it.qty}`);
}

/** The stop line § 1.6 asks for: `stopped: the store counted K of N[; short: <keys>][; over: <keys>]…`, parsed. */
export function parseCounted(line) {
  const m = /^\[fitaf-handoff\] stopped: the store counted (\d+) of (\d+)(?:; short: ([0-9a-z,]+))?(?:; over: ([0-9a-z,]+))?(.*)$/.exec(line ?? "");
  if (!m) return null;
  return { k: Number(m[1]), n: Number(m[2]), short: m[3] ? m[3].split(",") : [], over: m[4] ? m[4].split(",") : [], rest: m[5] };
}

/** The meals of the link the store shows short of their count now, by key, in the link's order. */
export const shortNow = (page, payload = FC_PAYLOAD) => payload.items.filter((it) => page.countOf(it.name) < it.qty).map((it) => keyOf(it.name));

/**
 * The screen's own clock ending (its CSS animation; linkedom runs none): what the browser does at the end of the
 * screen's animation, its handler called with the screen as the event's target. Chrome runs the real clock in the
 * watch's suite.
 */
export function endScreenClock(document) {
  const s = screenOf(document);
  if (s?.onanimationend) s.onanimationend({ target: s });
}
