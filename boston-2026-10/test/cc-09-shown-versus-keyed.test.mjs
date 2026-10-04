// CC-9 (SPEC-chefs-choice § 7.4): ⭐ shown versus keyed. Each meal of a picks file carries `name` (the store's card name,
// the ONLY key) and `display` (the KMS's name, the name the page shows). On the built page the fixture's tagged meal
// ("🟠NEW: Maple Dijon Pork Tenderloin", shown "Maple Dijon Pork Tenderloin"): its line shows `display`; its checkout
// link decodes to the key of `name`; its tile is the cell of `name`; and the link's photo part (the --photos payload)
// carries the cell of `name`. Every other meal of both counts is held to the same four rules.
//
// ⚠ The tagged meal alone cannot tell a link keyed on `display` from one keyed on `name`: since
// SPEC-rung2-progress-and-checkout § 15.1 the key drops a leading marketing tag, so a name and the same name without its
// tag share a key (a fixture control below says so). The fixture therefore also has one meal whose `display` is
// REWORDED ("Ginger Beef Rice Bowl", shown "Ginger Beef Bowl with Jasmine Rice"), whose key differs from its name's.
//
// Two MIRROR MUTANTS (a copy of the package's inputs, never the tree: protocols/mutate-in-a-mirror.md), each a one-line
// edit of the mirror's scripts/chefs-choice.mjs whose anchor must be present once, built by the program as the deploy
// builds (`node build.mjs`): the link keyed on `display` (CC-9b) and the line showing `name` (CC-9c). Each must fail the
// check the real page passes, for its own reason; the unchanged mirror (CC-9 control) passes it.
import test from "node:test";
import assert from "node:assert/strict";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  builtPage,
  card,
  DAYS,
  FIXTURE,
  mealLine,
  midday,
  mirror,
  ON,
  openPlanPage,
  picksData,
  picksDir,
  readWithFillB,
  withFixtureInData,
} from "./cc-harness.mjs";
import { FIXTURE_PHOTOS_PATH, FIXTURE_SHEETS_DIR, photoPage, programBuild } from "./pr-harness.mjs";
import { assertCheckedOut, LOG_PREFIX, refKey } from "./r2-harness.mjs";
import { PHOTOS, readPhotoPart, SHEET } from "./r2-photos.mjs";

const NOW = midday(DAYS["S-5"]);
const COUNTS = Object.keys(FIXTURE.menus);
const TAGGED = FIXTURE.menus["7"].find((m) => m.name.startsWith("🟠NEW:"));
const REWORDED = FIXTURE.menus["7"].find((m) => m.display !== m.name && !m.name.startsWith("🟠NEW:"));
const SHEET_URL = `${PHOTOS.base}${SHEET.file}`;

/** The keys a link's meal part carries, in its order (the photo part, after "!", is not read here). */
const keysOf = (href) =>
  new URL(href).hash
    .slice("#fitaf=".length)
    .split("!")[0]
    .split(".")
    .slice(1)
    .map((token) => token.split("*")[0]);

/** A cell's place on its sheet as a tile's style writes it (percentages, so the stylesheet alone sizes the tile). */
function cellPosition(c, sheet) {
  const pct = (n) => `${Number(n.toFixed(4))}%`;
  const at = (offset, size, whole) => (whole === size ? "0%" : pct((offset / (whole - size)) * 100));
  return `background-position:${at(c.x, c.w, sheet.width)} ${at(c.y, c.h, sheet.height)}`;
}

/** What a tile shows: "plain", or the sheet's URL and the cell's place. */
function tileOf(tile) {
  const style = tile?.getAttribute("style") ?? "";
  if (!style) return "plain";
  const url = /background-image:url\("([^"]+)"\)/.exec(style)?.[1];
  const position = /background-position:[^;]+/.exec(style)?.[0];
  return `${url} ${position}`;
}
const expectedTile = (name) => (SHEET.cells[name] ? `${SHEET_URL} ${cellPosition(SHEET.cells[name], SHEET)}` : "plain");

/**
 * Every way the page shown on `html` breaks § 7: per count, per meal, a line not showing `display` ("line"), a link
 * whose key is not the key of `name` ("key", every size's link), a link whose photo cell is not `name`'s ("link cell"),
 * a tile that is not `name`'s cell ("tile"). [] when the page is right.
 */
function problemsOf(html) {
  const problems = [];
  const data = picksData(html);
  if (!data) return ["page: no week on it"];
  for (const count of COUNTS) {
    const menu = FIXTURE.menus[count];
    const state = card(openPlanPage(html, { hash: `#lean-${count}`, now: NOW }));
    if (!state.list) {
      problems.push(`page ${count}: the list is not shown`);
      continue;
    }
    menu.forEach((meal, i) => {
      const at = `${count}[${i}] ${JSON.stringify(meal.name)}`;
      if (state.meals[i] !== mealLine(meal)) problems.push(`line ${at}: shows ${JSON.stringify(state.meals[i])}`);
      if (tileOf(state.tiles[i]) !== expectedTile(meal.name)) problems.push(`tile ${at}: ${tileOf(state.tiles[i])}`);
    });
    for (const [mpid, href] of Object.entries(data.weeks[0].counts[count].links)) {
      const keys = keysOf(href);
      const cells = readPhotoPart(href)?.cells ?? [];
      menu.forEach((meal, i) => {
        const at = `${count}[${i}] ${JSON.stringify(meal.name)}, mpid ${mpid}`;
        if (keys[i] !== refKey(meal.name)) problems.push(`key ${at}: ${keys[i]}, not ${refKey(meal.name)}`);
        if (JSON.stringify(cells[i] ?? null) !== JSON.stringify(SHEET.cells[meal.name] ?? null)) {
          problems.push(`link cell ${at}: ${JSON.stringify(cells[i] ?? null)}`);
        }
      });
    }
  }
  return problems;
}

test("CC-9a: the tagged meal's line shows display; its link is keyed on name; its tile and its link's cell are name's", async () => {
  // Fixture controls: what makes each rule observable.
  assert.ok(TAGGED && TAGGED.display !== TAGGED.name && !TAGGED.display.includes("🟠"), "the tagged meal's display has no tag");
  assert.ok(SHEET.cells[TAGGED.name], "the fixture sheet has a cell for the tagged meal's name");
  assert.equal(SHEET.cells[TAGGED.display], undefined, "and none under its display");
  assert.equal(refKey(TAGGED.display), refKey(TAGGED.name), "§ 15.1: a tag is not keyed, so the tagged meal's key cannot tell them apart");
  assert.ok(REWORDED, "a meal whose display is reworded");
  assert.notEqual(refKey(REWORDED.display), refKey(REWORDED.name), "whose key does tell them apart");

  const html = await photoPage("prod");
  assert.deepEqual(problemsOf(html), [], "every meal of both counts: shown display, keyed name, name's tile and cell");

  const i = FIXTURE.menus["7"].indexOf(TAGGED);
  const state = card(openPlanPage(html, { hash: "#lean-7", now: NOW }));
  assert.equal(state.meals[i], "Maple Dijon Pork Tenderloin", "the line shows display, without the tag");
  assert.equal(keysOf(state.checkout)[i], refKey(TAGGED.name), "Continue to checkout carries the key of name");
  assert.equal(tileOf(state.tiles[i]), expectedTile(TAGGED.name), "the tile is name's cell");
  assert.notEqual(expectedTile(TAGGED.name), "plain", "control: a photo, not a plain tile");

  // The link works in the store, whose cards show `name`: fill B (the shipped text) presses every meal its count.
  const { page, h, path } = await readWithFillB(state.checkout, FIXTURE.menus["7"].map((m) => m.name));
  assert.deepEqual(
    Object.fromEntries([...page.presses].map(([name, list]) => [name, list.length])),
    Object.fromEntries(FIXTURE.menus["7"].map((m) => [m.name, m.qty])),
    "each meal, found by its store name's card, pressed its qty",
  );
  const mpid = new URL(state.checkout).searchParams.get("mpid");
  assert.ok(h.info.includes(`${LOG_PREFIX} fill C, mpid ${mpid}`), `fill C read mpid ${mpid}: ${JSON.stringify(h.info)}`);
  assertCheckedOut(h, page, path);
});

// The mutants: each a one-line edit of the mirror's scripts/chefs-choice.mjs.
const LINK_LINE = '["--item", `${m.name}:${m.qty}`]';
const LINK_MUTANT = '["--item", `${m.display}:${m.qty}`]';
const SHOWN_LINE = "meals: menu.meals.map((m) => (m.qty > 1 ? fill(words.meal_qty, { meal: m.display, n: m.qty }) : m.display)),";
const SHOWN_MUTANT = "meals: menu.meals.map((m) => (m.qty > 1 ? fill(words.meal_qty, { meal: m.name, n: m.qty }) : m.name)),";

async function edit(path, from, to) {
  const text = await readFile(path, "utf8");
  assert.equal(text.split(from).length - 1, 1, `the mutation anchor is in ${path} once: ${from}`);
  await writeFile(path, text.replace(from, to));
}

/** `node build.mjs --on ON` in a mirror holding only the fixture week in data/picks/ and the fixture photo sheets in
 *  data/photo-sheets.json and src/assets/photo-sheets/; `change(dir)` edits the mirror first. The page it writes. */
async function mirrorPage(change = async () => {}) {
  const dir = await mirror(async (d) => {
    await rm(join(d, "data", "picks"), { recursive: true, force: true });
    await withFixtureInData(d);
    await copyFile(FIXTURE_PHOTOS_PATH, join(d, "data", "photo-sheets.json"));
    const sheets = join(d, "src", "assets", "photo-sheets");
    await rm(sheets, { recursive: true, force: true });
    await mkdir(sheets, { recursive: true });
    for (const file of ["carousel.jpg", SHEET.file]) await copyFile(join(FIXTURE_SHEETS_DIR, file), join(sheets, file));
    await change(d);
  });
  try {
    return (await programBuild(dir, "prod")).html;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const SCRIPT = (dir) => join(dir, "scripts", "chefs-choice.mjs");

test("CC-9 (control): the unchanged mirror, built by the program, passes the check", async () => {
  assert.deepEqual(problemsOf(await mirrorPage()), []);
});

test("CC-9b: a mirror keying the link on display fails it (the reworded meal's key; the tagged meal's tile and link cell)", async () => {
  const problems = problemsOf(await mirrorPage((dir) => edit(SCRIPT(dir), LINK_LINE, LINK_MUTANT)));
  const about = (kind, meal) => problems.filter((p) => p.startsWith(`${kind} `) && p.includes(JSON.stringify(meal.name)));
  assert.ok(about("key", REWORDED).length > 0, `killed by the key of name: ${JSON.stringify(problems)}`);
  assert.ok(about("tile", TAGGED).length > 0, `and by the tile of name: ${JSON.stringify(problems)}`);
  assert.ok(about("link cell", TAGGED).length > 0, `and by the link's cell of name: ${JSON.stringify(problems)}`);
  assert.deepEqual(about("line", TAGGED), [], "the line is not what changed");
});

test("CC-9c: a mirror showing name on the line fails it (the tagged and the reworded meal's lines)", async () => {
  const problems = problemsOf(await mirrorPage((dir) => edit(SCRIPT(dir), SHOWN_LINE, SHOWN_MUTANT)));
  for (const meal of [TAGGED, REWORDED]) {
    assert.ok(
      problems.some((p) => p.startsWith("line ") && p.includes(JSON.stringify(meal.name))),
      `killed by ${meal.name}'s line: ${JSON.stringify(problems)}`,
    );
  }
  assert.deepEqual(problems.filter((p) => !p.startsWith("line ")), [], "only the lines changed");
});

test("CC-9d: display is shown as the link tool reads a name (whitespace collapsed, trimmed) and is not a key", async () => {
  const week = structuredClone(FIXTURE);
  const i = week.menus["7"].findIndex((m) => m.name === TAGGED.name);
  week.menus["7"][i].display = "  Maple   Dijon\tPork\nTenderloin ";
  // Not a key: two meals may share a display (nothing is checked between display values, § 7.1).
  week.menus["14"][1].display = week.menus["14"][0].display;
  const dir = await picksDir({ "2026-10-04.json": week });
  try {
    const { html } = await builtPage({ picks: dir, on: ON });
    const data = picksData(html);
    assert.ok(data, "the build takes the file");
    assert.equal(data.weeks[0].counts["7"].meals[i], "Maple Dijon Pork Tenderloin", "the line, collapsed and trimmed");
    assert.equal(data.weeks[0].counts["14"].meals[1], mealLine(week.menus["14"][1]), "a shared display is shown as written");
    const fixture = picksData((await builtPage({ on: ON })).html);
    for (const count of COUNTS) {
      assert.deepEqual(data.weeks[0].counts[count].links, fixture.weeks[0].counts[count].links, `${count}: the links do not move with display`);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
