// EL12's checks (SPEC-ui-and-copy-pass.md § 8.2 item 3), as functions over a `measure` (scripts/contrast.mjs's, or a
// mutant's), so el12-contrast-exception.test.mjs runs the same refusal on a copy with the ruling's check removed. Not a
// test file itself. Every pairs file here is a COPY in a temporary directory; src/contrast-pairs.json is never written.
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../build.mjs";

export const CONTRAST_SCRIPT = join(ROOT, "scripts", "contrast.mjs");
export const PAIRS = join(ROOT, "src", "contrast-pairs.json");
/** The ruling (`AskUserQuestion`, answered then): "Keep the blue". */
export const RULING_TS = "2026-10-27T15:04:57.804Z";
/** The one pair it rules on: E1's lede accent, Never frozen., --lean on --ink, as body text. */
export const isTheExcepted = (p) => p.build === "email" && p.fg === "--lean" && p.bg === "--ink" && p.role === "body";

/** A copy of src/contrast-pairs.json changed by `change(spec)`, in a temporary directory; returns its path and a dispose. */
export async function pairsCopy(change) {
  const dir = await mkdtemp(join(tmpdir(), "boston-el12-pairs-"));
  const spec = JSON.parse(await readFile(PAIRS, "utf8"));
  change(spec);
  const path = join(dir, "contrast-pairs.json");
  await writeFile(path, JSON.stringify(spec, null, 2) + "\n");
  return { path, dispose: () => rm(dir, { recursive: true, force: true }) };
}

/** The committed pair passes by its exception (its Lc still under its role), the ruling's ts on it; nothing is refused. */
export async function assertExceptionPasses(measure) {
  const { rows, problems } = await measure();
  assert.deepEqual(problems, [], "no problem");
  const excepted = rows.filter((r) => r.exception);
  assert.equal(excepted.length, 1, "one exception in the whole table");
  const [row] = excepted;
  assert.ok(isTheExcepted(row), `the exception is the lede accent's pair (${row.fg} on ${row.bg}, ${row.role})`);
  assert.equal(row.exception.ts, RULING_TS, "recorded with the ruling's ts");
  assert.ok(Math.abs(row.lc) < row.min, `control: its Lc ${row.lc.toFixed(1)} is under ${row.min}`);
  assert.equal(row.pass, true, "it passes, by the exception");
  assert.deepEqual(rows.filter((r) => !r.pass).map((r) => r.where), [], "every pair passes");
}

/** The exception is that pair's alone: the same colours declared again, and another pair under its role, still fail. */
export async function assertOthersStrict(measure) {
  const copy = await pairsCopy((spec) => {
    spec.pairs.push(
      { fg: "--lean", bg: "--ink", role: "body", where: "EL12: the excepted pair's colours again, without the exception", build: "email" },
      { fg: "--muted", bg: "--ink", role: "body", where: "EL12: another pair under its role", build: "email" },
    );
  });
  try {
    const { rows } = await measure({ pairs: copy.path });
    const failing = rows.filter((r) => !r.pass).map((r) => r.where);
    assert.deepEqual(failing, ["EL12: the excepted pair's colours again, without the exception", "EL12: another pair under its role"], "both still fail");
    assert.equal(rows.find((r) => r.exception)?.pass, true, "control: the excepted pair itself still passes");
  } finally {
    await copy.dispose();
  }
}

/** An exception without a ruling's ts is refused: the pair fails and a problem names it (no ts, and a ts that is no
 *  instant). */
export async function assertTsRequired(measure) {
  for (const [what, exception] of [
    ["no ts", (e) => ({ ...e, ts: undefined })],
    ["a date, not the ruling's instant", (e) => ({ ...e, ts: "2026-10-27" })],
  ]) {
    const copy = await pairsCopy((spec) => {
      const pair = spec.pairs.find(isTheExcepted);
      assert.ok(pair?.exception, "control: the committed pair carries its exception");
      pair.exception = exception(pair.exception);
    });
    try {
      const { rows, problems } = await measure({ pairs: copy.path });
      const row = rows.find(isTheExcepted);
      assert.equal(row.pass, false, `${what}: the pair fails`);
      assert.ok(problems.some((p) => /exception without a ruling's ts/.test(p)), `${what}: refused, by name`);
    } finally {
      await copy.dispose();
    }
  }
}

/** A copy of scripts/contrast.mjs with `from` replaced by `to` (exactly once), its imports pointing at the real modules;
 *  returns its `measure` and a dispose. */
export async function mutantMeasure(from, to) {
  const source = await readFile(CONTRAST_SCRIPT, "utf8");
  assert.equal(source.split(from).length - 1, 1, `the mutation site occurs exactly once in scripts/contrast.mjs: ${from}`);
  const dir = await mkdtemp(join(tmpdir(), "boston-el12-mutant-"));
  const copy = source
    .replace(from, to)
    .replace('from "apca-w3"', `from "${import.meta.resolve("apca-w3")}"`)
    .replace('from "../build.mjs"', `from "${pathToFileURL(join(ROOT, "build.mjs")).href}"`);
  const path = join(dir, "contrast.mutant.mjs");
  await writeFile(path, copy);
  const { measure } = await import(pathToFileURL(path).href);
  return { measure, dispose: () => rm(dir, { recursive: true, force: true }) };
}
