// MS-9 (SPEC-meal-selection.md § 6, § 0 ⛔): unchanged. The Footer block's text, the watch's expected Footer and the
// Worker (every file its entry reaches) are byte-identical to CC-8's golden (test/cc-08-unchanged-golden.json), and a
// build carrying the meal selection with a version-2 week and its snacks moves none of them: the Footer block already
// takes every plan's count (§ 8 item 9), and nothing of src/storefront/ or src/worker/ is read differently. That build is
// from its own data with snacks shown (ms-harness SNACKS_SHOWN, § 11), so it carries the snacks whatever is committed.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { countTable, storefrontText } from "../scripts/build-storefront.mjs";
import { picksData, PLANS, workerFiles } from "./cc-harness.mjs";
import { pageOf, SNACKS_SHOWN, V2_DIR } from "./ms-harness.mjs";

const golden = JSON.parse(await readFile(new URL("./cc-08-unchanged-golden.json", import.meta.url), "utf8"));
const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");

test("MS-9: the Footer block's text, the watch's expected Footer and the Worker are CC-8's golden", async () => {
  assert.equal(sha256(await storefrontText()), golden.footer_text_sha256, "the Footer block's text");
  const baseline = JSON.parse(await readFile(join(ROOT, "storefront", "watch-baseline.json"), "utf8"));
  assert.equal(baseline.expectedFooter, golden.watch_expected_footer, "the watch's expectedFooter");
  assert.deepEqual(await workerFiles(), golden.worker, "the Worker");
});

test("MS-9: the Footer block already knows every plan an answer set goes through (4, 10, 21 included)", () => {
  const table = countTable(PLANS);
  for (const plan of PLANS.individual) {
    for (const n of [4, 7, 10, 14, 21]) {
      const { mpid } = plan.counts.find((c) => c.meals_per_week === n);
      assert.equal(table[mpid], n, `${plan.id} ${n}: mpid ${mpid}`);
    }
  }
});

test("MS-9: a build carrying a version-2 week and its snacks leaves them as they were", async () => {
  const html = await pageOf({ picks: V2_DIR, snacks: SNACKS_SHOWN });
  assert.ok(picksData(html)?.weeks[0]?.snacks, "control: the build carried the week and its snacks");
  assert.equal(sha256(await storefrontText()), golden.footer_text_sha256);
  assert.deepEqual(await workerFiles(), golden.worker);
});
