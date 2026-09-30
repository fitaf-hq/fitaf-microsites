// SB-3 (SPEC-storybook.md § 3, ⭐ one source): the stories import the screen's own module
// (src/storefront/progress-screen.js), never a copy; the words and the colours reach them through the build's own
// readers (screenWords, screenTokens: scripts/screen-inputs.mjs, the module scripts/build-storefront.mjs takes them
// from and re-exports); and no rule of the screen's style appears anywhere under tools/storybook/. ⭐ Mutant (in the
// suite): a story file with one of the screen's rules copied into it fails the check.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { filesUnder, MODULE, read, SITE, TOOL } from "./paths.mjs";

/** The screen's style rules, read from the module's string literals: each `selector{…}` of 16 characters or more. */
async function screenRules() {
  const source = await read(MODULE);
  const strings = [...source.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]).filter((s) => /#fitaf-screen|@keyframes|cdk-overlay/.test(s));
  return strings.flatMap((s) => s.split("}")).map((r) => r.trim()).filter((r) => r.length >= 16);
}

/** SB-3's style check over the files under `dir`: throws (an AssertionError) naming any file that holds a rule. */
async function noRuleCopied(dir) {
  const rules = await screenRules();
  assert.ok(rules.length >= 10, `fixture control: the module's rules were read (${rules.length})`);
  const found = [];
  for (const file of await filesUnder(dir)) {
    const text = await read(file);
    for (const rule of rules) if (text.includes(rule)) found.push(`${file}: ${rule.slice(0, 40)}`);
  }
  assert.deepEqual(found, [], "no rule of the screen's style under tools/storybook");
}

test("SB-3: the stories import the screen's own module; the config the build's own two readers", async () => {
  const files = await filesUnder(join(TOOL, "stories"));
  const stories = files.filter((f) => f.endsWith(".stories.js"));
  assert.ok(stories.length >= 1, "a stories file");
  const all = (await Promise.all(files.map(read))).join("\n");
  assert.match(all, /from\s+["'](\.\.\/)+src\/storefront\/progress-screen\.js["']/, "an import of src/storefront/progress-screen.js");
  const main = await read(join(TOOL, ".storybook", "main.js"));
  assert.match(main, /import\s*\{[^}]*\bscreenTokens\b[^}]*\bscreenWords\b[^}]*\}\s*from\s*["'](\.\.\/)+scripts\/screen-inputs\.mjs["']/, "the build's readers");
  const buildStorefront = await read(join(SITE, "scripts", "build-storefront.mjs"));
  assert.match(buildStorefront, /import\s*\{\s*screenTokens,\s*screenWords\s*\}\s*from\s*"\.\/screen-inputs\.mjs"/, "the build takes its readers from the same module");
});

test("SB-3: no rule of the screen's style appears under tools/storybook", async () => {
  await noRuleCopied(TOOL);
});

test("SB-3 (mutant): a story file with one of the screen's rules copied into it — SB-3 fails", async () => {
  const dir = await mkdtemp(join(tmpdir(), "fitaf-storybook-sb-3-"));
  try {
    const [rule] = await screenRules();
    await writeFile(join(dir, "copied.stories.js"), `const CSS = "${rule}}";\n`);
    await assert.rejects(noRuleCopied(dir), (err) => {
      assert.ok(err instanceof assert.AssertionError, String(err));
      return true;
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
