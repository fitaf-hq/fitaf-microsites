// SS-1 (SPEC-slideshow.md § 1 item 1): the built slideshow has no progress dots: no .dot element, no rule styling one.
import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadInputs, MOCKUPS_DIR, renderMockups } from "../mockups/build-mockups.mjs";

test("SS-1: no .dot element and no rule styling one", async () => {
  const html = renderMockups(await loadInputs({ photosDir: join(MOCKUPS_DIR, "no-such-folder") })).slideshow;
  assert.match(html, /class="slide\b/, "control: the slideshow was built");
  assert.doesNotMatch(html, /class="[^"]*\bdots?\b/, "no dot element");
  const css = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
  assert.match(css, /\.slide\b/, "control: the slideshow's stylesheet is read");
  assert.doesNotMatch(css, /\.dots?\b/, "no rule styling a dot");
});
