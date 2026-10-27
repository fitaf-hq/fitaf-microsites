// The checks of SV1 and SV2 (SPEC-analytics.md § 14: a saved offer counted), as functions over a PACKAGE (`root`: this
// one, or a mirror of it), each returning one line per thing the package gets wrong ([] when it is right). The cases run
// them on this package; the mutants (sv-mutants.test.mjs) run THE SAME checks on a mirror carrying one mutation each. Not
// a test file itself. Every expectation is the contract's, written here, never read back from the code under test; what
// is read from the code is the Worker's own check, `checkedEvent` (§ 14 item 4: `save` "accepted by `checkedEvent`").
//
// The page is the package's own build with the fixture week in it (a-harness builtPage, `week`: the card's checkout and
// its Not ready? are drawn only beside a week's cart), run in a-harness.mjs's stub window (openVisit), its clock at
// page-sim's PAGE_NOW_MS (a day of the Boston offer), the save step's two outside services stood in for (uc-harness
// saveStubs: Turnstile, and the Worker's /api/save answering as a case says). Both targets carry the save step.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { ROOT } from "../build.mjs";
import { builtPage, openVisit, S1, startBeacon, VISIT_ID } from "./a-harness.mjs";
import { compared, show } from "./af-checks.mjs";
import { PAGE_NOW_MS } from "./page-sim.mjs";
import { IN_ZIP, NEAR_ZIP, saveStubs, settle } from "./uc-harness.mjs";

/** The two targets, each carrying the save step (the production build as committed, data/save.json `production` true). */
export const TARGETS = ["prod", "dev"];
/** § 14 item 1: the event, and that it carries `s` alone. */
export const SAVE = "save";
const SAVE_KEYS = ["event", "s"];

/** The Worker of the package at `root`: src/worker/beacon.js, its check. */
const workerAt = (root) => import(pathToFileURL(join(root, "src", "worker", "beacon.js")).href);

/** The visit's answers: Lean, lunch or dinner, every day, no breakfast (or-7d on the 7-meal plan), the fixture week's
 *  7-meal cart, so the card's checkout and Not ready? beside it are drawn. */
const PRESSES = ['[data-goal="lean"]', '[data-q="lunch_dinner"][data-a="or"]', '[data-q="weekends"][data-a="yes"]', '[data-q="breakfast"][data-a="no"]'];

/** The step's two fields filled and Save my offer pressed (its form submitted), then the page's promise chains settled. */
async function submit(visit, { email = "dummy-sv@example.com", zip = IN_ZIP } = {}) {
  visit.el("save-email").value = email;
  visit.el("save-zip").value = zip;
  const event = visit.document.createEvent("Event");
  event.initEvent("submit", true, true);
  visit.el("save-form").dispatchEvent(event);
  await settle();
}

/**
 * A whole visit through the save step on `html`: opened, the answers pressed, Not ready? pressed (the save step's dialog),
 * then `act(visit)` (the visitor's save, or nothing), then the page left. `stubs` are saveStubs' options; `pending` makes
 * /api/save never answer (the save still being checked). Returns the visit, the requests to /api/save and whether the
 * step was drawn beside the checkout before the save (a control).
 */
async function stepVisit(html, { stubs = {}, pending = false, act = async () => {} } = {}) {
  const { globals, fetches } = saveStubs(stubs);
  if (pending) {
    globals.fetch = (url, init) => {
      fetches.push({ url, init });
      return new Promise(() => {});
    };
  }
  const visit = openVisit(html, { clock: 400, date: PAGE_NOW_MS, globals });
  visit.at(5_000);
  for (const selector of PRESSES) visit.press(visit.document.querySelector(selector));
  const drawn = !visit.el("not-ready").hidden && !visit.el("save").hidden;
  visit.press("not-ready");
  visit.at(30_000);
  await act(visit);
  visit.at(60_000);
  visit.pagehide();
  return { visit, fetches, drawn };
}

/** The kind each request to /api/save named (`offer`, `expansion`). */
const kinds = (fetches) => fetches.map((f) => JSON.parse(f.init.body).kind);

/** One line per thing wrong with any visit: a storage API touched, a script that threw, a beacon the Worker's own check
 *  refuses. */
function visitProblems(label, visit, checkedEvent) {
  const problems = [];
  for (const name of visit.touched) problems.push(`${label}: touched ${name}`);
  for (const error of visit.errors) problems.push(`${label}: a script threw: ${error.message}`);
  for (const { body } of visit.beacons) if (!checkedEvent(body)) problems.push(`${label}: refused by the Worker's own check: ${show(body)}`);
  return problems;
}

/** The visit with no save (the step opened, nothing typed): its beacons, compared, and its problems. The control both
 *  cases compare with: it sends `open` … `leave` and no `save`. */
async function withoutSave(html, where, checkedEvent) {
  const { visit, drawn } = await stepVisit(html);
  const problems = visitProblems(`${where}, no save`, visit, checkedEvent);
  if (!drawn) problems.push(`${where}, no save: control: the save step was not drawn beside the card's checkout`);
  const events = visit.beacons.map((b) => compared(b.body));
  for (const [event, n] of [["open", 1], ["answer", 4], ["result", 1], ["leave", 1]]) {
    const sent = events.filter((b) => b.event === event).length;
    if (sent < n) problems.push(`${where}, no save: control: sent ${sent} ${event}, not at least ${n}`);
  }
  if (events.some((b) => b.event === SAVE)) problems.push(`${where}, no save: control: sent a save with nothing saved`);
  return { events, problems };
}

/**
 * SV1 (§ 14 items 1, 2 and 4): a whole visit in the page's stub whose save step's Worker answers an offer save as stored
 * (the answer ok, its JSON's ok true): it sends exactly the events of the same visit with no save (open … leave), with
 * one `save` added before the `leave`; the `save` carries `s` alone, the visit's own; the `leave`'s step is the same (a
 * save is not a step of the funnel); and every event, the `save` among them, is accepted by checkedEvent. On both
 * targets. Controls: the request named an offer save, and the step went to its done line.
 */
export async function storedSaveProblems(root = ROOT) {
  const { checkedEvent } = await workerAt(root);
  const problems = [];
  for (const target of TARGETS) {
    const html = await builtPage({ root, target, week: true });
    const before = await withoutSave(html, target, checkedEvent);
    problems.push(...before.problems);
    const label = `${target}, an offer save stored`;
    const { visit, fetches } = await stepVisit(html, { act: (v) => submit(v) });
    problems.push(...visitProblems(label, visit, checkedEvent));
    if (!isDeepStrictEqual(kinds(fetches), ["offer"])) problems.push(`${label}: control: /api/save asked ${JSON.stringify(kinds(fetches))}, not one offer save`);
    if (visit.el("save-done").hidden) problems.push(`${label}: control: the step did not reach its done line`);
    const saves = visit.beacons.filter((b) => b.body.event === SAVE).map((b) => b.body);
    if (saves.length !== 1) problems.push(`${label}: sent ${saves.length} save(s), not 1`);
    const s = visit.beacons[0]?.body.s;
    for (const body of saves) {
      if (!isDeepStrictEqual(Object.keys(body).sort(), [...SAVE_KEYS].sort())) problems.push(`${label}: the save carries ${JSON.stringify(Object.keys(body))}, not s alone`);
      if (body.s !== s || !VISIT_ID.test(String(body.s))) problems.push(`${label}: the save's s ${JSON.stringify(body.s)} is not the visit's ${JSON.stringify(s)}`);
    }
    const got = visit.beacons.map((b) => compared(b.body));
    const leave = before.events.findIndex((b) => b.event === "leave");
    const want = [...before.events.slice(0, leave), { event: SAVE }, ...before.events.slice(leave)];
    if (!isDeepStrictEqual(got, want)) problems.push(`${label}: sent ${got.map(show).join(" · ")}; the contract's: ${want.map(show).join(" · ")}`);
  }
  return problems;
}

/** § 3's data point layout (§ 10's table), written here: blob1–blob11 event, s, country, device, viewport, qr, question,
 *  answer, key, link, step, and since § 15 item 2 blob12 the visitor `v`; ⚠ since § 16 (2026-10-27) blob13 an offer
 *  page's kind and blob14 an open's via, "" on a save; double1–double3 load_ms, length_ms, mpid. */
const BLOB_COUNT = 14;
/** blob12, the visitor, by its place. */
const V_AT = 11;
const DOUBLE_COUNT = 3;

/** SV1, the Worker's half (§ 14 item 1: "the data point's layout is unchanged"): a `save` posted to production's Worker
 *  and the development Worker is a 204 and one data point, blob1 the event, blob2 the visit, the country and device the
 *  Worker's, blob12 a visitor `v` (§ 15 item 2), every other blob "" and every double 0, its index 16 hex digits (§ 15
 *  item 1: the point's own). */
export async function saveDataPointProblems(root = ROOT) {
  const problems = [];
  for (const entry of ["site", "index"]) {
    const site = await startBeacon({ root, entry });
    try {
      await site.log();
      const res = await site.post({ event: SAVE, s: S1 }, { country: "US" });
      const { points } = await site.log();
      if (res.status !== 204) problems.push(`${entry}: ${res.status}, not 204`);
      if (points.length !== 1) {
        problems.push(`${entry}: ${points.length} data point(s) written for a save, not 1`);
        continue;
      }
      const [point] = points;
      // The harness's user agent is an iPhone's (a-harness TEST_UA): the device class `phone`.
      const v = point.blobs?.[V_AT];
      const blobs = [SAVE, S1, "US", "phone", ...Array(V_AT - 4).fill(""), /^[0-9a-f]{16}$/.test(String(v)) ? v : "<a v>", ...Array(BLOB_COUNT - V_AT - 1).fill("")];
      if (!isDeepStrictEqual(point.blobs, blobs)) problems.push(`${entry}: blobs ${JSON.stringify(point.blobs)}, not ${JSON.stringify(blobs)}`);
      if (!isDeepStrictEqual(point.doubles, Array(DOUBLE_COUNT).fill(0))) problems.push(`${entry}: doubles ${JSON.stringify(point.doubles)}, not all 0`);
      if (point.indexes?.length !== 1 || !/^[0-9a-f]{16}$/.test(point.indexes[0])) problems.push(`${entry}: indexes ${JSON.stringify(point.indexes)}, not one of 16 hex digits`);
    } finally {
      await site.dispose();
    }
  }
  return problems;
}

/** SV2's visits (§ 14 item 1: "A save that fails, is refused or is still being checked sends nothing"; "An expansion save
 *  … sends nothing"), each `[label, options, control]`: `options` stepVisit's, `control(visit, fetches)` a problem line
 *  when the visit did not reach the state the label names, else null. */
const NOT_SAVED = (requests) => (visit, fetches) => {
  if (fetches.length !== requests) return `${fetches.length} request(s) to /api/save, not ${requests}`;
  if (!visit.el("save-done").hidden) return "the step reached its done line";
  return null;
};
const answered = (ok, json) => ({ stubs: { reply: { ok, json } }, act: (v) => submit(v) });
export const UNSAVED_VISITS = [
  ["an error (500, store_failed)", answered(false, { ok: false, error: "store_failed" }), NOT_SAVED(1)],
  ["the network failing", { stubs: { network: true }, act: (v) => submit(v) }, NOT_SAVED(1)],
  ["a refusal (429, rate_limited)", answered(false, { ok: false, error: "rate_limited" }), NOT_SAVED(1)],
  ["a refusal (403, turnstile_failed)", answered(false, { ok: false, error: "turnstile_failed" }), NOT_SAVED(1)],
  ["a refusal (400, email_invalid)", answered(false, { ok: false, error: "email_invalid" }), NOT_SAVED(1)],
  ["an answer ok whose JSON's ok is not true", answered(true, { ok: false }), NOT_SAVED(1)],
  ["an answer not ok whose JSON's ok is true", answered(false, { ok: true }), NOT_SAVED(1)],
  ["the page refusing the email (no request)", { act: (v) => submit(v, { email: "not-an-email" }) }, NOT_SAVED(0)],
  ["Turnstile failing (no request)", { stubs: { turnstile: "fail" }, act: (v) => submit(v) }, NOT_SAVED(0)],
  ["Turnstile not loaded (no request)", { stubs: { turnstile: null }, act: (v) => submit(v) }, NOT_SAVED(0)],
  [
    "still being checked (/api/save not answered)",
    { pending: true, act: (v) => submit(v) },
    (visit, fetches) => NOT_SAVED(1)(visit, fetches) ?? (visit.el("save-submit").disabled ? null : "the step is not busy"),
  ],
  [
    "an expansion save stored (out of area, then Tell me when you deliver here)",
    {
      act: async (v) => {
        await submit(v, { zip: NEAR_ZIP });
        v.press("save-expansion");
        await settle();
      },
    },
    (visit, fetches) => {
      if (!isDeepStrictEqual(kinds(fetches), ["expansion"])) return `/api/save asked ${JSON.stringify(kinds(fetches))}, not one expansion save`;
      return visit.el("save-expansion-done").hidden ? "the expansion's done line not shown" : null;
    },
  ],
];

/**
 * SV2 (§ 14 items 1 and 4): the same visit with its save answered with an error, with a refusal, never answered, refused
 * on the page, and an expansion save stored: no `save`, and exactly the events of the visit with no save; every event
 * accepted by checkedEvent. Each visit's control: it reached the state its label names. And SV2's own control, without
 * which "no save" would hold of a page that never sends one: the same visit answered as stored sends one.
 */
export async function unsavedProblems(root = ROOT) {
  const { checkedEvent } = await workerAt(root);
  const problems = [];
  for (const target of TARGETS) {
    const html = await builtPage({ root, target, week: true });
    const before = await withoutSave(html, target, checkedEvent);
    problems.push(...before.problems);
    for (const [name, options, control] of UNSAVED_VISITS) {
      const label = `${target}, ${name}`;
      const { visit, fetches } = await stepVisit(html, options);
      problems.push(...visitProblems(label, visit, checkedEvent));
      const missed = control(visit, fetches);
      if (missed) problems.push(`${label}: control: ${missed}`);
      const n = visit.beacons.filter((b) => b.body.event === SAVE).length;
      if (n) problems.push(`${label}: sent ${n} save(s), not none`);
      const got = visit.beacons.map((b) => compared(b.body));
      if (!n && !isDeepStrictEqual(got, before.events)) {
        problems.push(`${label}: sent ${got.map(show).join(" · ")}; the visit with no save: ${before.events.map(show).join(" · ")}`);
      }
    }
    const stored = await stepVisit(html, { act: (v) => submit(v) });
    const n = stored.visit.beacons.filter((b) => b.body.event === SAVE).length;
    if (n !== 1) problems.push(`${target}: control: the same visit answered as stored sent ${n} save(s), not 1`);
  }
  return problems;
}
