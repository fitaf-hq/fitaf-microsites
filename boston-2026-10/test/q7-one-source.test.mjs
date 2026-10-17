// Q7 (SPEC-print-pieces.md § 1, § 5): one source. A word changed in the shared message file (data/messages.json, in a
// mirror: a changed copy, never the file) changes the mock-up's flyer and the printed flyer alike. Every text run a
// printed piece carries is the mock-up's own (the tent's twice, one per face), so the print adds no word; it loads the
// QR code build.mjs writes; and its stylesheet draws no colour of its own.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MESSAGES_PATH } from "../build.mjs";
import { loadInputs, MOCKUPS_DIR, renderMockups } from "../mockups/build-mockups.mjs";
import { PRINT_DIR } from "../print/build-print.mjs";
import { printPage } from "../print/pages.mjs";
import { PRINT_PIECES } from "../print/sizes.mjs";
import { rawColours } from "../scripts/contrast.mjs";
import { elements, hasClass, pieceRuns } from "./mockup-html.mjs";

const tmp = await mkdtemp(join(tmpdir(), "boston-q7-"));
after(() => rm(tmp, { recursive: true, force: true }));
const printCss = await readFile(join(PRINT_DIR, "print.css"), "utf8");
const noPhotos = join(MOCKUPS_DIR, "no-such-folder");
const piece = (id) => PRINT_PIECES.find((p) => p.id === id);
const texts = (html) => pieceRuns(html).map((r) => r.text.trim());
const WORD = "Q7SHAREDWORD";

test("Q7: a word changed in the shared message file (a mirror) changes the mock-up's flyer and the printed flyer alike", async () => {
  const messages = JSON.parse(await readFile(MESSAGES_PATH, "utf8"));
  assert.ok(messages.headline && messages.tagline, "the flyer's headline and tagline are in the file (control)");
  const mirror = join(tmp, "messages.json");
  await writeFile(mirror, JSON.stringify({ ...messages, headline: `${messages.headline} ${WORD}`, tagline: WORD }));
  const before = await loadInputs({ photosDir: noPhotos, today: "2026-10-20" });
  const after_ = await loadInputs({ photosDir: noPhotos, today: "2026-10-20", messagesPath: mirror });
  for (const [label, inputs, expected] of [["as committed", before, false], ["the mirror", after_, true]]) {
    const mockup = renderMockups(inputs).flyer;
    const printed = printPage(piece("flyer"), inputs, printCss);
    assert.equal(texts(mockup).join(" ").includes(WORD), expected, `${label}: the mock-up's flyer`);
    assert.equal(texts(printed).join(" ").includes(WORD), expected, `${label}: the printed flyer`);
    assert.equal(texts(printed).filter((t) => t === WORD).length, expected ? 1 : 0, `${label}: the tagline, once`);
  }
});

test("Q7: every text run on a printed piece is the mock-up's own: the flyer's once, the tent's once per face", async () => {
  const inputs = await loadInputs({ photosDir: noPhotos, today: "2026-10-20" });
  const mockups = renderMockups(inputs);
  for (const p of PRINT_PIECES) {
    const mine = texts(mockups[p.id]);
    assert.ok(mine.length >= 6, `${p.id}: the mock-up has text (control)`);
    assert.deepEqual(texts(printPage(p, inputs, printCss)), Array.from({ length: p.faces }, () => mine).flat(), p.id);
  }
});

test("Q7: each printed face loads the build's QR code for the event, cited from data/events.json", async () => {
  const inputs = await loadInputs({ photosDir: noPhotos, today: "2026-10-20" });
  const event = inputs.data.events[inputs.eventIndex];
  for (const p of PRINT_PIECES) {
    const qrs = elements(printPage(p, inputs, printCss)).filter((e) => e.tag === "img" && hasClass(e, "qr"));
    assert.equal(qrs.length, p.faces, `${p.id}: one QR code per face`);
    for (const qr of qrs) assert.deepEqual([qr.attrs.src, qr.attrs["data-src"]], [`qr/${event.id}.svg`, "data/events.json#/0/url"]);
  }
  for (const name of await readdir(PRINT_DIR)) {
    if (!/\.m?js$/.test(name)) continue;
    const code = await readFile(join(PRINT_DIR, name), "utf8");
    assert.doesNotMatch(code, /from\s+["']qrcode["']|import\(\s*["']qrcode["']|require\(\s*["']qrcode["']/, `${name} has no QR generator`);
  }
});

test("Q7: the print stylesheet draws no raw colour, no token of its own and nothing translucent", () => {
  assert.deepEqual(rawColours(printCss), []);
  assert.doesNotMatch(printCss, /:root\s*\{/);
  assert.doesNotMatch(printCss, /\bopacity\s*:|\btransparent\b|mix-blend-mode|backdrop-filter|rgba?\(|hsla?\(/i);
  assert.equal(rawColours(".x { background: #1b2360; }").length, 1, "control: the check fires");
});
