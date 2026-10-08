import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { parseTarget, shareLines } from "../src/save/calculator.js";
import { IN_ZIP } from "./worker-harness.mjs";
import { devPage } from "./dev-page.mjs";
import { loadPlans } from "./helpers.mjs";
import { simulatePage } from "./page-sim.mjs";

/** flows/02 § 2's worked example, read from the flow itself (emphasis removed). */
async function flowExample() {
  const md = await readFile(join(ROOT, "flows", "02-choose.md"), "utf8");
  const block = md.split("### ⬜ Optional:")[1].split("\n- ")[0];
  return block.split("\n").filter((l) => l.startsWith("> ")).map((l) => l.slice(2).replace(/\*\*/g, "").trim());
}

// Updated (SPEC-meal-selection § 8 item 7): shareLines takes meals a day and days a week; Signature × 14 is 2 a day on 7.
test("S19: 150 g / 2,600 cal, Signature × 14 -> the ranges in flows/02 § 2 exactly", async () => {
  const [targets, protein, calories] = await flowExample();
  assert.equal(targets, "Your targets: 150 g protein · 2,600 cal a day · Signature, 14 meals a week (2 a day)", "control: the flow's example");
  const signature = (await loadPlans()).individual.find((p) => p.id === "signature");
  assert.deepEqual(shareLines(signature, 2, 7, { protein: 150, calories: 2600 }), { targets, protein, calories });
  assert.deepEqual(
    shareLines(signature, 2, 7, { protein: null, calories: 2600 }),
    { targets: "Your targets: 2,600 cal a day · Signature, 14 meals a week (2 a day)", protein: null, calories },
    "the two numbers are independent",
  );
  assert.equal(shareLines(signature, 2, 7, { protein: null, calories: null }), null);
  assert.deepEqual([parseTarget("2,600"), parseTarget(" 150 "), parseTarget(""), parseTarget("abc"), parseTarget("0"), parseTarget("-5")], [2600, 150, null, null, null, null]);
});

test("S19 (page): the same lines on the page; nothing in the URL, the fragment, storage or any request", async () => {
  const [targets, protein, calories] = await flowExample();
  const html = await devPage();
  const page = simulatePage(html, { hash: "#signature-14" });
  assert.deepEqual(page.missing(["save-skip-menu"]), []);
  assert.equal(page.el("share-out").hidden, true, "nothing to show before a target");
  page.type("share-protein", "150");
  page.type("share-calories", "2,600");
  assert.equal(page.el("share-out").hidden, false);
  assert.deepEqual(
    [page.el("share-targets").textContent, page.el("share-protein-line").textContent, page.el("share-calories-line").textContent],
    [targets, protein, calories],
  );

  // Changing the plan recomputes from the same page memory.
  page.record.hashWrites.length = 0;
  simulateHash(page, "#signature-7");
  assert.match(page.el("share-targets").textContent, /Signature, 7 meals a week \(1 a day\)/);
  simulateHash(page, "#signature-14");

  // Then a save: the one request the page makes.
  page.type("save-email", "dummy-s19@example.com");
  page.type("save-zip", IN_ZIP);
  page.el("save-form").dispatch("submit");
  await page.settle();

  const r = page.record;
  const leaks = (s) => /150|2,?600/.test(String(s));
  assert.equal(r.fetches.length, 1, "control: a request was made and is inspected");
  for (const f of r.fetches) assert.ok(!leaks(f.init.body) && !leaks(f.url), `request free of the targets: ${f.init.body}`);
  assert.ok(!leaks(page.el("share-protein").getAttribute("value")), "not written back as an attribute");
  assert.deepEqual(r.hashWrites.filter(leaks), [], "not in the fragment");
  assert.equal(r.history.length, 0, "no history entries written");
  assert.deepEqual(r.storage, [], "no localStorage / sessionStorage");
  assert.deepEqual(r.cookies, [], "no cookie");
  assert.equal(r.xhr + r.beacons.length, 0, "no other channel");
  assert.ok(!leaks(page.location.href), "not in the URL");
});

/** Flow 2 changing the plan, as its own script does: by writing the fragment. */
function simulateHash(page, hash) {
  page.location.hash = hash;
}
