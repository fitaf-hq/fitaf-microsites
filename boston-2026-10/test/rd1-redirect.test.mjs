// RD1 and RD1b (SPEC-the-redirect.md § 1 items 3 and 5, § 2, § 7): with REDIRECT_TO the store's front page, GET "/" (any
// query) on either Worker, on eatfitaf.com and www, is a 302 whose Location is exactly § 2's (the marker and no other
// parameter, no "#"), Cache-Control no-store, no Set-Cookie, no body; HEAD "/" the same Location; the assets never asked.
// The var with a query of its own takes the marker after "&". On production's Worker (as committed, `production` true,
// and with `production` false, the rollback) and the development Worker; and as wrangler.jsonc configures both (its own
// translation, the real asset router: "/" reaches the script), the var as configured there, in both environments. The
// check is rd-checks.mjs's, which the mutants "a 301" and "the visitor's query passed through" run on a mirror.
import test from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { productionFalseMirror } from "./cc-harness.mjs";
import { locationProblems } from "./rd-checks.mjs";

test("RD1: GET and HEAD / on both Workers and both hosts: the 302 to the store with § 2's marker and nothing else; RD1b: a var with a query", async () => {
  assert.deepEqual(await locationProblems(), []);
});

test("RD1: production's Worker with production false (the rollback) does the same", async () => {
  const falseRoot = await productionFalseMirror();
  try {
    assert.deepEqual(await locationProblems(falseRoot, ["site"]), []);
  } finally {
    await rm(falseRoot, { recursive: true, force: true });
  }
});
