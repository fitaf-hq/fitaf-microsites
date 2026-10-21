// EM2 and EM3 of the site's SPEC-every-menu-and-nutrition.md (§ 2, § 3, § 6), in Chrome, here because this package
// drives Chrome and the site never installs a driver (W2, in w-why-chrome.test.mjs, is the model):
//   EM2, the chooser: with two lists holding a cart for the answers, the group of the menus' names is shown (a native
//   radio group: each a radio, keyboard reachable, its state the browser's own), Chef's Choice selected; choosing the
//   second (pressed, and by the arrow keys) shows its meals, its snacks and its heading, and its checkout link decodes
//   (the SHIPPED reader of #fitaf=, the site's cc-harness readWithFillB) to THAT list's cart and the size's mpid; an
//   answer change the chosen menu has a cart for keeps it, one it has none for returns to Chef's Choice. A week of one
//   list: no group, and the card as the base's (76ee36e, this contract's commit) shows it, text and boxes.
//   EM3, nutrition: each meal's line for the chosen size, changing with the size; the meal a button whose aria-expanded
//   follows the panel it opens beneath it (the ingredients, and Contains when there is one) and a second press closes;
//   each meal on its own; a meal with no entry has no line and no control, one without the chosen size no line.
// ⭐ Mutants, each on a copy of the built page with ONE line of its script changed (read from the page, never written
// here: SM-4), its control the copy as built: the checkout link taken from Chef's Choice's cart whatever is chosen
// fails EM2; the line read from the first size present rather than the chosen one fails EM3.
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
        more: panel ? [...panel.children].map(text) : null,
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
    const ax = await page.accessibility.snapshot({ root: await page.$("#cc-menus") });
    const axRadios = [];
    const walk = (n) => n && (n.role === "radio" && axRadios.push({ name: n.name, checked: Boolean(n.checked) }), (n.children ?? []).forEach(walk));
    walk(ax);
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

/** Runs in the page: the result card's drawn text, and each drawn box in it (its tag, id or class, and rectangle). */
function readResult() {
  const result = document.getElementById("result");
  const boxes = [...result.querySelectorAll("*")]
    .filter((el) => el.checkVisibility())
    .map((el) => {
      const r = el.getBoundingClientRect();
      return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}.${el.className} ${[r.x, r.y, r.width, r.height].map((n) => Math.round(n * 10) / 10).join(",")}`;
    });
  return { text: result.innerText, boxes, group: Boolean(document.getElementById("cc-menus")?.checkVisibility()) };
}

test("EM2: a week of one list shows no chooser, and the card as the base's, its text and every box (Chrome, 390 and 1280)", { timeout: TIMEOUT_MS }, async () => {
  await siteBuild({ build: "production", out: oneOut });
  await weekSite(oneOut, { picks: ms.V2_DIR, week: em.MENUS_WEEK, messages: JSON.parse(await readFile(siteFile("data", "messages.json"), "utf8")) });
  await baseSite();
  for (const { width } of Object.values(VIEWPORTS)) {
    for (const hash of ONE_HASHES) {
      const after_ = await withPage({ dir: oneOut, hash, width }, (page) => page.evaluate(readResult));
      const before = await withPage({ dir: baseOut, hash, width }, (page) => page.evaluate(readResult));
      const first = ms.V2_CARTS[hash.replace(/^#[a-z]+-/, "").replace(/-s$/, "")].items[0].display;
      assert.ok(before.text.includes(first), `control: ${BASE}'s card at ${width} ${hash} shows the week (${first})`);
      assert.equal(after_.group, false, `${width} ${hash}: no chooser`);
      assert.equal(after_.text, before.text, `${width} ${hash}: the card's text`);
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
  /** What each meal of `list`'s cart for `key` must show at `size`: its line, whether it is a control, its panel's lines. */
  const expected = (list, key, size) =>
    cartOf(list, key).items.map((m) => {
      const entry = meals[m.name];
      return {
        name: em.displayOf(m, WORDS),
        line: entry?.nutrition[size] ? em.lineOf(entry.nutrition[size], WORDS) : null,
        control: Boolean(entry),
        more: entry ? em.moreOf(entry, WORDS) : null,
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

test("EM3: each meal's line for the chosen size, changing with it; the meal a disclosure of its ingredients and Contains (Chrome, 390)", { timeout: TIMEOUT_MS }, async () => {
  const sizes = em.SIZES.map((size) => Object.values(em.MENUS.meals).filter((e) => e.nutrition[size]).length);
  assert.ok(sizes.every((n) => n > 0), `fixture control: every size has numbers (${sizes})`);
  assert.deepEqual(await nutritionProblems(), []);
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
/** The size's line: the script's one line reading it for the size. */
const SIZE_LINE = /^(\s*)return lines && has\(lines, size\).*$/m;
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

test("EM3 (mutant): the line read from the first size present, not the chosen one, fails EM3; the copy as built passes", { timeout: TIMEOUT_MS }, async (t) => {
  const control = await copyWith(t, (html) => once(html, SIZE_LINE));
  assert.deepEqual(await nutritionProblems(control), [], "control: the copy as built");
  const mutant = await copyWith(t, (html) => once(html, SIZE_LINE).replace(SIZE_LINE, (whole, indent) => `${indent}for (var first in lines) return lines[first]; return null;`));
  const problems = await nutritionProblems(mutant);
  t.diagnostic(problems.join("\n"));
  assert.ok(problems.some((p) => / signature .*: the line /.test(p)), `EM3 fails it:\n${problems.join("\n")}`);
});
