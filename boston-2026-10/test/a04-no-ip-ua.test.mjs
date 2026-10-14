// A4 (SPEC-analytics.md § 1.2, § 4, § 7): a request with a known IP and user agent; no written field contains either.
// Every event of § 3 is sent from a documentation address (203.0.113.7) with an invented user agent; no blob, index or
// double written, and no salt key or value, carries the address, the user agent or its token. The control: the
// country is the platform's and the device class is derived (a phone), so the request's own facts did reach the
// Worker. The check is a-checks.mjs's, which the mutant "the IP written into a blob" runs on a mirror.
import test from "node:test";
import assert from "node:assert/strict";
import { ipUaProblems } from "./a-checks.mjs";
import { startBeacon, TEST_IP, TEST_UA, VALID } from "./a-harness.mjs";

test("A4: no written field contains the IP address or the user agent", async () => {
  assert.deepEqual(await ipUaProblems(), []);
});

test("A4 (control): the country is the platform's and the device class is derived from the user agent", async () => {
  const site = await startBeacon();
  try {
    await site.log();
    await site.post(VALID.open, { ip: TEST_IP, ua: TEST_UA, country: "DE" });
    await site.post(VALID.open, { ua: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) Safari/604.1" });
    await site.post(VALID.open, { ua: "Mozilla/5.0 (Linux; Android 14; SM-X710) Chrome/129.0 Safari/537.36" });
    await site.post(VALID.open, { ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) Safari/605.1.15" });
    const { points } = await site.log();
    const blobs = points.map((p) => p.blobs);
    assert.ok(blobs[0].includes("DE"), `the country: ${JSON.stringify(blobs[0])}`);
    assert.ok(blobs[0].includes("phone"), "an iPhone is a phone");
    assert.ok(blobs[1].includes("tablet"), "an iPad is a tablet");
    assert.ok(blobs[2].includes("tablet"), "Android without Mobile is a tablet");
    assert.ok(blobs[3].includes("desktop"), "a Mac is a desktop");
    for (const p of points) assert.match(p.indexes[0], /^[0-9a-f]{16}$/, "v: 16 hex digits");
  } finally {
    await site.dispose();
  }
});
