// W18 (SPEC-rung2-progress-and-checkout § 19 item 5, live, each width): on the deep-carted checkout, the order lines'
// price, portion, quantity and remove (H11–H14) and the plan's total row (H15) hidden, and the lines' height measured.
// The hide targets are lib/faces.mjs's HIDE, judged as W14's are (a target found and still displayed with the style
// fails the width; one absent is reported, conditional); the height is a report line: the lines read, the height from
// the first line's top to the last's bottom, and what fourteen would take at that pitch against the 844 px of a phone.
// W18a: the rule and the line on recorded outcomes, no browser. (R2-78–R2-80 run the style in Chrome.)
import test from "node:test";
import assert from "node:assert/strict";
import * as faces from "../lib/faces.mjs";

const H19 = ["H11", "H12", "H13", "H14", "H15"];
const outcome = () => ({
  done: true,
  screenAtEnd: false,
  events: [{ e: "screen+" }, { e: "step", text: "Meal One · 1 of 7 meals" }, { e: "style+" }, { e: "mark" }, { e: "screen-" }],
  checkout: {
    path: "/checkout",
    style: true,
    mark: true,
    payment: { hidden: [], allowed: [], added: [], payWith: true, payWithout: true, payShown: [], counts: { with: 1, without: 1 } },
    hide: faces.HIDE.flatMap((h) => h.selectors.map((selector) => ({ id: h.id, selector, found: 1, displayed: 0 }))),
    total: { found: 1, displayed: 1 },
    oneTime: { activeSwitches: 0, renews: [] },
    lines: { count: 7, height: 406 },
  },
});

test("W18a: H11–H15 found and hidden — no W18 reason; one still displayed fails the width under W18, naming it", () => {
  assert.deepEqual(H19.map((id) => faces.HIDE.find((h) => h.id === id)?.check), H19.map(() => "W18"), "H11–H15 are W18's");
  assert.deepEqual(faces.facesVerdict(outcome()).reasons, []);
  const shown = outcome();
  shown.checkout.hide.find((h) => h.id === "H13").displayed = 7;
  assert.deepEqual(faces.facesVerdict(shown).reasons, ["W18: H13 .summary__item-quantity-controls found and still displayed with the style (7)"]);
  const absent = outcome();
  for (const h of absent.checkout.hide) if (H19.includes(h.id)) h.found = 0;
  assert.deepEqual(faces.facesVerdict(absent).reasons, [], "absent: reported, not a failure (a rename is F2's)");
});

test("W18a: the lines' height — the line reports the lines, their height, and what fourteen take of 844 px", () => {
  assert.equal(typeof faces.linesLine, "function", "lib/faces.mjs has W18's line");
  assert.equal(faces.linesLine(outcome()), "W18: 7 order lines in 406 px (58 px each); 14 would take 812 px of 844: fits");
  const tall = outcome();
  tall.checkout.lines = { count: 7, height: 896 };
  assert.equal(faces.linesLine(tall), "W18: 7 order lines in 896 px (128 px each); 14 would take 1792 px of 844: DOES NOT FIT");
  const none = outcome();
  none.checkout.lines = { count: 0, height: 0 };
  assert.equal(faces.linesLine(none), "W18: no order line read");
  assert.equal(faces.linesLine({ done: true, checkout: null }), "W18: /checkout not read");
});
