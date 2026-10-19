// A7 (SPEC-analytics.md § 2, § 3, § 7): one visit's events carry one `s`, a random id made in the page's memory at
// load; a second load of the page (a reload is a new visit) carries another. Every beacon goes to /a, one event each.
import test from "node:test";
import assert from "node:assert/strict";
import { BEACON, builtPage, openVisit, VISIT_ID, wholeVisit } from "./a-harness.mjs";

test("A7: one visit's events carry one s; the next load another", async () => {
  const html = await builtPage();
  const first = wholeVisit(html);
  const second = wholeVisit(html);
  assert.ok(first.beacons.length >= 8, `control: the visit sent its events (${first.beacons.length})`);
  for (const visit of [first, second]) {
    const ids = new Set(visit.beacons.map((b) => b.body.s));
    assert.equal(ids.size, 1, `one s per visit: ${[...ids].join(", ")}`);
    assert.match([...ids][0], VISIT_ID, "16 hex digits");
    for (const b of visit.beacons) assert.equal(b.url, BEACON, "each to /a");
  }
  assert.notEqual(first.beacons[0].body.s, second.beacons[0].body.s, "a reload is a new visit");
});

test("A7: the visit's events in order, each from § 3's list, at most 20", async () => {
  const visit = wholeVisit(await builtPage());
  const events = visit.beacons.map((b) => b.body.event);
  assert.equal(events[0], "open");
  assert.equal(events.at(-1), "leave");
  assert.deepEqual(
    visit.beacons.filter((b) => b.body.event === "answer").map((b) => [b.body.question, b.body.answer]),
    [["goal", "lean"], ["lunch_dinner", "or"], ["weekends", "no"], ["breakfast", "yes"]],
    "the four answers by the page's own ids",
  );
  assert.ok(events.length <= 20);
  for (const e of events) assert.ok(["open", "answer", "result", "click", "leave", "error"].includes(e), e);
});

test("A7: a visit that answers without end sends at most 20 events, the last its leave", async () => {
  const html = await builtPage();
  const visit = wholeVisit(html);
  const busy = openVisit(html);
  for (let i = 0; i < 40; i++) busy.press(busy.document.querySelector(`[data-goal="${i % 2 ? "lean" : "signature"}"]`));
  busy.pagehide();
  assert.equal(busy.beacons.length, 20, `20 events (${busy.beacons.length})`);
  assert.equal(busy.beacons.at(-1).body.event, "leave", "the leave is kept");
  assert.ok(visit.beacons.length < 20, "control: an ordinary visit is under the cap");
});
