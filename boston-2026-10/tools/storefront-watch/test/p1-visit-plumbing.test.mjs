// P1, plumbing for F3 and F4 (SPEC-storefront-watch § 3): the ordinary visit (lib/visit.mjs) in a real headless
// Chrome, against the synthetic store on 127.0.0.1 (test/browser-store.mjs), never the live store. It finds the block
// the app injects at run time, reads its text for the hash, and attributes a page error to our block or not.
// Skipped when no Chrome is installed (CHROME_PATH).
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chromePath } from "../lib/browser.mjs";
import { footerVerdict, quietVerdict } from "../lib/footer-check.mjs";
import { ordinaryVisit } from "../lib/visit.mjs";
import { startStore } from "./browser-store.mjs";

const chrome = (() => {
  try {
    return chromePath();
  } catch {
    return null;
  }
})();
const skip = chrome ? false : "no Chrome found (set CHROME_PATH)";
const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");
const block = (body, commit = "abc1234") => `\n/* fitaf-handoff ${commit} sha256:${sha256(body)} */\n${body}`;
const QUIET = '(function () {\n"use strict";\nif (location.hash.slice(0, 7) !== "#fitaf=") return;\n})();\n';

let store;
before(async () => {
  store = await startStore();
});
after(async () => {
  await store?.close();
});
const visit = () => ordinaryVisit({ page: `${store.origin}/order?mpid=21`, executablePath: chrome, renderMs: 10_000, settleMs: 300 });

test("P1: the injected block is found, its version line read and its text hashed; a quiet block logs nothing", { skip }, async () => {
  store.set({ footer: block(QUIET) });
  const v = await visit();
  assert.equal(v.rendered, true);
  assert.equal(v.scripts.length, 1);
  const f3 = footerVerdict(v, `fitaf-handoff abc1234 sha256:${sha256(QUIET)}`);
  assert.equal(f3.flag, false, f3.summary);
  assert.equal(f3.blocks[0].intact, true);
  assert.equal(quietVerdict(v).flag, false);
});

test("P1: a block whose text was changed after it was built: F3 flags it", { skip }, async () => {
  store.set({ footer: block(QUIET).replace('"use strict";', '"use strict"; ') });
  const v = await visit();
  const f3 = footerVerdict(v, `fitaf-handoff abc1234 sha256:${sha256(QUIET)}`);
  assert.equal(f3.flag, true);
  assert.match(f3.summary, /does not match/);
});

test("P1: a block that logs on an ordinary visit, and one that throws: F4 flags each; the store's own error is not ours", { skip }, async () => {
  store.set({ footer: block('console.info("[fitaf-handoff] fill B, mpid 21");\n') });
  assert.equal(quietVerdict(await visit()).flag, true);

  store.set({ footer: block("undefinedFunctionOfOurs();\n") });
  const thrown = await visit();
  assert.equal(thrown.errors.length, 1);
  assert.equal(thrown.errors[0].fromOurBlock, true, JSON.stringify(thrown.errors));
  assert.equal(quietVerdict(thrown).flag, true);

  store.set({ footer: "undefinedFunctionOfTheStore();\n" });
  const theirs = await visit();
  assert.equal(theirs.errors.length, 1);
  assert.equal(theirs.errors[0].fromOurBlock, false);
  assert.equal(quietVerdict(theirs).flag, false);
  assert.equal(footerVerdict(theirs, null).flag, false, "no block, none expected: informational");
});
