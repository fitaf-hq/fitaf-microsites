// F4 (SPEC-analytics.md § 13 items 3 and 5): the report over a fixture holding `who` and `family` rows (A11's,
// test/fixtures/analytics/steps.json, invented numbers) lists the funnel's answer steps in the page's order since round 2:
// who, lunch_dinner, weekends, breakfast, snacks, goal, then family; and `answer: family`, which branches off `who` and is
// not a step after `goal`, has no change figure. The text and the --json document alike (§ 11's shape, one step named
// `answer: <q>` per question). The report is run in this process over the fixture (aj-checks.mjs runAt); nothing is
// requested.
import test from "node:test";
import assert from "node:assert/strict";
import { fixtureAnswers, parseText, RANGE, runAt } from "./aj-checks.mjs";
import { ROOT } from "../build.mjs";

/** § 13 item 3's order, written from the contract. */
const FUNNEL = ["open", "answer: who", "answer: lunch_dinner", "answer: weekends", "answer: breakfast", "answer: snacks", "answer: goal", "answer: family", "result", "click"];

test("F4 (analytics § 13): the funnel in the page's order, answer: family with no change figure, in the text and the JSON", async () => {
  const answers = await fixtureAnswers();
  const rows = answers.steps.data.filter((r) => r.event === "answer");
  for (const question of ["who", "family"]) assert.ok(rows.some((r) => r.question === question), `control: the fixture holds ${question} rows`);
  const text = await runAt(ROOT, RANGE, answers);
  const json = await runAt(ROOT, [...RANGE, "--json"], answers);
  assert.equal(text.code, 0, text.err);
  assert.equal(json.code, 0, json.err);
  const days = JSON.parse(json.out).days.filter((d) => d.data);
  assert.ok(days.length >= 2, `control: days with data (${days.length})`);
  const textDays = parseText(text.out).days.filter((d) => d.data);
  for (const [i, d] of days.entries()) {
    assert.deepEqual(d.funnel.map((s) => s.step), FUNNEL, `${d.day}: the document's funnel`);
    assert.deepEqual(textDays[i].funnel.map((s) => s.step), FUNNEL, `${d.day}: the text's funnel`);
    for (const question of ["who", "family"]) {
      const row = rows.find((r) => r.day === d.day && r.question === question);
      assert.equal(d.funnel.find((s) => s.step === `answer: ${question}`).visits, Number(row?.visits ?? 0), `${d.day}: answer: ${question}'s visits are the fixture's`);
    }
  }
  const familyLines = text.out.split("\n").filter((l) => /^ {4}answer: family\b/.test(l));
  assert.equal(familyLines.length, days.length, "one answer: family line a day with data");
  for (const line of familyLines) assert.match(line, /^ {4}answer: family +\d+$/, `no change figure: ${JSON.stringify(line)}`);
  const whoLines = text.out.split("\n").filter((l) => /^ {4}answer: who\b/.test(l));
  for (const line of whoLines) assert.match(line, /^ {4}answer: who +\d+ {3}\S/, `control: answer: who has its change figure: ${JSON.stringify(line)}`);
});
