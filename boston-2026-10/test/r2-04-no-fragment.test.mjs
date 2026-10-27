// R2-04: a page without `#fitaf=` costs one read of location.hash and nothing else (SPEC-rung2 § 6): no storage,
// no timer, no listener, no request, no marker, no log line; and, since rung 2's two faces
// (SPEC-rung2-progress-and-checkout § 4), no element, no style and no class either. The stub window throws on ANY
// property but `location`, and its location throws on any property but `hash`; every touch is recorded.
// The mutant cases show the stub bites: a text that touches any one of the named APIs first fails here. R2-40 runs
// the same text on a real document and compares it byte for byte.
// SPEC-rung2-progress-and-checkout § 36 (2026-10-27): the shipped text is the hand-off's followed by the struck prices'
// (item 9), and the hand-off's rule is the HAND-OFF's: R2-04 and its mutants run the hand-off's own text (handoffScript).
// R2-04b holds the shipped text to item 1: an ordinary visit costs the hand-off's one read of location.hash, then the
// struck prices' one read of the address (the navigation entry) and one of sessionStorage (fitaf_struck), nothing else.
import test from "node:test";
import assert from "node:assert/strict";
import { handoffScript, run, script } from "./r2-harness.mjs";

/**
 * The APIs the contracts name; the stub throws on these and on everything else too. From `document` on, the ones an
 * element, a style, a class, a timer or a motion query of the progress screen and the stripped checkout would need
 * (SPEC-rung2-progress-and-checkout § 4: "no element, no style, no class, no timer").
 */
const NAMED = [
  "localStorage",
  "sessionStorage",
  "setTimeout",
  "setInterval",
  "addEventListener",
  "fetch",
  "XMLHttpRequest",
  "document",
  "requestAnimationFrame",
  "matchMedia",
  "getComputedStyle",
  "MutationObserver",
  "clearTimeout",
];

function throwingWindow(hash) {
  const touched = [];
  const refuse = (what) => {
    throw new Error(`touched ${what}`);
  };
  const location = new Proxy(
    { hash },
    {
      get(target, key) {
        touched.push(`location.${String(key)}`);
        return key === "hash" ? target.hash : refuse(`location.${String(key)}`);
      },
      set: (_, key) => refuse(`location.${String(key)} (write)`),
    },
  );
  const window = new Proxy(
    {},
    {
      get(_, key) {
        touched.push(String(key));
        return key === "location" ? location : refuse(String(key));
      },
      set: (_, key) => refuse(`${String(key)} (write)`),
      has: (_, key) => refuse(`${String(key)} (in)`),
      defineProperty: (_, key) => refuse(`${String(key)} (define)`),
    },
  );
  return { window, touched };
}

// Hashes an ordinary visitor (or the store itself) may carry; none begins "#fitaf=".
const ORDINARY = ["", "#", "#lean-7", "#fitaf", "#FITAF=eyJ2IjoxfQ", "#xfitaf=eyJ2IjoxfQ", "#top#fitaf=eyJ2IjoxfQ"];

for (const hash of ORDINARY) {
  test(`R2-04 fill B, hash ${JSON.stringify(hash)}: one read of location.hash, then return`, async () => {
    const { window, touched } = throwingWindow(hash);
    run(await handoffScript(), window);
    assert.deepEqual(touched, ["location", "location.hash"]);
  });
}

/** A window that records every touch and answers only what an ordinary visit's two reads need. */
function recordingWindow(hash, entry = "https://fitafnutrition.com/meal-plans") {
  const touched = [];
  const calls = [];
  const location = new Proxy({ hash, href: entry }, { get: (t, k) => (touched.push(`location.${String(k)}`), t[k]) });
  const performance = { getEntriesByType: (t) => (calls.push(["getEntriesByType", t]), [{ name: entry }]) };
  const sessionStorage = { getItem: (k) => (calls.push(["getItem", k]), null), setItem: (k) => calls.push(["setItem", k]) };
  const members = { location, performance, sessionStorage };
  const window = new Proxy({}, { get: (_, k) => (touched.push(String(k)), members[k]) });
  return { window, touched, calls };
}

for (const hash of ORDINARY) {
  test(`R2-04b the shipped text, hash ${JSON.stringify(hash)}: location.hash, then one read of the address and one of sessionStorage`, async () => {
    const { window, touched, calls } = recordingWindow(hash);
    run(await script(), window);
    assert.deepEqual(touched, ["location", "location.hash", "performance", "sessionStorage"]);
    assert.deepEqual(calls, [["getEntriesByType", "navigation"], ["getItem", "fitaf_struck"]]);
  });
}

test("R2-04b mutant: the struck prices reading the document before their marker — R2-04b fails", async () => {
  const text = await script();
  const at = "var w = window, KEY";
  assert.equal(text.split(at).length, 2, "the mutant's site appears once");
  const { window, touched } = recordingWindow("");
  run(text.replace(at, "var w = window, X = w.document, KEY"), window);
  assert.notDeepEqual(touched, ["location", "location.hash", "performance", "sessionStorage"]);
  assert.ok(touched.includes("document"));
});

for (const api of NAMED) {
  test(`R2-04 mutant: a text that touches window.${api} before the fragment check fails on the stub`, async () => {
    const { window } = throwingWindow("");
    const text = await handoffScript();
    run(text, throwingWindow("").window); // control: the real text passes
    assert.throws(() => run(`window.${api};\n${text}`, window), new RegExp(`touched ${api}`));
  });
}
