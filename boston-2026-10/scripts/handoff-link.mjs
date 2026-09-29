// `npm run handoff:link -- --mpid 21 --item "Birria de Res Bowl:2" [--item …] [--pid-for "Birria de Res Bowl=1353"]
// [--code CODE]` prints a test link for the storefront hand-off (SPEC-rung2 § 6, payload version 1):
//   https://fitafnutrition.com/order?mpid=21#fitaf=<base64url of the JSON payload>
// A product id (--pid-for) is needed by fill A only; fill B finds a meal by its name as the page shows it.
// The tool refuses what the shipped script would refuse, so it never prints a link that silently does nothing.
import { fileURLToPath } from "node:url";
import { loadJson, orderUrl, PLANS_PATH } from "../build.mjs";

export const PAYLOAD_VERSION = 1;
export const MAX_QTY = 21;
/** The shipped script refuses a payload (the text after `#fitaf=`) longer than this. */
export const MAX_PAYLOAD_CHARS = 2048;
const CODE_RE = /^[A-Za-z0-9_-]{1,40}$/;
const WHOLE_NUMBER_RE = /^\d+$/;

export const encodePayload = (payload) => Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

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

/** Command-line arguments -> the payload. Throws on anything the shipped script would refuse. */
export function payloadFromArgs(argv, mpids) {
  const flags = { "--mpid": [], "--item": [], "--pid-for": [], "--code": [] };
  for (let i = 0; i < argv.length; i += 2) {
    if (!(argv[i] in flags)) throw new Error(`unknown flag ${argv[i]}`);
    if (argv[i + 1] === undefined) throw new Error(`${argv[i]} needs a value`);
    flags[argv[i]].push(argv[i + 1]);
  }
  if (flags["--mpid"].length !== 1) throw new Error("give exactly one --mpid");
  const mpid = wholeNumber(flags["--mpid"][0], "--mpid", 1, Number.MAX_SAFE_INTEGER);
  if (!mpids.has(mpid)) throw new Error(`mpid ${mpid} is not in data/plans.json`);
  if (!flags["--item"].length) throw new Error('give at least one --item "NAME:QTY"');
  const items = flags["--item"].map((arg) => {
    const [name, qty] = splitLast(arg, ":", `--item wants "NAME:QTY", got ${JSON.stringify(arg)}`);
    return { name, qty: wholeNumber(qty, `qty for ${name}`, 1, MAX_QTY) };
  });
  const names = items.map((it) => it.name);
  if (new Set(names).size !== names.length) throw new Error("a meal is named twice; give its count once");
  for (const arg of flags["--pid-for"]) {
    const [name, pid] = splitLast(arg, "=", `--pid-for wants "NAME=PRODUCT_ID", got ${JSON.stringify(arg)}`);
    const it = items.find((x) => x.name === name);
    if (!it) throw new Error(`--pid-for names ${JSON.stringify(name)}, which no --item names`);
    it.pid = wholeNumber(pid, `product id for ${name}`, 1, Number.MAX_SAFE_INTEGER);
  }
  const payload = { v: PAYLOAD_VERSION, mpid, items };
  if (flags["--code"].length) {
    const [code] = flags["--code"];
    if (!CODE_RE.test(code)) throw new Error(`--code must match ${CODE_RE}`);
    payload.code = code;
  }
  const chars = encodePayload(payload).length;
  if (chars > MAX_PAYLOAD_CHARS) throw new Error(`payload is ${chars} characters; the script refuses over ${MAX_PAYLOAD_CHARS}`);
  return payload;
}

export const handoffLink = (plans, payload) => `${orderUrl(plans, payload.mpid)}#fitaf=${encodePayload(payload)}`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const plans = await loadJson(PLANS_PATH);
    const mpids = new Set([...plans.individual, plans.family].flatMap((plan) => plan.counts.map((c) => c.mpid)));
    const payload = payloadFromArgs(process.argv.slice(2), mpids);
    console.log(handoffLink(plans, payload));
    if (payload.items.some((it) => it.pid === undefined)) {
      console.error("handoff:link: note: an item has no --pid-for, so fill A will refuse this link (B does not need it)");
    }
  } catch (err) {
    console.error(`handoff:link: ${err.message}`);
    process.exitCode = 1;
  }
}
