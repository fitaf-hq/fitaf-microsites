// W29 (SPEC-rung2-progress-and-checkout § 36 item 10), a pass rule: with fitaf_struck set by the smoke's init script
// (never a UTM), each surface the smoke reaches shows each of its prices' struck figure exactly once, equal to item 3's
// rule while the offer is current (the smoke's own date), and none outside it (lib/struck.mjs).
//   W29a  the rule and its line on recorded outcomes: a block without the struck prices, not judged (a report); faults;
//         no figure on a priced surface; no priced surface reached; a figure with no offer; not recorded.
//   W29b  the smoke on the stand-in with the store's price elements (browser-store.mjs `prices`), the page's clock and
//         the smoke's date inside the offer, 1280 and 390: PASS; the order page's meals and the cart summary displayed
//         with their figures, the deep-carted checkout's Plan Total in the page and hidden (H15); the line says so.
//   W29c  ⭐ mutant (the shipped text's figure as price x 0.75, changed in memory): W29 fails, naming the figure.
//   W29d  outside the offer (the page's clock and the smoke's date after valid_to): PASS, no struck figure.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderSmokeReport } from "../lib/report.mjs";
import { smokeRun } from "../lib/smoke.mjs";
import { struckLine, struckVerdict } from "../lib/struck.mjs";
import { startStore } from "./browser-store.mjs";
import { chrome, mutate, shipped, skip } from "./r2-browser.mjs";

const SITE = new URL("../../../", import.meta.url);
const OFFER = JSON.parse(await readFile(new URL("data/offers.json", SITE), "utf8")).offers.find((o) => o.applies_to === "general" && o.percent_off);

// ── W29a: the rule, on recorded outcomes ──────────────────────────────────────────────────────────────────────────────

const rec = (o = {}) => ({ samples: 40, judged: 30, seenWas: 12, pricedSeen: true, blockSeen: false, surfaces: { "the order page's meals": { prices: 1, displayed: 1 } }, faults: [], ...o });

test("W29a: the rule and its line on recorded outcomes", () => {
  const on = { carries: true, share: 25, date: "2026-10-27" };
  assert.deepEqual(struckVerdict(rec(), on).reasons, []);
  assert.deepEqual(struckVerdict(rec({ faults: ['the cart summary: "$87.50" struck as $65.63, not $116.67'] }), on).reasons, ['W29: the cart summary: "$87.50" struck as $65.63, not $116.67']);
  assert.deepEqual(struckVerdict(rec({ seenWas: 0 }), on).reasons, ["W29: no struck figure on any priced surface the smoke reached, the offer current"]);
  assert.deepEqual(struckVerdict(rec({ seenWas: 0, pricedSeen: false }), on).reasons, [], "no priced surface reached: a report");
  assert.deepEqual(struckVerdict(rec({ seenWas: 3 }), { ...on, share: 0 }).reasons, ["W29: 3 struck figures shown with no offer current"]);
  assert.deepEqual(struckVerdict(rec({ seenWas: 0 }), { ...on, share: 0 }).reasons, []);
  assert.deepEqual(struckVerdict(null, on).reasons, ["W29: the struck prices were not recorded"]);
  assert.deepEqual(struckVerdict(null, { ...on, carries: false }).reasons, [], "a block from before § 36: not judged");
  const head = "W29: the struck prices (fitaf_struck set by the smoke's init script): ";
  assert.equal(struckLine(rec(), { ...on, carries: false }), `${head}no struck prices in this block (from before § 36)`);
  assert.equal(struckLine(rec(), on), `${head}the offer current on 2026-10-27 in New York, 25%; 30 of 40 samples judged; at most 12 struck figures; the order page's meals displayed; each price struck once, item 3's figure`);
  assert.equal(struckLine(rec({ pricedSeen: false, seenWas: 0 }), on), `${head}the offer current on 2026-10-27 in New York, 25%; no priced surface reached (none of the four's price elements in the page)`);
  assert.match(struckLine(rec({ seenWas: 0, surfaces: {} }), { ...on, share: 0 }), /no offer current on 2026-10-27 in New York; .*; none, as expected$/);
});

// ── W29b–W29d: the smoke on the stand-in ─────────────────────────────────────────────────────────────────────────────

let store;
let site;
before(async () => {
  if (skip) return;
  store = await startStore();
  site = await shipped();
});
after(async () => {
  await store?.close();
});

/** The page's clock fixed at `now` from before its scripts (the block reads the date with Intl from `new Date()`). */
const clockAt = (now) => async (page) =>
  page.evaluateOnNewDocument((t) => {
    const D = Date;
    window.Date = class extends D {
      constructor(...a) {
        if (a.length) super(...a);
        else super(t);
      }
      static now() {
        return t;
      }
    };
  }, now);

const INSIDE = Date.parse(`${OFFER.valid_from}T16:00:00Z`);
const AFTER = Date.parse(`${OFFER.valid_to}T16:00:00Z`) + 86_400_000;
const dayOf = (t) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(t));

const smoke = (width, { text = site.text, now = INSIDE } = {}) =>
  smokeRun({ origin: store.origin, width, mode: { kind: "paste", text, label: "fill C, pasted" }, code: site.code, executablePath: chrome, onPage: clockAt(now), struckDate: dayOf(now) });

test("W29b: the smoke on the stand-in's priced surfaces — PASS, each surface's figures once, the Plan Total hidden (1280, 390)", { skip, timeout: 180_000 }, async () => {
  store.set({ prices: true, zeroRow: "live", storeLines: true });
  for (const width of [1280, 390]) {
    const run = await smoke(width);
    assert.deepEqual(run.verdict, { pass: true, reasons: [] }, `${width}: ${run.verdict.reasons.join("; ")}`);
    const s = run.outcome.struck;
    assert.ok(s.seenWas > 0 && s.judged > 0, `${width}: figures seen and judged (${JSON.stringify(s)})`);
    assert.deepEqual(s.faults, []);
    // § 37: the order page's cards (the Additions' too), the cart summary, and on the deep-carted checkout the lines, the
    // Subtotal and the Plan Total (in the page, hidden by H11, H9 and H15) and the totals (the Total row displayed).
    assert.deepEqual(Object.keys(s.surfaces).sort(), ["the Subtotal", "the cart summary", "the checkout's Plan Total", "the checkout's lines", "the order page's cards", "the phone bar's total", "the totals"], `${width}: ${JSON.stringify(s.surfaces)}`);
    // § 38: the phone bar's total, judged at both widths, displayed below 1025 px only.
    assert.equal(s.surfaces["the phone bar's total"].displayed, width === 390 ? 1 : 0, `${width}: the phone bar's total ${width === 390 ? "displayed" : "not displayed"}`);
    assert.equal(s.surfaces["the checkout's Plan Total"].displayed, 0, "the deep-carted checkout hides the Plan Total row (H15)");
    assert.equal(s.surfaces["the order page's cards"].displayed, 1);
    assert.equal(s.surfaces["the totals"].displayed, 1, "the Total row displayed, struck by the totals' rule");
    const report = renderSmokeReport({ flag: false, script: "fill C", runs: [{ width, ...run }] }, "t");
    assert.match(report, /- W29: the struck prices \(fitaf_struck set by the smoke's init script\): the offer current on .* in New York, 25%; .*the checkout's Plan Total in the page, not displayed.*; each price struck once, item 3's figure \(SPEC-rung2-progress-and-checkout § 36\)/, report);
  }
});

test("W29c (⭐ mutant): the figure as price x 0.75 — W29 fails, naming the figure; control: the shipped text passes", { skip, timeout: 120_000 }, async () => {
  store.set({ prices: true, zeroRow: "live" });
  const control = await smoke(1280);
  assert.deepEqual(control.verdict.reasons, [], "control");
  const run = await smoke(1280, { text: mutate(site.text, "c * 100 / (100 - share)", "c * 0.75") });
  assert.ok(run.verdict.reasons.some((r) => /^W29: .* struck as \$\d+\.\d\d, not \$\d+\.\d\d$/.test(r)), run.verdict.reasons.join("; "));
});

test("W29d: outside the offer — PASS, no struck figure", { skip, timeout: 120_000 }, async () => {
  store.set({ prices: true, zeroRow: "live" });
  const run = await smoke(1280, { now: AFTER });
  assert.deepEqual(run.verdict, { pass: true, reasons: [] }, run.verdict.reasons.join("; "));
  assert.equal(run.outcome.struck.seenWas, 0);
  assert.equal(run.outcome.struckMeta.share, 0);
});
