// `npm run probe-counts -- [--width 1280|390 ...] [--mpid 23] [--ack-runs 4] [--gap-runs 1] [--nowait-runs 1]
//   [--gap-ms 200] [--out <dir>] [--origin <local fixture>]`   (SPEC-rung2-fill-c § 2)
// The probe of the store's count, on the live store, in a headless browser: at each width, `--ack-runs` runs pressing
// the next meal once the last is counted, `--gap-runs` with `--gap-ms` between presses, `--nowait-runs` with none; each
// a fresh profile on /order?mpid=N with NO fragment, pressing only each chosen meal's Add to Cart (lib/probe-counts.mjs).
// The runs are interleaved (a round of every width and spacing, then the next), so a store release or a slow minute
// falls on all of them alike.
//   --out <dir>      where each run's JSON and summary.md go (default: boston-2026-10/storefront/probe-counts/<the date in
//                    Boston>/; a relative one is from where the command was typed, not the package); the summary covers
//                    EVERY run-*.json in it, earlier batches included, and lists the command each run recorded
//   --origin <url>   a local synthetic store (http://127.0.0.1:<port> or localhost), to test the probe itself; no other
//                    origin than the store is accepted
// Exit 0 when every run was made as asked (whatever the store did), 1 if a run could not be (its file says why), 2 if the
// probe itself failed or was misused.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { SITE_DIR, STORE_ORIGIN, WIDTHS } from "../lib/config.mjs";
import { GAP_MS, probeRun } from "../lib/probe-counts.mjs";
import { renderSummary } from "../lib/probe-summary.mjs";
import { siteCode } from "../lib/site-code.mjs";

const LOCAL = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/;
/** Lean, 14 meals a week: the largest plan (SPEC-rung2-fill-c § 4 item 3). */
const DEFAULT_MPID = 23;

/** The repository's root, so a run's command names its --out as from there: the files are public, a home path is not. */
const REPO_DIR = resolve(SITE_DIR, "..");
/** npm runs this with the package as its directory; a relative --out means where the command was typed (INIT_CWD). */
const WHERE = process.env.INIT_CWD ?? process.cwd();

const bostonDate = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
const fromRepo = (p) => {
  const r = relative(REPO_DIR, p);
  return r.startsWith("..") || isAbsolute(r) ? p : r;
};
/** The command as typed from the repository's root, --out made relative to it when it is inside it. */
function commandOf(argv, out) {
  const args = argv.map((a, i) => (argv[i - 1] === "--out" ? fromRepo(out) : a.startsWith("--out=") ? `--out=${fromRepo(out)}` : a));
  return `npm --prefix boston-2026-10/tools/storefront-watch run probe-counts -- ${args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(" ")}`.trim();
}
const count = (v, name) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new Error(`${name} must be a whole number, got ${v}`);
  return n;
};

async function main() {
  const { values } = parseArgs({
    options: {
      width: { type: "string", multiple: true },
      mpid: { type: "string" },
      "ack-runs": { type: "string" },
      "gap-runs": { type: "string" },
      "nowait-runs": { type: "string" },
      "gap-ms": { type: "string" },
      out: { type: "string" },
      origin: { type: "string" },
    },
  });
  const origin = values.origin ?? STORE_ORIGIN;
  if (origin !== STORE_ORIGIN && !LOCAL.test(origin)) throw new Error(`--origin must be the store or a local fixture (http://127.0.0.1:<port>), got ${origin}`);
  const widths = values.width ? values.width.map(Number) : WIDTHS;
  for (const w of widths) if (!WIDTHS.includes(w)) throw new Error(`--width must be one of ${WIDTHS.join(", ")}, got ${w}`);
  const mpid = count(values.mpid ?? DEFAULT_MPID, "--mpid");
  const runs = { ack: count(values["ack-runs"] ?? 4, "--ack-runs"), gap: count(values["gap-runs"] ?? 1, "--gap-runs"), nowait: count(values["nowait-runs"] ?? 1, "--nowait-runs") };
  const gapMs = count(values["gap-ms"] ?? GAP_MS, "--gap-ms");
  const code = await siteCode();
  const need = code.counts.get(mpid);
  if (!need) throw new Error(`--mpid ${mpid} is not a plan in data/plans.json`);
  const out = values.out ? resolve(WHERE, values.out) : join(SITE_DIR, "storefront", "probe-counts", bostonDate());
  await mkdir(out, { recursive: true });
  const command = commandOf(process.argv.slice(2), out);

  const jobs = [];
  for (let round = 0; round < Math.max(...Object.values(runs)); round++) {
    for (const width of widths) for (const spacing of Object.keys(runs)) if (runs[spacing] > round) jobs.push({ width, spacing });
  }
  let failed = 0;
  for (const [n, job] of jobs.entries()) {
    const record = await probeRun({ origin, mpid, need, gapMs, ...job });
    const stamp = record.at.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    record.file = `run-${stamp}-${job.width}-${job.spacing}.json`;
    record.command = command;
    await writeFile(join(out, record.file), `${JSON.stringify(record, null, 2)}\n`);
    const made = record.presses.filter((p) => p.pressed);
    const acked = made.filter((p) => p.acknowledged);
    process.stdout.write(
      `${n + 1}/${jobs.length} ${job.width} ${job.spacing}: ${acked.length} of ${made.length} presses acknowledged within 5 s; ` +
        `counted at the end ${record.final?.counted ?? "—"} of ${need}, "${record.final?.items ?? "—"}"; take-backs ${record.takeBacks.length}` +
        `${record.error ? `; ERROR ${record.error}` : ""} → ${record.file}\n`,
    );
    if (record.error) failed++;
  }
  const all = [];
  for (const f of (await readdir(out)).filter((f) => /^run-.*\.json$/.test(f)).sort()) all.push({ file: f, ...JSON.parse(await readFile(join(out, f), "utf8")) });
  await writeFile(join(out, "summary.md"), renderSummary(all));
  process.stdout.write(`summary: ${join(out, "summary.md")} (${all.length} runs)\n`);
  return failed ? 1 : 0;
}

main().then(
  (code) => process.stdout.write("", () => process.exit(code)),
  (err) => {
    console.error(`storefront-watch probe-counts: ${err.stack ?? err}`);
    process.exit(2);
  },
);
