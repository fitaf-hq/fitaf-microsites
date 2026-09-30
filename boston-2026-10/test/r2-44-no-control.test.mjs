// R2-44 (SPEC-rung2-progress-and-checkout § 2 items 3 and 5): the screen holds no control and nothing focusable (no
// button, link, input, tabindex, editable, or element with a role but the step line's `status`), read at every press;
// and fill B's own scan of the displayed controls outside the meal cards (SPEC-rung2 § 10) finds exactly what it finds
// without the screen. It changes nothing of the store's: no class on <body>, no style attribute on any element but its
// own. The scan is compared by identity while the screen is up and fill B is still waiting for the cards (the store has
// not rendered them yet), the one moment when the screen is the only thing that changed.
import test from "node:test";
import assert from "node:assert/strict";
import { CHECKOUT_PAYLOAD, fakeWindow, fragmentFor, orderPage, run, script } from "./r2-harness.mjs";
import { displayedButtonsOutsideCards, focusableIn, screenOf } from "./r2-screen.mjs";

test("R2-44: nothing on the screen to act on or focus; § 10's scan finds the same controls with the screen as without", async () => {
  const page = await orderPage({ store: { pending: [] } });
  const doc = page.document;
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page });
  page.hide(); // the cards are not rendered yet: fill B polls and waits
  const without = displayedButtonsOutsideCards(doc);
  const bodyClass = doc.body.getAttribute("class");
  const styled = [...doc.querySelectorAll("[style]")];
  run(await script(), h.window);
  const screen = screenOf(doc);
  assert.ok(screen, "the screen is up while fill B waits");
  assert.equal(page.all.length, 0, "fixture control: nothing pressed yet");
  assert.deepEqual(displayedButtonsOutsideCards(doc), without, "the same controls, the same elements, with the screen on");
  assert.deepEqual(focusableIn(screen), [], "no control, nothing focusable, before the first press");

  const seen = [];
  doc.addEventListener("click", () => {
    const s = screenOf(doc);
    seen.push(s ? focusableIn(s).map((el) => el.outerHTML.slice(0, 80)) : null);
  });
  page.show();
  h.timers.drain();
  assert.equal(seen.length, 8, "fixture control: 7 meals and CHECKOUT pressed");
  for (const s of seen) assert.deepEqual(s, [], "at each press: the screen up, no control, nothing focusable");
  assert.equal(doc.body.getAttribute("class"), bodyClass, "no class on <body>");
  const nowStyled = [...doc.querySelectorAll("[style]")].filter((el) => !styled.includes(el) && !el.closest("#fitaf-screen"));
  assert.deepEqual(nowStyled.map((el) => el.outerHTML.slice(0, 80)), [], "no style attribute on any element of the store's");
});
