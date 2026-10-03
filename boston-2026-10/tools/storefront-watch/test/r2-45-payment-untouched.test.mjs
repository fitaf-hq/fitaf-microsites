// R2-45 (SPEC-rung2-progress-and-checkout § 3 item 4, ⭐ "the payment is untouched, and it is measured", as § 10
// re-states it): on the synthetic checkout, after a deep-carted run, the displayed controls inside app-checkout are the
// same set with style#fitaf-deep as without it, EXCEPT exactly H3, H4, H6, H7, H8 and H10's: the guest sign-in banner,
// the contact section's "Sign in", the subscription offer (its switch and the sign-in link behind it), the discounts'
// gift-card and code fields and their Apply buttons in all three placements, and the tip's buttons and its field (H8's
// banner is outside app-checkout). The pay button is displayed in both, and so is the Total.
// The expected difference is the fixture's own four controls, named here, not derived from the hide list's selectors.
// The pay button is the one the store displays at each width (§ 9): .checkout__submit's at 1280, the summary's mobile
// bar's PAY NOW at 390, where .checkout__submit is not displayed.
// Also here: H1, H2 and H5 (the header, the footer and credit line, the pop-up host) hidden on the checkout.
// R2-46 (⭐ mutant, in the suite): a text whose hide rule also matches a field of .checkout__form; R2-45's check fails.
// § 25 (the three-step checkout) re-states the measure over the steps, since each step hides the others' sections by
// design: the test walks the steps as a customer (Continue; step 2's entries; Continue), and at EACH step nothing is
// displayed with the style that is not without it, the Total is displayed, and the pay button only at step 3 (§ 25.2);
// ACROSS the steps (unionMeasure, by element), the controls the store displays that no step displays are EXACTLY the
// same H3, H4, H6, H7, H10, H16 and H17 controls as before. So no control of the store's is out of the visitor's reach
// but the ones the hide list names.
// Headless Chrome against the synthetic store on 127.0.0.1; skipped without Chrome.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { startStore } from "./browser-store.mjs";
import { browserFor, DONE, displayedMap, mutate, openDeep, paymentMeasure, shipped, skip, unionMeasure, walkTo } from "./r2-browser.mjs";

/** The fixture's H3, H4, H6, H7, H10, H16 and H17 controls, as paymentMeasure describes them. */
const H346 = [
  'a.checkout__guest-signin-banner "Already have an account? Sign in for fas"',
  'a.contact__sign-in "Sign in"',
  'a.summary__plan-auth-prompt-link "Sign in"',
  // § 21 (H16, H17): the plan group's header (its "Remove plan" button) and its return link.
  'button "Remove plan"',
  'a.summary__plan-return "← Return to Lean Plan 7 Meals"',
  'button.summary__subscription-toggle "Switch to subscription"',
  ...["section", "payment", "summary"].flatMap((where) => [
    `input[name=giftCard-${where}] "Gift card"`,
    `input[name=coupon-${where}] "Discount code"`,
    'button.discount__apply "Apply"',
    'button.discount__apply "Apply"',
  ]),
  'button.tip__option "10%"',
  'button.tip__option "15%"',
  'input[name=tip] "Custom tip"',
].sort();
const SHELL = [".sticky-header", ".footer", ".app-hmp-credit", "app-storefront-popup-host"];
/** The pay button displayed at each width (§ 9). */
const PAY_SHOWN = { 1280: ['button.checkout__pay "Place order"'], 390: ['button.checkout__pay-mobile "PAY NOW"'] };
/** R2-46's rule: the contact section's "Sign in" rule broadened to take the email field with it. */
const H4 = "a.contact__sign-in";

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

/** R2-45's check over one run of `text`: throws (an AssertionError) if the payment is not untouched. */
async function paymentCase(text, width = 1280) {
  store.set({});
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text, width });
  try {
    assert.equal(await run.verdict(), DONE, "fill B reached /checkout");
    await run.until(paymentMeasure, undefined, 10_000);
    let u;
    for (const step of [1, 2, 3]) {
      await walkTo(run, step);
      const m = await run.page.evaluate(paymentMeasure);
      assert.equal(m.checkout, true, "app-checkout on the page");
      assert.equal(m.style, true, "style#fitaf-deep on the page");
      assert.deepEqual(m.added, [], `step ${step}: the style shows nothing that was not shown`);
      const total = await run.page.evaluate(() => [...document.querySelectorAll(".summary__total")].map((el) => el.getClientRects().length > 0));
      assert.deepEqual(total, [true], `step ${step}: the Total displayed`);
      assert.ok(m.payWithout, `step ${step}: fixture control: the store displays its pay button without our style`);
      if (step === 3) assert.deepEqual(m.payShown, PAY_SHOWN[width], `step 3: the pay button the store shows at ${width} px`);
      else assert.equal(m.payWith, false, `step ${step}: the pay button not displayed before step 3`);
      assert.equal(m.restored, true, "the page is left as it was read");
      assert.ok(m.counts.without > 15, `fixture control: the form's fields were measured (${m.counts.without})`);
      u = await run.page.evaluate(unionMeasure, { reset: step === 1 });
    }
    assert.deepEqual(u.never, H346, "across the three steps, the style hides exactly H3, H4, H6, H7, H10, H16 and H17's controls");
    return { run, u };
  } finally {
    await run.close();
  }
}

test("R2-45: the displayed controls in app-checkout, with the style and without: equal except exactly H3, H4 and H6", { skip, timeout: 60_000 }, async () => {
  for (const width of [1280, 390]) await paymentCase(site.text, width);
});

test("R2-45b: on the deep-carted checkout H1, H2 and H5 are hidden too; the order recap and the form are displayed (§ 25: the recap at every step, the form from step 2, its pay button at step 3)", { skip, timeout: 60_000 }, async () => {
  store.set({});
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text: site.text });
  try {
    assert.equal(await run.verdict(), DONE);
    await run.until(() => document.querySelector("app-checkout .summary__items .item"));
    for (const step of [1, 2, 3]) {
      await walkTo(run, step);
      const shown = await run.page.evaluate(displayedMap, [...SHELL, ".checkout__summary", ".checkout__form", ".checkout__submit button"]);
      for (const sel of SHELL) assert.equal(shown[sel], false, `step ${step}: ${sel} hidden`);
      assert.equal(shown[".checkout__summary"], true, `step ${step}: .checkout__summary displayed`);
      assert.equal(shown[".checkout__form"], step > 1, `step ${step}: .checkout__form ${step > 1 ? "displayed" : "hidden (step 1)"}`);
      assert.equal(shown[".checkout__submit button"], step === 3, `step ${step}: .checkout__submit button ${step === 3 ? "displayed" : "hidden"}`);
    }
    const bare = await run.page.evaluate((sels) => {
      document.getElementById("fitaf-deep").disabled = true;
      return sels.map((s) => document.querySelector(s).getClientRects().length > 0);
    }, SHELL);
    assert.deepEqual(bare, SHELL.map(() => true), "fixture control: each is displayed without the style");
  } finally {
    await run.close();
  }
});

test("R2-46 (mutant): a hide rule that also matches a field of .checkout__form — R2-45 fails", { skip, timeout: 60_000 }, async () => {
  const mutant = mutate(site.text, H4, `${H4},.checkout__form input[type=email]`);
  await assert.rejects(paymentCase(mutant), (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    assert.match(err.message, /hides exactly H3, H4, H6, H7, H10, H16 and H17|email/i, err.message);
    return true;
  });
});
