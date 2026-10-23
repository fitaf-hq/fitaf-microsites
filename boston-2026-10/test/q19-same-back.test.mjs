// Q19 (SPEC-print-pieces.md § 12 item 1): the back is the same for every flyer, so the vendor can impose four fronts on
// one side and four backs on the other. Built with fixture photos: the five flyers' page 2, as Chrome draws each flyer's
// two-page document (the build's proof of it), are identical pixels; the one back proof, flyer-back(-PROOF).png, is
// those pixels; the five backs measure alike, part for part. Controls: each front differs from the back (the comparison
// sees a page change), and a back without the photos differs from the back with them.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { PNG } from "pngjs";
import { lockedBuild, NO_CHROME, photoSet } from "./print-fixtures.mjs";
import { ON } from "./qb-checks.mjs";

const set = await photoSet();
after(() => rm(set.dir, { recursive: true, force: true }));
const pixelsOf = (bytes) => createHash("sha256").update(PNG.sync.read(bytes).data).digest("hex");

test("Q19: built, the five flyers' backs are the same page: identical pixels, the one back proof, alike part for part", { skip: NO_CHROME }, async () => {
  const out = join(set.dir, "dist-print");
  const built = await lockedBuild({ outDir: out, ...set.photos, today: ON });
  const flyers = built.planned.filter((p) => p.piece.id === "flyer");
  assert.deepEqual(flyers.map((p) => p.page.base), ["flyer", "flyer-1", "flyer-2", "flyer-3", "flyer-4"], "the five flyers (control)");
  const backs = flyers.map((p) => p.back?.pixels);
  assert.ok(backs.every((h) => typeof h === "string" && h.length === 64), `each flyer's page 2 rendered: ${JSON.stringify(backs)}`);
  assert.equal(new Set(backs).size, 1, "the five backs are identical pixels");
  assert.equal(built.back.stem, "flyer-back-PROOF", "the back is a proof (its words not yet approved)");
  const proof = await readFile(join(out, `${built.back.stem}.png`));
  assert.equal(pixelsOf(proof), backs[0], "flyer-back-PROOF.png is that page");
  const [first, ...rest] = flyers.map((p) => JSON.stringify(p.back.measured));
  for (const [i, m] of rest.entries()) assert.equal(m, first, `${flyers[i + 1].page.base}'s back measures as flyer's`);
  for (const p of flyers) assert.notEqual(pixelsOf(await readFile(join(out, `${p.stem}.png`))), backs[0], `control: ${p.stem}.png, the front, is not the back`);

  const bare = await lockedBuild({ outDir: join(set.dir, "dist-bare"), today: ON, fourFlyers: false });
  const [plain] = bare.planned.filter((p) => p.piece.id === "flyer");
  assert.notEqual(plain.back.pixels, backs[0], "control: a back without the photos is another page");
});
