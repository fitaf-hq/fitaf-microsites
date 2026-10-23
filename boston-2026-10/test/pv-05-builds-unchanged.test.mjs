// PV5 (SPEC-preview-sites.md § 3, § 4): the production and development builds are byte-identical to the builds before
// the preview build existed: every file each writes has the SHA-256 that pv-05-golden.json recorded from the contract's
// commit's own tree (test/pv-05-record.mjs). S20 and the dev goldens (U4, MS-9, PR-10, CC-8) say the same in their terms.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ROOT } from "../build.mjs";
import { buildHashes } from "./pv-checks.mjs";

const golden = JSON.parse(await readFile(new URL("./pv-05-golden.json", import.meta.url), "utf8"));

for (const target of ["prod", "dev"]) {
  test(`PV5 (${target}): every file the ${target === "prod" ? "production" : "development"} build writes is byte-identical to ${golden.recorded_at}'s`, async () => {
    assert.ok(Object.keys(golden.files[target]).length > 0, "the golden names files (control)");
    assert.deepEqual(await buildHashes(ROOT, target), golden.files[target]);
  });
}
