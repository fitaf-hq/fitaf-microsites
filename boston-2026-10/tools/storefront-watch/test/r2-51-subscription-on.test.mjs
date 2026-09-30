// R2-51 (SPEC-rung2-progress-and-checkout § 3 item 3, ⭐ "the style may hide an offer; it never hides a commitment"):
// the synthetic checkout with a plan's subscription switch ACTIVE. H6 hides nothing: the switch and its controls, the
// renewal line, the delivery frequency and the note are displayed. ⭐ Mutant (in the suite): H6 without its
// `:not(:has(…--active))` hides the active switch, and R2-51 fails.
// R2-51b (found at the build, not ruled): a plan that REQUIRES a subscription. The store's own template renders no
// switch for one (its label reads "Subscription required"), so the contract's H6 as written, which hides the controls
// whenever no ACTIVE switch is inside them, would hide that label. The build's H6 also requires a switch to be there
// (`:has(.summary__subscription-toggle)`): an offer is a switch that is off. The mutant is the contract's H6 as written.
// R2-51c: the offer while it is off (the default fixture) IS hidden: the rule is not simply off.
// Headless Chrome against the synthetic store on 127.0.0.1; skipped without Chrome.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { startStore } from "./browser-store.mjs";
import { browserFor, DONE, displayedMap, mutate, openDeep, shipped, skip } from "./r2-browser.mjs";

const CONTROLS = ".summary__plan-subscription-controls";
const TOGGLE = ".summary__subscription-toggle";
const ACTIVE = ".summary__subscription-toggle--active";
const COMMITMENT = [".summary__plan-group-renew", ".summary__cart-frequency", ".summary__subscription-note"];
/** H6 as the build ships it, and the two mutants. */
const H6 = `${CONTROLS}:has(${TOGGLE}):not(:has(${ACTIVE}))`;
const WITHOUT_NOT = `${CONTROLS}:has(${TOGGLE})`;
const AS_WRITTEN = `${CONTROLS}:not(:has(${ACTIVE}))`;

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

/** Run `text` on a checkout whose subscription is `subscription`; what is displayed of `selectors`, with the style. */
async function shownOn(text, subscription, selectors) {
  store.set({ subscription });
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text });
  try {
    assert.equal(await run.verdict(), DONE);
    await run.until(() => document.querySelector("app-checkout .summary__items .item"));
    const style = await run.page.evaluate(() => Boolean(document.getElementById("fitaf-deep")) && document.documentElement.classList.contains("fitaf-deep"));
    assert.equal(style, true, "the deep-carted checkout: the mark and the style are set");
    return await run.page.evaluate(displayedMap, selectors);
  } finally {
    await run.close();
  }
}

/** R2-51's check over `text`: throws (an AssertionError) if anything of an active subscription is hidden. */
async function activeCase(text) {
  const shown = await shownOn(text, "active", [CONTROLS, ACTIVE, ...COMMITMENT]);
  for (const [sel, displayed] of Object.entries(shown)) assert.equal(displayed, true, `${sel} displayed`);
}

/** R2-51b's check over `text`, for a plan that requires a subscription. */
async function forcedCase(text) {
  const shown = await shownOn(text, "forced", [CONTROLS, ...COMMITMENT]);
  for (const [sel, displayed] of Object.entries(shown)) assert.equal(displayed, true, `${sel} displayed`);
}

const failsWithAssertion = (err) => {
  assert.ok(err instanceof assert.AssertionError, String(err));
  return true;
};

test("R2-51: a plan's switch ACTIVE — H6 hides nothing: the switch, the renewal and frequency lines, the note", { skip, timeout: 60_000 }, async () => {
  await activeCase(site.text);
});

test("R2-51 (mutant): H6 without its :not(:has(…--active)) — R2-51 fails", { skip, timeout: 60_000 }, async () => {
  await assert.rejects(activeCase(mutate(site.text, H6, WITHOUT_NOT)), failsWithAssertion);
});

test("R2-51b: a plan that requires a subscription (no switch; \"Subscription required\") — nothing of it hidden", { skip, timeout: 60_000 }, async () => {
  await forcedCase(site.text);
});

test("R2-51b (mutant): the contract's H6 as written hides \"Subscription required\" — R2-51b fails", { skip, timeout: 60_000 }, async () => {
  await assert.rejects(forcedCase(mutate(site.text, H6, AS_WRITTEN)), failsWithAssertion);
});

test("R2-51c: the offer while it is off is hidden (the switch, and the sign-in prompt behind it)", { skip, timeout: 60_000 }, async () => {
  const shown = await shownOn(site.text, "off", [CONTROLS, TOGGLE, ".summary__plan-auth-prompt-link"]);
  assert.deepEqual(Object.values(shown), [false, false, false]);
});
