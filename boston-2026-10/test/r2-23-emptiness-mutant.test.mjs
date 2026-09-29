// R2-23 (SPEC-rung2 § 10): R2-19 bites. Mutants of the shipped fill-B text fail R2-19's case (heldCase in
// r2-harness.mjs): the emptiness check removed (§ 10's own case), and the check narrowed to ENABLED controls only
// (so the store's disabled "Add N more" would read as an empty plan). The mutants are made IN MEMORY from the shipped
// text; no file is edited. The control: the unmutated text passes the same case.
import test from "node:test";
import assert from "node:assert/strict";
import { heldCase, script } from "./r2-harness.mjs";

/** The shipped text's emptiness check, as § 10 builds it. */
const CHECK = 'if (control(HELD, 1)) fail("the plan already holds meals");';
const MUTANTS = {
  "the emptiness check removed": "",
  "the check reads enabled controls only": 'if (control(HELD)) fail("the plan already holds meals");',
};

for (const width of ["bar", "sidebar"]) {
  test(`R2-23 control ${width}: the shipped fill-B text passes R2-19's case`, async () => {
    const text = await script("B");
    assert.ok(text.includes(CHECK), "the check the mutants replace is in the shipped text");
    await heldCase(text, { width });
  });

  for (const [how, replacement] of Object.entries(MUTANTS)) {
    test(`R2-23 mutant ${width}: ${how} — R2-19 fails`, async () => {
      const text = await script("B");
      const mutant = text.replace(CHECK, replacement);
      assert.notEqual(mutant, text, "the mutation applied");
      await assert.rejects(heldCase(mutant, { width }), (err) => {
        assert.ok(err instanceof assert.AssertionError, String(err));
        return true;
      });
    });
  }
}
