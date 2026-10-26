// Z6–Z9, L1, L2 (SPEC-rung2-progress-and-checkout § 33): `zero`'s sign hidden, and one small link to customer service.
// In the stand-in checkout (browser-store.mjs, `zeroRow: "live"`: the discount row as § 33.1 measured it on the live
// store, "Coupon ZERO" with its remove control; `window.__fixtureRerender()`: every price row drawn again as new
// elements, as Angular does), headless Chrome on 127.0.0.1, the SHIPPED text pasted as a person pastes it.
//   Z6  every element naming `zero` hidden: never displayed at any frame of the checkout, after `zero: applied` and after
//       the store draws its summary again (fixture control: the row is on the page, naming ZERO), at 1280 and 390.
//   Z7  a second discount row not naming `zero` (the stand-in's "Discount (OFFER)") displayed, before and after the
//       re-render, beside a hidden `zero` row.
//   Z8  the Total row displayed, and the Total the same as before the code (the stand-in's $87.50).
//   Z9  a coded link (~SAVE10, `zero: coded link`) with a `zero` row the store kept: nothing hidden, the row displayed.
//   L1  the link once at the very bottom of the checkout (below every other displayed element of it, overlapping no
//       control of the store's nor the pay button, the phone bar's included), its words data/messages.json's
//       handoff.contact, its address https://fitafnutrition.com/contact, a link not a button, 13 to 14 px, the page's
//       --muted (never orange), its text centred; at 1280 and 390, at step 1 and step 2.
//   L2  not duplicated: one link after the store's re-render, and after Continue and Back.
// Mutants (each with its control, the shipped text passing the same case): every discount row hidden (Z7 fails); the
// link added twice (L1 fails).
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sleep } from "../lib/browser.mjs";
import { startStore } from "./browser-store.mjs";
import { browserFor, DONE, mutate, openDeep, press, shipped, skip, untilStep } from "./r2-browser.mjs";

const SITE = new URL("../../../", import.meta.url);
const HELP = "https://fitafnutrition.com/contact";
const LINE = (m) => `[fitaf-handoff] zero: ${m}`;

let store;
let browser;
let site;
let words;
let muted;
before(async () => {
  if (skip) return;
  store = await startStore();
  browser = await browserFor();
  site = await shipped();
  words = JSON.parse(await readFile(new URL("data/messages.json", SITE), "utf8")).handoff;
  const hex = /--muted:\s*#([0-9a-f]{6})/i.exec(await readFile(new URL("src/template.html", SITE), "utf8"))[1];
  muted = `rgb(${[0, 2, 4].map((k) => parseInt(hex.slice(k, k + 2), 16)).join(", ")})`;
});
after(async () => {
  await browser?.close();
  await store?.close();
});

/** In every document, at every frame while app-checkout is on the page: the elements naming `zero` and those displayed. */
function recorder() {
  window.__zs = [];
  const naming = () =>
    [...document.querySelectorAll("app-checkout *")].filter(
      (e) => !/^(script|style)$/i.test(e.localName) && [...e.childNodes].some((n) => n.nodeType === 3 && /\bzero\b/i.test(n.textContent)),
    );
  const frame = () => {
    if (document.querySelector("app-checkout")) {
      const all = naming();
      window.__zs.push({ present: all.length, shown: all.filter((e) => e.getClientRects().length > 0).map((e) => e.textContent.trim()) });
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/** The price rows and the Total as the page displays them now. */
function rowsRead() {
  const shown = (e) => e.getClientRects().length > 0;
  const t = document.querySelector(".summary__total");
  return {
    discounts: [...document.querySelectorAll(".summary__row--discount")].map((e) => ({ text: e.textContent.replace(/\s+/g, " ").trim(), shown: shown(e) })),
    total: t && { text: t.textContent.replace(/\s+/g, " ").trim(), shown: shown(t) },
  };
}

async function deepRun(options, { text = site.text, width = 1280, offer = null } = {}) {
  store.set(options);
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text, width, offer, init: recorder });
  const verdict = await run.verdict(20_000);
  await sleep(300);
  return { run, verdict };
}

const ours = (lines) => lines.filter((l) => l.startsWith("[fitaf-handoff]"));
const frames = (run) => run.page.evaluate(() => window.__zs ?? []);

/** Z6 at `width`: no element naming zero displayed at any frame, before and after the store's re-render. */
async function signHidden(width) {
  const { run, verdict } = await deepRun({ zeroRow: "live" }, { width });
  try {
    assert.equal(verdict, DONE, JSON.stringify(ours(run.lines)));
    assert.ok(run.lines.includes(LINE("applied")), `zero: applied: ${JSON.stringify(ours(run.lines))}`);
    const before = await frames(run);
    assert.ok(before.some((f) => f.present > 0), "fixture control: the store's row naming ZERO is on the page");
    assert.deepEqual(before.filter((f) => f.shown.length), [], "no element naming zero displayed at any frame of the checkout");
    await run.page.evaluate(() => window.__fixtureRerender());
    await sleep(300);
    assert.ok(run.lines.includes("[fixture] summary re-rendered"), "fixture control: the store drew its rows again");
    const all = await frames(run);
    const again = all.slice(before.length);
    assert.ok(again.length > 0 && again.every((f) => f.present > 0), "fixture control: the new row naming ZERO is on the page");
    assert.deepEqual(again.filter((f) => f.shown.length), [], "and still never displayed after the re-render");
  } finally {
    await run.close();
  }
}

test("Z6: zero's row hidden after zero: applied and after the store's re-render (1280)", { skip, timeout: 60_000 }, async () => {
  await signHidden(1280);
});

test("Z6b: the same at 390", { skip, timeout: 60_000 }, async () => {
  await signHidden(390);
});

/** Z7 over `text`: the OFFER row displayed before and after the re-render, beside zero's row hidden. */
async function otherRowShown(text) {
  const { run, verdict } = await deepRun({ zeroRow: "live", discountRow: true }, { text });
  try {
    assert.equal(verdict, DONE, JSON.stringify(ours(run.lines)));
    for (const when of ["at done", "after the re-render"]) {
      if (when !== "at done") {
        await run.page.evaluate(() => window.__fixtureRerender());
        await sleep(300);
      }
      const { discounts } = await run.page.evaluate(rowsRead);
      const offer = discounts.filter((d) => /OFFER/.test(d.text));
      assert.equal(offer.length, 1, `fixture control: the OFFER row on the page (${when})`);
      assert.equal(offer[0].shown, true, `a discount row not naming zero stays displayed (${when}): ${JSON.stringify(discounts)}`);
    }
  } finally {
    await run.close();
  }
}

test("Z7: a second discount row not naming zero displayed, before and after the re-render", { skip, timeout: 60_000 }, async () => {
  await otherRowShown(site.text);
});

test("Z7 (mutant): every discount row hidden — Z7 fails", { skip, timeout: 60_000 }, async () => {
  const mutant = mutate(site.text, "/\\bzero\\b/i.test(text(e))", "1");
  await assert.rejects(otherRowShown(mutant), (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    return true;
  });
});

test("Z8: the Total row displayed, its amount the one before the code", { skip, timeout: 60_000 }, async () => {
  const { run, verdict } = await deepRun({ zeroRow: "live", discountRow: true });
  try {
    assert.equal(verdict, DONE, JSON.stringify(ours(run.lines)));
    for (const when of ["at done", "after the re-render"]) {
      if (when !== "at done") {
        await run.page.evaluate(() => window.__fixtureRerender());
        await sleep(300);
      }
      const { total } = await run.page.evaluate(rowsRead);
      assert.deepEqual(total, { text: "Total$87.50", shown: true }, `the Total (${when})`);
    }
  } finally {
    await run.close();
  }
});

test("Z9: a coded link — zero: coded link, and a zero row the store kept stays displayed (nothing hidden)", { skip, timeout: 60_000 }, async () => {
  const { run, verdict } = await deepRun({ zeroRow: "live", zeroApplied: true }, { offer: "SAVE10" });
  try {
    assert.equal(verdict, DONE, JSON.stringify(ours(run.lines)));
    assert.ok(run.lines.includes(LINE("coded link")), JSON.stringify(ours(run.lines)));
    const { discounts } = await run.page.evaluate(rowsRead);
    assert.equal(discounts.length, 1, `fixture control: the kept row (${JSON.stringify(discounts)})`);
    assert.deepEqual(discounts, [{ text: "x Coupon ZERO -$0.00", shown: true }], "the row naming zero displayed on a coded link");
    assert.deepEqual((await frames(run)).filter((f) => f.present && !f.shown.length), [], "never hidden at any frame");
  } finally {
    await run.close();
  }
});

/** The link(s) to customer service now, and where the one is against the checkout. */
function linkRead(help) {
  const shown = (e) => e.getClientRects().length > 0;
  const links = [...document.querySelectorAll("a")].filter((a) => a.getAttribute("href") === help);
  const a = links[0];
  if (!a) return { count: 0 };
  window.scrollTo(0, document.documentElement.scrollHeight);
  const r = a.getBoundingClientRect();
  const c = document.querySelector("app-checkout");
  const cr = c.getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(a);
  const tr = range.getBoundingClientRect();
  const cs = getComputedStyle(a);
  const overlap = (b) => b.left < r.right && r.left < b.right && b.top < r.bottom && r.top < b.bottom;
  const fixed = (e) => {
    for (let x = e; x; x = x.parentElement) if (getComputedStyle(x).position === "fixed") return true;
    return false;
  };
  const controls = [...document.querySelectorAll("button,input,select,textarea,a,iframe,[role=radio]")].filter((e) => e !== a && shown(e));
  const below = [...c.querySelectorAll("*")].filter((e) => e !== a && !a.contains(e) && !e.contains(a) && shown(e) && !fixed(e) && e.getBoundingClientRect().bottom > r.top + 1);
  return {
    count: links.length,
    text: a.textContent,
    tag: a.localName,
    role: a.getAttribute("role"),
    shown: shown(a),
    inCheckout: c.contains(a),
    fontPx: parseFloat(cs.fontSize),
    color: cs.color,
    centre: Math.abs((tr.left + tr.right) / 2 - (cr.left + cr.right) / 2),
    below: below.map((e) => `${e.localName}.${e.className}`),
    over: controls.filter((e) => [...e.getClientRects()].some(overlap)).map((e) => `${e.localName}.${e.className}#${e.id}`),
  };
}

/** L1 over `text` at `width`: at step 1 and step 2, one link, at the bottom, its words and address and type, over nothing. */
async function linkCase(text, width) {
  const { run, verdict } = await deepRun({ zeroRow: "live" }, { text, width });
  try {
    assert.equal(verdict, DONE, JSON.stringify(ours(run.lines)));
    for (const step of [1, 2]) {
      if (step === 2) await press(run, "go");
      await untilStep(run, step);
      await sleep(200);
      const l = await run.page.evaluate(linkRead, HELP);
      assert.equal(l.count, 1, `one link to ${HELP} (step ${step}): ${JSON.stringify(l)}`);
      assert.equal(l.text, words.contact, "its words, data/messages.json's handoff.contact");
      assert.equal(l.tag, "a", "a link");
      assert.equal(l.role, null, "never a button");
      assert.equal(l.shown, true, "displayed");
      assert.equal(l.inCheckout, true, "inside the checkout, so it goes with it");
      assert.ok(l.fontPx >= 13 && l.fontPx <= 14, `13 to 14 px: ${l.fontPx}`);
      assert.equal(l.color, muted, "the page's --muted, never orange");
      assert.ok(l.centre <= 2, `its text centred in the checkout (${l.centre} px off)`);
      assert.deepEqual(l.below, [], `at the very bottom: nothing of the checkout below it (step ${step})`);
      assert.deepEqual(l.over, [], `over no control (step ${step}, ${width})`);
    }
  } finally {
    await run.close();
  }
}

test("L1: the link once at the very bottom of the checkout — words, address, size, colour, centred, over nothing (1280)", { skip, timeout: 60_000 }, async () => {
  await linkCase(site.text, 1280);
});

test("L1b: the same at 390 (Continue in the store's phone bar)", { skip, timeout: 60_000 }, async () => {
  await linkCase(site.text, 390);
});

test("L1 (mutant): the link added twice — L1 fails", { skip, timeout: 60_000 }, async () => {
  const mutant = mutate(site.text, "ui(function () { help(c); });", "ui(function () { help(c); help(c); });");
  await assert.rejects(linkCase(mutant, 1280), (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    return true;
  });
});

test("L2: not duplicated — one link after the store's re-render, and after Continue and Back", { skip, timeout: 60_000 }, async () => {
  const { run, verdict } = await deepRun({ zeroRow: "live" }, { width: 390 });
  try {
    assert.equal(verdict, DONE, JSON.stringify(ours(run.lines)));
    const count = () => run.page.evaluate((help) => [...document.querySelectorAll("a")].filter((a) => a.getAttribute("href") === help).length, HELP);
    assert.equal(await count(), 1, "one at done");
    await run.page.evaluate(() => window.__fixtureRerender());
    await sleep(300);
    assert.equal(await count(), 1, "one after the store's re-render");
    await press(run, "go");
    await untilStep(run, 2);
    await press(run, "back");
    await untilStep(run, 1);
    assert.equal(await count(), 1, "one after Continue and Back");
  } finally {
    await run.close();
  }
});
