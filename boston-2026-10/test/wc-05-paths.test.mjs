// WC-5 (SPEC-week-content.md § 4.3, § 5): /week/../x.jpg, /week/a/b.jpg, /week/x.png (and the other shapes
// test/wc-checks.mjs REFUSED_PATHS names: a "..", an encoded "/" or "..", no name, a dot-file) are each a 404 with the
// bucket never read; an absent .jpg is a 404. A file name is matched as it arrives: plain letters, digits, ".", "_" and
// "-", ending ".jpg", and no "..". Also a /week/ request that is not a GET.
import test from "node:test";
import assert from "node:assert/strict";
import { pathProblems } from "./wc-checks.mjs";
import { SHEET_1018, sheetKeyOf, sheetPath, startSite } from "./wc-harness.mjs";

test("WC-5a: every refused /week/ path is a 404 and the bucket is never read for it; an absent .jpg is a 404", async () => {
  assert.deepEqual(await pathProblems(), []);
});

test("WC-5b: a /week/ request that is not a GET is a 404, the bucket never read", async () => {
  const site = await startSite({ objects: { [sheetKeyOf(SHEET_1018)]: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) } });
  try {
    for (const method of ["POST", "PUT", "DELETE", "HEAD"]) {
      const res = await site.get(sheetPath(SHEET_1018), { method });
      assert.equal(res.status, 404, method);
      assert.deepEqual((await site.log()).reads, [], method);
    }
  } finally {
    await site.dispose();
  }
});
