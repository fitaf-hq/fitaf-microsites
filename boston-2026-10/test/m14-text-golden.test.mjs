import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SAMPLE, sampleMessages } from "./email-fixture.mjs";

const golden = JSON.parse(await readFile(new URL("./m14-text-golden.json", import.meta.url), "utf8"));

test("M14: the text part of E1 (ticked, unticked) and E-X is byte-identical to the golden recorded before branding", () => {
  assert.deepEqual(golden.inputs, SAMPLE, "control: the golden was recorded from the same sample inputs");
  const messages = sampleMessages();
  assert.deepEqual(Object.keys(messages).sort(), Object.keys(golden.text).sort());
  for (const [name, message] of Object.entries(messages)) {
    assert.ok(golden.text[name].length > 100, `control: the ${name} golden is a whole message`);
    assert.equal(Buffer.compare(Buffer.from(message.text), Buffer.from(golden.text[name])), 0, `${name}: the text part, byte for byte`);
  }
});
