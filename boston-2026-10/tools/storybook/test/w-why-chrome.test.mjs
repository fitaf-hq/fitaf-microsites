// W2 and W3 of the site's SPEC-why-fit-af.md (§ 2 items 3-4, § 3), in Chrome, here because this package drives Chrome
// and the site never installs a driver (the plans dialog's own case, PR-8 in pr-chrome.test.mjs, is the model):
// ⚠ MOVED by SPEC-every-menu-and-nutrition.md § 11 item 5 (the Advisor's review of 2026-10-22: *"Please make "Why Fit
// AF?" more prominent on the microsite. Let's try putting it in a button and then putting it above the Individual/Family
// chooser"*): the button is drawn directly above the tabs (nothing drawn between them), at least 64 CSS px tall, in the
// page's quieter button style (See all plans': its colour, type, underline, background and border), and the footer
// shows no *Why Fit AF?*; without script, the same place holds the link to /why/ and the footer none.
//   W2: the button opens its dialog modally, focus moving in, with the frame loaded at /why/ (its document the
//   site's src/why/index.html, known by its title) and as tall as the viewport allows, the /why/ page scrolling inside
//   it, and not requested before the button is pressed (`loading="lazy"`); Escape (with focus on the dialog's own
//   controls, and again with focus inside the frame, after a press in it), the close button and a press on the backdrop
//   each close it, and focus returns to the button. On the
//   production page at 390 (#lean-7) and at 1280 (#family, the other tab), and on a development page one directory down
//   (/<event-id>/, whose assets are addressed from the root) at 390.
//   W3: the same pages with JavaScript off: neither the button nor the dialog shown; one link shown to /why/, reading
//   the button's label, in the button's place above the tabs (no link in the footer); the plans dialog still shown, as
//   the page's no-script rule always showed it (a control).
//   W2, since SPEC-why-fit-af § 6 (2026-10-21): with the dialog open, a press on the /why/ page's link to this site's
//   plan page (found in the frame by where it goes, its URL resolved against the frame's document: this origin, path
//   "/"; never by its words, SM-4) closes the dialog, focus back on the button, the top page's URL unchanged, nothing
//   navigated (the frame's document still /why/). On the production page at 390 and the development page /demo/ at 390.
// ⭐ Mutant: a copy of the production build without the one line of its script that wires the button (the button wired
// to nothing) fails W2; the copy left as built (its control) passes. ⭐ And § 11's: a copy with the button left in the
// footer, beside See all plans (moved there in the copy's markup), fails W2; the copy as built passes. ⭐ And § 6's: a copy without the one line that
// listens for a click on the frame's document (the link's listener removed: the frame navigates to the plan page, the
// dialog stays open) fails § 6's case; the copy as built (its control) passes.
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
/** § 6: this site's plan page, the path a link in the frame must resolve to (on the frame's own origin). */
const PLAN_PATH = "/";
/** § 6: how long the network must be quiet after the press before the case reads what happened (a navigation the
 *  press started would be under way by then). */
const SETTLE_MS = 750;
/** SPEC-every-menu-and-nutrition § 11 item 5: "at least 64 CSS px tall" (the card's touch target, § 10). */
const TARGET_PX = 64;
/** The quieter button's look (SPEC-save-offer-production § 9.1 item 2: See all plans' style), as SP2 compares it. */
const LOOK = ["color", "fontFamily", "fontSize", "fontWeight", "textDecorationLine", "backgroundColor", "borderTopWidth"];

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
/** § 6's pages: production at 390 and the development page /demo/ at 390 (the contract names /demo/). */
const PLAN_LINK_PAGES = [PAGES[0], { name: "development /demo/, 390, #lean-7", dir: devOut, path: "/demo/", hash: "#lean-7", width: VIEWPORTS.w390.width }];

/** `fn(page, base, requested)` on the page served from `dir` at `path` + `hash`, `width` wide, in a fresh Chrome
 *  (JavaScript off with `script: false`); `requested` the paths asked of 127.0.0.1 so far. Refuses any other request. */
async function withPage({ dir, path, hash, width, script = true }, fn) {
  const server = await serveStatic(dir);
  const chrome = await freshChrome();
  try {
    const page = await chrome.browser.newPage();
    await page.setViewport({ width, height: VIEWPORTS[width === VIEWPORTS.w390.width ? "w390" : "w1280"].height });
    await page.setJavaScriptEnabled(script);
    await page.setRequestInterception(true);
    const requested = [];
    page.on("request", (r) => {
      if (!isLocal(r.url())) return r.abort();
      requested.push(new URL(r.url()).pathname);
      return r.continue();
    });
    await page.goto(`${server.base}${path}${hash}`, { waitUntil: "load" });
    return await fn(page, server.base, requested);
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
    // While the frame navigates, its document may be the initial one, with no element yet.
    doc: doc?.documentElement ? { path: doc.location.pathname, title: doc.title, scrolls: doc.documentElement.scrollHeight > doc.documentElement.clientHeight } : null,
  };
}

/** True once the dialog's frame holds the /why/ page, loaded (its path and its title the source's); false on timeout. */
function frameLoaded(page) {
  return page
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
}

/** Runs in the frame: its links whose URL, resolved against its document, is this origin's `planPath`. */
function linksToPlan(planPath) {
  return [...document.querySelectorAll("a[href]")].filter((a) => {
    const url = new URL(a.href, document.baseURI);
    return url.origin === location.origin && url.pathname === planPath;
  });
}

/** § 6: one line per thing the press on the frame's link to the plan page does not hold; [] when all do. */
async function planLinkProblems(page) {
  const problems = [];
  await page.click("#why-link");
  if (!(await frameLoaded(page))) return [`the frame did not load ${WHY_PATH}: ${JSON.stringify((await page.evaluate(readWhy)).doc)}`];
  const frame = await (await page.$("#why iframe")).contentFrame();
  const links = await frame.evaluateHandle(linksToPlan, PLAN_PATH);
  const count = await links.evaluate((all) => all.length);
  if (count !== 1) return [`fixture control: the /why/ page has ${count} links to the plan page, not 1`];
  const link = (await links.evaluateHandle((all) => all[0])).asElement();
  const top = page.url();
  const navigated = [];
  const onNavigated = (f) => navigated.push(`${f === page.mainFrame() ? "the top page" : "a frame"} to ${new URL(f.url()).pathname}`);
  page.on("framenavigated", onNavigated);
  await link.click();
  await page.waitForNetworkIdle({ idleTime: SETTLE_MS, timeout: FRAME_LOAD_MS }).catch(() => {});
  page.off("framenavigated", onNavigated);
  const s = await page.evaluate(readWhy);
  if (s.open) problems.push("a press on the frame's link to the plan page did not close the dialog");
  else if (!s.focusOnButton) problems.push("a press on the frame's link to the plan page: focus did not return to the button");
  if (page.url() !== top) problems.push(`the top page's URL moved: ${top} -> ${page.url()}`);
  if (navigated.length) problems.push(`navigated after the press: ${navigated.join("; ")}`);
  if (s.doc?.path !== WHY_PATH) problems.push(`the frame's document is not ${WHY_PATH} after the press: ${JSON.stringify(s.doc)}`);
  return problems;
}

/** Runs in the page: where the button is drawn (§ 11 item 5): its box and look, See all plans' look, the tabs' box,
 *  whether anything is drawn between the button and the tabs, and what of Why Fit AF? the footer draws. */
function readPlace(look) {
  const button = document.getElementById("why-link");
  const tabs = document.querySelector('[role="tablist"]');
  const plans = document.getElementById("all-link");
  const styleOf = (el) => (el ? Object.fromEntries(look.map((k) => [k, getComputedStyle(el)[k]])) : null);
  const between = [];
  let next = button?.nextElementSibling;
  for (; next && next !== tabs; next = next.nextElementSibling) if (next.checkVisibility()) between.push(next.tagName.toLowerCase());
  const label = button?.textContent.trim() ?? "";
  const footer = document.querySelector("footer");
  return {
    drawn: Boolean(button?.checkVisibility()),
    box: button?.getBoundingClientRect().toJSON() ?? null,
    tabs: tabs?.checkVisibility() ? tabs.getBoundingClientRect().toJSON() : null,
    sibling: next === tabs && Boolean(tabs),
    between,
    look: styleOf(button),
    plansLook: styleOf(plans),
    inFooter: Boolean(footer?.contains(button)),
    footerWhy: footer ? [...footer.querySelectorAll("button, a")].filter((el) => el.checkVisibility() && el.textContent.trim() === label).length : null,
  };
}

/** § 11 item 5: one line per thing the button's place does not hold on `page`; [] when all do. */
async function placeProblems(page) {
  const problems = [];
  const p = await page.evaluate(readPlace, LOOK);
  if (!p.drawn || !p.box) return ["the button is not drawn"];
  if (p.inFooter || p.footerWhy) problems.push(`the footer shows Why Fit AF? (the button in it: ${p.inFooter}; ${p.footerWhy} drawn there)`);
  if (!p.sibling) problems.push("the button is not directly above the tabs (not their preceding sibling)");
  if (p.between.length) problems.push(`drawn between the button and the tabs: ${p.between.join(", ")}`);
  if (!p.tabs || p.box.bottom > p.tabs.top + 1) problems.push(`the button is not above the tabs (${JSON.stringify({ button: p.box, tabs: p.tabs })})`);
  if (p.box.height < TARGET_PX) problems.push(`the button is ${p.box.height} px tall, under ${TARGET_PX}`);
  if (JSON.stringify(p.look) !== JSON.stringify(p.plansLook)) problems.push(`the button's look ${JSON.stringify(p.look)} is not See all plans' ${JSON.stringify(p.plansLook)}`);
  return problems;
}

/** One line per thing W2 does not hold on `page`; [] when all do. Stops at the first close that does not happen. */
async function behaviourProblems(page, requested) {
  const problems = await placeProblems(page);
  if (requested.includes(WHY_PATH)) problems.push(`${WHY_PATH} was requested before the button was pressed (the frame is not lazy)`);
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
  const loaded = await frameLoaded(page);
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
  if (!(await closes("a press on the backdrop", () => page.mouse.click(BACKDROP.x, BACKDROP.y)))) return problems;
  if (!(await open("fourth press"))) return problems;
  await page.mouse.click(frameBox.left + frameBox.width / 2, frameBox.top + frameBox.height / 2);
  if ((await page.evaluate(() => document.activeElement?.tagName)) !== "IFRAME") problems.push("control: a press in the frame did not move focus into it");
  await closes("Escape with focus inside the frame", () => page.keyboard.press("Escape"));
  return problems;
}

for (const where of PAGES) {
  test(`W2 (${where.name}): the button opens the dialog with /why/ in its frame; Escape, the close button and the backdrop close it, focus back on the button (Chrome)`, { timeout: TIMEOUT_MS }, async () => {
    const problems = await withPage(where, (page, base, requested) => behaviourProblems(page, requested));
    assert.deepEqual(problems, []);
  });
}

for (const where of PLAN_LINK_PAGES) {
  test(`W2 (${where.name}, SPEC-why-fit-af § 6): a press on the frame's link to the plan page closes the dialog, focus back on the button, the top page's URL unchanged, nothing navigated (Chrome)`, { timeout: TIMEOUT_MS }, async () => {
    assert.deepEqual(await withPage(where, (page) => planLinkProblems(page)), []);
  });
}

for (const where of PAGES) {
  test(`W3 (${where.name}): without script, no button and no dialog; the link to /why/ in the button's place above the tabs, none in the footer; the plans still shown (Chrome)`, { timeout: TIMEOUT_MS }, async () => {
    const read = await withPage({ ...where, script: false }, async (page, base) => {
      const seen = await page.evaluate((path) => {
        const button = document.getElementById("why-link");
        const tabs = document.querySelector('[role="tablist"]');
        const why = [...document.querySelectorAll("a")].filter((a) => a.checkVisibility() && new URL(a.href).pathname === path);
        // The button's place: the elements from the button to the tabs (its no-script link among them), none drawn but it.
        const place = [];
        for (let el = button; el && el !== tabs; el = el.nextElementSibling) place.push(el);
        const panel = document.getElementById("panel-individual");
        return {
          label: button?.textContent.trim() ?? null,
          button: button?.checkVisibility() ?? null,
          dialog: document.getElementById("why")?.checkVisibility() ?? null,
          frame: document.querySelector("#why iframe")?.checkVisibility() ?? null,
          plans: document.getElementById("all")?.checkVisibility() ?? null,
          links: why.map((a) => ({ text: a.textContent.trim(), href: a.href })),
          inPlace: why.length === 1 && place.some((el) => el.contains(why[0])),
          above: why.length === 1 && panel ? why[0].getBoundingClientRect().bottom <= panel.getBoundingClientRect().top + 1 : null,
          footer: [...document.querySelectorAll("footer a")].filter((a) => a.checkVisibility()).length,
        };
      }, WHY_PATH);
      let landed = null;
      if (seen.links.length === 1) {
        await page.goto(seen.links[0].href, { waitUntil: "load" });
        landed = await page.evaluate(() => ({ path: location.pathname, title: document.title }));
      }
      return { ...seen, base, landed };
    });
    assert.ok(read.label, "control: the button is in the markup");
    assert.equal(read.plans, true, "control: the page's no-script rule still shows the plans dialog");
    assert.deepEqual([read.button, read.dialog, read.frame], [false, false, false], "neither the button nor the dialog (nor its frame) shown");
    assert.deepEqual(read.links, [{ text: read.label, href: `${read.base}${WHY_PATH}` }], "one link, the button's label, to /why/");
    assert.equal(read.inPlace, true, "the link in the button's place, between it and the tabs");
    assert.equal(read.above, true, "the link drawn above the plan's panel");
    assert.equal(read.footer, 0, "no link in the footer");
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
  assert.deepEqual(await withPage(where, (page, base, requested) => behaviourProblems(page, requested)), [], "control: the copy as built passes W2");
  await writeFile(index, html.replace(WIRING, ""));
  const problems = await withPage(where, (page, base, requested) => behaviourProblems(page, requested));
  assert.ok(problems.some((p) => /the button did not open the dialog/.test(p)), problems.join("\n"));
});

/** § 6: the one line of the page's script that listens for a click on the frame's document (the link's listener). */
const PLAN_LINK_WIRING = /^[^\n]*\bdoc\.addEventListener\(["']click["'][^\n]*\n/gm;

test("W2 (mutant, SPEC-why-fit-af § 6): the link's listener removed (its line of the script) fails § 6's case; the copy as built passes (Chrome, 390)", { timeout: TIMEOUT_MS }, async (t) => {
  const copy = await mkdtemp(join(tmpdir(), "fitaf-storybook-why-plan-mutant-"));
  t.after(() => rm(copy, { recursive: true, force: true }));
  await siteBuild({ build: "production", out: copy });
  const index = join(copy, "index.html");
  const html = await readFile(index, "utf8");
  const where = { dir: copy, path: "/index.html", hash: "#lean-7", width: VIEWPORTS.w390.width };
  assert.equal(html.match(PLAN_LINK_WIRING)?.length, 1, "fixture control: one line of the script listens for a click on the frame's document");
  assert.deepEqual(await withPage(where, (page) => planLinkProblems(page)), [], "control: the copy as built passes § 6's case");
  await writeFile(index, html.replace(PLAN_LINK_WIRING, ""));
  const problems = await withPage(where, (page) => planLinkProblems(page));
  assert.ok(problems.some((p) => /did not close the dialog/.test(p)), problems.join("\n"));
  assert.ok(problems.some((p) => /navigated after the press: a frame to \/(;|$)/.test(p)), problems.join("\n"));
});

/** § 11 item 5's mutant: the button's markup, and See all plans' in the footer, each read from the page. */
const BUTTON_MARKUP = /<button\b[^>]*\bid="why-link"[^>]*>[^<]*<\/button>/g;
const PLANS_MARKUP = /<button\b[^>]*\bid="all-link"[^>]*>[^<]*<\/button>/g;

test("W2 (mutant, SPEC-every-menu-and-nutrition § 11): the button left in the footer, beside See all plans, fails W2; the copy as built passes (Chrome, 390)", { timeout: TIMEOUT_MS }, async (t) => {
  const copy = await mkdtemp(join(tmpdir(), "fitaf-storybook-why-footer-mutant-"));
  t.after(() => rm(copy, { recursive: true, force: true }));
  await siteBuild({ build: "production", out: copy });
  const index = join(copy, "index.html");
  const html = await readFile(index, "utf8");
  const where = { dir: copy, path: "/index.html", hash: "#lean-7", width: VIEWPORTS.w390.width };
  const [button] = html.match(BUTTON_MARKUP) ?? [];
  assert.equal(html.match(BUTTON_MARKUP)?.length, 1, "fixture control: the button's markup, once");
  assert.equal(html.match(PLANS_MARKUP)?.length, 1, "fixture control: See all plans' markup, once");
  assert.deepEqual(await withPage(where, (page, base, requested) => behaviourProblems(page, requested)), [], "control: the copy as built passes W2");
  await writeFile(index, html.replace(BUTTON_MARKUP, "").replace(PLANS_MARKUP, (plans) => plans + button));
  const problems = await withPage(where, (page, base, requested) => behaviourProblems(page, requested));
  t.diagnostic(problems.join("\n"));
  assert.ok(problems.some((p) => /the footer shows Why Fit AF\?/.test(p)) && problems.some((p) => /not directly above the tabs/.test(p)), problems.join("\n"));
});
