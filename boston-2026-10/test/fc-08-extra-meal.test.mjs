// FC-8 (SPEC-rung2-fill-c § 8, 2026-10-16): a plan carries the extra meal its data/plans.json `selection` row gives,
// 5 meals on the 4 plan and 15 on the 14 (Fit AF's decision record, the Advisor: "our 5 meal plan is the 4 meal plan
// with an extra meal"). § 8 item 1: a plan of P meals a week takes P, and the `meals` of every selection row whose `plan`
// is P: 4 → 4 or 5, 14 → 14 or 15, 7, 10, 21 and Family's unchanged; countTable gives it, mpid → allowed totals, and the
// block carries it as COUNTS. Item 2: every check of a link's count takes those totals (the block's decode, the link
// tool, the Chef's Choice cart check), and its refusal names them. Item 3: § 1.4, before CHECKOUT, waits for the LINK's
// total. Item 4: a link of exactly the plan's count fills as before.
//
// The synthetic store (r2-harness orderPage): `above: 1` is a store that takes one meal above its plan's count (its
// CHECKOUT enabled from the plan's count to one more); `planShowsAtMost` caps its plan's own displayed count. Whether
// the live store takes a fifth meal on the 4 plan is § 8 item 6's smoke, not these cases. The mutants of § 8 item 5 are
// fc-08-mutants.test.mjs's, each in a mirror; the checks they share are fc-08-checks.mjs's.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadJson, ROOT } from "../build.mjs";
import { countTable, storefrontText } from "../scripts/build-storefront.mjs";
import { checkPicks } from "../scripts/chefs-choice.mjs";
import { payloadFromArgs } from "../scripts/handoff-link.mjs";
import { PLANS } from "./cc-harness.mjs";
import { EXTRA, FC_PAYLOAD, fcRun } from "./fc-harness.mjs";
import {
  contractTotals,
  extraMealProblems,
  FIVE,
  FIXTURE_TOTALS,
  fixtureTableProblems,
  LEAN_14,
  LEAN_4,
  pathOf,
  showsFourProblems,
  unitsOf,
} from "./fc-08-checks.mjs";
import { addCard, fakeWindow, fragmentFor, LOG_PREFIX, MEALS, orderPage, run, script } from "./r2-harness.mjs";

const WIDTHS = ["bar", "sidebar"];
const TOOL = join(ROOT, "scripts", "handoff-link.mjs");
const sorted = (list) => [...list].sort();

/** A link of `qtys` over the fixture's meals and the eight extra cards, in order. */
const linkOf = (mpid, qtys) => {
  const names = [...MEALS, ...EXTRA];
  return { mpid, items: qtys.map((qty, i) => ({ name: names[i], qty })) };
};

/** The block on the synthetic page (its 3 + 8 cards, the store counting at once), drained: the window, the page, the
 *  block's own lines. `options` are orderPage's. */
async function outcome(payload, options = {}) {
  const page = await orderPage(options);
  for (const name of EXTRA) addCard(page.document, name);
  const path = pathOf(payload.mpid);
  const h = fakeWindow({ path, fragment: fragmentFor(payload), page });
  run(await script(), h.window);
  h.timers.drain(20_000);
  return { h, page, path, ours: h.info.filter((l) => l.startsWith(LOG_PREFIX)) };
}

/** A refusal at decode: exactly `line`, the fragment removed and nothing else done, nothing pressed, no screen. */
function assertRefusedAtDecode(o, line) {
  assert.deepEqual(o.ours, [`${LOG_PREFIX} stopped: ${line}`], "one line: the refusal");
  assert.deepEqual(o.h.events, [["replaceState", o.path]], "only the fragment removed");
  assert.equal(o.page.total(), 0, "nothing pressed");
  assert.deepEqual(o.page.controls, [], "no control pressed");
  assert.equal(o.page.document.querySelector("#fitaf-screen"), null, "no screen");
}

// ── FC-8a ────────────────────────────────────────────────────────────────────────────────────────────────────────────
for (const width of WIDTHS) {
  test(`FC-8a ${width}: a 5-meal link on Lean 4's mpid fills, and CHECKOUT is pressed when the store counts 5`, async () => {
    assert.equal(LEAN_4, 20, "fixture control: Lean 4 is mpid 20 in data/plans.json");
    assert.equal(unitsOf(FIVE).length, 5, "fixture control: five units, one meal twice");
    assert.deepEqual(await extraMealProblems(await script(), { width }), []);
  });
}

// ── FC-8b ────────────────────────────────────────────────────────────────────────────────────────────────────────────
for (const above of [0, 1]) {
  for (const width of WIDTHS) {
    test(`FC-8b ${width}, a store taking ${above} more: a 4-meal link on Lean 4 still fills, as before`, async () => {
      const four = linkOf(LEAN_4, [2, 1, 1]);
      const r = await fcRun({ payload: four, path: pathOf(LEAN_4), width, above });
      assert.equal(r.last, `${LOG_PREFIX} done: /checkout`, JSON.stringify(r.ours));
      assert.deepEqual(r.page.controls, ["checkout:shown"]);
      assert.deepEqual(sorted(r.page.atCheckout), sorted(unitsOf(four)));
    });
  }
}

// ── FC-8c ────────────────────────────────────────────────────────────────────────────────────────────────────────────
for (const [what, qtys, total] of [["6", [2, 2, 1, 1], 6], ["3 (below the plan, as before)", [2, 1], 3]]) {
  test(`FC-8c: ${what} on Lean 4 refused at decode — nothing pressed; "the plan takes 4 or 5 meals; the link has ${total}"`, async () => {
    const o = await outcome(linkOf(LEAN_4, qtys), { above: 1 });
    assertRefusedAtDecode(o, `the plan takes 4 or 5 meals; the link has ${total}`);
  });
}

// ── FC-8d ────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** FC_PAYLOAD (14 units over 11 meals, on Lean 14) with one more of its last meal: 15. */
const FIFTEEN = { mpid: LEAN_14, items: FC_PAYLOAD.items.map((it, i, all) => (i === all.length - 1 ? { ...it, qty: it.qty + 1 } : it)) };

for (const width of WIDTHS) {
  test(`FC-8d ${width}: 15 on the 14 plan (Lean 14) fills; CHECKOUT pressed with the plan the link's 15`, async () => {
    assert.equal(unitsOf(FIFTEEN).length, 15, "fixture control: fifteen units");
    assert.deepEqual(await extraMealProblems(await script(), { width, payload: FIFTEEN }), []);
  });
}

for (const total of [13, 16]) {
  test(`FC-8d: ${total} on the 14 plan refused at decode — "the plan takes 14 or 15 meals; the link has ${total}"`, async () => {
    const items = FC_PAYLOAD.items.map((it, i, all) => (i === all.length - 1 ? { ...it, qty: it.qty + total - 14 } : it));
    const link = { mpid: LEAN_14, items: items.filter((it) => it.qty > 0) };
    assert.equal(unitsOf(link).length, total, "fixture control");
    assertRefusedAtDecode(await outcome(link, { above: 1 }), `the plan takes 14 or 15 meals; the link has ${total}`);
  });
}

// ── FC-8e ────────────────────────────────────────────────────────────────────────────────────────────────────────────
for (const width of WIDTHS) {
  test(`FC-8e ${width}: § 1.4 waits for 5, not 4 — the store's plan count showing 4 of a 5-meal link stops, naming the counts`, async () => {
    const { problems, r } = await showsFourProblems(await script(), { width });
    assert.deepEqual(problems, []);
    assert.deepEqual(sorted(r.page.store.pending), sorted(unitsOf(FIVE)), "fixture control: the store holds the link's five");
  });
}

// ── FC-8f ────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Every plan § 8 leaves as it was: each individual plan's 7, 10 and 21, and Family. */
const UNCHANGED = [
  ...PLANS.individual.flatMap((plan) => plan.counts.filter((c) => [7, 10, 21].includes(c.meals_per_week)).map((c) => [`${plan.id} ${c.meals_per_week}`, c])),
  ...PLANS.family.counts.map((c) => [`family ${c.meals_per_week}`, c]),
];
/** `n` units over the fixture's three meals and the eight extra cards, the first meals taking the rest. */
const unitsLink = (mpid, n) => {
  const cards = MEALS.length + EXTRA.length;
  const qtys = Array.from({ length: Math.min(n, cards) }, (_, i) => Math.floor(n / Math.min(n, cards)) + (i < n % Math.min(n, cards) ? 1 : 0));
  return linkOf(mpid, qtys);
};

test("FC-8f: Family and 7, 10, 21 unchanged — the plan's count fills; one more or one fewer refused in today's words", async () => {
  assert.equal(UNCHANGED.length, 10, "fixture control: 3 plans x (7, 10, 21) + Family");
  for (const [what, c] of UNCHANGED) {
    const P = c.meals_per_week;
    const ok = await outcome(unitsLink(c.mpid, P));
    assert.equal(ok.ours.at(-1), `${LOG_PREFIX} done: /checkout`, `${what}: ${JSON.stringify(ok.ours)}`);
    assert.equal(ok.page.store.pending.length, P, what);
    for (const n of [P - 1, P + 1].filter((n) => n > 0)) {
      assertRefusedAtDecode(await outcome(unitsLink(c.mpid, n)), `the plan needs ${P} meals; the link has ${n}`);
    }
  }
});

// ── FC-8g ────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** What the block's decode says of a one-meal link of `n` on `mpid`: its first line (no card carries the meal, so the
 *  fill presses nothing; nothing is drained). */
async function blockSays(text, mpid, n) {
  const page = await orderPage();
  const h = fakeWindow({ path: pathOf(mpid), fragment: fragmentFor({ items: [{ name: "Decode Only", qty: n }] }), page });
  run(text, h.window);
  return h.info.filter((l) => l.startsWith(LOG_PREFIX))[0];
}
const TOOL_COUNTS = () => new Map(Object.entries(countTable(PLANS)).map(([mpid, totals]) => [Number(mpid), totals]));

test("FC-8g: the link tool and the block take the same totals — every plan, every total 1 to 21, the same verdict and words", async () => {
  const text = await script();
  const counts = TOOL_COUNTS();
  const totals = contractTotals();
  for (const [mpid, allowed] of Object.entries(totals)) {
    for (let n = 1; n <= 21; n++) {
      let tool = null;
      try {
        payloadFromArgs(["--mpid", mpid, "--item", `Decode Only:${n}`], counts);
      } catch (err) {
        tool = err.message;
      }
      const block = await blockSays(text, Number(mpid), n);
      const want = allowed.includes(n);
      assert.equal(tool === null, want, `the tool, mpid ${mpid}, ${n}: ${tool}`);
      if (want) assert.equal(block, `${LOG_PREFIX} fill C, mpid ${mpid}`, `the block, mpid ${mpid}, ${n}`);
      else assert.equal(block, `${LOG_PREFIX} stopped: ${tool}`, `the block's words are the tool's, mpid ${mpid}, ${n}`);
    }
  }
});

test("FC-8g: `npm run handoff:link` builds a 5-meal link on Lean 4 and refuses 6, in § 8's words; 15 on Lean 14, not 16", () => {
  const tool = (mpid, items) =>
    spawnSync(process.execPath, [TOOL, "--mpid", String(mpid), ...items.flatMap((it) => ["--item", `${it.name}:${it.qty}`])], { encoding: "utf8" });
  const five = tool(LEAN_4, FIVE.items);
  assert.equal(five.status, 0, five.stderr);
  const url = new URL(five.stdout.split("\n")[0]);
  assert.equal(url.searchParams.get("mpid"), String(LEAN_4));
  assert.equal(url.hash, fragmentFor(FIVE), "the link is the five, keyed as the block keys them");
  const six = tool(LEAN_4, [...FIVE.items, { name: EXTRA[1], qty: 1 }]);
  assert.notEqual(six.status, 0);
  assert.equal(six.stdout, "");
  assert.equal(six.stderr.trim(), "handoff:link: the plan takes 4 or 5 meals; the link has 6");
  assert.equal(tool(LEAN_14, FIFTEEN.items).status, 0, "15 on Lean 14");
  const sixteen = tool(LEAN_14, FIFTEEN.items.map((it, i) => (i ? it : { ...it, qty: it.qty + 1 })));
  assert.equal(sixteen.stderr.trim(), "handoff:link: the plan takes 14 or 15 meals; the link has 16");
});

const V2 = JSON.parse(await readFile(join(ROOT, "test", "fixtures", "picks-v2", "2026-10-04.json"), "utf8"));
const cartOf = (week, ld, weekends, breakfast) =>
  week.lists["chefs-choice"].carts.find((c) => c.lunch_dinner === ld && c.weekends === weekends && c.breakfast === breakfast);
/** The v2 fixture week with the cart of (ld, weekends, breakfast) given `more` units on its first meal. */
const weekWith = (ld, weekends, breakfast, more) => {
  const week = structuredClone(V2);
  cartOf(week, ld, weekends, breakfast).items[0].qty += more;
  return week;
};
/** A link's meal units: its `<key>` and `<key>*<n>` items, before any photo part. */
const linkUnits = (href) =>
  new URL(href).hash.slice("#fitaf=".length).split("!")[0].split(".").slice(1).reduce((sum, t) => sum + Number(t.split("*")[1] ?? 1), 0);

test("FC-8g: the Chef's Choice cart check takes the same totals — 5 on the 4 plan and 15 on the 14 accepted, 6 and 16 refused", async () => {
  const plans = await loadJson(join(ROOT, "data", "plans.json"));
  const fourOf = PLANS.individual.map((p) => p.counts.find((c) => c.meals_per_week === 4).mpid);
  const fourteenOf = PLANS.individual.map((p) => p.counts.find((c) => c.meals_per_week === 14).mpid);
  const five = checkPicks(weekWith("or", false, false, 1), "2026-10-04.json", plans);
  assert.deepEqual(Object.keys(five.carts["or-5d"].links).map(Number).sort(), fourOf.sort(), "a link per size, on its 4 plan");
  for (const href of Object.values(five.carts["or-5d"].links)) assert.equal(linkUnits(href), 5, href);
  const fifteen = checkPicks(weekWith("and", false, true, 1), "2026-10-04.json", plans);
  assert.deepEqual(Object.keys(fifteen.carts["and-5d-b"].links).map(Number).sort(), fourteenOf.sort());
  for (const href of Object.values(fifteen.carts["and-5d-b"].links)) assert.equal(linkUnits(href), 15, href);
  assert.throws(() => checkPicks(weekWith("or", false, false, 2), "2026-10-04.json", plans), /carts\[1\] \(or, weekdays, no breakfast\): the plan takes 4 or 5 meals; the link has 6$/);
  assert.throws(() => checkPicks(weekWith("and", false, true, 2), "2026-10-04.json", plans), /\(and, weekdays, breakfast\): the plan takes 14 or 15 meals; the link has 16$/);
  assert.throws(() => checkPicks(weekWith("or", true, false, 1), "2026-10-04.json", plans), /\(or, every day, no breakfast\): the plan needs 7 meals; the link has 8$/, "7 unchanged");
});

test("FC-8g: the block fills the Chef's Choice 5-meal link on the 4 plan, every unit, CHECKOUT pressed", async () => {
  const plans = await loadJson(join(ROOT, "data", "plans.json"));
  const week = weekWith("or", false, false, 1);
  const cart = cartOf(week, "or", false, false);
  const href = checkPicks(week, "2026-10-04.json", plans).carts["or-5d"].links[LEAN_4];
  const url = new URL(href);
  const page = await orderPage({ above: 1 });
  page.document.querySelector("main").innerHTML = "";
  for (const m of cart.items) addCard(page.document, m.name);
  const h = fakeWindow({ path: url.pathname + url.search, fragment: url.hash, page });
  run(await script(), h.window);
  h.timers.drain(5000);
  assert.ok(h.info.includes(`${LOG_PREFIX} done: /checkout`), JSON.stringify(h.info));
  assert.deepEqual(sorted(page.store.pending), sorted(cart.items.flatMap((m) => Array(m.qty).fill(m.name))));
  assert.deepEqual(page.controls, ["checkout:shown"]);
});

// ── FC-8h ────────────────────────────────────────────────────────────────────────────────────────────────────────────
test("FC-8h: countTable from a fixture plans.json whose selection maps 9 to plan 8 — 8 takes 8 or 9", async () => {
  const fixture = await loadJson(join(ROOT, "test", "fixtures", "fc-08-plans.json"));
  assert.deepEqual(fixture.selection.find((r) => r.plan === 8)?.meals, 9, "fixture control: 9 meals go through the 8");
  assert.deepEqual(FIXTURE_TOTALS[102], [8, 9]);
  assert.deepEqual(fixtureTableProblems(countTable(fixture)), []);
});

test("FC-8h: countTable over data/plans.json is § 8 item 1's — 4 → 4 or 5, 14 → 14 or 15, the rest their own — and the block carries it as COUNTS", async () => {
  assert.equal(JSON.stringify(countTable(PLANS)), JSON.stringify(contractTotals()));
  const text = await storefrontText();
  const m = /var COUNTS = \/\* data\/plans\.json, read_on [0-9-]+ \*\/ (\{[^}]*\});/.exec(text);
  assert.ok(m, "the shipped text inlines the table at COUNTS");
  assert.equal(m[1], JSON.stringify(contractTotals()), "the inlined table is the contract's");
});
