// QC: a stalled Chrome run (mockups/png.mjs runChrome), the printed pieces' guard against a Chrome that stays alive and
// silent (SPEC-print-pieces.md; three suite runs on 2026-10-17 met one for 90 s, while a healthy run took at most 2.0 s).
// A run that gives nothing within its bound while Chrome still runs is stopped and run again in a fresh profile, up to
// `attempts` runs, each retry told; a stall on EVERY attempt still fails (so a real hang is not hidden); an exit without
// output fails at once; the mock-ups' default is one attempt. No Chrome: a stand-in "Chrome", a Node script, plays each.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runChrome } from "../mockups/png.mjs";

const dir = await mkdtemp(join(tmpdir(), "boston-qc-"));
after(() => rm(dir, { recursive: true, force: true }));
const BOUND_MS = 700;
let made = 0;

/** A stand-in Chrome: on each run it counts the run, then stalls on the runs listed, answers "DONE" (and stays alive, as
 *  Chrome does after a screenshot) on the others, or exits at once with nothing when `exitSilently`. */
async function fakeChrome({ stallOn = [], exitSilently = false }) {
  made += 1;
  const path = join(dir, `fake-chrome-${made}.mjs`);
  const count = join(dir, `runs-${made}.txt`);
  await writeFile(
    path,
    `#!${process.execPath}
import { appendFileSync, readFileSync } from "node:fs";
appendFileSync(${JSON.stringify(count)}, "x");
const run = readFileSync(${JSON.stringify(count)}, "utf8").length;
if (${exitSilently}) process.exit(3);
if (!${JSON.stringify(stallOn)}.includes(run)) process.stdout.write("DONE\\n");
setInterval(() => {}, 1e6);
`,
  );
  await chmod(path, 0o755);
  return { path, runs: async () => (await readFile(count, "utf8").catch(() => "")).length };
}

const ready = ({ stdout }) => (stdout.includes("DONE") ? "done" : undefined);
const html = join(dir, "page.html");
await writeFile(html, "<!doctype html><title>qc</title>");
/** How many stand-in processes are still running (each is stopped with its process group after its run). */
const alive = (path) => spawnSync("pgrep", ["-f", path], { encoding: "utf8" }).stdout.trim().split("\n").filter(Boolean).length;

test("QC: a run that stalls once is stopped, run again fresh, and its answer returned; the retry is told", async () => {
  const fake = await fakeChrome({ stallOn: [1] });
  const notes = [];
  const value = await runChrome({ chrome: fake.path, html, args: [], ready, what: "answer", timeoutMs: BOUND_MS, attempts: 3, onRetry: (n) => notes.push(n) });
  assert.equal(value, "done");
  assert.equal(await fake.runs(), 2, "two runs: the stalled one and its retry");
  assert.deepEqual(notes, [`Chrome stalled (nothing within ${BOUND_MS} ms) and was run again, attempt 2 of 3: answer`]);
  assert.equal(alive(fake.path), 0, "both runs' processes are stopped");
});

test("QC: a run that stalls on every attempt still fails, after attempts × the bound, naming them", async () => {
  const fake = await fakeChrome({ stallOn: [1, 2, 3, 4] });
  const notes = [];
  const t0 = Date.now();
  await assert.rejects(
    runChrome({ chrome: fake.path, html, args: [], ready, what: "answer", timeoutMs: BOUND_MS, attempts: 3, onRetry: (n) => notes.push(n) }),
    new RegExp(`^Error: Chrome did not answer within ${BOUND_MS} ms on any of 3 attempts`),
  );
  assert.ok(Date.now() - t0 >= 3 * BOUND_MS, "it waited out every attempt");
  assert.equal(await fake.runs(), 3, "three runs, no fourth");
  assert.equal(notes.length, 2, "two retries told");
  assert.equal(alive(fake.path), 0, "every run's processes are stopped");
});

test("QC: a Chrome that exits without its output fails at once, and is not retried", async () => {
  const fake = await fakeChrome({ exitSilently: true });
  const notes = [];
  await assert.rejects(
    runChrome({ chrome: fake.path, html, args: [], ready, what: "answer", timeoutMs: 10_000, attempts: 3, onRetry: (n) => notes.push(n) }),
    /^Error: Chrome exited 3 and did not answer/,
  );
  assert.equal(await fake.runs(), 1);
  assert.deepEqual(notes, []);
});

test("QC: by default (the mock-ups) one attempt: a stall fails without a retry", async () => {
  const fake = await fakeChrome({ stallOn: [1] });
  await assert.rejects(
    runChrome({ chrome: fake.path, html, args: [], ready, what: "answer", timeoutMs: BOUND_MS }),
    new RegExp(`^Error: Chrome did not answer within ${BOUND_MS} ms: `),
  );
  assert.equal(await fake.runs(), 1);
});
