// SL1 (SPEC-ui-and-copy-pass.md § 6 items 1, 2 and 4; the Advisor, 2026-10-26: a save my offer call to action on the
// store's checkout, a link to this page): the page opened at `#save` has the save dialog open after load, opened by its
// showModal as *Not ready?* opens it, the save step at its first state, OFFER, inside it, the page behind at its start
// (*Who is this for?* alone, neither answer pressed, no result), the fragment not rewritten; on both builds that carry the
// save step. And a save through that dialog is a save as every save: the same request as one through *Not ready?* (the
// page's own event: the store's link carries no `?e=`), the step at its done line. The checks are sl-checks.mjs's.
import test from "node:test";
import assert from "node:assert/strict";
import { linkOpensProblems, linkSaveProblems } from "./sl-checks.mjs";

test("SL1: opened at #save, the save dialog is open after load at OFFER, the page behind at its start, on both builds", async () => {
  assert.deepEqual(await linkOpensProblems(), []);
});

test("SL1: a save through the dialog #save opened asks /api/save as one through Not ready? does, and is done", async () => {
  assert.deepEqual(await linkSaveProblems(), []);
});
