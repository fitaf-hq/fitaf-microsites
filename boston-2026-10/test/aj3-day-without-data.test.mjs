// AJ3 (SPEC-analytics.md § 11 items 1 and 4): a range with days of no data. Every day from --from to --to appears in the
// --json document, in order (across a month's end too); a day of no data is exactly { "day", "data": false }, and the
// text report says "no data" on the same days. The check is aj-checks.mjs's noDataProblems. Nothing is requested.
import test from "node:test";
import assert from "node:assert/strict";
import { noDataProblems } from "./aj-checks.mjs";

test("AJ3: a range with a day of no data: every day, in order; a day of no data is { day, data: false }", async () => {
  assert.deepEqual(await noDataProblems(), []);
});
