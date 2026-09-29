// R2-23 (SPEC-rung2 § 10): R2-19 bites. Mutants of the shipped fill-B text fail R2-19's case (heldCase in
// r2-harness.mjs): the emptiness check removed (§ 10's own case), and the check narrowed to ENABLED controls only
// (so the store's disabled "Add N more" would read as an empty plan). A third mutant pins where the check runs: made
// only once every meal is found, it passes R2-19 and fails R2-22's reload (reloadCase), because on the store's page a
// meal already chosen shows its counter, not Add to Cart, so that point is never reached. The mutants are made IN
// MEMORY from the shipped text; no file is edited. The controls: the unmutated text passes the same cases.
import test from "node:test";
import assert from "node:assert/strict";
import { heldCase, reloadCase, script } from "./r2-harness.mjs";

/** The shipped text's emptiness check, as § 10 builds it, and the press it must come before. */
const CHECK = 'if (control(HELD, 1)) fail("the plan already holds meals");';
const FOUND = "if (!missing.length) return press(steps(p.items), 0);";
const MUTANTS = {
  "the emptiness check removed": "",
  "the check reads enabled controls only": 'if (control(HELD)) fail("the plan already holds meals");',
};

const rejectsWithAssertion = (promise) =>
  assert.rejects(promise, (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    return true;
  });

for (const width of ["bar", "sidebar"]) {
  test(`R2-23 control ${width}: the shipped fill-B text passes R2-19's and R2-22's cases`, async () => {
    const text = await script("B");
    assert.ok(text.includes(CHECK), "the check the mutants replace is in the shipped text");
    await heldCase(text, { width });
    await reloadCase(text, { width });
  });

  for (const [how, replacement] of Object.entries(MUTANTS)) {
    test(`R2-23 mutant ${width}: ${how} — R2-19 fails`, async () => {
      const text = await script("B");
      const mutant = text.replace(CHECK, replacement);
      assert.notEqual(mutant, text, "the mutation applied");
      await rejectsWithAssertion(heldCase(mutant, { width }));
    });
  }

  test(`R2-23 mutant ${width}: the check made only once every meal is found — R2-19 passes, R2-22 fails`, async () => {
    const text = await script("B");
    assert.ok(text.includes(FOUND), "the press the check moves before is in the shipped text");
    const mutant = text.replace(CHECK, "").replace(FOUND, `if (!missing.length) { ${CHECK} return press(steps(p.items), 0); }`);
    assert.notEqual(mutant, text, "the mutation applied");
    await heldCase(mutant, { width });
    await rejectsWithAssertion(reloadCase(mutant, { width, afterFirstPress: "stepper" }));
  });
}
