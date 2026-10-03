// R2-83 – R2-90 (SPEC-rung2-progress-and-checkout § 25.5, the three-step checkout), in headless Chrome on the synthetic
// store (browser-store.mjs: the live markup, with Angular's own form state on the step-2 controls), after a deep-carted
// run of the SHIPPED text, at 1280 and 390 px; skipped without Chrome. The test acts as the customer: it presses the
// block's own buttons with a trusted click where they are drawn, and types step 2's entries into the store's fields.
//   R2-83 the steps only on a deep-carted checkout: html.fitaf-step-1 at done, the bar (the three names, numbered),
//         Continue; an ordinary visit to /checkout and a reload of the deep-carted one: no bar, no buttons, no step
//         class, the store's checkout whole (its form and its pay button displayed).
//   R2-84 exactly one step's sections displayed, at each step (§ 25.2's table); the bar's current step and the
//         buttons' words follow the step (Back from step 2; no Continue at step 3).
//   R2-85 ⭐ the order's Total displayed in all three steps; in steps 2 and 3 the lines hidden and the one-line recap
//         ("7 meals ·" before the store's own Total). Mutant (R2-85b): a style that hides the Total in step 2 fails it.
//   R2-86 the pay button displayed only at step 3: at 1280 the form's (.checkout__submit); at 390 the phone bar's PAY
//         NOW hidden in steps 1 and 2 with the block's Continue in its place (its next sibling, displayed), and back
//         at step 3.
//   R2-87 ⭐ Continue refused while a step-2 control is ng-invalid, that control focused (the first, in the page's
//         order), the store's own state unchanged; with every entry valid, step 3. Mutant (R2-87b): a Continue that
//         ignores ng-invalid fails it.
//   R2-88 an error in a hidden step shows its step: at step 3 the customer presses the store's pay button and the
//         store refuses the address 300 ms later (ng-invalid ng-touched, its message): the block shows step 2 with the
//         address focused.
//   R2-89 Back keeps every entry: step 2's fields and selection, step 3's special requests, across Back and Continue.
//   R2-90 no store control pressed by the block: through a whole walk (a refusal included), every click on the page
//         is a trusted one on a button of ours; no submit; no order placed.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { poll } from "../lib/browser.mjs";
import { VIEWPORTS } from "../lib/config.mjs";
import { MEALS, startStore } from "./browser-store.mjs";
import {
  browserFor,
  displayedCounts,
  DONE,
  ENTRIES,
  fillStep2,
  mutate,
  openDeep,
  press,
  SECTIONS,
  shipped,
  skip,
  STEP2,
  STEP_IDS,
  stepRead,
  untilStep,
  walkTo,
} from "./r2-browser.mjs";

const WIDTHS = [1280, 390];
/** data/messages.json's `handoff` words, as the site's own build reads them (siteCode's messages). */
let WORDS;
const PAY = { 1280: ".checkout__submit button", 390: ".summary__pay-button button" };

let store;
let browser;
let site;
before(async () => {
  if (skip) return;
  store = await startStore();
  browser = await browserFor();
  site = await shipped();
  const { readFile } = await import("node:fs/promises");
  WORDS = JSON.parse(await readFile(new URL("../../../data/messages.json", import.meta.url), "utf8")).handoff;
});
after(async () => {
  await browser?.close();
  await store?.close();
});

/** A deep-carted run of `text` on the synthetic store (the store's line markup); `fn(run)` reads it at step 1. */
async function deep(width, fn, { cfg = {}, text = site.text } = {}) {
  store.set({ storeLines: true, ...cfg });
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text, width });
  try {
    assert.equal(await run.verdict(), DONE, "fill C reached /checkout");
    await run.until(() => document.querySelector("app-checkout .summary__item") && document.getElementById("fitaf-deep"));
    return await fn(run);
  } finally {
    await run.close();
  }
}

/** What the bar reads: the three names, numbered, in data/messages.json's own words and separator. */
const barText = () => WORDS.steps.split(" · ").map((name, k) => `${k + 1} ${name}`).join(" · ");
const names = () => WORDS.steps.split(" · ");

/** In the page: each of `sels`, found and displayed (the Total's ::before content too). */
function sectionsAt(sels) {
  const out = {};
  for (const sel of sels) {
    const all = [...document.querySelectorAll(sel)];
    out[sel] = { found: all.length, displayed: all.filter((el) => el.getClientRects().length > 0).length };
  }
  const total = document.querySelector(".summary__total");
  out.recap = total ? getComputedStyle(total, "::before").content : null;
  out.totalText = total ? total.textContent.replace(/\s+/g, " ").trim() : null;
  return out;
}

/** § 25.2's table: what each step shows (`on`) and hides (`off`) of SECTIONS, on the synthetic checkout. */
const TABLE = {
  1: { on: [".summary__item"], off: [...STEP2, "section.payment", ".checkout__consent", "textarea[name=specialRequests]", "section.checkout__section.tip"] },
  2: { on: STEP2, off: [".summary__item", "section.payment", ".checkout__consent", "textarea[name=specialRequests]", "section.checkout__section.tip"] },
  3: { on: ["section.payment", ".checkout__consent", "textarea[name=specialRequests]"], off: [".summary__item", ...STEP2] },
};

// ── R2-83 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

test("R2-83: the steps only on a deep-carted checkout — step 1 at done with the bar and Continue; an ordinary visit and a reload unchanged (both widths)", { skip, timeout: 120_000 }, async () => {
  for (const width of WIDTHS) {
    await deep(width, async (run) => {
      const r = await untilStep(run, 1);
      assert.equal(r.bar, barText(), `${width}: the bar, the three names numbered`);
      assert.equal(r.barShown, true, `${width}: the bar displayed`);
      assert.equal(r.current, `1 ${names()[0]}`, `${width}: the current step`);
      assert.deepEqual(r.go, { text: WORDS.to_delivery, shown: true, inBar: width === 390 }, `${width}: Continue`);
      assert.equal(r.back?.shown, false, `${width}: no Back at step 1`);
      // A reload of the deep-carted /checkout: never storage, so the store's checkout whole.
      await run.page.reload({ waitUntil: "load" });
      await poll(run.page, () => document.querySelectorAll("app-checkout .checkout__form").length, null, (n) => n > 0, { timeoutMs: 15_000 });
      const again = await run.page.evaluate(stepRead, STEP_IDS);
      assert.deepEqual([again.classes, again.bar, again.nav, again.go, again.back], [[], null, false, null, null], `${width}: a reload — nothing of ours`);
      // (The synthetic store keeps its plan in the page, so a reload shows its checkout with an empty cart: no lines.)
      const counts = await run.page.evaluate(displayedCounts, [".checkout__form", PAY[width], ...STEP2]);
      for (const [sel, c] of Object.entries(counts)) assert.ok(c.found > 0 && c.displayed === c.found, `${width}: after a reload ${sel} displayed: ${JSON.stringify(c)}`);
    });
    store.set({ storeLines: true, checkoutNames: MEALS.slice(0, 7) });
    const context = await browser.browser.createBrowserContext();
    try {
      const page = await context.newPage();
      await page.setViewport(VIEWPORTS[width]);
      await page.goto(`${store.origin}/checkout`, { waitUntil: "load" });
      await poll(page, () => document.querySelectorAll("app-checkout .summary__item").length, null, (n) => n > 0, { timeoutMs: 15_000 });
      const r = await page.evaluate(stepRead, STEP_IDS);
      assert.deepEqual([r.classes, r.bar, r.nav, r.go, r.back], [[], null, false, null, null], `${width}: an ordinary visit — nothing of ours`);
      const counts = await page.evaluate(displayedCounts, [".checkout__form", PAY[width], ...STEP2, ".summary__item"]);
      for (const [sel, c] of Object.entries(counts)) assert.ok(c.found > 0 && c.displayed === c.found, `${width}: an ordinary visit, ${sel} displayed: ${JSON.stringify(c)}`);
    } finally {
      await context.close();
    }
  }
});

// ── R2-84 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

test("R2-84: exactly one step's sections displayed at each step; the bar and the buttons follow the step (both widths)", { skip, timeout: 120_000 }, async () => {
  for (const width of WIDTHS) {
    await deep(width, async (run) => {
      for (const step of [1, 2, 3]) {
        await walkTo(run, step);
        const s = await run.page.evaluate(sectionsAt, SECTIONS);
        for (const sel of TABLE[step].on) assert.ok(s[sel].found > 0 && s[sel].displayed > 0, `${width}, step ${step}: ${sel} displayed: ${JSON.stringify(s[sel])}`);
        for (const sel of TABLE[step].off) assert.equal(s[sel].displayed, 0, `${width}, step ${step}: ${sel} hidden: ${JSON.stringify(s[sel])}`);
        const r = await run.page.evaluate(stepRead, STEP_IDS);
        assert.equal(r.current, `${step} ${names()[step - 1]}`, `${width}, step ${step}: the bar's current step`);
        assert.equal(r.back.shown, step > 1, `${width}, step ${step}: Back ${step > 1 ? "displayed" : "not displayed"}`);
        assert.equal(r.back.text, WORDS.back);
        assert.equal(r.go.shown, step < 3, `${width}, step ${step}: Continue ${step < 3 ? "displayed" : "gone"}`);
        if (step < 3) assert.equal(r.go.text, step === 1 ? WORDS.to_delivery : WORDS.to_payment, `${width}, step ${step}: Continue's words`);
        // Back to step 1 for the next walk.
        while ((await run.page.evaluate(stepRead, STEP_IDS)).classes[0] > 1) {
          const now = (await run.page.evaluate(stepRead, STEP_IDS)).classes[0];
          await press(run, "back");
          await untilStep(run, now - 1);
        }
      }
    });
  }
});

// ── R2-85 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** R2-85's check over a run of `text` at `width`: throws (an AssertionError) unless the Total is displayed at every step. */
async function totalCase(text, width) {
  return deep(width, async (run) => {
    for (const step of [1, 2, 3]) {
      if (step > 1) {
        if (step === 3) await fillStep2(run);
        await press(run, "go");
        await untilStep(run, step);
      }
      const s = await run.page.evaluate(sectionsAt, [".summary__total", ".summary__item"]);
      assert.deepEqual(s[".summary__total"], { found: 1, displayed: 1 }, `${width}, step ${step}: the Total displayed`);
      if (step === 1) {
        assert.equal(s.recap, "none", `${width}, step 1: no recap (the lines are there)`);
        assert.ok(s[".summary__item"].displayed === 7, `${width}, step 1: the seven lines`);
      } else {
        assert.equal(s.recap, JSON.stringify(WORDS.recap.replace("{n}", "7")), `${width}, step ${step}: the recap before the Total`);
        assert.equal(s[".summary__item"].displayed, 0, `${width}, step ${step}: the lines hidden`);
      }
      assert.match(s.totalText, /\$87\.50/, `${width}, step ${step}: the store's own Total`);
    }
  }, { text });
}

test("R2-85: the order's Total displayed at every step; steps 2 and 3 show the one-line recap with the lines hidden (both widths)", { skip, timeout: 120_000 }, async () => {
  for (const width of WIDTHS) await totalCase(site.text, width);
});

test("R2-85b (⭐ mutant): a style that hides the Total in step 2 — R2-85 fails", { skip, timeout: 60_000 }, async () => {
  const mutant = mutate(site.text, ".fitaf-step-1:has(#fitaf-nav) .checkout__form", ".fitaf-step-2 .summary__total,.fitaf-step-1:has(#fitaf-nav) .checkout__form");
  await totalCase(site.text, 390); // control: the shipped text passes
  await assert.rejects(totalCase(mutant, 390), (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    assert.match(err.message, /step 2: the Total displayed/, err.message);
    return true;
  });
});

// ── R2-86 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

test("R2-86: the pay button displayed only at step 3; on a phone the block's Continue stands in PAY NOW's place in steps 1 and 2 (both widths)", { skip, timeout: 120_000 }, async () => {
  for (const width of WIDTHS) {
    await deep(width, async (run) => {
      for (const step of [1, 2, 3]) {
        if (step > 1) {
          if (step === 3) await fillStep2(run);
          await press(run, "go");
          await untilStep(run, step);
        }
        const pay = await run.page.evaluate(displayedCounts, [PAY[width]]);
        assert.deepEqual(pay[PAY[width]], { found: 1, displayed: step === 3 ? 1 : 0 }, `${width}, step ${step}: the pay button ${step === 3 ? "displayed" : "hidden"}`);
        const r = await run.page.evaluate(stepRead, STEP_IDS);
        if (width === 390 && step < 3) assert.deepEqual([r.go.shown, r.go.inBar], [true, true], `390, step ${step}: Continue in PAY NOW's place`);
        if (step === 3) assert.equal(r.go.shown, false, `${width}, step 3: no Continue`);
      }
      const bare = await run.page.evaluate((sel) => {
        document.getElementById("fitaf-deep").disabled = true;
        const out = document.querySelector(sel).getClientRects().length > 0;
        document.getElementById("fitaf-deep").disabled = false;
        return out;
      }, PAY[width]);
      assert.equal(bare, true, `${width}: fixture control: the pay button is the store's displayed one`);
    });
  }
});

// ── R2-87 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** R2-87's check over a run of `text` at `width`: throws (an AssertionError) unless Continue waits for a valid step 2. */
async function validityCase(text, width) {
  return deep(width, async (run) => {
    await walkTo(run, 2);
    const invalid = await run.page.evaluate(() => [...document.querySelectorAll("app-checkout [formcontrolname].ng-invalid")].map((c) => c.getAttribute("name")));
    assert.deepEqual(invalid, ENTRIES.map(([n]) => n), "fixture control: step 2's required controls are ng-invalid, empty");
    await press(run, "go");
    await new Promise((r) => setTimeout(r, 300));
    let r = await run.page.evaluate(stepRead, STEP_IDS);
    assert.deepEqual(r.classes, [2], `${width}: Continue refused, step 2 kept`);
    assert.deepEqual(r.focused, { name: "email", invalid: true }, `${width}: the first invalid control focused`);
    // The first entry valid: Continue still refused, and the next invalid control focused.
    await fillStep2(run, ENTRIES.slice(0, 1));
    await press(run, "go");
    await new Promise((res) => setTimeout(res, 300));
    r = await run.page.evaluate(stepRead, STEP_IDS);
    assert.deepEqual([r.classes, r.focused], [[2], { name: "phone", invalid: true }], `${width}: refused again, the next invalid control focused`);
    await fillStep2(run, ENTRIES.slice(1));
    await press(run, "go");
    await untilStep(run, 3);
  }, { text });
}

test("R2-87: Continue refused while a step-2 control is ng-invalid, that control focused; every entry valid, step 3 (both widths)", { skip, timeout: 120_000 }, async () => {
  for (const width of WIDTHS) await validityCase(site.text, width);
});

test("R2-87b (⭐ mutant): a Continue that ignores ng-invalid — R2-87 fails", { skip, timeout: 60_000 }, async () => {
  const mutant = mutate(site.text, '" .ng-invalid"', '" .ng-never"');
  await assert.rejects(validityCase(mutant, 1280), (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    assert.match(err.message, /Continue refused, step 2 kept/, err.message);
    return true;
  });
});

// ── R2-88 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

test("R2-88: after a pay press the store refuses a step-2 entry (ng-invalid ng-touched): the block shows step 2, that control focused (both widths)", { skip, timeout: 120_000 }, async () => {
  for (const width of WIDTHS) {
    await deep(width, async (run) => {
      await walkTo(run, 3);
      await run.page.click(PAY[width]);
      const r = await untilStep(run, 2);
      assert.deepEqual(r.focused, { name: "address", invalid: true }, `${width}: the refused control focused`);
      assert.ok(run.lines.includes("[fixture] pay pressed: the store refused address"), `${width}: fixture control: the store refused it: ${run.lines.join(" | ")}`);
      const msg = await run.page.evaluate(() => {
        const m = document.querySelector("section.delivery .field-error");
        return m ? [m.textContent, m.getClientRects().length > 0] : null;
      });
      assert.deepEqual(msg, ["We don't deliver to this address", true], `${width}: the store's own message displayed`);
    }, { cfg: { payError: "address" } });
  }
});

// ── R2-89 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** In the page: the values of step 2's fields and selection, and step 3's special requests. */
function entriesNow() {
  const v = (name) => document.querySelector(`app-checkout [name=${name}]`)?.value ?? null;
  return Object.fromEntries(["email", "phone", "firstName", "lastName", "address", "date", "specialRequests"].map((n) => [n, v(n)]));
}

test("R2-89: Back keeps every entry — step 2's fields and selection, step 3's special requests (both widths)", { skip, timeout: 120_000 }, async () => {
  for (const width of WIDTHS) {
    await deep(width, async (run) => {
      await walkTo(run, 2);
      await fillStep2(run);
      await run.page.select("app-checkout select[name=date]", "Wednesday");
      await press(run, "go");
      await untilStep(run, 3);
      await run.page.type("app-checkout textarea[name=specialRequests]", "Leave at the door");
      const expected = { ...Object.fromEntries(ENTRIES), date: "Wednesday", specialRequests: "Leave at the door" };
      assert.deepEqual(await run.page.evaluate(entriesNow), expected, `${width}: fixture control: the entries made`);
      for (const [which, step] of [["back", 2], ["back", 1], ["go", 2], ["go", 3]]) {
        await press(run, which);
        await untilStep(run, step);
        assert.deepEqual(await run.page.evaluate(entriesNow), expected, `${width}: every entry kept at step ${step}`);
      }
    });
  }
});

// ── R2-90 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

test("R2-90: no store control pressed by the block — every click a trusted one on a button of ours, no submit, no order (both widths)", { skip, timeout: 120_000 }, async () => {
  for (const width of WIDTHS) {
    await deep(width, async (run) => {
      await run.page.evaluate((ids) => {
        window.__clicks = [];
        const ours = Object.values(ids).map((id) => `#${id}`).join(",");
        document.addEventListener("click", (e) => window.__clicks.push({ trusted: e.isTrusted, ours: Boolean(e.target.closest(ours)), tag: e.target.localName }), true);
        document.addEventListener("submit", () => window.__clicks.push({ submit: true }), true);
      }, STEP_IDS);
      await walkTo(run, 2);
      await press(run, "go"); // refused: the form is empty
      await fillStep2(run);
      await press(run, "go");
      await untilStep(run, 3);
      await press(run, "back");
      await untilStep(run, 2);
      await press(run, "back");
      await untilStep(run, 1);
      const clicks = await run.page.evaluate(() => window.__clicks);
      assert.equal(clicks.length, 5, `${width}: fixture control: the five presses seen: ${JSON.stringify(clicks)}`);
      assert.deepEqual(clicks.filter((c) => !(c.trusted && c.ours)), [], `${width}: every click a person's, on a button of ours`);
      assert.deepEqual(run.lines.filter((l) => l.startsWith("[fixture] ORDER") || l.startsWith("[fixture] pay")), [], `${width}: no pay button pressed, no order`);
    });
  }
});
