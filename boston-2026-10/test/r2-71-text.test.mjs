// R2-71 (SPEC-rung2-progress-and-checkout § 15.4, § 15.3; amended by § 17.3): the shipped text, the Footer block and
// the console file as the build writes them. Every character is ASCII (the store's admin reads the block as HTML); no URL
// in them that the live block lacks but the fixed list of the sheet's hosts (§ 17.1; the logo's src is read from the
// page at run time: no image URL is written in); each at most the ceiling (15,360 bytes since § 17.3). "The live
// block" is the one the watch's baseline expects in the store's Footer (storefront/watch-baseline.json, expectedFooter: its version line, the commit it was built from and its text's SHA-256): rebuilt here from that
// commit's own source, words, colours and key function by this build, checked against that SHA-256 so it is exactly the
// live text, and read with the same URL reader. The reader is shown to bite (R2-71b): an absolute URL, a
// protocol-relative one, a data: URI, a root-relative path, an image file and a host name planted in the text are each
// found, and each fails the comparison. (The '<' rule is R2-58's.)
import test from "node:test";
import assert from "node:assert/strict";
import { MAX_SHIPPED_BYTES, storefrontFiles } from "../scripts/build-storefront.mjs";
import * as link from "../scripts/handoff-link.mjs";
import { liveText, urlsIn } from "./r2-live.mjs";

/** R2-71 over the files as the build composes them: ASCII, within the ceiling, and no URL `live` lacks. */
function check(files, live) {
  // § 17.3: R2-71's "no URL the live block lacks" is amended; the only addition is the fixed list of the sheet's hosts.
  const allowed = new Set([...urlsIn(live), ...urlsIn(JSON.stringify(link.PHOTO_HOSTS ?? []))]);
  for (const f of files) {
    const outside = [...f.content].filter((ch) => ch.charCodeAt(0) > 0x7f);
    assert.deepEqual(outside, [], `${f.name}: every character ASCII`);
    assert.ok(f.bytes <= MAX_SHIPPED_BYTES, `${f.name}: ${f.bytes} bytes, at most ${MAX_SHIPPED_BYTES}`);
    assert.deepEqual(urlsIn(f.content).filter((u) => !allowed.has(u)), [], `${f.name}: no URL the live block lacks`);
  }
}

test("R2-71: the Footer block and the console file — ASCII, at most the ceiling, and no URL the live block lacks but the sheet's hosts", async () => {
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
