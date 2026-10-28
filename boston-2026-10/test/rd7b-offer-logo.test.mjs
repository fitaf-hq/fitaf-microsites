// RD7b (SPEC-the-redirect.md § 10 item 1): the offer page's logo names the email. On the offer page /o/<code> of each kind
// (saved, welcome, current, ended: EM-A1's pages from the development Worker, and SP15's drawn by redeem.js) the logo links
// to /?via=email, its image, size, alt text and place as before; on every other Worker page (the confirmation's, GONE,
// TOO_MANY) it links to /, as before.
import test from "node:test";
import assert from "node:assert/strict";
import { logoProblems } from "./rd-checks.mjs";

test("RD7b: the offer page's logo links to /?via=email for each kind; every other Worker page's to /", async () => {
  assert.deepEqual(await logoProblems(), []);
});
