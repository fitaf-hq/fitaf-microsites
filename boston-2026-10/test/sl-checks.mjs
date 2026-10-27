// The checks of SL1–SL4 (SPEC-ui-and-copy-pass.md § 6: the save dialog opened by a link, `#save`), as functions over a
// PACKAGE (`root`: this one, or a mirror of it), each returning one line per thing the package gets wrong ([] when it is
// right). The cases run them on this package; the mutant (sl-mutants.test.mjs) runs SL3's on a mirror. Not a test file
// itself. Every expectation is the contract's, written here, never read back from the code under test.
//
// The pages are the package's own builds with the fixture week in #picks-data (a-harness builtPage, `week`: the version-1
// fixture, a cart for 7 and for 14 meals): the two that carry the save step, the development page and the production page
// as committed (data/save.json `production` true), and the production page with `production` false (S20's, the rollback),
// which carries none. Each is run as a browser runs it (cc-harness openPlanPage, the clock at uc-harness NOW, a day of the
// Boston offer), its dialogs and focus stood in for before its scripts run (uc11-harness openWithDialogs), and
// `DOMContentLoaded` dispatched once every inline script has run (§ 6 item 1: "once the page's scripts have run").
import { ROOT } from "../build.mjs";
import { builtPage } from "./a-harness.mjs";
import { FIXTURE_DIR, hiddenInTree, pageWithPicks, productionFalseSavePath } from "./cc-harness.mjs";
import { CHECKOUT, saveStubs, saveWith } from "./uc-harness.mjs";
import { click, openWithDialogs, view, WHO } from "./uc11-harness.mjs";

/** § 6 item 1: the fragment exactly. */
export const LINK = "#save";
/** The dialog the link opens, and the button that opens it in the page (§ 4 B). */
const DIALOG = "save-dialog";
const NOT_READY = "not-ready";
/** The save step at its first state, OFFER, as § 1 and § 4 B draw it (flow1.js's render, read as a visitor reads it):
 *  the step and its form shown, its collapsed line, every done line, every error and the out-of-area part not. */
const OFFER_SHOWN = ["save", "save-open", "save-form", "save-email", "save-zip"];
const OFFER_HIDDEN = ["save-collapsed", "save-done", "save-done-later", "save-expansion-done", "save-error", "save-out-of-area"];
/** The page's start, as § 4.2 item 1 rules it: *Who is this for?* alone, neither answer pressed, no result. */
const START = { shown: [WHO], pressed: { [WHO]: null }, result: false };
/** SL3's fragments (§ 6 items 3 and 4): a whole answer set, the emails' link back, none; and the card's checkout and a
 *  fragment that only begins with the link's, so "exactly that" is held. */
export const OTHER_FRAGMENTS = ["#lean-and-7d", "#from-email", "", CHECKOUT, "#save-offer"];

/** The two builds carrying the save step, and S20's page, of the package at `root`. */
export async function pagesAt(root = ROOT) {
  return {
    development: await builtPage({ root, target: "dev", week: true }),
    production: await builtPage({ root, target: "prod", week: true }),
  };
}
export const productionFalseAt = async (root = ROOT) => (await pageWithPicks({ root, picks: FIXTURE_DIR, savePath: await productionFalseSavePath() })).html;

const shown = (page, id) => page.has(id) && !hiddenInTree(page.el(id));
const isOpen = (page) => page.has(DIALOG) && page.el(DIALOG).hasAttribute("open");
const opened = (calls) => calls.filter((c) => c === `showModal #${DIALOG}`).length;

/** One line per difference between the page's questions and § 4.2's start; and its fragment, which `want` names. */
function startProblems(at, page, hash) {
  const { shown: s, pressed, result } = view(page);
  const problems = [];
  if (JSON.stringify({ shown: s, pressed, result }) !== JSON.stringify(START)) problems.push(`${at}: the page is not at its start: ${JSON.stringify({ shown: s, pressed, result })}`);
  if (page.hash() !== hash) problems.push(`${at}: the fragment is ${JSON.stringify(page.hash())}, not ${JSON.stringify(hash)} (rewritten)`);
  return problems;
}

/** The save step drawn at OFFER inside the open dialog: one line per element out of place. */
function offerProblems(at, page) {
  const problems = [];
  if (!isOpen(page)) problems.push(`${at}: the dialog is not open`);
  for (const id of OFFER_SHOWN) if (!shown(page, id)) problems.push(`${at}: #${id} not shown (OFFER)`);
  for (const id of OFFER_HIDDEN) if (shown(page, id)) problems.push(`${at}: #${id} shown (not OFFER)`);
  for (const id of OFFER_SHOWN) if (page.has(id) && !page.el(DIALOG).contains(page.el(id))) problems.push(`${at}: #${id} outside the dialog`);
  return problems;
}

/** SL1 (§ 6 items 1 and 4): opened at `#save`, the page has the save dialog open after load (opened once, by its
 *  showModal, as *Not ready?* opens it), the step at OFFER inside it, the page behind at its start, the fragment as it
 *  was; *Not ready?* itself still hidden (no checkout). On both builds carrying the step. */
export async function linkOpensProblems(root = ROOT) {
  const problems = [];
  for (const [build, html] of Object.entries(await pagesAt(root))) {
    const { page, calls } = openWithDialogs(html, LINK, saveStubs().globals);
    const at = `${build}, ${LINK}`;
    if (!page.has(DIALOG) || !page.has(NOT_READY)) {
      problems.push(`${at}: control: the page carries no save dialog or no Not ready?`);
      continue;
    }
    if (opened(calls) !== 1) problems.push(`${at}: the dialog opened ${opened(calls)} time(s) by its showModal, not once`);
    problems.push(...offerProblems(at, page), ...startProblems(at, page, LINK));
    if (shown(page, NOT_READY)) problems.push(`${at}: Not ready? shown with no checkout`);
  }
  return problems;
}

/** The body /api/save was asked, without the stand-in's token. */
const bodyOf = (fetches) => fetches.map((f) => JSON.parse(f.init.body));

/** SL1 (§ 6 item 2): a save through the dialog the link opened is a save as every save: the same request as one through
 *  *Not ready?* (an offer save, the page's own event), the step at its done line, the dialog still open. */
export async function linkSaveProblems(root = ROOT) {
  const problems = [];
  for (const [build, html] of Object.entries(await pagesAt(root))) {
    const viaLink = saveStubs();
    const { page } = openWithDialogs(html, LINK, viaLink.globals);
    await saveWith(page);
    const viaButton = saveStubs();
    const other = openWithDialogs(html, CHECKOUT, viaButton.globals);
    click(other.page, other.page.el(NOT_READY));
    if (!isOpen(other.page)) problems.push(`${build}: control: Not ready? did not open the dialog`);
    await saveWith(other.page);
    const [a, b] = [bodyOf(viaLink.fetches), bodyOf(viaButton.fetches)];
    if (a.length !== 1 || b.length !== 1) problems.push(`${build}: ${a.length} request(s) through the link's dialog and ${b.length} through Not ready?'s, not one each`);
    else if (JSON.stringify(a[0]) !== JSON.stringify(b[0])) problems.push(`${build}: the link's save asked ${JSON.stringify(a[0])}, Not ready?'s ${JSON.stringify(b[0])}`);
    else if (a[0].kind !== "offer") problems.push(`${build}: the link's save is ${JSON.stringify(a[0].kind)}, not an offer save`);
    if (!shown(page, "save-done")) problems.push(`${build}, ${LINK}: after the save, its done line not shown`);
    if (!isOpen(page)) problems.push(`${build}, ${LINK}: after the save, the dialog closed`);
  }
  return problems;
}

/** SL2's ways to close the dialog (§ 6 item 1: "its button, Esc, the backdrop"). Esc is the browser's own (a modal
 *  dialog's cancel, which closes it): here its close(), as the browser calls it; read in Chrome by Storybook's cases. */
const CLOSES = [
  ["its close button (×)", (page) => click(page, page.el("save-close"))],
  ["the backdrop", (page) => click(page, page.el(DIALOG))],
  ["Esc (the browser's close)", (page) => page.el(DIALOG).close()],
];

/** SL2 (§ 6 items 1 and 4): opened at `#save`, then closed each way: the dialog closed, the page at its start with no
 *  answer pressed, the fragment as it was, the step drawn nowhere (no checkout); and the page then works as before: a
 *  checkout's *Not ready?* shown, opening the dialog with the step at OFFER. */
export async function linkClosedProblems(root = ROOT) {
  const problems = [];
  for (const [build, html] of Object.entries(await pagesAt(root))) {
    for (const [how, close] of CLOSES) {
      const { page } = openWithDialogs(html, LINK, saveStubs().globals);
      const at = `${build}, ${LINK}, closed by ${how}`;
      if (!isOpen(page)) problems.push(`${build}, ${LINK}: control: the dialog is not open before closing`);
      close(page);
      if (isOpen(page)) problems.push(`${at}: the dialog is still open`);
      problems.push(...startProblems(at, page, LINK));
      if (shown(page, "save")) problems.push(`${at}: the save step still drawn`);
      if (shown(page, NOT_READY)) problems.push(`${at}: Not ready? shown with no checkout`);
      page.go(CHECKOUT);
      if (!shown(page, NOT_READY)) problems.push(`${at}, then ${CHECKOUT}: Not ready? not shown beside the checkout`);
      else {
        click(page, page.el(NOT_READY));
        problems.push(...offerProblems(`${at}, then Not ready?`, page));
      }
    }
  }
  return problems;
}

/** SL3 (§ 6 items 3 and 4): opened at any other fragment, the page opens no dialog (no showModal, none open), on both
 *  builds carrying the step. */
export async function otherFragmentsProblems(root = ROOT) {
  const problems = [];
  for (const [build, html] of Object.entries(await pagesAt(root))) {
    for (const hash of OTHER_FRAGMENTS) {
      const { page, calls } = openWithDialogs(html, hash, saveStubs().globals);
      const at = `${build}, ${hash || "(no fragment)"}`;
      if (!page.has(DIALOG)) problems.push(`${at}: control: no save dialog on the page`);
      if (opened(calls) || isOpen(page)) problems.push(`${at}: a dialog opened (${calls.filter((c) => c.startsWith("showModal")).join(", ")})`);
    }
  }
  return problems;
}

/** SL4 (§ 6 items 1 and 4): the production page with `production` false (no save step) opened at `#save` opens nothing:
 *  no save dialog on it, no dialog opened, the page at its start. */
export async function productionFalseProblems(root = ROOT) {
  const problems = [];
  const { page, calls } = openWithDialogs(await productionFalseAt(root), LINK);
  const at = `production false, ${LINK}`;
  if (page.has(DIALOG) || page.has(NOT_READY) || page.has("save")) problems.push(`${at}: control: the page carries the save step`);
  if (calls.some((c) => c.startsWith("showModal"))) problems.push(`${at}: a dialog opened (${calls.filter((c) => c.startsWith("showModal")).join(", ")})`);
  problems.push(...startProblems(at, page, LINK));
  return problems;
}
