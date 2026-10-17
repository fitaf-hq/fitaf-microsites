// Q7 (SPEC-print-pieces.md § 1, § 5): one source. A word changed in the shared message file (data/messages.json, in a
// mirror: a changed copy, never the file) changes the mock-up's tent card and the printed one alike (since § 9 the flyer
// carries no word from that file), and a changed offer the mock-up's flyer and the printed flyer. Every text run a printed
// piece carries is the mock-up's own, less the words §§ 8–9 drop (the tent's twice, one per face), so the print adds no
// word; it loads the QR code build.mjs writes; and its stylesheet draws no colour of its own.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MESSAGES_PATH } from "../build.mjs";
import { loadInputs, MOCKUPS_DIR, OFFERS_PATH, renderMockups } from "../mockups/build-mockups.mjs";
import { PRINT_DIR } from "../print/build-print.mjs";
import { printPage, VARIANTS } from "../print/pages.mjs";
import { PRINT_PIECES } from "../print/sizes.mjs";
import { rawColours } from "../scripts/contrast.mjs";
import { elements, hasClass, pieceRuns } from "./mockup-html.mjs";
import { droppedWords } from "./print-fixtures.mjs";

const tmp = await mkdtemp(join(tmpdir(), "boston-q7-"));
after(() => rm(tmp, { recursive: true, force: true }));
const printCss = await readFile(join(PRINT_DIR, "print.css"), "utf8");
const noPhotos = join(MOCKUPS_DIR, "no-such-folder");
const piece = (id) => PRINT_PIECES.find((p) => p.id === id);
const texts = (html) => pieceRuns(html).map((r) => r.text.trim());
const WORD = "Q7SHAREDWORD";

test("Q7: a word changed in the shared message file (a mirror) changes the mock-up's tent card and the printed one alike", async () => {
  // § 9 took the flyer's last words from the message file (its bar), so the word is the tent's bar's, which both carry
  const messages = JSON.parse(await readFile(MESSAGES_PATH, "utf8"));
  assert.ok(Array.isArray(messages.event_line) && messages.event_line.length === 2, "the bar's words are in the file (control)");
  const mirror = join(tmp, "messages.json");
  await writeFile(mirror, JSON.stringify({ ...messages, event_line: [messages.event_line[0], WORD] }));
  const before = await loadInputs({ photosDir: noPhotos, today: "2026-10-20" });
  const after_ = await loadInputs({ photosDir: noPhotos, today: "2026-10-20", messagesPath: mirror });
  for (const [label, inputs, expected] of [["as committed", before, false], ["the mirror", after_, true]]) {
    assert.equal(texts(renderMockups(inputs)["tent-card"]).includes(WORD), expected, `${label}: the mock-up's tent card`);
    for (const variant of VARIANTS) {
      const printed = printPage(piece("tent-card"), inputs, printCss, variant);
      assert.equal(texts(printed).filter((t) => t === WORD).length, expected ? 2 : 0, `${label}: the printed tent ${variant}, once a face`);
    }
  }
});

test("Q7: a changed offer (a mirror of the offer file) changes the mock-up's flyer and the printed flyer alike", async () => {
  const offers = JSON.parse(await readFile(OFFERS_PATH, "utf8"));
  const mirror = join(tmp, "offers.json");
  await writeFile(mirror, JSON.stringify({ ...offers, offers: offers.offers.map((o) => ({ ...o, label: WORD })) }));
  const before = await loadInputs({ photosDir: noPhotos, today: "2026-10-20" });
  const after_ = await loadInputs({ photosDir: noPhotos, today: "2026-10-20", offersPath: mirror });
  for (const [label, inputs, expected] of [["as committed", before, false], ["the mirror", after_, true]]) {
    assert.equal(texts(renderMockups(inputs).flyer).includes(WORD), expected, `${label}: the mock-up's flyer`);
    assert.equal(texts(printPage(piece("flyer"), inputs, printCss)).filter((t) => t === WORD).length, expected ? 1 : 0, `${label}: the printed flyer`);
  }
});

test("Q7: every text run on a printed piece is the mock-up's own, less § 8's dropped words: in order, nothing added", async () => {
  const inputs = await loadInputs({ photosDir: noPhotos, today: "2026-10-20" });
  const mockups = renderMockups(inputs);
  for (const p of PRINT_PIECES) {
    const dropped = droppedWords(inputs, p.id);
    const mine = texts(mockups[p.id]);
    assert.ok(mine.length >= 6 && dropped.every((w) => mine.includes(w)), `${p.id}: the mock-up has the text, the dropped words among it (control)`);
    const kept = mine.filter((t) => !dropped.includes(t));
    for (const variant of VARIANTS) {
      assert.deepEqual(texts(printPage(p, inputs, printCss, variant)), Array.from({ length: p.faces }, () => kept).flat(), `${p.id} ${variant}`);
    }
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
