// QE12 (SPEC-print-pieces.md § 11 item 5's Q12; the name Q12 is § 8's, see qe-checks.mjs): the three events load,
// `demo` first. data/events.json is § 11 item 1's three entries, word for word, `demo` as it was; every reader of the
// first event still reads `demo` (the mock-ups' default, the development page at `/`, the save step's built-in id, the
// Worker harness's); and the Worker's id check (SPEC-rung4-save-offer.md § 3) knows the three and refuses any other.
import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { EVENTS_PATH, loadJson } from "../build.mjs";
import { loadInputs, MOCKUPS_DIR } from "../mockups/inputs.mjs";
import { EVENT_IDS, SaveError, validateSave } from "../src/worker/validate-save.js";
import { EXPECTED_EVENTS, ON } from "./qe-checks.mjs";
import { EVENT_ID, IN_ZIP } from "./worker-harness.mjs";

test("QE12: data/events.json holds § 11's three events, demo first, word for word", async () => {
  const events = await loadJson(EVENTS_PATH);
  assert.deepEqual(events, EXPECTED_EVENTS);
  for (const e of events) assert.match(e.id, /^[a-z0-9-]+$/, `${e.id}: the build's id rule`);
});

test("QE12: every reader of the first event still reads demo", async () => {
  const inputs = await loadInputs({ photosDir: join(MOCKUPS_DIR, "no-such-folder"), today: ON });
  assert.equal(inputs.data.events[inputs.eventIndex].id, "demo", "the mock-ups' default (the first event)");
  assert.equal(EVENT_ID, "demo", "the Worker harness's event (the first)");
});

test("QE12: the Worker's id check knows the three, and still refuses an id outside data/events.json", () => {
  assert.deepEqual([...EVENT_IDS].sort(), ["boston", "demo", "seminar"]);
  const body = (event_id) => ({ kind: "offer", email: "dummy-0001@example.com", zip: IN_ZIP, consent_marketing: false, event_id, wording_version: "v0.3-draft" });
  for (const id of ["demo", "boston", "seminar"]) assert.equal(validateSave(body(id)).event_id, id, id);
  assert.throws(() => validateSave(body("boston-2026")), (err) => err instanceof SaveError && err.code === "event_unknown");
});
