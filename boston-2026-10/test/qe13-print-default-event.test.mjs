// QE13 (SPEC-print-pieces.md § 11 item 5's Q13; the name Q13 is § 8's, see qe-checks.mjs): `build:print` with no
// `--event` carries `boston` (§ 11 item 2, one named value): its report names `boston` and https://eatfitaf.com/?e=boston,
// every printed page's QR code decodes to that URL, face by face, and its QR SVG is writeQrCodes' for that URL, while the
// address printed under the code is the URL's host, `eatfitaf.com` (§ 11 item 4, the orchestrator's ruling 2026-10-18)
// (qe-checks.mjs printDefaultProblems, the check its mirror mutant re-runs: qe13-default-mutant.test.mjs). `--event`
// still names any other. Built with no photos, into a temporary folder; Chrome, and skips, saying so, without it.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EVENTS_PATH, loadJson, ROOT } from "../build.mjs";
import { loadInputs, MOCKUPS_DIR } from "../mockups/inputs.mjs";
import { campaign } from "../mockups/parts.mjs";
import * as print from "../print/build-print.mjs";
import { lockedBuild, NO_CHROME } from "./print-fixtures.mjs";
import { ADDRESS, ON, printDefaultProblems } from "./qe-checks.mjs";

test("QE13: the print build's default event is one named value, boston", () => {
  assert.equal(print.PRINT_EVENT, "boston");
});

test("QE13: every event's address is its URL's host, eatfitaf.com, and its code carries the full URL (§ 11 item 4)", async () => {
  const events = await loadJson(EVENTS_PATH);
  assert.ok(events.some((e) => new URL(e.url).search), "control: an event's URL carries a query");
  for (const e of events) {
    const c = campaign(await loadInputs({ photosDir: join(MOCKUPS_DIR, "no-such-folder"), today: ON, eventId: e.id }));
    assert.equal(c.address.value, ADDRESS, `${e.id}: the address`);
    assert.equal(c.address.value, new URL(e.url).host, `${e.id}: the address is the URL's host`);
    assert.equal(c.qr.url, e.url, `${e.id}: the code's URL`);
  }
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
