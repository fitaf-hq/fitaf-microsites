// F1 (SPEC-analytics.md § 13 items 4 and 5): A3 sees every question the page offers. On both targets' built pages, its
// reading takes every `button.choice` (a-harness pageChoices); each carries exactly one of the attributes the page's
// script reads (`data-goal`, `data-q` with `data-a`, `data-who`, `data-family`), and one that carries none fails the case
// by name; and the (question, answer) pairs they offer equal the Worker's vocabulary in both directions. So a future
// button of a kind the script does not read fails here before it ships. The check is af-checks.mjs's, which the mutant
// "A3's reading without data-family" (af-mutants.test.mjs) runs on a mirror.
// ⚠ Not the F1 of f1-flow-renders.test.mjs (the flow renders'): the cases of § 13 are af1–af4, beside the analytics' a*.
import test from "node:test";
import assert from "node:assert/strict";
import { everyQuestionProblems } from "./af-checks.mjs";

test("F1 (analytics § 13): every button.choice of both builds is read, and offers exactly the Worker's vocabulary", async () => {
  assert.deepEqual(await everyQuestionProblems(), []);
});
