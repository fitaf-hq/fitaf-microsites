// Shared by the ms-*.test.mjs files (SPEC-meal-selection.md: which meals the plan covers, four questions, eight carts).
// Not a test file itself. Pages are built through build.mjs's own build() into temporary directories, with the picks
// directory and the plans file a case names (a committed fixture or a temporary copy); no file in the repository is
// written and nothing is requested. The page is run as cc-harness.mjs runs it (linkedom, its inline scripts in one `vm`
// context, the clock fixed).
//
// ⭐ The expectations are the CONTRACT's, written here from its § 2 table, never read back from data/plans.json: a page
// that rounds 5 up to 7, or a plans.json that says so, fails against them (MS-10).
//
// ⭐ The snack flags (SPEC-meal-selection § 11): a case that asserts anything about snacks builds from ITS OWN copy of
// data/plans.json with the flags it asserts, never the committed `snacks`: `pageOf({ snacks: SNACKS_SHOWN })` writes the
// copy to a temporary directory and removes it; `withSnacks(flags)` is the same data as an object, for the entry points
// that take one (`renderPage`, `devPage`). So `snacks.shown` can be flipped in data/plans.json without moving MS-3, MS-4,
// MS-7, MS-8, MS-9, MS-12, MS-14, MS-16, PR-14 or PR-15 (`carted: true` is refused by the build today, § 10 item 1, so
// that flip stops every build until the code that carts a snack lands). ⚠ S20 and CC-4 (prod) still move:
// they pin the PRODUCTION page's bytes (test/s20-production-golden.json, "regenerate only when production is MEANT to
// change"), and a flip is such a change, so its commit re-records that golden.
// The whole suite on other data, in a mirror and never the tree: `node test/suite-in-mirror.mjs --set snacks.shown=false`
// (its header says how; with no --set it is the control, the data as committed).
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../build.mjs";
import { card, DAYS, midday, openPlanPage, PLANS } from "./cc-harness.mjs";

/** § 2's table, as the contract writes it: [answer key, Q1, every day, breakfast, meals, plan]. */
export const TABLE = [
  ["or-7d", "or", true, false, 7, 7],
  ["or-5d", "or", false, false, 5, 4],
  ["and-7d", "and", true, false, 14, 14],
  ["and-5d", "and", false, false, 10, 10],
  ["or-7d-b", "or", true, true, 14, 14],
  ["or-5d-b", "or", false, true, 10, 10],
  ["and-7d-b", "and", true, true, 21, 21],
  ["and-5d-b", "and", false, true, 15, 14],
].map(([key, lunch_dinner, weekends, breakfast, meals, plan]) => ({ key, lunch_dinner, weekends, breakfast, meals, plan }));

/** The two answer sets the store cannot sell as asked (§ 2: "5 → 4 and 15 → 14"). */
export const ROUNDED = TABLE.filter((r) => r.plan < r.meals).map((r) => r.key);

/** The v2 fixture week (invented names; § 9's "a fixture week … carries version 2 with snacks"). */
export const V2_DIR = join(ROOT, "test", "fixtures", "picks-v2");
export const V2_FILE = join(V2_DIR, "2026-10-04.json");
export const V1_DIR = join(ROOT, "test", "fixtures", "picks");

/** The goals (sizes) and, per size, the mpid of a count (data/plans.json's store table, which the contract names). */
export const GOALS = PLANS.individual.map((p) => p.id);
export const mpidOf = (goal, count) => PLANS.individual.find((p) => p.id === goal).counts.find((c) => c.meals_per_week === count).mpid;
export const centsOf = (goal, count) =>
  PLANS.individual.find((p) => p.id === goal).counts.find((c) => c.meals_per_week === count).price_per_meal_cents;
/** "$1,234.50", as the page writes money (computed here on its own). */
export const dollars = (cents) => `$${Math.floor(cents / 100).toLocaleString("en-US")}.${String(cents % 100).padStart(2, "0")}`;

/** A temporary copy of data/plans.json with `change(plans)` applied: its path, and a remover. */
export async function plansCopy(change) {
  const dir = await mkdtemp(join(tmpdir(), "boston-ms-plans-"));
  const plans = structuredClone(JSON.parse(await readFile(join(ROOT, "data", "plans.json"), "utf8")));
  change(plans);
  const path = join(dir, "plans.json");
  await writeFile(path, JSON.stringify(plans, null, 2));
  return { path, plans, done: () => rm(dir, { recursive: true, force: true }) };
}

/** The snack flags the cases assert (SPEC-meal-selection § 9 item 3; § 4 as written): Q4 shown and nothing carted, the
 *  state § 9 rules; and Q4 hidden. `carted: true` is refused by the build (MS-6), so no case asserts it. */
export const SNACKS_SHOWN = Object.freeze({ shown: true, carted: false });
export const SNACKS_HIDDEN = Object.freeze({ shown: false, carted: false });

/** `plans` (by default the committed data) as a new object with its `snacks` set to `flags`: a case's own data. */
export const withSnacks = (flags, plans = PLANS) => ({ ...structuredClone(plans), snacks: { ...flags } });

/** An empty picks directory (the page without a week), and its remover. */
export async function noPicksDir() {
  const dir = await mkdtemp(join(tmpdir(), "boston-ms-no-picks-"));
  return { dir, done: () => rm(dir, { recursive: true, force: true }) };
}

/**
 * build() into a temporary directory: the page it wrote. `root` is a package to build from (a mirror, MS-10), its own
 * build.mjs imported; by default this package's. `picks`, `on`, `plansPath`, `messagesPath`, `target` are the build's.
 * `snacks` (SNACKS_SHOWN, SNACKS_HIDDEN) builds from a copy of the committed data with those flags, written to a
 * temporary directory and removed after; it and `plansPath` are not given together.
 */
export async function pageOf({ root = ROOT, target = "prod", picks, on = "2026-09-30", plansPath, messagesPath, snacks } = {}) {
  if (snacks && plansPath) throw new Error("pageOf: give `snacks` or `plansPath`, not both");
  const { build } = await import(pathToFileURL(join(root, "build.mjs")).href);
  const outDir = await mkdtemp(join(tmpdir(), `boston-ms-${target}-`));
  const empty = picks ? null : await noPicksDir();
  const own = snacks ? await plansCopy((p) => (p.snacks = { ...snacks })) : null;
  const plans = own?.path ?? plansPath;
  try {
    await build({ target, outDir, on, picksDir: picks ?? empty.dir, ...(plans ? { plansPath: plans } : {}), ...(messagesPath ? { messagesPath } : {}) });
    return await readFile(join(outDir, "index.html"), "utf8");
  } finally {
    await rm(outDir, { recursive: true, force: true });
    await empty?.done();
    await own?.done();
  }
}

/** The page at `hash`, its clock inside the fixture weeks' window (S − 5 of 2026-10-04). */
export const open = (html, hash = "") => openPlanPage(html, { hash, now: midday(DAYS["S-5"]) });

/** What a visitor reads off the result card: shown or not, its figures, the rounded line, and its links. */
export function resultOf(page) {
  const { document } = page;
  const el = (id) => document.getElementById(id);
  const shown = (id) => {
    for (let n = el(id); n && n.getAttribute; n = n.parentElement) if (n.hasAttribute("hidden")) return false;
    return Boolean(el(id));
  };
  const text = (id) => el(id)?.textContent.replace(/\s+/g, " ").trim() ?? null;
  return {
    shown: shown("result"),
    selection: el("result")?.getAttribute("data-selection") ?? null,
    total: text("result-total"),
    perMeal: text("result-per-meal"),
    meals: text("result-meals"),
    rounded: shown("result-rounded") ? text("result-rounded") : null,
    cta: el("result-cta")?.getAttribute("href") ?? null,
    ctaShown: shown("result-cta"),
  };
}

/** The questions as the page shows them: per question, whether it is shown and which answer is pressed. */
export function questionsOf(page) {
  const out = {};
  for (const b of page.document.querySelectorAll("[data-q]")) {
    const q = b.getAttribute("data-q");
    let hidden = false;
    for (let n = b; n && n.getAttribute; n = n.parentElement) if (n.hasAttribute("hidden")) hidden = true;
    out[q] ??= { shown: !hidden, pressed: null, answers: [] };
    out[q].answers.push(b.getAttribute("data-a"));
    if (b.getAttribute("aria-pressed") === "true") out[q].pressed = b.getAttribute("data-a");
  }
  return out;
}

/** Press the page's own button for question `q`'s answer `a` (a visitor's click). */
export function answer(page, q, a) {
  const b = page.document.querySelector(`[data-q="${q}"][data-a="${a}"]`);
  if (!b) throw new Error(`the page has no answer ${a} to ${q}`);
  b.click();
}

/** Press the page's own goal button. */
export function chooseGoal(page, goal) {
  const b = page.document.querySelector(`[data-goal="${goal}"]`);
  if (!b) throw new Error(`the page has no goal ${goal}`);
  b.click();
}

/** The fragment an answer set takes (§ 3), written here from the contract: `<size>-<or|and>-<7d|5d>[-b][-s]`. */
export const fragmentOf = (goal, row, snacks = false) => `#${goal}-${row.key}${snacks ? "-s" : ""}`;

/** The v2 fixture, parsed, and its carts by answer key (written here from the cart's own fields, as § 5 names them). */
export const V2 = JSON.parse(await readFile(V2_FILE, "utf8"));
const keyOfCart = (c) => `${c.lunch_dinner}-${c.weekends ? "7d" : "5d"}${c.breakfast ? "-b" : ""}`;
export const V2_CARTS = Object.fromEntries(V2.lists["chefs-choice"].carts.map((c) => [keyOfCart(c), c]));
export const V2_SNACKS = V2.lists["chefs-choice"].snacks;

/** What the card offers: cc-harness's reading (the list, the links) and the snack block (§ 9 item 3). */
export function cardOf(page) {
  const { document } = page;
  const el = (id) => document.getElementById(id);
  const shown = (id) => {
    if (!el(id)) return false;
    for (let n = el(id); n && n.getAttribute; n = n.parentElement) if (n.hasAttribute("hidden")) return false;
    return true;
  };
  const text = (id) => el(id)?.textContent.replace(/\s+/g, " ").trim() ?? null;
  return {
    ...card(page),
    snacks: shown("cc-snacks"),
    snackHeading: shown("cc-snacks-heading") ? text("cc-snacks-heading") : null,
    snackLines: shown("cc-snack-list") ? [...el("cc-snack-list").querySelectorAll("li")].map((li) => li.textContent) : null,
    snackNote: shown("cc-snacks-note") ? text("cc-snacks-note") : null,
  };
}

/** The keys a link's meal part carries, with their counts: { key: qty } (the photo part, after "!", is not read). */
export function keysOf(href) {
  const tokens = new URL(href).hash.slice("#fitaf=".length).split("!")[0].split(".").slice(1);
  return Object.fromEntries(tokens.map((t) => [t.split("*")[0], Number(t.split("*")[1] ?? 1)]));
}
