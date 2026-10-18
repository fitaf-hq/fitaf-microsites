// A10 (SPEC-analytics.md § 3, § 7): `error`, the first uncaught script error of the visit, carries `s` only: never
// the message or the stack. A second error sends nothing more. (The Worker refuses an error carrying either: A3.)
import test from "node:test";
import assert from "node:assert/strict";
import { builtPage, openVisit } from "./a-harness.mjs";

test("A10: error carries no message or stack, once a visit", async () => {
  const visit = openVisit(await builtPage());
  const secret = new Error("A10-secret-message at someone@example.com");
  secret.stack = "Error: A10-secret-message\n    at A10-secret-frame (https://eatfitaf.com/:1:1)";
  visit.fail(secret);
  visit.fail(new Error("A10-second"));
  const errors = visit.beacons.filter((b) => b.body.event === "error");
  assert.equal(errors.length, 1, "the first error only");
  assert.deepEqual(errors[0].body, { event: "error", s: visit.beacons[0].body.s });
  for (const b of visit.beacons) assert.doesNotMatch(b.data, /A10-|secret|example\.com/, "no message or stack in any beacon");
});

test("A10: a script that throws on the page is reported as error", async () => {
  const html = (await builtPage()).replace("</body>", "<script>undefined.call();</script></body>");
  const visit = openVisit(html);
  assert.equal(visit.errors.length, 1, "control: the script threw");
  assert.deepEqual(visit.beacons.filter((b) => b.body.event === "error").map((b) => Object.keys(b.body)), [["event", "s"]]);
});
