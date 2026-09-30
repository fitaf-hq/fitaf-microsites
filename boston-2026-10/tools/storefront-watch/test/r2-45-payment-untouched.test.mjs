// R2-45 (SPEC-rung2-progress-and-checkout § 3 item 4, ⭐ "the payment is untouched, and it is measured"): on the
// synthetic checkout, after a deep-carted run, the displayed controls inside app-checkout are the same set with
// style#fitaf-deep as without it, EXCEPT exactly H3, H4 and H6: the guest sign-in banner, the contact section's
// "Sign in", and the subscription offer (its switch and the sign-in link behind it). The pay button is displayed in both.
// The expected difference is the fixture's own four controls, named here, not derived from the hide list's selectors.
// Also here: H1, H2 and H5 (the header, the footer and credit line, the pop-up host) hidden on the checkout.
// R2-46 (⭐ mutant, in the suite): a text whose hide rule also matches a field of .checkout__form; R2-45's check fails.
// Headless Chrome against the synthetic store on 127.0.0.1; skipped without Chrome.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { startStore } from "./browser-store.mjs";
import { browserFor, DONE, displayedMap, mutate, openDeep, paymentMeasure, shipped, skip } from "./r2-browser.mjs";

/** The fixture's H3, H4 and H6 controls, as paymentMeasure describes them. */
const H346 = [
  'a.checkout__guest-signin-banner "Already have an account? Sign in for fas"',
  'a.contact__sign-in "Sign in"',
  'a.summary__plan-auth-prompt-link "Sign in"',
  'button.summary__subscription-toggle "Switch to subscription"',
].sort();
const SHELL = [".sticky-header", ".footer", ".app-hmp-credit", "app-storefront-popup-host"];
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
    const m = await run.until(paymentMeasure, undefined, 10_000);
    assert.equal(m.checkout, true, "app-checkout on the page");
    assert.equal(m.style, true, "style#fitaf-deep on the page");
    assert.deepEqual(m.added, [], "the style shows nothing that was not shown");
    assert.deepEqual(m.hidden, H346, "the style hides exactly H3, H4 and H6's controls");
    assert.ok(m.payWith && m.payWithout, "the pay button displayed with the style and without it");
    assert.equal(m.restored, true, "the page is left as it was read");
    assert.ok(m.counts.without > 15, `fixture control: the form's fields were measured (${m.counts.without})`);
    return { run, m };
  } finally {
    await run.close();
  }
}

test("R2-45: the displayed controls in app-checkout, with the style and without: equal except exactly H3, H4 and H6", { skip, timeout: 60_000 }, async () => {
  for (const width of [1280, 390]) await paymentCase(site.text, width);
});

test("R2-45b: on the deep-carted checkout H1, H2 and H5 are hidden too; the order recap and the form are displayed", { skip, timeout: 60_000 }, async () => {
  store.set({});
  const run = await openDeep(browser.browser, { origin: store.origin, code: site.code, text: site.text });
  try {
    assert.equal(await run.verdict(), DONE);
    await run.until(() => document.querySelector("app-checkout .summary__items .item"));
    const shown = await run.page.evaluate(displayedMap, [...SHELL, ".checkout__summary", ".checkout__form", ".checkout__submit button"]);
    for (const sel of SHELL) assert.equal(shown[sel], false, `${sel} hidden`);
    for (const sel of [".checkout__summary", ".checkout__form", ".checkout__submit button"]) assert.equal(shown[sel], true, `${sel} displayed`);
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
    assert.match(err.message, /hides exactly H3, H4 and H6|email/i, err.message);
    return true;
  });
});
