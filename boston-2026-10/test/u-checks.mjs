// The checks of U1, U3 and U4 (SPEC-week-content.md § 8: an UPDATING week, the fallback at a stop after the store's
// switch) as functions over a PACKAGE (`root`: this one, or a mirror of it), each returning one line per thing the
// package gets wrong ([] when it is right). The cases run them on this package; § 8 item 5's mutants run THE SAME checks
// on a mirror carrying one mutation (test/u-mutants.test.mjs), and test/u-04-record.mjs runs U4's on d1dac5b's own tree.
// Not a test file itself. Every expectation is the contract's, written here, never read back from the code under test.
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../build.mjs";
import { DAYS, hiddenInTree, midday, openPlanPage, pageWithPicks, picksDir } from "./cc-harness.mjs";
import { fragmentOf, GOALS, TABLE } from "./ms-harness.mjs";
import { contentOf, noWeekPage, pageAsset, picksText, sha256, startSite, visible, WEEK_DATA_KEY } from "./wc-harness.mjs";

/** § 8 item 3: the card's words, as the contract writes them (data/messages.json must hold exactly these). */
export const UPDATING_WORDS = "We're updating this week's menu.";
/** The card's element and the phrase's key in data/messages.json's `chefs_choice` (this build's choice, § 8.1). */
export const UPDATING_ID = "cc-updating";
export const UPDATING_KEY = "updating";
/** The week the cases make updating. data/photo-sheets.json names a sheet for it (chefs-choice-2026-10-25.jpg), so
 *  "no photo sheet" (§ 8 item 2) is asked of a week whose manifest has one. */
export const UPDATING_WEEK = "2026-10-25";
export const UPDATING_SHEET = "chefs-choice-2026-10-25.jpg";
/** § 8 item 1: the file, exactly. */
export const updatingFile = (delivery = UPDATING_WEEK) => ({ delivery, version: 2, updating: true, lists: {} });

/** A browser clock for the cases (no date decides the week: SPEC-week-content § 2.2). */
const NOW = midday(DAYS["S-5"]);
/** Every individual fragment of the meal selection: each goal, each answer set, without and with snacks (48). */
export const FRAGMENTS = GOALS.flatMap((goal) => TABLE.flatMap((row) => [false, true].map((s) => fragmentOf(goal, row, s))));
/** A deep-cart link's mark: a checkout link that fills a cart (SPEC-rung2-cart-handoff § 11). */
const DEEP_CART = "#fitaf=";
const RUNG1_LINK = /^https:\/\/fitafnutrition\.com\/order\?mpid=\d+$/;
const CONTROLS = "form, input, button, select, textarea, a";

const collapse = (s) => s.replace(/\s+/g, " ").trim();

/** The body as a visitor sees it (wc-harness visible()'s rule: scripts, styles and anything hidden removed, whitespace
 *  collapsed), with the element `drop` removed too, from a page already opened and navigated. */
function seen(page, drop) {
  const body = page.document.body.cloneNode(true);
  for (const node of [...body.querySelectorAll("*")]) {
    if (["SCRIPT", "STYLE", "TEMPLATE"].includes(node.tagName) || node.hasAttribute("hidden") || node.id === drop) node.remove();
  }
  return body.innerHTML.replace(/\s+/g, " ").replace(/> </g, "><").trim();
}

/**
 * U1 over a page carrying an updating week (`html`) and the same build holding no week (`noWeek`): at every individual
 * fragment the card is shown with `words`, the Chef's Choice list and its links are not, Choose your meals is the rung 1
 * link, the card holds no control, and everything else the visitor sees is the page with no week, byte for byte (§ 8
 * item 3: the existing fallback stays as it is). The card is not shown before a plan is chosen nor on Family. No
 * deep-cart link anywhere in the page.
 */
export function updatingCardProblems(html, noWeek, words, label = "") {
  const at = (where) => `${label}${where}`;
  const problems = [];
  if (html.includes(DEEP_CART)) problems.push(at(`the page carries a deep-cart checkout link (${DEEP_CART})`));
  const page = openPlanPage(html, { hash: "", now: NOW });
  const plain = openPlanPage(noWeek, { hash: "", now: NOW });
  const node = page.document.getElementById(UPDATING_ID);
  if (!node) return [...problems, at(`the page has no #${UPDATING_ID}: no updating card`)];
  if (!hiddenInTree(node)) problems.push(at("no plan chosen: the updating card is shown outside the result card"));
  for (const fragment of FRAGMENTS) {
    page.go(fragment);
    plain.go(fragment);
    const el = (id) => page.document.getElementById(id);
    if (hiddenInTree(node)) problems.push(at(`${fragment}: the updating card is not shown`));
    else if (collapse(node.textContent) !== words) problems.push(at(`${fragment}: the card reads ${JSON.stringify(collapse(node.textContent))}, not ${JSON.stringify(words)}`));
    if (node.querySelector(CONTROLS)) problems.push(at(`${fragment}: the card holds a control (no form: § 8 item 3)`));
    if (!hiddenInTree(el("cc-list"))) problems.push(at(`${fragment}: a Chef's Choice cart is shown`));
    if (!hiddenInTree(el("cc-own"))) problems.push(at(`${fragment}: Choose my own meals (the Chef's Choice card's) is shown`));
    if (el("cc-checkout").hasAttribute("href")) problems.push(at(`${fragment}: Continue to checkout has a link`));
    const choose = el("result-cta");
    if (hiddenInTree(choose) || !RUNG1_LINK.test(choose.getAttribute("href") ?? "")) {
      problems.push(at(`${fragment}: Choose your meals is not shown as the store's order page (${choose.getAttribute("href")})`));
    }
    const deep = [...el("result").querySelectorAll("a[href]")].map((a) => a.getAttribute("href")).filter((h) => h.includes(DEEP_CART));
    if (deep.length) problems.push(at(`${fragment}: a checkout link in the card: ${deep[0]}`));
    if (seen(page, UPDATING_ID) !== seen(plain, UPDATING_ID)) problems.push(at(`${fragment}: the rest of the page is not the page with no week`));
  }
  page.go("#family");
  if (!hiddenInTree(node)) problems.push(at("#family: the updating card is shown"));
  return problems;
}

/** The words a package's data/messages.json gives the card (undefined when it gives none). */
export async function updatingWordsOf(root = ROOT, messagesPath = join(root, "data", "messages.json")) {
  return JSON.parse(await readFile(messagesPath, "utf8")).chefs_choice?.[UPDATING_KEY];
}

/**
 * U1: the page of the package at `root`, for `target`, with the content its own content command makes of § 8 item 1's
 * file put in #picks-data as the Workers put it (cc-harness pageWithPicks), against the same build holding no week.
 * `messagesPath` replaces data/messages.json for the build and the content alike; the card must show its phrase.
 */
export async function updatingPageProblems(root = ROOT, { target = "prod", messagesPath } = {}) {
  const dir = await picksDir({ [`${UPDATING_WEEK}.json`]: updatingFile() });
  try {
    const inputs = messagesPath ? { messagesPath } : {};
    let html;
    try {
      ({ html } = await pageWithPicks({ root, target, picks: dir, week: UPDATING_WEEK, ...inputs }));
    } catch (err) {
      return [`${target}: the updating week's content is refused: ${err.message}`];
    }
    const { html: noWeek } = await pageWithPicks({ root, target, ...inputs });
    const words = await updatingWordsOf(root, messagesPath);
    if (typeof words !== "string") return [`${target}: data/messages.json has no chefs_choice.${UPDATING_KEY}`];
    return updatingCardProblems(html, noWeek, words, `${target}: `);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * U1 as production serves it: the content command's object for the updating week in a WEEK bucket, and `/` from the
 * package's own production Worker (src/worker/site.js, unchanged by § 8 item 4) over the build holding no week. The
 * Worker must put the object in #picks-data (its shape check passing it), and the page so served must pass U1.
 */
export async function updatingServedProblems(root = ROOT) {
  const dir = await picksDir({ [`${UPDATING_WEEK}.json`]: updatingFile() });
  let site;
  try {
    let text;
    try {
      ({ text } = await contentOf({ root, week: UPDATING_WEEK, picksDir: dir }));
    } catch (err) {
      return [`the updating week's content is refused: ${err.message}`];
    }
    const asset = await noWeekPage({ root });
    site = await startSite({ root, assets: { "/": pageAsset(asset) }, objects: { [WEEK_DATA_KEY]: text } });
    const res = await site.get("/");
    if (res.status !== 200) return [`/: status ${res.status}, not 200`];
    if (picksText(res.text) !== text) return ["/: the Worker did not put the updating week in #picks-data (the asset's own, no week)"];
    const words = await updatingWordsOf(root);
    if (typeof words !== "string") return [`data/messages.json has no chefs_choice.${UPDATING_KEY}`];
    return updatingCardProblems(res.text, asset, words, "served: ");
  } finally {
    await site?.dispose();
    await rm(dir, { recursive: true, force: true });
  }
}

/** U3's files: [label, file, its name, what the refusal must name]. Each is refused by checkPicks, naming the cause.
 *  The fixtures are this package's (test data, not code under test: a mirror carries no test/). */
export async function u3Cases() {
  const v2 = JSON.parse(await readFile(join(ROOT, "test", "fixtures", "picks-v2", "2026-10-04.json"), "utf8"));
  const v1 = JSON.parse(await readFile(join(ROOT, "test", "fixtures", "picks", "2026-10-04.json"), "utf8"));
  const name = `${UPDATING_WEEK}.json`;
  return [
    ["an updating file with a list (the v2 fixture's, valid on its own)", { ...v2, updating: true }, "2026-10-04.json", /chefs-choice/],
    ["an updating file with an empty list", { ...updatingFile(), lists: { "chefs-choice": { carts: [] } } }, name, /chefs-choice/],
    ["an updating file with a list the page does not show", { ...updatingFile(), lists: { other: {} } }, name, /other/],
    ['updating: "yes"', { ...updatingFile(), updating: "yes" }, name, /"yes"/],
    ["updating: false", { ...updatingFile(), updating: false }, name, /\bfalse\b/],
    ["updating: null", { ...updatingFile(), updating: null }, name, /\bnull\b/],
    ["a version-1 file with updating", { ...v1, updating: true }, "2026-10-04.json", /updating/],
  ];
}

/**
 * U3 (and its control): the package's own checkPicks accepts § 8 item 1's file, and refuses each of u3Cases, its refusal
 * naming the cause (a refusal for another reason, as an unknown field where the value is at fault, does not count).
 */
export async function updatingRefusalProblems(root = ROOT) {
  const { checkPicks } = await import(pathToFileURL(join(root, "scripts", "chefs-choice.mjs")).href);
  const plans = JSON.parse(await readFile(join(root, "data", "plans.json"), "utf8"));
  const problems = [];
  try {
    checkPicks(updatingFile(), `${UPDATING_WEEK}.json`, plans);
  } catch (err) {
    problems.push(`§ 8 item 1's file is refused: ${err.message}`);
  }
  for (const [label, file, name, cause] of await u3Cases()) {
    try {
      checkPicks(file, name, plans);
      problems.push(`${label}: accepted`);
    } catch (err) {
      if (!cause.test(err.message)) problems.push(`${label}: refused, but not naming ${cause}: ${err.message}`);
    }
  }
  return problems;
}

// U4: a normal week, before and after.

/** The normal weeks U4 pins: the two fixtures (version 1 and 2, invented names) and the committed week WC-9 pins. */
export const U4_WEEKS = [
  { label: "the v1 fixture, 2026-10-04", week: "2026-10-04", picks: ["test", "fixtures", "picks"] },
  { label: "the v2 fixture, 2026-10-04", week: "2026-10-04", picks: ["test", "fixtures", "picks-v2"] },
  { label: "the committed week, 2026-10-18", week: "2026-10-18", picks: ["data", "picks"] },
];
/** The fragments whose visible page U4 pins: none, a v1 fragment, answer sets with and without snacks, Family. */
export const U4_HASHES = ["", "#lean-7", "#lean-or-7d", "#lean-or-5d-s", "#signature-and-5d-b-s", "#performance-and-7d-b", "#family"];
/** A line of the page naming the amendment: § 8 adds whole lines only, each naming it (§ 8.1). */
const UPDATING_LINE = /updating/i;

/** `html` without its lines naming `updating`: the page as it was before § 8, if § 8 added only such lines. */
export const withoutUpdatingLines = (html) => html.split("\n").filter((line) => !UPDATING_LINE.test(line)).join("\n");

const described = (bytes) => `${bytes.length} bytes sha256:${sha256(bytes)}`;

/**
 * U4's record of the package at `root`: per normal week and target, the content command's files (each its size and
 * SHA-256), the page as served with that week (the build, the content in #picks-data) once its lines naming `updating`
 * are removed, and the visible page at each of U4_HASHES. Recorded from d1dac5b's tree by test/u-04-record.mjs.
 */
export async function normalWeekRecord(root = ROOT) {
  const record = {};
  for (const { label, week, picks } of U4_WEEKS) {
    for (const target of ["prod", "dev"]) {
      const dir = join(root, ...picks);
      const { files } = await contentOf({ root, week, picksDir: dir, target });
      const { html } = await pageWithPicks({ root, target, picks: dir, week });
      record[`${label} · ${target}`] = {
        content: Object.fromEntries(Object.entries(files).map(([key, bytes]) => [key, described(bytes)])),
        page: described(Buffer.from(withoutUpdatingLines(html), "utf8")),
        visible: Object.fromEntries(U4_HASHES.map((hash) => [hash || "(no fragment)", sha256(visible(html, { hash, now: NOW }))])),
      };
    }
  }
  return record;
}
