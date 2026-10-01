// Shared by the cc-*.test.mjs files (SPEC-chefs-choice.md: this week's Chef's Choice on the plan page). Not a test file
// itself. Every case builds through build.mjs's own build() into a temporary directory, with a picks directory it names
// (the committed fixture, or a temporary copy): no file in the repository is written, and nothing is requested.
// The plan page is run as a browser runs it: its inline scripts, in order, in one `vm` context over linkedom's DOM, with
// the browser's clock fixed at an instant.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import vm from "node:vm";
import { parseHTML } from "linkedom";
import { build, ROOT } from "../build.mjs";
import { fakeWindow, orderPage, refKey, run, script } from "./r2-harness.mjs";

/** The committed fixture: invented meal names, the week delivered Sunday 2026-10-04 (week B of § 2's ruling). */
export const FIXTURE_DIR = join(ROOT, "test", "fixtures", "picks");
export const FIXTURE_FILE = join(FIXTURE_DIR, "2026-10-04.json");
export const FIXTURE = JSON.parse(await readFile(FIXTURE_FILE, "utf8"));
export const MESSAGES = JSON.parse(await readFile(join(ROOT, "data", "messages.json"), "utf8"));
export const PLANS = JSON.parse(await readFile(join(ROOT, "data", "plans.json"), "utf8"));

/** § 2: delivery Sunday S is open to order from S − 9 (a Friday) through S − 3 (a Thursday). */
export const S = "2026-10-04";
export const DAYS = {
  "S-10": "2026-09-24",
  "S-9": "2026-09-25",
  "S-5": "2026-09-29",
  "S-3": "2026-10-01",
  "S-2": "2026-10-02",
};
/** The build's date for the cases that want the week open: the day this contract was ruled, inside S's window. */
export const ON = "2026-09-30";

/** 17:00 UTC on `ymd`: 13:00 in New York, the same date in either zone. */
export const midday = (ymd) => Date.parse(`${ymd}T17:00:00Z`);

/** The mpid of each individual plan (a size) for `count`, in plans.json's order. */
export const mpidsFor = (count) =>
  PLANS.individual.map((plan) => plan.counts.find((c) => c.meals_per_week === Number(count)).mpid);

/** Every individual cell the page shows: [fragment, count, mpid]. */
export const CELLS = PLANS.individual.flatMap((plan) =>
  PLANS.shown_counts.map(({ meals_per_week: n }) => [
    `#${plan.id}-${n}`,
    String(n),
    plan.counts.find((c) => c.meals_per_week === n).mpid,
  ]),
);

/** A temporary directory holding `files` ({ "2026-10-04.json": object or text }): a picks directory for one case. */
export async function picksDir(files) {
  const dir = await mkdtemp(join(tmpdir(), "boston-cc-picks-"));
  for (const [name, body] of Object.entries(files)) {
    await writeFile(join(dir, name), typeof body === "string" ? body : JSON.stringify(body, null, 2));
  }
  return dir;
}

/** The fixture as another week: every name suffixed, so a page shows which week it carries. */
export function otherWeek(delivery, suffix = " (next week)") {
  const week = structuredClone(FIXTURE);
  week.delivery = delivery;
  for (const menu of Object.values(week.menus)) for (const meal of menu) meal.name += suffix;
  return week;
}

/**
 * build() into a temporary directory; returns the page it wrote (index.html) and the result. `picksDir` and `on` are the
 * build's own options (SPEC-chefs-choice § 2); `messagesPath` replaces data/messages.json (CC-7).
 */
export async function builtPage({ target = "prod", picks = FIXTURE_DIR, on = ON, messagesPath } = {}) {
  const outDir = await mkdtemp(join(tmpdir(), `boston-cc-${target}-`));
  try {
    const result = await build({ target, outDir, picksDir: picks, on, ...(messagesPath ? { messagesPath } : {}) });
    return { html: await readFile(join(outDir, "index.html"), "utf8"), result };
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

/** The page's embedded picks (`<script type="application/json" id="picks-data">`), or null when it carries none. */
export function picksData(html) {
  const m = /<script type="application\/json" id="picks-data">([\s\S]*?)<\/script>/.exec(html);
  return m ? JSON.parse(m[1]) : null;
}

/** The phrases of § 3, as data/messages.json holds them (placeholders in their places). */
export const words = (messages = MESSAGES) => messages.chefs_choice;
const fill = (phrase, values) => phrase.replace(/\{([a-z]+)\}/g, (whole, k) => (k in values ? String(values[k]) : whole));
/** The week a delivery Sunday's meals are for (SPEC-plan-page-refinement § 8 item 6): Monday to Sunday after it,
 *  "October 5–11", or across a month "September 28 – October 4". Worked out here on its own, not by the build's code. */
export function weekOf(delivery) {
  const day = (n) => new Date(Date.parse(`${delivery}T00:00:00Z`) + n * 86_400_000);
  const month = (d) => d.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  const [a, b] = [day(1), day(7)];
  return month(a) === month(b) ? `${month(a)} ${a.getUTCDate()}–${b.getUTCDate()}` : `${month(a)} ${a.getUTCDate()} – ${month(b)} ${b.getUTCDate()}`;
}
/** The list's heading for the week delivered on `delivery` (since § 8 item 6 the same for every count). */
export const headingFor = (count, delivery, messages = MESSAGES) => fill(words(messages).heading, { week: weekOf(delivery) });
/** One meal as the list shows it: its name, with its count when above 1. */
export const mealLine = ({ name, qty }, messages = MESSAGES) =>
  qty > 1 ? fill(words(messages).meal_qty, { meal: name, n: qty }) : name;

/** A Date whose clock reads `now` (ms since the epoch), as page-sim.mjs's. */
function clockAt(now) {
  return class extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
    static now() {
      return now;
    }
  };
}

/**
 * The page in a browser: its inline scripts (not the JSON ones), in order, in one context whose globals are linkedom's
 * document, a location whose hash fires `hashchange` as a browser's does, and (with `now`) a clock fixed at that instant.
 * `go(hash)` is a visitor choosing; `el(id)` an element, which must exist. Since SPEC-plan-page-refinement § 2 item 1 the
 * page's script starts the carousel's timer: `timers` records each setInterval (none fires by itself; `tick()` fires
 * them) and `reducedMotion` is what matchMedia answers for prefers-reduced-motion.
 */
export function openPlanPage(html, { hash = "", now, reducedMotion = false } = {}) {
  const { document } = parseHTML(html);
  const listeners = {};
  let current = hash;
  const location = {
    get hash() {
      return current;
    },
    set hash(value) {
      const next = value.startsWith("#") ? value : `#${value}`;
      if (next === current) return;
      current = next;
      for (const fn of listeners.hashchange ?? []) fn({ type: "hashchange" });
    },
  };
  const timers = [];
  const g = {
    document,
    location,
    console,
    addEventListener(type, fn) {
      (listeners[type] ??= []).push(fn);
    },
    matchMedia: (query) => ({ matches: reducedMotion && /prefers-reduced-motion:\s*reduce/.test(query) }),
    setInterval(fn, ms) {
      timers.push({ fn, ms, cleared: false });
      return timers.length;
    },
    clearInterval(id) {
      if (timers[id - 1]) timers[id - 1].cleared = true;
    },
  };
  g.window = g;
  if (now !== undefined) g.Date = clockAt(now);
  const context = vm.createContext(g);
  for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) vm.runInContext(m[1], context);
  const el = (id) => {
    const found = document.getElementById(id);
    assert.ok(found, `the page has an element #${id}`);
    return found;
  };
  const tick = () => timers.filter((t) => !t.cleared).forEach((t) => t.fn());
  return { document, el, go: (h) => (location.hash = h), has: (id) => Boolean(document.getElementById(id)), timers, tick };
}

/** True when `node` or an ancestor carries `hidden`: not shown, and nothing inside it can take focus. */
export function hiddenInTree(node) {
  for (let n = node; n && n.getAttribute; n = n.parentElement) if (n.hasAttribute("hidden")) return true;
  return false;
}

/** What the result card offers at this moment: which of its controls are shown, the list's words, and the links. Since
 *  SPEC-plan-page-refinement § 2 item 5 there is no button: the card offers the week's Chef's Choice when its list shows. */
export function card(page) {
  const { document } = page;
  const shown = (id) => {
    const node = document.getElementById(id);
    return Boolean(node) && !hiddenInTree(node);
  };
  const text = (id) => document.getElementById(id)?.textContent.replace(/\s+/g, " ").trim() ?? null;
  return {
    result: shown("result"),
    choose: shown("result-cta"),
    list: shown("cc-list"),
    own: shown("cc-own"),
    heading: text("cc-heading"),
    meals: [...(document.getElementById("cc-meals")?.querySelectorAll("li") ?? [])].map((li) => li.textContent),
    tiles: [...(document.getElementById("cc-meals")?.querySelectorAll("li") ?? [])].map((li) => li.querySelector(".cc-thumb")),
    checkout: document.getElementById("cc-checkout")?.getAttribute("href") ?? null,
    ownHref: document.getElementById("cc-own")?.getAttribute("href") ?? null,
    chooseHref: document.getElementById("result-cta")?.getAttribute("href") ?? null,
  };
}

/** The plan page at `now`, on `hash`: the list is open with no press (SPEC-plan-page-refinement § 2 item 5). */
export function openedCard(html, { hash = "#lean-7", now = midday(DAYS["S-5"]) } = {}) {
  const page = openPlanPage(html, { hash, now });
  return { page, state: card(page) };
}

/** The v2 fragment a menu's link carries, written from r2-harness's independent key (refKey), in the menu's order. */
export const expectedFragment = (menu) =>
  `#fitaf=2.${menu.map((m) => (m.qty === 1 ? refKey(m.name) : `${refKey(m.name)}*${m.qty}`)).join(".")}`;

const escHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const mealCard = (name) =>
  `<app-product-card><div class="product__content-title">${escHtml(name)}</div>` +
  `<div class="product__actions"><button type="button">Add to Cart</button></div></app-product-card>`;

/**
 * R2's way of reading a link (r2-01, r2-13b, r2-24): the SHIPPED fill-B text, run on the synthetic order page at the
 * link's own path and query, its cards replaced by one per name. Returns the page (its presses per meal) and the window
 * (its log, which names the mpid fill B read from the page's own ?mpid=).
 */
export async function readWithFillB(link, names) {
  const url = new URL(link);
  const page = await orderPage();
  page.document.querySelector("main").innerHTML = names.map(mealCard).join("");
  const h = fakeWindow({ path: url.pathname + url.search, fragment: url.hash, page });
  run(await script("B"), h.window);
  h.timers.drain(5000);
  return { page, h, path: url.pathname + url.search };
}

/** A copy of this package's build inputs (build.mjs, package.json, data/, scripts/, src/) in a temporary directory,
 *  with this package's node_modules linked in; `edit(dir)` changes the copy before it is used. */
export async function mirror(edit = async () => {}) {
  const { cp, realpath, symlink } = await import("node:fs/promises");
  // The real path: a program's main-module check compares its own URL (resolved) with argv[1], and the system's
  // temporary directory may be reached through a link (/var -> /private/var).
  const dir = await realpath(await mkdtemp(join(tmpdir(), "boston-cc-mirror-")));
  for (const name of ["build.mjs", "package.json"]) await copyFile(join(ROOT, name), join(dir, name));
  for (const name of ["data", "scripts", "src"]) await cp(join(ROOT, name), join(dir, name), { recursive: true });
  await symlink(join(ROOT, "node_modules"), join(dir, "node_modules"));
  await edit(dir);
  return dir;
}

/** Put the fixture in a mirror's data/picks/, as a person would put the week's file in the package. */
export async function withFixtureInData(dir) {
  await mkdir(join(dir, "data", "picks"), { recursive: true });
  await copyFile(FIXTURE_FILE, join(dir, "data", "picks", "2026-10-04.json"));
}

// CC-8: the Worker, as the files its entry reaches.
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const IMPORT = /^\s*(?:import|export)\s[^;]*?\bfrom\s+["']([^"']+)["']/gm;
const BARE_IMPORT = /^\s*import\s+["']([^"']+)["']/gm;

/** Every file the Worker's entry reaches by a relative import (its JSON included), by path from the package: SHA-256. */
export async function workerFiles(entry = join(ROOT, "src", "worker", "index.js")) {
  const out = {};
  const walk = async (path) => {
    const key = relative(ROOT, path);
    if (key in out) return;
    const bytes = await readFile(path);
    out[key] = sha256(bytes);
    if (!path.endsWith(".js")) return;
    const text = bytes.toString("utf8");
    for (const m of [...text.matchAll(IMPORT), ...text.matchAll(BARE_IMPORT)]) {
      if (m[1].startsWith(".")) await walk(resolve(dirname(path), m[1]));
    }
  };
  await walk(entry);
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}
