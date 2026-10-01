// SM-1 (SPEC-storybook-microsite.md § 5, SB-1's rule): the tool is its own npm package. The site's package.json and
// lockfile name no Storybook package (the deploy and fitaf-infra's CI install the site, never this); tools/storybook/ has
// its own lockfile, which pins the Storybook packages § 1 names at 10.6.1.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { read, readJson, SITE, TOOL } from "./paths.mjs";

const STORYBOOK_VERSION = "10.6.1";
const STORYBOOK_PACKAGES = ["storybook", "@storybook/html-vite", "@storybook/addon-a11y", "@storybook/addon-docs"];

test("SM-1: no Storybook package in the site's package.json or lockfile", async () => {
  for (const file of ["package.json", "package-lock.json"]) {
    const text = await read(join(SITE, file));
    assert.ok(text.length > 0, `fixture control: the site's ${file} was read`);
    assert.doesNotMatch(text, /"(storybook|@storybook\/[a-z-]+)"|node_modules\/(@storybook|storybook)\b/, `the site's ${file}`);
  }
});

test("SM-1: tools/storybook/ has its own lockfile, pinning Storybook 10.6.1", async () => {
  assert.ok(existsSync(join(TOOL, "package-lock.json")), "tools/storybook/package-lock.json");
  const lock = await readJson(join(TOOL, "package-lock.json"));
  for (const name of STORYBOOK_PACKAGES) {
    assert.equal(lock.packages[`node_modules/${name}`]?.version, STORYBOOK_VERSION, name);
  }
});
