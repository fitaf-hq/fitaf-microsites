// The checks of MS-1, MS-2, MS-5 and MS-11 (SPEC-meal-selection.md § 6, § 8.1) as functions over a built page, each
// returning one line per thing the page gets wrong ([] when it is right), so the cases run them on the real build and
// MS-10's mutants run THE SAME checks on a mirror's build (test/ms-10-mutants.test.mjs). Not a test file itself.
// Every expectation is the contract's (ms-harness TABLE, the fixtures' own carts), never data/plans.json's.
// Since SPEC-week-content § 9 also MS-20's (§ 13 item 3): the weeks it compares and the comparison, over a PACKAGE
// (`root`: this one, or MS-10's mirror) against MS20_BASE's own tree.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, symlink } from "node:fs/promises";
import { join, relative } from "node:path";
import { ROOT } from "../build.mjs";
import { expectedFragment, FIXTURE as V1, mealLine, MESSAGES, readWithFillB } from "./cc-harness.mjs";
import { assertCheckedOut, LOG_PREFIX } from "./r2-harness.mjs";
import { cardOf, centsOf, dollars, fragmentOf, GOALS, mpidOf, open, resultOf, TABLE, V2_CARTS } from "./ms-harness.mjs";
import { runWithoutFamilyLinks } from "./uf-harness.mjs";

export const ORDER = "https://fitafnutrition.com/order";
const fill = (phrase, values) => phrase.replace(/\{([a-z]+)\}/g, (whole, k) => (k in values ? String(values[k]) : whole));

/** MS-1: each answer set's card, at every size, shows its plan's meals, price and weekly total, and the rounded line.
 *  ⚠ AMENDED by SPEC-ui-and-copy-pass § 1.2 item 1 (the Advisor, 2026-10-23: "yes please fix this math"): the card's count
 *  is the meals it lists (the row's `meals`) and its weekly total that count at the plan's price a meal, as the store
 *  charges it (five on Lean 4 at $13.00, $65.00); the price a meal, the link and the rounded line its plan's, as before. */
export function rowProblems(html) {
  const problems = [];
  for (const goal of GOALS) {
    for (const row of TABLE) {
      const hash = fragmentOf(goal, row);
      const r = resultOf(open(html, hash));
      const want = {
        shown: true,
        selection: row.key,
        meals: String(row.meals),
        perMeal: dollars(centsOf(goal, row.plan)),
        total: dollars(row.meals * centsOf(goal, row.plan)),
        rounded: row.plan < row.meals ? fill(MESSAGES.plan_page.rounded, { meals: row.meals, plan: row.plan }) : null,
        cta: `${ORDER}?mpid=${mpidOf(goal, row.plan)}`,
      };
      for (const [k, v] of Object.entries(want)) if (r[k] !== v) problems.push(`${hash}: ${k} ${JSON.stringify(r[k])}, not ${JSON.stringify(v)}`);
    }
  }
  return problems;
}

/** MS-2: with the version-2 fixture open, each answer set's link at every size is its cart's, at its row's plan's mpid,
 *  and (`decode`) the shipped reader presses every meal its count and reads that mpid. */
export async function linkProblems(html, { decode = true } = {}) {
  const problems = [];
  for (const goal of GOALS) {
    for (const row of TABLE) {
      const hash = fragmentOf(goal, row);
      const cart = V2_CARTS[row.key];
      const s = cardOf(open(html, hash));
      if (!s.list || !s.checkout) {
        problems.push(`${hash}: no Chef's Choice link`);
        continue;
      }
      const mpid = mpidOf(goal, row.plan);
      const want = `${ORDER}?mpid=${mpid}${expectedFragment(cart.items)}`;
      if (s.checkout !== want) problems.push(`${hash}: ${s.checkout}, not ${want}`);
      if (!decode) continue;
      const { page, h, path } = await readWithFillB(s.checkout, cart.items.map((m) => m.name));
      const pressed = Object.fromEntries([...page.presses].map(([name, list]) => [name, list.length]));
      const wanted = Object.fromEntries(cart.items.map((m) => [m.name, m.qty]));
      if (JSON.stringify(pressed) !== JSON.stringify(wanted)) problems.push(`${hash}: fill C pressed ${JSON.stringify(pressed)}`);
      if (!h.info.includes(`${LOG_PREFIX} fill C, mpid ${mpid}`)) problems.push(`${hash}: fill C did not read mpid ${mpid}: ${JSON.stringify(h.info)}`);
      try {
        assertCheckedOut(h, page, path);
      } catch (err) {
        problems.push(`${hash}: not checked out: ${err.message}`);
      }
    }
  }
  return problems;
}

/** MS-5: with the version-1 fixture open, its `7` is the cart of *or*, every day, no breakfast and its `14` of *and*, every
 *  day, no breakfast (§ 5), at every size; every other answer set falls back to Choose your meals alone (§ 4). */
export function v1Problems(html) {
  const problems = [];
  const under = { "or-7d": "7", "and-7d": "14" };
  for (const goal of GOALS) {
    for (const row of TABLE) {
      const hash = fragmentOf(goal, row);
      const s = cardOf(open(html, hash));
      const count = under[row.key];
      if (!count) {
        if (s.list || s.own || !s.choose) problems.push(`${hash}: not the fallback (list ${s.list}, own ${s.own}, Choose your meals ${s.choose})`);
        if (s.chooseHref !== `${ORDER}?mpid=${mpidOf(goal, row.plan)}`) problems.push(`${hash}: Choose your meals ${s.chooseHref}`);
        continue;
      }
      const menu = V1.menus[count];
      const want = `${ORDER}?mpid=${mpidOf(goal, Number(count))}${expectedFragment(menu)}`;
      if (!s.list) problems.push(`${hash}: the version-1 ${count} is not shown`);
      if (s.checkout !== want) problems.push(`${hash}: ${s.checkout}, not the version-1 ${count}'s ${want}`);
      if (JSON.stringify(s.meals) !== JSON.stringify(menu.map((m) => mealLine(m)))) problems.push(`${hash}: the lines are not the version-1 ${count}'s`);
    }
  }
  return problems;
}

/** MS-11: the three answer sets on the 14-meal plan each show their OWN cart (lines and link), at every size. */
export const ON_14 = TABLE.filter((r) => r.plan === 14).map((r) => r.key);
export function threeCartsProblems(html) {
  const problems = [];
  for (const goal of GOALS) {
    for (const key of ON_14) {
      const hash = `#${goal}-${key}`;
      const cart = V2_CARTS[key];
      const s = cardOf(open(html, hash));
      const lines = cart.items.map((m) => mealLine(m));
      if (JSON.stringify(s.meals) !== JSON.stringify(lines)) problems.push(`${hash}: shows ${JSON.stringify(s.meals)}, not its cart's`);
      const want = `${ORDER}?mpid=${mpidOf(goal, 14)}${expectedFragment(cart.items)}`;
      if (s.checkout !== want) problems.push(`${hash}: ${s.checkout}, not its cart's ${want}`);
    }
  }
  return problems;
}

/** MS-20's base: the tree before § 13's code (section 11 built, § 13's contract merged). Its two targets. */
export const MS20_BASE = "1c10839";
export const MS20_TARGETS = [[], ["--env", "dev"]];

function run(cmd, args, { input } = {}) {
  const r = spawnSync(cmd, args, { input, maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}: exit ${r.status}: ${r.stderr}`);
  return r.stdout;
}

async function filesUnder(dir, top = dir) {
  if (!existsSync(dir)) return {};
  const files = {};
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) Object.assign(files, await filesUnder(path, top));
    else files[relative(top, path)] = await readFile(path);
  }
  return files;
}

/** The content command of the package at `pkg`, run in it for `week` (and `args`): its exit, its files, and its stdout
 *  and stderr with the package's and the output's own paths named alike. */
async function contentAt(pkg, week, args, scratch) {
  const out = join(await mkdtemp(join(scratch, "out-")), "out");
  const r = spawnSync(process.execPath, [join(pkg, "scripts", "week-content.mjs"), "--week", week, "--out", out, ...args], { cwd: pkg, maxBuffer: 256 * 1024 * 1024 });
  const named = (text) => text.toString("utf8").replaceAll(out, "<out>").replaceAll(pkg, "<package>");
  return { status: r.status, files: await filesUnder(out), stdout: named(r.stdout), stderr: named(r.stderr) };
}

/** `commit`'s package (`git archive` of THIS repository, the package's directory alone) extracted under `scratch` (a real
 *  path: a script runs as a program only when its own URL is its argv[1]), read only, this package's node_modules linked
 *  in, W4's way. Returns its path. */
export async function baseTree(commit, scratch) {
  const top = run("git", ["-C", ROOT, "rev-parse", "--show-toplevel"]).toString("utf8").trim();
  const prefix = relative(top, ROOT);
  await mkdir(join(scratch, "base"), { recursive: true });
  run("tar", ["-x", "-C", join(scratch, "base")], { input: run("git", ["-C", top, "archive", "--format=tar", commit, prefix]) });
  const basePackage = join(scratch, "base", prefix);
  await symlink(join(ROOT, "node_modules"), join(basePackage, "node_modules"));
  return basePackage;
}

/**
 * SPEC-week-content § 9 item 1: the weeks MS-20 compares, those of `root`'s data/picks/ whose file is byte-identical to
 * the same path in `basePackage` (the weeks the two trees were given alike), and every other week, outside the claim
 * because it has no *before*, with why: { compared: [week…], left: [[week, why]…] }, `why` "added after <base>" (no file
 * there) or "changed since <base>".
 */
export async function weeksAlike(root, basePackage, base = MS20_BASE) {
  const weeks = (await readdir(join(root, "data", "picks"))).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).map((f) => f.slice(0, -".json".length)).sort();
  const compared = [];
  const left = [];
  for (const week of weeks) {
    const there = join(basePackage, "data", "picks", `${week}.json`);
    if (!existsSync(there)) left.push([week, `added after ${base}`]);
    else if (!(await readFile(join(root, "data", "picks", `${week}.json`))).equals(await readFile(there))) left.push([week, `changed since ${base}`]);
    else compared.push(week);
  }
  return { compared, left };
}

/** The population line MS-20's control prints: what it compared and what it left out, and why. */
export const weeksAlikeLine = ({ compared, left }) =>
  `compared (byte-identical to ${MS20_BASE}'s): ${compared.join(", ") || "none"}; outside the claim: ${left.map(([w, why]) => `${w} (${why})`).join(", ") || "none"}`;

/**
 * MS-20 for one week and target (`args`): `root`'s content command against `basePackage`'s, its exit code, its files,
 * each byte for byte, its report (each file's path, size and SHA-256) and its message; and as a control, the base makes
 * the week. One line per difference ([] when the two agree).
 */
export async function contentProblems(root, basePackage, week, args, scratch, base = MS20_BASE) {
  const before = await contentAt(basePackage, week, args, scratch);
  // ⚠ AMENDED by SPEC-ui-and-copy-pass § 2.2 (2026-10-25): a cart Family takes that holds its count carries Family's link,
  // taken out here (uf-harness runWithoutFamilyLinks), every other byte compared as before.
  const after = runWithoutFamilyLinks(await contentAt(root, week, args, scratch));
  const problems = [];
  if (before.status !== 0) problems.push(`control: ${base} does not make the week (${before.stderr.trim()})`);
  if (after.status !== before.status) problems.push(`the exit code ${after.status}, not ${base}'s ${before.status} (${after.stderr.trim()})`);
  const [paths, basePaths] = [Object.keys(after.files), Object.keys(before.files)];
  if (JSON.stringify(paths) !== JSON.stringify(basePaths)) problems.push(`the files ${JSON.stringify(paths)}, not ${JSON.stringify(basePaths)}`);
  for (const [path, bytes] of Object.entries(before.files)) {
    if (!after.files[path]?.equals(bytes)) problems.push(`${path} not byte for byte (${after.files[path]?.length} bytes, ${base}'s ${bytes.length})`);
  }
  if (after.stdout !== before.stdout) problems.push(`the report ${JSON.stringify(after.stdout)}, not ${JSON.stringify(before.stdout)}`);
  if (after.stderr !== before.stderr) problems.push(`the message ${JSON.stringify(after.stderr)}, not ${JSON.stringify(before.stderr)}`);
  return problems;
}
