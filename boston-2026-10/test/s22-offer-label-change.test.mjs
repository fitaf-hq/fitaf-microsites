// S22 (SPEC-rung4 § 2a): one place changes the offer. A copy of data/offers.json with one label changed,
// built: the page carries the new label and not the old, and nothing else in the build changes.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build, ROOT } from "../build.mjs";
import { offerForSave } from "../src/worker/offers.js";
import { hashTree, midday, offerBoxAt } from "./offer-box-fixture.mjs";

const OFFERS_FILE = join(ROOT, "data", "offers.json");
const DATE = "2026-10-15";
const NEW_LABEL = "S22: the changed label";

test("S22: a copy of offers.json with one label changed, built — the new label, not the old; no other change", async () => {
  const committed = await readFile(OFFERS_FILE, "utf8");
  const real = JSON.parse(committed);
  const chosen = offerForSave(DATE, real.offers); // the offer the box shows on DATE
  const copy = structuredClone(real);
  copy.offers.find((o) => o.id === chosen.id).label = NEW_LABEL;

  const dir = await mkdtemp(join(tmpdir(), "boston-s22-"));
  try {
    const offersPath = join(dir, "offers.json");
    await writeFile(offersPath, JSON.stringify(copy, null, 2));
    await build({ target: "dev", outDir: join(dir, "committed") });
    await build({ target: "dev", outDir: join(dir, "changed"), offersPath });
    const [committedTree, changedTree] = [await hashTree(join(dir, "committed")), await hashTree(join(dir, "changed"))];
    assert.deepEqual(Object.keys(changedTree), Object.keys(committedTree), "the same files");

    const pages = Object.keys(committedTree).filter((f) => f.endsWith("index.html"));
    assert.ok(pages.length >= 2, "control: / and /<event-id>/");
    for (const page of pages) {
      const before = await readFile(join(dir, "committed", page), "utf8");
      const after = await readFile(join(dir, "changed", page), "utf8");
      assert.equal(offerBoxAt(before, midday(DATE)), chosen.label, `control: ${page} shows the committed label on ${DATE}`);
      assert.equal(offerBoxAt(after, midday(DATE)), NEW_LABEL, `${page}: the box shows the new label`);
      assert.equal(after.split(NEW_LABEL).length - 1, 1, `${page} carries the new label once`);
      const savedOffer = (html) => JSON.parse(/id="save-data">([\s\S]*?)<\/script>/.exec(html)[1]).offers.find((o) => o.id === chosen.id);
      assert.equal(savedOffer(after).label, NEW_LABEL, `${page}: that offer's old label is gone`);
      assert.equal(after.replace(JSON.stringify(NEW_LABEL), JSON.stringify(chosen.label)), before, `${page}: the label is the only difference`);
    }
    for (const f of Object.keys(committedTree).filter((f) => !pages.includes(f))) {
      assert.equal(changedTree[f], committedTree[f], `${f} unchanged`);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  assert.equal(await readFile(OFFERS_FILE, "utf8"), committed, "committed offers.json untouched");
});
