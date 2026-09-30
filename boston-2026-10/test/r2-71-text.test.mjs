// R2-71 (SPEC-rung2-progress-and-checkout § 15.4, § 15.3): the shipped text, the Footer block and the console file as
// the build writes them. Every character is ASCII (the store's admin reads the block as HTML); no URL in them that the
// live block lacks (the logo's src is read from the page at run time: no image URL is written in); each at most 10,240
// bytes. "The live block" is the one the watch's baseline expects in the store's Footer (storefront/watch-baseline.json,
// expectedFooter: its version line, the commit it was built from and its text's SHA-256): rebuilt here from that
// commit's own source, words, colours and key function by this build, checked against that SHA-256 so it is exactly the
// live text, and read with the same URL reader. The reader is shown to bite (R2-71b): an absolute URL, a
// protocol-relative one, a data: URI, a root-relative path, an image file and a host name planted in the text are each
// found, and each fails the comparison. (The '<' rule is R2-58's.)
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { MAX_SHIPPED_BYTES, storefrontFiles, storefrontText } from "../scripts/build-storefront.mjs";
import { mealKey } from "../src/storefront/meal-key.js";

const BASELINE = join(ROOT, "storefront", "watch-baseline.json");
const EXPECTED_FOOTER = /^fitaf-handoff ([0-9a-f]{7,40}) sha256:([0-9a-f]{64})$/;
const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");

/** Everything in a text that names an address: what a URL-shaped token looks like, however it is written. */
function urlsIn(text) {
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

/** The live block's text: rebuilt from the commit its version line names, and checked against its SHA-256. */
async function liveText() {
  const expected = JSON.parse(await readFile(BASELINE, "utf8")).expectedFooter;
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

/** R2-71 over the files as the build composes them: ASCII, within the ceiling, and no URL `live` lacks. */
function check(files, live) {
  const allowed = new Set(urlsIn(live));
  for (const f of files) {
    const outside = [...f.content].filter((ch) => ch.charCodeAt(0) > 0x7f);
    assert.deepEqual(outside, [], `${f.name}: every character ASCII`);
    assert.ok(f.bytes <= MAX_SHIPPED_BYTES, `${f.name}: ${f.bytes} bytes, at most ${MAX_SHIPPED_BYTES}`);
    assert.deepEqual(urlsIn(f.content).filter((u) => !allowed.has(u)), [], `${f.name}: no URL the live block lacks`);
  }
}

test("R2-71: the Footer block and the console file — ASCII, at most 10,240 bytes, and no URL the live block lacks", async () => {
  const live = await liveText();
  const files = await storefrontFiles({ commit: "0000000" });
  assert.deepEqual(files.map((f) => f.name).sort(), ["fitaf-handoff.fill-B.console.js", "fitaf-handoff.html"]);
  check(files, live);
});

test("R2-71b: the URL reader bites — each planted address is found, and fails the comparison", async () => {
  const live = await liveText();
  const files = await storefrontFiles({ commit: "0000000" });
  check(files, live); // control
  const planted = [
    ["an absolute URL", 'i.src = "https://images.example/logo.png";', "https://images.example/logo.png"],
    ["a protocol-relative URL", 'i.src = "//cdn.example.net/x";', "//cdn.example.net/x"],
    ["a data: URI", 'i.src = "data:image/png;base64,AAAA";', "data:image/png;base64,AAAA"],
    ["a root-relative path", 'i.src = "/assets/fitaf";', "/assets/fitaf"],
    ["an image file", 'i.src = "fitaf-logo.webp";', "fitaf-logo.webp"],
    ["a host name", 'var host = "fitafnutrition.com";', "fitafnutrition.com"],
  ];
  for (const [what, line, url] of planted) {
    assert.ok(urlsIn(`${live}\n${line}`).includes(url), `${what}: found (${url})`);
    const mutant = files.map((f) => ({ ...f, content: f.content.replace('"use strict";', `"use strict";\n${line}`) }));
    assert.notEqual(mutant[0].content, files[0].content, `${what}: planted`);
    assert.throws(() => check(mutant, live), /no URL the live block lacks/, what);
  }
});
