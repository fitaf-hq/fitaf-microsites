// QE13 (SPEC-print-pieces.md § 11 item 5's Q13; the name Q13 is § 8's, see qe-checks.mjs): `build:print` with no
// `--event` carries `boston` (§ 11 item 2, one named value): its report names `boston` and https://eatfitaf.com/?e=boston,
// every printed page's QR code decodes to that URL, face by face, and its QR SVG is writeQrCodes' for that URL
// (qe-checks.mjs printDefaultProblems, the check its mirror mutant re-runs: qe13-default-mutant.test.mjs). `--event`
// still names any other. Built with no photos, into a temporary folder; Chrome, and skips, saying so, without it.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import * as print from "../print/build-print.mjs";
import { lockedBuild, NO_CHROME } from "./print-fixtures.mjs";
import { ON, printDefaultProblems } from "./qe-checks.mjs";

test("QE13: the print build's default event is one named value, boston", () => {
  assert.equal(print.PRINT_EVENT, "boston");
});

test("QE13: build:print with no --event reports boston and its URL, and every printed code decodes to it", { skip: NO_CHROME }, async () => {
  assert.deepEqual(await printDefaultProblems(ROOT), []);
});

test("QE13: --event still names another event (demo), and the report says so", { skip: NO_CHROME }, async () => {
  const out = await mkdtemp(join(tmpdir(), "boston-qe13-event-"));
  try {
    const built = await lockedBuild({ outDir: out, today: ON, eventId: "demo", fourFlyers: false });
    assert.deepEqual(
      built.lines.filter((l) => l.startsWith("QR: ")),
      ['QR: event "demo" (--event) carries https://eatfitaf.com/ (qr/demo.svg, written by build.mjs writeQrCodes)'],
    );
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
