// S24 (SPEC-rung4 § 2a): the build stays date-independent. dist-dev/ built with the clock at two different
// dates is byte-identical: the choice of offer happens in the browser, never at build time.
// Its subject is the page WITHOUT a week's Chef's Choice (whose embedding does depend on the build's date, by § 2 of
// SPEC-chefs-choice), so it builds with an EMPTY picks directory (build()'s `picksDir`; SPEC-chefs-choice § 6, ruled
// 2026-09-30). Chef's Choice is CC-1–CC-8's.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build, ROOT } from "../build.mjs";
import { offerForSave } from "../src/worker/offers.js";
import { zonedDate } from "../src/worker/zoned-time.js";
import { FIXTURE_OFFERS, hashTree, midday, ZONE } from "./offer-box-fixture.mjs";

// Either side of the fixture's event offer's first day, so a choice made at build time would differ.
const DATES = ["2026-09-15", "2026-10-15"];

test("S24: dist-dev/ built with the clock at two different dates is byte-identical", async (t) => {
  assert.notEqual(
    offerForSave(DATES[0], FIXTURE_OFFERS.offers).label,
    offerForSave(DATES[1], FIXTURE_OFFERS.offers).label,
    "control: the two dates get different offers",
  );
  const dir = await mkdtemp(join(tmpdir(), "boston-s24-"));
  const noPicks = await mkdtemp(join(tmpdir(), "boston-s24-no-picks-"));
  try {
    const fixturePath = join(dir, "offers.fixture.json");
    await writeFile(fixturePath, JSON.stringify(FIXTURE_OFFERS));
    for (const [name, offersPath] of [
      ["the S21 fixture", fixturePath],
      ["data/offers.json", join(ROOT, "data", "offers.json")],
    ]) {
      const trees = [];
      for (const ymd of DATES) {
        const outDir = join(dir, `${trees.length}-${name.replace(/\W+/g, "-")}`);
        t.mock.timers.enable({ apis: ["Date"], now: midday(ymd) });
        try {
          assert.equal(zonedDate(Date.now(), ZONE), ymd, "control: the build runs with the clock at this date");
          assert.equal(new Date().toISOString().slice(0, 10), ymd);
          await build({ target: "dev", outDir, offersPath, picksDir: noPicks });
        } finally {
          t.mock.timers.reset();
        }
        trees.push(await hashTree(outDir));
        if (offersPath === fixturePath) {
          const page = await readFile(join(outDir, "index.html"), "utf8");
          for (const o of FIXTURE_OFFERS.offers) assert.ok(page.includes(o.label), `control: the fixture reached the page (${o.label})`);
        }
      }
      assert.ok(Object.keys(trees[0]).length >= 3, "control: pages, fonts and assets were built");
      assert.deepEqual(trees[1], trees[0], `${name}: byte-identical on ${DATES.join(" and ")}`);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(noPicks, { recursive: true, force: true });
  }
});
