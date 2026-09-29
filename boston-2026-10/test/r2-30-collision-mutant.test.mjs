// R2-30 (SPEC-rung2 § 11): R2-26 bites. A mutant of the shipped fill-B text that presses the FIRST card whose key
// matches and ignores a second fails R2-26's case (collisionCase in r2-harness.mjs). The mutant is made IN MEMORY
// from the shipped text; no file is edited. The control: the unmutated text passes the same case.
import test from "node:test";
import assert from "node:assert/strict";
import { collisionCase, script } from "./r2-harness.mjs";

/** The shipped text's refusal of a second card with the link's key (§ 11 item 3). */
const REFUSAL = 'if (c[1]) fail("two meals share a key: " + k);';

test("R2-30 control: the shipped fill-B text passes R2-26's case", async () => {
  const text = await script("B");
  assert.equal(text.split(REFUSAL).length, 2, "the refusal the mutant removes is in the shipped text, once");
  await collisionCase(text);
});

test("R2-30 mutant: fill B presses the first card whose key matches and ignores a second — R2-26 fails", async () => {
  const text = await script("B");
  const mutant = text.replace(REFUSAL, "");
  assert.notEqual(mutant, text, "the mutation applied");
  await assert.rejects(collisionCase(mutant), (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    return true;
  });
});
