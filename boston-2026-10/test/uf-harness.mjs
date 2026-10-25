// Shared by UF1–UF5 (SPEC-ui-and-copy-pass.md § 2.2, Family's own questions, the Advisor 2026-10-25: "for Family, the goal
// does *not* apply … Family *is* effectively a goal size. For now, let's simplify it to just "lunch OR dinner"/"lunch AND
// dinner" and menu choice"; "Let's do 5 or 10 meal a week please"). Not a test file itself. The pages are uq-harness's:
// both builds with the version-2 fixture week (a cart for every answer set) in their #picks-data, run as a browser runs
// them. ⭐ The expectations are the CONTRACT's, written here from § 2.2, never read back from data/plans.json.
import { hiddenInTree } from "./cc-harness.mjs";

/** § 2.2 items 1–2: Family's one question's answers, and what each comes to: 5 family meals a week for *or*, 10 for
 *  *and*, each on the store's one Family product (mpid 35) at $38.00 a meal. */
export const FAMILY_MPID = 35;
export const FAMILY_CENTS = 3800;
export const FAMILY_MEALS = { or: 5, and: 10 };
/** § 2.2 item 3: the cart each answer takes, as the individual 5- and 10-meal carts choose theirs: lunch or dinner on
 *  weekdays (5), lunch and dinner on weekdays (10), no breakfast, no snacks. */
export const FAMILY_CART = { or: "or-5d", and: "and-5d" };

/** "$1,234.50", as the page writes money (computed here on its own). */
export const dollars = (cents) => `$${Math.floor(cents / 100).toLocaleString("en-US")}.${String(cents % 100).padStart(2, "0")}`;

/** Family's question as the page shows it: whether it is shown, its answers in order, which is pressed. */
export function familyOf(page) {
  const group = page.document.getElementById("family-question");
  const buttons = group ? [...group.querySelectorAll("[data-family]")] : [];
  return {
    shown: Boolean(group) && !hiddenInTree(group),
    answers: buttons.map((b) => b.getAttribute("data-family")),
    pressed: buttons.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.getAttribute("data-family")),
  };
}

/** Press Family's answer `a` (a visitor's click). */
export function answerFamily(page, a) {
  const b = page.document.querySelector(`#family-question [data-family="${a}"]`);
  if (!b) throw new Error(`the page has no Family answer ${a} (#family-question [data-family="${a}"])`);
  b.click();
}
