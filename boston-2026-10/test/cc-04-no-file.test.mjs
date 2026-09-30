// CC-4 (SPEC-chefs-choice § 4): no file. Without a picks file for an open week, the page is byte-identical to the same
// build without data/picks/: no directory, an empty one, or only a week whose window has ended on --on. Both builds.
// The production page is also the one S20 pins (index.html's SHA-256 in s20-production-golden.json, before rung 4).
// The control: the same build with the fixture's week open does differ, so the comparison can see a change.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { builtPage, DAYS, FIXTURE, ON, picksData, picksDir } from "./cc-harness.mjs";

const golden = JSON.parse(await readFile(new URL("./s20-production-golden.json", import.meta.url), "utf8"));
const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");

for (const target of ["prod", "dev"]) {
  test(`CC-4 (${target}): no directory, an empty one, and an ended week all build the page of no data/picks/`, async () => {
    const none = join(await mkdtemp(join(tmpdir(), "boston-cc-none-")), "picks"); // does not exist
    const empty = await picksDir({});
    const ended = await picksDir({ "2026-10-04.json": FIXTURE });
    try {
      const reference = (await builtPage({ target, picks: none, on: ON })).html;
      if (target === "prod") {
        assert.equal(sha256(reference), golden.files["index.html"], "the page of no data/picks/ is S20's pinned page");
      }
      assert.equal((await builtPage({ target, picks: empty, on: ON })).html, reference, "an empty data/picks/");
      assert.equal((await builtPage({ target, picks: ended, on: DAYS["S-2"] })).html, reference, "only a week ended on --on");
      const open = (await builtPage({ target, picks: ended, on: ON })).html;
      assert.ok(picksData(open), "control: the same file, its week open on --on, reaches the page");
      assert.notEqual(open, reference, "control: and the page differs");
    } finally {
      for (const dir of [join(none, ".."), empty, ended]) await rm(dir, { recursive: true, force: true });
    }
  });
}
