// R2-25 (SPEC-rung2 § 11 item 2): a meal's key is 32-bit FNV-1a over the UTF-8 bytes of its name as the page shows it
// (whitespace collapsed and trimmed), in base 36, its last 5 characters (the value modulo 36^5). ONE function, ONE
// source (src/storefront/meal-key.js): the link tool imports it and the build inlines its text into the shipped
// script. Pinned here: FNV-1a's own published vectors for the reference; fixed names -> fixed keys; whitespace; a
// key shorter than 5 base-36 digits (written with leading zeros); and that the tool and every built text carry that
// one function.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildStorefront } from "../scripts/build-storefront.mjs";
import { refFnv1a, refKey } from "./r2-harness.mjs";

const { mealKey } = await import("../src/storefront/meal-key.js");
const tool = await import("../scripts/handoff-link.mjs");

/** FNV-1a 32-bit test vectors, as published with the algorithm (isthe.com/chongo/tech/comp/fnv). */
const FNV_VECTORS = [
  ["", 0x811c9dc5n],
  ["a", 0xe40c292cn],
  ["foobar", 0xbf9cf968n],
];

/** Fixed names -> fixed keys. The seven are the 7-meal Lean link of § 11 item 1, whose example keys they are. */
const PINNED = [
  ["Birria de Res Bowl", "t1fkl"],
  ["Buffalo Chicken Sliders", "8avab"],
  ["Italian Chicken Trio", "ihshe"],
  ["Elk Chili", "1i5s0"],
  ["Chipotle Chicken Mac & Cheese", "tyv72"],
  ["BBQ Pulled Pork Mac & Cheese", "rgr2m"],
  ["Mediterranean Chicken Quesadilla", "6uf54"],
  ["Chicken Pesto Pasta", "eh97u"],
  ["Jalapeño Lime Chicken", "j6tzd"],
  // Its hash is under 36^4, four base-36 digits ("krtn"): the key is written with a leading zero, five characters.
  ["Short Key 10", "0krtn"],
];

test("R2-25a: the reference is FNV-1a (its published vectors)", () => {
  for (const [text, hash] of FNV_VECTORS) assert.equal(refFnv1a(text), hash, JSON.stringify(text));
});

test("R2-25b: fixed names give fixed keys, from the shipped function and the reference alike", () => {
  for (const [name, key] of PINNED) {
    assert.equal(refKey(name), key, `reference: ${name}`);
    assert.equal(mealKey(name), key, `mealKey: ${name}`);
  }
  assert.equal(refFnv1a("Short Key 10").toString(36), "krtn", "fixture control: a hash of four base-36 digits");
});

test("R2-25c: a title's whitespace, collapsed and trimmed as fill B reads it, gives the name's key", () => {
  const key = mealKey("Chicken Pesto Pasta");
  for (const title of ["Chicken   Pesto\n          Pasta", "  Chicken Pesto Pasta  ", "\tChicken Pesto Pasta\n"]) {
    assert.equal(mealKey(title), key, JSON.stringify(title));
  }
  assert.notEqual(mealKey("ChickenPesto Pasta"), key, "whitespace collapsed, not removed");
  assert.notEqual(mealKey("chicken pesto pasta"), key, "case is kept");
});

test("R2-25d: the shipped function agrees with the reference on 5,000 names, ASCII and not", () => {
  const letters = "aé ñB1ç漢 -&'";
  for (let i = 0; i < 5000; i++) {
    let name = `Meal ${i} `;
    for (let j = 0; j < i % 23; j++) name += letters[(i * 7 + j * 13) % letters.length];
    assert.equal(mealKey(name), refKey(name), JSON.stringify(name));
    assert.match(mealKey(name), /^[0-9a-z]{5}$/);
  }
});

test("R2-25e: one source — the link tool's key function IS the module's, and every built text carries its text", async () => {
  assert.equal(tool.mealKey, mealKey, "handoff-link.mjs re-exports the module's own function");
  const out = await mkdtemp(join(tmpdir(), "boston-storefront-"));
  try {
    await buildStorefront({ outDir: out });
    const source = mealKey.toString();
    for (const name of ["fitaf-handoff.html", "fitaf-handoff.fill-B.console.js"]) {
      const text = await readFile(join(out, name), "utf8");
      assert.equal(text.split(source).length, 2, `${name}: the function's text, exactly once`);
    }
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
