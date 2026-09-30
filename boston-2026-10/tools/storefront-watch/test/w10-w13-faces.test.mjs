// W10–W13 (SPEC-rung2-progress-and-checkout § 5, "Live, in the watch's smoke", added to F5's pass):
//   W10  the progress screen during the run: seen after the first press, and gone at done;
//   W11  ⭐ § 3 item 4 on /checkout: the displayed controls inside app-checkout with style#fitaf-deep enabled, then
//        disabled: equal, except H3, H4 and H6; the pay button displayed in both;
//   W12  each of H1–H6 on the checkout: found (a missing one fails open, showing, and is reported);
//   W13  the order is one-time: no active subscription switch and no "renews every" line on the deep-carted checkout.
// W10a–W13a: the pass rule on recorded outcomes (lib/faces.mjs facesVerdict), no browser. W10b–W13b: the smoke itself
// (lib/smoke.mjs) in headless Chrome against the synthetic store on 127.0.0.1, never the live store: a pass, then each
// check made to fail by the store (a missing pop-up host, a subscription on) or by a mutant of the shipped text.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromePath } from "../lib/browser.mjs";
import { DEPENDENCIES_PATH } from "../lib/config.mjs";
import { facesVerdict, HIDE } from "../lib/faces.mjs";
import { renderSmokeReport } from "../lib/report.mjs";
import { siteCode } from "../lib/site-code.mjs";
import { smokeRun } from "../lib/smoke.mjs";
import { startStore } from "./browser-store.mjs";

// ── W10a–W13a: the rule, on recorded outcomes ─────────────────────────────────────────────────────────────────────────

const found = () => HIDE.flatMap((h) => h.selectors.map((selector) => ({ id: h.id, selector, found: 1, displayed: 0 })));
/** A recorded outcome that passes, in the shape lib/smoke.mjs records at each width. */
const passing = () => ({
  done: true,
  screenAtEnd: false,
  events: [
    { e: "screen+" },
    { e: "step", text: "Meal One · 1 of 7 meals" },
    { e: "step", text: "Taking you to checkout" },
    { e: "style+" },
    { e: "mark" },
    { e: "screen-" },
  ],
  checkout: {
    path: "/checkout",
    style: true,
    mark: true,
    payment: {
      hidden: ['a.contact__sign-in "Sign in"'],
      allowed: ['a.contact__sign-in "Sign in"'],
      added: [],
      payWith: true,
      payWithout: true,
      counts: { with: 20, without: 21 },
    },
    hide: found(),
    oneTime: { activeSwitches: 0, renews: [] },
  },
});
const why = (faces) => facesVerdict(faces).reasons.join(" · ");

test("W10a–W13a: a run that shows the screen, strips the checkout as the hide list says, and stays one-time: pass", () => {
  assert.deepEqual(facesVerdict(passing()).reasons, []);
});

test("W10a: the screen never seen, or seen but never past the first press, or still up at done: fail, saying which", () => {
  const never = passing();
  never.events = never.events.filter((e) => e.e !== "screen+" && e.e !== "step" && e.e !== "screen-");
  assert.match(why(never), /W10: .*never/);
  const noStep = passing();
  noStep.events = noStep.events.filter((e) => e.e !== "step");
  assert.match(why(noStep), /W10: .*meal/);
  const stuck = passing();
  stuck.screenAtEnd = true;
  stuck.events = stuck.events.filter((e) => e.e !== "screen-");
  assert.match(why(stuck), /W10: .*still/);
});

test("W11a: a hidden control that is not H3, H4 or H6; one of theirs left displayed; one shown only with the style; the pay button: fail", () => {
  const extra = passing();
  extra.checkout.payment.hidden.push('input[name=email] "Email"');
  assert.match(why(extra), /W11: .*input\[name=email\]/);
  const left = passing();
  left.checkout.payment.hidden = [];
  assert.match(why(left), /W11: .*contact__sign-in/);
  const added = passing();
  added.checkout.payment.added = ['button "Surprise"'];
  assert.match(why(added), /W11: .*Surprise/);
  const pay = passing();
  pay.checkout.payment.payWith = false;
  assert.match(why(pay), /W11: .*pay button/);
  const noStyle = passing();
  noStyle.checkout.style = false;
  noStyle.checkout.payment = null;
  assert.match(why(noStyle), /W11: .*style#fitaf-deep/);
});

test("W12a: one of H1–H6 missing from the checkout, or found but still displayed: fail, naming it", () => {
  const missing = passing();
  missing.checkout.hide.find((h) => h.id === "H5").found = 0;
  assert.match(why(missing), /W12: H5 app-storefront-popup-host not found/);
  const shown = passing();
  shown.checkout.hide.find((h) => h.id === "H1").displayed = 1;
  assert.match(why(shown), /W12: H1 \.sticky-header .*displayed/);
});

test("W13a: an active subscription switch, or a \"renews every\" line, on the checkout: fail", () => {
  const on = passing();
  on.checkout.oneTime.activeSwitches = 1;
  assert.match(why(on), /W13: .*active subscription switch/);
  const renews = passing();
  renews.checkout.oneTime.renews = ["Subscription — renews every 7 days until canceled."];
  assert.match(why(renews), /W13: .*renews every/);
});

test("W10a: a run stopped before done is judged by W10 alone (the screen must be gone); W11–W13 are not measured", () => {
  const stopped = passing();
  stopped.done = false;
  stopped.checkout = null;
  assert.deepEqual(facesVerdict(stopped).reasons, []);
  stopped.screenAtEnd = true;
  assert.match(why(stopped), /W10: .*still/);
});

test("the hide list W11 and W12 read is the contract's H1–H6, with H6 only while a switch is there and off", () => {
  assert.deepEqual(HIDE.map((h) => h.id), ["H1", "H2", "H3", "H4", "H5", "H6"]);
  assert.deepEqual(HIDE.flatMap((h) => h.selectors), [
    ".sticky-header",
    ".footer",
    ".app-hmp-credit",
    "a.checkout__guest-signin-banner",
    "a.contact__sign-in",
    "app-storefront-popup-host",
    ".summary__plan-subscription-controls:has(.summary__subscription-toggle):not(:has(.summary__subscription-toggle--active))",
  ]);
  assert.deepEqual(HIDE.filter((h) => h.inCheckout).map((h) => h.id), ["H3", "H4", "H6"]);
});

test("F2 carries the hide list's names (and the checkout's, and the pay button's): a release that renames one is flagged", async () => {
  const deps = JSON.parse(await readFile(DEPENDENCIES_PATH, "utf8"));
  const literals = deps.literals.map((d) => d.literal);
  const NAMES = ["app-checkout", "checkout__submit", "sticky-header", "footer", "app-hmp-credit", "checkout__guest-signin-banner", "contact__sign-in",
    "app-storefront-popup-host", "summary__plan-subscription-controls", "summary__subscription-toggle", "summary__subscription-toggle--active"];
  for (const name of NAMES) {
    assert.ok(literals.some((l) => new RegExp(`(^|[^\\w-])${name.replace(/[-_]/g, (c) => `\\${c}`)}([^\\w-]|$)`).test(l)), `a literal names ${name}`);
  }
  assert.equal(new Set(deps.literals.map((d) => d.id)).size, deps.literals.length, "ids unique");
  for (const d of deps.literals) assert.ok(d.use && d.spec, `${d.id}: its use and its contract section`);
});

// ── W10b–W13b: the smoke, in Chrome, on the synthetic store ──────────────────────────────────────────────────────────

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
  const dir = await mkdtemp(join(tmpdir(), "storefront-watch-w10-"));
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
  smokeRun({ origin: store.origin, width, mode: { kind: "paste", text: script, label: "fill B, pasted" }, code, executablePath: chrome });
function once(haystack, needle) {
  assert.equal(haystack.split(needle).length - 1, 1, `the mutant's target appears once: ${needle}`);
  return haystack.replace(needle, "");
}

test("W10b–W13b: the smoke on the synthetic store — the screen seen then gone, the payment untouched, H1–H6 found, one-time: pass", { skip, timeout: 120_000 }, async () => {
  store.set({});
  for (const width of [1280, 390]) {
    const { verdict, outcome } = await smoke(width);
    assert.deepEqual(verdict, { pass: true, reasons: [] }, `${width}: ${verdict.reasons.join("; ")}`);
    const f = outcome.faces;
    const kinds = f.events.map((e) => e.e);
    assert.ok(kinds.indexOf("screen+") < kinds.indexOf("style+") && kinds.indexOf("style+") < kinds.lastIndexOf("screen-"), kinds.join(" "));
    assert.ok(f.events.some((e) => e.e === "step" && / 1 of 7 /.test(e.text)), JSON.stringify(f.events));
    assert.equal(f.checkout.payment.hidden.length, 4, JSON.stringify(f.checkout.payment));
    assert.deepEqual(f.checkout.payment.hidden, f.checkout.payment.allowed);
    assert.ok(f.checkout.hide.every((h) => h.found >= 1 && h.displayed === 0), JSON.stringify(f.checkout.hide));
    const report = renderSmokeReport({ flag: false, script: "fill B", runs: [{ width, verdict, outcome }] }, "t");
    assert.match(report, /W10–W13/);
  }
});

test("W10b: a text that never shows the screen: the smoke fails on W10", { skip, timeout: 60_000 }, async () => {
  store.set({});
  const { verdict } = await smoke(1280, once(text, "ui(screen);"));
  assert.equal(verdict.pass, false);
  assert.ok(verdict.reasons.some((r) => /^W10: .*never/.test(r)), verdict.reasons.join("; "));
});

test("W11b: a text whose hide rule also takes the email field (R2-46's mutant): the smoke fails on W11, naming it", { skip, timeout: 60_000 }, async () => {
  store.set({});
  const mutant = text.replace("a.contact__sign-in", "a.contact__sign-in,.checkout__form input[type=email]");
  assert.notEqual(mutant, text);
  const { verdict } = await smoke(1280, mutant);
  assert.equal(verdict.pass, false);
  assert.ok(verdict.reasons.some((r) => /^W11: .*email/i.test(r)), verdict.reasons.join("; "));
});

test("W12b: a release without the pop-up host: the smoke fails on W12, naming H5", { skip, timeout: 60_000 }, async () => {
  store.set({ missing: ["popup"] });
  const { verdict } = await smoke(1280);
  assert.equal(verdict.pass, false);
  assert.ok(verdict.reasons.some((r) => /^W12: H5 app-storefront-popup-host not found/.test(r)), verdict.reasons.join("; "));
});

test("W13b: a store that defaults the plan to a subscription: the smoke fails on W13", { skip, timeout: 60_000 }, async () => {
  store.set({ subscription: "active" });
  const { verdict } = await smoke(1280);
  assert.equal(verdict.pass, false);
  assert.ok(verdict.reasons.some((r) => /^W13: .*active subscription switch/.test(r)), verdict.reasons.join("; "));
  assert.ok(verdict.reasons.some((r) => /^W13: .*renews every/.test(r)), verdict.reasons.join("; "));
});
