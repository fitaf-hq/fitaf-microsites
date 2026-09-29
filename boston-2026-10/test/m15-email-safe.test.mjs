import test from "node:test";
import assert from "node:assert/strict";
import { bodyOf, tagsOf } from "./email-html.mjs";
import { sampleMessages } from "./email-fixture.mjs";

const FORBIDDEN = [
  [/<script\b/i, "a <script>"],
  [/<style\b/i, "a <style> block (styles are inline)"],
  [/<link\b/i, "a <link> (external CSS)"],
  [/@import\b/i, "an @import"],
  [/@font-face\b/i, "a web font"],
  [/url\(/i, "a url() (a web font or a background image)"],
  [/<(form|input|button|select|textarea|iframe)\b/i, "a form control"],
];
/** The elements that draw something: each must carry its own style attribute. */
const DRAWING = new Set(["body", "table", "td", "p", "a", "strong", "img"]);

test("M15: the HTML part is email-safe — no script, no external or embedded CSS, no web font, no form; every drawing element styled inline", () => {
  for (const [name, message] of Object.entries(sampleMessages())) {
    for (const [pattern, what] of FORBIDDEN) assert.doesNotMatch(message.html, pattern, `${name}: ${what}`);
    const tags = tagsOf(bodyOf(message.html));
    assert.ok(tags.some((t) => t.name === "table") && tags.some((t) => t.name === "img"), `control: ${name} has a layout and a logo`);
    for (const t of tags) {
      assert.equal(t.attrs.class, undefined, `${name}: <${t.name}> relies on a class (no stylesheet exists): ${t.raw}`);
      if (DRAWING.has(t.name)) assert.ok(t.attrs.style, `${name}: <${t.name}> has no inline style: ${t.raw}`);
    }
    assert.match(message.html, /<body\b[^>]*\bstyle="/, `${name}: the body is styled inline`);
  }
});
