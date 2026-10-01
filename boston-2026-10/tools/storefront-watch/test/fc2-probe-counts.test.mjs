// FC2, SPEC-rung2-fill-c § 2: the probe of the store's count (bin/probe-counts.mjs), run as its CLI against the
// synthetic store on 127.0.0.1 (test/browser-store.mjs, `counter` mode: the live store's names, a schedule of our own),
// never the live store. What it must prove: one JSON file per run and a Markdown summary; per press, the time from the
// press until the pressed card shows its count; a press the store never counts recorded as never acknowledged; a count
// taken back after it was shown recorded as a take-back; the press spacing it was asked for; and nothing pressed but
// each chosen meal's Add to Cart (the page never leaves /order). Skipped when no Chrome is installed (CHROME_PATH).
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { chromePath } from "../lib/browser.mjs";
import { MEALS, startStore } from "./browser-store.mjs";

const run = promisify(execFile);
const BIN = new URL("../bin/probe-counts.mjs", import.meta.url).pathname;
const chrome = (() => {
  try {
    return chromePath();
  } catch {
    return null;
  }
})();
const skip = chrome ? false : "no Chrome found (set CHROME_PATH)";
/** The synthetic store's plan: mpid 21, 7 meals (data/plans.json); its meals are MEALS, the first 7 chosen. */
const NEED = 7;
const ACK_MS = 300;

let store;
const dirs = [];
before(async () => {
  store = await startStore();
});
after(async () => {
  await store?.close();
  for (const d of dirs) await rm(d, { recursive: true, force: true });
});

/** Run the CLI into a fresh directory; the run files (sorted by name) and the summary. */
async function probe(args) {
  const out = await mkdtemp(join(tmpdir(), "storefront-watch-fc2-"));
  dirs.push(out);
  await run(process.execPath, [BIN, "--origin", store.origin, "--mpid", "21", "--out", out, ...args], {
    env: { ...process.env, CHROME_PATH: chrome },
    timeout: 240_000,
  });
  const names = (await readdir(out)).sort();
  const runs = [];
  for (const n of names.filter((n) => /^run-.*\.json$/.test(n))) runs.push(JSON.parse(await readFile(join(out, n), "utf8")));
  const summary = names.includes("summary.md") ? await readFile(join(out, "summary.md"), "utf8") : null;
  return { runs, summary };
}

test("FC2: one ack-spaced run per width on a store that counts each press after 300 ms: the shape, and each press's time to its count", { skip }, async () => {
  store.set({ counter: { ackMs: ACK_MS } });
  const { runs, summary } = await probe(["--width", "1280", "--width", "390", "--ack-runs", "1", "--gap-runs", "0", "--nowait-runs", "0"]);
  assert.equal(runs.length, 2);
  assert.deepEqual(runs.map((r) => r.width).sort(), [1280, 390]);
  for (const r of runs) {
    assert.equal(r.error, null, `${r.width}: ${r.error}`);
    assert.equal(r.spacing, "ack");
    assert.equal(r.mpid, 21);
    assert.equal(r.need, NEED);
    assert.equal(r.origin, store.origin);
    assert.deepEqual(r.chosen, MEALS.slice(0, NEED));
    assert.equal(r.sampling.everyMs, 50);
    assert.ok(r.sampling.samples > 0);
    assert.ok(Array.isArray(r.changes) && r.changes.length > 0);
    // The selectors it read by, recorded in every run.
    for (const k of ["counter", "counterValue", "itemsCount", "phoneItems", "progressLabel", "sideCheckout", "barCheckout"]) assert.equal(typeof r.selectors[k], "string", k);
    assert.equal(r.presses.length, NEED);
    r.presses.forEach((p, i) => {
      assert.equal(p.index, i);
      assert.equal(p.meal, MEALS[i]);
      assert.equal(p.pressed, true);
      assert.equal(p.acknowledged, true, `${r.width} press ${i}`);
      // The card's count, 1, read at a 50 ms poll after the store's 300 ms: never before it, and well inside 5 s.
      assert.ok(p.card.ackMs >= ACK_MS - 5 && p.card.ackMs < ACK_MS + 1000, `${r.width} press ${i}: ${p.card.ackMs}`);
      assert.ok(p.mobile.ackMs >= ACK_MS - 5 && p.mobile.ackMs < ACK_MS + 1000, `${r.width} mobile ${i}: ${p.mobile.ackMs}`);
      // The plan's own count reaches this press's number.
      assert.ok(p.items.reachedMs >= ACK_MS - 5 && p.items.reachedMs < ACK_MS + 1000, `${r.width} items ${i}: ${p.items.reachedMs}`);
      assert.equal(p.items.textAtAck, `${i + 1} ${i ? "items" : "item"}`);
      assert.equal(p.phoneItems.reachedMs !== null, true);
    });
    assert.deepEqual(r.takeBacks, []);
    assert.equal(r.final.path, "/order", "nothing pressed but Add to Cart: the page never left /order");
    assert.equal(r.final.items, `${NEED} items`);
    assert.equal(r.final.counted, NEED);
    assert.equal(r.final.side.disabled, false);
    assert.equal(r.final.side.text, "CHECKOUT NOW");
    assert.equal(r.final.bar.text, "CHECKOUT");
    assert.equal(r.final.progressLabel, `Please add at least ${NEED} meals to continue`);
    assert.deepEqual(r.fitafLines, []);
  }
  assert.ok(summary, "summary.md written");
  // Each run names the command that made it, and the summary lists the commands of its runs.
  for (const r of runs) assert.match(r.command, /^npm --prefix boston-2026-10\/tools\/storefront-watch run probe-counts -- .*--ack-runs 1/);
  assert.ok(summary.includes(runs[0].command), "the summary shows the runs' command");
  assert.match(summary, /\| 1280 \| ack \| 1 \| 7 \| 7 \| 0 \|/);
  assert.match(summary, /\| 390 \| ack \| 1 \| 7 \| 7 \| 0 \|/);
  assert.match(summary, /counter__value/);
});

test("FC2: a press the store never counts, and a count it takes back: never acknowledged, and a take-back", { skip }, async () => {
  store.set({ counter: { ackMs: ACK_MS, drop: [3], takeBack: [{ press: 1, afterMs: 800 }] } });
  const { runs, summary } = await probe(["--width", "1280", "--ack-runs", "1", "--gap-runs", "0", "--nowait-runs", "0"]);
  assert.equal(runs.length, 1);
  const [r] = runs;
  assert.equal(r.error, null);
  assert.equal(r.presses[3].acknowledged, false);
  assert.equal(r.presses[3].card.ackMs, null);
  // An ack-spaced run waits out the full 5 s for the press that never counts, then goes on.
  assert.ok(r.presses[4].at - r.presses[3].at >= 5000, `${r.presses[4].at - r.presses[3].at}`);
  assert.equal(r.presses[1].acknowledged, true);
  const back = r.takeBacks.filter((t) => t.meal === MEALS[1]);
  assert.ok(back.some((t) => t.key === "card" && t.from === "count 1" && t.to === "add"), JSON.stringify(r.takeBacks));
  assert.ok(r.takeBacks.some((t) => t.key === "items"), "the plan's N items went down");
  assert.equal(r.final.counted, NEED - 2);
  assert.equal(r.final.items, `${NEED - 2} items`);
  assert.equal(r.final.side.disabled, true);
  assert.match(summary, /\| 1280 \| ack \| 1 \| 7 \| 6 \| 1 \|/);
  assert.match(summary, new RegExp(MEALS[1]));
});

test("FC2: spacing: 200 ms gaps between presses, and none (each press as soon as the last returns)", { skip }, async () => {
  store.set({ counter: { ackMs: ACK_MS } });
  const { runs, summary } = await probe(["--width", "1280", "--ack-runs", "0", "--gap-runs", "1", "--nowait-runs", "1"]);
  assert.deepEqual(runs.map((r) => r.spacing).sort(), ["gap", "nowait"]);
  const gap = runs.find((r) => r.spacing === "gap");
  const nowait = runs.find((r) => r.spacing === "nowait");
  assert.equal(gap.gapMs, 200);
  const gaps = (r) => r.presses.slice(1).map((p, i) => p.at - r.presses[i].at);
  assert.ok(gaps(gap).every((g) => g >= 195), `gap: ${gaps(gap)}`);
  // No wait: every press is made before the store has counted the first (its 300 ms).
  assert.ok(nowait.presses.at(-1).at < ACK_MS, `nowait: ${gaps(nowait)}`);
  for (const r of runs) {
    assert.ok(r.presses.every((p) => p.acknowledged), r.spacing);
    assert.equal(r.final.counted, NEED);
    assert.equal(r.final.path, "/order");
  }
  assert.match(summary, /\| 1280 \| gap 200 ms \| 1 \| 7 \| 7 \| 0 \|/);
  assert.match(summary, /\| 1280 \| no wait \| 1 \| 7 \| 7 \| 0 \|/);
});

test("FC2: an origin that is neither the store nor a local fixture is refused, nothing run", async () => {
  await assert.rejects(
    run(process.execPath, [BIN, "--origin", "https://example.com", "--out", tmpdir()], { timeout: 30_000 }),
    (err) => err.code === 2 && /--origin/.test(err.stderr),
  );
});
