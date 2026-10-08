// `npm run probe-snacks -- [--width 1280|390 ...] [--runs 2] [--mpid 23] [--snack <title>] [--choices <title>]
//   [--direct <title>] [--shots first|all|none] [--out <dir>] [--origin <local fixture>]`   (SPEC-snacks-in-the-cart § 1)
// The probe of a snack in the store's cart, on the live store, in a headless browser (lib/probe-snacks.mjs): at each
// width, `--runs` runs, each a fresh profile on /order?mpid=N with NO fragment: a snack's Select Options, Add to Cart and
// "+" after the plan's meals, an addition's Add to Cart directly, the store's own CHECKOUT, and /checkout read (its
// snack line, the line's group and header, and which elements each of the block's hide rules H1-H17 would match). The
// runs are interleaved (every width, then the next round), as probe-counts' are. Nothing is typed, no size is chosen,
// nothing is pressed on /checkout, PAY is never pressed; the profile is discarded.
//   --snack <title>   the snack pressed (its card's title as the page shows it); default: the first snack card showing
//                     Select Options whose Size the catalog marks required
//   --choices <title> the snack whose Size dropdown is opened and closed to read its choices (never added); default: the
//                     first other snack showing Select Options whose Size is not required, else the next one
//   --direct <title>  the addition pressed once by its Add to Cart; default: a snack showing Add to Cart directly, else
//                     the first addition that does
//   --shots <which>   first (default: pictures in the first run at each width), all, or none; each picture is of one
//                     element (at 390 the cart bar is the viewport clipped to the bar's box), the extras dialog a JPEG
//   --out <dir>       where each run's JSON and screenshots go (default: boston-2026-10/storefront/probe-snacks/<the date
//                     in Boston>/; a relative one is from where the command was typed, not the package)
//   --origin <url>    a local synthetic store (http://127.0.0.1:<port> or localhost); no other origin than the store
// Exit 0 when every run was made as asked (whatever the store did), 1 if a run could not be (its file says why), 2 if the
// probe itself failed or was misused.
import { mkdir, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { SITE_DIR, STORE_ORIGIN, WIDTHS } from "../lib/config.mjs";
import { probeSnacksRun } from "../lib/probe-snacks.mjs";
import { siteCode } from "../lib/site-code.mjs";

const LOCAL = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/;
/** Lean, 14 meals a week (data/plans.json): the 14-meal individual plan § 1 names, as probe-counts'. */
const DEFAULT_MPID = 23;
/** --shots: pictures in the first run at each width (the default), in every run, or in none. */
const SHOTS = ["first", "all", "none"];

/** The repository's root, so a run's command names its --out as from there: the files are public, a home path is not. */
const REPO_DIR = resolve(SITE_DIR, "..");
/** npm runs this with the package as its directory; a relative --out means where the command was typed (INIT_CWD). */
const WHERE = process.env.INIT_CWD ?? process.cwd();

const bostonDate = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
const fromRepo = (p) => {
  const r = relative(REPO_DIR, p);
  return r.startsWith("..") || isAbsolute(r) ? p : r;
};
function commandOf(argv, out) {
  const args = argv.map((a, i) => (argv[i - 1] === "--out" ? fromRepo(out) : a.startsWith("--out=") ? `--out=${fromRepo(out)}` : a));
  return `npm --prefix boston-2026-10/tools/storefront-watch run probe-snacks -- ${args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(" ")}`.trim();
}
const count = (v, name) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new Error(`${name} must be a whole number above 0, got ${v}`);
  return n;
};

/** One line per run: what the store showed at each step, from the run's own record. */
function line(r) {
  const step = (name) => r.steps.find((s) => s.step === name);
  const plan = (s) => (s ? `${s.plan.itemsCount?.text ?? "—"} / bar ${s.plan.phoneStats.find((x) => x.label === "Items")?.value ?? "—"} / plan() ${s.plan.blockPlan}` : "—");
  const add = step("snack Add to Cart");
  const plus = step('snack "+"');
  return [
    `snack "${r.chosen.snack ?? "—"}"`,
    `meals ${plan(step("meals"))}`,
    `1 unit: card ${add?.after.block.count ?? "—"}, ${plan(add)}`,
    `2 units: card ${plus?.after.block.count ?? "—"}, ${plan(plus)}`,
    `survey ${step("survey")?.cards.length ?? "—"} cards, unchosen Size: ${
      r.steps.filter((s) => s.step === "unchosen Add to Cart").map((s) => `"${s.title}" ${s.counted ? "COUNTED" : "not counted"}`).join(", ") || "none"
    }`,
    `extras ${r.extras?.opened ? "opened" : "not opened"}`,
    `checkout lines ${r.checkout?.lines.length ?? "—"}, snack line ${r.checkout?.snack ? "found" : "not found"}`,
    r.error ? `ERROR ${r.error}` : null,
  ].filter(Boolean).join("; ");
}

async function main() {
  const { values } = parseArgs({
    options: {
      width: { type: "string", multiple: true },
      runs: { type: "string" },
      mpid: { type: "string" },
      snack: { type: "string" },
      choices: { type: "string" },
      direct: { type: "string" },
      shots: { type: "string" },
      out: { type: "string" },
      origin: { type: "string" },
    },
  });
  const origin = values.origin ?? STORE_ORIGIN;
  if (origin !== STORE_ORIGIN && !LOCAL.test(origin)) throw new Error(`--origin must be the store or a local fixture (http://127.0.0.1:<port>), got ${origin}`);
  const widths = values.width ? values.width.map(Number) : WIDTHS;
  for (const w of widths) if (!WIDTHS.includes(w)) throw new Error(`--width must be one of ${WIDTHS.join(", ")}, got ${w}`);
  const runs = count(values.runs ?? 2, "--runs");
  const shots = values.shots ?? "first";
  if (!SHOTS.includes(shots)) throw new Error(`--shots must be one of ${SHOTS.join(", ")}, got ${shots}`);
  const mpid = count(values.mpid ?? DEFAULT_MPID, "--mpid");
  const code = await siteCode();
  const need = code.counts.get(mpid);
  if (!need) throw new Error(`--mpid ${mpid} is not a plan in data/plans.json`);
  const out = values.out ? resolve(WHERE, values.out) : join(SITE_DIR, "storefront", "probe-snacks", bostonDate());
  await mkdir(out, { recursive: true });
  const command = commandOf(process.argv.slice(2), out);

  const jobs = [];
  for (let round = 0; round < runs; round++) for (const width of widths) jobs.push({ width, shots: shots === "all" || (shots === "first" && round === 0) });
  let failed = 0;
  for (const [n, job] of jobs.entries()) {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    const record = await probeSnacksRun({ origin, mpid, need, snack: values.snack, choicesSnack: values.choices, direct: values.direct, shotsDir: out, stamp, ...job });
    record.file = `run-${stamp}-${job.width}.json`;
    record.command = command;
    await writeFile(join(out, record.file), `${JSON.stringify(record, null, 2)}\n`);
    process.stdout.write(`${n + 1}/${jobs.length} ${job.width}: ${line(record)} → ${record.file}\n`);
    if (record.error) failed++;
  }
  return failed ? 1 : 0;
}

main().then(
  (code) => process.stdout.write("", () => process.exit(code)),
  (err) => {
    console.error(`storefront-watch probe-snacks: ${err.stack ?? err}`);
    process.exit(2);
  },
);
