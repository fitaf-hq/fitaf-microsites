// EL1 (SPEC-ui-and-copy-pass.md § 8, "the E1 goldens (HTML and text) moved, named; … E-X byte-identical"): E-X's two
// parts are byte for byte what 6e0d86f (the tree before § 8's code) rendered from the same inputs, and E1's two parts are
// the record of § 8's code (test/el-golden.json, written by test/el-record.mjs). E1's move is named here: every E1 sample
// differs from its `before`, in both parts.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SAMPLE, sampleMessages } from "./email-fixture.mjs";

const golden = JSON.parse(await readFile(new URL("./el-golden.json", import.meta.url), "utf8"));
const BEFORE = "6e0d86f";

test("EL1: E-X, text and HTML, byte-identical to the tree before § 8 (6e0d86f), from the same inputs", () => {
  assert.equal(golden.before?.recorded_at, BEFORE, "control: `before` is 6e0d86f's record");
  assert.deepEqual(golden.before.inputs, SAMPLE, "control: recorded from the same sample inputs");
  const { ex } = sampleMessages();
  assert.ok(golden.before.messages.ex.text.length > 100 && golden.before.messages.ex.html.length > 1000, "control: a whole E-X");
  assert.equal(Buffer.compare(Buffer.from(ex.text), Buffer.from(golden.before.messages.ex.text)), 0, "E-X's text part, byte for byte");
  assert.equal(Buffer.compare(Buffer.from(ex.html), Buffer.from(golden.before.messages.ex.html)), 0, "E-X's HTML part, byte for byte");
});

test("EL1: E1, text and HTML, is § 8's record (`after`), and every E1 sample moved from `before` in both parts", () => {
  assert.ok(golden.after, "the record of § 8's code exists (node test/el-record.mjs --commit <code> --section after)");
  assert.deepEqual(golden.after.inputs, SAMPLE, "control: recorded from the same sample inputs");
  assert.notEqual(golden.after.recorded_at, BEFORE);
  const now = sampleMessages();
  const e1s = Object.keys(now).filter((n) => n.startsWith("e1_"));
  assert.equal(e1s.length, 6, "control: the six E1 samples");
  assert.equal(Buffer.compare(Buffer.from(golden.after.messages.ex.html), Buffer.from(golden.before.messages.ex.html)), 0, "`after`'s E-X is `before`'s");
  for (const name of e1s) {
    assert.equal(now[name].text, golden.after.messages[name].text, `${name}: the text part, as recorded`);
    assert.equal(now[name].html, golden.after.messages[name].html, `${name}: the HTML part, as recorded`);
    assert.notEqual(golden.after.messages[name].text, golden.before.messages[name].text, `${name}: the text part moved`);
    assert.notEqual(golden.after.messages[name].html, golden.before.messages[name].html, `${name}: the HTML part moved`);
  }
});
