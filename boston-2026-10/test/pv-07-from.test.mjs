// PV7 (SPEC-preview-sites.md § 2 as amended 2026-10-20, § 4): a preview's data never enters this repository, so the
// preview content command is refused, writing nothing, without --from, with a --from that does not exist, and with a
// --from that resolves inside this repository's tree (the committed fixture, the package, the repository's top level, a
// directory of it outside the package, a link elsewhere into it); the live command takes no --from. The control: a
// temporary copy of the fixture is accepted.
import test from "node:test";
import assert from "node:assert/strict";
import { fromRefusalProblems } from "./pv-checks.mjs";

test("PV7: the preview content command refuses a missing --from and a --from inside this repository", async () => {
  assert.deepEqual(await fromRefusalProblems(), []);
});
