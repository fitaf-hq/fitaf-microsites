// R2-56 (SPEC-rung2-progress-and-checkout § 10 item 5, H10): the tip (section.checkout__section.tip, and a bare
// app-tip-selector where the store places one) is hidden ONLY while no tip is chosen: once one is, the store shows
// .tip-selector__remove-btn, and the tip stays displayed: the style may hide an offer, never a charge. ⭐ Mutant (in
// the suite): H10 without its guard; R2-56 fails.
// Headless Chrome against the synthetic store on 127.0.0.1; skipped without Chrome.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { startStore } from "./browser-store.mjs";
import { browserFor, DONE, displayedCounts, mutate, openDeep, shipped, skip } from "./r2-browser.mjs";

/** H10 as the build ships it. */
const H10 = ":is(section.checkout__section.tip,app-tip-selector):not(:has(.tip-selector__remove-btn))";
const TIP = ["section.checkout__section.tip", "app-tip-selector", ".tip-selector__remove-btn", ".tip__option"];

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

async function tipOn(text, cfg) {
  store.set(cfg);
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text });
  try {
    assert.equal(await run.verdict(), DONE);
    await run.until(() => document.querySelector("app-checkout .summary__items .item"));
    return await run.page.evaluate(displayedCounts, TIP);
  } finally {
    await run.close();
  }
}

/** R2-56's check over `text`: throws (an AssertionError) unless a chosen tip stays displayed. */
async function chosenCase(text) {
  assert.deepEqual(await tipOn(text, { tipChosen: true }), {
    "section.checkout__section.tip": { found: 1, displayed: 1 },
    "app-tip-selector": { found: 1, displayed: 1 },
    ".tip-selector__remove-btn": { found: 1, displayed: 1 },
    ".tip__option": { found: 2, displayed: 2 },
  });
}

test("R2-56: a tip chosen (the remove button shown) — the tip section displayed", { skip, timeout: 60_000 }, async () => {
  await chosenCase(site.text);
});

test("R2-56b: no tip chosen — the section hidden; a bare app-tip-selector hidden too", { skip, timeout: 60_000 }, async () => {
  assert.deepEqual(await tipOn(site.text, {}), {
    "section.checkout__section.tip": { found: 1, displayed: 0 },
    "app-tip-selector": { found: 1, displayed: 0 },
    ".tip-selector__remove-btn": { found: 0, displayed: 0 },
    ".tip__option": { found: 2, displayed: 0 },
  });
  const bare = await tipOn(site.text, { tip: "bare" });
  assert.deepEqual(bare["app-tip-selector"], { found: 1, displayed: 0 });
  assert.deepEqual(bare["section.checkout__section.tip"], { found: 0, displayed: 0 });
});

test("R2-56 (mutant): H10 without its guard — R2-56 fails", { skip, timeout: 60_000 }, async () => {
  const mutant = mutate(site.text, H10, ":is(section.checkout__section.tip,app-tip-selector)");
  await assert.rejects(chosenCase(mutant), (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    return true;
  });
});
