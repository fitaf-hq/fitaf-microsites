// W2 and W3 of the site's SPEC-why-fit-af.md (§ 2 items 3-4, § 3), in Chrome, here because this package drives Chrome
// and the site never installs a driver (the plans dialog's own case, PR-8 in pr-chrome.test.mjs, is the model):
//   W2: the footer's button opens its dialog modally, focus moving in, with the frame loaded at /why/ (its document the
//   site's src/why/index.html, known by its title) and as tall as the viewport allows, the /why/ page scrolling inside
//   it; Escape, the close button and a press on the backdrop each close it, and focus returns to the button. On the
//   production page at 390 (#lean-7) and at 1280 (#family, the other tab), and on a development page one directory down
//   (/<event-id>/, whose assets are addressed from the root) at 390.
//   W3: the same pages with JavaScript off: neither the button nor the dialog shown; the footer's one link shown, reading
//   the button's label and going to /why/; the plans dialog still shown, as the page's no-script rule always showed it
//   (a control).
// ⭐ Mutant: a copy of the production build without the one line of its script that wires the button (the button wired
// to nothing) fails W2; the copy left as built (its control) passes.
// The pages are the site's own builds (`node build.mjs [--env dev] --out`, as the stories' pages are built), served on
// 127.0.0.1; nothing else is requested. The page's words and its script's line are read from the site or the page,
// never written here (SM-4).
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { siteBuild } from "../microsite/pages.mjs";
import { VIEWPORTS } from "../microsite/layout.js";
import { siteFile } from "../microsite/paths.mjs";
import { freshChrome } from "./chrome.mjs";
import { serveStatic } from "./serve-static.mjs";
import { isLocal } from "./walk.mjs";

const TIMEOUT_MS = 120_000;
const FRAME_LOAD_MS = 15_000;
const WHY_PATH = "/why/";
/** A press outside the dialog's box: a corner of the viewport, the backdrop (the box is centred, 12 px or more in). */
const BACKDROP = { x: 4, y: 4 };
/** The frame's least height, as a share of the viewport's: "a height that fits the viewport" (§ 2 item 2). */
const FRAME_MIN_SHARE = 0.75;

/** The /why/ page's title, read from the site's source (the frame's document is that page). */
const WHY_TITLE = /<title>([^<]+)<\/title>/.exec(await readFile(siteFile("src", "why", "index.html"), "utf8"))[1];
/** A development page one directory down: the first event's (data/events.json), as /<event-id>/ is served. */
const [{ id: EVENT }] = JSON.parse(await readFile(siteFile("data", "events.json"), "utf8"));

const prodOut = await mkdtemp(join(tmpdir(), "fitaf-storybook-why-prod-"));
const devOut = await mkdtemp(join(tmpdir(), "fitaf-storybook-why-dev-"));
after(() => Promise.all([prodOut, devOut].map((d) => rm(d, { recursive: true, force: true }))));
await siteBuild({ build: "production", out: prodOut });
await siteBuild({ build: "development", out: devOut });

/** The cases' pages: where each is served from, at which width and fragment. */
const PAGES = [
  { name: "production, 390, #lean-7", dir: prodOut, path: "/index.html", hash: "#lean-7", width: VIEWPORTS.w390.width },
  { name: "production, 1280, #family", dir: prodOut, path: "/index.html", hash: "#family", width: VIEWPORTS.w1280.width },
  { name: `development /${EVENT}/, 390, #lean-7`, dir: devOut, path: `/${EVENT}/index.html`, hash: "#lean-7", width: VIEWPORTS.w390.width },
];

/** `fn(page, base)` on the page served from `dir` at `path` + `hash`, `width` wide, in a fresh Chrome (JavaScript off
 *  with `script: false`). Refuses any request off 127.0.0.1. */
async function withPage({ dir, path, hash, width, script = true }, fn) {
  const server = await serveStatic(dir);
  const chrome = await freshChrome();
  try {
    const page = await chrome.browser.newPage();
    await page.setViewport({ width, height: VIEWPORTS[width === VIEWPORTS.w390.width ? "w390" : "w1280"].height });
    await page.setJavaScriptEnabled(script);
    await page.setRequestInterception(true);
    page.on("request", (r) => (isLocal(r.url()) ? r.continue() : r.abort()));
    await page.goto(`${server.base}${path}${hash}`, { waitUntil: "load" });
    return await fn(page, server.base);
  } finally {
    await chrome.close();
    await server.close();
  }
}

/** Runs in the page: the dialog, its frame and where focus is. */
function readWhy() {
  const dialog = document.getElementById("why");
  const frame = dialog?.querySelector("iframe");
  const doc = frame?.contentDocument ?? null;
  const box = (el) => el?.getBoundingClientRect().toJSON() ?? null;
  return {
    open: Boolean(dialog?.open),
    modal: Boolean(dialog?.matches(":modal")),
    focusInside: Boolean(dialog?.contains(document.activeElement)),
    focusOnButton: document.activeElement?.id === "why-link",
    viewport: { width: innerWidth, height: innerHeight },
    box: box(dialog),
    frameBox: box(frame),
    doc: doc && { path: doc.location.pathname, title: doc.title, scrolls: doc.documentElement.scrollHeight > doc.documentElement.clientHeight },
  };
}

/** One line per thing W2 does not hold on `page`; [] when all do. Stops at the first close that does not happen. */
async function behaviourProblems(page) {
  const problems = [];
  const state = () => page.evaluate(readWhy);
  const open = async (how) => {
    const pressed = await page.click("#why-link").then(
      () => true,
      (err) => problems.push(`${how}: the button could not be pressed (${err.message})`) && false,
    );
    if (!pressed) return false;
    const s = await state();
    if (!s.open || !s.modal) problems.push(`${how}: the button did not open the dialog modally (open ${s.open}, modal ${s.modal})`);
    return s.open;
  };
  const closes = async (how, press) => {
    await press();
    const s = await state();
    if (s.open) problems.push(`${how} did not close the dialog`);
    else if (!s.focusOnButton) problems.push(`${how}: focus did not return to the button`);
    return !s.open;
  };

  if (!(await open("first press"))) return problems;
  const opened = await state();
  if (!opened.focusInside) problems.push("focus did not move into the dialog");
  const loaded = await page
    .waitForFunction(
      (path, title) => {
        const doc = document.querySelector("#why iframe")?.contentDocument;
        return doc?.readyState === "complete" && doc.location.pathname === path && doc.title === title;
      },
      { timeout: FRAME_LOAD_MS },
      WHY_PATH,
      WHY_TITLE,
    )
    .then(
      () => true,
      () => false,
    );
  const s = await state();
  if (!loaded) problems.push(`the frame did not load ${WHY_PATH}: ${JSON.stringify(s.doc)}`);
  const { box, frameBox, viewport } = s;
  if (box.top < 0 || box.bottom > viewport.height || box.left < 0 || box.right > viewport.width) problems.push(`the dialog is not inside the viewport: ${JSON.stringify(box)}`);
  const inBox = frameBox.left >= box.left && frameBox.right <= box.right && frameBox.top >= box.top && frameBox.bottom <= box.bottom;
  if (!inBox) problems.push(`the frame is not inside the dialog's box: ${JSON.stringify({ box, frameBox })}`);
  if (frameBox.height < FRAME_MIN_SHARE * viewport.height) problems.push(`the frame is ${frameBox.height}px tall in a ${viewport.height}px viewport`);
  if (loaded && !s.doc.scrolls) problems.push("the /why/ page does not scroll inside the frame");

  if (!(await closes("Escape", () => page.keyboard.press("Escape")))) return problems;
  if (!(await open("second press"))) return problems;
  if (!(await closes("the close button", () => page.click("#why-close")))) return problems;
  if (!(await open("third press"))) return problems;
  await closes("a press on the backdrop", () => page.mouse.click(BACKDROP.x, BACKDROP.y));
  return problems;
}

for (const where of PAGES) {
  test(`W2 (${where.name}): the button opens the dialog with /why/ in its frame; Escape, the close button and the backdrop close it, focus back on the button (Chrome)`, { timeout: TIMEOUT_MS }, async () => {
    const problems = await withPage(where, (page) => behaviourProblems(page));
    assert.deepEqual(problems, []);
  });
}

for (const where of PAGES) {
  test(`W3 (${where.name}): without script, no button and no dialog; the footer's link to /why/; the plans still shown (Chrome)`, { timeout: TIMEOUT_MS }, async () => {
    const read = await withPage({ ...where, script: false }, async (page, base) => {
      const seen = await page.evaluate(() => ({
        label: document.getElementById("why-link")?.textContent.trim() ?? null,
        button: document.getElementById("why-link")?.checkVisibility() ?? null,
        dialog: document.getElementById("why")?.checkVisibility() ?? null,
        frame: document.querySelector("#why iframe")?.checkVisibility() ?? null,
        plans: document.getElementById("all")?.checkVisibility() ?? null,
        links: [...document.querySelectorAll("footer a")].filter((a) => a.checkVisibility()).map((a) => ({ text: a.textContent.trim(), href: a.href })),
      }));
      let landed = null;
      if (seen.links.length === 1) {
        await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.click("footer a")]);
        landed = await page.evaluate(() => ({ path: location.pathname, title: document.title }));
      }
      return { ...seen, base, landed };
    });
    assert.ok(read.label, "control: the button is in the markup");
    assert.equal(read.plans, true, "control: the page's no-script rule still shows the plans dialog");
    assert.deepEqual([read.button, read.dialog, read.frame], [false, false, false], "neither the button nor the dialog (nor its frame) shown");
    assert.deepEqual(read.links, [{ text: read.label, href: `${read.base}${WHY_PATH}` }], "the footer's one link, the button's label, to /why/");
    assert.deepEqual(read.landed, { path: WHY_PATH, title: WHY_TITLE }, "the link opens the /why/ page");
  });
}

/** The one line of the page's script that wires the button: the one naming its id as a selector, read from the page. */
const WIRING = /^[^\n]*["']#why-link["'][^\n]*\n/gm;

test("W2 (mutant): the button wired to nothing (its line of the script removed) fails W2; the copy as built passes (Chrome, 390)", { timeout: TIMEOUT_MS }, async (t) => {
  const copy = await mkdtemp(join(tmpdir(), "fitaf-storybook-why-mutant-"));
  t.after(() => rm(copy, { recursive: true, force: true }));
  await siteBuild({ build: "production", out: copy });
  const index = join(copy, "index.html");
  const html = await readFile(index, "utf8");
  const where = { dir: copy, path: "/index.html", hash: "#lean-7", width: VIEWPORTS.w390.width };
  assert.equal(html.match(WIRING)?.length, 1, "fixture control: one line of the script wires the button");
  assert.deepEqual(await withPage(where, (page) => behaviourProblems(page)), [], "control: the copy as built passes W2");
  await writeFile(index, html.replace(WIRING, ""));
  const problems = await withPage(where, (page) => behaviourProblems(page));
  assert.ok(problems.some((p) => /the button did not open the dialog/.test(p)), problems.join("\n"));
});
