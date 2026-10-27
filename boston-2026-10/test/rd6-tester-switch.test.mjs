// RD6 (SPEC-the-redirect.md § 1 item 4, § 7): with the var set, § 12's switch comes first: GET /?no-tracking is § 12's
// 302 to / with its cookie (another parameter kept), /?tracking its clearing cookie, not the store and nothing written;
// the next GET / carrying the cookie is the store's 302, no Set-Cookie, nothing written. Both Workers.
import test from "node:test";
import assert from "node:assert/strict";
import { switchFirstProblems } from "./rd-checks.mjs";

test("RD6: ?no-tracking and ?tracking are § 12's 302 to / with the cookie; then / carrying it is the store's, not counted", async () => {
  assert.deepEqual(await switchFirstProblems(), []);
});
