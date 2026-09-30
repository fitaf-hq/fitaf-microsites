// R2-31 (SPEC-rung2 § 12, the Advisor's ruling: fill A is retired, fill B is the mechanism): the build writes exactly
// two files, the Footer block and fill B's console file (which keeps its name, so a runbook that names it still works),
// and no fill-A file. Neither carries fill A's code (R2-11's absence list, now over both), and no per-meal price from
// data/plans.json is inlined anywhere (§ 12 item 2: the plan counts are, the prices are not).
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadJson, PLANS_PATH } from "../build.mjs";
import { buildStorefront } from "../scripts/build-storefront.mjs";

const FILES = ["fitaf-handoff.fill-B.console.js", "fitaf-handoff.html"];
/** Fill A's code, from R2-11's list: none of it in either file. */
const FILL_A = [/hmp_local_cart/, /localStorage/, /productId/, /10538/];

test("R2-31: the build writes exactly two files, no fill-A file, and none of fill A's code or prices in either", async () => {
  const plans = await loadJson(PLANS_PATH);
  const prices = [...new Set([...plans.individual, plans.family].flatMap((p) => p.counts.map((c) => c.price_per_meal_cents)))];
  assert.ok(prices.length > 0, "fixture control: plans.json has prices to look for");
  const out = await mkdtemp(join(tmpdir(), "boston-storefront-r2-31-"));
  try {
    const built = await buildStorefront({ outDir: out });
    assert.deepEqual(built.files.map((f) => f.name).sort(), FILES, "the files the build reports");
    const onDisk = (await readdir(out)).sort();
    assert.deepEqual(onDisk, FILES, "the files on disk, and nothing else");
    assert.ok(!onDisk.some((name) => /fill-A/.test(name)), "no fill-A file");
    for (const name of FILES) {
      const text = await readFile(join(out, name), "utf8");
      for (const re of FILL_A) assert.doesNotMatch(text, re, `${name} carries fill A's ${re}`);
      for (const cents of prices) assert.doesNotMatch(text, new RegExp(`\\b${cents}\\b`), `${name} inlines a price: ${cents}`);
    }
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
