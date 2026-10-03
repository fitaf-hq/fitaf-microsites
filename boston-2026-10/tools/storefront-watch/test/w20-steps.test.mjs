// W20 (SPEC-rung2-progress-and-checkout § 25.5, the three-step checkout; § 25.5 names it "a new W19", but W19 is
// § 21's, so it is W20 here): the smoke walks the steps (the block's own Continue, Continue) before reading the pay
// button (W10–W13, as amended), and reports each step's displayed sections and that the order Total was displayed in
// each. The store's step-2 fields are required and the smoke types nothing, so Continue at step 2 is REFUSED (§ 25.3, as
// it must be): the refusal is recorded and step 3 is entered by the block's own class.
//   W20a  the rule (lib/faces.mjs stepReasons, facesVerdict) and the report's line, on recorded outcomes, no browser.
//   W20b  the smoke on the synthetic store at both widths: pass; step 1 at done, step 2 by Continue, step 3 by the class
//         after the refusal (the email field focused, ng-invalid); each step's own sections displayed and the others'
//         hidden; the Total in each; the pay button at step 3 only.
//   W20c  ⭐ mutant: a text whose style hides the Total in step 2 — the smoke fails, on W20 at step 2.
//   W20d  a text that draws no steps (a block from before § 25): the smoke passes on its one reading, and the report says
//         there were no steps.
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

// ── W20a: the rule, on recorded outcomes ─────────────────────────────────────────────────────────────────────────────

const pay = (payWith) => ({ hidden: [], allowed: [], added: [], payWith, payWithout: true, payShown: payWith ? ['button.checkout__pay "Place order"'] : [], counts: { with: 1, without: 1 } });
const sections = (step) =>
  Object.fromEntries(faces.STEPS.flatMap((s) => s.shows.map((sel) => [sel, { found: 1, displayed: s.step === step ? 1 : 0 }])));
const walked = () => [
  { step: 1, reached: "done", refused: null, payment: pay(false), sections: sections(1), total: { found: 1, displayed: 1 } },
  { step: 2, reached: "Continue", refused: null, payment: pay(false), sections: sections(2), total: { found: 1, displayed: 1 } },
  { step: 3, reached: "class", refused: { el: "input[name=email]", invalid: true }, payment: pay(true), sections: sections(3), total: { found: 1, displayed: 1 } },
];
const outcome = (steps = walked()) => ({
  done: true,
  screenAtEnd: false,
  events: [{ e: "screen+" }, { e: "step", text: "Meal One · 1 of 7 meals" }, { e: "style+" }, { e: "mark" }, { e: "screen-" }],
  checkout: {
    path: "/checkout",
    style: true,
    mark: true,
    payment: pay(true),
    hide: faces.HIDE.flatMap((h) => h.selectors.map((selector) => ({ id: h.id, selector, found: 1, displayed: 0 }))),
    total: { found: 1, displayed: 1 },
    oneTime: { activeSwitches: 0, renews: [] },
    steps,
  },
});
const why = (o) => faces.facesVerdict(o).reasons;

test("W20a: a walk whose every step shows its own sections and the Total, the pay button at step 3 only: pass; the line says how each step was reached", () => {
  assert.deepEqual(why(outcome()), []);
  const line = faces.stepsLine(outcome());
  assert.match(line, /^W20: step 1 \(done\): \.summary__item 1; the Total displayed \| step 2 \(Continue\): \.checkout__section\.contact 1, \.checkout__section\.order-type 1, \.checkout__section\.delivery-address 1, \.checkout__section\.delivery-method 1, \.checkout__section\.schedule 1, \.checkout__section\.pickup-location 1, \.checkout__section\.special-requests 1; the Total displayed \| step 3 \(Continue REFUSED at step 2 \(focused input\[name=email\], ng-invalid\): entered by the block's class, the smoke types nothing\)/);
  assert.match(line, /; the pay button$/, "the pay button at step 3");
});

test("W20a: another step's section displayed, its own hidden, the Total missing at a step: fail under W20, naming the step", () => {
  const steps = walked();
  steps[1].sections[".checkout__section.payment"].displayed = 1;
  steps[1].sections[".checkout__section.contact"].displayed = 0;
  steps[1].total.displayed = 0;
  assert.deepEqual(why(outcome(steps)), [
    "W20: at step 2, .checkout__section.contact (its own) not displayed",
    "W20: at step 2, .checkout__section.payment (step 3's) displayed",
    "W20: the Total not displayed at step 2",
  ]);
});

test("W20a (W11 as amended): the pay button displayed before step 3, or a control hidden at step 2 that is not another step's: fail under W11", () => {
  const steps = walked();
  steps[0].payment = pay(true);
  steps[1].payment.hidden = ['input[name=email] "Email"'];
  const reasons = why(outcome(steps));
  assert.ok(reasons.includes('W11: the pay button displayed at step 1 (only at step 3): button.checkout__pay "Place order"'), reasons.join("; "));
  assert.ok(reasons.some((r) => /^W11: .*\(step 2\): input\[name=email\]/.test(r)), reasons.join("; "));
});

test("W20a: a walk that stopped (Continue not pressed, or no next step) fails under W20; a checkout without steps is reported, not failed", () => {
  const stopped = [walked()[0], { step: 2, error: "Continue at step 1 did not show step 2 (1)" }];
  assert.deepEqual(why(outcome(stopped)), ["W20: the walk stopped at step 2: Continue at step 1 did not show step 2 (1)"]);
  const none = outcome(null);
  assert.deepEqual(why(none), []);
  assert.equal(faces.stepsLine(none), "W20: no steps on this checkout (a block from before SPEC-rung2-progress-and-checkout § 25)");
});

// ── W20b–W20d: the smoke, in Chrome, on the synthetic store ──────────────────────────────────────────────────────────

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
  const dir = await mkdtemp(join(tmpdir(), "storefront-watch-w20-"));
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

const smoke = (width, script = text) =>
  smokeRun({ origin: store.origin, width, mode: { kind: "paste", text: script, label: "fill C, pasted" }, code, executablePath: chrome });
function once(haystack, needle, by = "") {
  assert.equal(haystack.split(needle).length - 1, 1, `the mutant's target appears once: ${needle}`);
  return haystack.replace(needle, by);
}

test("W20b: the smoke walks the steps at both widths — step 2 by Continue, step 3 by the class after the refusal; each step's own sections, the Total in each: pass", { skip, timeout: 120_000 }, async () => {
  store.set({ storeLines: true });
  for (const width of [1280, 390]) {
    const { verdict, outcome } = await smoke(width);
    assert.deepEqual(verdict, { pass: true, reasons: [] }, `${width}: ${verdict.reasons.join("; ")}`);
    const steps = outcome.faces.checkout.steps;
    assert.deepEqual(steps.map((s) => [s.step, s.reached]), [[1, "done"], [2, "Continue"], [3, "class"]], `${width}: how each step was reached`);
    assert.deepEqual(steps[2].refused, { el: "input[name=email]", invalid: true }, `${width}: the refusal, the email field focused`);
    for (const s of steps) {
      assert.deepEqual(s.total, { found: 1, displayed: 1 }, `${width}, step ${s.step}: the Total`);
      for (const st of faces.STEPS) {
        // § 27: the store renders the delivery address and method for delivery, the pickup location for pickup.
        for (const sel of st.shows) {
          if (sel.startsWith(".checkout__section")) assert.equal(s.sections[sel].found, sel.endsWith(".pickup-location") ? 0 : 1, `fixture control: ${sel} rendered for delivery`);
          if (s.sections[sel].found) assert.equal(s.sections[sel].displayed > 0, st.step === s.step, `${width}, step ${s.step}: ${sel}`);
        }
      }
      assert.equal(s.payment.payWith, s.step === 3, `${width}, step ${s.step}: the pay button ${s.step === 3 ? "displayed" : "hidden"}`);
    }
    const report = renderSmokeReport({ flag: false, script: "fill C", runs: [{ width, verdict, outcome }] }, "t");
    assert.match(report, /W20: step 1 \(done\)/);
    assert.match(report, /Continue REFUSED at step 2 \(focused input\[name=email\], ng-invalid\)/);
  }
});

test("W20c (⭐ mutant): a text whose style hides the Total in step 2 — the smoke fails, on W20 at step 2", { skip, timeout: 60_000 }, async () => {
  store.set({ storeLines: true });
  const mutant = once(text, ".fitaf-step-1:has(#fitaf-nav) .checkout__form", ".fitaf-step-2 .summary__total,.fitaf-step-1:has(#fitaf-nav) .checkout__form");
  const { verdict } = await smoke(1280, mutant);
  assert.equal(verdict.pass, false);
  assert.ok(verdict.reasons.includes("W20: the Total not displayed at step 2"), verdict.reasons.join("; "));
});

test("W20d: a text that draws no steps (a block from before § 25) — the smoke passes on one reading, and the report says so", { skip, timeout: 60_000 }, async () => {
  store.set({ storeLines: true });
  const { verdict, outcome } = await smoke(1280, once(text, "if (c) ui(function () { stepper(c, i); });"));
  assert.deepEqual(verdict, { pass: true, reasons: [] }, verdict.reasons.join("; "));
  assert.equal(outcome.faces.checkout.steps, null);
  const report = renderSmokeReport({ flag: false, script: "fill C", runs: [{ width: 1280, verdict, outcome }] }, "t");
  assert.match(report, /W20: no steps on this checkout/);
});
