// EM8 (SPEC-every-menu-and-nutrition.md § 11 items 2, 3 and 6, the Advisor's review of 2026-10-22: *"Rather than a
// caret, let's please try a "circled i" info icon"*): a meal's row is its tile and its name, no nutrition line under the
// name (`nutrition.line` leaves the required words); and its mark is a circled "i", an inline SVG (a circle and a
// lowercase i: its dot and its stem), in `currentColor`, hidden from assistive technology, the same whether the meal is
// open or closed, not a chevron. Over the fixture week of two menus (its words), each menu and each size, as a visitor
// reads it (cc-harness openPlanPage, linkedom). Its size (about 24 px) and that it does not turn are measured in Chrome
// (EM6, tools/storybook/test/em-chrome.test.mjs). Every expectation is the contract's, worked out here.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "../build.mjs";
import { MESSAGES } from "./cc-harness.mjs";
import { cartsOf, chooseMenu, displayOf, FIXTURE_LIST, fixtureWords, MENUS, menusPage, messagesFile, openMenus, SHOWN_LIST, SIZES } from "./em-harness.mjs";

const SVG_NS = "http://www.w3.org/2000/svg";
const KEY = "or-7d";
const text = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const num = (el, name) => Number(el.getAttribute(name));

/** The mark's shape, from its markup: one line per thing that is not a circled lowercase i; [] when it is one. */
function markProblems(svg, what) {
  const problems = [];
  const fail = (p) => problems.push(`${what}: ${p}`);
  if (svg.namespaceURI !== SVG_NS || svg.localName !== "svg") return [`${what}: the mark is <${svg.localName}>, not an inline SVG`];
  if (svg.getAttribute("aria-hidden") !== "true") fail("not hidden from assistive technology");
  const box = (svg.getAttribute("viewBox") ?? "").trim().split(/[\s,]+/).map(Number);
  if (box.length !== 4 || box.some((n) => !Number.isFinite(n))) return [...problems, `${what}: no viewBox`];
  const [x0, y0, w, h] = box;
  const [cx, cy] = [x0 + w / 2, y0 + h / 2];
  const near = (a, b) => Math.abs(a - b) <= w * 0.02;
  const colour = (el) => [el.getAttribute("fill"), el.getAttribute("stroke")].filter((c) => c && c !== "none");
  const circles = [...svg.children].filter((c) => c.localName === "circle");
  const ring = circles.find((c) => c.getAttribute("fill") === "none" && near(num(c, "cx"), cx) && near(num(c, "cy"), cy) && num(c, "r") >= 0.35 * w);
  const dot = circles.find((c) => c !== ring && c.getAttribute("fill") !== "none" && near(num(c, "cx"), cx) && num(c, "cy") < cy);
  const stems = [...svg.children].filter((c) => c.localName === "line" && near(num(c, "x1"), cx) && near(num(c, "x2"), cx));
  const stem = dot && stems.find((l) => Math.min(num(l, "y1"), num(l, "y2")) > num(dot, "cy") && Math.max(num(l, "y1"), num(l, "y2")) > cy);
  if (!ring) fail("no circle round the mark's centre (fill none)");
  if (!dot) fail("no dot of the i above the centre");
  if (!stem) fail("no stem of the i, upright, beneath the dot");
  if (svg.children.length !== 3) fail(`${svg.children.length} shapes, not the circle, the dot and the stem`);
  for (const el of [ring, dot, stem].filter(Boolean)) {
    if (!colour(el).length || colour(el).some((c) => c !== "currentColor")) fail(`a shape drawn in ${JSON.stringify(colour(el))}, not currentColor`);
  }
  if (text(svg)) fail(`the mark carries text ${JSON.stringify(text(svg))}`);
  return problems;
}

/** One line per thing EM8 does not hold on the fixture's page; [] when all do. */
function rowProblems(html) {
  const problems = [];
  const words = fixtureWords();
  for (const size of SIZES) {
    const page = openMenus(html, `#${size}-${KEY}`);
    for (const list of [SHOWN_LIST, FIXTURE_LIST]) {
      chooseMenu(page, list);
      const where = `${size} ${list}`;
      const lis = [...page.document.getElementById("cc-meals").children];
      const names = cartsOf(list)[KEY].items.map((m) => displayOf(m, words));
      if (lis.length !== names.length) problems.push(`${where}: ${lis.length} rows, not ${names.length}`);
      if (page.document.querySelector("#cc-meals .cc-line")) problems.push(`${where}: a nutrition line (.cc-line) in a row`);
      lis.forEach((li, i) => {
        const button = li.querySelector("button");
        const row = button ?? li;
        if (text(row) !== names[i]) problems.push(`${where} [${i}]: the row reads ${JSON.stringify(text(row))}, not its name ${JSON.stringify(names[i])}`);
        if (!row.querySelector(".cc-thumb")) problems.push(`${where} [${i}]: no tile in the row`);
        if (!button) return;
        // SPEC-ui-and-copy-pass § 1 item 8 (2026-10-23): a meal chosen more than once also carries its count's badge on its
        // tile (.cc-qty), hidden from assistive technology as the mark is; it is not the mark.
        const markOf = (b) => [...b.querySelectorAll('[aria-hidden="true"]')].filter((n) => !n.classList.contains("cc-qty"));
        const marks = markOf(button);
        if (marks.length !== 1) return problems.push(`${where} ${names[i]}: ${marks.length} marks hidden from assistive technology, not 1`);
        problems.push(...markProblems(marks[0], `${where} ${names[i]}`));
        const closed = marks[0].outerHTML;
        button.dispatchEvent(new page.document.defaultView.Event("click", { bubbles: true }));
        const [after] = markOf(button);
        if (button.getAttribute("aria-expanded") !== "true") problems.push(`${where} ${names[i]}: a press did not open it`);
        else if (after?.outerHTML !== closed) problems.push(`${where} ${names[i]}: the mark changed when the meal opened`);
        button.dispatchEvent(new page.document.defaultView.Event("click", { bubbles: true }));
      });
    }
  }
  return problems;
}

test("EM8 (fixture control): the fixture week's carts at or-7d hold meals that are controls at every size", () => {
  const entries = [SHOWN_LIST, FIXTURE_LIST].flatMap((list) => cartsOf(list)[KEY].items.map((m) => MENUS.meals[m.name]).filter(Boolean));
  assert.ok(entries.filter((e) => e.ingredients).length >= 2, "two meals or more with ingredients");
});

test("EM8: no nutrition line in a row, the row its tile and its name; the mark a circled i, the same open or closed", async () => {
  assert.deepEqual(rowProblems(await menusPage()), []);
});

test("EM8: nutrition.line has left the required words: the build takes data/messages.json without it", async () => {
  const words = structuredClone(MESSAGES);
  delete words.nutrition.line;
  const file = await messagesFile(words);
  const outDir = await mkdtemp(join(tmpdir(), "boston-em-08-"));
  try {
    await assert.doesNotReject(build({ target: "prod", outDir, messagesPath: file.path }));
  } finally {
    await file.done();
    await rm(outDir, { recursive: true, force: true });
  }
});
