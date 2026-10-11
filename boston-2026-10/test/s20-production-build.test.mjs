// S20: the production build is unchanged by rung 4 — byte for byte. The reference is the SHA-256 of every
// file `npm run build` wrote before rung 4 (s20-production-golden.json, recorded from the build at the
// commit it names). T1–T7 and B1–B2 still run on their own.
// Its subject is the page WITHOUT a week's Chef's Choice. Since SPEC-week-content § 7's ruling no build embeds a week
// (it reads no data/picks/), so a committed picks file cannot move it; until then it built with an empty picks directory
// (SPEC-chefs-choice § 6, ruled 2026-09-30). Chef's Choice is CC-1–CC-9's and WC-1–WC-12's.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { build } from "../build.mjs";

const golden = JSON.parse(await readFile(new URL("./s20-production-golden.json", import.meta.url), "utf8"));

async function filesUnder(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await filesUnder(path)));
    else out.push(path);
  }
  return out;
}

test("S20: the production build is byte-identical to the build before rung 4", async () => {
  const out = await mkdtemp(join(tmpdir(), "boston-prod-"));
  try {
    await build({ target: "prod", outDir: out });
    const hashes = {};
    for (const f of (await filesUnder(out)).sort()) {
      hashes[relative(out, f)] = createHash("sha256").update(await readFile(f)).digest("hex");
    }
    assert.deepEqual(hashes, golden.files);
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
