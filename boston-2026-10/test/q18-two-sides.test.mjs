// Q18 (SPEC-print-pieces.md § 12 item 1): two sides. Every flyer PDF (flyer.pdf, flyer-1.pdf to flyer-4.pdf) has two
// pages, the front then the back, each the trim plus the bleed, 324 × 414 pt (Q1's); the tent card is unchanged, one
// page (the control: the count is read per file). The check is qb-checks.mjs twoSidesProblems, which the mutant "the
// back's page dropped" (qb-mutants.test.mjs) runs on a mirror. And the flyer's piece names its two sides, the second
// the same page size as the first.
import test from "node:test";
import assert from "node:assert/strict";
import { ROOT } from "../build.mjs";
import { pagePoints, PRINT_PIECES } from "../print/sizes.mjs";
import { NO_CHROME } from "./print-fixtures.mjs";
import { FLYER_BOX, FLYER_PAGES, twoSidesProblems } from "./qb-checks.mjs";

test("Q18: the flyer has two sides, each the flyer's page; the tent card one", () => {
  const [flyer, tent] = ["flyer", "tent-card"].map((id) => PRINT_PIECES.find((p) => p.id === id));
  assert.equal(flyer.sides, FLYER_PAGES, "the flyer: two sides");
  assert.equal(tent.sides ?? 1, 1, "the tent card: one");
  assert.deepEqual([0, 0, pagePoints(flyer).w, pagePoints(flyer).h], FLYER_BOX, "each side 324 × 414 pt");
});

test("Q18: built, every flyer PDF has two pages, each 324 × 414 pt; the tent card's one", { skip: NO_CHROME }, async () => {
  assert.deepEqual(await twoSidesProblems(ROOT), []);
});
