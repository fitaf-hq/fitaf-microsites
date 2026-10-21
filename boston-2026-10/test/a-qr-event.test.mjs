// The QR event of an `open` (SPEC-analytics.md § 3: "the QR event id if the URL names one (§ 9)"; § 9 item 2: "The page
// reads the id against data/events.json; anything else is recorded as no event"), with SPEC-print-pieces.md § 11's two
// event codes, `boston` and `seminar` (after `demo`). A case ADDED at the merge of boston/analytics into
// boston/integration-1022 (2026-10-18): no case of A1–A11 opened the page with a query, so none covered the page's reading,
// and § 11's two ids met the analytics only at the merge. It is not one of § 7's cases. Its check is a-checks.mjs's
// qrEventProblems; its mutant re-runs THE SAME check on a mirror (cc-harness mirror(), never the tree:
// protocols/mutate-in-a-mirror.md), after the unchanged mirror passes it as the control.
//
//   the page's reading removed   (analytics.js: the open's qr always "")   fails this case
import test from "node:test";
import assert from "node:assert/strict";
import { copyFile, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { qrEventProblems } from "./a-checks.mjs";
import { mirror } from "./cc-harness.mjs";

const PAGE_JS = join("src", "analytics.js");
// Since SPEC-save-offer-production § 9 item 2 the reading is src/qr-event.js's qrEvent, which the save step calls too.
const READING = "qr: qrEvent(w.location.search, QR_IDS)";

test("A-QR: an open from ?e=boston or ?e=seminar (as from every event data/events.json names) carries that id; any other query none", async () => {
  assert.deepEqual(await qrEventProblems(), []);
});

test("A-QR mutant: the page's reading removed fails it; the unchanged mirror passes (the control)", async () => {
  const mutated = async (change) => {
    const dir = await mirror(async (d) => {
      await copyFile(join(ROOT, "wrangler.jsonc"), join(d, "wrangler.jsonc"));
      await change(d);
    });
    try {
      return await qrEventProblems(dir);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  };
  assert.deepEqual(await mutated(async () => {}), [], "the control: the unchanged mirror");
  const problems = await mutated(async (dir) => {
    const path = join(dir, PAGE_JS);
    const text = await readFile(path, "utf8");
    assert.equal(text.split(READING).length - 1, 1, `the mutation anchor is in ${PAGE_JS} once`);
    await writeFile(path, text.replace(READING, () => 'qr: ""'));
  });
  for (const id of ["boston", "seminar"]) {
    assert.ok(problems.includes(`production, ?e=${id}: the open carries qr "", not "${id}"`), `fails on ?e=${id}:\n${problems.join("\n")}`);
  }
});
