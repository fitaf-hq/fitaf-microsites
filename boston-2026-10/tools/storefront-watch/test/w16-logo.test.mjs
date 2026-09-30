// W16 (SPEC-rung2-progress-and-checkout § 15.5, live, both widths): the smoke reports the Fit AF logo on the progress
// screen and on the deep-carted checkout, found or absent, and ABSENT FAILS THE WIDTH. The logo is the store's own
// header image (img.header__logo-image), which the block shows in an img of its own, alt "Fit AF" (§ 15.3): on the screen
// (the recorder notes it arriving there), and first in the store's checkout component (read on /checkout after done,
// found and displayed). Judged, as W11–W14, only once fill B reached done; a stopped run is failed by the smoke's own
// rule and judged by W10 alone.
// W16a: the rule on recorded outcomes (lib/faces.mjs logoVerdict and logoLine), no browser. W16b: the smoke itself, in
// headless Chrome against the synthetic store on 127.0.0.1 (never the live store): the store's header carries a
// generated logo (a flat SVG rectangle, never a photograph), so both logos are found at both widths, and the image is
// requested once per page the smoke loads, never again by either logo of ours; a store without a header logo fails the
// width on W16, naming both, and on nothing else.
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
import { LOGO_PATH, startStore } from "./browser-store.mjs";

// ── W16a: the rule, on recorded outcomes ─────────────────────────────────────────────────────────────────────────────

/** A recorded outcome whose logos were both seen: the screen's arriving, and the checkout's found and displayed. */
const seen = () => ({
  done: true,
  screenAtEnd: false,
  events: [{ e: "screen+" }, { e: "logo" }, { e: "step", text: "Meal One · 1 of 7 meals" }, { e: "style+" }, { e: "mark" }, { e: "screen-" }],
  checkout: { path: "/checkout", style: true, mark: true, logo: { found: 1, displayed: 1 } },
});
const why = (f) => faces.logoVerdict(f).reasons;

test("W16a: both logos seen — no W16 reason; the report's line says both were found", () => {
  assert.equal(typeof faces.logoVerdict, "function", "lib/faces.mjs has W16's rule");
  assert.deepEqual(why(seen()), []);
  assert.match(faces.logoLine(seen()), /^W16: the Fit AF logo on the screen: found; on the checkout: found$/);
});

test("W16a: absent on the screen, absent on the checkout, or there but not displayed — each fails, under W16, saying which", () => {
  const noScreen = seen();
  noScreen.events = noScreen.events.filter((e) => e.e !== "logo");
  assert.deepEqual(why(noScreen), ["W16: no Fit AF logo on the progress screen (absent)"]);
  const noCheckout = seen();
  noCheckout.checkout.logo = { found: 0, displayed: 0 };
  assert.deepEqual(why(noCheckout), ["W16: no Fit AF logo on the deep-carted checkout (absent)"]);
  const hidden = seen();
  hidden.checkout.logo = { found: 1, displayed: 0 };
  assert.deepEqual(why(hidden), ["W16: the Fit AF logo on the deep-carted checkout is there but not displayed"]);
  const unread = seen();
  unread.checkout = null;
  assert.deepEqual(why(unread), ["W16: the checkout's logo was not read (/checkout not read)"]);
  assert.match(faces.logoLine(noCheckout), /on the screen: found; on the checkout: ABSENT$/);
  assert.match(faces.logoLine(noScreen), /on the screen: ABSENT; on the checkout: found$/);
});

test("W16a: a run that did not reach done is not judged on W16 (the smoke's own rule has failed it; W10 judges the screen)", () => {
  const stopped = seen();
  stopped.done = false;
  stopped.events = stopped.events.filter((e) => e.e !== "logo");
  stopped.checkout = null;
  assert.deepEqual(why(stopped), []);
});

// ── W16b: the smoke, in Chrome, on the synthetic store ───────────────────────────────────────────────────────────────

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
  const dir = await mkdtemp(join(tmpdir(), "storefront-watch-w16-"));
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

test("W16b: the synthetic store's header logo — found on the screen and on the checkout at both widths; never fetched again", { skip, timeout: 120_000 }, async () => {
  store.set({});
  for (const width of [1280, 390]) {
    const hits = store.hits(LOGO_PATH);
    const { verdict, outcome } = await smoke(width);
    assert.deepEqual(verdict, { pass: true, reasons: [] }, `${width}: ${verdict.reasons.join("; ")}`);
    const f = outcome.faces;
    assert.ok(f.events.some((e) => e.e === "logo"), `${width}: the logo seen on the screen: ${JSON.stringify(f.events.map((e) => e.e))}`);
    assert.deepEqual(f.checkout.logo, { found: 1, displayed: 1 }, `${width}: the logo on the checkout, displayed`);
    assert.equal(store.hits(LOGO_PATH) - hits, 2, `${width}: the header's image fetched once by each page the smoke loads (the menu, the link), never by a logo of ours`);
    const report = renderSmokeReport({ flag: false, script: "fill B", runs: [{ width, verdict, outcome }] }, "t");
    assert.match(report, /W16: the Fit AF logo on the screen: found; on the checkout: found/);
  }
});

test("W16b: a store without a header logo — the width fails on W16, naming the screen and the checkout, and on nothing else", { skip, timeout: 60_000 }, async () => {
  store.set({ missing: ["logo"] });
  const { verdict, outcome } = await smoke(1280);
  assert.equal(verdict.pass, false);
  assert.deepEqual(verdict.reasons, [
    "W16: no Fit AF logo on the progress screen (absent)",
    "W16: no Fit AF logo on the deep-carted checkout (absent)",
  ]);
  assert.ok(outcome.console.includes("[fitaf-handoff] done: /checkout"), "fixture control: the fill itself is unchanged");
  const report = renderSmokeReport({ flag: true, script: "fill B", runs: [{ width: 1280, verdict, outcome }] }, "t");
  assert.match(report, /W16: the Fit AF logo on the screen: ABSENT; on the checkout: ABSENT/);
});
