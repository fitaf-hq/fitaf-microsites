// SM-5's walk and SM-8's watch (SPEC-storybook-microsite.md § 5), and since § 8.4 SM-10's and SM-11's: headless Chrome
// opens each story in Storybook's own manager, at a viewport (and a build, for the microsite's), waits for the story to
// say it is ready (or failed), and reads what its frame shows: the microsite's page, or for a Hand-off story the
// synthetic store with the block. Every console line of the visit is kept (SM-11: the store's own lines, from the frame
// inside the story's). Every request the browser makes is seen: one to 127.0.0.1 goes on, any other is recorded and
// refused, so nothing leaves this machine even when a case fails. Not a test file itself.
import { pageUrl, VIEWPORTS } from "../microsite/layout.js";
import { freshChrome } from "./chrome.mjs";

const MANAGER_WIDTH_PX = 1600;
const MANAGER_HEIGHT_PX = 1100;
/** A Hand-off story runs the whole hand-off before its state shows; under load that is far longer than its 5 s here. */
const STORY_TIMEOUT_MS = 120_000;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);
const LOCAL_SCHEMES = new Set(["data:", "blob:", "about:"]);

export function isLocal(url) {
  const u = new URL(url);
  return LOCAL_SCHEMES.has(u.protocol) || LOCAL_HOSTS.has(u.hostname);
}

/** The manager's address for one story, with its viewport and its args (`build`, and any of `extra`; none unset). */
export function managerUrl(base, { id, viewport, build, extra = {} }) {
  const args = Object.entries({ build, ...extra })
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  return `${base}/index.html?path=/story/${id}&globals=viewport.value:${viewport}&args=${args}`;
}

/** Runs in the preview: what the story says about itself, and what its frame shows. */
function inspect() {
  const root = document.querySelector("[data-story-state]");
  const frame = root?.querySelector("iframe");
  const doc = frame?.contentDocument;
  const visible = (el) => Boolean(el && el.checkVisibility());
  const shown = (sel) => visible(doc?.querySelector(sel));
  const all = (sel) => (doc ? [...doc.querySelectorAll(sel)].filter(visible) : []);
  return {
    state: root?.dataset.storyState ?? null,
    problem: root?.dataset.storyProblem ?? null,
    frameWidth: frame ? frame.getBoundingClientRect().width : null,
    frameHeight: frame ? frame.getBoundingClientRect().height : null,
    innerWidth: frame?.contentWindow?.innerWidth ?? null,
    pageHeight: doc?.documentElement.scrollHeight ?? null,
    path: frame?.contentWindow?.location.pathname ?? null,
    ccList: shown("#cc-list"),
    meals: all("#cc-meals li").map((li) => li.textContent),
    tiles: all("#cc-meals li .cc-thumb").length,
    chooseYourMeals: shown("#result-cta"),
    gridLinks: shown("#all") ? all("#all a").length : 0,
    family: shown("#panel-family"),
    individual: shown("#panel-individual"),
  };
}

/**
 * § 8.4, runs in the preview: what a Hand-off story says about itself, and what its frame shows of the block and the
 * store: the screen (its slides, the one shown, its step line, its bar), the checkout's step and step bar, and for each
 * of `sections` how many are found and how many displayed (getClientRects, the measure the block and rung 2's cases use).
 */
function inspectHandoff(sections) {
  const root = document.querySelector("[data-story-state]");
  const frame = root?.querySelector("iframe");
  const doc = frame?.contentDocument;
  const displayed = (el) => Boolean(el && el.getClientRects().length > 0);
  const clean = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : null);
  const screen = doc?.getElementById("fitaf-screen") ?? null;
  const counts = {};
  for (const sel of sections) {
    const all = doc ? [...doc.querySelectorAll(sel)] : [];
    counts[sel] = { found: all.length, displayed: all.filter(displayed).length };
  }
  return {
    state: root?.dataset.storyState ?? null,
    problem: root?.dataset.storyProblem ?? null,
    frameWidth: frame ? frame.getBoundingClientRect().width : null,
    frameHeight: frame ? frame.getBoundingClientRect().height : null,
    innerWidth: frame?.contentWindow?.innerWidth ?? null,
    innerHeight: frame?.contentWindow?.innerHeight ?? null,
    path: frame?.contentWindow?.location.pathname ?? null,
    screen: displayed(screen),
    slides: screen ? screen.querySelectorAll(".c > *").length : 0,
    slide: clean(screen?.querySelector(".c > .on b")),
    line: clean(screen?.querySelector('[role="status"]')),
    bar: screen?.querySelector(".b i")?.style.width ?? null,
    steps: [1, 2, 3].filter((n) => doc?.documentElement.classList.contains(`fitaf-step-${n}`)),
    stepBar: Boolean(doc?.getElementById("fitaf-bar")),
    total: displayed(doc?.querySelector(".summary__total")),
    sections: counts,
  };
}

/** Open a page and refuse (and record) every request off 127.0.0.1; keep its console lines in `lines()`. */
async function watchedPage(chrome, outside) {
  const page = await chrome.browser.newPage();
  await page.setViewport({ width: MANAGER_WIDTH_PX, height: MANAGER_HEIGHT_PX });
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (isLocal(request.url())) return request.continue();
    outside.push(request.url());
    return request.abort();
  });
  let lines = [];
  page.on("console", (message) => lines.push(message.text()));
  return { page, lines: () => lines, reset: () => (lines = []) };
}

/**
 * Open each of `visits` ({ story, id, viewport, build, date, extra; `handoff` for a Hand-off story, `sections` its
 * readings }) and read it, with the visit's console lines; plus `docs` pages, opened only.
 */
export async function walk({ base, visits, docs = [] }) {
  const chrome = await freshChrome();
  const outside = [];
  const results = [];
  try {
    const { page, lines, reset } = await watchedPage(chrome, outside);
    for (const visit of visits) {
      reset();
      await page.goto(managerUrl(base, visit), { waitUntil: "load" });
      const preview = await (await page.waitForSelector("#storybook-preview-iframe")).contentFrame();
      await preview.waitForSelector('[data-story-state="ready"], [data-story-state="failed"]', { timeout: STORY_TIMEOUT_MS });
      const read = visit.handoff ? await preview.evaluate(inspectHandoff, visit.sections ?? []) : await preview.evaluate(inspect);
      results.push({ ...visit, width: VIEWPORTS[visit.viewport].width, height: VIEWPORTS[visit.viewport].height, ...read, console: lines() });
    }
    for (const id of docs) {
      await page.goto(`${base}/index.html?path=/docs/${id}`, { waitUntil: "load" });
      const preview = await (await page.waitForSelector("#storybook-preview-iframe")).contentFrame();
      await preview.waitForSelector(".sbdocs-content", { timeout: STORY_TIMEOUT_MS });
    }
  } finally {
    await chrome.close();
  }
  return { results, outside };
}

/** SM-5's reading of a walk: one line per thing a story does not show; [] when every story shows its state. */
export function statesProblems(results, { menus, defaultMeals, gridLinks }) {
  const problems = [];
  for (const r of results) {
    const where = `${r.story} · ${r.width} · ${r.build}${r.extra?.meals ? ` · ${r.extra.meals} meals` : ""}`;
    const fail = (what) => problems.push(`${where}: ${what}`);
    if (r.state !== "ready") fail(`${r.state}: ${r.problem}`);
    if (r.frameWidth !== r.width || r.innerWidth !== r.width) fail(`frame ${r.frameWidth} wide, its page ${r.innerWidth}`);
    if (r.path !== `/${pageUrl(r.build, r.date)}`) fail(`loads ${r.path}, not ${pageUrl(r.build, r.date)}`);
    if (r.story === "Chef's Choice") {
      if (!r.ccList) fail("the list is not shown");
      const expected = menus[r.extra?.meals ?? defaultMeals];
      if (JSON.stringify(r.meals) !== JSON.stringify(expected)) fail(`shows ${JSON.stringify(r.meals)}, not ${JSON.stringify(expected)}`);
      if (r.tiles !== r.meals.length) fail(`${r.tiles} tiles for ${r.meals.length} meals`);
    }
    if (r.story === "No picks this week" && (r.ccList || !r.chooseYourMeals)) fail("a Chef's Choice list, or no plain button");
    if (r.story === "All plans" && r.gridLinks !== gridLinks) fail(`${r.gridLinks} of the grid's ${gridLinks} links shown`);
    if (r.story === "Family" && (!r.family || r.individual)) fail("not the Family panel");
    if (r.story === "Scroll" && !(r.frameHeight >= r.pageHeight)) fail(`frame ${r.frameHeight} tall, its page ${r.pageHeight}`);
  }
  return problems;
}

/**
 * § 8.4, SM-8's store mutant: open `path` (a store's page, with a link) directly, not in a story, and keep it open for
 * `ms`, every request off 127.0.0.1 recorded and refused. Returns the requests recorded and the console lines.
 */
export async function visitDirect({ base, path, ms }) {
  const chrome = await freshChrome();
  const outside = [];
  try {
    const { page, lines } = await watchedPage(chrome, outside);
    await page.goto(`${base}${path}`, { waitUntil: "load" });
    await new Promise((resolve) => setTimeout(resolve, ms));
    return { outside, console: lines() };
  } finally {
    await chrome.close();
  }
}
