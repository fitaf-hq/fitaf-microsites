// W14 (SPEC-rung2-progress-and-checkout § 10, live, both widths): H7–H10 reported, found or absent (the discounts, the
// app banner, the price breakdown, the tip; each conditional); the Total (.summary__total) displayed; the payment check
// as § 10 re-states it (lib/faces.mjs W11: the controls hidden are exactly H3, H4, H6, H7, H8 and H10's).
// W14a: the rule on recorded outcomes, no browser. W14b: the smoke itself, in headless Chrome against the synthetic
// store on 127.0.0.1 (never the live store), passing at both widths with H7, H9 and H10 found and hidden and H8 absent,
// then with the banner; W14c: a mutant of the shipped text that hides the Total, failing W14.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromePath } from "../lib/browser.mjs";
import * as faces from "../lib/faces.mjs";
import { renderSmokeReport } from "../lib/report.mjs";
import { siteCode } from "../lib/site-code.mjs";
import { smokeRun } from "../lib/smoke.mjs";
import { startStore } from "./browser-store.mjs";

const { facesVerdict, HIDE } = faces;

/** A recorded outcome that passes, with § 10's readings. */
const passing = () => ({
  done: true,
  screenAtEnd: false,
  events: [{ e: "screen+" }, { e: "step", text: "Meal One · 1 of 7 meals" }, { e: "style+" }, { e: "mark" }, { e: "screen-" }],
  checkout: {
    path: "/checkout",
    style: true,
    mark: true,
    payment: { hidden: [], allowed: [], added: [], payWith: true, payWithout: true, payShown: ['button "Place order"'], counts: { with: 20, without: 20 } },
    hide: HIDE.flatMap((h) => h.selectors.map((selector) => ({ id: h.id, selector, found: 1, displayed: 0 }))),
    total: { found: 1, displayed: 1 },
    oneTime: { activeSwitches: 0, renews: [] },
  },
});
const why = (f) => facesVerdict(f).reasons.join(" · ");

test("W14a: H7–H10 found and hidden, the Total displayed: pass", () => {
  assert.deepEqual(facesVerdict(passing()).reasons, []);
});

test("W14a: H7–H10 absent are reported, never a failure", () => {
  const f = passing();
  for (const h of f.checkout.hide) if (["H7", "H8", "H9", "H10"].includes(h.id)) h.found = 0;
  assert.deepEqual(facesVerdict(f).reasons, []);
});

test("W14a: one of H7–H10 found and still displayed with the style: fail, under W14, naming it", () => {
  for (const id of ["H7", "H8", "H9", "H10"]) {
    const f = passing();
    f.checkout.hide.find((h) => h.id === id).displayed = 1;
    assert.match(why(f), new RegExp(`^W14: ${id} .* displayed with the style`));
  }
});

test("W14a: the Total not displayed with the style, or not on the page: fail", () => {
  const hidden = passing();
  hidden.checkout.total = { found: 1, displayed: 0 };
  assert.match(why(hidden), /^W14: the Total \(\.summary__total\) is not displayed/);
  const none = passing();
  none.checkout.total = { found: 0, displayed: 0 };
  assert.match(why(none), /^W14: no \.summary__total on \/checkout/);
});

// ── W14b, W14c: the smoke, in Chrome, on the synthetic store ─────────────────────────────────────────────────────────

const chrome = (() => {
  try {
    return chromePath();
  } catch {
    return null;
  }
})();
const skip = chrome ? false : "no Chrome found (set CHROME_PATH)";

let store;
let code;
let text;
before(async () => {
  if (skip) return;
  store = await startStore();
  code = await siteCode();
  const dir = await mkdtemp(join(tmpdir(), "storefront-watch-w14-"));
  try {
    await code.buildStorefront({ outDir: dir });
    text = await readFile(join(dir, "fitaf-handoff.fill-B.console.js"), "utf8");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
after(async () => {
  await store?.close();
});

/** § 25.2: step 2's controls on the synthetic checkout, as W11 describes them (hidden at step 3 by design). */
const STEP2_CONTROL = /\[name=(email|phone|firstName|lastName|address|state|date)\]|^div "(Delivery|Pickup)"$/;

const smoke = (width, script = text) =>
  smokeRun({ origin: store.origin, width, mode: { kind: "paste", text: script, label: "fill B, pasted" }, code, executablePath: chrome });

test("W14b: the smoke at both widths — H7, H9 and H10 found and hidden, H8 absent, the Total displayed, the payment as re-stated: pass", { skip, timeout: 120_000 }, async () => {
  store.set({});
  for (const width of [1280, 390]) {
    const { verdict, outcome } = await smoke(width);
    assert.deepEqual(verdict, { pass: true, reasons: [] }, `${width}: ${verdict.reasons.join("; ")}`);
    const c = outcome.faces.checkout;
    const byId = (id) => c.hide.filter((h) => h.id === id);
    assert.deepEqual(byId("H7").map((h) => [h.found, h.displayed]), [[3, 0]], "the three discounts placements, hidden");
    assert.deepEqual(byId("H8").map((h) => h.found), [0], "no banner on this page: absent, reported");
    assert.deepEqual(byId("H9").map((h) => [h.found, h.displayed]), [[3, 0]], "Subtotal, Shipping, Tax, hidden");
    assert.deepEqual(byId("H10").map((h) => [h.found, h.displayed]), [[2, 0]], "the tip's section and its selector, hidden");
    assert.deepEqual(c.total, { found: 1, displayed: 1 }, "the Total displayed");
    // § 21: and H16's "Remove plan" and H17's return link, on the synthetic checkout's plan group.
    // § 25 (the three-step checkout): W11's measure is made at step 3, which also hides step 2's own nine controls (the
    // contact's four fields, the delivery's two radios, its address and state, the schedule's date) by design (§ 25.2);
    // W20 checks them displayed at step 2. The H list's own are the 21, as before.
    const stepTwo = c.payment.hidden.filter((x) => STEP2_CONTROL.test(x));
    assert.equal(stepTwo.length, 9, `step 2's nine controls, hidden at step 3: ${stepTwo.join("; ")}`);
    const own = c.payment.hidden.filter((x) => !STEP2_CONTROL.test(x));
    assert.equal(own.length, 21, `H3, H4, H6 (4), H7 (12), H10 (3), H16, H17: ${own.join("; ")}`);
    assert.deepEqual(c.payment.hidden, c.payment.allowed);
    const report = renderSmokeReport({ flag: false, script: "fill B", runs: [{ width, verdict, outcome }] }, "t");
    assert.match(report, /H8 absent/);
    assert.match(report, /Total displayed/);
  }
});

test("W14b: with the app banner (390 px): H8 found and hidden: pass", { skip, timeout: 60_000 }, async () => {
  store.set({ banner: true });
  const { verdict, outcome } = await smoke(390);
  assert.deepEqual(verdict, { pass: true, reasons: [] }, verdict.reasons.join("; "));
  assert.deepEqual(outcome.faces.checkout.hide.filter((h) => h.id === "H8").map((h) => [h.found, h.displayed]), [[1, 0]]);
});

test("W14c (mutant): a text whose style also hides .summary__total — the smoke fails on W14", { skip, timeout: 60_000 }, async () => {
  store.set({});
  const mutant = text.replace("a.contact__sign-in,", "a.contact__sign-in,.summary__total,");
  assert.notEqual(mutant, text);
  const { verdict } = await smoke(1280, mutant);
  assert.equal(verdict.pass, false);
  assert.ok(verdict.reasons.some((r) => /^W14: the Total \(\.summary__total\) is not displayed with the style/.test(r)), verdict.reasons.join("; "));
});
