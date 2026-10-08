// SM-5 (SPEC-storybook-microsite.md § 5, ⭐ the states) and SM-8 (no request), in one walk, since SM-8 is "during SM-5";
// and since § 8.4, SM-10 (the Hand-off stories' states) and SM-11 (never pays) in the same walk, "SM-5's walk", with
// SM-8 extended to the new stories.
//
// SM-5: in headless Chrome over the static build, served on 127.0.0.1 as Storybook's development server serves it, each
// story of § 3 opened in Storybook's own manager at 390 and 1280, for both builds, with each story's own defaults (the
// date § 3 gives it): *Chef's Choice* (SPEC-plan-page-refinement § 4) shows the committed week's meals for the count (7, the default, and 14),
// *No picks this week* no Chef's Choice button, *All plans* the grid, *Family* the Family panel, *Scroll* a frame as
// tall as its page; every story ready, on the page of its build and date, its frame at the viewport's width. Since
// SPEC-plan-page-refinement § 4: *Chef's Choice* (always open, one story) shows the week's meals for the count, a tile
// each; *All plans* presses the link and the grid shows in its modal.
// SPEC-meal-selection § 9 (in SM-5's walk): the Meal selection stories at 390 and 1280, both builds: *Goal buttons* one
// facts block per goal; each answer set on the fixture week's date its own answer set on the card (data-selection), its
// answers pressed, its cart's lines; snacks chosen (Q4) the week's snack list for its days (none for weekdays) and the
// not-carted line; *No snacks* none.
// SM-10: each Hand-off story of § 8.3 at 390 and 1280 (Screen · B at 2 of 7, its default, and at 10 of 14):
// test/handoff-expect.mjs says what each must show.
// SM-11: no visit's console carries the fixture's "[fixture] ORDER PLACED" (its control: every visit that ran the
// hand-off carries the store's CHECKOUT line, so the frame's console is heard at all).
// SM-8: during the walk (the manager, every story, the docs page), no request leaves 127.0.0.1.
//
// Mutants (in the suite): SM-8's, a server that forgets the pages' policy (microsite/serve.mjs), so the development
// page asks another host for its Turnstile script (refused here, recorded); SM-5's, a mirror of this package whose
// *Chef's Choice* opens on the *no picks* date (there is no press to forget since the list is always open), built and
// walked. § 8.4: SM-8's for the store, a server that forgets the store pages' policy, where the block, given a link with
// a photo part, asks a listed host for its sheet (with the policy, the control, it asks nothing); and SM-10's and
// SM-11's, one mirror of this package with two changes, each on its own story: a *Checkout · 2 Delivery* that stops at
// step 1 (SM-10 fails it, and only it) and a *Checkout · 3 Payment* that presses the store's pay button (SM-11 fails it,
// and only it).
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { cp, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { TURNSTILE_SCRIPT_URL } from "../../../build.mjs";
import { BUILDS, DEFAULT_VIEWPORT, VIEWPORTS } from "../microsite/layout.js";
import { ORDER_PATH, STORE, storeUrl } from "../handoff/layout.js";
import { handoffProblems, payProblems, SECTIONS, unheardCheckouts } from "./handoff-expect.mjs";
import { readJson, SITE, TOOL } from "./paths.mjs";
import { serveStatic } from "./serve-static.mjs";
import { buildStorybook, readManifest, readStoreManifest, removeStorybookStatic, storybookStatic } from "./storybook-static.mjs";
import { statesProblems, visitDirect, walk } from "./walk.mjs";

const WALK_TIMEOUT_MS = 1_800_000;
const ROOT = "Microsite";
const HANDOFF = "Hand-off";
/** Screen · B's readings: its default, and a meal's second press on the 14-meal link. */
const SCREEN_B = [{ k: 2, t: 7 }, { k: 10, t: 14 }];
/** The parts of this package a mirror of it needs to build (its install is linked, not copied). */
const PACKAGE_PARTS = [".storybook", "stories", "microsite", "handoff", "package.json"];
/** SM-8's store mutant: the sheet a link's photo part names, on the block's first listed host; and how long to watch. */
const PROBE_SHEET = "/sm-8-probe.jpg";
const DIRECT_VISIT_MS = 4_000;
/** SM-10's and SM-11's mirror: Checkout · 2 made to stop at step 1; Checkout · 3 made to press the pay button. */
const MUTANT_STOP = ['checkout2: checkout(2, "The deep-carted checkout at step 2."', 'checkout2: checkout(1, "The deep-carted checkout at step 2."'];
const MUTANT_PAY_AT = "      await until(() => atStep(now + 1), WHY.step(now + 1), PRESS_TIMEOUT_MS);\n    }\n";
const MUTANT_PAY = '    if (state.step === 3) el(".checkout__submit button").click();\n';
/** Each story of § 3 and the date § 3 gives it (its default); and SPEC-meal-selection § 9's, each with its answer part. */
const STORY_DATES = {
  "Individual · Start": "today",
  "Individual · Chosen": "today",
  "Individual · Chef's Choice": "week",
  "Individual · No picks this week": "none",
  "Individual · All plans": "today",
  "Family · Family": "today",
  "Whole page · Scroll": "today",
  "Meal selection · Goal buttons": "today",
};
const MEAL_SELECTION = {
  "or · every day": "or-7d",
  "or · weekdays": "or-5d",
  "and · every day": "and-7d",
  "and · weekdays": "and-5d",
  "or · every day · breakfast": "or-7d-b",
  "or · weekdays · breakfast": "or-5d-b",
  "and · every day · breakfast": "and-7d-b",
  "and · weekdays · breakfast": "and-5d-b",
  "and · every day · breakfast · snacks": "and-7d-b-s",
  "or · weekdays · snacks, no list": "or-5d-s",
};
for (const name of Object.keys(MEAL_SELECTION)) STORY_DATES[`Meal selection · ${name}`] = "fixture";
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
  // SPEC-meal-selection § 9: the fixture week's carts by answer set, its snacks by days, as the card shows them.
  const fixture = manifest.dates.find((d) => d.id === "fixture");
  assert.ok(fixture.delivery && fixture.picks, "fixture control: the fixture week (version 2)");
  const list = (await readJson(join(SITE, fixture.picks, `${fixture.delivery}.json`))).lists["chefs-choice"];
  const keyOf = (c) => `${c.lunch_dinner}-${c.weekends ? "7d" : "5d"}${c.breakfast ? "-b" : ""}`;
  const carts = Object.fromEntries(list.carts.map((c) => [keyOf(c), c.items.map(line)]));
  const snacks = Object.fromEntries(Object.entries(list.snacks ?? {}).map(([d, meals]) => [`${d}d`, meals.map(line)]));
  return { menus, defaultMeals: String(plans.shown_counts[0].meals_per_week), gridLinks: plans.individual.length * plans.shown_counts.length, carts, snacks };
}

function visitsFor(stories, { builds, viewports, only = Object.keys(STORY_DATES), menus }) {
  const visits = [];
  for (const build of builds) {
    for (const viewport of viewports) {
      for (const story of only) {
        const name = story.split(" · ").slice(1).join(" · ");
        const answers = story.startsWith("Meal selection · ") ? MEAL_SELECTION[name] : undefined;
        const visit = { story: name, id: stories[story], viewport, build, date: STORY_DATES[story], ...(answers ? { answers } : {}) };
        assert.ok(visit.id, `index.json lists ${story}`);
        visits.push(visit);
        if (story === OPEN) for (const meals of Object.keys(menus).slice(1)) visits.push({ ...visit, extra: { meals } });
      }
    }
  }
  return visits;
}

/** The Hand-off stories' visits: each at each viewport; Screen · B at each of SCREEN_B. */
function handoffVisits(stories, { viewports, only = null }) {
  const names = Object.keys(stories).filter((s) => s.startsWith(`${HANDOFF} · `) && (!only || only.includes(s)));
  const visits = [];
  for (const viewport of viewports) {
    for (const name of names) {
      const visit = { story: name.slice(HANDOFF.length + 3), id: stories[name], viewport, handoff: true, sections: SECTIONS };
      if (visit.story === "Screen · B") for (const extra of SCREEN_B) visits.push({ ...visit, extra });
      else visits.push(visit);
    }
  }
  return visits;
}

/** data/messages.json's `handoff`: the screen's words, which SM-10 reads the step line against. */
const handoffWords = async () => (await readJson(join(SITE, "data", "messages.json"))).handoff;

let walked;
/** The one walk (§ 5, § 8.4): every story of § 3 and § 8.3, at both widths, and the docs page; read by four cases. */
function theWalk() {
  walked ??= (async () => {
    const { dir } = await storybookStatic();
    const expected = await expectations(await readManifest(dir));
    const { stories, docs } = await indexOf(dir);
    const server = await serveStatic(dir);
    try {
      const viewports = Object.keys(VIEWPORTS);
      const visits = [
        ...visitsFor(stories, { builds: BUILDS.map((b) => b.id), viewports, menus: expected.menus }),
        ...handoffVisits(stories, { viewports }),
      ];
      const { results, outside } = await walk({ base: server.base, visits, docs });
      assert.equal(results.length, visits.length, "fixture control: every visit read");
      return { dir, results, outside, expected };
    } finally {
      await server.close();
    }
  })();
  return walked;
}

test("SM-5: every story of § 3 shows its state at 390 and 1280, for both builds", { timeout: WALK_TIMEOUT_MS }, async () => {
  const { results, expected } = await theWalk();
  assert.deepEqual(statesProblems(results.filter((r) => !r.handoff), expected), [], "SM-5");
});

test("SM-5 (SPEC-meal-selection § 9, control): the walk's reading refuses a wrong cart, wrong answers and a missing snack line", () => {
  const expected = { menus: {}, defaultMeals: "7", gridLinks: 6, carts: { "and-7d-b": ["A × 2", "B"], "or-5d": ["C"] }, snacks: { "7d": ["S × 3"] } };
  const base = { state: "ready", width: 390, frameWidth: 390, innerWidth: 390, build: "production", date: "fixture", path: "/microsite/production/fixture/index.html", ccList: true, snackLines: [], snackNote: false };
  const right = { ...base, story: "and · every day · breakfast · snacks", answers: "and-7d-b-s", selection: "and-7d-b-s", pressed: ["lunch_dinner:and", "weekends:yes", "breakfast:yes", "snacks:yes"], meals: ["A × 2", "B"], snackLines: ["S × 3"], snackNote: true };
  assert.deepEqual(statesProblems([right], expected), [], "control: the right reading passes");
  const wrong = [
    { ...right, meals: ["C"] },
    { ...right, selection: "and-7d-b" },
    { ...right, pressed: ["lunch_dinner:and", "weekends:yes", "breakfast:no", "snacks:yes"] },
    { ...right, snackLines: [] },
    { ...right, snackNote: false },
    { ...base, story: "or · weekdays", answers: "or-5d", selection: "or-5d", pressed: ["lunch_dinner:or", "weekends:no", "breakfast:no", "snacks:no"], meals: ["C"], snackNote: true },
  ];
  for (const r of wrong) assert.equal(statesProblems([r], expected).length, 1, JSON.stringify(r));
});

test("SM-8: during the walk (§ 3's stories, § 8.3's, the docs page), no request leaves 127.0.0.1", { timeout: WALK_TIMEOUT_MS }, async () => {
  const { results, outside } = await theWalk();
  assert.ok(results.some((r) => r.handoff) && results.some((r) => !r.handoff), "fixture control: both kinds of story walked");
  assert.deepEqual(outside, [], "SM-8");
});

test("SM-10: every Hand-off story shows its state at 390 and 1280", { timeout: WALK_TIMEOUT_MS }, async () => {
  const { dir, results } = await theWalk();
  const store = await readStoreManifest(dir);
  const handoff = results.filter((r) => r.handoff);
  assert.equal(handoff.length, Object.keys(VIEWPORTS).length * (7 + SCREEN_B.length - 1), "fixture control: § 8.3's seven stories, Screen · B twice, at each width");
  assert.deepEqual(handoffProblems(handoff, { words: await handoffWords(), links: store.links }), [], "SM-10");
});

test("SM-11: no story's walk logs the fixture's ORDER PLACED", { timeout: WALK_TIMEOUT_MS }, async () => {
  const { results } = await theWalk();
  const reaching = results.filter((r) => r.handoff && /^(Screen · C|Checkout · \d)/.test(r.story));
  assert.equal(reaching.length, Object.keys(VIEWPORTS).length * 4, "fixture control: Screen · C and the three checkout steps walked at each width");
  assert.deepEqual(unheardCheckouts(results), [], "fixture control: every hand-off that reached CHECKOUT was heard in the console");
  assert.deepEqual(payProblems(results), [], "SM-11");
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
  for (const part of PACKAGE_PARTS) await cp(join(TOOL, part), join(mirror, part), { recursive: true });
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

test("SM-8 (§ 8.4, mutant): a server that forgets the store pages' policy lets the block ask a listed host for a link's photo sheet", { timeout: WALK_TIMEOUT_MS }, async (t) => {
  const { dir } = await storybookStatic();
  const store = await readStoreManifest(dir);
  const link = store.links[store.defaultCount];
  const { encodePayload, mealKey, PHOTO_HOSTS } = await import(pathToFileURL(join(SITE, "scripts", "handoff-link.mjs")).href);
  const items = link.items.map((it) => ({ key: mealKey(it.name), qty: it.qty }));
  const cells = items.map(() => ({ x: 0, y: 0, w: 10, h: 10 }));
  const hash = `#fitaf=${encodePayload({ items, photos: { host: 0, path: PROBE_SHEET, width: 100, cells } })}`;
  const path = storeUrl({ path: ORDER_PATH, search: link.search, store: STORE.checkout, hash });
  for (const policy of [true, false]) {
    const server = await serveStatic(dir, { policy });
    try {
      const { outside, console: lines } = await visitDirect({ base: server.base, path, ms: DIRECT_VISIT_MS });
      assert.ok(lines.some((l) => l.startsWith("[fitaf-handoff] fill C")), `fixture control (policy ${policy}): the block ran the link`);
      t.diagnostic(`policy ${policy}: requests off 127.0.0.1 ${JSON.stringify(outside)}`);
      if (policy) assert.deepEqual(outside, [], "control: with the policy, nothing asked of another host");
      else assert.ok(outside.length > 0 && outside.every((u) => u === `${PHOTO_HOSTS[0]}${PROBE_SHEET}`), `without it, the sheet asked of ${PHOTO_HOSTS[0]}: ${JSON.stringify(outside)}`);
    } finally {
      await server.close();
    }
  }
});

test("SM-10 and SM-11 (mutants): a Checkout · 2 that stops at step 1 fails SM-10; a Checkout · 3 that presses the pay button fails SM-11", { timeout: WALK_TIMEOUT_MS }, async (t) => {
  const work = await mkdtemp(join(tmpdir(), "fitaf-storybook-sm-10-11-mutant-"));
  t.after(() => rm(work, { recursive: true, force: true }));
  const mirror = join(work, "storybook");
  for (const part of PACKAGE_PARTS) await cp(join(TOOL, part), join(mirror, part), { recursive: true });
  await symlink(join(TOOL, "node_modules"), join(mirror, "node_modules"));
  const states = join(mirror, "stories", "handoff-states.js");
  const frame = join(mirror, "stories", "handoff-frame.js");
  const [stateSource, frameSource] = [await readFile(states, "utf8"), await readFile(frame, "utf8")];
  assert.equal(stateSource.split(MUTANT_STOP[0]).length, 2, `fixture control: one ${MUTANT_STOP[0]}`);
  assert.equal(frameSource.split(MUTANT_PAY_AT).length, 2, "fixture control: one end of the Continue loop in stories/handoff-frame.js");
  await writeFile(states, stateSource.replace(MUTANT_STOP[0], MUTANT_STOP[1]));
  await writeFile(frame, frameSource.replace(MUTANT_PAY_AT, MUTANT_PAY_AT + MUTANT_PAY));
  const out = join(work, "storybook-static");
  await buildStorybook({ toolDir: mirror, outDir: out, pagesDir: join(work, "pages"), env: { MICROSITE_SITE: SITE } });
  const { stories } = await indexOf(out);
  const store = await readStoreManifest(out);
  const server = await serveStatic(out);
  t.after(server.close);
  const only = ["Checkout · 2 Delivery", "Checkout · 3 Payment"].map((s) => `${HANDOFF} · ${s}`);
  const { results } = await walk({ base: server.base, visits: handoffVisits(stories, { viewports: [DEFAULT_VIEWPORT], only }) });
  const sm10 = handoffProblems(results, { words: await handoffWords(), links: store.links });
  for (const line of [...sm10, ...payProblems(results)]) t.diagnostic(line);
  assert.ok(sm10.length > 0 && sm10.every((p) => p.startsWith("Checkout · 2 Delivery · 390: ")), `SM-10 fails Checkout · 2 only:\n${sm10.join("\n")}`);
  assert.ok(sm10.some((p) => p.includes("not step 2")), sm10.join("\n"));
  assert.deepEqual(payProblems(results), ["Checkout · 3 Payment · 390: [fixture] ORDER PLACED"], "SM-11 fails Checkout · 3 only");
});
