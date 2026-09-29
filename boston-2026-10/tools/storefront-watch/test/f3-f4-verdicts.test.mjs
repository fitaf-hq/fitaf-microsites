// F3 and F4 (SPEC-storefront-watch § 3) on recorded visits: what the one ordinary visit found, judged without a
// browser. F3: Fit AF's Footer block, by its version line and the SHA-256 of its text. F4: an ordinary visit logs
// nothing of ours and throws nothing from our block. Not one of § 6's W cases; the verdicts the visit feeds.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { footerVerdict, quietVerdict } from "../lib/footer-check.mjs";

const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");
const TEXT = '(function () {\n"use strict";\nvar w = window;\n})();\n';
const LINE = `fitaf-handoff 83836fd sha256:${sha256(TEXT)}`;
/** A script element's text as the store's injection leaves it: the Footer text between <script> and </script>. */
const injected = (line = LINE, text = TEXT) => `\n/* ${line} */\n${text}`;
const OTHER = "window.dataLayer = window.dataLayer || [];";

test("F3 before the block is placed (expected null): informational, never a flag, whatever is found", () => {
  for (const scripts of [[], [OTHER], [OTHER, injected()], [injected(), injected()]]) {
    const v = footerVerdict({ rendered: true, scripts }, null);
    assert.equal(v.flag, false);
    assert.equal(v.informational, true);
  }
  assert.deepEqual(footerVerdict({ rendered: true, scripts: [injected()] }, null).blocks.map((b) => b.versionLine), [LINE]);
});

test("F3 with an expected block: exactly one, the expected version line, its text intact: no flag", () => {
  const v = footerVerdict({ rendered: true, scripts: [OTHER, injected()] }, LINE);
  assert.equal(v.flag, false);
  assert.equal(v.blocks.length, 1);
  assert.equal(v.blocks[0].intact, true);
});

test("F3 flags: absent; more than one; another version; a text that no longer matches its version line", () => {
  const cases = {
    absent: [OTHER],
    "more than one": [injected(), injected()],
    "not the expected": [injected(`fitaf-handoff 3e77498 sha256:${sha256(TEXT)}`)],
    "does not match": [injected(LINE, TEXT.replace("var w", "var  w"))],
  };
  for (const [why, scripts] of Object.entries(cases)) {
    const v = footerVerdict({ rendered: true, scripts }, LINE);
    assert.equal(v.flag, true, why);
    assert.ok(v.summary.includes(why), `${why}: ${v.summary}`);
  }
});

test("F3: a visit on which the order page never rendered is a flag (the check could not be made), expected or not", () => {
  for (const expected of [null, LINE]) {
    const v = footerVerdict({ rendered: false, scripts: [] }, expected);
    assert.equal(v.flag, true);
    assert.match(v.summary, /could not/);
  }
});

test("F4: an ordinary visit that logs nothing of ours and throws nothing from our block: no flag", () => {
  const v = quietVerdict({
    console: ["[info] Angular is running in production mode.", "Failed to load resource: 404"],
    errors: [{ message: "TypeError: x is undefined", fromOurBlock: false }],
  });
  assert.equal(v.flag, false);
  assert.deepEqual(v.otherErrors.length, 1, "the store's own errors are reported, not flagged");
});

test("F4 flags: any [fitaf-handoff] line; any page error from our block", () => {
  assert.equal(quietVerdict({ console: ["[fitaf-handoff] stopped: not the order page"], errors: [] }).flag, true);
  assert.equal(quietVerdict({ console: [], errors: [{ message: "ReferenceError: q", fromOurBlock: true }] }).flag, true);
});
