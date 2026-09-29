import test from "node:test";
import assert from "node:assert/strict";
import { bodyOf, collapse, lineTexts, visibleText, wordingOf } from "./email-html.mjs";
import { sampleMessages } from "./email-fixture.mjs";

/** Ways an email hides a preheader (or anything else) from the reader. */
const HIDDEN = /display:\s*none|visibility:\s*hidden|mso-hide|max-height:\s*0|opacity:\s*0|font-size:\s*0/i;

test("M18: the HTML's visible text is the text part's wording, line for line and as a whole; nothing hidden (no preheader)", () => {
  for (const [name, message] of Object.entries(sampleMessages())) {
    const wording = wordingOf(message.text);
    assert.notEqual(wording, message.text, `control: ${name}'s text part has a link to remove`);
    const lines = wording.split("\n").filter(Boolean);
    assert.ok(lines.length >= 3, `control: ${name} has its lines`);
    assert.deepEqual(lineTexts(message.html), lines, `${name}: one layout row per line, the same words`);
    assert.equal(collapse(visibleText(bodyOf(message.html))), collapse(wording), `${name}: no text outside the lines`);
    assert.doesNotMatch(message.html, HIDDEN, `${name}: hidden text (the draft supplies no preheader)`);
  }
});
