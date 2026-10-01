// R2-18 (SPEC-rung2 § 8): R2-15 bites. A mutant of the shipped fill-B text that ends as the build before § 8 did —
// removing the fragment and loading /checkout itself — fails R2-15's case. The mutants are made IN MEMORY from the
// shipped text; no file is edited. The control: the unmutated text passes the same case.
import test from "node:test";
import assert from "node:assert/strict";
import { checkoutCase, script } from "./r2-harness.mjs";

/** The shipped text's last step of the meal presses (fill C's units: SPEC-rung2-fill-c § 1): from here, the settled
 * read and then § 8's own finish. */
const FINISH = "if (k === list.length) return then(p);";
const MUTANTS = {
  "location.assign": '{ drop(); return loc.assign("/checkout"); }',
  "location.href": '{ drop(); loc.href = "/checkout"; return; }',
};

test("R2-18 control: the shipped fill-B text passes R2-15's case", async () => {
  const text = await script();
  assert.ok(text.includes(FINISH), "the finish the mutants replace is in the shipped text");
  await checkoutCase(text);
});

for (const [how, finish] of Object.entries(MUTANTS)) {
  test(`R2-18 mutant: fill B navigates by ${how}("/checkout") again — R2-15 fails`, async () => {
    const text = await script();
    const mutant = text.replace(FINISH, `if (k === list.length) ${finish}`);
    assert.notEqual(mutant, text, "the mutation applied");
    await assert.rejects(checkoutCase(mutant), (err) => {
      assert.ok(err instanceof assert.AssertionError, String(err));
      return true;
    });
  });
}
