// WC-10 (SPEC-week-content.md § 3, § 5): the content command twice is byte-identical, every file and every printed
// SHA-256, whatever the clock's zone (no clock, no network). It prints each file's path, size and SHA-256. And § 3's
// refusals: it exits non-zero and writes NOTHING for a week with no picks file, for a --week that is not a Sunday or not
// given (never inferred), and for any refusal the build would make (a broken picks file, a sheet the manifest names and
// the directory lacks). Run as `npm run content` runs it: the program, from a mirror where a case changes an input.
// ⚠ AMENDED for SPEC-week-content § 9 item 4 (2026-10-23): the week with no picks file is derived, never a literal (it
// was 2026-11-01, which now has one): the Sunday seven days after the latest committed week (wc-checks weekWithNoFile,
// the same refusal check WC-11's mirror mutant runs), the case saying which.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PICKS_DIR, ROOT } from "../build.mjs";
import { mirror } from "./cc-harness.mjs";
import { noFileProblems, weekWithNoFile } from "./wc-checks.mjs";
import { sha256, WEEK_1018 } from "./wc-harness.mjs";

/** `npm run content -- …` as the program: node scripts/week-content.mjs …, in `root`, with `env` added. */
const content = (args, { root = ROOT, env = {} } = {}) =>
  spawnSync(process.execPath, [join(root, "scripts", "week-content.mjs"), ...args], { encoding: "utf8", env: { ...process.env, ...env } });

/** Every file under `dir`, by path from it: its bytes. */
async function tree(dir) {
  const out = {};
  const walk = async (rel) => {
    for (const e of await readdir(join(dir, rel), { withFileTypes: true })) {
      const path = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) await walk(path);
      else out[path] = await readFile(join(dir, path));
    }
  };
  if (existsSync(dir)) await walk("");
  return out;
}

test("WC-10a: twice, in two zones: byte-identical files; each printed with its path, size and SHA-256", async () => {
  const a = await mkdtemp(join(tmpdir(), "boston-wc10-a-"));
  const b = await mkdtemp(join(tmpdir(), "boston-wc10-b-"));
  try {
    const ra = content(["--week", WEEK_1018, "--out", a], { env: { TZ: "UTC" } });
    const rb = content(["--week", WEEK_1018, "--out", b], { env: { TZ: "Pacific/Kiritimati" } });
    assert.equal(ra.status, 0, ra.stderr);
    assert.equal(rb.status, 0, rb.stderr);
    const [ta, tb] = [await tree(a), await tree(b)];
    assert.deepEqual(Object.keys(ta).sort(), ["week/chefs-choice-2026-10-18.jpg", "week/picks-data.json"]);
    assert.deepEqual(Object.keys(tb).sort(), Object.keys(ta).sort());
    for (const path of Object.keys(ta)) assert.ok(ta[path].equals(tb[path]), `${path}: byte-identical`);
    for (const [out, run, files] of [[a, ra, ta], [b, rb, tb]]) {
      const lines = run.stdout.trim().split("\n");
      assert.equal(lines.length, Object.keys(files).length, "one line per file");
      for (const [path, bytes] of Object.entries(files)) {
        const line = lines.find((l) => l.includes(join(out, path)));
        assert.ok(line, `a line names ${path}`);
        assert.ok(line.includes(`${bytes.length} bytes`), `${path}: its size`);
        assert.ok(line.includes(`sha256:${sha256(bytes)}`), `${path}: its SHA-256`);
      }
    }
    assert.equal(ra.stdout.replaceAll(a, "<out>"), rb.stdout.replaceAll(b, "<out>"), "the same report, the directory apart");
  } finally {
    await rm(a, { recursive: true, force: true });
    await rm(b, { recursive: true, force: true });
  }
});

/** A refusal: non-zero, a reason on stderr matching `reason`, and nothing written under `out`. */
function assertRefused(run, out, reason, files) {
  assert.notEqual(run.status, 0, `refused: ${run.stdout}`);
  assert.match(run.stderr, reason);
  assert.deepEqual(Object.keys(files), [], `nothing written under ${out}`);
}

test("WC-10b: refusals write nothing: no picks file for the week, not a Sunday, no --week, no --out, an unknown argument", async (t) => {
  const { latest, week } = await weekWithNoFile();
  t.diagnostic(`the week with no picks file: ${week}, seven days after the latest committed week, ${latest}`);
  assert.ok(!existsSync(join(PICKS_DIR, `${week}.json`)), `control: data/picks/ has no file for ${week}`);
  assert.deepEqual(await noFileProblems(), [], `no picks file for ${week}: refused, the week named, nothing written`);
  const parent = await mkdtemp(join(tmpdir(), "boston-wc10-refuse-"));
  try {
    const out = join(parent, "out");
    const cases = [
      [["--week", "2026-10-17", "--out", out], /Sunday/],
      [["--week", "2026-02-30", "--out", out], /Sunday|date/],
      [["--out", out], /--week/],
      [["--week", WEEK_1018], /--out/],
      [["--week", WEEK_1018, "--out", out, "--on", "2026-10-11"], /--on/],
    ];
    for (const [args, reason] of cases) assertRefused(content(args), out, reason, await tree(out));
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("WC-10c: a refusal the build would make writes nothing: a broken picks file beside the week, a missing sheet", async () => {
  const broken = await mirror(async (dir) => {
    const path = join(dir, "data", "picks", `${WEEK_1018}.json`);
    const week = JSON.parse(await readFile(path, "utf8"));
    // The cart no longer makes its plan: two more, since SPEC-rung2-fill-c § 8 a plan takes one more than its count when
    // a selection row goes through it (this cart is or, weekdays: 4 meals on the 4 plan, which takes 4 or 5).
    week.lists["chefs-choice"].carts[0].items[0].qty += 2;
    await writeFile(join(dir, "data", "picks", "2026-10-11.json"), JSON.stringify({ ...week, delivery: "2026-10-11" }));
  });
  const noSheet = await mirror((dir) => unlink(join(dir, "src", "assets", "photo-sheets", "chefs-choice-2026-10-18.jpg")));
  const unchanged = await mirror();
  const parent = await mkdtemp(join(tmpdir(), "boston-wc10-refuse-"));
  try {
    const out = join(parent, "out");
    assertRefused(content(["--week", WEEK_1018, "--out", out], { root: broken }), out, /2026-10-11\.json/, await tree(out));
    assertRefused(content(["--week", WEEK_1018, "--out", out], { root: noSheet }), out, /chefs-choice-2026-10-18\.jpg/, await tree(out));
    const control = content(["--week", WEEK_1018, "--out", out], { root: unchanged });
    assert.equal(control.status, 0, `control: an unchanged mirror makes the content: ${control.stderr}`);
  } finally {
    for (const dir of [broken, noSheet, unchanged, parent]) await rm(dir, { recursive: true, force: true });
  }
});

test("WC-10d: a directory already holding a week/ is refused, so two weeks' objects never meet in one", async () => {
  const out = await mkdtemp(join(tmpdir(), "boston-wc10-twice-"));
  try {
    assert.equal(content(["--week", WEEK_1018, "--out", out]).status, 0);
    const before = await tree(out);
    const again = content(["--week", WEEK_1018, "--out", out]);
    assert.notEqual(again.status, 0);
    assert.match(again.stderr, /week\//);
    assert.deepEqual(Object.keys(await tree(out)), Object.keys(before), "nothing added");
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
