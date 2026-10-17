// Q9 (SPEC-print-pieces.md § 7 items 1 and 4): the printed face's parts sit where the mock-up's sheet puts them, the same
// boxes, scaled. Chrome draws the mock-up's own sheet (build:mockups' HTML) and the print page, and one script measures,
// in each .board, every part a viewer sees (each element citing its source, each photo, the rule, the offer, the scan
// block, the plan names) and every run of text (its glyphs' box): relative to the board, divided by its width (so the
// scale drops out), and clipped to the board, the trim (a part may run on into the bleed; that moves nothing inside the
// trim). The tent's upper face is read turned back. ⛔ No print rule moves a part: the lists match, part for part. The
// flyer is held to it too (§ 7: "the print build re-lays out no face").
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { copyStatic, writeQrCodes } from "../build.mjs";
import { buildMockups, loadInputs } from "../mockups/build-mockups.mjs";
import { runChrome, SETTLE_MS } from "../mockups/png.mjs";
import { PRINT_DIR } from "../print/build-print.mjs";
import { printPage } from "../print/pages.mjs";
import { PRINT_PIECES } from "../print/sizes.mjs";
import { CHROME, NO_CHROME, oneAtATime } from "./print-fixtures.mjs";

const tmp = await mkdtemp(join(tmpdir(), "boston-q9-"));
after(() => rm(tmp, { recursive: true, force: true }));
/** Half a mock-up pixel, in board widths: the most a box may differ by (the print is zoomed, its text drawn at 0.8×). */
const TOLERANCE = (px) => 0.5 / px;

/** The measuring script: every part and text run of each .board, as [x, y, w, h] in board widths, clipped to the board. */
const MEASURE = `(() => {
  const PARTS = "[data-src], [data-slot], .rule, .offer, .scan, .plan-names li, .event-bar, .tent-photos, .tent-body, .flyer-hero, .flyer-body, .logo-plate";
  const measure = (board) => {
    const b = board.getBoundingClientRect();
    const rel = (r) => {
      const x0 = Math.max(r.left, b.left), y0 = Math.max(r.top, b.top), x1 = Math.min(r.right, b.right), y1 = Math.min(r.bottom, b.bottom);
      return [x0 - b.left, y0 - b.top, x1 - x0, y1 - y0].map((v) => v / b.width);
    };
    const parts = [...board.querySelectorAll(PARTS)].filter((el) => !el.closest("[data-annotation]"))
      .map((el) => ({ what: el.tagName.toLowerCase() + "." + [...el.classList].join("."), box: rel(el.getBoundingClientRect()) }));
    const walker = document.createTreeWalker(board, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.data.trim() || n.parentElement.closest("[data-annotation]")) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      parts.push({ what: "text " + n.data.trim(), box: rel(range.getBoundingClientRect()) });
    }
    return { width: b.width, height: b.height, parts };
  };
  document.fonts.ready.then(() => {
    const s = document.createElement("script");
    s.type = "application/json";
    s.id = "q9-measure";
    s.textContent = JSON.stringify([...document.querySelectorAll(".board")].map(measure));
    document.body.append(s);
  });
})();`;
const MEASURED = /<script\b[^>]*\bid="q9-measure"[^>]*>([\s\S]*?)<\/script>/;

async function measured(html) {
  const copy = html.replace(/\.html$/, ".q9.html");
  await writeFile(copy, (await readFile(html, "utf8")).replace("</body>", `<script>${MEASURE}</script>\n</body>`));
  const json = await runChrome({
    chrome: CHROME,
    html: copy,
    args: [`--virtual-time-budget=${SETTLE_MS}`, "--window-size=1920,1080", "--dump-dom"],
    ready: ({ stdout }) => MEASURED.exec(stdout)?.[1],
    what: `measure ${copy}`,
    timeoutMs: 30_000,
    attempts: 3,
  });
  return JSON.parse(json);
}

/** A face turned 180° read back upright: each box mirrored in both axes within the board. */
const turnedBack = (face) => ({
  ...face,
  parts: face.parts.map(({ what, box: [x, y, w, h] }) => ({ what, box: [1 - x - w, face.height / face.width - y - h, w, h] })),
});

function assertSameBoxes(label, printed, mockup) {
  assert.deepEqual(printed.parts.map((p) => p.what), mockup.parts.map((p) => p.what), `${label}: the same parts, in order`);
  const tol = TOLERANCE(mockup.width);
  const moved = printed.parts
    .map((p, i) => ({ what: p.what, d: Math.max(...p.box.map((v, k) => Math.abs(v - mockup.parts[i].box[k]))) }))
    .filter((m) => m.d > tol)
    .map((m) => `${m.what} (${(m.d * mockup.width).toFixed(2)} mock-up px)`);
  assert.deepEqual(moved, [], `${label}: parts not where the mock-up's sheet puts them`);
}

test("Q9: each printed face's parts sit where the mock-up's sheet puts them: the same boxes, scaled", { skip: NO_CHROME }, async () => {
  const inputs = await loadInputs({ photosDir: join(tmp, "no-photos"), today: "2026-10-20" });
  const printCss = await readFile(join(PRINT_DIR, "print.css"), "utf8");
  const stage = join(tmp, "print");
  await copyStatic(stage, { base: null });
  await writeQrCodes(inputs.data.events, stage);
  const mockups = await buildMockups({ outDir: join(tmp, "mockups"), png: false, photosDir: join(tmp, "no-photos"), today: "2026-10-20" });
  await oneAtATime(async () => {
    for (const piece of PRINT_PIECES) {
      const page = join(stage, `${piece.id}.html`);
      await writeFile(page, printPage(piece, inputs, printCss));
      const [mockup] = await measured(mockups.pages.find((f) => f.endsWith(`/${piece.id}.html`)));
      const faces = await measured(page);
      assert.equal(faces.length, piece.faces, `${piece.id}: ${piece.faces} face(s)`);
      assert.ok(mockup.parts.length >= 15 && mockup.parts.some((p) => p.what.startsWith("text ")), `${piece.id}: the parts are measured (control)`);
      assert.ok(Math.abs(faces.at(-1).height / faces.at(-1).width - mockup.height / mockup.width) < 1e-6, `${piece.id}: the face has the mock-up's proportions`);
      assertSameBoxes(`${piece.id}, ${piece.faces > 1 ? "the lower face" : "the face"}`, faces.at(-1), mockup);
      if (piece.faces > 1) assertSameBoxes(`${piece.id}, the upper face, turned back`, turnedBack(faces[0]), mockup);
    }
  });
});

test("Q9 control: a part moved by a hair more than the tolerance is caught", () => {
  const mockup = { width: 480, height: 720, parts: [{ what: "h1.headline", box: [0.05, 0.4, 0.5, 0.06] }] };
  assert.doesNotThrow(() => assertSameBoxes("same", mockup, mockup));
  const moved = { ...mockup, parts: [{ what: "h1.headline", box: [0.05 + 0.6 / 480, 0.4, 0.5, 0.06] }] };
  assert.throws(() => assertSameBoxes("moved", moved, mockup), /h1\.headline \(0\.60 mock-up px\)/);
  assert.throws(() => assertSameBoxes("missing", { ...mockup, parts: [] }, mockup), /the same parts, in order/);
});
