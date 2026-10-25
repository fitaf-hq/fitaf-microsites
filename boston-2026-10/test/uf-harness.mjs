// Shared by UF1–UF5 (SPEC-ui-and-copy-pass.md § 2.2, Family's own questions, the Advisor 2026-10-25: "for Family, the goal
// does *not* apply … Family *is* effectively a goal size. For now, let's simplify it to just "lunch OR dinner"/"lunch AND
// dinner" and menu choice"; "Let's do 5 or 10 meal a week please"). Not a test file itself. The pages are uq-harness's:
// both builds with the version-2 fixture week (a cart for every answer set) in their #picks-data, run as a browser runs
// them. ⭐ The expectations are the CONTRACT's, written here from § 2.2, never read back from data/plans.json.
import { scriptJson } from "../src/worker/script-json.js";
import { hiddenInTree, reportWith } from "./cc-harness.mjs";

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

/**
 * § 2.2's one change to a week's content: each cart Family takes that holds its count carries Family's link
 * (`links["35"]`, made by the link tool as every link is). A content file's bytes with those links taken out of every
 * cart, every list's, and how many were: what a tree before § 2.2 makes, byte for byte, when nothing else moved (the
 * content's own serialization, scriptJson, the key order kept).
 */
export function withoutFamilyLinks(bytes) {
  const data = JSON.parse(bytes.toString("utf8"));
  let taken = 0;
  for (const week of data.weeks ?? []) {
    for (const carts of [week.carts, ...(week.menus ?? []).map((m) => m.carts).filter(Boolean)]) {
      for (const cart of Object.values(carts ?? {})) {
        if (cart.links && Object.hasOwn(cart.links, String(FAMILY_MPID))) {
          delete cart.links[String(FAMILY_MPID)];
          taken++;
        }
      }
    }
  }
  return { bytes: Buffer.from(scriptJson(data), "utf8"), taken };
}

/** A content command's run ({ files, stdout } as MS-20, W4 and EM5c read it) with its data file's Family links taken out
 *  and its report's line for that file rewritten to match (cc-harness reportWith). Changes `run` in place. */
export function runWithoutFamilyLinks(run, dataFile = "week/picks-data.json") {
  if (!run.files[dataFile]) return run;
  const { bytes } = withoutFamilyLinks(run.files[dataFile]);
  run.files[dataFile] = bytes;
  run.stdout = reportWith(run.stdout, dataFile, bytes);
  return run;
}
