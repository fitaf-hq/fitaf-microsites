// MS-7 (SPEC-meal-selection.md § 6, § 4), as § 9 item 3 amends it and SPEC-snacks-in-the-cart § 4 and § 5 item 5
// rewrite it for `carted: true`: `snacks.shown` decides whether Q4 is on the page and `snacks.carted` whether a snack
// reaches a link. Each half writes the flags it asserts (ms-harness SNACKS_HIDDEN, SNACKS_SHOWN, SNACKS_CARTED), so none
// reads the committed `snacks` (SPEC-meal-selection § 11; the committed data stays `carted: false`).
// - Not shown: no Q4, no snack block, no snack list in the page's data, a `-s` fragment is the size alone, and no link
//   carries a snack (no `_` item, no snack's key).
// - Shown, not carted: Q4 and *Add snacks* show the snack list, still OUTSIDE every link: the link carries exactly its
//   cart's meals, which make the plan.
// - ⭐ Shown and carted (a week with a snack list for 7 days and for 5): for every size and all eight answer sets, *Add
//   snacks*' Continue to checkout is its cart's meals (making the plan, in today's order), then the week's list for its
//   Q2's days as snack items (7 or 5 units, the plan's count unmoved); *No snacks*' link is byte-identical to the same
//   answers' link when not carted.
// - Carted, a week with no list for 5 days (the committed fixture): Q4 hidden for the weekday answer sets (the page never
//   offers what the cart cannot hold) and a `-s` fragment there gives the link without snacks; shown for every day.
// - Carted, no week: Q4 is not on the page.
import test from "node:test";
import assert from "node:assert/strict";
import { picksData } from "./cc-harness.mjs";
import {
  cardOf,
  fragmentOf,
  GOALS,
  keysOf,
  listKeys,
  open,
  pageOf,
  questionsOf,
  SNACKS_CARTED,
  SNACKS_HIDDEN,
  SNACKS_SHOWN,
  TABLE,
  tokensOf,
  V2_CARTS,
  V2_DIR,
  V2_SNACKS,
  V2_SNACKS_FIVE,
  v2WithFiveDays,
} from "./ms-harness.mjs";
import { refKey } from "./r2-harness.mjs";

const SNACK_KEYS = new Set(V2_SNACKS["7"].map((m) => refKey(m.name)));
const cartKeys = (key) => Object.fromEntries(V2_CARTS[key].items.map((m) => [refKey(m.name), m.qty]));
const noSnackItem = (href) => !tokensOf(href).some((t) => t.startsWith("_")) && !Object.keys(keysOf(href)).some((k) => SNACK_KEYS.has(k));

test("MS-7: snacks not shown: no Q4, no snack block or list, a -s fragment is the size alone, no snack in any link", async () => {
  const html = await pageOf({ picks: V2_DIR, snacks: SNACKS_HIDDEN });
  assert.doesNotMatch(html, /data-q="snacks"|id="q-snacks"|id="cc-snacks"/, "no Q4, no snack block");
  assert.equal(picksData(html).weeks[0].snacks, undefined, "no snack list in the page's data");
  for (const m of V2_SNACKS["7"]) assert.ok(!html.includes(m.display), `the page does not carry the snack ${m.display}`);
  const page = open(html, "#lean-and-7d-s");
  assert.deepEqual([questionsOf(page).lunch_dinner.pressed, cardOf(page).result], [null, false], "#lean-and-7d-s: the size alone");
  for (const goal of GOALS) {
    for (const row of TABLE) {
      const s = cardOf(open(html, fragmentOf(goal, row)));
      assert.ok(noSnackItem(s.checkout), `${fragmentOf(goal, row)}: a snack in the link`);
    }
  }
});

test("MS-7: snacks shown, not carted (its own data): Q4 and the snack list; the link is the cart's meals, which make the plan", async () => {
  const html = await pageOf({ picks: V2_DIR, snacks: SNACKS_SHOWN });
  for (const goal of GOALS) {
    for (const row of TABLE.filter((r) => r.weekends)) {
      const page = open(html, fragmentOf(goal, row, true));
      const s = cardOf(page);
      assert.equal(questionsOf(page).snacks.pressed, "yes");
      assert.ok(s.snackLines?.length, `${fragmentOf(goal, row, true)}: the snack list`);
      const keys = keysOf(s.checkout);
      assert.deepEqual(keys, cartKeys(row.key), `${fragmentOf(goal, row, true)}: the cart's meals and no snack`);
      assert.ok(noSnackItem(s.checkout));
      assert.equal(Object.values(keys).reduce((a, b) => a + b, 0), row.plan, "the link makes the plan's count");
    }
  }
});

test("MS-7 (carted, SPEC-snacks-in-the-cart § 4.2): every size and answer set — Add snacks is the cart's meals then the week's list for its days; No snacks is today's", async () => {
  const week = await v2WithFiveDays();
  try {
    const carted = await pageOf({ picks: week.dir, snacks: SNACKS_CARTED });
    const notCarted = await pageOf({ picks: week.dir, snacks: SNACKS_SHOWN });
    for (const goal of GOALS) {
      for (const row of TABLE) {
        const where = fragmentOf(goal, row, true);
        const withSnacks = cardOf(open(carted, where));
        const plain = cardOf(open(carted, fragmentOf(goal, row)));
        const before = cardOf(open(notCarted, fragmentOf(goal, row)));
        assert.equal(plain.checkout, before.checkout, `${fragmentOf(goal, row)}: No snacks' link is the one before carting, byte for byte`);
        const list = row.weekends ? V2_SNACKS["7"] : V2_SNACKS_FIVE;
        const tokens = tokensOf(withSnacks.checkout);
        const meals = tokens.filter((t) => !t.startsWith("_"));
        assert.deepEqual(meals, tokensOf(plain.checkout), `${where}: the cart's meals first, in today's order`);
        assert.deepEqual(tokens.slice(meals.length).every((t) => t.startsWith("_")), true, `${where}: then only snacks`);
        const keys = keysOf(withSnacks.checkout);
        const snacks = Object.fromEntries(Object.entries(keys).filter(([k]) => k.startsWith("_")));
        assert.deepEqual(snacks, listKeys(list, "_"), `${where}: the week's list for ${row.weekends ? 7 : 5} days`);
        const mealCount = Object.entries(keys).filter(([k]) => !k.startsWith("_")).reduce((a, [, n]) => a + n, 0);
        assert.equal(mealCount, row.plan, `${where}: the plan's count unmoved by the snacks`);
        assert.equal(Object.values(snacks).reduce((a, b) => a + b, 0), row.weekends ? 7 : 5, `${where}: one snack a day`);
        assert.equal(new URL(withSnacks.checkout).search, new URL(plain.checkout).search, `${where}: the same plan's mpid`);
      }
    }
  } finally {
    await week.done();
  }
});

test("MS-7 (carted): a week with no list for 5 days — Q4 hidden on weekdays, and a -s fragment there links no snack; shown every day", async () => {
  const html = await pageOf({ picks: V2_DIR, snacks: SNACKS_CARTED });
  for (const goal of GOALS) {
    for (const row of TABLE) {
      const page = open(html, fragmentOf(goal, row, true));
      const s = cardOf(page);
      assert.equal(questionsOf(page).snacks.shown, row.weekends, `${fragmentOf(goal, row, true)}: Q4 ${row.weekends ? "shown" : "hidden"}`);
      if (row.weekends) continue;
      assert.ok(noSnackItem(s.checkout), `${fragmentOf(goal, row, true)}: no snack in the link`);
      assert.equal(s.checkout, cardOf(open(html, fragmentOf(goal, row))).checkout, "the link without snacks");
      assert.equal(s.snacks, false, "no snack box");
    }
  }
});

test("MS-7 (carted): no week — Q4 is not on the page, and a -s fragment is the size alone", async () => {
  const html = await pageOf({ snacks: SNACKS_CARTED });
  assert.doesNotMatch(html, /data-q="snacks"|id="q-snacks"/, "no Q4");
  const page = open(html, "#lean-and-7d-s");
  assert.deepEqual([questionsOf(page).lunch_dinner.pressed, cardOf(page).result], [null, false], "#lean-and-7d-s: the size alone");
});
