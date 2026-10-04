// SM-5 (SPEC-storybook-microsite.md § 5, ⭐ the states) and SM-8 (no request), in one walk, since SM-8 is "during SM-5".
//
// SM-5: in headless Chrome over the static build, served on 127.0.0.1 as Storybook's development server serves it, each
// story of § 3 opened in Storybook's own manager at 390 and 1280, for both builds, with each story's own defaults (the
// date § 3 gives it): *Chef's Choice* (SPEC-plan-page-refinement § 4) shows the committed week's meals for the count (7, the default, and 14),
// *No picks this week* no Chef's Choice button, *All plans* the grid, *Family* the Family panel, *Scroll* a frame as
// tall as its page; every story ready, on the page of its build and date, its frame at the viewport's width. Since
// SPEC-plan-page-refinement § 4: *Chef's Choice* (always open, one story) shows the week's meals for the count, a tile
// each; *All plans* presses the link and the grid shows in its modal.
// SM-8: during the walk (the manager, every story, the docs page), no request leaves 127.0.0.1.
//
// Mutants (in the suite): SM-8's, a server that forgets the pages' policy (microsite/serve.mjs), so the development
// page asks another host for its Turnstile script (refused here, recorded); SM-5's, a mirror of this package whose
// *Chef's Choice* opens on the *no picks* date (there is no press to forget since the list is always open), built and
// walked.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { cp, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TURNSTILE_SCRIPT_URL } from "../../../build.mjs";
import { BUILDS, DEFAULT_VIEWPORT, VIEWPORTS } from "../microsite/layout.js";
import { readJson, SITE, TOOL } from "./paths.mjs";
import { serveStatic } from "./serve-static.mjs";
import { buildStorybook, readManifest, removeStorybookStatic, storybookStatic } from "./storybook-static.mjs";
import { statesProblems, walk } from "./walk.mjs";

const WALK_TIMEOUT_MS = 1_800_000;
const ROOT = "Microsite";
/** Each story of § 3 and the date § 3 gives it (its default). */
const STORY_DATES = {
  "Individual · Start": "today",
  "Individual · Chosen": "today",
  "Individual · Chef's Choice": "week",
  "Individual · No picks this week": "none",
  "Individual · All plans": "today",
  "Family · Family": "today",
  "Whole page · Scroll": "today",
};
const OPEN = "Individual · Chef's Choice";
const MUTANT_DATE = ['cc: { name: "Chef\'s Choice", fragment: chosen, date: "week"', 'cc: { name: "Chef\'s Choice", fragment: chosen, date: "none"'];

after(removeStorybookStatic);

/** Story ids by "group · name", and the docs pages' ids, from a static build's index.json. */
async function indexOf(staticDir) {
  const index = await readJson(join(staticDir, "index.json"));
  const entries = Object.values(index.entries).filter((e) => e.title.startsWith(`${ROOT}/`));
  const stories = Object.fromEntries(entries.filter((e) => e.type === "story").map((e) => [`${e.title.slice(ROOT.length + 1)} · ${e.name}`, e.id]));
  return { stories, docs: entries.filter((e) => e.type === "docs").map((e) => e.id) };
}

/** What SM-5 expects to read: each count's meal lines of the committed week, the grid's size, the default count. */
async function expectations(manifest) {
  const week = manifest.dates.find((d) => d.id === "week");
  assert.ok(week.delivery, "fixture control: a committed week with picks");
  const picks = await readJson(join(SITE, "data", "picks", `${week.delivery}.json`));
  const { meal_qty: qty } = (await readJson(join(SITE, "data", "messages.json"))).chefs_choice;
  // SPEC-chefs-choice § 7.2: the list shows each meal's `display` (the KMS's name), never its `name` (the key).
  const line = ({ display, qty: n }) => {
    const shown = display.replace(/\s+/g, " ").trim();
    return n > 1 ? qty.replace("{meal}", shown).replace("{n}", String(n)) : shown;
  };
  const menus = Object.fromEntries(Object.entries(picks.menus).map(([count, meals]) => [count, meals.map(line)]));
  const plans = await readJson(join(SITE, "data", "plans.json"));
  return { menus, defaultMeals: String(plans.shown_counts[0].meals_per_week), gridLinks: plans.individual.length * plans.shown_counts.length };
}

function visitsFor(stories, { builds, viewports, only = Object.keys(STORY_DATES), menus }) {
  const visits = [];
  for (const build of builds) {
    for (const viewport of viewports) {
      for (const story of only) {
        const visit = { story: story.split(" · ").slice(1).join(" · "), id: stories[story], viewport, build, date: STORY_DATES[story] };
        assert.ok(visit.id, `index.json lists ${story}`);
        visits.push(visit);
        if (story === OPEN) for (const meals of Object.keys(menus).slice(1)) visits.push({ ...visit, extra: { meals } });
      }
    }
  }
  return visits;
}

test("SM-5 and SM-8: every story shows its state at 390 and 1280, for both builds; no request leaves 127.0.0.1", { timeout: WALK_TIMEOUT_MS }, async (t) => {
  const { dir } = await storybookStatic();
  const expected = await expectations(await readManifest(dir));
  const { stories, docs } = await indexOf(dir);
  const server = await serveStatic(dir);
  t.after(server.close);
  const visits = visitsFor(stories, { builds: BUILDS.map((b) => b.id), viewports: Object.keys(VIEWPORTS), menus: expected.menus });
  const { results, outside } = await walk({ base: server.base, visits, docs });
  assert.equal(results.length, visits.length, "fixture control: every visit read");
  assert.deepEqual(statesProblems(results, expected), [], "SM-5");
  assert.deepEqual(outside, [], "SM-8");
});

test("SM-8 (mutant): a server that forgets the pages' policy lets the development page ask another host", { timeout: WALK_TIMEOUT_MS }, async (t) => {
  const { dir } = await storybookStatic();
  const { stories } = await indexOf(dir);
  const server = await serveStatic(dir, { policy: false });
  t.after(server.close);
  const visits = visitsFor(stories, { builds: ["development"], viewports: [DEFAULT_VIEWPORT], only: ["Individual · Start"], menus: (await expectations(await readManifest(dir))).menus });
  const { outside } = await walk({ base: server.base, visits });
  assert.deepEqual(outside, [TURNSTILE_SCRIPT_URL]);
});

test("SM-5 (mutant): a Chef's Choice story on a date with no picks fails", { timeout: WALK_TIMEOUT_MS }, async (t) => {
  const work = await mkdtemp(join(tmpdir(), "fitaf-storybook-sm-5-mutant-"));
  t.after(() => rm(work, { recursive: true, force: true }));
  assert.ok(existsSync(join(TOOL, "stories", "states.js")), "the stories' states (§ 3), stories/states.js");
  const mirror = join(work, "storybook");
  for (const part of [".storybook", "stories", "microsite", "package.json"]) await cp(join(TOOL, part), join(mirror, part), { recursive: true });
  await symlink(join(TOOL, "node_modules"), join(mirror, "node_modules"));
  const states = join(mirror, "stories", "states.js");
  const source = await readFile(states, "utf8");
  assert.equal(source.split(MUTANT_DATE[0]).length, 2, `fixture control: one ${MUTANT_DATE[0]} in stories/states.js`);
  await writeFile(states, source.replace(MUTANT_DATE[0], MUTANT_DATE[1]));
  const out = join(work, "storybook-static");
  await buildStorybook({ toolDir: mirror, outDir: out, pagesDir: join(work, "pages"), env: { MICROSITE_SITE: SITE } });
  const { stories } = await indexOf(out);
  const expected = await expectations(await readManifest(out));
  const server = await serveStatic(out);
  t.after(server.close);
  const visits = visitsFor(stories, { builds: ["production"], viewports: [DEFAULT_VIEWPORT], only: [OPEN], menus: { [expected.defaultMeals]: [] } });
  const { results } = await walk({ base: server.base, visits });
  const problems = statesProblems(results, expected);
  assert.ok(problems.some((p) => p.startsWith("Chef's Choice · 390 · production: the list is not shown")), problems.join("\n"));
});
