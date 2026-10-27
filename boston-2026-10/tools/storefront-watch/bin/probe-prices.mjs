// `npm run probe-prices -- [--width 1280|390 ...] [--mpid 21] [--script <file>] [--out <dir>] [--origin <local fixture>]`
// (SPEC-rung2-progress-and-checkout § 36 item 7)
// The probe of the store's prices, on the live store, in a headless browser: at each width, one run in a fresh profile
// (lib/probe-prices.mjs): the landing query (`?fitaf_probe=1`, never a UTM) on the front page and the meal plans page,
// every price element there, on /order?mpid=N, in its cart summary after the store's own Add to Cart presses of the
// plan's count, and on /checkout after the store's own CHECKOUT. The block's mark (sessionStorage fitaf_struck) is set by
// the run's init script. Nothing is typed; nothing is pressed on /checkout.
//   --out <dir>      where each run's JSON goes (default: boston-2026-10/storefront/probe-prices/<the date in Boston>/; a
//                    relative one is from where the command was typed, not the package)
//   --script <file>  § 36's rehearsal: a build pasted into every document the probe visits, as `smoke --script` pastes
//                    it (any block of ours on the page held off): a console file, a Footer block .html (its <script>
//                    tags taken off), or a storefront/footer-block/*.md file (the text between its fences, refused
//                    unless it hashes to the file's fragment_sha256). Each read then records every struck figure, its
//                    price, item 3's figure (data/offers.json's share on today's date in New York) and the boxes
//   --origin <url>   a local synthetic store (http://127.0.0.1:<port> or localhost), to test the probe itself; no other
//                    origin than the store is accepted
// Exit 0 when every run was made as asked, 1 if a run could not be (its file says why), 2 if the probe itself failed or
// was misused.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { SITE_DIR, STORE_ORIGIN, WIDTHS } from "../lib/config.mjs";
import { probePricesRun, scriptOfFile } from "../lib/probe-prices.mjs";
import { siteCode } from "../lib/site-code.mjs";
import { newYorkDate, offerOn } from "../lib/struck.mjs";

const LOCAL = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/;
/** Lean, 7 meals a week: the smoke's plan (SPEC-storefront-watch § 4). */
const DEFAULT_MPID = 21;
const REPO_DIR = resolve(SITE_DIR, "..");
const WHERE = process.env.INIT_CWD ?? process.cwd();

const bostonDate = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
const fromRepo = (p) => {
  const r = relative(REPO_DIR, p);
  return r.startsWith("..") || isAbsolute(r) ? p : r;
};
function commandOf(argv, out) {
  const args = argv.map((a, i) => (argv[i - 1] === "--out" ? fromRepo(out) : a.startsWith("--out=") ? `--out=${fromRepo(out)}` : a));
  return `npm --prefix boston-2026-10/tools/storefront-watch run probe-prices -- ${args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(" ")}`.trim();
}

async function main() {
  const { values } = parseArgs({ options: { width: { type: "string", multiple: true }, mpid: { type: "string" }, script: { type: "string" }, out: { type: "string" }, origin: { type: "string" } } });
  const origin = values.origin ?? STORE_ORIGIN;
  if (origin !== STORE_ORIGIN && !LOCAL.test(origin)) throw new Error(`--origin must be the store or a local fixture (http://127.0.0.1:<port>), got ${origin}`);
  const widths = values.width ? values.width.map(Number) : WIDTHS;
  for (const w of widths) if (!WIDTHS.includes(w)) throw new Error(`--width must be one of ${WIDTHS.join(", ")}, got ${w}`);
  const mpid = Number(values.mpid ?? DEFAULT_MPID);
  const need = (await siteCode()).planCounts.get(mpid);
  if (!need) throw new Error(`--mpid ${values.mpid} is not a plan in data/plans.json`);
  const out = values.out ? resolve(WHERE, values.out) : join(SITE_DIR, "storefront", "probe-prices", bostonDate());
  await mkdir(out, { recursive: true });
  const command = commandOf(process.argv.slice(2), out);
  const scriptPath = values.script ? resolve(WHERE, values.script) : null;
  const script = scriptPath ? scriptOfFile(await readFile(scriptPath, "utf8")) : null;
  const scriptLabel = script ? `${fromRepo(scriptPath)} (${/fitaf-handoff \S+ sha256:[0-9a-f]{64}/.exec(script)?.[0] ?? "no version line"})` : null;
  const date = newYorkDate();
  const share = offerOn(date);
  let failed = 0;
  for (const width of widths) {
    const record = await probePricesRun({ origin, width, mpid, need, script, scriptLabel, share });
    record.date = date;
    const stamp = record.at.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    record.file = `run-${stamp}-${width}.json`;
    record.command = command;
    await writeFile(join(out, record.file), `${JSON.stringify(record, null, 2)}\n`);
    const counts = Object.entries(record.reads).map(([k, r]) => `${k} ${r.prices.length}`).join(", ");
    process.stdout.write(`${width}: price elements read: ${counts || "none"}${record.error ? `; ERROR ${record.error}` : ""} → ${record.file}\n`);
    if (script) {
      for (const [k, r] of Object.entries(record.reads)) {
        const w = r.struck ?? [];
        const bad = w.filter((x) => !x.equal).length;
        const over = w.filter((x) => x.overlaps.length).length;
        process.stdout.write(`  ${k}: ${w.length} struck (${w.filter((x) => x.displayed).length} displayed), ${bad} not item 3's figure, ${over} overlapping a control${w.length ? `: ${w.slice(0, 4).map((x) => `${x.text} before ${x.price?.text}`).join(", ")}` : ""}\n`);
      }
    }
    if (record.error) failed++;
  }
  return failed ? 1 : 0;
}

main().then(
  (code) => process.stdout.write("", () => process.exit(code)),
  (err) => {
    console.error(`storefront-watch probe-prices: ${err.stack ?? err}`);
    process.exit(2);
  },
);
