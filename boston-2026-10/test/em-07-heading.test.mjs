// EM7 (SPEC-every-menu-and-nutrition.md § 11 items 1 and 6, the Advisor's review of 2026-10-22: *"The name of the menu
// is just "Chef's Choice", etc – the date range is for internal reference"*): the list's heading reads the menu's name
// alone, and the week's range is not shown. On the production page and the development page, with each menu chosen in
// turn: the fixture week of two menus (its words: data/messages.json as committed, with the invented list's name), a week
// naming a real list (`gluten-free`, data/messages.json as committed) and a week of one list (the v2 fixture). And the
// phrase: `chefs_choice.heading` is `{menu}`, the build still accepting a `{week}` (§ 11 item 1: "a placeholder the build
// accepts but this page's words no longer use"). Every expectation is the menu's name as the words give it.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "../build.mjs";
import { MESSAGES, weekOf } from "./cc-harness.mjs";
import { chooserOf, chooseMenu, FIXTURE_LIST, fixtureWords, MENUS, MENUS_WEEK, menusPage, messagesFile, openMenus, picksCopy } from "./em-harness.mjs";
import { V2_DIR } from "./ms-harness.mjs";

const HASH = "#lean-or-7d"; // both lists of the fixture have a cart for it
const REAL_LIST = "gluten-free";
const heading = (page) => page.document.getElementById("cc-heading")?.textContent.replace(/\s+/g, " ").trim() ?? null;

/** One line per menu whose heading is not its name alone, on the page `html`, each menu chosen in turn. */
function headingProblems(html, names, where) {
  const page = openMenus(html, HASH);
  const { values } = chooserOf(page);
  const lists = values.length ? values : ["chefs-choice"];
  const problems = [];
  if (JSON.stringify(lists) !== JSON.stringify(Object.keys(names))) problems.push(`${where}: fixture control: the menus offered ${JSON.stringify(lists)}`);
  for (const list of lists) {
    if (values.length) chooseMenu(page, list);
    const shown = heading(page);
    if (shown !== names[list]) problems.push(`${where} ${list}: the heading ${JSON.stringify(shown)}, not the menu's name ${JSON.stringify(names[list])}`);
    if (shown && shown.includes(weekOf(MENUS_WEEK))) problems.push(`${where} ${list}: the heading shows the week's range`);
  }
  return problems;
}

for (const target of ["prod", "dev"]) {
  test(`EM7 (${target}): with two menus, each menu's heading is its name alone, no range`, async () => {
    const words = fixtureWords();
    const html = await menusPage({ target, messages: words });
    assert.deepEqual(headingProblems(html, { "chefs-choice": words.menus["chefs-choice"], [FIXTURE_LIST]: words.menus[FIXTURE_LIST] }, target), []);
  });

  test(`EM7 (${target}): a week naming a real list (${REAL_LIST}), data/messages.json as committed: each heading its name alone`, async () => {
    const week = structuredClone(MENUS);
    week.lists = { "chefs-choice": week.lists["chefs-choice"], [REAL_LIST]: week.lists[FIXTURE_LIST] };
    delete week.meals; // its keys name the invented list's meals by their own names: not needed for the heading
    const picks = await picksCopy(week);
    try {
      const html = await menusPage({ target, messages: MESSAGES, picks: picks.dir });
      assert.deepEqual(headingProblems(html, { "chefs-choice": MESSAGES.menus["chefs-choice"], [REAL_LIST]: MESSAGES.menus[REAL_LIST] }, target), []);
    } finally {
      await picks.done();
    }
  });

  test(`EM7 (${target}): a week of one list, data/messages.json as committed: the heading is Chef's Choice's name alone`, async () => {
    const html = await menusPage({ target, messages: MESSAGES, picks: V2_DIR });
    assert.deepEqual(headingProblems(html, { "chefs-choice": MESSAGES.menus["chefs-choice"] }, target), []);
  });
}

test("EM7: chefs_choice.heading is {menu}, and the build still accepts a {week}", async () => {
  assert.equal(MESSAGES.chefs_choice.heading, "{menu}", "the committed phrase: the menu's name alone");
  const words = structuredClone(MESSAGES);
  words.chefs_choice.heading = "{menu} ({week})";
  const file = await messagesFile(words);
  const outDir = await mkdtemp(join(tmpdir(), "boston-em-07-"));
  try {
    await assert.doesNotReject(build({ target: "prod", outDir, messagesPath: file.path }), "a heading carrying {week} builds");
  } finally {
    await file.done();
    await rm(outDir, { recursive: true, force: true });
  }
});
