// SM-7 (SPEC-storybook-microsite.md § 5, SB-4's rule): no photograph. No image file is tracked, or waiting to be, under
// tools/storybook/. The page's logo and QR codes reach the stories only through the site's build, into git-ignored
// directories (node_modules/.cache/ and storybook-static/), never as a file of this package.
import test from "node:test";
import assert from "node:assert/strict";
import { toolFiles } from "./paths.mjs";

const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|tiff?|heic)$/i;

test("SM-7: no image file tracked under tools/storybook", () => {
  const files = toolFiles();
  assert.ok(files.includes("package.json"), "fixture control: the tool's files were listed");
  assert.deepEqual(files.filter((f) => IMAGE.test(f)), [], "no image file");
});
