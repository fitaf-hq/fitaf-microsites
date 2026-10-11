// WC-12 (SPEC-week-content.md § 7: the orchestrator's ruling on the build notes' first open question, 2026-10-11): the
// deployed builds embed NO week. `npm run build` and `npm run build:dev` emit #picks-data with `weeks: []` whatever
// `--on` is and whatever data/picks/ holds; the bucket is the only source of a served week, so an empty or invalid bucket
// means no card, as § 4.2 says. The case the ruling names: data/picks/2026-10-18.json present (committed) and
// `--on 2026-10-11` given, a date inside that week's window (2026-10-09 to 2026-10-15), which until the ruling made the
// build embed it. The mutant that embeds the open week is WC-11's; it is red on this check.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { windowOf } from "../scripts/chefs-choice.mjs";
import { buildWeekProblems, RULING_ON, RULING_WEEK } from "./wc-checks.mjs";

test("WC-12 (control): data/picks/2026-10-18.json is committed and its window holds 2026-10-11", async () => {
  const week = JSON.parse(await readFile(join(ROOT, "data", "picks", `${RULING_WEEK}.json`), "utf8"));
  assert.equal(week.delivery, RULING_WEEK);
  const { valid_from, valid_to } = windowOf(RULING_WEEK);
  assert.ok(valid_from <= RULING_ON && RULING_ON <= valid_to, `${valid_from} ≤ ${RULING_ON} ≤ ${valid_to}`);
});

test("WC-12: `npm run build` and `npm run build:dev` with that file and --on 2026-10-11 embed weeks: []", async () => {
  assert.deepEqual(await buildWeekProblems(), []);
});
