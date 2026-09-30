// W15 (SPEC-rung2-progress-and-checkout § 12, live, both widths): the smoke reports whether the store's extras pop-up
// opened (expected: not, now that fill B sets the store's own key before CHECKOUT) and the seconds from fill B's press
// of CHECKOUT to /checkout. A report, not a pass rule. W15a: the summary on recorded events, no browser. W15b: the smoke
// in headless Chrome against the synthetic store on 127.0.0.1 (never the live store), with a store that honours the key
// and one that ignores it.
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

test("W15a: from the recorded events — the pop-up opened or not, and CHECKOUT's press to /checkout in seconds", () => {
  const events = [
    { e: "screen+", t: 100 },
    { e: "step", t: 300, text: "Meal One · 1 of 7 meals" },
    { e: "step", t: 1_500, text: "Taking you to checkout" },
    { e: "extras+", t: 2_300 },
    { e: "checkout+", t: 5_750 },
    { e: "style+", t: 5_900 },
  ];
  assert.deepEqual(faces.extrasReport(events), { opened: true, checkoutSeconds: 4.25 });
  assert.deepEqual(faces.extrasReport(events.filter((e) => e.e !== "extras+")), { opened: false, checkoutSeconds: 4.25 });
  assert.deepEqual(faces.extrasReport(events.filter((e) => e.e !== "checkout+")), { opened: true, checkoutSeconds: null });
});

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
  const dir = await mkdtemp(join(tmpdir(), "storefront-watch-w15-"));
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

const smoke = (width) =>
  smokeRun({ origin: store.origin, width, mode: { kind: "paste", text, label: "fill B, pasted" }, code, executablePath: chrome });

test("W15b: a store that honours the key — the pop-up did not open; the seconds from CHECKOUT to /checkout; the smoke passes", { skip, timeout: 120_000 }, async () => {
  store.set({ extrasDialog: true, honoursKey: true, routeDelayMs: 1_200 });
  for (const width of [1280, 390]) {
    const { verdict, outcome } = await smoke(width);
    assert.deepEqual(verdict, { pass: true, reasons: [] }, `${width}: ${verdict.reasons.join("; ")}`);
    const x = outcome.faces.extras;
    assert.equal(x.opened, false, `${width}: the extras pop-up did not open`);
    assert.ok(x.checkoutSeconds >= 1.2 && x.checkoutSeconds < 5, `${width}: ${x.checkoutSeconds} s from CHECKOUT to /checkout`);
    const report = renderSmokeReport({ flag: false, script: "fill B", runs: [{ width, verdict, outcome }] }, "t");
    assert.match(report, /W15: the extras pop-up did not open; CHECKOUT to \/checkout in \d+\.\d s/);
  }
});

test("W15b: a store that ignores the key — the pop-up opened (reported, not a failure), and the longer wait", { skip, timeout: 60_000 }, async () => {
  store.set({ extrasDialog: true, extrasOpenMs: 600, continueDelayMs: 1_500 });
  const { verdict, outcome } = await smoke(1280);
  assert.deepEqual(verdict, { pass: true, reasons: [] }, verdict.reasons.join("; "));
  assert.equal(outcome.faces.extras.opened, true);
  assert.ok(outcome.faces.extras.checkoutSeconds >= 2, `${outcome.faces.extras.checkoutSeconds} s`);
  const report = renderSmokeReport({ flag: false, script: "fill B", runs: [{ width: 1280, verdict, outcome }] }, "t");
  assert.match(report, /W15: the extras pop-up OPENED \(expected: not\)/);
});
