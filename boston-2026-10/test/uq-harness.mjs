// Shared by UQ1–UQ5 (SPEC-ui-and-copy-pass.md § 2, round 2 changeset 1 of the Advisor's UI and copy pass, 2026-10-25:
// who it is for first, the goal last, the portion-size helper beside it). Not a test file itself. The cases are numbered
// by § 2's items (UQ5 is item 6's case for the footnote's date, which item 5 changes). The pages are the site's own
// builds, the production page (`npm run build`, data/save.json as committed) and the development page (`--env dev`),
// each with the version-2 fixture week (test/fixtures/picks-v2/, invented names: a cart for every answer set, snacks
// for every day) in its #picks-data as the Workers put the bucket's, built from a copy of data/plans.json with snacks
// shown (ms-harness pageOf with SNACKS_SHOWN), so all four meal questions are on the page; each run as a browser runs it
// (cc-harness openPlanPage, through ms-harness open: the clock inside the fixture week's window).
// ⭐ The expectations are the CONTRACT's, written here from § 2 (the order, the heading, the answers), never read back
// from the page.
import { hiddenInTree } from "./cc-harness.mjs";
import { pageOf, SNACKS_SHOWN, V2_DIR } from "./ms-harness.mjs";
import { readingOrder } from "./save-end-fixture.mjs";

/** § 2 item 2: the first question, its heading (the tabs' own accessible name until § 2) and its two answers, the
 *  individual plan ("Just me") the default, on the left (SPEC-meal-selection § 12's rule), Family ("Me and my family") on
 *  the right. The words are the Advisor's, ruled 2026-10-25 (§ 2.1: item 7's first question). */
export const WHO = { heading: "Who is this for?", answers: ["individual", "family"], words: { individual: "Just me", family: "Me and my family" } };

/** § 2 item 1: the five questions' headings, by id, in the page's order: who it is for, the four meal questions in
 *  today's order (lunch or dinner, weekends, breakfast, snacks), and the goal last. */
export const ORDER = ["q-who", "q-lunch_dinner", "q-weekends", "q-breakfast", "q-snacks", "q-goal"];

/** The goal question's heading on each build: production's, and the development page's (Flow 2 reframed as a meal
 *  size, SPEC-rung4 § 2), the same question in the same place. */
export const GOAL_HEADING = { production: "What's your goal?", development: "Meal size" };

/** § 2 item 4: the disclosure's words are the calculator's own heading, as it has always read (the Advisor, 2026-10-25:
 *  "I'm fine keeping it whatever copy we have"), and the contract's working title is a phrase the page never prints. */
export const CALCULATOR_TITLE = "What share of my day is that?";
export const NOT_A_PHRASE = "Find my portion size";

/** § 2.1 (the Advisor, 2026-10-25, through the orchestrator): the Family section says it serves a family of 3–4, from
 *  data/plans.json's `family.servings`. */
export const SERVES = (servings) => `Serves a family of ${servings.min}–${servings.max}.`;

let built = null;
/** The two builds' pages (built once per file). */
export const pages = () =>
  (built ??= (async () => ({
    production: await pageOf({ picks: V2_DIR, snacks: SNACKS_SHOWN }),
    development: await pageOf({ target: "dev", picks: V2_DIR, snacks: SNACKS_SHOWN }),
  }))());

/** Every element of the page in document order (linkedom's querySelectorAll walks it so). */
export const inOrder = (document) => [...document.querySelectorAll("*")];

/** What the first question shows: whether it is shown, its answers in order, and which is pressed. */
export function whoOf(page) {
  const group = page.document.getElementById("who");
  const buttons = group ? [...group.querySelectorAll("[data-who]")] : [];
  return {
    shown: Boolean(group) && !hiddenInTree(group),
    answers: buttons.map((b) => b.getAttribute("data-who")),
    pressed: buttons.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.getAttribute("data-who")),
  };
}

/** Press the first question's answer `a` (a visitor's click). */
export function choose(page, a) {
  const b = page.document.querySelector(`#who [data-who="${a}"]`);
  if (!b) throw new Error(`the page has no answer ${a} to the first question (#who [data-who="${a}"])`);
  b.click();
}

/** The first displayed element a visitor reads after `node` and outside it. */
export function readAfter(page, node) {
  const read = readingOrder(page.document.body);
  const inside = (n) => {
    for (let m = n; m; m = m.parentElement) if (m === node) return true;
    return false;
  };
  const last = read.findLastIndex(inside);
  return last >= 0 ? read.slice(last + 1).find((n) => !inside(n)) ?? null : null;
}
