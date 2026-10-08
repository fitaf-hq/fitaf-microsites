// MS-4 (SPEC-meal-selection.md § 6, § 3): fragments. Today's `#lean-7`, `#signature-14` (and the other four of the grid's
// cells) open as today, the result card and the week's links byte-identical to the page before (test/ms-golden.json), and
// `#family` the Family tab; every new fragment `#<size>-<or|and>-<7d|5d>[-b][-s]` opens its answers and round-trips (a
// press that changes nothing writes no new fragment; a press that changes one answer writes the fragment the grammar
// gives); an unknown fragment opens the start, and one whose size is known but whose answers are not opens that size
// alone, as today's `#lean-9` does. The two cases that press or read Q4 build from their own data with snacks shown
// (ms-harness SNACKS_SHOWN, § 11), never the committed flags.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { card } from "./cc-harness.mjs";
import { answer, chooseGoal, fragmentOf, GOALS, open, pageOf, questionsOf, resultOf, SNACKS_SHOWN, TABLE, V1_DIR } from "./ms-harness.mjs";

const golden = JSON.parse(await readFile(new URL("./ms-golden.json", import.meta.url), "utf8"));
const yesNo = (b) => (b ? "yes" : "no");

test("MS-4: today's fragments open as today (the result card and the week's links byte-identical); #family the Family tab", async () => {
  const html = await pageOf({ picks: V1_DIR });
  assert.ok(Object.keys(golden.cards).includes("#lean-7") && Object.keys(golden.cards).includes("#signature-14"), "fixture control");
  for (const [hash, was] of Object.entries(golden.cards)) {
    const page = open(html, hash);
    const r = resultOf(page);
    const s = card(page);
    assert.deepEqual(
      { total: r.total, perMeal: r.perMeal, cta: s.chooseHref, checkout: s.checkout, own: s.ownHref, meals: s.meals, accent: page.el("result").getAttribute("data-accent") },
      { total: was.total, perMeal: was.per_meal, cta: was.result_cta, checkout: was.cc_checkout, own: was.cc_own, meals: was.meals, accent: was.accent },
      hash,
    );
    const q = questionsOf(page);
    assert.deepEqual([q.lunch_dinner.pressed, q.weekends.pressed, q.breakfast.pressed], [hash.endsWith("-7") ? "or" : "and", "yes", "no"], `${hash}: every day, no breakfast`);
    assert.equal(page.hash(), hash, `${hash}: the page writes no fragment of its own on opening`);
  }
  const family = open(html, "#family");
  assert.equal(family.el("panel-family").hasAttribute("hidden"), false, "#family: the Family panel");
  assert.equal(family.el("panel-individual").hasAttribute("hidden"), true, "#family: not the Individual panel");
  assert.equal(family.el("tab-family").getAttribute("aria-selected"), "true");
});

test("MS-4: every new fragment opens its answers, and round-trips", async () => {
  const html = await pageOf({ snacks: SNACKS_SHOWN });
  let checked = 0;
  for (const goal of GOALS) {
    for (const row of TABLE) {
      for (const snacks of [false, true]) {
        const hash = fragmentOf(goal, row, snacks);
        const page = open(html, hash);
        const q = questionsOf(page);
        assert.deepEqual(
          [q.lunch_dinner.pressed, q.weekends.pressed, q.breakfast.pressed, q.snacks.pressed],
          [row.lunch_dinner, yesNo(row.weekends), yesNo(row.breakfast), yesNo(snacks)],
          `${hash}: its answers, pressed`,
        );
        assert.equal(resultOf(page).selection, row.key + (snacks ? "-s" : ""), `${hash}: the result card's answer set`);
        chooseGoal(page, goal);
        assert.equal(page.hash(), hash, `${hash}: pressing the chosen size again writes no new fragment`);
        answer(page, "lunch_dinner", row.lunch_dinner);
        assert.equal(page.hash(), hash, `${hash}: pressing the chosen Q1 again writes no new fragment`);
        checked++;
      }
    }
  }
  assert.equal(checked, GOALS.length * TABLE.length * 2, "three sizes × eight answer sets × snacks or none");
});

test("MS-4: a press writes the fragment the grammar gives", async () => {
  const page = open(await pageOf({ snacks: SNACKS_SHOWN }), "#lean-or-7d");
  const steps = [
    [() => answer(page, "weekends", "no"), "#lean-or-5d"],
    [() => answer(page, "breakfast", "yes"), "#lean-or-5d-b"],
    [() => answer(page, "snacks", "yes"), "#lean-or-5d-b-s"],
    [() => answer(page, "lunch_dinner", "and"), "#lean-and-5d-b-s"],
    [() => chooseGoal(page, "performance"), "#performance-and-5d-b-s"],
    [() => answer(page, "snacks", "no"), "#performance-and-5d-b"],
    [() => answer(page, "weekends", "yes"), "#performance-and-7d-b"],
    [() => answer(page, "breakfast", "no"), "#performance-and-7d"],
  ];
  for (const [press, hash] of steps) {
    press();
    assert.equal(page.hash(), hash);
    assert.equal(resultOf(page).selection, hash.replace(/^#[a-z]+-/, ""), `${hash}: the card follows`);
  }
});

test("MS-4: an unknown fragment opens the start; a known size with unknown answers opens that size alone", async () => {
  const html = await pageOf();
  const start = (page) => {
    const q = questionsOf(page);
    return {
      goal: [...page.document.querySelectorAll("[data-goal]")].filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.getAttribute("data-goal")),
      q1: q.lunch_dinner.pressed,
      more: q.weekends.shown,
      result: resultOf(page).shown,
      individual: page.el("panel-individual").hasAttribute("hidden") === false,
    };
  };
  const nothing = { goal: [], q1: null, more: false, result: false, individual: true };
  for (const hash of ["#nope", "#nope-or-9d", "#meals", "#meals-both-7d", "#-or-7d", "#7", "#meals-or-7d-x", "#lean7"]) {
    assert.deepEqual(start(open(html, hash)), nothing, hash);
  }
  for (const hash of ["#lean-or-9d", "#lean-both-7d", "#lean-or-7d-s-b", "#lean-9", "#lean-or-7d-b-b"]) {
    assert.deepEqual(start(open(html, hash)), { ...nothing, goal: ["lean"] }, hash);
  }
});
