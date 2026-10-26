// F3 (SPEC-analytics.md § 13 item 5): F2 for *lunch and dinner* (and-5d, 35); and *Just me* then a goal, which shows
// today's path is unchanged apart from the added `who` answer: the visit with *Just me* pressed (the answer the page
// starts on: § 13 item 2, "a press of the answer already chosen is sent too") sends the events of the same visit without
// it, answer who/individual added after `open`. Every event accepted by `checkedEvent`, the Worker's own check.
import test from "node:test";
import assert from "node:assert/strict";
import { familyVisitProblems, justMeProblems } from "./af-checks.mjs";

test("F3 (analytics § 13): a Family visit, lunch and dinner, sends its answers, its result and its click, each accepted", async () => {
  assert.deepEqual(await familyVisitProblems(undefined, "and"), []);
});

test("F3 (analytics § 13): Just me, then a goal: today's path with the who answer added, each event accepted", async () => {
  assert.deepEqual(await justMeProblems(), []);
});
