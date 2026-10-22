// AJ4 (SPEC-analytics.md § 11 items 1, 2 and 4): the --json document holds no field but the shape's. A check that walks
// the document (aj-checks.mjs walkProblems): the keys of the document, of a day (with data and without), of a funnel
// step and of a length or load exactly the shape's; every count a number; each split's keys from its vocabulary (§ 10's
// table; a country two characters or ""); a length or load with no visits null; the dataset one of § 6's. So the
// document can hold nothing per visit (§ 11 item 2): every string in it is from a closed list or a date. Run on every
// answer set of aj-checks.mjs's runs(); and, its control, the walk refuses documents that break the shape.
import test from "node:test";
import assert from "node:assert/strict";
import { FIXTURE_DOCUMENT, shapeProblems, walkProblems } from "./aj-checks.mjs";

test("AJ4: the --json document holds no field but § 11's shape", async () => {
  assert.deepEqual(await shapeProblems(), []);
});

test("AJ4 (control): the walk passes the shape and refuses what breaks it", () => {
  assert.deepEqual(walkProblems(FIXTURE_DOCUMENT), [], "the fixture's document, written by hand, is the shape");
  const day = () => structuredClone(FIXTURE_DOCUMENT.days[0]);
  const doc = (edit) => {
    const d = structuredClone(FIXTURE_DOCUMENT);
    edit(d);
    return d;
  };
  const broken = [
    ["a field at the top", doc((d) => (d.rows = 3))],
    ["a visit id on a day", doc((d) => (d.days[0].s = "0123456789abcdef"))],
    ["a field on a day of no data", doc((d) => (d.days[2].visitors = 0))],
    ["a funnel step with a visitor id", doc((d) => (d.days[0].funnel[0].v = "0123456789abcdef"))],
    ["a funnel step outside § 5's", doc((d) => d.days[0].funnel.push({ step: "leave", visits: 13 }))],
    ["a split key outside its vocabulary", doc((d) => (d.days[0].device["Mozilla/5.0"] = 1))],
    ["a country that is an address", doc((d) => (d.days[0].country["203.0.113.7"] = 1))],
    ["a count as text", doc((d) => (d.days[0].visitors = "12"))],
    ["a length over no visits not null", doc((d) => (d.days[0].visit_length_ms = { q1: 0, median: 0, q3: 0, n: 0 }))],
    ["a quartile field outside the shape", doc((d) => (d.days[0].load_ms.mean = 800))],
    ["a day missing a field", doc((d) => delete d.days[1].errors)],
    ["a day with data not true", doc((d) => (d.days[0] = { ...day(), data: "yes" }))],
    ["a dataset outside § 6's", doc((d) => (d.dataset = "salt:2026-10-23"))],
  ];
  for (const [label, d] of broken) assert.ok(walkProblems(d).length > 0, `the walk refuses ${label}`);
});
