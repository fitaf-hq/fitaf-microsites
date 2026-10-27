// EL4 (SPEC-ui-and-copy-pass.md § 8 item 4, "the ended form"): an E1 sent after its offer's last day keeps "This offer has
// ended" under the button, and its button reads See my offer (the draft's words), since Claim would be false (⬜ the
// orchestrator's default, put to the Advisor). Before that day the button is Claim my offer and the line the date held.
import test from "node:test";
import assert from "node:assert/strict";
import { lineTexts } from "./email-html.mjs";
import { sampleE1s } from "./email-fixture.mjs";
import { bandExpected, CLAIM, ENDED, SEE } from "./el-fixtures.mjs";

const band = await bandExpected();
const { e1_held_ended: ended, e1_held_unticked: held } = sampleE1s();

test("EL4: ended, the button reads See my offer and the line under it This offer has ended; no Claim, no date held", () => {
  const lines = lineTexts(ended.html);
  const at = band.lines.length;
  assert.deepEqual(lines.slice(at, at + 2), [SEE, ENDED], "the button, then the line under it");
  for (const part of [ended.text, ended.html]) {
    assert.doesNotMatch(part, /claim/i, "no Claim anywhere");
    assert.doesNotMatch(part, /held until/i, "no date held");
  }
  assert.ok(ended.text.split("\n").includes(ENDED));
});

test("EL4: not ended, the button reads Claim my offer, the line under it the date held, and no See my offer", () => {
  const lines = lineTexts(held.html);
  const at = band.lines.length;
  assert.deepEqual(lines.slice(at, at + 2), [CLAIM, "Your pricing is held until October 29, 2026"]);
  for (const part of [held.text, held.html]) {
    assert.ok(!part.includes(SEE), "no See my offer");
    assert.ok(!part.includes(ENDED));
  }
});
