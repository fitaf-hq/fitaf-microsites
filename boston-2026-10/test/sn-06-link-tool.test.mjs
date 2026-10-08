// SN-6 (SPEC-snacks-in-the-cart § 2): `npm run handoff:link` with `--snack "NAME:QTY"`, run as a program as a person
// runs it. The link carries each snack as the meal grammar with a leading "_", after every meal and before `~<code>`;
// its legend shows each snack's token beside its name, marked as a snack; the shipped text accepts the link and carts
// the snacks; with no --snack the link is byte-for-byte what it was; the photo part's cells stay one per meal. The tool
// refuses what the block refuses: a name or key given twice across meals and snacks, a snack's count outside 1..21, an
// empty snack name, and the full-plan rule reads the meals only.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PHOTOS_PATH, ROOT } from "../build.mjs";
import { FC_PATH, FC_PAYLOAD } from "./fc-harness.mjs";
import { COLLIDING, LOG_PREFIX, refKey } from "./r2-harness.mjs";
import { assertFullCart, DIRECT, snRun, SN_PAYLOAD, TOGGLED } from "./sn-harness.mjs";

const TOOL = join(ROOT, "scripts", "handoff-link.mjs");
const output = (...args) => execFileSync(process.execPath, [TOOL, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const refuses = (...args) => spawnSync(process.execPath, [TOOL, ...args], { encoding: "utf8" });
const mealArgs = FC_PAYLOAD.items.flatMap((it) => ["--item", `${it.name}:${it.qty}`]);
const snackArgs = SN_PAYLOAD.snacks.flatMap((it) => ["--snack", `${it.name}:${it.qty}`]);

test("SN-6a: the snacks after the meals and before the code, each `_<key>[*n]`; the legend marks them", () => {
  const out = output("--mpid", "23", ...mealArgs, ...snackArgs, "--code", "BOSTON26");
  const [link, ...legend] = out.trimEnd().split("\n");
  const plain = new URL(output("--mpid", "23", ...mealArgs, "--code", "BOSTON26").split("\n")[0]);
  const url = new URL(link);
  assert.equal(url.hash, plain.hash.replace(".~BOSTON26", `._${refKey(TOGGLED)}._${refKey(DIRECT)}*2.~BOSTON26`));
  assert.deepEqual(legend.slice(FC_PAYLOAD.items.length, -1).map((l) => l.trim().split(/\s{2,}/)), [
    [`_${refKey(TOGGLED)}`, `${TOGGLED} (a snack)`],
    [`_${refKey(DIRECT)}*2`, `${DIRECT} (a snack)`],
  ]);
});

test("SN-6b: the shipped text accepts the tool's link and carts its snacks", async () => {
  const url = new URL(output("--mpid", "23", ...mealArgs, ...snackArgs).split("\n")[0]);
  assert.equal(url.pathname + url.search, FC_PATH);
  const r = await snRun({ fragment: url.hash });
  assert.equal(r.last, `${LOG_PREFIX} done: /checkout`, JSON.stringify(r.ours));
  assertFullCart(r.page);
});

test("SN-6c: with --photos, the photo part is the meals' alone: the same as the link's without snacks", async () => {
  const photos = JSON.parse(await readFile(PHOTOS_PATH, "utf8"));
  const [week, sheet] = Object.entries(photos.chefs_choice ?? {}).find(([, s]) => Object.keys(s.cells ?? {}).length >= 2) ?? [];
  assert.ok(week, "control: a week's sheet with cells");
  const names = Object.keys(sheet.cells).slice(0, 2);
  const meals = ["--item", `${names[0]}:6`, "--item", `${names[1]}:1`];
  const without = output("--mpid", "21", ...meals, "--photos", week).split("\n")[0];
  const withSnack = output("--mpid", "21", ...meals, "--snack", `${TOGGLED}:1`, "--photos", week).split("\n")[0];
  assert.ok(without.includes("!"), "control: the link carries a photo part");
  assert.equal(withSnack.split("!").slice(1).join("!"), without.split("!").slice(1).join("!"));
  assert.equal(withSnack.split("!")[0], `${without.split("!")[0]}._${refKey(TOGGLED)}`);
});

const REFUSALS = [
  ["a snack named as a meal", ["--item", `${FC_PAYLOAD.items[0].name}:1`], /is named twice/],
  ["a snack named twice", ["--snack", `${TOGGLED}:2`], /is named twice/],
  ["two names sharing a key", ["--snack", `${COLLIDING[0]}:1`, "--snack", `${COLLIDING[1]}:1`], /share a key/],
  ["a snack's count of 22", ["--snack", "Extra Snack:22"], /qty for Extra Snack must be 1\.\.21, got 22/],
  ["a snack's count of 0", ["--snack", "Extra Snack:0"], /must be 1\.\.21, got 0/],
  ["an empty snack name", ["--snack", "  :1"], /has an empty snack name/],
];

for (const [what, extra, reason] of REFUSALS) {
  test(`SN-6: ${what} — refused, no link printed`, () => {
    const meals = what === "a snack named as a meal" ? mealArgs.slice(2) : mealArgs;
    const args = what === "a snack named as a meal" ? ["--mpid", "23", ...meals, ...extra, "--snack", `${FC_PAYLOAD.items[0].name}:1`] : ["--mpid", "23", ...meals, "--snack", `${TOGGLED}:1`, ...extra];
    const r = refuses(...args);
    assert.notEqual(r.status, 0);
    assert.equal(r.stdout, "", "no link printed");
    assert.match(r.stderr, reason);
  });
}

test("SN-6: the full-plan rule reads the meals: 13 meals and a snack for the 14-meal plan is refused", () => {
  const r = refuses("--mpid", "23", ...mealArgs.slice(0, -2), "--snack", `${TOGGLED}:1`);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /the plan needs 14 meals; the link has 13/);
});
