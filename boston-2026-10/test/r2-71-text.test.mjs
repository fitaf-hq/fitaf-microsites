// R2-71 (SPEC-rung2-progress-and-checkout § 15.4, § 15.3; amended by § 17.3): the shipped text, the Footer block and
// the console file as the build writes them. Every character is ASCII (the store's admin reads the block as HTML); no URL
// in them that the live block lacks but the fixed list of the sheet's hosts (§ 17.1; the logo's src is read from the
// page at run time: no image URL is written in); each at most the ceiling (50,000 bytes since § 32; 20,480 by § 25.7, 15,360 by § 17.3). "The live
// block" is the one the watch's baseline expects in the store's Footer (storefront/watch-baseline.json, expectedFooter: its version line, the commit it was built from and its text's SHA-256): rebuilt here from that
// commit's own source, words, colours and key function by this build, checked against that SHA-256 so it is exactly the
// live text, and read with the same URL reader. The reader is shown to bite (R2-71b): an absolute URL, a
// protocol-relative one, a data: URI, a root-relative path, an image file and a host name planted in the text are each
// found, and each fails the comparison. (The '<' rule is R2-58's.)
// § 33 item 3 (2026-10-26; amended at § 33.2, the case the contract made stale, as R2-77 was at § 33.1): one more
// address, the store site's contact page, allowed only WHOLE: its quoted string is taken out of the text before the URLs
// are read, so its host alone (R2-71b's planted host name) or another page of that host (R2-71b) is still found.
// § 35 item 5: and the save link's https://eatfitaf.com/#save, whole, the same way; R2-71b plants another eatfitaf.com
// address, which still fails. § 36 item 8 removed the save link; the live block (0eb98fe, accepted 2026-10-27) still
// carries it, so its whole address stays allowed until the block that drops it is the live one.
// ⚠ Since the live block is 0eb98fe it carries § 33's contact page, so its host, fitafnutrition.com, is a URL the live
// block HAS: R2-71b's planted host name is now one the live block lacks (found 2026-10-27 at § 36's build; the case had
// failed since the baseline's accept, 3ab6b76, not because of § 36).
// ⚠ § 38.2 (§ 37.3 when written; 2026-10-27, found at the merge of the release line into the dev line): since the
// baseline accepted ab1d4d7 (c7edd18; 9e6d0b3 since eb6647a) the live block carries § 36's struck prices after the
// hand-off's text, and its rebuild here built the hand-off alone (2ca026dc…, not 0e259ec1…), so both cases failed their
// fixture control since that accept, not because of the merge. r2-live.mjs now rebuilds a commit that has
// src/storefront/fitaf-struck.js with it and its own data/offers.json; the older blocks R2-73 to R2-77 and SN-5 rebuild
// have none and are rebuilt as before.
import test from "node:test";
import assert from "node:assert/strict";
import { MAX_SHIPPED_BYTES, storefrontFiles } from "../scripts/build-storefront.mjs";
import * as link from "../scripts/handoff-link.mjs";
import { liveText, urlsIn } from "./r2-live.mjs";

/** § 33 item 3: the contact page, as the text quotes it (R2-77 requires it there, whole). */
const CONTACT = JSON.stringify("https://fitafnutrition.com/contact");
/** § 35 item 1: the save link, as the text quotes it (R2-77 requires it there, whole). */
const SAVE = JSON.stringify("https://eatfitaf.com/#save");

/** R2-71 over the files as the build composes them: ASCII, within the ceiling, and no URL `live` lacks. */
function check(files, live) {
  // § 17.3: R2-71's "no URL the live block lacks" is amended; the only addition is the fixed list of the sheet's hosts,
  // and since § 33 the contact page, whole (its quoted string taken out before the URLs are read), and since § 35 the
  // save link, whole, the same way.
  const allowed = new Set([...urlsIn(live), ...urlsIn(JSON.stringify(link.PHOTO_HOSTS ?? []))]);
  for (const f of files) {
    const outside = [...f.content].filter((ch) => ch.charCodeAt(0) > 0x7f);
    assert.deepEqual(outside, [], `${f.name}: every character ASCII`);
    assert.ok(f.bytes <= MAX_SHIPPED_BYTES, `${f.name}: ${f.bytes} bytes, at most ${MAX_SHIPPED_BYTES}`);
    assert.deepEqual(urlsIn(f.content.split(CONTACT).join('""').split(SAVE).join('""')).filter((u) => !allowed.has(u)), [], `${f.name}: no URL the live block lacks`);
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
    ["a host name", 'var host = "fitafnutrition.net";', "fitafnutrition.net"],
    // § 33.2: the contact page is allowed whole, never its host's other pages.
    ["another page of the contact page's host", 'var page = "https://fitafnutrition.com/account";', "https://fitafnutrition.com/account"],
    // § 35 item 5: the save link is allowed whole, never another eatfitaf.com address.
    ["another eatfitaf.com address", 'var page = "https://eatfitaf.com/#saved";', "https://eatfitaf.com/#saved"],
  ];
  for (const [what, line, url] of planted) {
    assert.ok(urlsIn(`${live}\n${line}`).includes(url), `${what}: found (${url})`);
    const mutant = files.map((f) => ({ ...f, content: f.content.replace('"use strict";', `"use strict";\n${line}`) }));
    assert.notEqual(mutant[0].content, files[0].content, `${what}: planted`);
    assert.throws(() => check(mutant, live), /no URL the live block lacks/, what);
  }
});
