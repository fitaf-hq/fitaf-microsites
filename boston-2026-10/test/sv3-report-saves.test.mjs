// SV3 (SPEC-analytics.md § 14 items 3 and 4): the report over a fixture holding `save` rows (A11's,
// test/fixtures/analytics/steps.json, invented numbers: the steps query's rows, a day's visits with a `save`) prints and
// returns `saves`, each day's visits with a save: the text a tenth line, "saved an offer N", after the funnel (its steps and
// its click-by-link line); the --json document one more member of a day with data, `saves`. A day with data and no save
// row is 0; a day of no data has neither. The report is run in this process over the fixture (aj-checks.mjs runAt);
// nothing is requested.
import test from "node:test";
import assert from "node:assert/strict";
import { fixtureAnswers, RANGE, runAt } from "./aj-checks.mjs";
import { ROOT } from "../build.mjs";

/** A day's lines at the day's own level (two spaces in), in order: § 5's, with § 14 item 3's after the funnel. Written
 *  from the contract; the day's date is the line above them, so the save line is the day's tenth. ⚠ Since SPEC-analytics.md
 *  § 16 item 3 (2026-10-27) two lines follow it, the visits from the offer email and the offer pages opened, before the
 *  visit length. */
const DAY_LINES = ["unique visitors", "funnel (visits)", "saved an offer", "visits from the offer email", "offer pages opened", "visit length", "load time", "device", "viewport", "country", "visits with a script error"];

/** The text's days: { day: [line, …] }, each day's lines up to the blank line that ends it. */
function textDays(text) {
  const days = {};
  let day = null;
  for (const line of text.split("\n").slice(1)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(line)) days[(day = line)] = [];
    else if (day && line !== "") days[day].push(line);
  }
  return days;
}

/** `answers` without the save rows of `day`. */
function withoutSaves(answers, day) {
  const data = answers.steps.data.filter((r) => !(r.event === "save" && r.day === day));
  return { ...answers, steps: { ...answers.steps, data, rows: data.length } };
}

/** The text's and the document's saves for each day of `answers`, against `want` ({ day: N }, a day of no data absent). */
async function savesProblems(label, answers, want) {
  const text = await runAt(ROOT, RANGE, answers);
  const json = await runAt(ROOT, [...RANGE, "--json"], answers);
  assert.equal(text.code, 0, `${label}: ${text.err}`);
  assert.equal(json.code, 0, `${label}: ${json.err}`);
  const doc = JSON.parse(json.out);
  const days = textDays(text.out);
  for (const d of doc.days) {
    const lines = days[d.day] ?? [];
    const saved = lines.filter((l) => /^ {2}saved an offer\b/.test(l));
    if (!d.data) {
      assert.equal("saves" in d, false, `${label} ${d.day}: a day of no data has no saves`);
      assert.deepEqual(saved, [], `${label} ${d.day}: a day of no data has no saved line`);
      continue;
    }
    assert.equal(d.saves, want[d.day], `${label} ${d.day}: the document's saves`);
    assert.deepEqual(saved, [`  saved an offer ${want[d.day]}`], `${label} ${d.day}: the text's saved line`);
    const own = lines.filter((l) => /^ {2}\S/.test(l)).map((l) => DAY_LINES.find((p) => l.startsWith(`  ${p}`)) ?? l);
    assert.deepEqual(own, DAY_LINES, `${label} ${d.day}: the day's lines, the saved line after the funnel`);
    const at = lines.indexOf(saved[0]);
    assert.match(lines[at - 1], /^ {4}\S/, `${label} ${d.day}: directly after the funnel's last line`);
    assert.match(lines[at + 1], /^ {2}visits from the offer email /, `${label} ${d.day}: directly before § 16's lines (the visit length after them)`);
  }
}

test("SV3: the report over a fixture holding save rows prints and returns saves, a day's visits with a save", async () => {
  const answers = await fixtureAnswers();
  const rows = answers.steps.data.filter((r) => r.event === "save");
  assert.deepEqual(rows.map((r) => r.day).sort(), ["2026-10-23", "2026-10-24"], "control: the fixture holds a save row on each day with data");
  for (const r of rows) assert.equal(r.question, "", "control: a save row names no question");
  const want = Object.fromEntries(rows.map((r) => [r.day, Number(r.visits)]));
  await savesProblems("the fixture", answers, want);
  await savesProblems("the fixture without 2026-10-24's save row", withoutSaves(answers, "2026-10-24"), { ...want, "2026-10-24": 0 });
});
