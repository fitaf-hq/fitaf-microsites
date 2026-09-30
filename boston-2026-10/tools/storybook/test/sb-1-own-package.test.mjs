// SB-1 (SPEC-storybook.md § 1): the tool is its own npm package. The site's package.json and lockfile name no Storybook
// package (the deploy and fitaf-infra's CI install the site, never this); tools/storybook/ has its own lockfile, which
// pins Storybook 10 and the three packages § 2 names.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { read, SITE, TOOL } from "./paths.mjs";

test("SB-1: no Storybook package in the site's package.json or lockfile; the tool has its own lockfile", async () => {
  for (const file of ["package.json", "package-lock.json"]) {
    const text = await read(join(SITE, file));
    assert.doesNotMatch(text, /"(storybook|@storybook\/[a-z-]+)"|node_modules\/(@storybook|storybook)\b/, `the site's ${file}`);
  }
  assert.ok(existsSync(join(TOOL, "package-lock.json")), "tools/storybook/package-lock.json");
  const lock = JSON.parse(await read(join(TOOL, "package-lock.json")));
  for (const name of ["storybook", "@storybook/html-vite", "@storybook/addon-a11y", "@storybook/addon-docs"]) {
    const version = lock.packages[`node_modules/${name}`]?.version;
    assert.match(String(version), /^10\./, `${name}: Storybook 10 (${version})`);
  }
});
