// A2 (SPEC-analytics.md § 1.1, § 7): nothing is stored on the device. A stub window whose storage APIs (localStorage,
// sessionStorage, indexedDB, document.cookie) throw if touched; a whole visit on the built page (open, the goal and
// Q1–Q3 answered, the result shown, the order link pressed, the page left) touches none. The check is a-checks.mjs's,
// which the mutant "localStorage used for s" runs on a mirror (a-mutants.test.mjs).
import test from "node:test";
import assert from "node:assert/strict";
import { storageProblems } from "./a-checks.mjs";
import { builtPage, openVisit } from "./a-harness.mjs";

test("A2: a whole visit touches no storage API, and sends its beacons", async () => {
  assert.deepEqual(await storageProblems(), []);
});

test("A2 (control): the stub catches a script that touches storage", async () => {
  const html = (await builtPage()).replace("</body>", "<script>window.sessionStorage.getItem('x');</script></body>");
  const visit = openVisit(html);
  assert.deepEqual(visit.touched, ["sessionStorage"]);
});
