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
import { fileURLToPath } from "node:url";
import { loadJson, orderUrl, PLANS_PATH } from "../build.mjs";
import { mealKey } from "../src/storefront/meal-key.js";
import { countTable } from "./build-storefront.mjs";

export { mealKey };
export const PAYLOAD_VERSION = 2;
export const MAX_QTY = 21;
/** § 11 item 1: the offer code (checked by the script, not applied). */
const CODE_RE = /^[A-Za-z0-9-]{1,40}$/;
const WHOLE_NUMBER_RE = /^\d+$/;
/** A name as the page shows it and as the script reads a card's title: whitespace collapsed and trimmed. */
const asShown = (name) => name.replace(/\s+/g, " ").trim();

/** One meal of the payload: `<key>`, or `<key>*<n>` above 1. */
const token = (it) => (it.qty === 1 ? it.key : `${it.key}*${it.qty}`);

/** The text after `#fitaf=`: "2", each meal, then "~<code>" if there is one, dot-separated. */
export const encodePayload = (payload) =>
  [PAYLOAD_VERSION, ...payload.items.map(token), ...(payload.code === undefined ? [] : [`~${payload.code}`])].join(".");

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
 * Command-line arguments -> the payload `{ mpid, items: [{ name, key, qty }], code? }`. Throws on anything the shipped
 * script would refuse. `counts` maps each mpid in data/plans.json to its meals a week: the counts must add up to exactly
 * that (the full-plan rule, § 7).
 */
export function payloadFromArgs(argv, counts) {
  const flags = { "--mpid": [], "--item": [], "--code": [] };
  for (let i = 0; i < argv.length; i += 2) {
    if (!(argv[i] in flags)) throw new Error(`unknown flag ${argv[i]}`);
    if (argv[i + 1] === undefined) throw new Error(`${argv[i]} needs a value`);
    flags[argv[i]].push(argv[i + 1]);
  }
  if (flags["--mpid"].length !== 1) throw new Error("give exactly one --mpid");
  const mpid = wholeNumber(flags["--mpid"][0], "--mpid", 1, Number.MAX_SAFE_INTEGER);
  if (!counts.has(mpid)) throw new Error(`mpid ${mpid} is not in data/plans.json`);
  if (!flags["--item"].length) throw new Error('give at least one --item "NAME:QTY"');
  const items = flags["--item"].map((arg) => {
    const [given, qty] = splitLast(arg, ":", `--item wants "NAME:QTY", got ${JSON.stringify(arg)}`);
    const name = asShown(given);
    if (!name) throw new Error(`--item ${JSON.stringify(arg)} has an empty meal name`);
    return { name, key: mealKey(name), qty: wholeNumber(qty, `qty for ${name}`, 1, MAX_QTY) };
  });
  checkDistinct(items);
  // The same rule and message as the shipped script: the store will not check out short of the plan.
  const need = counts.get(mpid);
  const total = items.reduce((sum, it) => sum + it.qty, 0);
  if (total !== need) throw new Error(`the plan needs ${need} meals; the link has ${total}`);
  const payload = { mpid, items };
  if (flags["--code"].length) {
    const [code] = flags["--code"];
    if (!CODE_RE.test(code)) throw new Error(`--code must match ${CODE_RE}`);
    payload.code = code;
  }
  return payload;
}

export const handoffLink = (plans, payload) => `${orderUrl(plans, payload.mpid)}#fitaf=${encodePayload(payload)}`;

/** § 11 item 6: under the link, each token it carries beside what it stands for, in the link's order. */
export function legend(payload) {
  const rows = payload.items.map((it) => [token(it), it.name]);
  if (payload.code !== undefined) rows.push([`~${payload.code}`, "the offer code (checked, not applied)"]);
  const width = Math.max(...rows.map(([t]) => t.length));
  return rows.map(([t, what]) => `  ${t.padEnd(width)}  ${what}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const plans = await loadJson(PLANS_PATH);
    const counts = new Map(Object.entries(countTable(plans)).map(([mpid, n]) => [Number(mpid), n]));
    const payload = payloadFromArgs(process.argv.slice(2), counts);
    console.log([handoffLink(plans, payload), ...legend(payload)].join("\n"));
  } catch (err) {
    console.error(`handoff:link: ${err.message}`);
    process.exitCode = 1;
  }
}
