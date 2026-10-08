// `npm run handoff:link -- --mpid 21 --item "Birria de Res Bowl:2" [--item …] [--code CODE]` prints a test link for the
// storefront hand-off, payload version 2 (SPEC-rung2 § 11), and then each meal's key beside its name, so a person can
// read the link (§ 11 item 6):
//   https://fitafnutrition.com/order?mpid=21#fitaf=2.t1fkl*2.eh97u*5
//     t1fkl*2  Birria de Res Bowl
//     eh97u*5  Chicken Pesto Pasta
// Each meal is its KEY (src/storefront/meal-key.js, the one function the shipped script also carries) and, above 1, its
// count; the plan's id is the link's own ?mpid=, which the script reads from the page. Version 1 (base64 JSON, with an
// optional product id per meal for fill A) is retired: § 11, "no link has been published".
// The tool refuses what the shipped script would refuse, so it never prints a link that silently does nothing.
// SPEC-rung2-progress-and-checkout § 17.1: with `--photos <delivery Sunday>` (and `--host <code>`, 0 by default), the link
// also carries what the progress screen needs to show each meal's cell of that week's photo sheet, read here from
// data/photo-sheets.json (no cell geometry is a literal in this tool or the block). After the meal part, "!"-separated:
// the host's CODE (its index in PHOTO_HOSTS, the fixed list the block carries: never a URL from the link), the sheet's
// path on that host ("/", then the manifest's base and file), the sheet's width in base 36, then one cell per meal in the link's
// order, "x,y,w,h" in base 36, or empty for a meal with no cell. A week whose sheet has no cell for any of its meals, or
// a manifest whose base is null or absolute (a host not on the list), gives the link of today, with no photo part.
//   https://fitafnutrition.com/order?mpid=21#fitaf=2.t1fkl*2.eh97u*5!0!/assets/photo-sheets/x.jpg!5s!g,g,4w,4w!g,68,4w,4w
// SPEC-snacks-in-the-cart § 2: `--snack "NAME:QTY"` (repeatable) adds a SNACK item, the meal grammar with a leading "_"
// (`_<key>`, `_<key>*<n>`), written after every meal and before `~<code>`; a snack is never in the plan's count (the
// full-plan rule reads the meals only), and a name or key given twice is refused across meals and snacks alike, as the
// block refuses it. The photo part's cells stay the meals' (a snack has none). With no --snack, the link is as before.
//   https://fitafnutrition.com/order?mpid=21#fitaf=2.t1fkl*2.eh97u*5._a1b2c*2
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadJson, orderUrl, PHOTOS_PATH, PLANS_PATH } from "../build.mjs";
import { mealKey } from "../src/storefront/meal-key.js";
import { PHOTO_HOSTS } from "../src/storefront/photo-hosts.js";
import { countTable } from "./build-storefront.mjs";

export { mealKey, PHOTO_HOSTS };
export const PAYLOAD_VERSION = 2;
export const MAX_QTY = 21;
/** A manifest base the block can request: relative (on a listed host), never a URL of its own. */
const RELATIVE_PATH_RE = /^[\w/.-]+$/;
const BASE_36 = 36;
/** § 11 item 1: the offer code (checked by the script, not applied). */
const CODE_RE = /^[A-Za-z0-9-]{1,40}$/;
const WHOLE_NUMBER_RE = /^\d+$/;
/** A name as the page shows it and as the script reads a card's title: whitespace collapsed and trimmed. Exported for
 *  the plan page's build, which shows a meal's `display` this way (SPEC-chefs-choice § 7.1). */
export const asShown = (name) => name.replace(/\s+/g, " ").trim();

/** One meal of the payload: `<key>`, or `<key>*<n>` above 1. */
const token = (it) => (it.qty === 1 ? it.key : `${it.key}*${it.qty}`);

/** § 17.1: the photo part, "!"-separated: the host's code, the sheet's path, its width, then each meal's cell or "". */
const photoText = (photos) => {
  const cell = (c) => (c ? [c.x, c.y, c.w, c.h].map((n) => n.toString(BASE_36)).join(",") : "");
  return ["", photos.host, photos.path, photos.width.toString(BASE_36), ...photos.cells.map(cell)].join("!");
};

/** SPEC-snacks-in-the-cart § 2: a snack's item, the meal's with a leading "_". */
export const SNACK_MARK = "_";
const snackToken = (it) => SNACK_MARK + token(it);

/** The meal part: "2", each meal, each snack (§ 2), then "~<code>" if there is one, dot-separated. */
const mealPart = (payload) =>
  [
    PAYLOAD_VERSION,
    ...payload.items.map(token),
    ...(payload.snacks ?? []).map(snackToken),
    ...(payload.code === undefined ? [] : [`~${payload.code}`]),
  ].join(".");

/** The text after `#fitaf=`: the meal part, then the photo part (§ 17.1), if there is one. */
export const encodePayload = (payload) => mealPart(payload) + (payload.photos ? photoText(payload.photos) : "");

/**
 * § 17.1: what the link carries of the week `delivery`'s sheet in the manifest `photos`, for `items` on host `code`:
 * { host, path, width, cells } (each cell { x, y, w, h } from the manifest, keyed by the meal's name as the picks name
 * it, or null), or null when there is nothing to carry (no such sheet, a base that is null or not a relative path, or
 * no cell for any meal). The cells are the manifest's own numbers; none is written here.
 */
export function photoPart(photos, delivery, items, code) {
  const sheet = photos?.chefs_choice?.[delivery];
  if (!sheet || typeof photos.base !== "string" || !RELATIVE_PATH_RE.test(photos.base + sheet.file)) return null;
  const cells = items.map((it) => sheet.cells?.[it.name] ?? null);
  if (!cells.some(Boolean)) return null;
  return { host: code, path: `/${photos.base}${sheet.file}`, width: sheet.width, cells };
}

/** "a:b:c" split at its LAST separator, so a meal name may itself contain one. */
function splitLast(value, sep, usage) {
  const at = value.lastIndexOf(sep);
  if (at <= 0) throw new Error(usage);
  return [value.slice(0, at), value.slice(at + 1)];
}

function wholeNumber(text, what, min, max) {
  const n = Number(text);
  if (!WHOLE_NUMBER_RE.test(text) || n < min || n > max) throw new Error(`${what} must be ${min}..${max}, got ${text}`);
  return n;
}

/** Refuse a meal named twice, and two names the script could not tell apart (§ 11 item 3: their keys are equal). */
function checkDistinct(items) {
  const byKey = new Map();
  for (const it of items) {
    const other = byKey.get(it.key);
    if (other && other.name === it.name) throw new Error(`${JSON.stringify(it.name)} is named twice; give its count once`);
    if (other) throw new Error(`${JSON.stringify(other.name)} and ${JSON.stringify(it.name)} share a key: ${it.key}; the script would refuse the link`);
    byKey.set(it.key, it);
  }
}

/**
 * `--item "NAME:QTY"` values -> the meals `[{ name, key, qty }]`: each name as shown and keyed, its count 1..MAX_QTY, none
 * named twice and no two sharing a key. The item rules of payloadFromArgs, alone: the plan page's build checks a week's
 * snack list by them (SPEC-meal-selection § 5: "the same item checks … no mpid"). `flag` names the flag in a refusal
 * (`--snack` for SPEC-snacks-in-the-cart § 2's snacks; the rules and the words are otherwise the same).
 */
export function itemsFromArgs(itemArgs, flag = "--item") {
  const items = itemArgs.map((arg) => {
    const [given, qty] = splitLast(arg, ":", `${flag} wants "NAME:QTY", got ${JSON.stringify(arg)}`);
    const name = asShown(given);
    if (!name) throw new Error(`${flag} ${JSON.stringify(arg)} has an empty ${flag === "--snack" ? "snack" : "meal"} name`);
    return { name, key: mealKey(name), qty: wholeNumber(qty, `qty for ${name}`, 1, MAX_QTY) };
  });
  checkDistinct(items);
  return items;
}

/**
 * Command-line arguments -> the payload `{ mpid, items: [{ name, key, qty }], snacks?: [{ name, key, qty }], code? }`.
 * Throws on anything the shipped script would refuse. `counts` maps each mpid in data/plans.json to its meals a week:
 * the MEALS' counts must add up to exactly that (the full-plan rule, § 7); snacks (`--snack`, SPEC-snacks-in-the-cart
 * § 2) are beside the plan, and `snacks` is present only when one is given, so a link without one is as before.
 */
export function payloadFromArgs(argv, counts, photos = null) {
  const flags = { "--mpid": [], "--item": [], "--snack": [], "--code": [], "--photos": [], "--host": [] };
  for (let i = 0; i < argv.length; i += 2) {
    if (!(argv[i] in flags)) throw new Error(`unknown flag ${argv[i]}`);
    if (argv[i + 1] === undefined) throw new Error(`${argv[i]} needs a value`);
    flags[argv[i]].push(argv[i + 1]);
  }
  if (flags["--mpid"].length !== 1) throw new Error("give exactly one --mpid");
  const mpid = wholeNumber(flags["--mpid"][0], "--mpid", 1, Number.MAX_SAFE_INTEGER);
  if (!counts.has(mpid)) throw new Error(`mpid ${mpid} is not in data/plans.json`);
  if (!flags["--item"].length) throw new Error('give at least one --item "NAME:QTY"');
  const items = itemsFromArgs(flags["--item"]);
  const snacks = itemsFromArgs(flags["--snack"], "--snack");
  // § 2: a name or a key given twice is refused across meals and snacks alike, as the block refuses it.
  checkDistinct([...items, ...snacks]);
  // The same rule and message as the shipped script: the store will not check out short of the plan.
  const need = counts.get(mpid);
  const total = items.reduce((sum, it) => sum + it.qty, 0);
  if (total !== need) throw new Error(`the plan needs ${need} meals; the link has ${total}`);
  const payload = { mpid, items, ...(snacks.length ? { snacks } : {}) };
  if (flags["--code"].length) {
    const [code] = flags["--code"];
    if (!CODE_RE.test(code)) throw new Error(`--code must match ${CODE_RE}`);
    payload.code = code;
  }
  // § 17.1: the week's photo sheet, from the manifest `photos` (data/photo-sheets.json when run as a program).
  if (flags["--host"].length && !flags["--photos"].length) throw new Error("--host needs --photos");
  if (flags["--photos"].length) {
    const [delivery] = flags["--photos"];
    if (!photos?.chefs_choice?.[delivery]) throw new Error(`--photos ${delivery}: no such week's sheet in data/photo-sheets.json`);
    const code = wholeNumber(flags["--host"][0] ?? "0", "--host", 0, PHOTO_HOSTS.length - 1);
    const part = photoPart(photos, delivery, items, code);
    if (part) payload.photos = part;
  }
  return payload;
}

export const handoffLink = (plans, payload) => `${orderUrl(plans, payload.mpid)}#fitaf=${encodePayload(payload)}`;

/** § 11 item 6: under the link, each token it carries beside what it stands for, in the link's order. */
export function legend(payload) {
  const rows = [...payload.items.map((it) => [token(it), it.name]), ...(payload.snacks ?? []).map((it) => [snackToken(it), `${it.name} (a snack)`])];
  if (payload.code !== undefined) rows.push([`~${payload.code}`, "the offer code (checked, not applied)"]);
  if (payload.photos) rows.push([`!${payload.photos.host}`, `each meal's cell of ${PHOTO_HOSTS[payload.photos.host]}${payload.photos.path}`]);
  const width = Math.max(...rows.map(([t]) => t.length));
  return rows.map(([t, what]) => `  ${t.padEnd(width)}  ${what}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const plans = await loadJson(PLANS_PATH);
    const counts = new Map(Object.entries(countTable(plans)).map(([mpid, n]) => [Number(mpid), n]));
    const photos = existsSync(PHOTOS_PATH) ? await loadJson(PHOTOS_PATH) : null;
    const payload = payloadFromArgs(process.argv.slice(2), counts, photos);
    console.log([handoffLink(plans, payload), ...legend(payload)].join("\n"));
  } catch (err) {
    console.error(`handoff:link: ${err.message}`);
    process.exitCode = 1;
  }
}
