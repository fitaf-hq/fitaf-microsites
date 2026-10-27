// EM-A1 (SPEC-analytics.md § 16 items 1 and 5): the offer page in Miniflare for each kind (a stored save with its offer
// live, ended, an unknown code, no offer current): its script sends exactly one `offer` with that `kind` and the save's
// event id, and the payload holds neither the code (with and without its hyphen) nor `/o/`; the script reads no part of
// the page's address and sends nothing else (no `leave`, no `error`). And the sender is the plan page's (§ 4: one call
// site; § 16 item 1: "⛔ no second transport"): the offer page's analytics script is the plan page's byte for byte, and
// the Worker's copy of it is derived (`npm run worker:script`). The checks are em-a-checks.mjs's, which the mutant "the
// offer page's script reading location" runs on a mirror.
import test from "node:test";
import assert from "node:assert/strict";
import { offerPageProblems, offerPages, senderProblems } from "./em-a-checks.mjs";

const pages = await offerPages();

test("EM-A1: each offer page sends exactly one offer, its kind and the save's event id, no code, no /o/, and reads no address", async () => {
  assert.deepEqual(await offerPageProblems(undefined, pages), []);
});

test("EM-A1: the offer page's sender is the plan page's analytics script, byte for byte, and the Worker's copy of it is derived", async () => {
  assert.deepEqual(await senderProblems(undefined, pages), []);
});
