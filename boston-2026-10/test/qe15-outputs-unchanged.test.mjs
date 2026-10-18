// QE15 (SPEC-print-pieces.md § 11 item 5's Q15; the name Q15 is § 8's, see qe-checks.mjs): S20 and the mock-ups'
// outputs byte-identical (§ 11 item 4), read as the orchestrator clarified it on 2026-10-18: the production build
// byte-identical, the development page at `/` (and `/demo/`) byte-identical, and the two new development pages present,
// each with its own event id built in. Each output is built twice, from data/events.json as committed and from a copy
// holding its first event alone (the file as it was before § 11), and compared file by file, SHA-256:
//   production (`npm run build`): every file of the one-event build byte-identical; added exactly qr/boston.* and
//     qr/seminar.* (§ 11 item 3; S20's golden lists those four beside the files it held);
//   development (`build:dev`): every file byte-identical; added exactly boston/index.html and seminar/index.html, each
//     the demo page with its own event id where demo's is, and nothing else changed;
//   mock-ups (`build:mockups`, no PNG; --on fixed, no photos): every file byte-identical; added exactly qr/boston.* and
//     qr/seminar.* (the build writes every event's code; the pieces show the first's).
// ⚠ Amended at the merge of boston/analytics into boston/integration-1022 (2026-10-18, ac52905; found at the merge, not
// ruled): § 11 item 4's "byte for byte" rests on "events.json's other ids are not read by today's page", and item 6
// leaves "the analytics' reading of ?e=" to SPEC-analytics.md, whose § 9 item 2 reads the id against data/events.json:
// every page now carries the events' ids, as one JSON list in its analytics script. So the production and development
// pages of the two builds DIFFER, by that list alone: each page that differs must hold the committed events' ids
// (["demo","boston","seminar"]) exactly once, and with them put back to the first event's alone (["demo"]) it must be the
// one-event build's page byte for byte. Every other file stays byte-identical, and the mock-ups are unchanged.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { build, EVENTS_PATH, loadJson } from "../build.mjs";
import { buildMockups } from "../mockups/build-mockups.mjs";
import { ON } from "./qe-checks.mjs";

const tmp = await mkdtemp(join(tmpdir(), "boston-qe15-"));
after(() => rm(tmp, { recursive: true, force: true }));
const committedEvents = await loadJson(EVENTS_PATH);
const firstOnly = join(tmp, "events-first.json");
await writeFile(firstOnly, `${JSON.stringify([committedEvents[0]], null, 2)}\n`);
const NEW_CODES = ["qr/boston.png", "qr/boston.svg", "qr/seminar.png", "qr/seminar.svg"];
/** The analytics' QR ids as each build's pages carry them (SPEC-analytics.md § 9 item 2): every event's, and the first's. */
const QR_IDS_ALL = JSON.stringify(committedEvents.map((e) => e.id));
const QR_IDS_FIRST = JSON.stringify([committedEvents[0].id]);

async function hashes(dir) {
  const out = {};
  const walk = async (d) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const path = join(d, e.name);
      if (e.isDirectory()) await walk(path);
      else out[relative(dir, path)] = createHash("sha256").update(await readFile(path)).digest("hex");
    }
  };
  await walk(dir);
  return out;
}

/** What `make(outDir, eventsPath)` writes, as committed and from the first event alone: the files changed, the added. */
async function twice(name, make) {
  const [now, before] = [join(tmp, `${name}-now`), join(tmp, `${name}-first`)];
  await make(now, EVENTS_PATH);
  await make(before, firstOnly);
  const [a, b] = [await hashes(now), await hashes(before)];
  assert.ok(Object.keys(b).length >= 5, `control: the one-event ${name} build wrote its files (${Object.keys(b).length})`);
  return {
    changed: Object.keys(b).filter((k) => a[k] !== b[k]).sort(),
    added: Object.keys(a).filter((k) => !(k in b)).sort(),
    now,
    before,
  };
}

/** Of `changed`, the files that still differ once each page's QR id list is put back to the first event's alone; every
 *  page that differs must hold the committed events' list exactly once (the amendment at the merge, above). */
async function changedBeyondQrIds({ changed, now, before }) {
  const still = [];
  for (const rel of changed) {
    if (!rel.endsWith(".html")) {
      still.push(rel);
      continue;
    }
    const page = await readFile(join(now, rel), "utf8");
    assert.equal(page.split(QR_IDS_ALL).length - 1, 1, `${rel}: the analytics' QR ids ${QR_IDS_ALL}, once`);
    if (page.replace(QR_IDS_ALL, QR_IDS_FIRST) !== (await readFile(join(before, rel), "utf8"))) still.push(rel);
  }
  return still;
}

test("QE15: the production build is the one-event build byte for byte but for the analytics' QR ids, plus the boston and seminar codes", async () => {
  const built = await twice("prod", (outDir, eventsPath) => build({ target: "prod", outDir, eventsPath }));
  assert.deepEqual(built.changed, ["index.html"], "control: the page carries the events' ids (SPEC-analytics § 9 item 2)");
  assert.deepEqual(await changedBeyondQrIds(built), [], "every file of the one-event build byte-identical, the page but for its QR ids");
  assert.deepEqual(built.added, NEW_CODES);
});

test("QE15: the development build keeps / and /demo/ byte for byte but for the analytics' QR ids, and adds /boston/ and /seminar/, each its own event id", async () => {
  const built = await twice("dev", (outDir, eventsPath) => build({ target: "dev", outDir, eventsPath }));
  const { added, now } = built;
  assert.deepEqual(built.changed, ["demo/index.html", "index.html"], "control: the pages carry the events' ids (SPEC-analytics § 9 item 2)");
  assert.deepEqual(await changedBeyondQrIds(built), [], "every file of the one-event build byte-identical, the pages but for their QR ids");
  assert.deepEqual(added, ["boston/index.html", "seminar/index.html"]);
  const demo = await readFile(join(now, "demo", "index.html"), "utf8");
  assert.equal(demo.split('"event_id":"demo"').length - 1, 1, "control: demo's page carries its event id once");
  for (const id of ["boston", "seminar"]) {
    const page = await readFile(join(now, id, "index.html"), "utf8");
    assert.equal(page.split(`"event_id":"${id}"`).length - 1, 1, `${id}/index.html carries its own event id once`);
    assert.equal(page.replace(`"event_id":"${id}"`, '"event_id":"demo"'), demo, `${id}/index.html is demo's page but for its event id`);
  }
});

test("QE15: the mock-ups are the one-event mock-ups byte for byte, plus the boston and seminar codes", async () => {
  const noPhotos = join(tmp, "no-such-folder");
  const { changed, added } = await twice("mockups", (outDir, eventsPath) => buildMockups({ outDir, png: false, photosDir: noPhotos, today: ON, eventsPath }));
  assert.deepEqual(changed, [], "every page and file of the one-event mock-ups byte-identical");
  assert.deepEqual(added, NEW_CODES);
});
