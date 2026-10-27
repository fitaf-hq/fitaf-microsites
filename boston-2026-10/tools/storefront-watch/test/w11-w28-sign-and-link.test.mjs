// SPEC-rung2-progress-and-checkout § 33.2: the watch's smoke against § 33's block (zero's sign hidden, the link to
// customer service). The first live rehearsal of that block (2026-10-26, § 33.1's block dbcf88d) flagged one thing, W11
// "the style hides controls that are not H3, H4 or H6: button.summary__remove "×"": the remove control of zero's own
// discount row, which § 33 item 2 hides on purpose with its row. And the smoke listed buttons, never links, so the link
// was not seen.
//   W11d  the rule on recorded outcomes: two hidden controls that read alike and one allowed: ONE flagged (the lists
//         compared as lists with repeats, not as sets of descriptions; two coupons' remove controls read alike).
//   W11e  the smoke on the stand-in with the live zero row (browser-store.mjs `zeroRow: "live"`), at 1280 and 390:
//         PASS; fixture control: `zero: applied`, and the row's remove control among the controls the style hides,
//         allowed.
//   W11f  ⭐ still flags every other hidden control: R2-46's mutant (the email field hidden) with the zero row: W11
//         names the email field, and no W11 reason names the zero row's control.
//   W11g  ⭐ mutant: every discount row marked as zero's (Z7's mutant), beside a second row with its own remove control
//         (`discountRow: "live"`, "x Coupon OFFER -$5.00"): W11 flags that row's control (its row does not name zero);
//         control: the shipped text on the same store passes.
//   W28a  the report's line for the link, on recorded outcomes: once (its words, href, size, displayed), absent, more
//         than once, not read.
//   W28b  the smoke on the stand-in, at 1280 and 390: a#fitaf-help read once, its words data/messages.json's
//         handoff.contact, its href https://fitafnutrition.com/contact, 14 px computed, displayed, in app-checkout; and
//         the report's line says so.
//   W28c  a report, not a pass rule: a text without the link (a block from before § 33, as the live one until the
//         Advisor's paste) passes, and the line says ABSENT.
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

const SITE = new URL("../../../", import.meta.url);
const HELP = "https://fitafnutrition.com/contact";
const ZERO_CONTROL = 'button.summary__remove "x"';

// ── W11d, W28a: the rules, on recorded outcomes ──────────────────────────────────────────────────────────────────────

const passing = () => ({
  done: true,
  screenAtEnd: false,
  events: [{ e: "screen+" }, { e: "step", text: "Meal One · 1 of 7 meals" }, { e: "style+" }, { e: "mark" }, { e: "screen-" }],
  checkout: {
    path: "/checkout",
    style: true,
    mark: true,
    payment: { hidden: [ZERO_CONTROL], allowed: [ZERO_CONTROL], added: [], payWith: true, payWithout: true, payShown: ['button "Place order"'], counts: { with: 20, without: 21 } },
    hide: faces.HIDE.flatMap((h) => h.selectors.map((selector) => ({ id: h.id, selector, found: 1, displayed: 0 }))),
    total: { found: 1, displayed: 1 },
    oneTime: { activeSwitches: 0, renews: [] },
  },
});
const why = (f) => faces.facesVerdict(f).reasons;

test("W11d: zero's remove control hidden and allowed: pass; two hidden that read alike and one allowed: one flagged", () => {
  assert.deepEqual(why(passing()), []);
  const twice = passing();
  twice.checkout.payment.hidden = [ZERO_CONTROL, ZERO_CONTROL];
  assert.deepEqual(why(twice), [`W11: the style hides controls that are not H3, H4 or H6: ${ZERO_CONTROL}`]);
  const kept = passing();
  kept.checkout.payment.allowed = [ZERO_CONTROL, ZERO_CONTROL];
  assert.deepEqual(why(kept), [`W11: H3, H4 or H6's controls still displayed with the style: ${ZERO_CONTROL}`]);
});

test("W28a: the link's line: once, absent, more than once, not read", () => {
  const line = faces.helpLine;
  assert.equal(typeof line, "function", "lib/faces.mjs helpLine");
  const once = { checkout: { help: { count: 1, tag: "a", text: "Contact customer service", href: HELP, fontPx: 14, displayed: true, inCheckout: true } } };
  assert.equal(line(once), `W28: the link to customer service (a#fitaf-help): once, "Contact customer service", ${HELP}, 14 px, displayed, in app-checkout`);
  assert.equal(line({ checkout: { help: { count: 0 } } }), "W28: the link to customer service (a#fitaf-help): ABSENT");
  assert.match(line({ checkout: { help: { ...once.checkout.help, count: 2 } } }), /^W28: the link to customer service \(a#fitaf-help\): 2 TIMES \(one expected\), /);
  assert.match(line({ checkout: { help: { ...once.checkout.help, displayed: false } } }), /, NOT displayed, in app-checkout$/);
  assert.equal(line({ checkout: null }), "W28: /checkout not read");
  // A report, not a pass rule: an outcome with no link passes the faces' rule.
  const absent = passing();
  absent.checkout.help = { count: 0 };
  assert.deepEqual(why(absent), []);
});

// ── W11e–W11g, W28b, W28c: the smoke, in Chrome, on the stand-in ─────────────────────────────────────────────────────

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
let words;
before(async () => {
  if (skip) return;
  store = await startStore();
  code = await siteCode();
  words = JSON.parse(await readFile(new URL("data/messages.json", SITE), "utf8")).handoff;
  const dir = await mkdtemp(join(tmpdir(), "storefront-watch-w28-"));
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
const w11 = (verdict) => verdict.reasons.filter((r) => r.startsWith("W11"));

test("W11e: the stand-in's live zero row, its remove control hidden with it — the smoke passes at 1280 and 390", { skip, timeout: 120_000 }, async () => {
  store.set({ zeroRow: "live" });
  for (const width of [1280, 390]) {
    const { verdict, outcome } = await smoke(width);
    assert.ok(outcome.console.includes("[fitaf-handoff] zero: applied"), `${width}: fixture control, zero: applied`);
    const p = outcome.faces.checkout.payment;
    assert.ok(p.hidden.includes(ZERO_CONTROL), `${width}: fixture control, the zero row's control hidden by the style: ${JSON.stringify(p.hidden)}`);
    assert.ok(p.allowed.includes(ZERO_CONTROL), `${width}: and allowed (§ 33 item 2): ${JSON.stringify(p.allowed)}`);
    assert.deepEqual(verdict, { pass: true, reasons: [] }, `${width}: ${verdict.reasons.join("; ")}`);
  }
});

test("W11f (⭐ mutant): the email field hidden too, beside the zero row — W11 names the email field, never the zero row's control", { skip, timeout: 60_000 }, async () => {
  store.set({ zeroRow: "live" });
  const { verdict } = await smoke(1280, once(text, "a.contact__sign-in", "a.contact__sign-in,.checkout__form input[type=email]"));
  assert.equal(verdict.pass, false);
  assert.ok(w11(verdict).some((r) => /email/i.test(r)), verdict.reasons.join("; "));
  assert.deepEqual(w11(verdict).filter((r) => r.includes("summary__remove")), [], "the zero row's control is not among W11's reasons");
});

test("W11g (⭐ mutant): every discount row marked as zero's — W11 flags the OFFER row's remove control; control: the shipped text passes", { skip, timeout: 120_000 }, async () => {
  store.set({ zeroRow: "live", discountRow: "live" });
  const control = await smoke(1280);
  assert.deepEqual(control.verdict, { pass: true, reasons: [] }, `control: ${control.verdict.reasons.join("; ")}`);
  assert.equal(control.outcome.faces.checkout.payment.hidden.filter((x) => x === ZERO_CONTROL).length, 1, "control: one remove control hidden, zero's");
  const { verdict, outcome } = await smoke(1280, once(text, "/\\bzero\\b/i.test(text(e))", "1"));
  assert.equal(outcome.faces.checkout.payment.hidden.filter((x) => x === ZERO_CONTROL).length, 2, "the mutant hides both rows' controls");
  assert.ok(w11(verdict).some((r) => r === `W11: the style hides controls that are not H3, H4 or H6: ${ZERO_CONTROL}`), verdict.reasons.join("; "));
});

test("W28b: the smoke reads the link to customer service at the checkout — once, its words, its href, 14 px, displayed (1280, 390)", { skip, timeout: 120_000 }, async () => {
  store.set({ zeroRow: "live" });
  for (const width of [1280, 390]) {
    const run = await smoke(width);
    assert.deepEqual(run.verdict, { pass: true, reasons: [] }, `${width}: ${run.verdict.reasons.join("; ")}`);
    const h = run.outcome.faces.checkout.help;
    assert.deepEqual(h, { count: 1, tag: "a", text: words.contact, href: HELP, fontPx: 14, displayed: true, inCheckout: true }, `${width}: ${JSON.stringify(h)}`);
    const report = renderSmokeReport({ flag: false, script: "fill C", runs: [{ width, ...run }] }, "t");
    assert.ok(report.includes(`- W28: the link to customer service (a#fitaf-help): once, "${words.contact}", ${HELP}, 14 px, displayed, in app-checkout`), report);
  }
});

test("W28c: a text without the link (a block from before § 33) — the smoke still passes, and the line says ABSENT", { skip, timeout: 60_000 }, async () => {
  store.set({ zeroRow: "live" });
  const run = await smoke(1280, once(text, "if (c) ui(function () { help(c); });"));
  assert.deepEqual(run.verdict, { pass: true, reasons: [] }, run.verdict.reasons.join("; "));
  assert.equal(run.outcome.faces.checkout.help?.count, 0, JSON.stringify(run.outcome.faces.checkout.help));
  const report = renderSmokeReport({ flag: false, script: "fill C", runs: [{ width: 1280, ...run }] }, "t");
  assert.ok(report.includes("- W28: the link to customer service (a#fitaf-help): ABSENT"), report);
});
