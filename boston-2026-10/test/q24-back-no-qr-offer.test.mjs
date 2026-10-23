// Q24 (SPEC-print-pieces.md § 12 item 3): no QR code and no offer on the back. The front carries both; the offer's words
// are not approved, and one place for them is enough. In the back's markup (its own page, and the second sheet of the
// flyer's two-page document): no QR image, no offer part, not the offer's words, not the scan prompt; and as Chrome lays
// it out: no QR code measured, no offer block. The front carries both (the control).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadInputs, MOCKUPS_DIR } from "../mockups/build-mockups.mjs";
import { campaign } from "../mockups/parts.mjs";
import { readBack } from "../print/back.mjs";
import { PRINT_DIR } from "../print/build-print.mjs";
import { backPage, printDocument, printPage } from "../print/pages.mjs";
import { PRINT_PIECES } from "../print/sizes.mjs";
import { elements, hasClass, pieceRuns } from "./mockup-html.mjs";
import { lockedBuild, NO_CHROME } from "./print-fixtures.mjs";
import { committedBackPath, ON } from "./qb-checks.mjs";

const printCss = await readFile(join(PRINT_DIR, "print.css"), "utf8");
const inputs = await loadInputs({ photosDir: join(MOCKUPS_DIR, "no-such-folder"), today: ON });
const flyer = PRINT_PIECES.find((p) => p.id === "flyer");
const back = await readBack(committedBackPath());
const c = campaign(inputs);

/** The QR images, offer parts, and the offer's and scan prompt's words in a page's markup. */
function qrAndOffer(html) {
  const els = elements(html);
  const text = pieceRuns(html).map((r) => r.text).join(" ");
  return [
    ...els.filter((e) => e.tag === "img" && hasClass(e, "qr")).map(() => "a QR code"),
    ...els.filter((e) => e.tag === "img" && /(^|\/)qr\//.test(e.attrs.src ?? "")).map((e) => `an image of ${e.attrs.src}`),
    ...els.filter((e) => hasClass(e, "offer")).map(() => "the offer part"),
    ...[c.offer.value, c.scan.value].filter((w) => text.includes(w)).map((w) => `"${w}"`),
  ];
}

/** The second sheet of a two-sheet document, as a page of its own (the document's head kept). */
function secondSheet(html) {
  const sheets = html.split(/(?=<div class="print-sheet\b)/);
  assert.equal(sheets.length, 3, "the head, then the front's sheet and the back's (control)");
  return `${sheets[0]}${sheets[2]}`;
}

test("Q24: the back's markup carries no QR code and no offer; the front carries both (control)", () => {
  assert.deepEqual(qrAndOffer(backPage(inputs, back, printCss)), [], "the back's page");
  assert.deepEqual(qrAndOffer(secondSheet(printDocument(flyer, inputs, printCss, back))), [], "the document's second sheet");
  assert.deepEqual(qrAndOffer(printPage(flyer, inputs, printCss)), ["a QR code", "an image of qr/demo.svg", "the offer part", `"${c.offer.value}"`], "the front");
});

test("Q24: built, the back as Chrome lays it out has no QR code and no offer; the front has both", { skip: NO_CHROME }, async () => {
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const dir = await mkdtemp(join(tmpdir(), "boston-q24-"));
  try {
    const built = await lockedBuild({ outDir: join(dir, "dist-print"), today: ON, fourFlyers: false });
    const [p] = built.planned.filter((q) => q.piece.id === "flyer");
    const [backFace] = p.back.measured.faces;
    assert.deepEqual(backFace.qrs, [], "no QR code on the back");
    assert.deepEqual(backFace.blocks.filter((b) => b.what.split(".").includes("offer")), [], "no offer on the back");
    assert.ok(!backFace.texts.some((t) => t.text.includes(c.offer.value)), "not the offer's words");
    const [front] = p.measured.faces;
    assert.equal(front.qrs.length, 1, "control: the front's QR code");
    assert.equal(front.blocks.filter((b) => b.what.split(".").includes("offer")).length, 1, "control: the front's offer");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
