// CC-2 (SPEC-chefs-choice § 4): the links. Each checkout link the page carries decodes, with the SHIPPED script's own
// reader of `#fitaf=` (fill B, run on the synthetic order page as the R2 cases run it), to the menu's names' keys and
// quantities and the size's mpid. And the links are built THROUGH the link tool's handoffLink and the one mealKey: a
// mirror of the package whose meal-key.js and link encoder are changed builds links that follow the change, which a key
// function or an encoder copied into the build would not.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  expectedFragment,
  FIXTURE,
  mirror,
  mpidsFor,
  ON,
  builtPage,
  picksData,
  readWithFillB,
  withFixtureInData,
} from "./cc-harness.mjs";
import { assertCheckedOut, LOG_PREFIX, refFnv1a, refUntagged } from "./r2-harness.mjs";

const V2_FRAGMENT = /^#fitaf=2(\.[0-9a-z]{5}(\*([2-9]|1\d|2[01]))?)+$/;
const ORDER = "https://fitafnutrition.com/order";

test("CC-2a: every link is the size's order page with a v2 fragment of the menu's keys and counts", async () => {
  const data = picksData((await builtPage({ on: ON })).html);
  assert.ok(data, "the page carries the week's picks");
  let links = 0;
  for (const [count, menu] of Object.entries(FIXTURE.menus)) {
    for (const mpid of mpidsFor(count)) {
      const url = new URL(data.weeks[0].counts[count].links[mpid]);
      assert.equal(`${url.origin}${url.pathname}${url.search}`, `${ORDER}?mpid=${mpid}`, `${count}: the size's order page`);
      assert.match(url.hash, V2_FRAGMENT, "a v2 fragment");
      assert.equal(url.hash, expectedFragment(menu), `${count}, mpid ${mpid}: the keys (independently computed) and counts`);
      links += 1;
    }
  }
  assert.equal(links, 6, "three sizes × two counts");
});

test("CC-2b: fill B reads each link: every meal pressed its count, the size's mpid, then the store's CHECKOUT", async () => {
  const data = picksData((await builtPage({ on: ON })).html);
  assert.ok(data, "the page carries the week's picks");
  for (const [count, menu] of Object.entries(FIXTURE.menus)) {
    for (const mpid of mpidsFor(count)) {
      const link = data.weeks[0].counts[count].links[mpid];
      const { page, h, path } = await readWithFillB(link, menu.map((m) => m.name));
      assert.deepEqual(
        Object.fromEntries([...page.presses].map(([name, list]) => [name, list.length])),
        Object.fromEntries(menu.map((m) => [m.name, m.qty])),
        `${count}, mpid ${mpid}: each meal pressed its qty`,
      );
      assert.ok(h.info.includes(`${LOG_PREFIX} fill C, mpid ${mpid}`), `fill C read mpid ${mpid}: ${JSON.stringify(h.info)}`);
      assertCheckedOut(h, page, path);
    }
  }
});

// The mirror's changes: a different key function (FNV-1a XORed with a constant before the last five base-36 digits) and a
// different separator in the link tool's encoder. Each is a one-line edit whose anchor must be present. The name the
// changed function hashes is still the name as keyed: since SPEC-rung2-progress-and-checkout § 15.1, without a leading
// marketing tag (r2-harness.mjs refUntagged), which the fixture week's "🟠NEW: Maple Dijon Pork Tenderloin" carries.
const KEY_LINE = 'return ("0000" + (h >>> 0).toString(36)).slice(-5);';
const KEY_MUTANT = 'return ("0000" + ((h ^ 0x5bd1e995) >>> 0).toString(36)).slice(-5);';
const JOIN_LINE = '].join(".");';
const JOIN_MUTANT = '].join("_");';
const altKey = (name) =>
  ((refFnv1a(refUntagged(name).replace(/\s+/g, " ").trim()) ^ 0x5bd1e995n) % 36n ** 5n).toString(36).padStart(5, "0");

async function edit(path, from, to) {
  const text = await readFile(path, "utf8");
  assert.equal(text.split(from).length - 1, 1, `the mutation anchor is in ${path} once: ${from}`);
  await writeFile(path, text.replace(from, to));
}

/** `node build.mjs --on ON` in a mirror holding the fixture in data/picks/: the page it writes. */
async function mirrorPage(change) {
  const dir = await mirror(change);
  try {
    await withFixtureInData(dir);
    execFileSync(process.execPath, [join(dir, "build.mjs"), "--on", ON], { cwd: dir, stdio: "pipe" });
    return await readFile(join(dir, "dist", "index.html"), "utf8");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("CC-2c: built through the one mealKey and the link tool's encoder: a mirror with both changed follows both", async () => {
  const control = picksData(await mirrorPage());
  assert.ok(control, "control: the mirror's own build carries the week (data/picks/ in the package)");
  const expected = picksData((await builtPage({ on: ON })).html);
  assert.deepEqual(control.weeks[0].counts, expected.weeks[0].counts, "control: the unchanged mirror's links are the package's");

  const changed = picksData(
    await mirrorPage(async (dir) => {
      await edit(join(dir, "src", "storefront", "meal-key.js"), KEY_LINE, KEY_MUTANT);
      await edit(join(dir, "scripts", "handoff-link.mjs"), JOIN_LINE, JOIN_MUTANT);
    }),
  );
  assert.ok(changed, "the changed mirror carries the week");
  for (const [count, menu] of Object.entries(FIXTURE.menus)) {
    for (const mpid of mpidsFor(count)) {
      const tokens = menu.map((m) => (m.qty === 1 ? altKey(m.name) : `${altKey(m.name)}*${m.qty}`));
      assert.equal(
        changed.weeks[0].counts[count].links[mpid],
        `${ORDER}?mpid=${mpid}#fitaf=${["2", ...tokens].join("_")}`,
        `${count}, mpid ${mpid}: the link follows src/storefront/meal-key.js and scripts/handoff-link.mjs's encoder`,
      );
    }
  }
});
