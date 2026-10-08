// Shared by the ms-*.test.mjs files (SPEC-meal-selection.md: which meals the plan covers, four questions, eight carts).
// Not a test file itself. Pages are built through build.mjs's own build() into temporary directories, with the picks
// directory and the plans file a case names (a committed fixture or a temporary copy); no file in the repository is
// written and nothing is requested. The page is run as cc-harness.mjs runs it (linkedom, its inline scripts in one `vm`
// context, the clock fixed).
//
// ⭐ The expectations are the CONTRACT's, written here from its § 2 table, never read back from data/plans.json: a page
// that rounds 5 up to 7, or a plans.json that says so, fails against them (MS-10).
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../build.mjs";
import { DAYS, midday, openPlanPage, PLANS } from "./cc-harness.mjs";

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

/** An empty picks directory (the page without a week), and its remover. */
export async function noPicksDir() {
  const dir = await mkdtemp(join(tmpdir(), "boston-ms-no-picks-"));
  return { dir, done: () => rm(dir, { recursive: true, force: true }) };
}

/**
 * build() into a temporary directory: the page it wrote. `root` is a package to build from (a mirror, MS-10), its own
 * build.mjs imported; by default this package's. `picks`, `on`, `plansPath`, `messagesPath`, `target` are the build's.
 */
export async function pageOf({ root = ROOT, target = "prod", picks, on = "2026-09-30", plansPath, messagesPath } = {}) {
  const { build } = await import(pathToFileURL(join(root, "build.mjs")).href);
  const outDir = await mkdtemp(join(tmpdir(), `boston-ms-${target}-`));
  const empty = picks ? null : await noPicksDir();
  try {
    await build({ target, outDir, on, picksDir: picks ?? empty.dir, ...(plansPath ? { plansPath } : {}), ...(messagesPath ? { messagesPath } : {}) });
    return await readFile(join(outDir, "index.html"), "utf8");
  } finally {
    await rm(outDir, { recursive: true, force: true });
    await empty?.done();
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
