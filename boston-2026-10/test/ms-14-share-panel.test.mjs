// MS-14 (SPEC-meal-selection.md § 8 item 7, § 8.1): the development page's share panel. It reads the ANSWERS, not today's
// fragment alone: meals a day = 1 (or) or 2 (and), + 1 with breakfast, on 7 days (every day) or 5 (weekdays), and
// shareLines takes meals a day and days. `#lean-7` and `#lean-14` (and S19's `#signature-14`) give today's lines exactly
// (test/ms-golden.json, recorded at 985f777); `#lean-or-7d` and `#lean-and-7d` give the same; *or*, weekdays gives ONE a
// day (never 5 ÷ 7); breakfast adds one a day; snacks change nothing. The page is run by page-sim (its own scripts).
// Development build only: the production page carries no share panel (S20).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mealsADayOf, shareLines } from "../src/save/calculator.js";
import { devPage } from "./dev-page.mjs";
import { simulatePage } from "./page-sim.mjs";
import { PLANS } from "./cc-harness.mjs";

const golden = JSON.parse(await readFile(new URL("./ms-golden.json", import.meta.url), "utf8"));
const IDS = ["share-targets", "share-protein-line", "share-calories-line"];

/** The panel's three lines at `hash`, with 150 g protein and 2,600 cal typed. */
function linesAt(html, hash) {
  const page = simulatePage(html, { hash });
  page.type("share-protein", "150");
  page.type("share-calories", "2,600");
  return page.el("share-out").hidden ? null : IDS.map((id) => page.el(id).textContent);
}

test("MS-14: today's fragments give today's lines, byte for byte; the same answers in the new grammar give the same", async () => {
  const html = await devPage();
  for (const [hash, same] of [["#lean-7", "#lean-or-7d"], ["#lean-14", "#lean-and-7d"], ["#signature-14", "#signature-and-7d"]]) {
    assert.deepEqual(linesAt(html, hash), golden.share[hash], `${hash}: today's lines`);
    assert.deepEqual(linesAt(html, same), golden.share[hash], `${same}: the same as ${hash}`);
  }
});

test("MS-14: or, weekdays gives one a day on five days; breakfast adds one a day; snacks change nothing", async () => {
  const html = await devPage();
  const lean = PLANS.individual.find((p) => p.id === "lean");
  const sevenDay = linesAt(html, "#lean-or-7d");
  const weekdays = linesAt(html, "#lean-or-5d");
  assert.match(weekdays[0], /Lean, 5 meals a week \(1 a day, 5 days a week\)$/, "one a day, on five days");
  assert.deepEqual(weekdays.slice(1), sevenDay.slice(1), "a day's share is one meal's, as every day's (not 5 ÷ 7 of it)");
  assert.deepEqual(linesAt(html, "#lean-or-7d-b"), linesAt(html, "#lean-and-7d"), "or with breakfast is two a day, as and");
  const three = linesAt(html, "#lean-and-5d-b");
  assert.deepEqual(three, Object.values(shareLines(lean, 3, 5, { protein: 150, calories: 2600 })), "and with breakfast, weekdays: three a day on five days");
  assert.match(three[0], /Lean, 15 meals a week \(3 a day, 5 days a week\)$/);
  assert.deepEqual(linesAt(html, "#lean-and-5d-b-s"), three, "snacks change nothing");
  assert.equal(linesAt(html, "#lean"), null, "no answers, no figure");
  assert.equal(linesAt(html, "#meals-or-5d"), null, "no size, no figure");
});

test("MS-14: the arithmetic of the answers is the calculator's, by the contract's rule", () => {
  const cases = [["or-7d", 1, 7], ["or-5d", 1, 5], ["and-7d", 2, 7], ["and-5d", 2, 5], ["or-7d-b", 2, 7], ["or-5d-b-s", 2, 5], ["and-7d-b", 3, 7], ["and-5d-b-s", 3, 5]];
  for (const [part, perDay, days] of cases) assert.deepEqual(mealsADayOf(part), { perDay, days }, part);
  for (const part of ["", "or", "or-6d", "both-7d", "or-7d-x"]) assert.equal(mealsADayOf(part), null, JSON.stringify(part));
});
