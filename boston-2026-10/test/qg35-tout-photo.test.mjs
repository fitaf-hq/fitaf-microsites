// QG35 (SPEC-print-pieces.md § 17.2 items 3–4, "a case for item 3"; test/qg-checks.mjs): the tout's photo is not one the
// printed set uses. By rule (print/assign.mjs toutPhoto, fixture rungs, no Chrome): the first in the assigner's order not
// ruled out, landscape and 300 ppi at the tout's window; none free, the best, said; none fits, refused. Built (fixture
// photos): none the build places and none the --tout-avoid file names; the report names it and every id ruled out.
import test from "node:test";
import assert from "node:assert/strict";
import { ROOT } from "../build.mjs";
import { NO_CHROME } from "./print-fixtures.mjs";
import { toutPhotoBuildProblems, toutPhotoRuleProblems } from "./qg-checks.mjs";

test("QG35: the tout's photo by rule: the next in the assigner's order not ruled out, landscape and 300 ppi; else the best, said", async () => {
  assert.deepEqual(await toutPhotoRuleProblems(ROOT), []);
});

test("QG35: built, the tout's photo is none the set places and none --tout-avoid names; the report names them", { skip: NO_CHROME }, async () => {
  assert.deepEqual(await toutPhotoBuildProblems(ROOT), []);
});
