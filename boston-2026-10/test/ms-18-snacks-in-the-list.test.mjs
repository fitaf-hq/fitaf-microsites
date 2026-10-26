// MS-18 (SPEC-meal-selection.md § 12 items 3 and 5): the snacks join the card's one list. With *Add snacks* the list
// (`#cc-list`) holds the week's meals, then the snacks under a small *"Snacks"* heading inside the same list, then
// *Continue to checkout*, and after the list *Choose my own meals*, the card's last thing: no second box below the
// buttons. The not-carted line, while snacks are not carted, stays with the snacks (inside the list, before the
// buttons); while carted it is not on the page, as today. With *No snacks* the list reads as today: its heading, the
// meals, *Continue to checkout*, then *Choose my own meals*. "What a visitor reads" is save-end-fixture's readingOrder
// (document order, skipping what is hidden). Each case builds from its own snack flags (ms-harness, § 11).
// ⚠ AMENDED by SPEC-ui-and-copy-pass § 4 B (2026-10-26): on a page carrying the save step (the production page, since
// data/save.json's `production` is true), its link *Not ready?* is the card's last thing, after *Choose my own meals*.
// ⚠ AMENDED by SPEC-ui-and-copy-pass § 5 item 1 (2026-10-26): the card reads its heading and its chips (*Choose my own
// meals* the last, no link below the checkout) before the list, and the price between the list and Continue to checkout
// (UC14 holds that order): so the list is read here from its menu's heading, the price set aside, and the two buttons are
// Continue to checkout (and *Not ready?*).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { mealLine, MESSAGES } from "./cc-harness.mjs";
import { fragmentOf, GOALS, open, pageOf, SNACKS_CARTED, SNACKS_SHOWN, TABLE, V2_CARTS, V2_DIR, V2_SNACKS, V2_SNACKS_FIVE, v2WithFiveDays } from "./ms-harness.mjs";
import { readingOrder } from "./save-end-fixture.mjs";

/** § 12 item 3's heading, written here from the contract: a small "Snacks". */
const SNACKS_HEADING = "Snacks";

/** Whether `node` is `ancestor` or inside it. */
const inside = (node, ancestor) => {
  for (let n = node; n; n = n.parentElement) if (n === ancestor) return true;
  return false;
};

/** The result card as a visitor reads it from the list on: [element id or tag, its words], in document order (a meal's
 *  or a snack's line is its name's span: its tile has no words). */
function cardReading(page) {
  const start = page.el("cc-heading");
  const price = page.document.querySelector("#result .price");
  const nodes = readingOrder(page.el("result")).filter((n) => !inside(n, price));
  const from = nodes.indexOf(start);
  assert.ok(from >= 0, "control: the list is shown");
  // SPEC-ui-and-copy-pass § 1 item 8 (2026-10-23): a meal's count is a badge on its tile, the rest of its line visually
  // hidden inside its name's span, so it is read with the name (the span's words are the line, as before), not apart.
  return nodes.slice(from).filter((n) => !n.classList.contains("visually-hidden")).map((n) => [n.id || n.localName, n.textContent.replace(/\s+/g, " ").trim()]);
}

/** The reading § 12 item 3 gives: the heading, the meals, [the snacks' heading and lines], [the not-carted line], the two
 *  buttons. `snacks` the shown snack lines (or null: no list for the days), `note` whether the not-carted line shows. */
function expected(page, cart, { snacks = undefined, note = false } = {}) {
  const words = MESSAGES.chefs_choice;
  return [
    ["cc-heading", page.el("cc-heading").textContent.trim()],
    ...cart.items.map((m) => ["span", mealLine(m)]),
    ...(snacks ? [["cc-snacks-heading", SNACKS_HEADING], ...snacks.map((m) => ["span", mealLine(m)])] : []),
    ...(note ? [["cc-snacks-note", words.snacks_not_carted]] : []),
    ["cc-checkout", words.checkout],
    // § 4 B: his words, ruled in § 4.2 item 6, written here from the contract.
    ...(page.has("not-ready") ? [["not-ready", "Not ready to checkout? Save your offer now."]] : []),
  ];
}

/** Where the snack block sits in the markup: inside the list, and before Continue to checkout. */
const where = (page) => {
  const all = [...page.document.querySelectorAll("*")];
  const box = page.el("cc-snacks");
  return { insideList: inside(box, page.el("cc-list")), beforeCheckout: all.indexOf(box) < all.indexOf(page.el("cc-checkout")) };
};

test("MS-18 (not carted): Add snacks reads meals, the snacks under a small Snacks heading, the not-carted line, then the two buttons", async () => {
  assert.ok(V2_SNACKS["7"] && !V2_SNACKS["5"], "fixture control: a snack list for 7 days, none for 5");
  const html = await pageOf({ picks: V2_DIR, snacks: SNACKS_SHOWN });
  for (const goal of GOALS) {
    for (const row of TABLE) {
      const page = open(html, fragmentOf(goal, row, true));
      const list = V2_SNACKS[row.weekends ? "7" : "5"] ?? null;
      assert.deepEqual(where(page), { insideList: true, beforeCheckout: true }, `${fragmentOf(goal, row, true)}: the snacks inside the list, before its buttons`);
      assert.deepEqual(cardReading(page), expected(page, V2_CARTS[row.key], { snacks: list, note: true }), fragmentOf(goal, row, true));
    }
  }
});

test("MS-18 (carted): Add snacks reads meals, the snacks under a small Snacks heading, then the two buttons; no not-carted line", async () => {
  const week = await v2WithFiveDays();
  try {
    const html = await pageOf({ picks: week.dir, snacks: SNACKS_CARTED });
    for (const goal of GOALS) {
      for (const row of TABLE) {
        const page = open(html, fragmentOf(goal, row, true));
        const list = row.weekends ? V2_SNACKS["7"] : V2_SNACKS_FIVE;
        assert.deepEqual(where(page), { insideList: true, beforeCheckout: true }, `${fragmentOf(goal, row, true)}: the snacks inside the list, before its buttons`);
        assert.deepEqual(cardReading(page), expected(page, V2_CARTS[row.key], { snacks: list }), fragmentOf(goal, row, true));
      }
    }
  } finally {
    await week.done();
  }
});

test("MS-18: No snacks reads as today: the heading, the meals, Continue to checkout, Choose my own meals", async () => {
  for (const snacks of [SNACKS_SHOWN, SNACKS_CARTED]) {
    const html = await pageOf({ picks: V2_DIR, snacks });
    for (const goal of GOALS) {
      for (const row of TABLE) {
        const page = open(html, fragmentOf(goal, row));
        assert.deepEqual(cardReading(page), expected(page, V2_CARTS[row.key]), `${fragmentOf(goal, row)} (${JSON.stringify(snacks)})`);
      }
    }
  }
});

test("MS-18: no second box: the snacks have no box of their own, and their heading is smaller than the list's", async () => {
  const css = await readFile(join(ROOT, "src", "chefs-choice", "style.css"), "utf8");
  const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^}]*)\}/g)].map(([, sel, body]) => ({ selectors: sel.split(",").map((s) => s.trim()), body }));
  const of = (selector) => rules.filter((r) => r.selectors.includes(selector)).map((r) => r.body).join(";");
  assert.doesNotMatch(of(".cc-snacks"), /\b(border|background|padding)\b/, ".cc-snacks draws no box");
  const size = (body) => Number(/font:[^;]*?(\d+(?:\.\d+)?)px/.exec(body)?.[1] ?? /font-size:\s*(\d+(?:\.\d+)?)px/.exec(body)?.[1]);
  assert.ok(size(of(".cc-snacks-heading")) < size(of(".cc-heading")), `the snacks' heading (${size(of(".cc-snacks-heading"))}px) under the list's (${size(of(".cc-heading"))}px)`);
  const page = open(await pageOf({ picks: V2_DIR, snacks: SNACKS_SHOWN }), "#lean-or-7d-s");
  assert.equal(page.el("cc-snacks-heading").localName, "h4", "a heading under the list's own h3");
  assert.equal(page.el("cc-heading").localName, "h3", "control: the list's heading");
});
