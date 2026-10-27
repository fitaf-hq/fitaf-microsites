// The checks of F1–F3 (SPEC-analytics.md § 13: Family counted, and the first question), as functions over a PACKAGE
// (`root`: this one, or a mirror of it), each returning one line per thing the package gets wrong ([] when it is right).
// The cases run them on this package; the mutants (af-mutants.test.mjs) run THE SAME checks on a mirror carrying one
// mutation each. Not a test file itself. Every expectation is the contract's, written here, never read back from the code
// under test; what is read from the code is the Worker's own check, `checkedEvent` (§ 13 item 5: each event "accepted by
// `checkedEvent`, the Worker's own check, not a copy of it"), and its vocabulary, `QUESTIONS`, which F1 holds equal to the
// page's buttons.
//
// The page is run in a-harness.mjs's stub window (openVisit), its build the package's own (builtPage, no week).
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { ROOT } from "../build.mjs";
import { builtPage, openVisit, pageChoices, S1 } from "./a-harness.mjs";

/** § 13 item 1: Family's mpid, "which today is 35" (data/plans.json's family.counts, de-duplicated). */
export const FAMILY_MPID = 35;
/** The two targets whose built pages F1 reads (§ 13 item 5: "on both targets' built pages"). */
export const TARGETS = ["prod", "dev"];

/** The Worker of the package at `root`: src/worker/beacon.js, its check and its vocabulary. */
const workerAt = (root) => import(pathToFileURL(join(root, "src", "worker", "beacon.js")).href);

/** F1 (§ 13 item 4): on each target's built page, every `button.choice` carries exactly one of the attributes the page's
 *  script reads (a button that does not is named), and the (question, answer) pairs they offer equal the Worker's
 *  vocabulary in both directions: every pair offered is accepted by checkedEvent, and every pair of the Worker's
 *  QUESTIONS is offered. Control: the page offers the four kinds of question at all. */
export async function everyQuestionProblems(root = ROOT) {
  const problems = [];
  const { checkedEvent, QUESTIONS } = await workerAt(root);
  for (const target of TARGETS) {
    const { answers, unread } = pageChoices(await builtPage({ root, target }));
    for (const line of unread) problems.push(`${target}: ${line}`);
    const offered = Object.entries(answers).flatMap(([question, list]) => list.map((answer) => [question, answer]));
    for (const question of ["goal", "lunch_dinner", "who", "family"]) {
      if (!answers[question]?.length) problems.push(`${target}: control: the page offers no ${question} answer`);
    }
    for (const [question, answer] of offered) {
      if (!checkedEvent({ event: "answer", s: S1, question, answer })) problems.push(`${target}: offered, and refused by the Worker: ${question} ${answer}`);
    }
    for (const [question, list] of Object.entries(QUESTIONS)) {
      for (const answer of list) {
        if (!answers[question]?.includes(answer)) problems.push(`${target}: accepted by the Worker, and offered by no button: ${question} ${answer}`);
      }
    }
  }
  return problems;
}

/** A beacon as the cases compare it: its event and the contract's fields (§ 3), never `s` or a time (exported for
 *  sv-checks.mjs, § 14). */
const COMPARED = ["question", "answer", "key", "link", "mpid", "step"];
export const compared = (body) => Object.fromEntries([["event", body.event], ...COMPARED.filter((k) => k in body).map((k) => [k, body[k]])]);
export const show = (body) => [body.event, ...COMPARED.filter((k) => k in body).map((k) => body[k])].join(" ");

/** A visit on the page `html`: opened, each of `presses` (a selector) pressed in turn, the result card's order link
 *  pressed, the page left. Returns the visit. */
function visitOf(html, presses) {
  const visit = openVisit(html, { clock: 400 });
  visit.at(5_000);
  for (const selector of presses) visit.press(visit.document.querySelector(selector));
  visit.at(41_000);
  visit.press("result-cta");
  visit.at(42_500);
  visit.pagehide();
  return visit;
}

/** One line per thing wrong with `visit`: a storage API touched, a script that threw, a beacon the Worker's own check
 *  refuses, and its beacons (compared) unequal to `want`. */
function visitProblems(label, visit, want, checkedEvent) {
  const problems = [];
  for (const name of visit.touched) problems.push(`${label}: touched ${name}`);
  for (const error of visit.errors) problems.push(`${label}: a script threw: ${error.message}`);
  for (const { body } of visit.beacons) if (!checkedEvent(body)) problems.push(`${label}: refused by the Worker's own check: ${show(body)}`);
  const got = visit.beacons.map((b) => compared(b.body));
  if (!isDeepStrictEqual(got, want)) {
    problems.push(`${label}: sent ${got.map(show).join(" · ") || "nothing"}; the contract's: ${want.map(show).join(" · ")}`);
  }
  return problems;
}

/** A whole Family visit's events (§ 13 item 5, F2 and F3), its answer to Family's one question `ld`, whose cart is `key`. */
const familyVisit = (ld, key) => [
  { event: "open" },
  { event: "answer", question: "who", answer: "family" },
  { event: "answer", question: "family", answer: ld },
  { event: "result", key, mpid: FAMILY_MPID },
  { event: "click", link: "order", mpid: FAMILY_MPID },
  { event: "leave", step: "click" },
];

/** F2 (`ld` "or") and F3's Family half (`ld` "and"): a whole Family visit in the page's stub. Open, *Me and my family*,
 *  Family's answer `ld`, the result shown, the result card's order link, leave: it sends open, answer who/family, answer
 *  family/<ld>, result (<ld>-5d, 35), click (order, 35) and leave (step click), each accepted by checkedEvent. */
export async function familyVisitProblems(root = ROOT, ld = "or") {
  const { checkedEvent } = await workerAt(root);
  const visit = visitOf(await builtPage({ root }), ["#who-family", `[data-family="${ld}"]`]);
  return visitProblems(`a Family visit, ${ld}`, visit, familyVisit(ld, `${ld}-5d`), checkedEvent);
}

/** The individual path of F3: a goal and the meal questions answered, as A2's visit (a-harness wholeVisit) answers them. */
const INDIVIDUAL_PRESSES = ['[data-goal="lean"]', '[data-q="lunch_dinner"][data-a="or"]', '[data-q="weekends"][data-a="no"]', '[data-q="breakfast"][data-a="yes"]'];

/** F3's other half: *Just me* (the answer the page starts on, pressed again) then a goal: today's path unchanged apart
 *  from the added `who` answer. The visit with the press sends exactly the events of the same visit without it (the
 *  control: open, the four answers, a result, the click, the leave, and no `who`), with answer who/individual added after
 *  `open`; every event of both accepted by checkedEvent. */
export async function justMeProblems(root = ROOT) {
  const { checkedEvent } = await workerAt(root);
  const html = await builtPage({ root });
  const today = visitOf(html, INDIVIDUAL_PRESSES);
  const before = today.beacons.map((b) => compared(b.body));
  const problems = [];
  for (const [event, n] of [["open", 1], ["answer", 4], ["result", 1], ["click", 1], ["leave", 1]]) {
    const sent = before.filter((b) => b.event === event).length;
    if (sent < n) problems.push(`control: the visit without Just me sent ${sent} ${event}, not at least ${n}`);
  }
  if (before.some((b) => b.question === "who")) problems.push(`control: the visit without Just me sent a who answer`);
  problems.push(...visitProblems("the visit without Just me", today, before, checkedEvent));
  const want = [before[0], { event: "answer", question: "who", answer: "individual" }, ...before.slice(1)];
  problems.push(...visitProblems("Just me, then a goal", visitOf(html, ["#who-individual", ...INDIVIDUAL_PRESSES]), want, checkedEvent));
  return problems;
}
