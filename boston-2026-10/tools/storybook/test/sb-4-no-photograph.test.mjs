// SB-4 (SPEC-storybook.md § 3 item 3): no photograph. No image file is tracked (or waiting to be) under tools/storybook/
// (the mock-ups' P1 rule, extended), and no story names an image file: the stand-in cards' photos are placeholders
// made at run time.
import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { filesUnder, read, TOOL, toolFiles } from "./paths.mjs";

const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|tiff?|heic)$/i;

test("SB-4: no image file under tools/storybook; the stories name none, and make their placeholders at run time", async () => {
  const files = toolFiles();
  assert.ok(files.length > 0, "fixture control: the tool's files were listed");
  assert.deepEqual(files.filter((f) => IMAGE.test(f)), [], "no image file");
  const stories = (await Promise.all((await filesUnder(join(TOOL, "stories"))).map(read))).join("\n");
  assert.doesNotMatch(stories, /["'`][^"'`]*\.(png|jpe?g|gif|webp|avif)["'`]/i, "no story names an image file");
  assert.match(stories, /data:image\/svg\+xml/, "the placeholders are made at run time");
});
