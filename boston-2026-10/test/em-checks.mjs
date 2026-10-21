// EM1's check (SPEC-every-menu-and-nutrition.md § 1, § 6) as a function over a PACKAGE (`root`: this one, or a mirror of
// it), returning one line per thing the package gets wrong ([] when it is right). EM1 runs it on this package; its mutant
// (test/em-mutants.test.mjs) runs THE SAME check on a mirror carrying one mutation. Not a test file itself. Every
// expectation is the contract's, written here, never read back from the code under test.
//
// The file: a week with two lists and `meals` makes its content with the fixture's words (and the build takes those
// words). Refused, each naming the file and its place: a list the words do not name; a `meals` key no cart's meal is
// named; a number negative, fractional or not a number; a size missing one of the five; blank `ingredients`; an unknown
// field in a size, in an entry, or a size the plans do not have. (An unknown field in `meals` itself is a name no
// cart carries: § 1 item 2's keys are the meals' names.) And, the build's choice where § 2 item 2 needs it, a week of
// two lists whose words' heading has no `{menu}` to name the menu shown.
// § 1 item 2 as amended at 1fb2b19: each of `nutrition` and `ingredients` is optional, an entry carries at least one of
// them, `contains` appears only beside `ingredients`, and `"meals": {}` is accepted. So an entry of numbers alone and one
// of ingredients alone are accepted (ACCEPTED), an empty entry and `contains` without `ingredients` refused, and a week
// with `"meals": {}` makes the content of the same week without `meals` (§ 1 item 3: it carries none of the additions).
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../build.mjs";
import { MESSAGES } from "./cc-harness.mjs";
import { FIXTURE_LIST, fixtureWords, messagesFile, MENUS, MENUS_WEEK, picksCopy } from "./em-harness.mjs";

const SHOWN = "Smoked Paprika Chicken Bowl";
const changed = (change) => {
  const week = structuredClone(MENUS);
  change(week);
  return week;
};
const entry = (w, name = SHOWN) => w.meals[name];

/** [label, the fixture changed, the refusal (after the file's name), the words: "fixture" or "committed"]. */
export const REFUSALS = [
  // Without `meals` (whose entries name the second list's meals), so the list alone decides: a check that let it through
  // would make the week (EM1's mutant).
  ["a list the words do not name (data/messages.json as committed)", changed((w) => delete w.meals), /lists: "fixture-two" is not a list the page shows \(chefs-choice\)/, "committed"],
  ["a meals key no cart's meal is named", changed((w) => (w.meals["Not On Any Cart"] = structuredClone(entry(w)))), /meals "Not On Any Cart": no meal of the file's carts has this name/],
  ["a meals key naming a snack (snacks are not carts)", changed((w) => (w.meals["Dark Chocolate Protein Bites"] = structuredClone(entry(w)))), /meals "Dark Chocolate Protein Bites": no meal of the file's carts has this name/],
  ["a number negative", changed((w) => (entry(w).nutrition.lean.cal = -1)), /meals "Smoked Paprika Chicken Bowl"\.nutrition\.lean\.cal must be a whole number, 0 or more; got -1/],
  ["a number fractional", changed((w) => (entry(w).nutrition.signature.protein = 46.5)), /meals "Smoked Paprika Chicken Bowl"\.nutrition\.signature\.protein must be a whole number, 0 or more; got 46\.5/],
  ["a number not a number (text)", changed((w) => (entry(w).nutrition.performance.carbs = "62")), /meals "Smoked Paprika Chicken Bowl"\.nutrition\.performance\.carbs must be a whole number, 0 or more; got "62"/],
  ["a size missing one of the five", changed((w) => delete entry(w).nutrition.signature.fiber), /meals "Smoked Paprika Chicken Bowl"\.nutrition\.signature: missing field "fiber"/],
  ["blank ingredients", changed((w) => (entry(w).ingredients = "  \n ")), /meals "Smoked Paprika Chicken Bowl": ingredients is blank/],
  ["blank contains", changed((w) => (entry(w).contains = " ")), /meals "Smoked Paprika Chicken Bowl": contains is blank/],
  // § 1 item 2, amended (1fb2b19): an entry carries at least one of nutrition and ingredients; contains only beside
  // ingredients. A nutrition holding no size gives no numbers, so beside nothing else it is an empty entry too.
  ["an empty entry", changed((w) => (w.meals[SHOWN] = {})), /meals "Smoked Paprika Chicken Bowl": carries neither nutrition nor ingredients/],
  ["an entry of a nutrition with no size, alone", changed((w) => (w.meals[SHOWN] = { nutrition: {} })), /meals "Smoked Paprika Chicken Bowl": carries neither nutrition nor ingredients/],
  ["contains without ingredients", changed((w) => delete entry(w).ingredients), /meals "Smoked Paprika Chicken Bowl": contains without ingredients/],
  ["an unknown field in a size", changed((w) => (entry(w).nutrition.lean.sodium = 400)), /meals "Smoked Paprika Chicken Bowl"\.nutrition\.lean: unknown field "sodium"/],
  ["an unknown field in an entry (a price)", changed((w) => (entry(w).price_cents = 1250)), /meals "Smoked Paprika Chicken Bowl": unknown field "price_cents"/],
  ["a size the plans do not have (Family's)", changed((w) => (entry(w).nutrition.family = structuredClone(entry(w).nutrition.lean))), /meals "Smoked Paprika Chicken Bowl"\.nutrition: unknown field "family"/],
  ["meals not an object", changed((w) => (w.meals = [entry(w)])), /meals must be an object/],
  ["a week of two lists, the heading without {menu}", changed(() => {}), /2 lists, and data\/messages\.json's chefs_choice\.heading has no \{menu\} to name the menu shown/, "no-menu-heading"],
];

/** [label, the fixture changed, what its content must equal: null, or the fixture changed so]: each accepted (§ 1 item 2,
 *  amended), its content made with the fixture's words. */
export const ACCEPTED = [
  ["an entry of numbers alone (no ingredients)", changed((w) => (w.meals[SHOWN] = { nutrition: entry(w).nutrition })), null],
  ["an entry of ingredients alone (no numbers)", changed((w) => (w.meals[SHOWN] = { ingredients: entry(w).ingredients })), null],
  ["an entry of ingredients and contains (no numbers)", changed((w) => delete entry(w).nutrition), null],
  ['"meals": {}, its content that of the week without meals', changed((w) => (w.meals = {})), changed((w) => delete w.meals)],
];

const WORDS = {
  fixture: () => fixtureWords(),
  committed: () => MESSAGES,
  "no-menu-heading": () => ({ ...fixtureWords(), chefs_choice: { ...fixtureWords().chefs_choice, heading: MESSAGES.chefs_choice.heading } }),
};

/** The content of the package at `root` for `week`, made with `messages` and written as the program writes it: the
 *  error (or null), whether anything was written, and the content's data. */
async function attempt(root, week, messages) {
  const { weekContent, writeContent } = await import(pathToFileURL(join(root, "scripts", "week-content.mjs")).href);
  const picks = await picksCopy(week);
  const words = await messagesFile(messages);
  const outDir = join(await mkdtemp(join(tmpdir(), "boston-em-01-")), "out");
  try {
    let error = null;
    let data = null;
    try {
      const content = await weekContent({ week: MENUS_WEEK, picksDir: picks.dir, messagesPath: words.path });
      data = JSON.parse(Buffer.from(content.files[0].bytes).toString("utf8"));
      await writeContent(content.files, outDir);
    } catch (err) {
      error = err;
    }
    return { error, wrote: existsSync(outDir), data };
  } finally {
    await picks.done();
    await words.done();
    await rm(join(outDir, ".."), { recursive: true, force: true });
  }
}

/** The build of the package at `root` with `messages`: the error, or null. */
async function buildWith(root, messages) {
  const { build } = await import(pathToFileURL(join(root, "build.mjs")).href);
  const words = await messagesFile(messages);
  const outDir = await mkdtemp(join(tmpdir(), "boston-em-01-build-"));
  try {
    await build({ target: "prod", outDir, messagesPath: words.path });
    return null;
  } catch (err) {
    return err;
  } finally {
    await words.done();
    await rm(outDir, { recursive: true, force: true });
  }
}

/** EM1's acceptance: the fixture builds and makes its content with the fixture's words, its second list and its meals'
 *  numbers reaching the content. */
export async function acceptanceProblems(root = ROOT) {
  const problems = [];
  const built = await buildWith(root, fixtureWords());
  if (built) problems.push(`the build with the fixture's words: ${built.message}`);
  const { error, wrote, data } = await attempt(root, MENUS, fixtureWords());
  if (error) return [...problems, `the fixture week's content: ${error.message}`];
  if (!wrote) problems.push("the fixture week's content: nothing written");
  const text = JSON.stringify(data);
  for (const item of MENUS.lists[FIXTURE_LIST].carts[0].items) {
    if (!text.includes(JSON.stringify(item.display).slice(1, -1))) problems.push(`the content does not carry the second list's ${JSON.stringify(item.display)}`);
  }
  const { cal, protein } = MENUS.meals[SHOWN].nutrition.signature;
  if (!text.includes(String(cal)) || !text.includes(String(protein))) problems.push(`the content does not carry ${SHOWN}'s numbers`);
  return problems;
}

/** EM1's acceptances (§ 1 item 2, amended): each changed fixture makes its content, and where a second week is given, the
 *  same content as that week's. `only` limits it to the cases whose label is listed. */
export async function acceptedProblems(root = ROOT, only = null) {
  const problems = [];
  for (const [label, week, same] of ACCEPTED) {
    if (only && !only.includes(label)) continue;
    const got = await attempt(root, week, fixtureWords());
    if (got.error) {
      problems.push(`${label}: refused: ${got.error.message}`);
      continue;
    }
    if (!same) continue;
    const want = await attempt(root, same, fixtureWords());
    if (want.error) problems.push(`${label}: the week to compare with was refused: ${want.error.message}`);
    else if (JSON.stringify(got.data) !== JSON.stringify(want.data)) problems.push(`${label}: its content is not that of the week without meals`);
  }
  return problems;
}

/** EM1's refusals: each changed fixture refused, naming the file and its place, nothing written. `only` limits it to
 *  the cases whose label is listed. */
export async function refusalProblems(root = ROOT, only = null) {
  const problems = [];
  for (const [label, week, refusal, words = "fixture"] of REFUSALS) {
    if (only && !only.includes(label)) continue;
    const { error, wrote } = await attempt(root, week, WORDS[words]());
    if (!error) problems.push(`${label}: accepted`);
    else if (!new RegExp(`${MENUS_WEEK}\\.json: (.*)?${refusal.source}`).test(error.message)) problems.push(`${label}: refused for another reason: ${error.message}`);
    if (wrote) problems.push(`${label}: something was written`);
  }
  return problems;
}
