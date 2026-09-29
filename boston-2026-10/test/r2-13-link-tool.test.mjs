// R2-13: `npm run handoff:link` prints the test link for a payload, and the shipped script accepts it; the tool
// refuses what the script would refuse. The tool is run as a program, as a person runs it.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { CART_KEY, fakeWindow, run, script } from "./r2-harness.mjs";

const TOOL = join(ROOT, "scripts", "handoff-link.mjs");
const link = (...args) => execFileSync(process.execPath, [TOOL, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const refuses = (...args) => spawnSync(process.execPath, [TOOL, ...args], { encoding: "utf8" });

test("R2-13a: the printed link is the plan's order page with the payload in the fragment", () => {
  const url = new URL(
    link(
      "--mpid", "21",
      "--item", "Birria de Res Bowl:2",
      "--item", "Jalapeño Lime Chicken:5",
      "--pid-for", "Birria de Res Bowl=1353",
      "--code", "BOSTON26",
    ),
  );
  assert.equal(`${url.origin}${url.pathname}${url.search}`, "https://fitafnutrition.com/order?mpid=21");
  assert.match(url.hash, /^#fitaf=[A-Za-z0-9_-]+$/);
  assert.deepEqual(JSON.parse(Buffer.from(url.hash.slice(7), "base64url").toString("utf8")), {
    v: 1,
    mpid: 21,
    items: [
      { name: "Birria de Res Bowl", qty: 2, pid: 1353 },
      { name: "Jalapeño Lime Chicken", qty: 5 },
    ],
    code: "BOSTON26",
  });
});

test("R2-13b: fill A accepts a link the tool printed", async () => {
  const url = new URL(link("--mpid", "21", "--item", "Birria de Res Bowl:7", "--pid-for", "Birria de Res Bowl=1353"));
  const h = fakeWindow({ path: url.pathname + url.search, fragment: url.hash });
  run(await script("A"), h.window);
  const [line] = JSON.parse(h.storage.getItem(CART_KEY));
  assert.deepEqual([line.name, line.quantity, line.productId], ["Birria de Res Bowl", 7, 1353]);
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
  ["a meal twice", ["--mpid", "21", "--item", "Birria de Res Bowl:3", "--item", "Birria de Res Bowl:4"], /named twice/],
  ["--pid-for a meal not in the payload", ["--mpid", "21", "--item", B7, "--pid-for", "Nope=1"], /which no --item names/],
  ["a bad code", ["--mpid", "21", "--item", B7, "--code", "NO SPACES"], /--code must match/],
  ["over 2 KB", ["--mpid", "21", "--item", `${"x".repeat(1600)}:7`], /refuses over 2048/],
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
