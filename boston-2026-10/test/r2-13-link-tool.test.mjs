// R2-13: `npm run handoff:link` prints the test link, payload version 2 (SPEC-rung2 § 11), and then each meal's key
// beside its name, so a person can read the link (§ 11 item 6); the shipped script accepts the link; the tool refuses
// what the script would refuse. The tool is run as a program, as a person runs it.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { assertCheckedOut, COLLIDING, fakeWindow, MEALS, orderPage, refKey, run, script } from "./r2-harness.mjs";

const TOOL = join(ROOT, "scripts", "handoff-link.mjs");
const output = (...args) => execFileSync(process.execPath, [TOOL, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const refuses = (...args) => spawnSync(process.execPath, [TOOL, ...args], { encoding: "utf8" });
const firstLine = (text) => text.split("\n")[0];

test("R2-13a: the first line is the link: the plan's order page, then #fitaf=2.<key>[*n]….~<code>", () => {
  const out = output("--mpid", "21", "--item", "Birria de Res Bowl:2", "--item", "Jalapeño Lime Chicken:5", "--code", "BOSTON26");
  const url = new URL(firstLine(out));
  assert.equal(`${url.origin}${url.pathname}${url.search}`, "https://fitafnutrition.com/order?mpid=21");
  assert.equal(url.hash, `#fitaf=2.${refKey("Birria de Res Bowl")}*2.${refKey("Jalapeño Lime Chicken")}*5.~BOSTON26`);
});

test("R2-13b: fill B accepts a link the tool printed", async () => {
  const url = new URL(firstLine(output("--mpid", "21", ...MEALS.flatMap((name, i) => ["--item", `${name}:${[1, 2, 4][i]}`]))));
  const page = await orderPage();
  const h = fakeWindow({ path: url.pathname + url.search, fragment: url.hash, page });
  run(await script("B"), h.window);
  h.timers.drain();
  assert.deepEqual(Object.fromEntries([...page.presses].map(([name, list]) => [name, list.length])), {
    [MEALS[0]]: 1,
    [MEALS[1]]: 2,
    [MEALS[2]]: 4,
  });
  assertCheckedOut(h, page, "/order?mpid=21");
});

test("R2-13d (§ 11 item 6): after the link, one line per meal — its key (and count) beside its name — and the code", () => {
  const out = output("--mpid", "21", "--item", "Birria de Res Bowl:1", "--item", "  Chicken   Pesto Pasta :6", "--code", "BOSTON26");
  const [link, ...rest] = out.trimEnd().split("\n");
  assert.match(link, /^https:\/\/fitafnutrition\.com\/order\?mpid=21#fitaf=2\./);
  const rows = rest.map((line) => line.trim().split(/\s{2,}/));
  assert.deepEqual(rows, [
    [refKey("Birria de Res Bowl"), "Birria de Res Bowl"],
    [`${refKey("Chicken Pesto Pasta")}*6`, "Chicken Pesto Pasta"],
    ["~BOSTON26", "the offer code (checked, not applied)"],
  ]);
  // Every token the link carries is on a line of its own, in the link's order.
  assert.deepEqual(rows.map(([token]) => token), link.split("#fitaf=")[1].split(".").slice(1));
});

// Every case but the one under test meets mpid 21's count of 7, and each names its own reason: otherwise the
// full-plan rule (R2-14) would refuse them all and every case would pass for the same, wrong reason.
const B7 = "Birria de Res Bowl:7";
for (const [label, args, reason] of [
  ["no --mpid", ["--item", B7], /exactly one --mpid/],
  ["no --item", ["--mpid", "21"], /at least one --item/],
  ["an mpid not in data/plans.json", ["--mpid", "99", "--item", B7], /mpid 99 is not in data\/plans\.json/],
  ["qty 0", ["--mpid", "21", "--item", "Birria de Res Bowl:0"], /must be 1\.\.21, got 0/],
  ["qty 22", ["--mpid", "21", "--item", "Birria de Res Bowl:22"], /must be 1\.\.21, got 22/],
  ["no qty", ["--mpid", "21", "--item", "Birria de Res Bowl"], /NAME:QTY/],
  ["an empty name", ["--mpid", "21", "--item", "  :7"], /an empty meal name/],
  ["a meal twice", ["--mpid", "21", "--item", "Birria de Res Bowl:3", "--item", "Birria de Res Bowl:4"], /named twice/],
  ["a meal twice, spaced differently", ["--mpid", "21", "--item", "Birria de Res Bowl:3", "--item", "Birria  de Res Bowl :4"], /named twice/],
  [
    "two meals whose keys are equal (a planted collision)",
    ["--mpid", "21", "--item", `${COLLIDING[0]}:3`, "--item", `${COLLIDING[1]}:4`],
    new RegExp(`share a key: ${refKey(COLLIDING[0])}`),
  ],
  ["a bad code", ["--mpid", "21", "--item", B7, "--code", "NO SPACES"], /--code must match/],
  ["a code with an underscore (v2's code has none)", ["--mpid", "21", "--item", B7, "--code", "BOSTON_26"], /--code must match/],
  ["--pid-for (retired with payload v1)", ["--mpid", "21", "--item", B7, "--pid-for", "Birria de Res Bowl=1353"], /unknown flag --pid-for/],
  ["an unknown flag", ["--mpid", "21", "--item", B7, "--qty", "3"], /unknown flag --qty/],
  ["a count short of the plan", ["--mpid", "21", "--item", "Birria de Res Bowl:6"], /the plan needs 7 meals; the link has 6/],
]) {
  test(`R2-13c: the tool refuses ${label}, printing no link`, () => {
    const r = refuses(...args);
    assert.notEqual(r.status, 0);
    assert.equal(r.stdout, "");
    assert.match(r.stderr, /^handoff:link: /);
    assert.match(r.stderr, reason);
  });
}
