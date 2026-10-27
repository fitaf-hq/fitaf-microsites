// RD4b (SPEC-the-redirect.md § 10 items 2 and 3): a Cubot phone is a person. With the var set, a GET "/" from each of two
// real-shaped user agents of a Cubot phone (a maker whose name holds the letters "bot") is the 302 and one data point, a
// phone; each program the list names (Googlebot, bingbot, Slackbot, Twitterbot, facebookexternalhit, curl, a headless
// Chrome, and RD4's one sample of each kind) still the same 302 and nothing written. Both Workers. The check is
// rd-checks.mjs's, which the mutant "the list back to bot" runs on a mirror.
import test from "node:test";
import assert from "node:assert/strict";
import { cubotProblems } from "./rd-checks.mjs";

test("RD4b: a Cubot phone's redirect is counted; every program the list names still is not", async () => {
  assert.deepEqual(await cubotProblems(), []);
});
