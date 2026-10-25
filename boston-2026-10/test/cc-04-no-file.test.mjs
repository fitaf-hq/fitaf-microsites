// CC-4 (SPEC-chefs-choice § 4): no file. Without a picks file for an open week, the page is byte-identical to the same
// build without data/picks/. Since SPEC-week-content § 7's ruling (2026-10-11, the orchestrator's: no build embeds a
// week; the bucket is the only source of a served week) that holds WHATEVER data/picks/ holds: the build reads none of
// it. Each package below is a mirror (cc-harness mirror()), built by its own build.mjs: data/picks/ as committed (the
// weeks delivered 2026-10-11 and 2026-10-18), removed, emptied, and holding only the fixture's week. Both builds.
// The production page is also the one S20 pins (index.html's SHA-256 in s20-production-golden.json).
// The control: that page with the fixture's week put in as content (builtPage) does differ, so the comparison can see a
// change.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../build.mjs";
import { builtPage, mirror, picksData, withFixtureInData, productionFalseSavePath } from "./cc-harness.mjs";

const golden = JSON.parse(await readFile(new URL("./s20-production-golden.json", import.meta.url), "utf8"));
const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");

/** The page `root`'s own build.mjs writes for `target`. */
async function pageOfPackage(root, target) {
  const { build } = await import(pathToFileURL(join(root, "build.mjs")).href);
  const outDir = await mkdtemp(join(tmpdir(), `boston-cc4-${target}-`));
  try {
    // SPEC-save-offer-production § 12: the production page as release (a) made it (production false), the rollback.
    await build({ target, outDir, ...(target === "prod" ? { savePath: await productionFalseSavePath() } : {}) });
    return await readFile(join(outDir, "index.html"), "utf8");
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

const withWrangler = (d) => copyFile(join(ROOT, "wrangler.jsonc"), join(d, "wrangler.jsonc"));
const PACKAGES = {
  "data/picks/ as committed": async (d) => withWrangler(d),
  "no data/picks/": async (d) => {
    await withWrangler(d);
    await rm(join(d, "data", "picks"), { recursive: true, force: true });
  },
  "an empty data/picks/": async (d) => {
    await withWrangler(d);
    await rm(join(d, "data", "picks"), { recursive: true, force: true });
    await mkdir(join(d, "data", "picks"));
  },
  "only the fixture's week": async (d) => {
    await withWrangler(d);
    await rm(join(d, "data", "picks"), { recursive: true, force: true });
    await withFixtureInData(d);
  },
};

for (const target of ["prod", "dev"]) {
  test(`CC-4 (${target}): whatever data/picks/ holds, the build writes one page, holding no week`, async () => {
    const pages = {};
    for (const [label, change] of Object.entries(PACKAGES)) {
      const dir = await mirror(change);
      try {
        if (label === "data/picks/ as committed") {
          assert.ok((await readdir(join(dir, "data", "picks"))).some((f) => f.endsWith(".json")), "control: committed weeks in the mirror");
        }
        pages[label] = await pageOfPackage(dir, target);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    }
    const [reference, ...others] = Object.values(pages);
    for (const [label, html] of Object.entries(pages)) {
      assert.equal(html, reference, `${label}: the same page`);
      assert.deepEqual(picksData(html).weeks, [], `${label}: #picks-data holds no week`);
    }
    assert.equal(others.length, 3);
    if (target === "prod") assert.equal(sha256(reference), golden.files["index.html"], "the page is S20's pinned page");
    const withWeek = (await builtPage({ target })).html;
    assert.equal(picksData(withWeek).weeks.length, 1, "control: the fixture's week, put in as content, reaches the page");
    assert.notEqual(withWeek, reference, "control: and the page differs");
  });
}
