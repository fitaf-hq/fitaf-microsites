// EL12 (SPEC-ui-and-copy-pass.md § 8.2 item 3, ruled ts=2026-10-27T15:04:57.804Z, "Keep the blue"): --lean on --ink for
// E1's "Never frozen." (Lc -51.3 against body text's 75) is an approved exception, recorded on that one pair in
// src/contrast-pairs.json with the ruling's ts, so `npm run contrast` and M20 pass it and say so. The exception is that
// pair's alone (the same colours declared again, or any other pair under its role, still fail), and an exception without a
// ruling's ts is refused. The mutant: scripts/contrast.mjs with the ts check removed accepts one, and the refusal fails.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { measure } from "../scripts/contrast.mjs";
import { assertExceptionPasses, assertOthersStrict, assertTsRequired, CONTRAST_SCRIPT, mutantMeasure, RULING_TS } from "./el-contrast-checks.mjs";

test("EL12: the lede accent's pair passes by its exception, with the ruling's ts; nothing else is excepted", async () => {
  await assertExceptionPasses(measure);
});

test("EL12: npm run contrast passes and says so: the pair marked, the exception listed with its ts", async () => {
  const res = spawnSync(process.execPath, [CONTRAST_SCRIPT], { encoding: "utf8" });
  assert.equal(res.status, 0, res.stdout + res.stderr);
  const { rows } = await measure();
  assert.match(res.stdout, new RegExp(`${rows.length} pairs, ${rows.length} pass, 0 fail; 0 problem`), "the summary");
  assert.match(res.stdout, /--lean #48aeee\s+--ink #212529\s+body \(email\)\s+75\s+-51\.3\s+pass\*/, "the row, marked");
  assert.ok(res.stdout.includes(RULING_TS), "the exception listed with the ruling's ts");
});

test("EL12: the exception is that pair's alone: its colours declared again, and another pair under its role, still fail", async () => {
  await assertOthersStrict(measure);
});

test("EL12: an exception without a ruling's ts is refused (none, or a date that is no instant)", async () => {
  await assertTsRequired(measure);
});

test("EL12 mutant: contrast.mjs taking any exception, ts or not -> the refusal fails", async () => {
  const mutant = await mutantMeasure('const ruled = exception !== null && RULING_TS.test(exception.ts ?? "");', "const ruled = exception !== null;");
  try {
    await assertExceptionPasses(mutant.measure); // control: the mutant still passes the committed table
    await assert.rejects(assertTsRequired(mutant.measure), /the pair fails|refused, by name/);
  } finally {
    await mutant.dispose();
  }
});
