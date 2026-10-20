// PV1 (SPEC-preview-sites.md § 1 item 2, § 4): a preview file builds a page whose every store link is absent and whose
// controls are disabled. The page `npm run build -- --env preview` writes holds no fitafnutrition.com URL at all and no
// link with an href (the grid's six cells and Family's button shown disabled), and no beacon or rung 4; the content the
// preview content command makes from the fixture's preview file carries no address; and the page served with it, run
// as a browser runs it, offers no link at load and at every fragment, while the week's Chef's Choice card IS filled in.
// Its mutant (a store link left in the preview page) is in pv-mutants.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { linkProblems } from "./pv-checks.mjs";

test("PV1: the preview page holds no store URL, no link leads anywhere, every control is disabled, the card filled in", async () => {
  assert.deepEqual(await linkProblems(), []);
});
