// SP13 (SPEC-save-offer-production.md § 10 items 4 and 6): the production gate as the brief states it. `offers.json`
// approved means "status": "approved", each label approved, its dates, and either `code_mode: "none"` with no code field
// or a real code: the gate accepts an offer without a code and refuses one carrying a code while its code_mode is none.
// The sender `Fit AF <offers@eatfitaf.com>` is the decided sender, not a placeholder: the gate refuses only an empty
// sender or one outside eatfitaf.com. The rules are run on productionRefusals itself (sp-promise.mjs assertGateRules, which
// mutant 6 runs on a copy that still refuses the decided sender) and through the build (SP4's refusal cases, here for the
// three this section adds).
import test from "node:test";
import assert from "node:assert/strict";
import { productionRefusals } from "../scripts/production-inputs.mjs";
import { assertGateRules, DECIDED_SENDER } from "./sp-promise.mjs";
import { APPROVED_VARS, productionBuild, UNFIXED } from "./sp-production.mjs";

test("SP13: the gate — code_mode none without a code accepted, with one refused; the decided sender accepted, an empty one and one at another domain refused", async () => {
  await assertGateRules(productionRefusals);
});

test("SP13: the approved fixture sends as the decided sender (§ 10 item 4: no longer a placeholder)", () => {
  assert.equal(APPROVED_VARS.MAIL_FROM, DECIDED_SENDER);
});

test("SP13: through the build — each of § 10's refusals refuses the production build, naming it, and writes nothing", async () => {
  for (const part of ["an empty sender", "a sender outside eatfitaf.com", "a code on an offer without codes"]) {
    assert.ok(part in UNFIXED, `control: SP4 leaves ${part} unfixed in turn`);
    const { error, files } = await productionBuild({ unfixed: part });
    assert.ok(error, `${part}: the build refuses`);
    assert.match(error.message, UNFIXED[part].name, `${part}: the refusal names it`);
    assert.deepEqual(files, [], `${part}: nothing written`);
  }
});
