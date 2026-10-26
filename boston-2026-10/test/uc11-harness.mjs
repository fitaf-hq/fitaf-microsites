// Shared by UC11–UC13 (SPEC-ui-and-copy-pass.md § 4, round 2 changeset 2, the Advisor 2026-10-26: the questions revealed
// one by one, *Not ready?* opening the save step in a dialog, *Why Fit AF?* as a banner at the foot). Not a test file
// itself. The pages are the two builds that carry the page (D item 1), the development page and the production page
// with `production` true, each with the fixture week in its #picks-data as the Workers put the bucket's (uc-harness
// weekPage, approvedWeekPage: the version-1 fixture, a cart for 7 and for 14 meals, no snack list), and S20's page, the
// production page with `production` false (the rollback, B item 4). Each run as a browser runs it (cc-harness
// openPlanPage: linkedom, the page's inline scripts in one `vm` context, the clock at uc-harness NOW).
// ⭐ The sequences, the answers and the expectations are the CONTRACT's, written here from § 4, never read back from the
// page.
import { hiddenInTree, openPlanPage, pageWithPicks, FIXTURE_DIR, productionFalseSavePath } from "./cc-harness.mjs";
import { approvedWeekPage, NOW, weekPage } from "./uc-harness.mjs";

/** The first question (§ 2 item 2), always shown. */
export const WHO = "q-who";
/** A item 1: the individual plan's questions top to bottom, as § 2 orders them: lunch or dinner, weekends, breakfast,
 *  snacks (while data/plans.json's `snacks.shown`), and the meal size (*What's your goal?*), the last. By heading id. */
export const INDIVIDUAL = ["q-lunch_dinner", "q-weekends", "q-breakfast", "q-snacks", "q-goal"];
/** ⚠ The builder's reading, stated in § 4.1 (not ruled): while snacks are CARTED (data/plans.json `snacks.carted`, as
 *  committed), Q4 is the Chef's Choice card's to show, beside a result and only for days the week has a snack list
 *  (SPEC-snacks-in-the-cart § 4: before a result the card hides it), so it is not in the sequence: breakfast reveals
 *  the meal size, and the card shows Q4 above it once the result is shown, as today. */
export const CARTED = INDIVIDUAL.filter((id) => id !== "q-snacks");
/** A item 1: Family's one question (§ 2.2). */
export const FAMILY = ["q-family"];

/** The answer a walk gives each question: Q1 *or*; Q2 *no*, the default (a tap on the state's own answer, A item 3);
 *  Q3 *yes*; Q4 *no*; the meal size Lean; Family's *and*. */
export const WALK = { "q-lunch_dinner": "or", "q-weekends": "no", "q-breakfast": "yes", "q-snacks": "no", "q-goal": "lean", "q-family": "and" };

/** The pages (built once per file): the development page, the production page with `production` true (the two that
 *  carry the page, D item 1), and the production page with `production` false (S20's), each with the fixture week. */
let built = null;
export const pages = () =>
  (built ??= (async () => ({
    development: await weekPage(),
    production: (await approvedWeekPage()).html,
    productionFalse: (await pageWithPicks({ picks: FIXTURE_DIR, savePath: await productionFalseSavePath() })).html,
  }))());

/** The page at `hash`, the clock at NOW, the save's outside services stood in for by `globals` (uc-harness saveStubs'). */
export const open = (html, hash = "", globals = {}) => openPlanPage(html, { hash, now: NOW, globals });

/** The answer a pressed button names: its data-a, data-goal, data-who or data-family. */
const answerOf = (b) => b.getAttribute("data-a") ?? b.getAttribute("data-goal") ?? b.getAttribute("data-who") ?? b.getAttribute("data-family");

/** The step (`.step`, the question's group) of the question whose heading is `id`. */
export const stepOf = (page, id) => page.el(id).closest(".step");

/** The pressed answer of the question `id` (null: none pressed). More than one pressed is an error of the page. */
export function pressedOf(page, id) {
  const on = [...stepOf(page, id).querySelectorAll('button[aria-pressed="true"]')];
  if (on.length > 1) throw new Error(`#${id}: ${on.length} answers pressed`);
  return on.length ? answerOf(on[0]) : null;
}

/** The questions as a visitor sees them: the shown headings in document order (of WHO, INDIVIDUAL, FAMILY), each
 *  shown question's pressed answer, whether the result card is shown, and the fragment. */
export function view(page) {
  const ids = [WHO, ...INDIVIDUAL, ...FAMILY].filter((id) => page.has(id));
  const shown = ids.filter((id) => !hiddenInTree(page.el(id)));
  return {
    shown,
    pressed: Object.fromEntries(shown.map((id) => [id, pressedOf(page, id)])),
    result: !hiddenInTree(page.el("result")),
    hash: page.hash(),
  };
}

/** Whether question `id` is revealed: no `hidden` on its step or an ancestor below its panel (the panel itself may be
 *  hidden: the other answer to the first question). */
export function revealed(page, id) {
  const panel = page.el(id).closest(".panel");
  for (let n = stepOf(page, id); n && n !== panel; n = n.parentElement) if (n.hasAttribute("hidden")) return false;
  return true;
}

/** A visitor's tap on question `id`'s answer `a`. */
export function tap(page, id, a) {
  const b = [...stepOf(page, id).querySelectorAll("button")].find((x) => answerOf(x) === a);
  if (!b) throw new Error(`#${id} has no answer ${a}`);
  b.click();
}

/**
 * linkedom has no modal dialogs (a-harness stubs them so, for See all plans): each <dialog>'s showModal and close as the
 * browser's, `open` set and removed, and `close` fired on closing an open one. Every element's focus, scrollIntoView
 * and scrollTo recorded too (the page's script moving focus or the scroll). Returns the records, in order.
 */
export function browserParts(page) {
  const calls = [];
  for (const d of page.document.querySelectorAll("dialog")) {
    d.showModal = () => {
      calls.push(`showModal #${d.id}`);
      d.setAttribute("open", "");
      d.open = true;
    };
    d.close = () => {
      if (!d.hasAttribute("open")) return;
      d.removeAttribute("open");
      d.open = false;
      calls.push(`close #${d.id}`);
      const e = page.document.createEvent("Event");
      e.initEvent("close", false, false);
      d.dispatchEvent(e);
    };
  }
  for (const n of page.document.querySelectorAll("*")) {
    const name = n.id ? `#${n.id}` : n.localName;
    n.focus = () => calls.push(`focus ${name}`);
    n.scrollIntoView = () => calls.push(`scrollIntoView ${name}`);
    n.scrollTo = () => calls.push(`scrollTo ${name}`);
  }
  return calls;
}

/** A visitor's click on `node`, as the browser dispatches it (bubbling, its target the node). */
export function click(page, node) {
  const e = page.document.createEvent("Event");
  e.initEvent("click", true, true);
  node.dispatchEvent(e);
}

/** Every element of the page in document order (linkedom's querySelectorAll walks it so). */
export const inOrder = (document) => [...document.querySelectorAll("*")];

/** True when `node` is inside `ancestor` (or is it). */
export function inside(node, ancestor) {
  for (let n = node; n; n = n.parentElement) if (n === ancestor) return true;
  return false;
}
