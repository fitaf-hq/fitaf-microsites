import test from "node:test";
import { renderPage } from "../build.mjs";
import { assertSignature14Is29, loadPlans } from "./helpers.mjs";

test("T3: Signature 14 links to mpid=29, not 28 (the out-of-order pair)", async () => {
  assertSignature14Is29(await renderPage(await loadPlans()));
});
