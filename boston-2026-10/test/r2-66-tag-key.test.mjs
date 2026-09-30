// R2-66 (SPEC-rung2-progress-and-checkout § 15.1): the key ignores a leading marketing tag. The store dropped a "🟠NEW:"
// tag from two meal names mid-week (the live check of 2026-09-30), so their keys stopped matching and fill B refused
// them. mealKey (src/storefront/meal-key.js, the one function the link tool and the shipped script carry) now removes a
// leading tag before it collapses whitespace and hashes: an emoji (a UTF-16 surrogate pair, or one character in
// U+2600–U+27BF), optional space, an uppercase word of 2 to 12 letters, optional space, a colon, and the space after it.
//   R2-66a  a tagged name and the name without its tag share one key; it is the reference's (r2-harness.mjs refKey,
//           whose tag rule, refUntagged, reads the name by code point, not by the shipped pattern) for both;
//   R2-66b  a name without a tag keys EXACTLY as before (the key of § 11 alone, `before` below): R2-25's pinned
//           vectors, and look-alikes that are not tags
//           ("Smart Oats: Almond Joy" keeps its words; no emoji; lower case; one letter; thirteen; not leading; no colon;
//           no space after the colon; an emoji outside the contract's range);
//   R2-66c  the link tool, run as a program, writes the untagged name's key for a tagged name; and the SHIPPED script
//           presses a card that shows the tag from a link written without it, and a card without it from a link the
//           tool wrote with it: the link tool and the shipped script agree;
//   ⭐ mutant: the tag strip dropped, in a copy of meal-key.js imported from a temporary directory and in the shipped
//           text (its key function's text replaced): R2-66 fails. No file in the repository is edited.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../build.mjs";
import { mealKey } from "../src/storefront/meal-key.js";
import { ADD, assertCheckedOut, CHECKOUT_PAYLOAD, fakeWindow, fragmentFor, MEALS, orderPage, refFnv1a, refKey, run, script } from "./r2-harness.mjs";

const KEY_MODULE = join(ROOT, "src", "storefront", "meal-key.js");
const TOOL = join(ROOT, "scripts", "handoff-link.mjs");
/** The contract's example (§ 15.1). */
const NAME = "Blackened Chicken Caesar Salad";
/** The two ends of the contract's character range, U+2600 and U+27BF, and a surrogate pair outside it. */
const [SUN, LOOP] = [0x2600, 0x27bf].map((c) => String.fromCodePoint(c));

/** Tags the contract's definition covers, each before a name. */
const TAGGED = [
  (n) => `🟠NEW: ${n}`,
  (n) => `🟠 NEW : ${n}`,
  (n) => `🟠NEW:\n   ${n}`,
  (n) => `  🟠NEW:   ${n}  `,
  (n) => `🔥LIMITED: ${n}`,
  (n) => `🟠ABCDEFGHIJKL: ${n}`,
  (n) => `${SUN}HOT: ${n}`,
  (n) => `${LOOP}AB: ${n}`,
  (n) => `✅SALE: ${n}`,
];
/** Names that are not tagged by that definition: each keys exactly as the reference keys it, tag-like text and all. */
const NOT_TAGGED = [
  "Smart Oats: Almond Joy",
  `NEW: ${NAME}`,
  `🟠 ${NAME}`,
  `🟠new: ${NAME}`,
  `🟠N: ${NAME}`,
  `🟠ABCDEFGHIJKLM: ${NAME}`,
  `Salad 🟠NEW: ${NAME}`,
  `🟠NEW ${NAME}`,
  `🟠NEW:${NAME}`,
  `⭐NEW: ${NAME}`,
];
/** R2-25's pinned vectors (SPEC-rung2 § 11): the 7-meal Lean link's keys, and a four-digit hash written with a zero. */
const PINNED = [
  ["Birria de Res Bowl", "t1fkl"],
  ["Buffalo Chicken Sliders", "8avab"],
  ["Italian Chicken Trio", "ihshe"],
  ["Elk Chili", "1i5s0"],
  ["Chipotle Chicken Mac & Cheese", "tyv72"],
  ["BBQ Pulled Pork Mac & Cheese", "rgr2m"],
  ["Mediterranean Chicken Quesadilla", "6uf54"],
  ["Short Key 10", "0krtn"],
];

/** The key as SPEC-rung2 § 11 alone defines it, before § 15.1: the name collapsed and trimmed, tag and all. */
const before = (name) => (refFnv1a(name.replace(/\s+/g, " ").trim()) % 36n ** 5n).toString(36).padStart(5, "0");

/** R2-66a over `key`: every tagged form keys as the name without its tag, and as the reference keys the tagged form. */
function tagsIgnored(key) {
  for (const name of [NAME, ...MEALS]) {
    assert.equal(key(name), before(name), `fixture control: ${name}, untagged, keys as before`);
    for (const tag of TAGGED) {
      assert.equal(key(tag(name)), key(name), `${JSON.stringify(tag(name))}: the untagged name's key`);
      assert.equal(refKey(tag(name)), key(name), `${JSON.stringify(tag(name))}: the reference agrees`);
    }
  }
}

test("R2-66a: a leading tag is ignored: \"🟠NEW: X\" and \"X\" share one key, the reference's key for X", () => {
  assert.equal(mealKey(`🟠NEW: ${NAME}`), mealKey(NAME), "the contract's example");
  tagsIgnored(mealKey);
});

test("R2-66b: a name without a tag keys as before: R2-25's vectors, and look-alikes that are not tags keep their words", () => {
  for (const [name, key] of PINNED) assert.equal(mealKey(name), key, name);
  for (const name of NOT_TAGGED) {
    assert.equal(mealKey(name), before(name), `not a tag, so keyed as before: ${JSON.stringify(name)}`);
    assert.equal(refKey(name), before(name), `and the reference agrees: ${JSON.stringify(name)}`);
  }
  assert.notEqual(mealKey("Smart Oats: Almond Joy"), mealKey("Almond Joy"), "\"Smart Oats\" is kept (no emoji: not a tag)");
});

/** Fill B on the synthetic page, the first card's title shown as `title`, the link's fragment `fragment`. */
async function fillWith(text, { title = null, fragment = fragmentFor(CHECKOUT_PAYLOAD) } = {}) {
  const page = await orderPage();
  if (title) page.document.querySelector("app-product-card .product__content-title").textContent = title;
  const h = fakeWindow({ fragment, page });
  run(text, h.window);
  h.timers.drain();
  const shown = title ?? MEALS[0];
  assert.deepEqual(Object.fromEntries(page.presses), { [shown]: [ADD], [MEALS[1]]: [ADD, ADD], [MEALS[2]]: [ADD, ADD, ADD, ADD] }, JSON.stringify(h.info));
  assertCheckedOut(h, page, "/order?mpid=21");
}

const tool = (...args) => execFileSync(process.execPath, [TOOL, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

test("R2-66c: the link tool and the shipped script agree — a tagged name keys as its name without the tag in both", async () => {
  const tagged = `🟠NEW: ${MEALS[0]}`;
  const out = tool("--mpid", "21", "--item", `${tagged}:1`, "--item", `${MEALS[1]}:2`, "--item", `${MEALS[2]}:4`);
  const link = new URL(out.split("\n")[0]);
  assert.equal(link.hash, fragmentFor(CHECKOUT_PAYLOAD), "the tool writes the untagged name's key for the tagged name");
  assert.equal(refKey(tagged), refKey(MEALS[0]), "fixture control: the reference keys them alike");
  assert.match(out, new RegExp(`${before(MEALS[0])}\\s+${tagged}`), "and prints the name beside its key as it was given");
  const text = await script();
  await fillWith(text, { title: tagged }); // the page shows the tag; the link was written without it
  await fillWith(text, { fragment: link.hash }); // the link was written with the tag; the page no longer shows it
});

/** mealKey's text with the tag strip (its first `.replace(/^`) removed: the key as it was before § 15.1. */
function withoutStrip(source) {
  const at = source.indexOf(".replace(/^");
  assert.ok(at >= 0, "the tag strip the mutant removes is in the key function");
  const end = source.indexOf('"")', at) + '"")'.length;
  const strip = source.slice(at, end);
  assert.match(strip, /\[A-Z\]\{2,12\}/, `the strip is the tag's: ${strip}`);
  return source.slice(0, at) + source.slice(end);
}

const failsWithAssertion = (err) => {
  assert.ok(err instanceof assert.AssertionError, String(err));
  return true;
};

test("R2-66 (mutant): the tag strip dropped — in meal-key.js and in the shipped text — R2-66 fails", async () => {
  const dir = await mkdtemp(join(tmpdir(), "boston-r2-66-"));
  try {
    const copy = join(dir, "meal-key.js");
    await writeFile(copy, withoutStrip(await readFile(KEY_MODULE, "utf8")));
    const mutant = (await import(pathToFileURL(copy).href)).mealKey;
    for (const [name, key] of PINNED) assert.equal(mutant(name), key, `fixture control: the mutant keys ${name} as before`);
    assert.throws(() => tagsIgnored(mutant), failsWithAssertion);

    const text = await script();
    assert.equal(text.split(mealKey.toString()).length, 2, "the shipped text carries the key function once");
    const shipped = text.replace(mealKey.toString(), () => mutant.toString());
    assert.notEqual(shipped, text, "the mutation applied");
    await fillWith(text, { title: `🟠NEW: ${MEALS[0]}` }); // control
    await assert.rejects(fillWith(shipped, { title: `🟠NEW: ${MEALS[0]}` }), failsWithAssertion);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
