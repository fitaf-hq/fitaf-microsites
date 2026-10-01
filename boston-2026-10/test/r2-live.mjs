// Shared by R2-71, R2-74 and R2-77 (SPEC-rung2-progress-and-checkout § 15.4, § 17.3). Not a test file itself. Moved here
// from r2-71-text.test.mjs unchanged, so the cases that compare with "the live block" read the same text: the one the
// watch's baseline expects in the store's Footer, rebuilt from its commit by this build and checked against its SHA-256.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { storefrontText } from "../scripts/build-storefront.mjs";
import { mealKey } from "../src/storefront/meal-key.js";

const BASELINE = join(ROOT, "storefront", "watch-baseline.json");
const EXPECTED_FOOTER = /^fitaf-handoff ([0-9a-f]{7,40}) sha256:([0-9a-f]{64})$/;
const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");

/** Everything in a text that names an address: what a URL-shaped token looks like, however it is written. */
export function urlsIn(text) {
  const found = new Set();
  const add = (re) => {
    for (const m of text.matchAll(re)) found.add(m[1] ?? m[0]);
  };
  add(/\b[a-z][a-z0-9+.-]*:\/\/[^\s"'`)]*/gi); // scheme://…
  add(/(?<![\w:])\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)+[^\s"'`)]*/gi); // //host.tld… (protocol-relative)
  add(/\b(?:data|blob):[^\s"'`)]*/gi); // data: and blob: URIs
  add(/["'`](\/[^"'`\s]*)["'`]/g); // a quoted root-relative path, "/…"
  add(/[\w./-]+\.(?:png|jpe?g|gif|svg|webp|avif|ico)\b/gi); // an image file
  add(/\b(?:www\.)?[a-z0-9-]+\.(?:com|net|org|io|co|app|dev|cloud|us)\b/gi); // a host name
  return [...found].sort();
}

/** A file of `commit`, by its path in this package. */
const atCommit = (commit, path) => execFileSync("git", ["-C", ROOT, "show", `${commit}:./${path}`], { encoding: "utf8", maxBuffer: 1 << 24 });

/** The block live before rung 2 § 17's paste (2026-10-01): R2-74b and R2-77 are about it, not about whatever block the
 * watch's baseline names after a later accept (the same reason CC-8 kept `replaces` until the paste). */
export const PREVIOUS_FOOTER = "fitaf-handoff a984fb5 sha256:914668ded95f6a8913e7ae0010661d26780700bd7443cbf93f9e4e8a875b41f6";

/** A block's text: rebuilt from the commit its version line names (by default the baseline's, the live block), and
 * checked against its SHA-256. */
export async function liveText(versionLine = undefined) {
  const expected = versionLine ?? JSON.parse(await readFile(BASELINE, "utf8")).expectedFooter;
  if (expected === null) return ""; // no block placed yet: nothing of ours is live
  const m = EXPECTED_FOOTER.exec(expected);
  assert.ok(m, `the baseline's expectedFooter is a version line: ${expected}`);
  const [, commit, hash] = m;
  const dir = await mkdtemp(join(tmpdir(), "boston-r2-71-"));
  try {
    const paths = {
      sourcePath: "src/storefront/fitaf-handoff.js",
      plansPath: "data/plans.json",
      messagesPath: "data/messages.json",
      templatePath: "src/template.html",
    };
    const options = {};
    for (const [option, path] of Object.entries(paths)) {
      options[option] = join(dir, path.replaceAll("/", "_"));
      await writeFile(options[option], atCommit(commit, path));
    }
    const keySource = atCommit(commit, "src/storefront/meal-key.js");
    const oldKey = keySource.slice(keySource.indexOf("function mealKey(")).trimEnd();
    const built = await storefrontText(options);
    assert.equal(built.split(mealKey.toString()).length, 2, "fixture control: this build inlines the key function once");
    const text = built.replace(mealKey.toString(), () => oldKey);
    assert.equal(sha256(text), hash, `fixture control: the rebuilt text is the live block's (${commit}, ${hash.slice(0, 8)}…)`);
    return text;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
