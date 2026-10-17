// U2 (SPEC-week-content.md § 8 items 2 and 5): the content command over an UPDATING file (§ 8 item 1's, exactly, as
// data/picks/<delivery>.json in a mirror, the other committed weeks beside it) exits 0 and writes week/picks-data.json
// alone: that one week, "updating": true, no carts and no links, no photo sheet (asked of a week whose manifest names
// one), byte-identical on a second run. Run as `npm run content` runs it: the program, in the mirror (cc-harness
// mirror(); never the tree).
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mirror } from "./cc-harness.mjs";
import { sha256, WEEK_DATA_KEY } from "./wc-harness.mjs";
import { UPDATING_SHEET, UPDATING_WEEK, updatingFile } from "./u-checks.mjs";

/** `npm run content -- …` as the program, in `root`. */
const content = (root, args) => spawnSync(process.execPath, [join(root, "scripts", "week-content.mjs"), ...args], { encoding: "utf8" });

/** Every file under `dir`, by path from it: its bytes. */
async function tree(dir) {
  const out = {};
  const walk = async (rel) => {
    for (const e of await readdir(join(dir, rel), { withFileTypes: true })) {
      const path = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) await walk(path);
      else out[path] = await readFile(join(dir, path));
    }
  };
  if (existsSync(dir)) await walk("");
  return out;
}

/** A mirror whose data/picks/<UPDATING_WEEK>.json is § 8 item 1's file, as Fit AF's emitter writes it (`--updating`). */
const updatingMirror = () =>
  mirror((dir) => writeFile(join(dir, "data", "picks", `${UPDATING_WEEK}.json`), JSON.stringify(updatingFile(), null, 2) + "\n"));

test("U2a: exit 0; week/picks-data.json alone, the one week, \"updating\": true, no carts, no links, no photo sheet", async () => {
  const root = await updatingMirror();
  const out = await mkdtemp(join(tmpdir(), "boston-u2-"));
  try {
    const manifest = JSON.parse(await readFile(join(root, "data", "photo-sheets.json"), "utf8"));
    assert.equal(manifest.chefs_choice?.[UPDATING_WEEK]?.file, UPDATING_SHEET, "control: the manifest names a sheet for the week");
    const run = content(root, ["--week", UPDATING_WEEK, "--out", out]);
    assert.equal(run.status, 0, run.stderr);
    const files = await tree(out);
    assert.deepEqual(Object.keys(files), [WEEK_DATA_KEY], "the data alone: no photo sheet");
    const text = files[WEEK_DATA_KEY].toString("utf8");
    const data = JSON.parse(text);
    assert.equal(data.weeks.length, 1, "that one week");
    const [week] = data.weeks;
    assert.equal(week.delivery, UPDATING_WEEK);
    assert.equal(week.updating, true);
    assert.ok(text.includes('"updating":true'), 'the file\'s "updating": true');
    assert.deepEqual(Object.keys(week.carts ?? {}), [], "no carts");
    for (const mark of ["links", "snack_links", "#fitaf=", "/week/", ".jpg"]) assert.ok(!text.includes(mark), `no ${mark} in the file`);
    const lines = run.stdout.trim().split("\n");
    assert.equal(lines.length, 1, "one file reported");
    assert.ok(lines[0].includes(`${files[WEEK_DATA_KEY].length} bytes`) && lines[0].includes(`sha256:${sha256(files[WEEK_DATA_KEY])}`), lines[0]);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(out, { recursive: true, force: true });
  }
});

test("U2b: twice, byte-identical (and --env dev the same bytes: an updating week has no link to differ)", async () => {
  const root = await updatingMirror();
  const [a, b, d] = await Promise.all(["a", "b", "dev"].map((n) => mkdtemp(join(tmpdir(), `boston-u2-${n}-`))));
  try {
    const ra = content(root, ["--week", UPDATING_WEEK, "--out", a]);
    const rb = content(root, ["--week", UPDATING_WEEK, "--out", b]);
    const rd = content(root, ["--week", UPDATING_WEEK, "--out", d, "--env", "dev"]);
    for (const r of [ra, rb, rd]) assert.equal(r.status, 0, r.stderr);
    const [ta, tb, td] = [await tree(a), await tree(b), await tree(d)];
    assert.deepEqual(Object.keys(ta), [WEEK_DATA_KEY]);
    for (const other of [tb, td]) {
      assert.deepEqual(Object.keys(other), Object.keys(ta));
      assert.ok(other[WEEK_DATA_KEY].equals(ta[WEEK_DATA_KEY]), "byte-identical");
    }
    assert.equal(ra.stdout.replaceAll(a, "<out>"), rb.stdout.replaceAll(b, "<out>"), "the same report, the directory apart");
  } finally {
    for (const dir of [root, a, b, d]) await rm(dir, { recursive: true, force: true });
  }
});
