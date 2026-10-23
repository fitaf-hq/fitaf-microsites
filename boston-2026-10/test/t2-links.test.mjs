import test from "node:test";
import assert from "node:assert/strict";
import { gridCells, renderPage } from "../build.mjs";
import { anchors, hrefs, loadPlans, mpidOf, whyHref } from "./helpers.mjs";

test("T2: exactly 6 grid links + 1 family link, each .../order?mpid=N, N set equals the table's", async () => {
  const plans = await loadPlans();
  const html = await renderPage(plans);
  // SPEC-why-fit-af.md § 2 item 4: the footer's no-script link to /why/ is the page's one link that is not an order link.
  assert.deepEqual(hrefs(html).filter((h) => h === whyHref()), [whyHref()], "the no-script link to /why/, once");
  const all = hrefs(html).filter((h) => h !== whyHref());
  assert.equal(all.length, 7, `expected 7 hrefs, got ${all.length}: ${all.join(" ")}`);
  for (const h of all) assert.match(h, /^https:\/\/fitafnutrition\.com\/order\?mpid=\d+$/);
  const grid = anchors(html).filter((a) => a["data-cell"]);
  const family = anchors(html).filter((a) => a["data-plan"] === "family");
  assert.equal(grid.length, 6);
  assert.equal(family.length, 1);
  const expected = new Set([...gridCells(plans).map((c) => c.mpid), plans.family.counts[0].mpid]);
  assert.deepEqual(new Set(all.map(mpidOf)), expected);
  assert.equal(expected.size, 7);
});
