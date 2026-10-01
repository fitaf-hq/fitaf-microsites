// R2-24 (SPEC-rung2 § 11): the short link. The link tool, run as a program, prints a payload version 2 link for R2-15's
// 7-meal case; the shipped fill-B text, given THAT link, makes exactly R2-15's presses and ends `done: /checkout`.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { CHECKOUT_PAYLOAD, checkoutCase, refKey, script } from "./r2-harness.mjs";

const TOOL = join(ROOT, "scripts", "handoff-link.mjs");
const V2_FRAGMENT = /^#fitaf=2(\.[0-9a-z]{5}(\*([2-9]|1\d|2[01]))?)+$/;

test("R2-24: the tool's v2 link for the 7-meal fixture: R2-15's presses, then done: /checkout", async () => {
  const args = ["--mpid", "21", ...CHECKOUT_PAYLOAD.items.flatMap((it) => ["--item", `${it.name}:${it.qty}`])];
  const link = new URL(execFileSync(process.execPath, [TOOL, ...args], { encoding: "utf8" }).split("\n")[0]);
  assert.equal(link.search, "?mpid=21");
  assert.match(link.hash, V2_FRAGMENT, "a v2 fragment");
  assert.equal(link.hash, `#fitaf=2.${CHECKOUT_PAYLOAD.items.map((it) => (it.qty === 1 ? refKey(it.name) : `${refKey(it.name)}*${it.qty}`)).join(".")}`);
  await checkoutCase(await script(), link.hash);
});
