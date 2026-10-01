// R2-14: the full-plan rule. The store's order page will not check out short of the plan's weekly count
// ("Please add at least 7 meals to continue" — the one-browser run, 2026-09-29, fill B, mpid 21: 2 of 7 were
// added, /checkout opened, and the checkout failed). So the sum of the payload's counts must EQUAL the plan's
// meals_per_week in data/plans.json, or the payload is refused before any press, by fill B, and a visitor's own cart is
// left as it was. The plan is the page's own ?mpid= (payload version 2, SPEC-rung2 § 11).
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { loadPlans } from "./helpers.mjs";
import {
  assertCheckedOut,
  assertRefused,
  CART_KEY,
  FakeStorage,
  fakeWindow,
  fragmentFor,
  MEALS,
  orderPage,
  run,
  script,
} from "./r2-harness.mjs";

const payload = (mpid, counts) => ({
  mpid,
  items: counts.map((qty, i) => ({ name: MEALS[i], qty })),
});
const VISITOR_CART = JSON.stringify([{ localId: "36688", name: "a visitor's own line" }]);

async function outcome(fill, p) {
  const path = `/order?mpid=${p.mpid}`;
  const storage = new FakeStorage({ [CART_KEY]: VISITOR_CART });
  const before = storage.dump();
  const page = await orderPage();
  const h = fakeWindow({ path, fragment: fragmentFor(p), storage, page });
  run(await script(), h.window); // `fill` names the case only: one fill is built (SPEC-rung2-fill-c § 2b)
  h.timers.drain();
  return { h, path, page, written: storage.dump() !== before };
}

test("R2-14a fill B: 2 of 7 (the one-browser run's link) is refused; nothing pressed or written", async () => {
  const { h, path, page, written } = await outcome("B", payload(21, [1, 1]));
  assertRefused(h, path, /the plan needs 7 meals; the link has 2/);
  assert.equal(page.total(), 0, "nothing pressed");
  assert.equal(written, false, "nothing written");
});

test(`R2-14b fill B: 8 of 7 is refused too — the rule is EQUAL, not "at least"`, async () => {
  const { h, path, page, written } = await outcome("B", payload(21, [5, 3]));
  assertRefused(h, path, /the plan needs 7 meals; the link has 8/);
  assert.equal(page.total(), 0);
  assert.equal(written, false);
});

test("R2-14c fill B: exactly 7 of 7 passes the rule (B fills the cart)", async () => {
  const { h, path, page } = await outcome("B", payload(21, [2, 5]));
  assert.equal(h.url.hash, "");
  assert.ok(!h.info.some((line) => /the plan needs/.test(line)), "not refused by the count");
  assertCheckedOut(h, page, path);
  assert.equal(page.total(), 7);
});

test("R2-14d: every plan's own count passes the rule, individual and Family, from data/plans.json", async () => {
  const plans = await loadPlans();
  const cells = [...plans.individual, plans.family].flatMap((plan) => plan.counts);
  assert.equal(cells.length, 16);
  for (const cell of cells) {
    const { h, page } = await outcome("B", payload(cell.mpid, [cell.meals_per_week]));
    assertCheckedOut(h, page, `/order?mpid=${cell.mpid}`);
    assert.equal(page.total(), cell.meals_per_week, `mpid ${cell.mpid}`);
  }
});

test("R2-14e: a Family payload of 1 passes the rule", async () => {
  const b = await outcome("B", payload(35, [1]));
  assertCheckedOut(b.h, b.page, "/order?mpid=35");
});

test("R2-14f: Family with 2 is refused by the count", async () => {
  const { h, path, page } = await outcome("B", payload(35, [2]));
  assertRefused(h, path, /the plan needs 1 meals; the link has 2/);
  assert.equal(page.total(), 0);
});

test("R2-14g: an mpid with no plan in data/plans.json is refused (no count to meet)", async () => {
  const { h, path, page } = await outcome("B", payload(99, [7]));
  assertRefused(h, path, /unknown mpid 99/);
  assert.equal(page.total(), 0);
});

test("R2-14h: the link tool refuses the same mismatch, with the same message, and prints no link", () => {
  const tool = join(ROOT, "scripts", "handoff-link.mjs");
  const args = ["--mpid", "21", "--item", `${MEALS[0]}:1`, "--item", `${MEALS[1]}:1`];
  const r = spawnSync(process.execPath, [tool, ...args], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.equal(r.stdout, "");
  assert.match(r.stderr, /handoff:link: the plan needs 7 meals; the link has 2/);
  const ok = spawnSync(process.execPath, [tool, "--mpid", "21", "--item", `${MEALS[0]}:2`, "--item", `${MEALS[1]}:5`], {
    encoding: "utf8",
  });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /^https:\/\/fitafnutrition\.com\/order\?mpid=21#fitaf=/);
});
