// Z1–Z5 (SPEC-rung2-progress-and-checkout § 31): every hand-off applies the store's code `zero`, hidden, and never blocks
// a sale. In the stand-in checkout (browser-store.mjs, its § 31 options: the code field's placements, what its Apply
// answers, the sign of a code applied), headless Chrome on 127.0.0.1, the SHIPPED text pasted as a person pastes it.
//   Z1  the code field found in each placement the store renders, filled with `zero` by the events a person's typing
//       fires, its Apply pressed once, and the sign awaited (the applied mark beside the field, or a discount row) before
//       the screen goes; the gift-card field never touched; a coded link (`~SAVE10`) still gets `zero`.
//   Z2  the discount UI hidden throughout: at every event the block fires in it and at every frame while it fills, no
//       .checkout-discounts is displayed (H7's selectors still match), and none after done.
//   Z3  no code field: `zero: not found`, the checkout exactly as before (done, step 1, Continue to step 2).
//   Z4  the code refused: `zero: refused`, the same; no sign at all: `zero: no sign`, after the block's stated bound.
//   Z5  applied once: the store's Apply pressed once in a run; a reload of /checkout presses nothing; a code the store
//       already shows applied is never applied again.
// Mutants (each with its control, the shipped text passing the same case): the code read from the link (Z1's coded
// link fails); the discount UI shown while filling (the code applied before the checkout's style: Z2 fails); a failure
// that stops the checkout (a verdict other than "applied" never lets the checkout go: Z3 fails).
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { sleep } from "../lib/browser.mjs";
import { startStore } from "./browser-store.mjs";
import { browserFor, DONE, mutate, openDeep, press, shipped, skip, untilStep } from "./r2-browser.mjs";

const LINE = (m) => `[fitaf-handoff] zero: ${m}`;
const PRESSED = "[fixture] discount pressed: ";
const PLACEMENTS = ["section", "payment", "summary"];
/** § 31 item 3's bound, as this build states it: 25 polls of 200 ms after the press of Apply. */
const BOUND_MS = 25 * 200;

let store;
let browser;
let site;
before(async () => {
  if (skip) return;
  store = await startStore();
  browser = await browserFor();
  site = await shipped();
});
after(async () => {
  await browser?.close();
  await store?.close();
});

/**
 * In every document: each input, change, blur and click whose target is inside a .checkout-discounts, with whether the
 * screen and the checkout's style were on the page and whether any .checkout-discounts was displayed at that moment;
 * and, at every frame while app-checkout is on the page, the same two readings.
 */
function recorder() {
  window.__z = [];
  window.__zFrames = [];
  const shownAny = () => [...document.querySelectorAll(".checkout-discounts")].some((d) => d.getClientRects().length > 0);
  const note = (e) => {
    const t = e.target;
    if (!(t instanceof Element) || !t.closest(".checkout-discounts")) return;
    window.__z.push({
      type: e.type,
      name: t.getAttribute("name") || t.className,
      value: t.localName === "input" ? t.value : null,
      screen: Boolean(document.getElementById("fitaf-screen")),
      style: Boolean(document.getElementById("fitaf-deep")),
      shown: shownAny(),
    });
  };
  for (const type of ["input", "change", "blur", "click"]) document.addEventListener(type, note, true);
  const frame = () => {
    if (document.querySelector("app-checkout")) {
      window.__zFrames.push({ typed: window.__z.length > 0, screen: Boolean(document.getElementById("fitaf-screen")), shown: shownAny() });
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/** One hand-off on the stand-in with `options`; the run, its verdict, its lines and the recorder's readings. */
async function zeroRun(options = {}, { text = site.text, width = 1280, offer = null } = {}) {
  store.set(options);
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text, width, offer, init: recorder });
  const verdict = await run.verdict(20_000);
  await sleep(300);
  const read = await run.page.evaluate(() => ({ events: window.__z ?? [], frames: window.__zFrames ?? [] }));
  return { run, verdict, lines: run.lines, ...read };
}

const pressedLines = (lines) => lines.filter((l) => l.startsWith(PRESSED));
const ours = (lines) => lines.filter((l) => l.startsWith("[fitaf-handoff]"));

/** Z1's check over one run: the field of `placement` filled with `zero`, its Apply pressed once, the sign awaited. */
function assertApplied(r, placement, { coded = false } = {}) {
  assert.equal(r.verdict, DONE, JSON.stringify(ours(r.lines)));
  assert.deepEqual(pressedLines(r.lines), [`${PRESSED}zero`], "the store's Apply pressed once, the field holding zero as its input events gave it");
  const order = ["[fixture] discount applied: zero", LINE("applied"), DONE].map((l) => r.lines.indexOf(l));
  assert.ok(order.every((i, k) => i >= 0 && (k === 0 || i > order[k - 1])), `the store applied it, then the block's line, then done: ${JSON.stringify(r.lines)}`);
  const field = `coupon-${placement}`;
  const typed = r.events.filter((e) => e.name === field && e.type === "input");
  assert.equal(typed.length, 1, `one input event on ${field}: ${JSON.stringify(r.events)}`);
  assert.equal(typed[0].value, "zero", "the value typed is the block's constant");
  assert.ok(r.events.some((e) => e.name === field && e.type === "change"), "and the change event a person's typing ends with");
  const clicks = r.events.filter((e) => e.type === "click");
  assert.equal(clicks.length, 1, `one press in the discounts: ${JSON.stringify(clicks)}`);
  assert.ok(r.events.every((e) => e.screen && e.style), "every event while the screen is up and the checkout's style is set: before the first step is interactive");
  assert.ok(!r.events.some((e) => /^giftCard-/.test(e.name)), "the gift-card field never touched");
  if (!coded) assert.ok(r.events.every((e) => !e.shown), "the discount UI hidden at every event");
}

for (const placement of PLACEMENTS) {
  test(`Z1: the code field in the ${placement} placement alone — filled with zero, Apply pressed once, the applied mark awaited`, { skip, timeout: 60_000 }, async () => {
    const r = await zeroRun({ discounts: [placement] });
    try {
      assertApplied(r, placement);
    } finally {
      await r.run.close();
    }
  });
}

test("Z1b: every placement rendered (the store's default), at 390 — the first in the page is filled; the sign a summary row (zeroRow)", { skip, timeout: 60_000 }, async () => {
  const r = await zeroRun({ zeroRow: true }, { width: 390 });
  try {
    assertApplied(r, "section");
    const rows = await r.run.page.evaluate(() => [...document.querySelectorAll(".summary__row--discount")].map((e) => e.textContent.trim()));
    assert.deepEqual(rows, ["Discount (ZERO)-$0.00"], "fixture control: the store's sign was its row");
  } finally {
    await r.run.close();
  }
});

/** Z1c over `text`: a link carrying an offer code still gets `zero`, never the link's code. */
async function codedCase(text) {
  const r = await zeroRun({}, { text, offer: "SAVE10" });
  try {
    assert.ok(r.run.page.url().length > 0);
    assertApplied(r, "section", { coded: true });
  } finally {
    await r.run.close();
  }
}

test("Z1c: a coded link (~SAVE10) — still zero, the block's constant, never the link's code", { skip, timeout: 60_000 }, async () => {
  await codedCase(site.text);
});

test("Z1c (mutant): the code read from the link — Z1c fails", { skip, timeout: 60_000 }, async () => {
  const mutant = mutate(site.text, "i.value = ZERO;", "i.value = CODE || ZERO;");
  await assert.rejects(codedCase(mutant), (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    return true;
  });
});

/** Z2 over `text`: no .checkout-discounts displayed at any event of the block's or any frame while it fills, or after. */
async function hiddenCase(text) {
  const r = await zeroRun({}, { text });
  try {
    assert.equal(r.verdict, DONE, JSON.stringify(ours(r.lines)));
    assert.ok(r.events.length >= 3, `fixture control: the block filled the field (${r.events.length} events)`);
    assert.deepEqual(r.events.filter((e) => e.shown), [], "no event while the discount UI is displayed");
    const filling = r.frames.filter((f) => f.typed && f.screen);
    assert.deepEqual(filling.filter((f) => f.shown), [], `no frame while filling with the discount UI displayed (${filling.length} frames)`);
    const after = await r.run.page.evaluate(() => [...document.querySelectorAll(".checkout-discounts")].map((d) => d.getClientRects().length > 0));
    assert.deepEqual(after, [false, false, false], "H7's selectors still match: all three placements hidden after done");
  } finally {
    await r.run.close();
  }
}

test("Z2: the discount UI hidden throughout — at every event the block fires, every frame while it fills, and after done", { skip, timeout: 60_000 }, async () => {
  await hiddenCase(site.text);
});

test("Z2 (mutant): the code applied before the checkout's style is set (the UI shown while filling) — Z2 fails", { skip, timeout: 60_000 }, async () => {
  const mutant = mutate(site.text, "ui(mark); return zero(function (m) { ", "return zero(function (m) { ui(mark); ");
  await assert.rejects(hiddenCase(mutant), (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    return true;
  });
});

/** The checkout exactly as without § 31: done, the screen gone, step 1, and Continue taking the visitor to step 2. */
async function assertCheckoutGoesOn(r, line) {
  assert.equal(r.verdict, DONE, JSON.stringify(ours(r.lines)));
  assert.ok(r.lines.includes(line), `the block's line ${line}: ${JSON.stringify(ours(r.lines))}`);
  assert.ok(r.lines.indexOf(line) < r.lines.indexOf(DONE), "named before the verdict");
  assert.ok(!r.lines.some((l) => l.includes("stopped:")), "no stop");
  assert.equal(await r.run.page.evaluate(() => Boolean(document.getElementById("fitaf-screen"))), false, "the screen gone");
  await untilStep(r.run, 1);
  await press(r.run, "go");
  await untilStep(r.run, 2);
}

/** Z3 over `text`: no code field (the gift-card fields alone). */
async function notFoundCase(text) {
  const r = await zeroRun({ discounts: [] }, { text });
  try {
    await assertCheckoutGoesOn(r, LINE("not found"));
    assert.deepEqual(r.events, [], "nothing typed or pressed in the discounts (the gift-card fields untouched)");
    assert.deepEqual(pressedLines(r.lines), []);
  } finally {
    await r.run.close();
  }
}

test("Z3: no code field — zero: not found, and the checkout as before (done, step 1, Continue to step 2)", { skip, timeout: 60_000 }, async () => {
  await notFoundCase(site.text);
});

test("Z3 (mutant): a failure that stops the checkout (only an applied code lets it go) — Z3 fails", { skip, timeout: 90_000 }, async () => {
  const mutant = mutate(site.text, 'log("zero: " + m); end("done: /checkout");', 'if (m == "applied") { log("zero: " + m); end("done: /checkout"); }');
  await assert.rejects(notFoundCase(mutant), (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    return true;
  });
});

test("Z4: the code refused — zero: refused, the checkout as before", { skip, timeout: 60_000 }, async () => {
  const r = await zeroRun({ zero: "refuse" });
  try {
    assert.ok(r.lines.includes("[fixture] discount refused: zero"), "fixture control: the store refused it");
    await assertCheckoutGoesOn(r, LINE("refused"));
    assert.deepEqual(pressedLines(r.lines), [`${PRESSED}zero`], "pressed once, never again after the refusal");
  } finally {
    await r.run.close();
  }
});

test("Z4b: no sign at all — zero: no sign, at the stated bound after the press, the checkout as before", { skip, timeout: 60_000 }, async () => {
  store.set({ zero: "silent" });
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text: site.text, init: recorder });
  try {
    const t0 = await run.until(() => window.__z?.some((e) => e.type === "click") && performance.now(), null, 20_000);
    assert.ok(t0, "fixture control: Apply pressed");
    const verdict = await run.verdict(20_000);
    const t1 = await run.page.evaluate(() => performance.now());
    const waited = t1 - t0;
    assert.ok(waited >= BOUND_MS - 400 && waited <= BOUND_MS + 2_500, `the verdict ${Math.round(waited)} ms after the press: the bound is ${BOUND_MS}`);
    await sleep(300);
    const r = { run, verdict, lines: run.lines };
    await assertCheckoutGoesOn(r, LINE("no sign"));
  } finally {
    await run.close();
  }
});

test("Z5: applied once — the store's Apply pressed once; a reload of /checkout presses nothing; a code already applied is never applied again", { skip, timeout: 90_000 }, async () => {
  // The store's Footer carries the block on every page (footerOnCheckout), as the live store's Custom Scripts do.
  const r = await zeroRun({ footer: site.text, footerOnCheckout: true });
  try {
    assertApplied(r, "section");
    const before = r.lines.length;
    await r.run.page.reload({ waitUntil: "load" });
    await sleep(3_000);
    const after = r.lines.slice(before);
    assert.ok(await r.run.page.evaluate(() => Boolean(document.querySelector("app-checkout .discount__applied"))), "fixture control: the store kept the code across the reload");
    assert.ok(await r.run.page.evaluate(() => [...document.scripts].some((s) => s.text.includes("fitaf-handoff"))), "fixture control: the reloaded checkout carries the block");
    assert.deepEqual(pressedLines(after), [], "the reload pressed nothing");
    assert.deepEqual(ours(after), [], "the block did nothing on the reload (no link)");
  } finally {
    await r.run.close();
  }
  const kept = await zeroRun({ zeroApplied: true });
  try {
    assert.equal(kept.verdict, DONE);
    assert.ok(kept.lines.includes(LINE("applied")), JSON.stringify(ours(kept.lines)));
    assert.deepEqual(pressedLines(kept.lines), [], "a code the store already shows applied: nothing typed, nothing pressed");
    assert.deepEqual(kept.events, []);
  } finally {
    await kept.run.close();
  }
});
