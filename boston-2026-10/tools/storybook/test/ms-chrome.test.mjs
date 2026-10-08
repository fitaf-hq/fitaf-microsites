// MS-15 (SPEC-meal-selection.md § 9 item 1), measured in Chrome, here because this package drives Chrome and the site
// never installs a driver (SM-5's Chrome; the site's half, the markup and the stylesheet, is test/ms-15-one-unit.test.mjs):
// at 390 and 1280, each goal button has ONE facts block holding both lines, the block's background the `--ice` token and
// no line with a background of its own; "25–35 g protein" (every protein line) is ONE line box, not overflowing its block;
// and the three blocks are the same height. The page is the site's own production build (`node build.mjs --on --out`),
// served on 127.0.0.1; nothing else is requested.
// ⭐ Mutant: the same page served from a copy whose lines may break (`white-space: normal`) and set larger (14 px) wraps
// "25–35 g protein" at 390, and the check fails it.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { siteBuild } from "../microsite/pages.mjs";
import { VIEWPORTS } from "../microsite/layout.js";
import { freshChrome } from "./chrome.mjs";
import { serveStatic } from "./serve-static.mjs";
import { isLocal } from "./walk.mjs";

const ON = "2026-09-30";
const TIMEOUT_MS = 120_000;
const out = await mkdtemp(join(tmpdir(), "fitaf-storybook-ms-15-"));
after(() => rm(out, { recursive: true, force: true }));
await siteBuild({ build: "production", on: ON, out });

/** Runs in the page: each goal button's facts, as the browser lays them out. */
function readFacts() {
  const ice = getComputedStyle(document.documentElement).getPropertyValue("--ice").trim();
  const rgb = (hex) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;
  return {
    ice: rgb(ice),
    buttons: [...document.querySelectorAll(".goals [data-goal]")].map((b) => {
      const blocks = [...b.querySelectorAll(".facts")];
      const block = blocks[0];
      const lines = block ? [...block.children] : [];
      const boxes = (el) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        return r.getClientRects().length;
      };
      return {
        goal: b.getAttribute("data-goal"),
        blocks: blocks.length,
        lines: lines.map((l) => l.textContent),
        background: block ? getComputedStyle(block).backgroundColor : null,
        lineBackgrounds: lines.map((l) => getComputedStyle(l).backgroundColor),
        lineBoxes: lines.map(boxes),
        overflow: block ? block.scrollWidth > block.clientWidth : null,
        height: block ? block.getBoundingClientRect().height : null,
        fontSize: block ? getComputedStyle(block).fontSize : null,
      };
    }),
  };
}

/** The facts at `width`, from `dir` (the build, or a copy of it). */
async function factsAt(dir, width) {
  const server = await serveStatic(dir);
  const chrome = await freshChrome();
  try {
    const page = await chrome.browser.newPage();
    await page.setViewport({ width, height: VIEWPORTS.w390.height });
    await page.setRequestInterception(true);
    page.on("request", (r) => (isLocal(r.url()) ? r.continue() : r.abort()));
    await page.goto(`${server.base}/index.html#lean`, { waitUntil: "load" });
    await page.waitForSelector(".goals .facts");
    return await page.evaluate(readFacts);
  } finally {
    await chrome.close();
    await server.close();
  }
}

/** One line per thing MS-15 does not hold at this width; [] when it all does. */
function problemsOf(read, width) {
  const problems = [];
  const fail = (what) => problems.push(`${width}: ${what}`);
  if (read.buttons.length !== 3) fail(`${read.buttons.length} goal buttons`);
  for (const b of read.buttons) {
    if (b.blocks !== 1) fail(`${b.goal}: ${b.blocks} facts blocks`);
    if (b.lines.length !== 2 || !/cal$/.test(b.lines[0]) || !/g protein$/.test(b.lines[1])) fail(`${b.goal}: lines ${JSON.stringify(b.lines)}`);
    if (b.background !== read.ice) fail(`${b.goal}: the block's background ${b.background}, not --ice ${read.ice}`);
    for (const bg of b.lineBackgrounds) if (bg !== "rgba(0, 0, 0, 0)") fail(`${b.goal}: a line with a background of its own (${bg})`);
    b.lineBoxes.forEach((n, i) => n !== 1 && fail(`${b.goal}: "${b.lines[i]}" is ${n} line boxes`));
    if (b.overflow) fail(`${b.goal}: a line overflows its block (${b.fontSize})`);
  }
  const heights = new Set(read.buttons.map((b) => b.height));
  if (heights.size !== 1) fail(`the blocks' heights differ: ${[...heights].join(", ")}`);
  return problems;
}

test("MS-15: one facts block per goal, one background, each line one line box, the three the same height (Chrome, 390 and 1280)", { timeout: TIMEOUT_MS }, async () => {
  for (const { width } of Object.values(VIEWPORTS)) {
    const read = await factsAt(out, width);
    assert.ok(read.buttons.some((b) => b.lines[1] === "25–35 g protein"), `fixture control: Lean's protein line (${width})`);
    assert.deepEqual(problemsOf(read, width), []);
  }
});

// The mutant's anchors are read from the page, never written here (SM-4: no rule of the page under tools/storybook): the
// line's rule, and the goal blocks' font size.
const LINE_RULE = /\.fact-line\s*\{[^}]*\}/g;
const GOAL_SIZE = /(\.goals \.facts\s*\{[^}]*?)font-size:[^;}]+/g;

test("MS-15 (mutant): a copy whose lines may break and set larger fails at 390", { timeout: TIMEOUT_MS }, async (t) => {
  const copy = await mkdtemp(join(tmpdir(), "fitaf-storybook-ms-15-mutant-"));
  t.after(() => rm(copy, { recursive: true, force: true }));
  await siteBuild({ build: "production", on: ON, out: copy });
  const page = join(copy, "index.html");
  const html = await readFile(page, "utf8");
  assert.equal(html.match(LINE_RULE)?.length, 1, "fixture control: one rule for a facts line");
  assert.equal(html.match(GOAL_SIZE)?.length, 1, "fixture control: one font size for the goals' facts");
  await writeFile(page, html.replace(LINE_RULE, ".fact-line { display: block; white-space: normal; }").replace(GOAL_SIZE, "$1font-size: 14px"));
  const problems = problemsOf(await factsAt(copy, VIEWPORTS.w390.width), VIEWPORTS.w390.width);
  assert.ok(problems.some((p) => /"25–35 g protein" is [2-9] line boxes/.test(p)), problems.join("\n"));
});
