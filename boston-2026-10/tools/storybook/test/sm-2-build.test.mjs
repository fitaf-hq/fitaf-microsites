// SM-2 (SPEC-storybook-microsite.md § 5): build-storybook succeeds (the package's own script, into a temporary directory),
// and its index.json lists every story of § 3, by group, and no other story of the microsite's; and the docs page of § 4.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { removeStorybookStatic, storybookStatic } from "./storybook-static.mjs";

const BUILD_TIMEOUT_MS = 900_000;

/** § 3's table: group -> its stories, as a reviewer names them. */
const STORIES = {
  // SPEC-plan-page-refinement § 4: *Chef's Choice · closed* and *· open* are one story, *Chef's Choice*.
  Individual: ["Start", "Chosen", "Chef's Choice", "No picks this week", "All plans"],
  Family: ["Family"],
  "Whole page": ["Scroll"],
};
const ROOT = "Microsite";

after(removeStorybookStatic);

test("SM-2: build-storybook succeeds; index.json lists every story of § 3 and the docs page", { timeout: BUILD_TIMEOUT_MS }, async () => {
  const { dir } = await storybookStatic();
  const index = JSON.parse(await readFile(join(dir, "index.json"), "utf8"));
  const entries = Object.values(index.entries);
  const stories = entries.filter((e) => e.type === "story" && e.title.startsWith(`${ROOT}/`));
  const listed = stories.map((e) => `${e.title.slice(ROOT.length + 1)} · ${e.name}`).sort();
  const expected = Object.entries(STORIES)
    .flatMap(([group, names]) => names.map((name) => `${group} · ${name}`))
    .sort();
  assert.deepEqual(listed, expected, "the stories of § 3, each once, by group");
  assert.ok(
    entries.some((e) => e.type === "docs" && e.title.startsWith(`${ROOT}/`)),
    `the docs page of § 4: ${entries.map((e) => `${e.type} ${e.title}`).join(", ")}`,
  );
});
