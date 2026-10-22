// SP14 (SPEC-save-offer-production.md § 10 items 5 and 6): the ZIP check with the official list. data/delivery-zips.json
// is the store's Boston delivery zone (316 five-digit codes, "match": "exact", "status": "official", sorted, nothing
// else of its source); its near ring stays a mock, by three-digit prefix, and says so. A Boston code is inside and a
// Pennsylvania code outside, in the Worker's function, its /api/save, and the development page's check (the same
// function, inlined).
import test, { after } from "node:test";
import assert from "node:assert/strict";
import zips from "../data/delivery-zips.json" with { type: "json" };
import { classifyZip } from "../src/worker/zip-class.js";
import { devPage } from "./dev-page.mjs";
import { saveData } from "./sp-production.mjs";
import { simulatePage } from "./page-sim.mjs";
import { BOSTON_ZIP, NEAR_RING_ZIP, PENNSYLVANIA_ZIP } from "./sp-promise.mjs";
import { postSave, rows, startWorker, validSave } from "./worker-harness.mjs";

const OFFICIAL_COUNT = 316;

test("SP14: data/delivery-zips.json — the official list: 316 five-digit codes, exact, sorted, nothing else per entry", () => {
  assert.equal(zips.status, "official");
  assert.equal(zips.match, "exact");
  const codes = zips.prefixes.map((entry) => {
    assert.deepEqual(Object.keys(entry), ["zip"], "each entry is its code alone");
    assert.match(entry.zip, /^\d{5}$/, "five digits");
    return entry.zip;
  });
  assert.equal(codes.length, OFFICIAL_COUNT);
  assert.deepEqual(codes, [...new Set(codes)].sort(), "sorted, each once");
  assert.match(zips.status_note, /316/, "its note counts the codes");
  assert.match(zips.status_note, /near_ring[^.]*MOCK/, "and says the near ring is still a mock");
  for (const entry of zips.near_ring) assert.match(entry.prefix, /^\d{3}$/, "the near ring is by three-digit prefix");
});

test("SP14: the ZIP check — a Boston code inside, a Pennsylvania code outside; the mock near ring by prefix", () => {
  assert.equal(classifyZip(BOSTON_ZIP, zips), "in", "02118, Boston");
  assert.equal(classifyZip("01602", zips), "in", "01602, Worcester: on the store's list");
  assert.equal(classifyZip(PENNSYLVANIA_ZIP, zips), "far", "18407, Carbondale PA");
  assert.equal(classifyZip(NEAR_RING_ZIP, zips), "near", "03101, Manchester NH: not on the list, in the ring's 030");
  // Exact, not by prefix: every code under the listed codes' prefixes is in exactly when it is listed.
  const listed = new Set(zips.prefixes.map((e) => e.zip));
  for (const prefix of new Set([...listed].map((z) => z.slice(0, 3)))) {
    for (let n = 0; n < 100; n++) {
      const zip = `${prefix}${String(n).padStart(2, "0")}`;
      assert.equal(classifyZip(zip, zips) === "in", listed.has(zip), `${zip}: in exactly when listed`);
    }
  }
});

const { mf, db } = await startWorker();
after(() => mf.dispose());

test("SP14: the Worker — an offer save from Boston accepted; from Pennsylvania refused; an expansion from Pennsylvania saved far", async () => {
  assert.deepEqual((await postSave(mf, validSave({ email: "dummy-sp14-in@example.com", zip: BOSTON_ZIP }))).json, { ok: true });
  assert.deepEqual((await postSave(mf, validSave({ email: "dummy-sp14-pa@example.com", zip: PENNSYLVANIA_ZIP }))).json, { ok: false, error: "zip_out_of_area" });
  assert.deepEqual((await postSave(mf, validSave({ kind: "expansion", email: "dummy-sp14-x@example.com", zip: PENNSYLVANIA_ZIP }))).json, { ok: true });
  const ring = await rows(db, "SELECT s.kind, s.ring FROM saves s JOIN save_contacts c USING (save_id) ORDER BY c.email");
  assert.deepEqual(ring, [{ kind: "offer", ring: "in" }, { kind: "expansion", ring: "far" }]);
});

test("SP14 (page): the development page carries the official list and checks it before any request", async () => {
  const html = await devPage();
  assert.equal(saveData(html).zips.prefixes.length, OFFICIAL_COUNT, "the page's list is the official one");
  const submit = async (zip) => {
    const page = simulatePage(html);
    page.type("save-email", "dummy-sp14-page@example.com");
    page.type("save-zip", zip);
    page.el("save-form").dispatch("submit");
    await page.settle();
    return page;
  };
  const outside = await submit(PENNSYLVANIA_ZIP);
  assert.equal(outside.record.fetches.length, 0, "18407: out of area, decided in the page");
  assert.equal(outside.el("save-out-of-area").hidden, false);
  const inside = await submit(BOSTON_ZIP);
  assert.equal(inside.record.fetches.length, 1, "02118: in area, saved");
});
