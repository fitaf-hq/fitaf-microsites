// Build the boston-2026-10 front door: dist/index.html and dist/qr/<event>.{png,svg}.
// Plain Node 22 ESM. The page is an OUTPUT of data/plans.json + src/; never hand-edit dist/.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

export const ROOT = dirname(fileURLToPath(import.meta.url));
export const PLANS_PATH = join(ROOT, "data", "plans.json");
export const EVENTS_PATH = join(ROOT, "data", "events.json");
export const DIST = join(ROOT, "dist");
export const DIST_DEV = join(ROOT, "dist-dev");
export const CLAIM_PATH = join(ROOT, "data", "claim.json");
export const WRANGLER_CONFIG = join(ROOT, "wrangler.jsonc");
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
      return `          <tr><th scope="row">${esc(plan.name)}</th>${tds}</tr>`;
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

/** The rung-3 slots. Production passes none, so every slot is "" and the page is rung 1's, byte for byte. */
const NO_CLAIM = { CLAIM_STYLE: "", DRAFT_BANNER: "", CLAIM_SECTION: "", CLAIM_SCRIPT: "" };

/**
 * The development build's claim section (SPEC-rung3 § 1). `claim` is data/claim.json; `siteKey` is the
 * dev environment's TURNSTILE_SITE_KEY from wrangler.jsonc (Cloudflare's published test key).
 */
export async function claimSlots(claim, siteKey) {
  const read = (name) => readFile(join(ROOT, "src", "claim", name), "utf8");
  const fill = (text) => text.replaceAll("{{WORDING_VERSION}}", esc(claim.wording_version));
  const clientClaim = { api: claim.api_path, wording_version: claim.wording_version, site_key: siteKey };
  return {
    CLAIM_STYLE: (await read("style.css")).trimEnd(),
    DRAFT_BANNER: "\n" + fill(await read("banner.html")).trimEnd(),
    CLAIM_SECTION: "\n" + fill(await read("section.html")).trimEnd(),
    CLAIM_SCRIPT:
      `\n<script type="application/json" id="claim-data">${scriptJson(clientClaim)}</script>` +
      `\n<script>\n${(await read("claim.js")).trim()}\n</script>` +
      `\n<script src="${TURNSTILE_SCRIPT_URL}" async defer></script>`,
  };
}

/** The dev environment's resolved config, read by wrangler itself (one source for bindings and keys). */
export async function devConfig() {
  const { unstable_readConfig } = await import("wrangler");
  return unstable_readConfig({ config: WRANGLER_CONFIG, env: "dev" }, { hideWarnings: true });
}

export async function renderPage(plans, claim = NO_CLAIM) {
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
    ...claim,
  };
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (whole, key) => {
    if (!(key in slots)) throw new Error(`template slot ${whole} has no value`);
    return slots[key];
  });
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

export async function build({ plansPath = PLANS_PATH, eventsPath = EVENTS_PATH, target = "prod", outDir } = {}) {
  if (target !== "prod" && target !== "dev") throw new Error(`unknown build target: ${target}`);
  outDir ??= target === "dev" ? DIST_DEV : DIST;
  const plans = await loadJson(plansPath);
  const events = await loadJson(eventsPath);
  // The dev directory is wholly this build's output, so it starts empty (nothing stale gets deployed).
  if (target === "dev") await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const slots =
    target === "dev"
      ? await claimSlots(await loadJson(CLAIM_PATH), (await devConfig()).vars.TURNSTILE_SITE_KEY)
      : NO_CLAIM;
  const html = await renderPage(plans, slots);
  const indexPath = join(outDir, "index.html");
  await writeFile(indexPath, html);
  // QR codes point at the production URL, so only the production build writes them.
  const qr = target === "prod" ? await writeQrCodes(events, outDir) : [];
  return { indexPath, bytes: Buffer.byteLength(html), qr };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const envFlag = process.argv.indexOf("--env");
  const out = await build({ target: envFlag === -1 ? "prod" : process.argv[envFlag + 1] });
  console.log(`wrote ${out.indexPath} (${out.bytes} bytes)`);
  for (const f of out.qr) console.log(`wrote ${f}`);
}
