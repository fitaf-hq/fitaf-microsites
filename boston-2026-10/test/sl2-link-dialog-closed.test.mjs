// SL2 (SPEC-ui-and-copy-pass.md § 6 items 1 and 4): the dialog `#save` opened, closed by its button (×), the backdrop or
// Esc (the browser's own close of a modal dialog; Esc itself is read in Chrome, tools/storybook), leaves the page at its
// start with no answer pressed and the fragment as it was; the step drawn nowhere, *Not ready?* hidden with no checkout;
// and the page then works as before (a checkout's *Not ready?* opens the step at OFFER). The check is sl-checks.mjs's.
import test from "node:test";
import assert from "node:assert/strict";
import { linkClosedProblems } from "./sl-checks.mjs";

test("SL2: the dialog #save opened, closed, leaves the page at its start with no answer pressed, on both builds", async () => {
  assert.deepEqual(await linkClosedProblems(), []);
});
