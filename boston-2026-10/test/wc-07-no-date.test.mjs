// WC-7 (SPEC-week-content.md § 2.2, § 5): the page shows the week its #picks-data holds; no date decides it. The page's
// script given one week whose valid_to has passed shows the card (it was hidden: SPEC-chefs-choice § 2, superseded for
// the served page); so does one whose valid_from has not come. More than one week, or none: no card, quietly.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { card, openPlanPage, picksDir } from "./cc-harness.mjs";
import { AFTER, BEFORE, dateProblems } from "./wc-checks.mjs";
import { pageOf } from "./ms-harness.mjs";
import { picksText } from "./wc-harness.mjs";

test("WC-7a: one week whose valid_to has passed (and one whose valid_from has not come): the card is shown", async () => {
  assert.deepEqual(await dateProblems(), []);
});

test("WC-7b: two weeks on the page, or none: no card at any date, and nothing thrown", async () => {
  const week = JSON.parse(await readFile(join(ROOT, "test", "fixtures", "picks-v2", "2026-10-04.json"), "utf8"));
  const next = { ...structuredClone(week), delivery: "2026-10-11" };
  const two = await picksDir({ "2026-10-04.json": week, "2026-10-11.json": next });
  try {
    const both = await pageOf({ picks: two, on: "2026-09-30" });
    assert.equal(JSON.parse(picksText(both)).weeks.length, 2, "control: the build embedded both");
    const none = await pageOf({});
    assert.equal(JSON.parse(picksText(none)).weeks.length, 0, "control: no week");
    for (const [label, html] of [["two weeks", both], ["no week", none]]) {
      for (const now of [AFTER, BEFORE, Date.parse("2026-09-29T17:00:00Z")]) {
        const state = card(openPlanPage(html, { hash: "#lean-or-7d", now }));
        assert.equal(state.list, false, `${label} at ${new Date(now).toISOString()}: no list`);
        assert.equal(state.choose, true, `${label}: Choose your meals`);
      }
    }
  } finally {
    await rm(two, { recursive: true, force: true });
  }
});
