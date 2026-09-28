import test, { after } from "node:test";
import assert from "node:assert/strict";
import zips from "../data/delivery-zips.json" with { type: "json" };
import { classifyZip } from "../src/worker/zip-class.js";
import { count, FAR_ZIP, IN_ZIP, NEAR_ZIP, postSave, startWorker, validSave } from "./worker-harness.mjs";
import { devPage } from "./dev-page.mjs";
import { simulatePage } from "./page-sim.mjs";

const { mf, db } = await startWorker();
after(() => mf.dispose());

test("S5: `offer` with a near (or far) ZIP -> zip_out_of_area; `expansion` with an in-area ZIP -> zip_in_area", async () => {
  assert.equal(classifyZip(NEAR_ZIP, zips), "near", "fixture: the near ZIP is in the (mock) near ring");
  assert.equal(classifyZip(FAR_ZIP, zips), "far");
  assert.equal(classifyZip(IN_ZIP, zips), "in");
  for (const zip of [NEAR_ZIP, FAR_ZIP]) {
    assert.deepEqual((await postSave(mf, validSave({ zip }))).json, { ok: false, error: "zip_out_of_area" });
  }
  assert.deepEqual((await postSave(mf, validSave({ kind: "expansion", zip: IN_ZIP }))).json, { ok: false, error: "zip_in_area" });
  assert.equal(await count(db, "saves"), 0);
});

test("S5 (page): the page checks the ZIP before any request, and offers the expansion list instead", async () => {
  const page = simulatePage(await devPage());
  page.type("save-email", "dummy-s5@example.com");
  page.type("save-zip", NEAR_ZIP);
  page.el("save-form").dispatch("submit");
  assert.equal(page.record.fetches.length, 0, "OUT_OF_AREA is decided in the page: nothing sent");
  assert.equal(page.el("save-out-of-area").hidden, false);
  assert.equal(page.el("save-ooa-zip").textContent, NEAR_ZIP);
  assert.equal(page.el("save-skip-plan").hidden, true, "no PLAN edge out of area");

  page.el("save-marketing").checked = true; // the marketing box is offer-only: never sent with an expansion
  page.el("save-expansion").dispatch("click");
  await page.settle();
  assert.equal(page.record.fetches.length, 1);
  const body = JSON.parse(page.record.fetches[0].init.body);
  assert.equal(body.kind, "expansion");
  assert.equal(body.consent_marketing, false);
  assert.equal(page.el("save-expansion-done").hidden, false, "EXPANSION_SAVED");

  // The body the page sent is one the Worker accepts.
  assert.equal((await postSave(mf, body)).status, 200);
  const row = await db.prepare("SELECT ring, kind FROM saves").first();
  assert.deepEqual(row, { ring: "near", kind: "expansion" });
});

test("S5 (page): the page's ZIP check is the Worker's function, inlined verbatim", async () => {
  assert.ok((await devPage()).includes(classifyZip.toString()));
});
