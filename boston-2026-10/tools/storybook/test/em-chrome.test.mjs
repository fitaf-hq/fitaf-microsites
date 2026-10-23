// EM2 and EM3 of the site's SPEC-every-menu-and-nutrition.md (§ 2, § 3, § 6), in Chrome, here because this package
// drives Chrome and the site never installs a driver (W2, in w-why-chrome.test.mjs, is the model):
//   EM2, the chooser: with two lists holding a cart for the answers, the group of the menus' names is shown (a native
//   radio group: each a radio, keyboard reachable, its state the browser's own), Chef's Choice selected; choosing the
//   second (pressed, and by the arrow keys) shows its meals, its snacks and its heading, and its checkout link decodes
//   (the SHIPPED reader of #fitaf=, the site's cc-harness readWithFillB) to THAT list's cart and the size's mpid; an
//   answer change the chosen menu has a cart for keeps it, one it has none for returns to Chef's Choice. A week of one
//   list: no group, and the card as the base's (76ee36e, this contract's commit) shows it, text and boxes.
//   EM3, nutrition: the meal a button whose aria-expanded follows the panel it opens beneath it and a second press
//   closes; each meal on its own. Since § 11 (the Advisor's review of 2026-10-22) there is no line under a meal's name at
//   any size; a meal is a control when it has numbers for the chosen size or ingredients (§ 11 item 4.2: "a meal with
//   neither has no panel and no mark"), its panel the ingredients and Contains when it has them; a meal with no entry
//   is no control.
//   EM9 (§ 11 items 4 and 6, at 390 and 1280): opening a meal shows its rings for the chosen size first, five in the
//   contract's order (Calories, Protein, Carbs, Fat, Fiber, by the words), each its size's number, its arc the value
//   over the number's daily amount (clamped), in the store's colour on the store's track, then the ingredients and
//   Contains; a meal with no numbers for the size shows no rings and keeps its ingredients.
// ⭐ Mutants, each on a copy of the built page with ONE line of its script changed (read from the page, never written
// here: SM-4), its control the copy as built: the checkout link taken from Chef's Choice's cart whatever is chosen
// fails EM2; a ring's arc taken over another number's daily amount fails EM9; the rings read from the first size
// present rather than the chosen one fail EM9. (EM3's own mutant, the line from the first size, went with the line.)
// The page is the site's own production build (`node build.mjs --out`), the fixture week (the site's
// test/fixtures/picks-menus/, invented names) made into content by the site's own weekData with the fixture's words
// (test/fixtures/menus-words.mjs) and put into #picks-data by its own pageWithWeek, as the Workers put the bucket's;
// served on 127.0.0.1, nothing else requested. Every expectation is worked out from the fixture and the words.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { siteBuild } from "../microsite/pages.mjs";
import { VIEWPORTS } from "../microsite/layout.js";
import { siteFile, SITE } from "../microsite/paths.mjs";
import { freshChrome } from "./chrome.mjs";
import { serveStatic } from "./serve-static.mjs";
import { isLocal } from "./walk.mjs";

const em = await import(pathToFileURL(siteFile("test", "em-harness.mjs")).href);
const ms = await import(pathToFileURL(siteFile("test", "ms-harness.mjs")).href);
const content = await import(pathToFileURL(siteFile("scripts", "week-content.mjs")).href);

const TIMEOUT_MS = 180_000;
const BASE = "76ee36e";
const CC = em.SHOWN_LIST;
const TWO = em.FIXTURE_LIST;
const WORDS = em.fixtureWords();
const W390 = VIEWPORTS.w390;

/** The production build with the week of `picks` in its #picks-data, made by `weekData` and `pageWithWeek` (the site's,
 *  or a base tree's) with `messages`, into `out`. */
async function weekSite(out, { picks = em.MENUS_DIR, week = em.MENUS_WEEK, messages = WORDS, weekData = content.weekData, pageWithWeek = content.pageWithWeek } = {}) {
  const words = await em.messagesFile(messages);
  try {
    const { data } = await weekData({ week, picksDir: picks, messagesPath: words.path });
    const page = join(out, "index.html");
    await writeFile(page, pageWithWeek(await readFile(page, "utf8"), data));
  } finally {
    await words.done();
  }
}

const menusOut = await mkdtemp(join(tmpdir(), "fitaf-storybook-em-"));
const oneOut = await mkdtemp(join(tmpdir(), "fitaf-storybook-em-one-"));
const baseOut = await mkdtemp(join(tmpdir(), "fitaf-storybook-em-base-"));
const scratch = await realpath(await mkdtemp(join(tmpdir(), "fitaf-storybook-em-tree-")));
after(() => Promise.all([menusOut, oneOut, baseOut, scratch].map((d) => rm(d, { recursive: true, force: true }))));
/** The fixture's page, built once, when a case first needs it (so a refusal is that case's red, not the file's). */
let menusReady = null;
const menusPage = () => (menusReady ??= siteBuild({ build: "production", out: menusOut }).then(() => weekSite(menusOut)));

/** `fn(page)` on the page served from `dir` at `hash`, `width` wide, in a fresh Chrome. Refuses any request off 127.0.0.1. */
async function withPage({ dir = menusOut, hash, width = W390.width }, fn) {
  const server = await serveStatic(dir);
  const chrome = await freshChrome();
  try {
    const page = await chrome.browser.newPage();
    await page.setViewport({ width, height: W390.height });
    await page.setRequestInterception(true);
    page.on("request", (r) => (isLocal(r.url()) ? r.continue() : r.abort()));
    await page.goto(`${server.base}/index.html${hash}`, { waitUntil: "load" });
    await page.waitForSelector("#result:not([hidden])");
    return await fn(page);
  } finally {
    await chrome.close();
    await server.close();
  }
}

/** Runs in the page: the card as a visitor meets it, by what the browser draws (checkVisibility). */
function readCard() {
  const $ = (id) => document.getElementById(id);
  const drawn = (el) => Boolean(el) && el.checkVisibility();
  const text = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : null);
  const group = $("cc-menus");
  const radios = group ? [...group.querySelectorAll('input[type="radio"]')] : [];
  return {
    list: drawn($("cc-list")),
    group: drawn(group),
    radios: radios.map((r) => ({ value: r.value, label: text(r.closest("label")), checked: r.checked, name: r.name })),
    focused: document.activeElement?.type === "radio" ? document.activeElement.value : null,
    heading: text($("cc-heading")),
    meals: [...($("cc-meals")?.children ?? [])].map((li) => {
      const button = li.querySelector("button");
      const panel = button ? document.getElementById(button.getAttribute("aria-controls")) : null;
      const line = li.querySelector(".cc-line");
      const below = panel && drawn(panel) ? panel.getBoundingClientRect().top >= button.getBoundingClientRect().bottom - 1 : null;
      return {
        name: text(li.querySelector(".cc-name")),
        line: drawn(line) ? text(line) : null,
        control: Boolean(button),
        expanded: button ? button.getAttribute("aria-expanded") : null,
        open: drawn(panel),
        below,
        more: panel ? [...panel.querySelectorAll("p")].map(text) : null,
      };
    }),
    snacks: drawn($("cc-snack-list")) ? [...$("cc-snack-list").children].map(text) : null,
    checkout: $("cc-checkout")?.href ?? null,
  };
}
const card = (page) => page.evaluate(readCard);
/** Wait until the page has handled what a press set going: the hashchange task app.js and the card listen to. */
const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))));
const press = async (page, selector) => {
  await page.click(selector);
  await settle(page);
};
const chooseMenu = (page, list) => press(page, `#cc-menus input[value="${list}"]`);

/** The fixture's cart of `list` for `key`, and its lines as the list shows them. */
const cartOf = (list, key) => em.cartsOf(list)[key];
const linesOf = (list, key) => cartOf(list, key).items.map((m) => em.displayOf(m, WORDS));

/** One line per thing EM2 does not hold on the fixture's page; [] when all do. */
async function chooserProblems(dir = menusOut) {
  if (dir === menusOut) await menusPage();
  const problems = [];
  const fail = (what) => problems.push(what);
  await withPage({ dir, hash: "#lean-or-7d" }, async (page) => {
    let s = await card(page);
    if (!s.group) fail("#lean-or-7d: the chooser is not shown");
    if (JSON.stringify(s.radios.map((r) => r.value)) !== JSON.stringify([CC, TWO])) fail(`the chooser's menus ${JSON.stringify(s.radios.map((r) => r.value))}`);
    if (JSON.stringify(s.radios.map((r) => r.label)) !== JSON.stringify([WORDS.menus[CC], WORDS.menus[TWO]])) fail(`the chooser's names ${JSON.stringify(s.radios.map((r) => r.label))}`);
    if (new Set(s.radios.map((r) => r.name)).size !== 1) fail("the radios are not one group (one name)");
    if (JSON.stringify(s.radios.filter((r) => r.checked).map((r) => r.value)) !== JSON.stringify([CC])) fail("Chef's Choice is not the one selected first");
    if (s.heading !== em.headingOf(CC, WORDS)) fail(`Chef's Choice's heading: ${s.heading}`);
    if (JSON.stringify(s.meals.map((m) => m.name)) !== JSON.stringify(linesOf(CC, "or-7d"))) fail(`Chef's Choice's meals: ${JSON.stringify(s.meals.map((m) => m.name))}`);
    // The state, as assistive technology reads it: radios, checked as shown.
    // Every node (the default keeps only those it finds interesting, which leaves out a radio the arrow keys reach).
    const ax = await page.accessibility.snapshot({ root: await page.$("#cc-menus"), interestingOnly: false });
    const axRadios = [];
    const walk = (n) => n && (n.role === "radio" && axRadios.push({ name: n.name, checked: Boolean(n.checked) }), (n.children ?? []).forEach(walk));
    walk(ax);
    if (ax?.role !== "group" || ax?.name !== WORDS.chefs_choice.menus_label) fail(`the group's own name: ${ax?.role} ${JSON.stringify(ax?.name)}, not the words' ${JSON.stringify(WORDS.chefs_choice.menus_label)}`);
    if (JSON.stringify(axRadios) !== JSON.stringify([{ name: WORDS.menus[CC], checked: true }, { name: WORDS.menus[TWO], checked: false }])) fail(`the accessibility tree: ${JSON.stringify(axRadios)}`);

    await chooseMenu(page, TWO);
    s = await card(page);
    if (JSON.stringify(s.radios.filter((r) => r.checked).map((r) => r.value)) !== JSON.stringify([TWO])) fail("pressed, the second menu is not selected");
    if (s.heading !== em.headingOf(TWO, WORDS)) fail(`the second menu's heading: ${s.heading}`);
    if (JSON.stringify(s.meals.map((m) => m.name)) !== JSON.stringify(linesOf(TWO, "or-7d"))) fail(`the second menu's meals: ${JSON.stringify(s.meals.map((m) => m.name))}`);
    const two = cartOf(TWO, "or-7d");
    const read = await em.decodedLink(s.checkout, two.items);
    if (JSON.stringify(read.pressed) !== JSON.stringify(em.pressesOf(two.items))) fail(`the second menu's link decodes to ${JSON.stringify(read.pressed)}, not its cart`);
    if (read.mpid !== em.mpidOf("lean", two.plan)) fail(`the second menu's link: mpid ${read.mpid}, not ${em.mpidOf("lean", two.plan)}`);

    // By the keyboard: the checked radio holds the focus; the arrow keys choose, the list following.
    await page.focus(`#cc-menus input[value="${TWO}"]`);
    await page.keyboard.press("ArrowLeft");
    await settle(page);
    s = await card(page);
    if (s.focused !== CC || !s.radios.find((r) => r.value === CC)?.checked) fail(`ArrowLeft: focus ${s.focused}, Chef's Choice not chosen`);
    if (JSON.stringify(s.meals.map((m) => m.name)) !== JSON.stringify(linesOf(CC, "or-7d"))) fail("ArrowLeft: the list is not Chef's Choice's");
    await page.keyboard.press("ArrowRight");
    await settle(page);
    s = await card(page);
    if (s.focused !== TWO || JSON.stringify(s.meals.map((m) => m.name)) !== JSON.stringify(linesOf(TWO, "or-7d"))) fail(`ArrowRight: focus ${s.focused}, the second menu's list not shown`);

    // An answer the second menu has a cart for keeps it (Q2 the other way: or-5d); a size too (Signature).
    await press(page, '[data-q="weekends"][data-a="no"]');
    s = await card(page);
    if (!s.radios.find((r) => r.value === TWO)?.checked) fail("or-5d: the second menu was not kept");
    if (JSON.stringify(s.meals.map((m) => m.name)) !== JSON.stringify(linesOf(TWO, "or-5d"))) fail(`or-5d: ${JSON.stringify(s.meals.map((m) => m.name))}`);
    await press(page, '[data-goal="signature"]');
    s = await card(page);
    const five = cartOf(TWO, "or-5d");
    const signature = await em.decodedLink(s.checkout, five.items);
    if (JSON.stringify(signature.pressed) !== JSON.stringify(em.pressesOf(five.items)) || signature.mpid !== em.mpidOf("signature", five.plan)) {
      fail(`#signature-or-5d: the link decodes to ${JSON.stringify(signature)}, not the second menu's cart at Signature's mpid ${em.mpidOf("signature", five.plan)}`);
    }

    // Its snacks (Q4 yes, every day): the second menu's own list.
    await press(page, '[data-q="weekends"][data-a="yes"]');
    await press(page, '[data-q="snacks"][data-a="yes"]');
    s = await card(page);
    const snacks = em.MENUS.lists[TWO].snacks["7"].map((m) => em.displayOf(m, WORDS));
    if (JSON.stringify(s.snacks) !== JSON.stringify(snacks)) fail(`#signature-or-7d-s: the snacks ${JSON.stringify(s.snacks)}, not the second menu's`);
    const keys = ms.keysOf(s.checkout);
    const wanted = { ...ms.listKeys(cartOf(TWO, "or-7d").items), ...ms.listKeys(em.MENUS.lists[TWO].snacks["7"], "_") };
    if (JSON.stringify(keys) !== JSON.stringify(wanted)) fail(`#signature-or-7d-s: the link's keys ${JSON.stringify(keys)}, not the second menu's cart and snacks`);

    // An answer it has no cart for (Q3 yes: or-7d-b) returns to Chef's Choice; back again, Chef's Choice stays.
    await press(page, '[data-q="snacks"][data-a="no"]');
    await press(page, '[data-q="breakfast"][data-a="yes"]');
    s = await card(page);
    if (s.group) fail("or-7d-b (Chef's Choice's alone): the chooser is shown");
    if (s.heading !== em.headingOf(CC, WORDS) || JSON.stringify(s.meals.map((m) => m.name)) !== JSON.stringify(linesOf(CC, "or-7d-b"))) fail(`or-7d-b: not Chef's Choice's cart (${s.heading})`);
    await press(page, '[data-q="breakfast"][data-a="no"]');
    s = await card(page);
    if (!s.group || !s.radios.find((r) => r.value === CC)?.checked) fail("back to or-7d: Chef's Choice is not the one selected");
    if (JSON.stringify(s.meals.map((m) => m.name)) !== JSON.stringify(linesOf(CC, "or-7d"))) fail("back to or-7d: not Chef's Choice's meals");
  });
  return problems;
}

test("EM2: the chooser, Chef's Choice first; another menu's meals, snacks and link; answers keep or return the menu (Chrome, 390)", { timeout: TIMEOUT_MS }, async () => {
  assert.deepEqual(await chooserProblems(), []);
});

// A week of one list: the base tree's page (76ee36e, git archive, its own build and content) and this tree's, the v2
// fixture week in both, read in Chrome at three answer sets and both widths.
const ONE_HASHES = ["#lean-or-7d", "#signature-and-7d-b-s", "#performance-or-5d"];
async function baseSite() {
  const top = spawnSync("git", ["-C", SITE, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).stdout.trim();
  const prefix = relative(top, SITE);
  await mkdir(join(scratch, "base"), { recursive: true });
  const tar = spawnSync("git", ["-C", top, "archive", "--format=tar", BASE, prefix], { maxBuffer: 256 * 1024 * 1024 });
  assert.equal(tar.status, 0, `git archive ${BASE}`);
  assert.equal(spawnSync("tar", ["-x", "-C", join(scratch, "base")], { input: tar.stdout }).status, 0, "tar -x");
  const pkg = join(scratch, "base", prefix);
  await symlink(join(SITE, "node_modules"), join(pkg, "node_modules"));
  const built = spawnSync(process.execPath, [join(pkg, "build.mjs"), "--out", baseOut], { cwd: pkg, encoding: "utf8" });
  assert.equal(built.status, 0, `${BASE}'s build: ${built.stderr}`);
  const base = await import(pathToFileURL(join(pkg, "scripts", "week-content.mjs")).href);
  await weekSite(baseOut, { picks: ms.V2_DIR, week: em.MENUS_WEEK, messages: JSON.parse(await readFile(join(pkg, "data", "messages.json"), "utf8")), weekData: base.weekData, pageWithWeek: base.pageWithWeek });
}

/** ⚠ AMENDED by the site's SPEC-ui-and-copy-pass § 1 item 8 (2026-10-23): a meal chosen more than once is drawn anew (its
 *  count a badge on its tile, the rest of its line visually hidden in its name), so EM2 holds those rows' name, badge and
 *  hidden words apart and every other box to the base's; such a row is known by its line matching the words' meal_qty
 *  (read from the site, never written here: SM-4), on either page. */
const COUNTED = (() => {
  const [before, after] = WORDS.chefs_choice.meal_qty.split("{meal}");
  const side = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace("\\{n\\}", "\\d+");
  return `^${side(before)}[\\s\\S]+?${side(after)}$`;
})();

/** Runs in the page: the result card's drawn text, and each drawn box in it (its tag, id or class, and rectangle, from
 *  the card's own top left: since § 11 item 5 the Why Fit AF? button above the tabs moves the whole card down the page,
 *  and the card itself is what EM2 holds to the base's). Since SPEC-ui-and-copy-pass § 1 item 8 the text reads each meal's
 *  line whole (its visually hidden words, on their own line in innerText, joined back), and a counted meal's name, badge
 *  and hidden words are left out of the boxes (`counted`, COUNTED's source). */
function readResult(counted) {
  const result = document.getElementById("result");
  const at = result.getBoundingClientRect();
  const twice = new RegExp(counted);
  const isCounted = (el) => {
    const name = el.closest("li")?.querySelector(".cc-name");
    return Boolean(name) && twice.test(name.textContent.replace(/\s+/g, " ").trim()) && el.matches(".cc-name, .cc-qty, .visually-hidden");
  };
  let text = result.innerText;
  for (const hidden of result.querySelectorAll(".cc-name .visually-hidden")) text = text.replace(`\n${hidden.textContent.trim()}\n`, ` ${hidden.textContent.trim()}\n`);
  const boxes = [...result.querySelectorAll("*")]
    .filter((el) => el.checkVisibility() && !isCounted(el))
    .map((el) => {
      const r = el.getBoundingClientRect();
      return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}.${el.className} ${[r.x - at.x, r.y - at.y, r.width, r.height].map((n) => Math.round(n * 10) / 10).join(",")}`;
    });
  return { text, boxes, group: Boolean(document.getElementById("cc-menus")?.checkVisibility()) };
}

test("EM2: a week of one list shows no chooser, and the card as the base's, its text (the heading by § 11 item 1) and every box (Chrome, 390 and 1280)", { timeout: TIMEOUT_MS }, async () => {
  await siteBuild({ build: "production", out: oneOut });
  await weekSite(oneOut, { picks: ms.V2_DIR, week: em.MENUS_WEEK, messages: JSON.parse(await readFile(siteFile("data", "messages.json"), "utf8")) });
  await baseSite();
  for (const { width } of Object.values(VIEWPORTS)) {
    for (const hash of ONE_HASHES) {
      const after_ = await withPage({ dir: oneOut, hash, width }, (page) => page.evaluate(readResult, COUNTED));
      const before = await withPage({ dir: baseOut, hash, width }, (page) => page.evaluate(readResult, COUNTED));
      const first = ms.V2_CARTS[hash.replace(/^#[a-z]+-/, "").replace(/-s$/, "")].items[0].display;
      assert.ok(before.text.includes(first), `control: ${BASE}'s card at ${width} ${hash} shows the week (${first})`);
      assert.equal(after_.group, false, `${width} ${hash}: no chooser`);
      // § 11 item 1 (2026-10-22): the heading is the menu's name alone, the base's "<name> (<week>)" without its range.
      const name = WORDS.menus[CC];
      const dated = `${name} (${em.weekOf(em.MENUS_WEEK)})`;
      assert.ok(before.text.includes(dated), `control: ${BASE}'s heading names the week`);
      assert.equal(after_.text, before.text.replace(dated, name), `${width} ${hash}: the card's text, the heading the menu's name alone`);
      assert.deepEqual(after_.boxes, before.boxes, `${width} ${hash}: the card's boxes`);
    }
  }
});

/** One line per thing EM3 does not hold on the fixture's page; [] when all do. */
async function nutritionProblems(dir = menusOut) {
  if (dir === menusOut) await menusPage();
  const problems = [];
  const fail = (what) => problems.push(what);
  const meals = em.MENUS.meals;
  /** What each meal of `list`'s cart for `key` must show at `size`: no line (§ 11 item 2), whether it is a control (it
   *  has numbers for that size or ingredients: § 11 item 4.2), its panel's lines (its ingredients and Contains). */
  const expected = (list, key, size) =>
    cartOf(list, key).items.map((m) => {
      const entry = meals[m.name];
      return {
        name: em.displayOf(m, WORDS),
        line: null,
        control: Boolean(entry?.ingredients) || Boolean(entry?.nutrition?.[size]),
        more: entry?.ingredients ? em.moreOf(entry, WORDS) : [],
      };
    });
  const compare = (s, list, key, size) => {
    const want = expected(list, key, size);
    s.meals.forEach((m, i) => {
      const w = want[i];
      if (!w) return fail(`${list} ${key} ${size}: a meal more than the cart's: ${m.name}`);
      if (m.name !== w.name) fail(`${list} ${key} ${size} [${i}]: ${m.name}, not ${w.name}`);
      if (m.line !== w.line) fail(`${list} ${key} ${size} ${w.name}: the line ${JSON.stringify(m.line)}, not ${JSON.stringify(w.line)}`);
      if (m.control !== w.control) fail(`${list} ${key} ${size} ${w.name}: ${w.control ? "not" : "unexpectedly"} a control`);
      if (w.control && JSON.stringify(m.more) !== JSON.stringify(w.more)) fail(`${list} ${key} ${size} ${w.name}: the panel ${JSON.stringify(m.more)}`);
    });
    if (s.meals.length !== want.length) fail(`${list} ${key} ${size}: ${s.meals.length} meals, not ${want.length}`);
  };
  await withPage({ dir, hash: "#lean-or-7d" }, async (page) => {
    for (const size of em.SIZES) {
      if (size !== "lean") await press(page, `[data-goal="${size}"]`);
      compare(await card(page), CC, "or-7d", size);
    }
    await press(page, '[data-goal="lean"]');
    // The control: open, beneath the meal, aria-expanded following; each on its own; a second press closes.
    const at = (s, name) => s.meals.findIndex((m) => m.name === name);
    let s = await card(page);
    const [first, second] = s.meals.filter((m) => m.control).map((m) => m.name);
    if (!first || !second) return fail("fixture control: two meals with an entry");
    const button = (name) => `#cc-meals > li:nth-child(${at(s, name) + 1}) button`;
    if (s.meals.some((m) => m.open)) fail("a panel is open before any press");
    await press(page, button(first));
    s = await card(page);
    if (s.meals[at(s, first)].expanded !== "true" || !s.meals[at(s, first)].open) fail(`${first}: pressed, not open (aria-expanded ${s.meals[at(s, first)].expanded})`);
    if (s.meals[at(s, first)].below !== true) fail(`${first}: the panel is not beneath the meal`);
    if (s.meals[at(s, second)].open) fail(`${second}: opened with ${first}`);
    await page.focus(button(second));
    await page.keyboard.press("Enter");
    await settle(page);
    s = await card(page);
    if (!s.meals[at(s, second)].open || s.meals[at(s, second)].expanded !== "true") fail(`${second}: Enter did not open it`);
    if (!s.meals[at(s, first)].open) fail(`${first}: closed by ${second}'s press`);
    await press(page, button(first));
    s = await card(page);
    if (s.meals[at(s, first)].open || s.meals[at(s, first)].expanded !== "false") fail(`${first}: a second press did not close it`);
    if (!s.meals[at(s, second)].open) fail(`${second}: closed with ${first}`);
    // The second menu: a meal without Contains, and one whose only size is not this one.
    await chooseMenu(page, TWO);
    compare(await card(page), TWO, "or-7d", "lean");
    await press(page, '[data-goal="performance"]');
    compare(await card(page), TWO, "or-7d", "performance");
  });
  return problems;
}

test("EM3: no line under a meal's name at any size; a meal with numbers for the size or ingredients a disclosure of its panel (Chrome, 390)", { timeout: TIMEOUT_MS }, async () => {
  const sizes = em.SIZES.map((size) => Object.values(em.MENUS.meals).filter((e) => e.nutrition?.[size]).length);
  assert.ok(sizes.every((n) => n > 0), `fixture control: every size has numbers (${sizes})`);
  const shown = [...em.cartsOf(CC)["or-7d"].items, ...em.cartsOf(TWO)["or-7d"].items].map((m) => em.MENUS.meals[m.name]).filter(Boolean);
  assert.ok(shown.some((e) => !e.ingredients) && shown.some((e) => !e.nutrition), "fixture control: a meal of numbers alone and one of ingredients alone on the carts EM3 reads");
  assert.deepEqual(await nutritionProblems(), []);
});

// EM9 (§ 11 items 4 and 6): the rings. Expectations from the contract (em-harness RINGS, ringsOf), never the page's.
/** A share read off an arc agrees with the expected one to this much of the circle. */
const SHARE_SLACK = 0.005;
/** "About 56 px": a ring's circle within this of RING_PX; the value centred within CENTRE_SLACK_PX of the circle's centre. */
const RING_SLACK_PX = 6;
const CENTRE_SLACK_PX = 3;
/** rotate(-90) about the circle's centre: the arc starts at 12 o'clock (the snippet's transform). */
const START_MATRIX = (c) => [0, -1, 1, 0, 0, 2 * c];
const rgbOf = (hex) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;

/** Runs in the page: the panel of the `index`th meal (its button pressed open first), as drawn: its children's kinds in
 *  order, each ring's circle, arc, value and label, and the boxes EM9 compares. */
function readPanel(index) {
  const li = document.getElementById("cc-meals").children[index];
  const button = li?.querySelector("button");
  const panel = button && document.getElementById(button.getAttribute("aria-controls"));
  if (!panel) return null;
  const box = (el) => el.getBoundingClientRect().toJSON();
  const body = getComputedStyle(document.body).color;
  const rings = [...panel.querySelectorAll(".cc-ring")].map((ring) => {
    const svg = ring.querySelector("svg");
    const circles = svg ? [...svg.querySelectorAll("circle")] : [];
    const arc = circles.find((c) => c.hasAttribute("stroke-dasharray"));
    const track = circles.find((c) => c !== arc);
    const value = ring.querySelector(".cc-ring-value");
    const label = ring.querySelector(".cc-ring-label");
    const m = arc?.transform.baseVal.consolidate()?.matrix;
    return {
      drawn: ring.checkVisibility(),
      viewBox: svg ? [svg.viewBox.baseVal.width, svg.viewBox.baseVal.height] : null,
      hidden: svg?.getAttribute("aria-hidden"),
      circles: circles.length,
      radius: arc ? [arc.r.baseVal.value, track?.r.baseVal.value] : null,
      dash: arc ? arc.getAttribute("stroke-dasharray").split(/[\s,]+/).map(Number) : null,
      matrix: m ? [m.a, m.b, m.c, m.d, m.e, m.f] : null,
      cap: arc ? getComputedStyle(arc).strokeLinecap : null,
      width: arc ? [getComputedStyle(arc).strokeWidth, track && getComputedStyle(track).strokeWidth] : null,
      arcColour: arc ? getComputedStyle(arc).stroke : null,
      trackColour: track ? getComputedStyle(track).stroke : null,
      value: value?.textContent.replace(/\s+/g, " ").trim() ?? null,
      label: label?.textContent.replace(/\s+/g, " ").trim() ?? null,
      inkValue: value ? getComputedStyle(value).color === body : null,
      inkLabel: label ? getComputedStyle(label).color === body : null,
      svgBox: svg ? box(svg) : null,
      valueBox: value ? box(value) : null,
      labelBox: label ? box(label) : null,
      ringBox: box(ring),
    };
  });
  const kinds = [...panel.children].map((c) => (c.querySelector(".cc-ring") || c.classList.contains("cc-ring") ? "rings" : c.tagName.toLowerCase()));
  return {
    open: panel.checkVisibility(),
    kinds,
    svgs: panel.querySelectorAll("svg").length,
    lines: [...panel.querySelectorAll("p")].map((p) => p.textContent.replace(/\s+/g, " ").trim()),
    panelBox: box(panel),
    rings,
  };
}

/** One line per thing EM9 does not hold on the fixture's page; [] when all do. */
async function ringProblems(dir = menusOut) {
  if (dir === menusOut) await menusPage();
  const problems = [];
  const meals = em.MENUS.meals;
  for (const width of [VIEWPORTS.w390.width, VIEWPORTS.w1280.width]) {
    await withPage({ dir, hash: "#lean-or-7d", width }, async (page) => {
      let sawRings = 0;
      let sawNone = 0;
      for (const size of em.SIZES) {
        if (size !== "lean") await press(page, `[data-goal="${size}"]`);
        for (const list of [CC, TWO]) {
          await chooseMenu(page, list);
          const items = cartOf(list, "or-7d").items;
          for (let i = 0; i < items.length; i++) {
            const entry = meals[items[i].name];
            const want = em.ringsOf(entry, size, WORDS);
            if (!want && !entry?.ingredients) continue; // no control: EM3's
            const where = `${width} ${size} ${list} ${em.displayOf(items[i], WORDS)}`;
            const fail = (what) => problems.push(`${where}: ${what}`);
            const button = `#cc-meals > li:nth-child(${i + 1}) > button`;
            if (!(await page.$(button))) {
              fail("not a control");
              continue;
            }
            await press(page, button);
            const panel = await page.evaluate(readPanel, i);
            if (!panel?.open) {
              fail("pressed, its panel is not shown");
              continue;
            }
            const lines = entry?.ingredients ? em.moreOf(entry, WORDS) : [];
            if (JSON.stringify(panel.lines) !== JSON.stringify(lines)) fail(`the panel's lines ${JSON.stringify(panel.lines)}, not ${JSON.stringify(lines)}`);
            const kinds = [...(want ? ["rings"] : []), ...lines.map(() => "p")];
            if (JSON.stringify(panel.kinds) !== JSON.stringify(kinds)) fail(`the panel holds ${JSON.stringify(panel.kinds)}, not ${JSON.stringify(kinds)} (the rings first, then the ingredients and Contains)`);
            if (!want) {
              sawNone += 1;
              if (panel.rings.length || panel.svgs) fail(`no numbers for ${size}, yet ${panel.rings.length} rings (${panel.svgs} svg)`);
            } else {
              sawRings += 1;
              if (panel.rings.length !== want.length) fail(`${panel.rings.length} rings, not ${want.length}`);
              const tops = new Set();
              panel.rings.forEach((r, k) => {
                const w = want[k];
                if (!w) return;
                const at = `ring ${k + 1} (${w.label})`;
                if (!r.drawn) fail(`${at}: not drawn`);
                if (r.label !== w.label) fail(`${at}: the label ${JSON.stringify(r.label)}`);
                if (r.value !== w.value) fail(`${at}: the value ${JSON.stringify(r.value)}, not ${JSON.stringify(w.value)}`);
                if (r.hidden !== "true") fail(`${at}: its circle is not hidden from assistive technology (the value and label are its words)`);
                if (JSON.stringify(r.viewBox) !== JSON.stringify([em.RING_GEOMETRY.viewBox, em.RING_GEOMETRY.viewBox])) fail(`${at}: viewBox ${JSON.stringify(r.viewBox)}`);
                if (r.circles !== 2 || JSON.stringify(r.radius) !== JSON.stringify([em.RING_GEOMETRY.radius, em.RING_GEOMETRY.radius])) fail(`${at}: ${r.circles} circles, radii ${JSON.stringify(r.radius)}`);
                if (JSON.stringify(r.width) !== JSON.stringify([`${em.RING_GEOMETRY.stroke}px`, `${em.RING_GEOMETRY.stroke}px`])) fail(`${at}: stroke ${JSON.stringify(r.width)}`);
                if (r.cap !== "round") fail(`${at}: the arc's caps ${r.cap}`);
                const start = START_MATRIX(em.RING_GEOMETRY.viewBox / 2);
                if (!r.matrix || r.matrix.some((n, j) => Math.abs(n - start[j]) > 1e-6)) fail(`${at}: the arc does not start at 12 o'clock (${JSON.stringify(r.matrix)})`);
                const share = r.dash ? r.dash[0] / (2 * Math.PI * em.RING_GEOMETRY.radius) : NaN;
                if (!(Math.abs(share - w.share) <= SHARE_SLACK)) fail(`${at}: its arc is ${share.toFixed(4)} of the circle, not ${w.share.toFixed(4)}`);
                if (r.dash && !(r.dash[1] >= 2 * Math.PI * em.RING_GEOMETRY.radius - 0.1)) fail(`${at}: the arc's gap ${r.dash[1]} is shorter than the circle`);
                if (r.arcColour !== rgbOf(w.colour)) fail(`${at}: the arc ${r.arcColour}, not the store's ${rgbOf(w.colour)}`);
                if (r.trackColour !== rgbOf(em.RING_TRACK)) fail(`${at}: the track ${r.trackColour}, not the store's ${rgbOf(em.RING_TRACK)}`);
                if (!r.inkValue || !r.inkLabel) fail(`${at}: the value or the label is not in the page's text colour`);
                if (!r.svgBox || Math.abs(r.svgBox.width - em.RING_PX) > RING_SLACK_PX) fail(`${at}: the circle is ${r.svgBox?.width} px, not about ${em.RING_PX}`);
                const centre = (b) => [b.x + b.width / 2, b.y + b.height / 2];
                if (r.svgBox && r.valueBox) {
                  const [a, b] = [centre(r.svgBox), centre(r.valueBox)];
                  if (Math.abs(a[0] - b[0]) > CENTRE_SLACK_PX || Math.abs(a[1] - b[1]) > CENTRE_SLACK_PX) fail(`${at}: the value is not in the middle of its circle`);
                }
                if (r.svgBox && r.labelBox && (r.labelBox.top < r.svgBox.bottom - 1 || Math.abs(centre(r.labelBox)[0] - centre(r.svgBox)[0]) > CENTRE_SLACK_PX)) fail(`${at}: the label is not beneath its circle`);
                if (r.ringBox.left < panel.panelBox.left - 1 || r.ringBox.right > panel.panelBox.right + 1) fail(`${at}: outside the panel (${r.ringBox.left}–${r.ringBox.right} in ${panel.panelBox.left}–${panel.panelBox.right})`);
                tops.add(Math.round(r.ringBox.top));
              });
              if (width === VIEWPORTS.w1280.width && tops.size !== 1) fail(`at 1280 the rings are not one row (${[...tops]})`);
            }
            await press(page, button);
          }
        }
        await chooseMenu(page, CC);
      }
      if (!sawRings || !sawNone) problems.push(`${width}: fixture control: meals opened with rings ${sawRings}, without ${sawNone}`);
    });
  }
  return problems;
}

test("EM9: opening a meal shows its five rings for the chosen size in order, each its number and its arc value over the daily amount, then the ingredients; no numbers for the size, no rings (Chrome, 390 and 1280)", { timeout: TIMEOUT_MS * 2 }, async () => {
  assert.deepEqual(await ringProblems(), []);
});

// The mutants: a copy of the built page with one line of its script changed, each anchor read from the page.
async function copyWith(t, change) {
  const dir = await mkdtemp(join(tmpdir(), "fitaf-storybook-em-mutant-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await siteBuild({ build: "production", out: dir });
  await weekSite(dir);
  const path = join(dir, "index.html");
  await writeFile(path, change(await readFile(path, "utf8")));
  return dir;
}
/** The chosen cart's link: the script's one line taking it from the cart. */
const LINK_LINE = /^(\s*)var links = cart && (.*)$/m;
/** § 11 item 4.2: the size's numbers, the script's one line reading them for the chosen size. */
const SIZE_LINE = /^(\s*)return isMap\(all\) && has\(all, size\).*$/m;
/** § 11 item 4.1: a ring's share of its circle, the script's one line taking the value over the number's daily amount. */
const SHARE_LINE = /^(\s*)var share = (.*)\bspec\.daily\b(.*)$/m;
const once = (html, re) => {
  assert.equal(html.match(new RegExp(re.source, "gm"))?.length, 1, `fixture control: one line ${re}`);
  return html;
};

test("EM2 (mutant): the checkout link taken from Chef's Choice's cart whatever is chosen fails EM2; the copy as built passes", { timeout: TIMEOUT_MS }, async (t) => {
  const control = await copyWith(t, (html) => once(html, LINK_LINE));
  assert.deepEqual(await chooserProblems(control), [], "control: the copy as built");
  const mutant = await copyWith(t, (html) =>
    once(html, LINK_LINE).replace(LINK_LINE, (whole, indent, rest) => `${indent}var cc = has(week.carts, sel.replace(/-s$/, "")) ? week.carts[sel.replace(/-s$/, "")] : null;\n${indent}var links = cc && ${rest.replace(/\bcart\./g, "cc.")}`),
  );
  const problems = await chooserProblems(mutant);
  t.diagnostic(problems.join("\n"));
  assert.ok(problems.some((p) => p.startsWith("the second menu's link decodes to")), `EM2 fails it:\n${problems.join("\n")}`);
});


// EM6 (§ 10, the Advisor's word of 2026-10-21): every target the card adds is at least the standard target of OurFans'
// design philosophy (10 mm, at the densest logical density it uses, 163 CSS px per inch: 64 CSS px) in its smaller
// dimension, the menu chips and every meal control; the meal's WHOLE ROW is the control, so a press on its tile or its
// name (since § 11 item 2 the row is those two) opens it; and its mark says "more", not "add": no "+" (or "−") as text or
// as CSS content, a mark hidden from assistive technology. Since § 11 item 3 (2026-10-22) the mark is a circled "i",
// about 24 px, the SAME whether open or closed (it no longer turns; EM8 reads its shape). At 390 and 1280, each menu in
// turn.
/** § 10 item 1: the contract's number (10 mm × 163 / 25.4 = 64.2, so at least 64 CSS px). */
const TARGET_PX = 64;
const ADD_MARKS = /[+−]/;
/** § 11 item 3: the mark "about 24 px". */
const MARK_PX = 24;
const MARK_SLACK_PX = 4;

/** Runs in the page: the chips' and the meal controls' boxes, and each control's marks. */
function readTargets() {
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 };
  };
  const pseudo = (el) => ["::before", "::after"].map((p) => getComputedStyle(el, p).content).filter((c) => c && c !== "none" && c !== "normal");
  return {
    chips: [...document.querySelectorAll("#cc-menus label")].map((l) => ({ text: l.textContent.trim(), ...box(l) })),
    controls: [...document.querySelectorAll("#cc-meals button")].map((b) => ({
      text: b.textContent,
      ...box(b),
      contents: [b, ...b.querySelectorAll("*")].flatMap(pseudo),
      hiddenMarks: b.querySelectorAll('[aria-hidden="true"]').length,
    })),
  };
}

/** Runs in the page: the first meal control's state and its hidden mark: its drawn transform, markup and box. */
function readFirstControl() {
  const b = document.querySelector("#cc-meals button");
  const mark = b?.querySelector('[aria-hidden="true"]');
  const r = mark?.getBoundingClientRect();
  return {
    expanded: b?.getAttribute("aria-expanded") ?? null,
    turn: mark ? getComputedStyle(mark).transform : null,
    markup: mark?.outerHTML ?? null,
    size: r ? [Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10] : null,
  };
}

/** One line per thing EM6 does not hold on the fixture's page; [] when all do. */
async function targetProblems(dir = menusOut) {
  if (dir === menusOut) await menusPage();
  const problems = [];
  for (const width of [VIEWPORTS.w390.width, VIEWPORTS.w1280.width]) {
    const fail = (what) => problems.push(`${width}: ${what}`);
    await withPage({ dir, hash: "#lean-or-7d", width }, async (page) => {
      for (const menu of [CC, TWO]) {
        if (menu === TWO) await chooseMenu(page, TWO);
        const t = await page.evaluate(readTargets);
        if (t.chips.length !== 2 || !t.controls.length) fail(`${menu}: fixture control: ${t.chips.length} chips, ${t.controls.length} meal controls`);
        for (const c of t.chips) if (Math.min(c.w, c.h) < TARGET_PX) fail(`${menu}: the chip "${c.text}" is ${c.w} × ${c.h}`);
        for (const c of t.controls) {
          const what = `${menu}: the control "${c.text.replace(/\s+/g, " ").trim().slice(0, 40)}"`;
          if (Math.min(c.w, c.h) < TARGET_PX) fail(`${what} is ${c.w} × ${c.h}`);
          if (ADD_MARKS.test(c.text) || c.contents.some((s) => ADD_MARKS.test(s))) fail(`${what}: its mark is "+" or "−" (${JSON.stringify(c.contents)})`);
          if (!c.hiddenMarks) fail(`${what}: no mark hidden from assistive technology`);
        }
      }
      // The whole row: a press on Chef's Choice's first meal control's tile or name opens it; the mark stays as it was.
      await chooseMenu(page, CC);
      for (const part of [".cc-thumb", ".cc-name"]) {
        const closed = await page.evaluate(readFirstControl);
        if (closed.expanded !== "false") fail(`before the press on its ${part}: the meal is ${closed.expanded === "true" ? "open" : "not a control"}`);
        const handle = await page.$(`#cc-meals > li:has(button) ${part}`);
        const r = handle && (await handle.boundingBox());
        if (!r) {
          fail(`the first meal control has no ${part}`);
          continue;
        }
        await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
        await settle(page);
        // The mark's turn may be animated: its end state is read once every running animation has finished.
        await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
        const open = await page.evaluate(readFirstControl);
        if (!closed.size || closed.size.some((n) => Math.abs(n - MARK_PX) > MARK_SLACK_PX)) fail(`the mark is ${JSON.stringify(closed.size)} px, not about ${MARK_PX}`);
        if (open.expanded !== "true") fail(`a press on its ${part} did not open the meal`);
        else if (open.turn !== closed.turn || open.markup !== closed.markup) fail(`the mark changed when the meal opened (${closed.turn} -> ${open.turn})`);
        if (open.expanded === "true") await press(page, "#cc-meals button");
        await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
      }
    });
  }
  return problems;
}

test("EM6: every chip and meal control at least 64 CSS px; the whole row opens the meal; the mark is not \"+\", about 24 px, the same open or closed (Chrome, 390 and 1280)", { timeout: TIMEOUT_MS }, async () => {
  assert.deepEqual(await targetProblems(), []);
});

/** The meal control's parts: the script's one line putting the tile, the name and the mark in the button (§ 11 item 2:
 *  the row is the tile and the name). */
const ROW_LINE = /^(\s*)appendAll\(meal, \[tile, name, mark\]\);$/m;

test("EM6 (mutant): the row's control shrunk to the name alone fails EM6; the copy as built passes", { timeout: TIMEOUT_MS }, async (t) => {
  const control = await copyWith(t, (html) => once(html, ROW_LINE));
  assert.deepEqual(await targetProblems(control), [], "control: the copy as built");
  const mutant = await copyWith(t, (html) =>
    // The tile beside the button, the row laid out as before § 10 (a flex row), so the tile is drawn where a press finds it.
    once(html, ROW_LINE).replace(ROW_LINE, (whole, indent) => `${indent}li.appendChild(tile); li.style.display = "flex"; appendAll(meal, [name, mark]);`),
  );
  const problems = await targetProblems(mutant);
  t.diagnostic(problems.join("\n"));
  // The shrunk button keeps its style's 64 px (min-height), so EM6 fails it where the row is no longer the control: a
  // press on the tile opens nothing.
  assert.ok(problems.some((p) => /a press on its \.cc-thumb did not open the meal/.test(p)), `EM6 fails it on a press beside the name:\n${problems.join("\n")}`);
});

test("EM9 (mutant): a ring's arc taken over another number's daily amount fails EM9; the copy as built passes", { timeout: TIMEOUT_MS * 2 }, async (t) => {
  const control = await copyWith(t, (html) => once(html, SHARE_LINE));
  assert.deepEqual(await ringProblems(control), [], "control: the copy as built");
  const mutant = await copyWith(t, (html) =>
    once(html, SHARE_LINE).replace(SHARE_LINE, (whole, indent, head, tail) => `${indent}var share = ${head}RINGS[(RINGS.indexOf(spec) + 1) % RINGS.length].daily${tail}`),
  );
  const problems = await ringProblems(mutant);
  t.diagnostic(problems.join("\n"));
  assert.ok(problems.some((p) => /: its arc is [\d.]+ of the circle, not /.test(p)), `EM9 fails it:\n${problems.join("\n")}`);
});

test("EM9 (mutant): the rings read from the first size present, not the chosen one, fail EM9; the copy as built passes", { timeout: TIMEOUT_MS * 2 }, async (t) => {
  const control = await copyWith(t, (html) => once(html, SIZE_LINE));
  assert.deepEqual(await ringProblems(control), [], "control: the copy as built");
  const mutant = await copyWith(t, (html) => once(html, SIZE_LINE).replace(SIZE_LINE, (whole, indent) => `${indent}for (var first in all) return all[first]; return null;`));
  const problems = await ringProblems(mutant);
  t.diagnostic(problems.join("\n"));
  assert.ok(problems.some((p) => / signature .*: the value /.test(p)), `EM9 fails it:\n${problems.join("\n")}`);
});
