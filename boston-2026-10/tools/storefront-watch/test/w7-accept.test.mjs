// W7 (SPEC-storefront-watch § 5, § 6): `accept` on the synthetic store writes exactly W1's baseline, and the watch
// then passes against it. The expected Footer block is kept across an accept, set only from a built block's version
// line (`--footer <file>`), or cleared (`--footer null`). Every accept names the release it accepts (§ 8: W7b–W7f).
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acceptBaseline } from "../lib/baseline.mjs";
import { storeFetcher } from "../lib/store-fetch.mjs";
import { runWatch } from "../lib/watch.mjs";
import { baselineText, DEPENDENCIES, fakeFetch, ORIGIN, PAGE, syntheticStore, w1Baseline } from "./synthetic-store.mjs";

const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");
/** A block shaped as `npm run build:storefront` writes the Footer's (a synthetic text, not the hand-off). */
const builtBlock = (commit, text, hash = sha256(text)) => `<script>\n/* fitaf-handoff ${commit} sha256:${hash} */\n${text}</script>\n`;
const BLOCK_TEXT = "(function () {\n  /* a synthetic block */\n})();\n";

async function withDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), "storefront-watch-w7-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const fetcher = () => storeFetcher({ fetchImpl: fakeFetch(syntheticStore()).fetchImpl, origin: ORIGIN });
/** The synthetic store's entry, the release every accept here names (§ 8). */
const release = "main-SYNTH001.js";

test("W7: accept writes exactly the baseline W1; the watch then passes on two fetches", async () => {
  await withDir(async (dir) => {
    const path = join(dir, "watch-baseline.json");
    await acceptBaseline({ fetcher: fetcher(), path, page: PAGE, release });
    const written = await readFile(path, "utf8");
    assert.equal(written, baselineText(w1Baseline()));

    const { fetchImpl, calls } = fakeFetch(syntheticStore());
    const result = await runWatch({
      fetcher: storeFetcher({ fetchImpl, origin: ORIGIN }),
      baseline: JSON.parse(written),
      dependencies: DEPENDENCIES,
      page: PAGE,
    });
    assert.deepEqual(result.flags, []);
    assert.equal(calls.length, 2);
  });
});

test("W7: accept keeps the expected Footer block it finds; --footer sets it from a built block; null clears it", async () => {
  await withDir(async (dir) => {
    const path = join(dir, "watch-baseline.json");
    const expected = `fitaf-handoff abc1234 sha256:${sha256(BLOCK_TEXT)}`;
    await writeFile(path, baselineText({ ...w1Baseline(), entry: "main-OLDER001.js", expectedFooter: "fitaf-handoff 0000000 sha256:" + "0".repeat(64) }));

    await acceptBaseline({ fetcher: fetcher(), path, page: PAGE, release });
    assert.equal(JSON.parse(await readFile(path, "utf8")).expectedFooter, "fitaf-handoff 0000000 sha256:" + "0".repeat(64), "kept");
    assert.equal(JSON.parse(await readFile(path, "utf8")).entry, "main-SYNTH001.js", "the rest rewritten from the store");

    await acceptBaseline({ fetcher: fetcher(), path, page: PAGE, release, footer: builtBlock("abc1234", BLOCK_TEXT) });
    assert.equal(JSON.parse(await readFile(path, "utf8")).expectedFooter, expected, "set from the block's version line");

    await acceptBaseline({ fetcher: fetcher(), path, page: PAGE, release, footer: null });
    assert.equal(await readFile(path, "utf8"), baselineText(w1Baseline()), "cleared: exactly W1 again");
  });
});

test("W7: accept refuses a block whose text does not match its version line, or one built from a dirty tree", async () => {
  await withDir(async (dir) => {
    const path = join(dir, "watch-baseline.json");
    await assert.rejects(
      acceptBaseline({ fetcher: fetcher(), path, page: PAGE, release, footer: builtBlock("abc1234", BLOCK_TEXT, "f".repeat(64)) }),
      /does not match/,
    );
    await assert.rejects(
      acceptBaseline({ fetcher: fetcher(), path, page: PAGE, release, footer: builtBlock("abc1234-dirty", BLOCK_TEXT) }),
      /dirty/,
    );
    await assert.rejects(acceptBaseline({ fetcher: fetcher(), path, page: PAGE, release, footer: "no version line here" }), /version line/);
    await assert.rejects(readFile(path, "utf8"), { code: "ENOENT" }, "a refused accept writes nothing");
  });
});
