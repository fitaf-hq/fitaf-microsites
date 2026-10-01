// Mutants of § 17's block, each in a MIRROR (protocols/mutate-in-a-mirror.md): a copy of src/storefront/fitaf-handoff.js
// in a temporary directory, mutated there, and built by this build (storefrontText, as the shipped text is built); no
// file in the repository is edited. Each is run through the case it must fail, after a control (the unmutated copy,
// built the same way, passes).
//   (a) ⛔ the block takes the host from the LINK, not from its fixed list: R2-75 fails (a forged host is requested).
//   (b) the slide WAITS for the card's image (shows the sheet only once the store's card image has loaded): R2-73 fails.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { STOREFRONT_SOURCE, storefrontText } from "../scripts/build-storefront.mjs";
import { slideAtFirstPress, unknownHost } from "./r2-photos.mjs";

/** The text built from a mirror of the source, `edit`ed there; `edit` must change exactly one occurrence. */
async function mirrorText(edit = null) {
  const dir = await mkdtemp(join(tmpdir(), "boston-r2-17-mutant-"));
  try {
    let source = await readFile(STOREFRONT_SOURCE, "utf8");
    if (edit) {
      const [from, to] = edit;
      assert.equal(source.split(from).length, 2, `the mutated code appears exactly once: ${from}`);
      source = source.replace(from, to);
    }
    const copy = join(dir, "fitaf-handoff.js");
    await writeFile(copy, source);
    return await storefrontText({ sourcePath: copy });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const HOST_FROM_LINK = ["var h = /^\\d$/.test(f[0]) && HOSTS[f[0]], W", "var h = HOSTS[f[0]] || f[0], W"];
const WAIT_FOR_CARD = ["  if (x && !BAD) {", '  if (x && !BAD && (c.querySelector("img") || {}).complete) {'];

test("mutant (a): the host taken from the link instead of the fixed list — R2-75 fails", async () => {
  await unknownHost(await mirrorText()); // control
  await assert.rejects(unknownHost(await mirrorText(HOST_FROM_LINK)), (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    assert.match(err.message, /no request at all/);
    return true;
  });
});

test("mutant (b): the slide waits for the card's image — R2-73 fails", async () => {
  await slideAtFirstPress(await mirrorText()); // control
  await assert.rejects(slideAtFirstPress(await mirrorText(WAIT_FOR_CARD)), (err) => {
    assert.ok(err instanceof assert.AssertionError, String(err));
    assert.match(err.message, /its cell at its first press/);
    return true;
  });
});
