// MS-10 (SPEC-meal-selection.md § 6, ⭐ mutants; § 8.1). Each mutant is a change to a MIRROR of the package's inputs
// (cc-harness mirror(): build.mjs, package.json, data/, scripts/, src/ copied to a temporary directory; never the tree:
// protocols/mutate-in-a-mirror.md), built by the mirror's own build.mjs, and checked by THE SAME function the case runs on
// the real page (test/ms-checks.mjs). Each runs the unchanged mirror first as its control, which must pass.
//
//   rounding up (5 -> 7)                       fails MS-1 (the card's plan) and MS-2 (the link's mpid)
//   a cart's link built on meals, not plan     fails MS-2 (5 and 15 meals are no plan the store sells: no page at all)
//   a version-1 14 mapped to or                fails MS-5
//   a card choosing its cart by mpid           fails MS-11
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { mirror, picksDir } from "./cc-harness.mjs";
import { linkProblems, rowProblems, threeCartsProblems, v1Problems } from "./ms-checks.mjs";
import { pageOf, V1_DIR, V2, V2_DIR } from "./ms-harness.mjs";

/** Replace `from` (present exactly once) with `to` in the mirror's file `rel`. */
async function edit(dir, rel, from, to) {
  const path = join(dir, rel);
  const text = await readFile(path, "utf8");
  assert.equal(text.split(from).length - 1, 1, `the mutation anchor is in ${rel} once: ${from.slice(0, 80)}`);
  await writeFile(path, text.replace(from, to));
}

/** A mirror changed by `change(dir)`, and `fn(dir)` run over it; the mirror removed after. */
async function withMirror(change, fn) {
  const dir = await mirror(change);
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** A check's problems on a mirror's page, or the build's own refusal as the one problem (no page is a failed case). */
async function problemsOn(dir, picks, check) {
  let html;
  try {
    html = await pageOf({ root: dir, picks });
  } catch (err) {
    return [`the page does not build: ${err.message}`];
  }
  return check(html);
}

test("MS-10 (control): the unchanged mirror passes MS-1, MS-2, MS-5 and MS-11", async () => {
  await withMirror(async () => {}, async (dir) => {
    assert.deepEqual(await problemsOn(dir, undefined, rowProblems), [], "MS-1");
    assert.deepEqual(await problemsOn(dir, V2_DIR, (html) => linkProblems(html, { decode: false })), [], "MS-2");
    assert.deepEqual(await problemsOn(dir, V1_DIR, v1Problems), [], "MS-5");
    assert.deepEqual(await problemsOn(dir, V2_DIR, threeCartsProblems), [], "MS-11");
  });
});

// Rounding up: data/plans.json sends 5 meals through the 7-meal plan, and the build's refusal of a plan above its meals
// is removed (else the build refuses the mutant itself). The week's cart for or, weekdays follows (its 7's meals, plan 7),
// so the page builds and the card and the link carry the 7.
const ROW_5 = '{ "lunch_dinner": "or", "weekends": false, "breakfast": false, "meals": 5, "plan": 4 }';
const ROUND_UP = '{ "lunch_dinner": "or", "weekends": false, "breakfast": false, "meals": 5, "plan": 7 }';
const ABOVE_REFUSAL = "  if (row.plan > row.meals) fail(";

test("MS-10: rounding up (5 -> 7) fails MS-1 and MS-2", async () => {
  const week = structuredClone(V2);
  const carts = week.lists["chefs-choice"].carts;
  const five = carts.find((c) => c.lunch_dinner === "or" && !c.weekends && !c.breakfast);
  const seven = carts.find((c) => c.lunch_dinner === "or" && c.weekends && !c.breakfast);
  Object.assign(five, { plan: 7, items: structuredClone(seven.items) });
  const picks = await picksDir({ "2026-10-04.json": week });
  try {
    await withMirror(
      async (dir) => {
        await edit(dir, "data/plans.json", ROW_5, ROUND_UP);
        await edit(dir, "scripts/selection.mjs", ABOVE_REFUSAL, "  if (false) fail(");
      },
      async (dir) => {
        const ms1 = await problemsOn(dir, undefined, rowProblems);
        assert.ok(ms1.some((p) => /^#lean-or-5d: meals "7", not "4"$/.test(p)), `MS-1 fails it:\n${ms1.join("\n")}`);
        const ms2 = await problemsOn(dir, picks, (html) => linkProblems(html, { decode: false }));
        assert.ok(ms2.some((p) => /^#lean-or-5d: https:\/\/fitafnutrition\.com\/order\?mpid=21#/.test(p)), `MS-2 fails it (the 7's mpid, 21):\n${ms2.join("\n")}`);
      },
    );
  } finally {
    await rm(picks, { recursive: true, force: true });
  }
});

// A cart's link built on what the answers come to instead of the row's plan (version 2's reader).
const CART_ON_PLAN = "carts[key] = cartOf(mealsOf(cart.items, `${where}.items`), cart.plan, where, ctx, (carted && snacks[dayToken(cart.weekends)]) || null);";
const CART_ON_MEALS = "carts[key] = cartOf(mealsOf(cart.items, `${where}.items`), row.meals, where, ctx, (carted && snacks[dayToken(cart.weekends)]) || null);";

test("MS-10: a cart's link built on meals instead of plan fails MS-2", async (t) => {
  await withMirror(
    (dir) => edit(dir, "scripts/chefs-choice.mjs", CART_ON_PLAN, CART_ON_MEALS),
    async (dir) => {
      const ms2 = await problemsOn(dir, V2_DIR, (html) => linkProblems(html, { decode: false }));
      t.diagnostic(ms2.join("\n"));
      // 5 meals is no plan the store sells, so no size has an mpid for it: the first cart through a smaller plan stops the
      // build (or, weekdays: carts[1]), and MS-2 has no page.
      assert.deepEqual(ms2.length, 1, ms2.join("\n"));
      assert.match(ms2[0], /^the page does not build: .*2026-10-04\.json: Cannot destructure property 'mpid'/, ms2[0]);
    },
  );
});

// A version-1 file's 14 under or (or, every day, with breakfast: also 14 meals) instead of and, every day.
const V1_KEY = "const key = legacyKey(rows, Number(count));";
const V1_KEY_MUTANT = 'const key = count === "14" ? "or-7d-b" : legacyKey(rows, Number(count));';

test("MS-10: a version-1 14 mapped to or fails MS-5", async () => {
  await withMirror(
    (dir) => edit(dir, "scripts/chefs-choice.mjs", V1_KEY, V1_KEY_MUTANT),
    async (dir) => {
      const ms5 = await problemsOn(dir, V1_DIR, v1Problems);
      assert.ok(ms5.some((p) => /^#lean-and-7d: the version-1 14 is not shown$/.test(p)), `MS-5 fails it:\n${ms5.join("\n")}`);
      assert.ok(ms5.some((p) => /^#lean-or-7d-b: not the fallback/.test(p)), `and shows it under or:\n${ms5.join("\n")}`);
    },
  );
});

// The card choosing its cart by the mpid in Choose your meals' link (the card before § 8 item 2), not by the answer set.
const CHOSEN = `  function chosen(sel) {
    var key = sel.replace(/-s$/, "");
    var cart = has(week.carts, key) ? week.carts[key] : null;
    var m = cart && /[?&]mpid=(\\d+)$/.exec(choose.getAttribute("href") || "");
    var links = cart && ((/-s$/.test(sel) && cart.snack_links) || cart.links);
    return m && has(links, m[1]) ? { menu: cart, link: links[m[1]] } : null;
  }`;
const CHOSEN_BY_MPID = `  function chosen(sel) {
    var m = sel && /[?&]mpid=(\\d+)$/.exec(choose.getAttribute("href") || "");
    for (var key in week.carts) if (m && has(week.carts[key].links, m[1])) return { menu: week.carts[key], link: week.carts[key].links[m[1]] };
    return null;
  }`;

test("MS-10: a card that chooses its cart by mpid fails MS-11", async () => {
  await withMirror(
    (dir) => edit(dir, "src/chefs-choice/chefs-choice.js", CHOSEN, CHOSEN_BY_MPID),
    async (dir) => {
      const ms11 = await problemsOn(dir, V2_DIR, threeCartsProblems);
      assert.ok(ms11.some((p) => /^#lean-or-7d-b: shows /.test(p)), `MS-11 fails it:\n${ms11.join("\n")}`);
      assert.ok(ms11.some((p) => /^#lean-and-5d-b: shows /.test(p)), ms11.join("\n"));
      assert.ok(!ms11.some((p) => p.startsWith("#lean-and-7d:")), `the first of the three is still right by chance: ${ms11.join("\n")}`);
    },
  );
});

// SPEC-snacks-in-the-cart § 4.2 (MS-7, carted): the card ignoring the snack links, so *Add snacks* takes the link without
// snacks. Read as MS-7's carted half reads it: the every-day answer sets' Continue to checkout carries the week's list.
const SNACK_LINKS = "var links = cart && ((/-s$/.test(sel) && cart.snack_links) || cart.links);";
const NO_SNACK_LINKS = "var links = cart && cart.links;";
async function snackLinkProblems(dir) {
  const { cardOf, fragmentOf, GOALS, open, SNACKS_CARTED, TABLE, tokensOf } = await import("./ms-harness.mjs");
  const html = await pageOf({ root: dir, picks: V2_DIR, snacks: SNACKS_CARTED });
  const problems = [];
  for (const goal of GOALS) {
    for (const row of TABLE.filter((r) => r.weekends)) {
      const where = fragmentOf(goal, row, true);
      const snacks = tokensOf(cardOf(open(html, where)).checkout).filter((t) => t.startsWith("_"));
      if (snacks.length !== V2.lists["chefs-choice"].snacks["7"].length) problems.push(`${where}: ${snacks.length} snack items`);
    }
  }
  return problems;
}

test("MS-10 (SPEC-snacks-in-the-cart): a card that ignores the snack links fails MS-7 (carted)", async () => {
  await withMirror(async () => {}, async (dir) => assert.deepEqual(await snackLinkProblems(dir), [], "control: the unchanged mirror carts the snacks"));
  await withMirror(
    (dir) => edit(dir, "src/chefs-choice/chefs-choice.js", SNACK_LINKS, NO_SNACK_LINKS),
    async (dir) => {
      const problems = await snackLinkProblems(dir);
      assert.ok(problems.length > 0 && problems.every((p) => / 0 snack items$/.test(p)), problems.join("\n"));
    },
  );
});
