// Build the boston-2026-10 front door: dist/index.html and dist/qr/<event>.{png,svg}.
// Plain Node 22 ESM. The page is an OUTPUT of data/plans.json + src/; never hand-edit dist/.
//
//   node build.mjs [--env dev] [--out DIR]
//
// ⛔ THE BUILD EMBEDS NO WEEK (SPEC-week-content § 7, the orchestrator's ruling of 2026-10-11 on § 7's first open
// question): the page always carries the Chef's Choice card with a #picks-data holding `weeks: []`, hidden, and reads
// nothing of data/picks/. The deployed Workers put the week in that element from their bucket, the only source of a
// served week; data/picks/ is read by the content command (scripts/week-content.mjs) alone. The visible page with no week
// is the page before the card existed (WC-8). `--on` (the date that chose the embedded weeks) and `--picks` (the picks
// directory read instead of data/picks/) are removed with that: nothing in the build depends on a date. An argument the
// build does not know is ignored, as it always was, so a command that still passes `--on` builds the same page.
// --out is the directory written instead of dist/ (or dist-dev/): Storybook's pages (tools/storybook), never a deploy.
import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { mealsADayOf, parseTarget, shareLines } from "./src/save/calculator.js";
import { currentGeneral, isLive, offerForSave } from "./src/worker/offers.js";
import { EMAIL_RE } from "./src/worker/validate-save.js";
import { classifyZip } from "./src/worker/zip-class.js";
import { scriptJson } from "./src/worker/script-json.js";
import { checkSelection, legacyKey } from "./scripts/selection.mjs";
import { formatter, pad, zonedDate, zonedParts } from "./src/worker/zoned-time.js";
import { e1, ex } from "./src/worker/messages.js";
import { productionRefusals } from "./scripts/production-inputs.mjs";
import { qrEvent } from "./src/qr-event.js";

export const ROOT = dirname(fileURLToPath(import.meta.url));
export const PLANS_PATH = join(ROOT, "data", "plans.json");
export const EVENTS_PATH = join(ROOT, "data", "events.json");
export const DIST = join(ROOT, "dist");
export const DIST_DEV = join(ROOT, "dist-dev");
export const SAVE_PATH = join(ROOT, "data", "save.json");
/** The campaign's phrases, shared by the page and the mock-ups (mockups/): one place to change a phrase. */
export const MESSAGES_PATH = join(ROOT, "data", "messages.json");
export const ZIPS_PATH = join(ROOT, "data", "delivery-zips.json");
export const OFFERS_PATH = join(ROOT, "data", "offers.json");
/** The consent wording (SPEC-save-offer-production § 3 item 2: its status line and its placeholders gate production). */
export const DRAFT_PATH = join(ROOT, "consent", "DRAFT.md");
/** The weekly menu input of Flow 8. It does not exist yet, so the "See this week's menu" link is absent. */
export const MENU_PATH = join(ROOT, "data", "menu.json");
/** The week's Chef's Choice, one file per delivery Sunday (SPEC-chefs-choice § 1): read by the content command alone
 *  (scripts/week-content.mjs; SPEC-week-content § 7's ruling), never by the build. */
export const PICKS_DIR = join(ROOT, "data", "picks");
/** The plan page's photographs (SPEC-plan-page-refinement § 3): the manifest and the one directory holding every sheet it
 *  names, both produced outside this repository (the producer, § 3's tool, is held: Fit AF's own pipeline makes them).
 *  Every photo URL the page carries is built from the manifest's `base`. Without the manifest the page has no photograph. */
export const PHOTOS_PATH = join(ROOT, "data", "photo-sheets.json");
export const PHOTO_SHEETS_DIR = join(ROOT, "src", "assets", "photo-sheets");
export const WRANGLER_CONFIG = join(ROOT, "wrangler.jsonc");
/** The page's analytics (SPEC-analytics.md § 4): one inline script, inlined before app.js. */
export const ANALYTICS_PATH = join(ROOT, "src", "analytics.js");
/** Same-origin static files the page references, copied beside index.html: src/<dir> -> <out>/<dir>. */
export const STATIC_DIRS = [
  { dir: "fonts", match: /\.woff2$/ },
  { dir: "assets", match: /\.png$/ },
  { dir: "why", match: /\.html$/ }, // "Why Fit AF?" draft 2, for review (2026-10-20)
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
export const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

/** A size's calorie and protein ranges as ONE block, calories on its first line and protein on its second
 *  (SPEC-meal-selection § 9 item 1: one background, each line whole). */
function factsBlock(plan) {
  const cal = `${plan.calories.min}–${plan.calories.max} cal`;
  const pro = `${plan.protein_g.min}–${plan.protein_g.max} g protein`;
  return `<span class="facts"><span class="fact-line">${cal}</span><span class="fact-line">${pro}</span></span>`;
}

/** A goal: its name and its calorie and protein ranges (SPEC-plan-page-refinement § 2 item 2; the promise line is gone). */
function goalButton(plan) {
  return `          <button type="button" class="choice" data-goal="${esc(plan.id)}" aria-pressed="false">
            <span class="choice-name">${esc(plan.name)}</span>
            ${factsBlock(plan)}
          </button>`;
}

/** `{name}` placeholders filled in one pass, so a value is never read again as a placeholder. */
export const fillPhrase = (phrase, values) => phrase.replace(/\{([a-z]+)\}/g, (whole, key) => (key in values ? String(values[key]) : whole));

/** A phrase as markup: escaped, then each `*word*` emphasised (data/messages.json's own mark for emphasis). */
export const emphasised = (phrase) => esc(phrase).replace(/\*([^*]+)\*/g, "<em>$1</em>");

/** The meal selection's four questions (SPEC-meal-selection § 1) and each one's two answers; the answer is the button's
 *  `data-a`, and its phrase is `plan_page.questions.<question>.<answer>`. The page's order is answerOrder's. */
export const QUESTIONS = {
  lunch_dinner: ["or", "and"],
  weekends: ["yes", "no"],
  breakfast: ["yes", "no"],
  snacks: ["yes", "no"],
};

/** A question's two answers in the page's order (SPEC-meal-selection § 12 item 1): each pair's DEFAULT FIRST, on the
 *  left, read from data/plans.json's `selection_defaults` (Q2–Q4: its answer "yes" when the default is true), so a
 *  changed default keeps the default on the left: the order follows the default, it is not a second list. Q1 has no
 *  default (the card waits for it) and keeps QUESTIONS' order, *or* then *and*. */
export function answerOrder(q, defaults) {
  if (!(q in defaults)) return QUESTIONS[q];
  const first = defaults[q] ? "yes" : "no";
  return [first, ...QUESTIONS[q].filter((a) => a !== first)];
}

/** The plan page's own phrases (data/messages.json's `plan_page`), checked: a missing one refuses the build. */
export function planPageWords(messages) {
  const words = messages.plan_page ?? {};
  const phrase = (value) => typeof value === "string" && value.trim();
  const need = (ok, what) => {
    if (!ok) throw new Error(`data/messages.json: plan_page.${what} is missing`);
  };
  for (const [q, answers] of Object.entries(QUESTIONS)) {
    for (const key of ["heading", ...answers]) need(phrase(words.questions?.[q]?.[key]), `questions.${q}.${key}`);
  }
  const PHRASES = [["meals_unit", []], ["rounded", ["{meals}", "{plan}"]], ["total_unit", []], ["per_meal_unit", []], ["prices_as_of", ["{date}"]]];
  for (const [key, placeholders] of PHRASES) {
    need(phrase(words[key]) && placeholders.every((p) => words[key].includes(p)), `${key}${placeholders.length ? ` (with ${placeholders.join(" and ")})` : ""}`);
  }
  return words;
}

/** One question (SPEC-meal-selection § 1): its heading and its two answers, in the count buttons' style (centred, the
 *  check above: SPEC-plan-page-refinement § 8 item 4), words only (§ 7, ruled: no numeral), its default first (§ 12). */
function question(q, words, defaults) {
  const w = words.questions[q];
  const buttons = answerOrder(q, defaults).map(
    (a) =>
      `          <button type="button" class="choice" data-q="${q}" data-a="${a}" aria-pressed="false">` +
      `<span class="choice-name">${emphasised(w[a])}</span></button>`,
  );
  return `      <div class="step" role="group" aria-labelledby="q-${q}">
        <h2 class="step-label" id="q-${q}">${esc(w.heading)}</h2>
        <div class="choices counts">
${buttons.join("\n")}
        </div>
      </div>`;
}

/** Q1, then Q2–Q4 in one group the page shows once Q1 is answered (§ 7, ruled "After Q1"); Q4 only while snacks are
 *  offered (`offer`: § 9 item 3's `snacks.shown`, and SPEC-snacks-in-the-cart § 4.5: not while carted with no week). */
function mealQuestions(plans, words, offer = plans.snacks.shown) {
  const more = ["weekends", "breakfast", ...(offer ? ["snacks"] : [])];
  const defaults = plans.selection_defaults;
  return `${question("lunch_dinner", words, defaults)}

      <div class="more" id="more" hidden>
${more.map((q) => question(q, words, defaults)).join("\n")}
      </div>`;
}

/** The manifest of the photo sheets, or one with no photograph (`base: null`) when there is none. */
export async function loadPhotos(path = PHOTOS_PATH) {
  return existsSync(path) ? loadJson(path) : { base: null };
}

const ABSOLUTE_URL = /^([a-z][a-z0-9+.-]*:|\/\/)/i;

/**
 * A sheet's URL (§ 3), built from the manifest's `base` and nothing else: an absolute base (a CDN) as written; a relative
 * one after the page's own asset prefix (the development pages are one directory down and address assets from the
 * root). null when `base` is null (the photos removed) or the manifest names no such sheet.
 */
export function sheetUrl(photos, sheet, assetPrefix = "") {
  if (photos?.base == null || !sheet) return null;
  return (ABSOLUTE_URL.test(photos.base) ? "" : assetPrefix) + photos.base + sheet.file;
}

/** The sheets a relative base copies beside the page: every sheet the manifest names. None for a CDN or for null. */
export function sheetsToCopy(photos) {
  if (photos?.base == null || ABSOLUTE_URL.test(photos.base)) return [];
  return [photos.carousel, ...Object.values(photos.chefs_choice ?? {})].filter(Boolean);
}

/** A percentage for an inline style, without float noise. */
const pct = (n) => `${Number(n.toFixed(4))}%`;

/** § 2 item 1: the carousel, five 4:3 windows onto the carousel sheet's cells by position (no dots since § 8 item 1); ""
 *  when the page has no carousel photo (base null, or none in the manifest). Decorative: alt="", no dish is claimed. */
function carouselHtml(photos, assetPrefix) {
  const sheet = photos?.carousel;
  const url = sheetUrl(photos, sheet, assetPrefix);
  if (!url) return "";
  const cells = Object.entries(sheet.cells).sort(([a], [b]) => Number(a) - Number(b));
  const slides = cells.map(([, c], i) => {
    const style = `width:${pct((sheet.width / c.w) * 100)};left:${pct((-c.x / c.w) * 100)};top:${pct((-c.y / c.h) * 100)}`;
    return `      <div class="slide${i === 0 ? " on" : ""}"><img src="${esc(url)}" alt="" width="${sheet.width}" height="${sheet.height}" style="${style}"></div>`;
  });
  return `
  <div class="carousel" id="carousel">
    <div class="slides">
${slides.join("\n")}
    </div>
  </div>`;
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

/**
 * What the inline script needs: display strings computed here from cents, so money math lives once. Since
 * SPEC-meal-selection: per answer set (`or-5d`, § 8 item 2) the plan it goes through and the rounded line, or "" (§ 2);
 * each size's cells for every plan an answer set goes through; the defaults; today's two counts as answer sets (§ 3:
 * `#lean-7`, `#meals-14`); and whether Q4 is on the page.
 */
function clientData(plans, words, offer = plans.snacks.shown) {
  const { rows, defaults } = checkSelection(plans);
  const counts = [...new Set([...rows.values()].map((r) => r.plan))].sort((a, b) => a - b);
  const legacy = shownCounts(plans).map((n) => [n, legacyKey(rows, n)]).filter(([, key]) => key);
  return {
    base: plans.order_base_url,
    answers: Object.fromEntries(
      [...rows].map(([key, r]) => [key, { plan: r.plan, rounded: r.plan < r.meals ? fillPhrase(words.rounded, { meals: r.meals, plan: r.plan }) : "" }]),
    ),
    defaults,
    legacy: Object.fromEntries(legacy),
    snacks: offer,
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

// JSON inside <script>: neutralise "<" so no "</script>" can close the element. One function, in src/worker/ since
// SPEC-week-content § 4.2: the Worker writes the bucket's week into #picks-data with it, and the content command
// writes the bucket's object with it (the build's own #picks-data holds no week).
export { scriptJson };

/**
 * The production slot values. Each is either "" (a development-only section) or the exact text the page
 * carried before the slot existed, so the production page is byte-identical to rung 1's (test S20).
 */
export const PROD_SLOTS = {
  ASSET_PREFIX: "",
  QUESTION_ONE: "What's your goal?",
  DEV_STYLE: "",
  DRAFT_BANNER: "",
  OFFER_BOX: "",
  SAVE_SECTION: "",
  SAVE_FAMILY: "",
  SHARE_PANEL: "",
  DEV_SCRIPT: "",
};

/** The page without the Chef's Choice card at all: every slot empty, the page before the slots existed. Since
 *  SPEC-week-content § 2.1 the build never writes it (with no week it carries the card holding none); renderPage's
 *  default, the page the page cases read, whose visible page the build's equals (WC-8). */
export const NO_PICKS = { PICKS_STYLE: "", PICKS_CARD: "", PICKS_SCRIPT: "" };

/** Question 1 as a meal size (flows/02 § 2): what each size provides per meal, and no goal language. */
function sizeButton(plan) {
  return `          <button type="button" class="choice" data-goal="${esc(plan.id)}" aria-pressed="false">
            <span class="choice-name">${esc(plan.name)}</span>
            <span class="choice-line">Per meal</span>
            ${factsBlock(plan)}
          </button>`;
}

/** The development pages are at /<event-id>/, so they address the page's own files from the root. */
export const DEV_ASSET_PREFIX = "/";
/** SPEC-rung2-progress-and-checkout § 17.1: the codes of the sheet's hosts (scripts/handoff-link.mjs PHOTO_HOSTS). */
export const PROD_PHOTO_HOST = 0;
export const DEV_PHOTO_HOST = 1;

/** Flow 1's one link left once a menu input exists (Flow 8): since SPEC-rung4 § 2b item 3 there is no Build my plan link
 *  beside it, so the paragraph exists only with the link. */
const MENU_LINK =
  '\n            <p class="skips"><button type="button" class="skip" id="save-skip-menu">See this week&#39;s menu →</button></p>';

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
export const declaration = (f) => (/^function\b/.test(f.toString()) ? f.toString() : `const ${f.name} = ${f};`);

/** The zoned-date helpers the offer box inlines to choose on the send time zone's date (§ 2a), in its order, after
 *  "const FORMATTERS = new Map();". The Chef's Choice script inlines the same ones, the same way. */
export const ZONED_DATE_HELPERS = [formatter, zonedParts, pad, zonedDate];

/** The privacy notice in the step's last line (DRAFT § 1's "[Privacy notice]"): a link once data/save.json names the
 *  notice's address (`privacy_notice_url`), else the placeholder, as the development page has always shown it. */
export const privacyNotice = (url) =>
  url ? `<a class="save-privacy" href="${esc(url)}">Privacy notice</a>` : '<span class="placeholder">[Privacy notice]</span>';

/** The step's DRAFT tag (development only: SPEC-save-offer-production § 3 item 2, never in a production build). */
const DRAFT_TAG = '\n            <p class="draft-tag">DRAFT — not for use · wording {{WORDING_VERSION}}</p>';

/**
 * Flow 1's slots, the save step, as both builds carry it (SPEC-rung4 § 2b; SPEC-save-offer-production §§ 1, 3): the
 * offer box at the top (§ 2a's heading and label) and Flow 1 after the button that leaves for the store: in the result
 * card's place (SAVE_SECTION, directly after the result card) and, on Family, the place src/save/flow1.js moves it to
 * (SAVE_FAMILY, directly after the Family panel, whose last thing is the Family card's button: outside it, so the panel's
 * bytes are unchanged, MS-13); its style and its scripts, Turnstile's last. `draft`: the step's DRAFT tag (the
 * development build's alone). `share`: the share panel's arithmetic and script (the development build's Flow 2).
 * `siteKey` is the environment's TURNSTILE_SITE_KEY. Also returns `read` and `fill` for the development build's extras.
 */
export async function saveSlots(plans, { save, zips, siteKey, eventId, offers, menu = existsSync(MENU_PATH) }, { draft, share = false }) {
  const read = (name) => readFile(join(ROOT, "src", "save", name), "utf8");
  const fill = (text) =>
    text
      .replaceAll("{{DRAFT_TAG}}", draft ? DRAFT_TAG : "")
      .replaceAll("{{WORDING_VERSION}}", esc(save.wording_version))
      .replaceAll("{{MENU_LINK}}", menu ? MENU_LINK : "")
      .replaceAll("{{PRIVACY_NOTICE}}", privacyNotice(save.privacy_notice_url));
  const client = saveClientData(plans, { save, zips, siteKey, eventId, offers });
  // One source each, inlined as written: the Worker's ZIP check, the calculator's arithmetic (with the share panel), and
  // (§ 2a) the Worker's choice of offer with the zoned date it chooses on. FORMATTERS is zoned-time.js's cache, empty.
  const shared = [
    ...[classifyZip, ...(share ? [shareLines, parseTarget, mealsADayOf] : [])].map(declaration),
    "const FORMATTERS = new Map();",
    ...[isLive, currentGeneral, offerForSave, ...ZONED_DATE_HELPERS].map(declaration),
  ].join("\n");
  return {
    read,
    fill,
    DEV_STYLE: (await read("style.css")).trimEnd(),
    OFFER_BOX: "\n" + (await read("offer-box.html")).trimEnd(),
    SAVE_SECTION: "\n" + fill(await read("section.html")).trimEnd(),
    SAVE_FAMILY: '\n  <div id="save-end-family"></div>',
    DEV_SCRIPT:
      `\n<script type="application/json" id="save-data">${scriptJson(client)}</script>` +
      `\n<script>\n${shared}\n</script>` +
      `\n<script>\n${(await read("flow1.js")).trim()}\n</script>` +
      (share ? `\n<script>\n${(await read("share.js")).trim()}\n</script>` : "") +
      `\n<script src="${TURNSTILE_SCRIPT_URL}" async defer></script>`,
  };
}

/**
 * The development build's slots (SPEC-rung4 § 2): Flow 1 (saveSlots, with its DRAFT tag), Flow 2 reframed as a meal size,
 * the share panel, and the page's DRAFT banner. `siteKey` is the dev environment's TURNSTILE_SITE_KEY (Cloudflare's
 * published test key). Assets are addressed from the root, so /<event-id>/ pages find them.
 */
export async function devSlots(plans, inputs) {
  const { read, fill, ...flowOne } = await saveSlots(plans, inputs, { draft: true, share: true });
  return {
    ...flowOne,
    ASSET_PREFIX: DEV_ASSET_PREFIX,
    QUESTION_ONE: "Meal size",
    GOALS: plans.individual.map(sizeButton).join("\n"),
    DRAFT_BANNER: "\n" + fill(await read("banner.html")).trimEnd(),
    SHARE_PANEL: "\n" + (await read("share-panel.html")).trimEnd(),
  };
}

/**
 * The production page with data/save.json's `production` true (SPEC-save-offer-production § 3 item 2): production's
 * page (its Flow 2, its assets at its own root) and Flow 1 at the end exactly as the development build has it, with no
 * DRAFT tag, no banner and no share panel; the production site key; the one page saving as the first event.
 */
export async function productionSlots(plans, inputs) {
  const { read, fill, ...flowOne } = await saveSlots(plans, inputs, { draft: false });
  return { ...PROD_SLOTS, ...flowOne };
}

/** The dev environment's resolved config, read by wrangler itself (one source for bindings and keys). */
export async function devConfig() {
  const { unstable_readConfig } = await import("wrangler");
  return unstable_readConfig({ config: WRANGLER_CONFIG, env: "dev" }, { hideWarnings: true });
}

/** Production's resolved config (wrangler.jsonc's top level, which fitaf-infra mirrors): its vars name the sender, the
 *  site key and the site's address (SPEC-save-offer-production § 4 item 3). */
export async function productionConfig() {
  const { unstable_readConfig } = await import("wrangler");
  return unstable_readConfig({ config: WRANGLER_CONFIG }, { hideWarnings: true });
}

/** The page's phrases from data/messages.json. The event line's parts are joined as the page always wrote them. */
export function messageSlots(messages) {
  return {
    TAGLINE: esc(messages.tagline),
    EVENT_LINE: messages.event_line.map(esc).join(" &middot; "),
    HEADLINE: esc(messages.headline),
    SUBHEAD: esc(messages.subhead),
  };
}

/**
 * The page's analytics (SPEC-analytics.md § 4), the ANALYTICS slot of every page, production's and development's alike:
 * src/analytics.js in one inline <script>, data/events.json's ids (the QR events an `?e=` may name: § 9) written in place
 * of its `/*QR_IDS*\/[]`, without its whole-line `//` comments, its blank lines and each line's indentation (they are
 * for maintainers, and the development page is near T5's 60 KB; the script holds no multi-line string, so nothing it
 * means changes). Before app.js, so its error listener is there first.
 */
export const QR_IDS_MARK = "/*QR_IDS*/[]";
export async function analyticsSlot(events) {
  const text = await readFile(ANALYTICS_PATH, "utf8");
  if (text.split(QR_IDS_MARK).length !== 2) throw new Error(`src/analytics.js must hold ${QR_IDS_MARK} exactly once`);
  // SPEC-save-offer-production § 9 item 2: the page's one reading of `?e=` (src/qr-event.js), inlined as written at the
  // script's head, where the analytics and the save step both find it.
  const code = `${declaration(qrEvent)}\n${text}`
    .replace(QR_IDS_MARK, () => scriptJson(events.map((e) => checkEventId(e.id))))
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//"))
    .join("\n");
  return `<script>\n${code}\n</script>`;
}

/** `picks`: this week's Chef's Choice slots (scripts/chefs-choice.mjs), or none. `photos`: the photo sheets' manifest
 *  (data/photo-sheets.json when not given). `events`: data/events.json when not given (the analytics' QR ids). */
export async function renderPage(plans, dev = PROD_SLOTS, messages = null, picks = NO_PICKS, photos = undefined, events = undefined) {
  const template = await readFile(join(ROOT, "src", "template.html"), "utf8");
  const script = await readFile(join(ROOT, "src", "app.js"), "utf8");
  messages ??= await loadJson(MESSAGES_PATH);
  photos ??= await loadPhotos();
  events ??= await loadJson(EVENTS_PATH);
  checkSelection(plans);
  const words = planPageWords(messages);
  // SPEC-snacks-in-the-cart § 4.5: while snacks are carted, a page with no week (no snack list to cart) never offers Q4;
  // a page with a week leaves it to the card, which hides Q4 for days the week has no list for.
  const offer = plans.snacks.shown && !(plans.snacks.carted && picks === NO_PICKS);
  const slots = {
    ...messageSlots(messages),
    CAROUSEL: carouselHtml(photos, dev.ASSET_PREFIX ?? PROD_SLOTS.ASSET_PREFIX),
    TOTAL_UNIT: esc(words.total_unit),
    MEALS_UNIT: esc(words.meals_unit),
    PER_MEAL_UNIT: esc(words.per_meal_unit),
    FOOTNOTE: esc(fillPhrase(words.prices_as_of, { date: plans.read_on })),
    GOALS: plans.individual.map(goalButton).join("\n"),
    MEAL_QUESTIONS: mealQuestions(plans, words, offer),
    GRID_HEAD: gridHead(plans),
    GRID_ROWS: gridRows(plans),
    FAMILY: familySection(plans),
    READ_FROM_TEXT: esc(plans.read_from.replace(/^https?:\/\//, "")),
    READ_ON: esc(plans.read_on),
    DATA: scriptJson(clientData(plans, words, offer)),
    ANALYTICS: await analyticsSlot(events),
    SCRIPT: script.trim(),
    ...dev,
    ...picks,
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

/** Copy the fonts, the logo and (a relative `base`) the photo sheets next to the page. Only files the page may reference
 *  are copied. A sheet the manifest names that is not in `sheetsDir` (src/assets/photo-sheets/) refuses the build: a
 *  broken image never ships (to remove the photos, `base` is null). */
export async function copyStatic(outDir, photos = undefined, sheetsDir = PHOTO_SHEETS_DIR) {
  photos ??= await loadPhotos();
  const written = [];
  for (const { dir, match } of STATIC_DIRS) {
    await mkdir(join(outDir, dir), { recursive: true });
    for (const name of (await readdir(join(ROOT, "src", dir))).filter((n) => match.test(n)).sort()) {
      await copyFile(join(ROOT, "src", dir, name), join(outDir, dir, name));
      written.push(join(outDir, dir, name));
    }
  }
  for (const sheet of sheetsToCopy(photos)) {
    const from = join(sheetsDir, sheet.file);
    if (!existsSync(from)) throw new Error(`data/photo-sheets.json names ${sheet.file}, which is not in src/assets/photo-sheets/ (to remove the photos, set base to null)`);
    const to = join(outDir, photos.base, sheet.file);
    await mkdir(dirname(to), { recursive: true });
    await copyFile(from, to);
    written.push(to);
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
async function writeDevPages(plans, events, outDir, offersPath, messages, picks, photos) {
  const save = await loadJson(SAVE_PATH);
  const zips = await loadJson(ZIPS_PATH);
  const offers = await loadJson(offersPath);
  const siteKey = (await devConfig()).vars.TURNSTILE_SITE_KEY;
  const written = [];
  for (const [i, event] of events.entries()) {
    const dev = await devSlots(plans, { save, zips, siteKey, eventId: checkEventId(event.id), offers });
    const html = await renderPage(plans, dev, messages, picks, photos, events);
    await mkdir(join(outDir, event.id), { recursive: true });
    const paths = [join(outDir, event.id, "index.html"), ...(i === 0 ? [join(outDir, "index.html")] : [])];
    for (const path of paths) {
      await writeFile(path, html);
      written.push({ path, bytes: Buffer.byteLength(html) });
    }
  }
  return written;
}

/** The privacy notice's page (SPEC-save-offer-production § 9 item 1): written to <out>/privacy/index.html, served as /why/
 *  is; the development build always, the production build only with `production` true. */
export const PRIVACY_DIR = "privacy";
export const PRIVACY_STYLE_PATH = join(ROOT, "src", "privacy", "style.css");

/** consent/DRAFT.md § 6's paragraphs, as written: its blockquote, a paragraph starting at each line that opens with a bold
 *  heading ("> **Who we are.** …"), continuation lines joined by a space. */
export function privacyParagraphs(draftText) {
  const section = draftText.split(/^## 6\. .*$/m)[1]?.split(/^## /m)[0];
  if (!section) throw new Error("consent/DRAFT.md has no § 6, the privacy notice");
  const paragraphs = [];
  for (const line of section.split("\n").filter((l) => l.startsWith(">")).map((l) => l.replace(/^>\s?/, ""))) {
    if (line.startsWith("**") || !paragraphs.length) paragraphs.push(line);
    else paragraphs[paragraphs.length - 1] += ` ${line}`;
  }
  return paragraphs.map((p) => p.trim()).filter(Boolean);
}

/**
 * /privacy/: § 6's paragraphs (escaped; the draft's **bold** as <strong>), the logo and a heading, in the template's
 * colour tokens and fonts (its :root and @font-face rules, the fonts from the root as /why/'s), src/privacy/style.css,
 * no script. `draft`: the step's DRAFT marking (the development build's).
 */
export async function privacyPage({ draftText, save, draft }) {
  const template = await readFile(join(ROOT, "src", "template.html"), "utf8");
  const tokens = /:root\s*\{[^{}]*\}/.exec(template)[0];
  const faces = template.match(/^@font-face \{.*\}$/gm).map((face) => face.replace("{{ASSET_PREFIX}}", DEV_ASSET_PREFIX));
  const draftToken = /:root \{ --draft: #[0-9a-f]{6}; \}/.exec(await readFile(join(ROOT, "src", "save", "style.css"), "utf8"))[0];
  // The stylesheet's rules, without its comments (they are for maintainers).
  const style = (await readFile(PRIVACY_STYLE_PATH, "utf8")).replace(/\/\*[\s\S]*?\*\/\n?/g, "").trim();
  const paragraphs = privacyParagraphs(draftText).map((p) => `<p>${esc(p).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")}</p>`);
  const tag = draft ? `\n<p class="draft-tag">DRAFT — not for use · wording ${esc(save.wording_version)}</p>` : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fit AF — Privacy notice</title>
<style>
${[tokens, ...(draft ? [draftToken] : []), ...faces, style].join("\n")}
</style>
</head>
<body>
<main class="privacy">${tag}
<img class="logo" src="${DEV_ASSET_PREFIX}assets/fitaf-logo.png" alt="Fit AF" width="88" height="56">
<h1>Privacy notice</h1>
${paragraphs.join("\n")}
</main>
</body>
</html>
`;
}

/** Write /privacy/ beside the pages. */
async function writePrivacy(outDir, html) {
  const path = join(outDir, PRIVACY_DIR, "index.html");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, html);
  return { path, bytes: Buffer.byteLength(html) };
}

/** What a production page prints, as words: the markup's text without its scripts and styles, the ZIP slot's default
 *  (filled with the visitor's ZIP before it is shown) apart. */
export function printedText(html) {
  return html
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/g, " ")
    .replace(/<strong id="save-ooa-zip">\[ZIP\]<\/strong>/, "<strong></strong>")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

/** The emails as the Worker would render them from these inputs (every offer, every event; E1 ticked, as its every line
 *  shows): their text parts, the words the HTML shows too (SPEC-rung5 § 9, M18). */
function printedEmails({ offers, events, vars, save }) {
  const sample = { to: "nobody@example.com", code: "SAMPLE23", token: "SAMPLE-TOKEN", siteUrl: vars.SITE_URL ?? "" };
  const parts = offers.offers.flatMap((offer) => events.map((event) => ({ where: `E1 (${offer.id}, ${event.id})`, text: e1({ ...sample, offer, event }).text })));
  parts.push({ where: "E-X", text: ex({ ...sample, zip: "01602", unconfirmedDays: save.unconfirmed_expansion_days }).text });
  return parts;
}

/**
 * SPEC-save-offer-production § 3 item 2: the production page with `production` true, rendered in memory, and the refusal
 * of every input not yet approved (scripts/production-inputs.mjs), each named, before anything is written.
 */
async function productionPage({ plans, events, messages, card, photos, save, offersPath, zipsPath, draftText, productionVars }) {
  const offers = await loadJson(offersPath);
  const zips = await loadJson(zipsPath);
  const vars = productionVars ?? (await productionConfig()).vars ?? {};
  const inputs = { save, zips, siteKey: vars.TURNSTILE_SITE_KEY ?? "", eventId: checkEventId(events[0].id), offers };
  const html = await renderPage(plans, await productionSlots(plans, inputs), messages, card, photos, events);
  const privacy = await privacyPage({ draftText, save, draft: false });
  const printed = [
    { where: "the page", text: printedText(html) },
    { where: "the privacy page", text: printedText(privacy) },
    ...printedEmails({ offers, events, vars, save }),
  ];
  const refusals = productionRefusals({ save, offers, zips, draftText, vars, printed });
  if (refusals.length) throw new Error(`production build refused (data/save.json production is true):\n${refusals.map((r) => `- ${r}`).join("\n")}`);
  return { html, privacy };
}

/** The Chef's Choice card for the page (SPEC-chefs-choice; SPEC-week-content § 2.1): always carried, holding NO week
 *  (§ 7's ruling: the bucket is the only source of a served week). Its words are checked here, so a missing phrase
 *  refuses the build. */
async function cardSlots({ plans, messages }) {
  const zone = (await loadJson(SAVE_PATH)).send_time_zone;
  const { chefsChoice } = await import("./scripts/chefs-choice.mjs");
  return (await chefsChoice({ plans, messages, zone })).slots;
}

export async function build({
  plansPath = PLANS_PATH,
  eventsPath = EVENTS_PATH,
  offersPath = OFFERS_PATH,
  savePath = SAVE_PATH,
  zipsPath = ZIPS_PATH,
  draftPath = DRAFT_PATH,
  productionVars,
  messagesPath = MESSAGES_PATH,
  photosPath = PHOTOS_PATH,
  sheetsDir = PHOTO_SHEETS_DIR,
  target = "prod",
  outDir,
} = {}) {
  if (target !== "prod" && target !== "dev") throw new Error(`unknown build target: ${target}`);
  outDir ??= target === "dev" ? DIST_DEV : DIST;
  const plans = await loadJson(plansPath);
  // SPEC-meal-selection § 2: a broken meal selection stops the build here, before anything is written.
  checkSelection(plans);
  const events = await loadJson(eventsPath);
  const messages = await loadJson(messagesPath);
  const photos = await loadPhotos(photosPath);
  // Before anything is written: the card's words checked (a missing phrase stops the build here).
  const card = await cardSlots({ plans, messages });
  // SPEC-save-offer-production § 3: with `production` false the production page is the one before it, byte for byte (S20);
  // true, it carries Flow 1, and the build refuses here, writing nothing, until every input is approved.
  const save = await loadJson(savePath);
  const draftText = await readFile(draftPath, "utf8");
  const prod =
    target !== "prod"
      ? null
      : save.production === true
        ? await productionPage({ plans, events, messages, card, photos, save, offersPath, zipsPath, draftText, productionVars })
        : { html: await renderPage(plans, PROD_SLOTS, messages, card, photos, events), privacy: null };
  // The dev directory is wholly this build's output, so it starts empty (nothing stale gets deployed).
  if (target === "dev") await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  let pages;
  if (target === "dev") {
    pages = await writeDevPages(plans, events, outDir, offersPath, messages, card, photos);
  } else {
    const path = join(outDir, "index.html");
    await writeFile(path, prod.html);
    pages = [{ path, bytes: Buffer.byteLength(prod.html) }];
  }
  const files = await copyStatic(outDir, photos, sheetsDir);
  // § 9 item 1: /privacy/, a static page beside the plan pages (as /why/): the development build always, marked as the
  // step is; the production build only with `production` true.
  const privacy = target === "dev" ? await privacyPage({ draftText, save, draft: true }) : prod.privacy;
  if (privacy) files.push((await writePrivacy(outDir, privacy)).path);
  // QR codes point at the production URL, so only the production build writes them.
  const qr = target === "prod" ? await writeQrCodes(events, outDir) : [];
  return { indexPath: pages[0].path, bytes: pages[0].bytes, pages, files, qr };
}

/** What `node build.mjs` prints: every file written. */
function report(out) {
  for (const p of out.pages) console.log(`wrote ${p.path} (${p.bytes} bytes)`);
  for (const f of [...out.files, ...out.qr]) console.log(`wrote ${f}`);
}

// Run as a program. NOT a top-level await: scripts/chefs-choice.mjs (imported by build() for the card's slots)
// imports this module, which must have finished evaluating first, or the two wait on each other and Node exits.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const flag = (name) => {
    const at = process.argv.indexOf(name);
    return at === -1 ? undefined : process.argv[at + 1];
  };
  build({ target: flag("--env") ?? "prod", outDir: flag("--out") }).then(report, (err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
