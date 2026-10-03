// R2-77 (SPEC-rung2-progress-and-checkout § 17.3, § 17.4): the text. The Footer block and the console file at most
// the ceiling: 20,480 bytes since § 25.7 (the Advisor, 2026-10-02: "Raise the ceiling", for the three-step checkout;
// 15,360 by § 17.3, his ruling for the 2026-10-01 meeting; the 5,120-byte warning stays); every character ASCII;
// no `<` but the Footer block's own two (§ 11); and the only new URLs, against the live block (914668de…, rebuilt as
// R2-71 rebuilds it), are § 17.1's fixed list of the sheet's hosts: the production site and the test address.
import test from "node:test";
import assert from "node:assert/strict";
import * as storefront from "../scripts/build-storefront.mjs";
import { liveText, PREVIOUS_FOOTER, urlsIn } from "./r2-live.mjs";
import { HOSTS } from "./r2-photos.mjs";

const FOOTER = "fitaf-handoff.html";

test("R2-77: at most 20,480 bytes, ASCII, two `<`, and the only new URLs the listed hosts", async () => {
  assert.equal(storefront.MAX_SHIPPED_BYTES, 20480, "§ 25.7: the ceiling raised for the three-step checkout (15,360 by § 17.3)");
  assert.equal(storefront.TARGET_SHIPPED_BYTES, 5120, "§ 17.3: the warning stays");
  const live = await liveText(PREVIOUS_FOOTER);
  const files = await storefront.storefrontFiles({ commit: "0000000" });
  const added = new Set(urlsIn(JSON.stringify(HOSTS)));
  for (const f of files) {
    assert.ok(f.bytes <= 20480, `${f.name}: ${f.bytes} bytes`);
    assert.deepEqual([...f.content].filter((ch) => ch.charCodeAt(0) > 0x7f), [], `${f.name}: ASCII`);
    assert.equal((f.content.match(/</g) ?? []).length, f.name === FOOTER ? 2 : 0, `${f.name}: the '<'s`);
    const fresh = urlsIn(f.content).filter((u) => !urlsIn(live).includes(u));
    assert.deepEqual(fresh.sort(), [...added].sort(), `${f.name}: the new URLs are exactly the listed hosts`);
    for (const host of HOSTS) assert.ok(f.content.includes(JSON.stringify(host)), `${f.name}: the list names ${host}`);
  }
});
