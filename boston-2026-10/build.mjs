// Build the boston-2026-10 front door: dist/index.html and dist/qr/<event>.{png,svg}.
// Plain Node 22 ESM. The page is an OUTPUT of data/plans.json + src/; never hand-edit dist/.
import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { parseTarget, shareLines } from "./src/save/calculator.js";
import { currentGeneral, isLive, offerForSave } from "./src/worker/offers.js";
import { EMAIL_RE } from "./src/worker/validate-save.js";
import { classifyZip } from "./src/worker/zip-class.js";
import { formatter, pad, zonedDate, zonedParts } from "./src/worker/zoned-time.js";

export const ROOT = dirname(fileURLToPath(import.meta.url));
export const PLANS_PATH = join(ROOT, "data", "plans.json");
export const EVENTS_PATH = join(ROOT, "data", "events.json");
export const DIST = join(ROOT, "dist");
export const DIST_DEV = join(ROOT, "dist-dev");
export const SAVE_PATH = join(ROOT, "data", "save.json");
export const ZIPS_PATH = join(ROOT, "data", "delivery-zips.json");
export const OFFERS_PATH = join(ROOT, "data", "offers.json");
/** The weekly menu input of Flow 8. It does not exist yet, so the "See this week's menu" link is absent. */
export const MENU_PATH = join(ROOT, "data", "menu.json");
export const WRANGLER_CONFIG = join(ROOT, "wrangler.jsonc");
/** Same-origin static files the page references, copied beside index.html: src/<dir> -> <out>/<dir>. */
export const STATIC_DIRS = [
  { dir: "fonts", match: /\.woff2$/ },
  { dir: "assets", match: /\.png$/ },
];
export const TURNSTILE_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

const CENTS_PER_DOLLAR = 100;
const QR_OPTIONS = {
  errorCorrectionLevel: "M",
  margin: 2,
  color: { dark: "#1b2360", light: "#ffffff" },
};
const QR_PNG_WIDTH_PX = 1024;

export async function loadJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

/** Integer cents -> "$12.50". Refuses anything that is not an integer. */
export function money(cents) {
  if (!Number.isInteger(cents)) throw new TypeError(`cents must be an integer, got ${cents}`);
  const dollars = Math.floor(cents / CENTS_PER_DOLLAR);
  const rest = String(cents % CENTS_PER_DOLLAR).padStart(2, "0");
  return `$${dollars.toLocaleString("en-US")}.${rest}`;
}

export function weeklyTotalCents(cell) {
  return cell.meals_per_week * cell.price_per_meal_cents;
}

export function orderUrl(plans, mpid) {
  return `${plans.order_base_url}?mpid=${mpid}`;
}

export function shownCounts(plans) {
  return plans.shown_counts.map((c) => c.meals_per_week);
}

function cellFor(plan, count) {
  const cell = plan.counts.find((c) => c.meals_per_week === count);
  if (!cell) throw new Error(`plan ${plan.id} has no ${count}-meal cell`);
  return cell;
}

/** The six individual cells the page shows, in plan-then-count order. */
export function gridCells(plans) {
  return plans.individual.flatMap((plan) =>
    shownCounts(plans).map((count) => {
      const cell = cellFor(plan, count);
      return {
        plan: plan.id,
        name: plan.name,
        count,
        mpid: cell.mpid,
        price_per_meal_cents: cell.price_per_meal_cents,
        total_cents: weeklyTotalCents(cell),
      };
    }),
  );
}

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

function goalButton(plan) {
  const cal = `${plan.calories.min}–${plan.calories.max} cal`;
  const pro = `${plan.protein_g.min}–${plan.protein_g.max} g protein`;
  return `          <button type="button" class="choice" data-goal="${esc(plan.id)}" aria-pressed="false">
            <span class="choice-name">${esc(plan.name)}</span>
            <span class="choice-line">${esc(plan.promise)}</span>
            <span class="facts"><span class="fact">${cal}</span><span class="fact">${pro}</span></span>
          </button>`;
}

function countButton(c) {
  return `          <button type="button" class="choice" data-count="${c.meals_per_week}" aria-pressed="false">
            <span class="count-n">${c.meals_per_week} <small>meals a week</small></span>
            <span class="choice-line">${esc(c.label)}</span>
          </button>`;
}

function gridRows(plans) {
  const cells = gridCells(plans);
  return plans.individual
    .map((plan) => {
      const tds = cells
        .filter((c) => c.plan === plan.id)
        .map(
          (c) =>
            `<td><a class="cell" href="${esc(orderUrl(plans, c.mpid))}" data-cell="${c.plan}-${c.count}" ` +
            `aria-label="${esc(plan.name)}, ${c.count} meals a week: ${money(c.price_per_meal_cents)} per meal, ${money(c.total_cents)} a week">` +
            `<b>${money(c.price_per_meal_cents)}<span class="visually-hidden"> per meal</span></b>` +
            `<small>${money(c.total_cents)}/wk</small></a></td>`,
        )
        .join("");
      return `          <tr><th scope="row" data-accent="${esc(plan.id)}">${esc(plan.name)}</th>${tds}</tr>`;
    })
    .join("\n");
}

function gridHead(plans) {
  return plans.shown_counts
    .map((c) => `<th scope="col">${c.meals_per_week} meals<br>${esc(c.label)}</th>`)
    .join("");
}

function familySection(plans) {
  const f = plans.family;
  const cell = f.counts[0];
  const n = cell.meals_per_week;
  return `    <div class="family-card">
      <h2>${esc(f.name)}</h2>
      <p>${esc(f.promise)} &middot; serves ${f.servings.min}–${f.servings.max}</p>
      <dl class="figures">
        <div><dt>Per family meal</dt><dd>${money(cell.price_per_meal_cents)}</dd></div>
        <div><dt>Weekly total (${n} meal${n === 1 ? "" : "s"})</dt><dd>${money(weeklyTotalCents(cell))}</dd></div>
      </dl>
      <a class="cta" href="${esc(orderUrl(plans, cell.mpid))}" data-plan="${esc(f.id)}">Choose your meals</a>
    </div>`;
}

/** What the inline script needs: display strings computed here from cents, so money math lives once. */
function clientData(plans) {
  const counts = shownCounts(plans);
  return {
    base: plans.order_base_url,
    counts,
    plans: plans.individual.map((plan) => ({
      id: plan.id,
      name: plan.name,
      cells: Object.fromEntries(
        counts.map((count) => {
          const cell = cellFor(plan, count);
          return [
            count,
            {
              mpid: cell.mpid,
              per_meal: money(cell.price_per_meal_cents),
              total: money(weeklyTotalCents(cell)),
            },
          ];
        }),
      ),
    })),
  };
}

// JSON inside <script>: neutralise "<" so no "</script>" can close the element.
const scriptJson = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

/**
 * The production slot values. Each is either "" (a development-only section) or the exact text the page
 * carried before the slot existed, so the production page is byte-identical to rung 1's (test S20).
 */
export const PROD_SLOTS = {
  ASSET_PREFIX: "",
  QUESTION_ONE: "What's your goal?",
  HINT: "Pick a goal and how many meals to see your price.",
  DEV_STYLE: "",
  DRAFT_BANNER: "",
  SAVE_SECTION: "",
  SHARE_PANEL: "",
  DEV_SCRIPT: "",
};

/** Question 1 as a meal size (flows/02 § 2): what each size provides per meal, and no goal language. */
function sizeButton(plan) {
  const cal = `${plan.calories.min}–${plan.calories.max} cal`;
  const pro = `${plan.protein_g.min}–${plan.protein_g.max} g protein`;
  return `          <button type="button" class="choice" data-goal="${esc(plan.id)}" aria-pressed="false">
            <span class="choice-name">${esc(plan.name)}</span>
            <span class="choice-line">Per meal</span>
            <span class="facts"><span class="fact">${cal}</span><span class="fact">${pro}</span></span>
          </button>`;
}

const MENU_LINK = '<button type="button" class="skip" id="save-skip-menu">See this week&#39;s menu →</button>';

/** What the development page's scripts read: the save endpoint, the ZIP list (mock), the sizes, and (§ 2a)
 *  what the offer box needs to choose as the Worker does. ⛔ Never a code: no shared_code, no code_mode. */
export function saveClientData(plans, { save, zips, siteKey, eventId, offers }) {
  const prefixesOnly = (list) => (list ?? []).map((z) => (z.zip ? { zip: z.zip } : { prefix: z.prefix }));
  return {
    api: save.api_path,
    wording_version: save.wording_version,
    event_id: eventId,
    site_key: siteKey,
    email_pattern: EMAIL_RE.source,
    zips: { match: zips.match, prefixes: prefixesOnly(zips.prefixes), near_ring: prefixesOnly(zips.near_ring) },
    sizes: plans.individual.map((p) => ({ id: p.id, name: p.name, calories: p.calories, protein_g: p.protein_g })),
    send_time_zone: save.send_time_zone,
    offers: offers.offers.map((o) => ({
      id: o.id,
      label: o.label,
      applies_to: o.applies_to,
      valid_from: o.valid_from,
      valid_to: o.valid_to,
    })),
  };
}

/** A function's source as a declaration: a `function` as written; an arrow function bound to its own name. */
const declaration = (f) => (/^function\b/.test(f.toString()) ? f.toString() : `const ${f.name} = ${f};`);

/**
 * The development build's slots (SPEC-rung4 § 2): Flow 1 at the top, Flow 2 reframed as a meal size, the
 * share panel, the DRAFT marking. `siteKey` is the dev environment's TURNSTILE_SITE_KEY (Cloudflare's
 * published test key). Assets are addressed from the root, so /<event-id>/ pages find them.
 */
export async function devSlots(plans, { save, zips, siteKey, eventId, offers, menu = existsSync(MENU_PATH) }) {
  const read = (name) => readFile(join(ROOT, "src", "save", name), "utf8");
  const fill = (text) =>
    text.replaceAll("{{WORDING_VERSION}}", esc(save.wording_version)).replaceAll("{{MENU_LINK}}", menu ? MENU_LINK : "");
  const client = saveClientData(plans, { save, zips, siteKey, eventId, offers });
  // One source each, inlined as written: the Worker's ZIP check, the calculator's arithmetic, and (§ 2a) the
  // Worker's choice of offer with the zoned date it chooses on. FORMATTERS is zoned-time.js's cache, empty.
  const shared = [
    ...[classifyZip, shareLines, parseTarget].map(declaration),
    "const FORMATTERS = new Map();",
    ...[isLive, currentGeneral, offerForSave, formatter, zonedParts, pad, zonedDate].map(declaration),
  ].join("\n");
  return {
    ASSET_PREFIX: "/",
    QUESTION_ONE: "Meal size",
    HINT: "Pick a meal size and how many meals to see your price.",
    GOALS: plans.individual.map(sizeButton).join("\n"),
    DEV_STYLE: (await read("style.css")).trimEnd(),
    DRAFT_BANNER: "\n" + fill(await read("banner.html")).trimEnd(),
    SAVE_SECTION: "\n" + fill(await read("section.html")).trimEnd(),
    SHARE_PANEL: "\n" + (await read("share-panel.html")).trimEnd(),
    DEV_SCRIPT:
      `\n<script type="application/json" id="save-data">${scriptJson(client)}</script>` +
      `\n<script>\n${shared}\n</script>` +
      `\n<script>\n${(await read("flow1.js")).trim()}\n</script>` +
      `\n<script>\n${(await read("share.js")).trim()}\n</script>` +
      `\n<script src="${TURNSTILE_SCRIPT_URL}" async defer></script>`,
  };
}

/** The dev environment's resolved config, read by wrangler itself (one source for bindings and keys). */
export async function devConfig() {
  const { unstable_readConfig } = await import("wrangler");
  return unstable_readConfig({ config: WRANGLER_CONFIG, env: "dev" }, { hideWarnings: true });
}

export async function renderPage(plans, dev = PROD_SLOTS) {
  const template = await readFile(join(ROOT, "src", "template.html"), "utf8");
  const script = await readFile(join(ROOT, "src", "app.js"), "utf8");
  const slots = {
    GOALS: plans.individual.map(goalButton).join("\n"),
    COUNTS: plans.shown_counts.map(countButton).join("\n"),
    GRID_HEAD: gridHead(plans),
    GRID_ROWS: gridRows(plans),
    FAMILY: familySection(plans),
    READ_FROM_TEXT: esc(plans.read_from.replace(/^https?:\/\//, "")),
    READ_ON: esc(plans.read_on),
    DATA: scriptJson(clientData(plans)),
    SCRIPT: script.trim(),
    ...dev,
  };
  const html = template.replace(/\{\{([A-Z_]+)\}\}/g, (whole, key) => {
    if (!(key in slots)) throw new Error(`template slot ${whole} has no value`);
    return slots[key];
  });
  // A slot name the pattern cannot match (a digit, a lower-case letter) would otherwise ship as text.
  const left = /\{\{[^{}]*\}\}/.exec(template.replace(/\{\{([A-Z_]+)\}\}/g, ""));
  if (left) throw new Error(`template slot ${left[0]} is not a valid slot name`);
  return html;
}

/** Copy the fonts and the logo next to the page. Only files the page may reference are copied. */
export async function copyStatic(outDir) {
  const written = [];
  for (const { dir, match } of STATIC_DIRS) {
    await mkdir(join(outDir, dir), { recursive: true });
    for (const name of (await readdir(join(ROOT, "src", dir))).filter((n) => match.test(n)).sort()) {
      await copyFile(join(ROOT, "src", dir, name), join(outDir, dir, name));
      written.push(join(outDir, dir, name));
    }
  }
  return written;
}

export async function writeQrCodes(events, outDir) {
  const qrDir = join(outDir, "qr");
  await mkdir(qrDir, { recursive: true });
  const written = [];
  for (const event of events) {
    if (!/^[a-z0-9-]+$/.test(event.id)) throw new Error(`bad event id: ${event.id}`);
    const png = join(qrDir, `${event.id}.png`);
    const svg = join(qrDir, `${event.id}.svg`);
    await QRCode.toFile(png, event.url, { ...QR_OPTIONS, type: "png", width: QR_PNG_WIDTH_PX });
    await writeFile(svg, await QRCode.toString(event.url, { ...QR_OPTIONS, type: "svg" }));
    written.push(png, svg);
  }
  return written;
}

const checkEventId = (id) => {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`bad event id: ${id}`);
  return id;
};

/**
 * The development pages: dist-dev/<event-id>/index.html per event, each with its event id built in, and
 * dist-dev/index.html = the first event's page (SPEC-rung4 § 2).
 */
async function writeDevPages(plans, events, outDir, offersPath) {
  const save = await loadJson(SAVE_PATH);
  const zips = await loadJson(ZIPS_PATH);
  const offers = await loadJson(offersPath);
  const siteKey = (await devConfig()).vars.TURNSTILE_SITE_KEY;
  const written = [];
  for (const [i, event] of events.entries()) {
    const html = await renderPage(plans, await devSlots(plans, { save, zips, siteKey, eventId: checkEventId(event.id), offers }));
    await mkdir(join(outDir, event.id), { recursive: true });
    const paths = [join(outDir, event.id, "index.html"), ...(i === 0 ? [join(outDir, "index.html")] : [])];
    for (const path of paths) {
      await writeFile(path, html);
      written.push({ path, bytes: Buffer.byteLength(html) });
    }
  }
  return written;
}

export async function build({
  plansPath = PLANS_PATH,
  eventsPath = EVENTS_PATH,
  offersPath = OFFERS_PATH,
  target = "prod",
  outDir,
} = {}) {
  if (target !== "prod" && target !== "dev") throw new Error(`unknown build target: ${target}`);
  outDir ??= target === "dev" ? DIST_DEV : DIST;
  const plans = await loadJson(plansPath);
  const events = await loadJson(eventsPath);
  // The dev directory is wholly this build's output, so it starts empty (nothing stale gets deployed).
  if (target === "dev") await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  let pages;
  if (target === "dev") {
    pages = await writeDevPages(plans, events, outDir, offersPath);
  } else {
    const html = await renderPage(plans);
    const path = join(outDir, "index.html");
    await writeFile(path, html);
    pages = [{ path, bytes: Buffer.byteLength(html) }];
  }
  const files = await copyStatic(outDir);
  // QR codes point at the production URL, so only the production build writes them.
  const qr = target === "prod" ? await writeQrCodes(events, outDir) : [];
  return { indexPath: pages[0].path, bytes: pages[0].bytes, pages, files, qr };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const envFlag = process.argv.indexOf("--env");
  const out = await build({ target: envFlag === -1 ? "prod" : process.argv[envFlag + 1] });
  for (const p of out.pages) console.log(`wrote ${p.path} (${p.bytes} bytes)`);
  for (const f of [...out.files, ...out.qr]) console.log(`wrote ${f}`);
}
