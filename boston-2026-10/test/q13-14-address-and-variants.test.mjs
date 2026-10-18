// Q13 and Q14 (SPEC-print-pieces.md § 8 items 1–3, as §§ 9–10 leave them), over one build of the tent card and the flyer
// (the four flyers are Q15's).
// Q13: eatfitaf.com's box is centred under the QR code's, directly under it, on every face of every page, as Chrome draws
// them (the build's measuring pass: the address's glyphs' box against the code's).
// Q14: § 8's three logo variants are withdrawn, the flyer's by § 9 and the tent's by § 10: one tent card, named
// tent-card (tent-card-PROOF.pdf, not three lettered files), one flyer, named flyer, and its four; no variant's name
// remains to choose by. Where the one logo sits is Q16's (the flyer) and Q17's (the tent).
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadInputs, MOCKUPS_DIR } from "../mockups/build-mockups.mjs";
import { campaign } from "../mockups/parts.mjs";
import * as pagesModule from "../print/pages.mjs";
import { CSS_PX_PER_INCH } from "../print/sizes.mjs";
import { lockedBuild, NO_CHROME } from "./print-fixtures.mjs";

const { pagesToPrint } = pagesModule;
const tmp = await mkdtemp(join(tmpdir(), "boston-q13-"));
after(() => rm(tmp, { recursive: true, force: true }));
const inputs = await loadInputs({ photosDir: join(MOCKUPS_DIR, "no-such-folder"), today: "2026-10-20" });
const HALF_PX_IN = 0.5 / CSS_PX_PER_INCH;
/** "Directly under": the address's glyphs start below the code, within this. */
const UNDER_IN = 0.1;
let built;
const build = async () => (built ??= await lockedBuild({ outDir: join(tmp, "dist-print"), today: "2026-10-20", fourFlyers: false }));

test("Q13: on every face of every page, eatfitaf.com is directly under the QR code and centred on it", { skip: NO_CHROME }, async () => {
  const { planned } = await build();
  const address = campaign(inputs).address.value;
  assert.deepEqual(planned.map((p) => p.piece.id), ["tent-card", "flyer"], "the tent and the flyer (control)");
  for (const p of planned) {
    p.measured.faces.forEach((face, f) => {
      const label = `${p.stem}, face ${f + 1}`;
      const [qr] = face.qrs;
      const words = face.texts.filter((t) => t.text === address);
      assert.equal(words.length, 1, `${label}: the address once`);
      const [a] = words;
      const turned = p.piece.faces > 1 && f === 0; // the upper face is turned: "under" is above on the sheet
      assert.ok(Math.abs(a.x + a.w / 2 - (qr.x + qr.w / 2)) <= HALF_PX_IN, `${label}: centred (${a.x + a.w / 2} vs ${qr.x + qr.w / 2})`);
      const gap = turned ? qr.y - (a.y + a.h) : a.y - (qr.y + qr.h);
      assert.ok(gap >= -HALF_PX_IN && gap <= UNDER_IN, `${label}: directly under the code (gap ${gap.toFixed(3)} in)`);
    });
  }
});

test("Q14: no variants (§§ 9–10): one tent card and one flyer and its four, unlettered", () => {
  const flyers = ["flyer", "flyer-1", "flyer-2", "flyer-3", "flyer-4"];
  assert.deepEqual(pagesToPrint().map((p) => p.base), ["tent-card", ...flyers]);
  assert.deepEqual(pagesToPrint({ fourFlyers: false }).map((p) => p.base), ["tent-card", "flyer"]);
  assert.ok(pagesToPrint().every((p) => !("variant" in p)), "a page has no variant");
  for (const name of ["VARIANTS", "LOGO_VARIANTS"]) assert.ok(!(name in pagesModule), `pages.mjs no longer names ${name}`);
  assert.ok("FLYER_FACE" in pagesModule && "TENT_FACE" in pagesModule, "each piece's one face, named (control)");
});

test("Q14: built, one tent card proof, tent-card-PROOF, not three, and the flyer one, unlettered", { skip: NO_CHROME }, async () => {
  await build();
  const files = (await readdir(join(tmp, "dist-print"))).sort();
  assert.deepEqual(files, ["assignment.json", "flyer-PROOF.pdf", "flyer-PROOF.png", "tent-card-PROOF.pdf", "tent-card-PROOF.png"]);
});
