// SM-5's walk and SM-8's watch (SPEC-storybook-microsite.md § 5): headless Chrome opens each story in Storybook's own
// manager, at a viewport and a build, waits for the story to say it is ready (or failed), and reads what its frame shows.
// Every request the browser makes is seen: one to 127.0.0.1 goes on, any other is recorded and refused, so nothing
// leaves this machine even when a case fails. Not a test file itself.
import { pageUrl, VIEWPORTS } from "../microsite/layout.js";
import { freshChrome } from "./chrome.mjs";

const MANAGER_WIDTH_PX = 1600;
const MANAGER_HEIGHT_PX = 1100;
const STORY_TIMEOUT_MS = 60_000;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);
const LOCAL_SCHEMES = new Set(["data:", "blob:", "about:"]);

export function isLocal(url) {
  const u = new URL(url);
  return LOCAL_SCHEMES.has(u.protocol) || LOCAL_HOSTS.has(u.hostname);
}

/** The manager's address for one story, with its viewport and its args (`build`, and any of `extra`). */
export function managerUrl(base, { id, viewport, build, extra = {} }) {
  const args = Object.entries({ build, ...extra })
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
    ccToggle: shown("#cc-toggle"),
    ccList: shown("#cc-list"),
    meals: all("#cc-meals li").map((li) => li.textContent),
    chooseYourMeals: shown("#result-cta"),
    gridLinks: shown("#all") ? all("#all a").length : 0,
    family: shown("#panel-family"),
    individual: shown("#panel-individual"),
  };
}

/** Open each of `visits` ({ story, id, viewport, build, date, extra }) and read it; plus `docs` pages, opened only. */
export async function walk({ base, visits, docs = [] }) {
  const chrome = await freshChrome();
  const outside = [];
  const results = [];
  try {
    const page = await chrome.browser.newPage();
    await page.setViewport({ width: MANAGER_WIDTH_PX, height: MANAGER_HEIGHT_PX });
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (isLocal(request.url())) return request.continue();
      outside.push(request.url());
      return request.abort();
    });
    for (const visit of visits) {
      await page.goto(managerUrl(base, visit), { waitUntil: "load" });
      const preview = await (await page.waitForSelector("#storybook-preview-iframe")).contentFrame();
      await preview.waitForSelector('[data-story-state="ready"], [data-story-state="failed"]', { timeout: STORY_TIMEOUT_MS });
      results.push({ ...visit, width: VIEWPORTS[visit.viewport].width, ...(await preview.evaluate(inspect)) });
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
    if (r.story === "Chef's Choice · open") {
      if (!r.ccList) fail("the list is not shown");
      const expected = menus[r.extra?.meals ?? defaultMeals];
      if (JSON.stringify(r.meals) !== JSON.stringify(expected)) fail(`shows ${JSON.stringify(r.meals)}, not ${JSON.stringify(expected)}`);
    }
    if (r.story === "No picks this week" && (r.ccToggle || !r.chooseYourMeals)) fail("a Chef's Choice button, or no plain button");
    if (r.story === "All plans" && r.gridLinks !== gridLinks) fail(`${r.gridLinks} of the grid's ${gridLinks} links shown`);
    if (r.story === "Family" && (!r.family || r.individual)) fail("not the Family panel");
    if (r.story === "Scroll" && !(r.frameHeight >= r.pageHeight)) fail(`frame ${r.frameHeight} tall, its page ${r.pageHeight}`);
  }
  return problems;
}
