// A8 (SPEC-analytics.md § 3, § 7): `leave` carries the visit's length in ms (≥ 0, the page's clock when it is left)
// and the deepest step reached (open · answer · result · click); it is sent on `pagehide`, or on `visibilitychange` to
// hidden, once.
import test from "node:test";
import assert from "node:assert/strict";
import { builtPage, openVisit, wholeVisit } from "./a-harness.mjs";

const leaves = (visit) => visit.beacons.filter((b) => b.body.event === "leave").map((b) => b.body);

test("A8: leave carries the length and the deepest step, at each depth", async () => {
  const html = await builtPage();
  const opened = openVisit(html, { clock: 300 });
  opened.at(9_000);
  opened.pagehide();
  assert.deepEqual(leaves(opened), [{ event: "leave", s: opened.beacons[0].body.s, length_ms: 9_000, step: "open" }]);

  const answered = openVisit(html);
  answered.press(answered.document.querySelector('[data-goal="performance"]'));
  answered.at(12_345);
  answered.pagehide();
  assert.equal(leaves(answered)[0].step, "answer");
  assert.equal(leaves(answered)[0].length_ms, 12_345);

  const resulted = openVisit(html, { hash: "#lean-7" });
  resulted.at(20_000);
  resulted.pagehide();
  assert.equal(leaves(resulted)[0].step, "result", "a fragment that opens a result reaches the result");

  const whole = wholeVisit(html);
  assert.deepEqual(leaves(whole).map((l) => [l.step, l.length_ms]), [["click", 42_500]]);
});

test("A8: leave is sent once: hidden, then the page left", async () => {
  const visit = openVisit(await builtPage());
  visit.at(1_000);
  visit.hide();
  visit.at(2_000);
  visit.pagehide();
  assert.equal(leaves(visit).length, 1);
  assert.equal(leaves(visit)[0].length_ms, 1_000, "the first of the two");
  assert.ok(leaves(visit)[0].length_ms >= 0);
});
