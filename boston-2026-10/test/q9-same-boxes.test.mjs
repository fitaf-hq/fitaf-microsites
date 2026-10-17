// Q9 (SPEC-print-pieces.md §§ 7–8): the printed face's parts sit where the mock-up's sheet puts them, the same boxes,
// scaled, for every part that § 8 did not move. Chrome draws the mock-up's own sheet (build:mockups' HTML; § 8 leaves the
// mock-ups as they are) and each print page, and one script measures, in each .board, every part a viewer sees (each
// element citing its source, each photo, the rule, the offer, the scan block, the plan names, the logo plates) and every
// run of text (its glyphs' box): relative to the board, divided by its width (so the scale drops out), and clipped to the
// board, the trim (a part may run on into the bleed; that moves nothing inside the trim). A part is known by what it
// cites (else its tag and classes), a run of text by its element, so no word is typed here. For each piece and logo
// variant the tables below say which parts § 8 drops, adds and moves; every other part must be where it was, and every
// part said to move must have moved. The tent's upper face is read turned back. ⭐ Since § 9 the FLYER is not held to it:
// § 9 lays the flyer out anew (no header, a 3:2 photo, the logo at the bottom right), so no part of it stays where the
// mock-up has it; Q16 measures the flyer's new layout instead.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { copyStatic, writeQrCodes } from "../build.mjs";
import { buildMockups, loadInputs } from "../mockups/build-mockups.mjs";
import { runChrome, SETTLE_MS } from "../mockups/png.mjs";
import { PRINT_DIR } from "../print/build-print.mjs";
import { printPage, VARIANTS } from "../print/pages.mjs";
import { PRINT_PIECES } from "../print/sizes.mjs";
import { CHROME, NO_CHROME, oneAtATime } from "./print-fixtures.mjs";

const tmp = await mkdtemp(join(tmpdir(), "boston-q9-"));
after(() => rm(tmp, { recursive: true, force: true }));
/** Half a mock-up pixel, in board widths: the most a box may differ by (the print is zoomed, its text drawn at 0.8×). */
const TOLERANCE = (px) => 0.5 / px;

/** The measuring script: each .board's parts and text runs, keyed, as [x, y, w, h] in board widths, clipped to the board. */
const MEASURE = `(() => {
  const PARTS = "[data-src], [data-slot], .rule, .offer, .scan, .plan-names li, .event-bar, .tent-photos, .tent-body, .flyer-hero, .flyer-body, .logo-plate, .bar-plate";
  const keyOf = (el) => (el.dataset.src ? "src " + el.dataset.src : el.tagName.toLowerCase() + "." + [...el.classList].join("."));
  const measure = (board) => {
    const b = board.getBoundingClientRect();
    const rel = (r) => {
      const x0 = Math.max(r.left, b.left), y0 = Math.max(r.top, b.top), x1 = Math.min(r.right, b.right), y1 = Math.min(r.bottom, b.bottom);
      return [x0 - b.left, y0 - b.top, x1 - x0, y1 - y0].map((v) => v / b.width);
    };
    const parts = [...board.querySelectorAll(PARTS)].filter((el) => !el.closest("[data-annotation]"))
      .map((el) => ({ key: keyOf(el), box: rel(el.getBoundingClientRect()) }));
    const walker = document.createTreeWalker(board, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.data.trim() || n.parentElement.closest("[data-annotation]")) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      parts.push({ key: "text in " + keyOf(n.parentElement), box: rel(range.getBoundingClientRect()) });
    }
    const seen = {};
    for (const p of parts) { seen[p.key] = (seen[p.key] ?? 0) + 1; if (seen[p.key] > 1) p.key += " #" + seen[p.key]; }
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
  parts: face.parts.map(({ key, box: [x, y, w, h] }) => ({ key, box: [1 - x - w, face.height / face.width - y - h, w, h] })),
});

/** What § 8 does to each piece's parts, by key: dropped (on the mock-up, not printed), added, and moved. */
const src = (pointer) => `src ${pointer}`;
const textIn = (key) => `text in ${key}`;
const withText = (...keys) => keys.flatMap((k) => [k, textIn(k)]);
const LOGO = src("src/assets/fitaf-logo.png");
const OFFER = src("data/offers.json#/offers/1/label");
const URL_ = src("data/events.json#/0/url");
const BAR_WORDS = withText(src("data/messages.json#/event_line/0"), src("data/messages.json#/event_line/1"));
const HEADLINE = withText(src("data/messages.json#/headline"));
/** Both pieces: the address under the QR code (§ 8 items 1–2), so the scan block, the code, the address and the offer move. */
const SCAN = { dropped: [], added: [], moved: [OFFER, textIn(OFFER), URL_, `${URL_} #2`, textIn(URL_)] }; // the code, the address, its words
function expected(variant) {
  const dropped = ["div.scan.tent-scan", ...withText(src("data/messages.json#/scan_prompt")), ...withText(src("data/messages.json#/subhead"))];
  const added = ["div.scan.scan-under.tent-scan"];
  if (variant === "a") added.push("b.bar-plate");
  if (variant === "b") added.push("div.logo-plate");
  const moved = [...SCAN.moved, LOGO, "span.rule", ...HEADLINE]; // the body's logo gone (a, b) or larger (c)
  if (variant === "a") moved.push(...BAR_WORDS); // the logo into the bar; the bar's words beside it
  return { dropped, added, moved };
}

function assertSameBoxes(label, printed, mockup, { dropped = [], added = [], moved = [] } = {}) {
  const was = new Map(mockup.parts.map((p) => [p.key, p.box]));
  const now = new Map(printed.parts.map((p) => [p.key, p.box]));
  assert.deepEqual([...was.keys()].filter((k) => !now.has(k)).sort(), [...dropped].sort(), `${label}: the parts dropped`);
  assert.deepEqual([...now.keys()].filter((k) => !was.has(k)).sort(), [...added].sort(), `${label}: the parts added`);
  const tol = TOLERANCE(mockup.width);
  const shift = (k) => Math.max(...now.get(k).map((v, i) => Math.abs(v - was.get(k)[i])));
  const both = [...now.keys()].filter((k) => was.has(k));
  const strayed = both.filter((k) => !moved.includes(k) && shift(k) > tol).map((k) => `${k} (${(shift(k) * mockup.width).toFixed(2)} mock-up px)`);
  assert.deepEqual(strayed, [], `${label}: parts not where the mock-up's sheet puts them`);
  const stayed = moved.filter((k) => !now.has(k) || shift(k) <= tol);
  assert.deepEqual(stayed, [], `${label}: parts § 8 moves, found unmoved (or missing)`);
}

test("Q9: each printed tent face's parts sit where the mock-up's sheet puts them, but for those § 8 drops, adds and moves", { skip: NO_CHROME }, async () => {
  const inputs = await loadInputs({ photosDir: join(tmp, "no-photos"), today: "2026-10-20" });
  const printCss = await readFile(join(PRINT_DIR, "print.css"), "utf8");
  const stage = join(tmp, "print");
  await copyStatic(stage, { base: null });
  await writeQrCodes(inputs.data.events, stage);
  const mockups = await buildMockups({ outDir: join(tmp, "mockups"), png: false, photosDir: join(tmp, "no-photos"), today: "2026-10-20" });
  await oneAtATime(async () => {
    for (const piece of PRINT_PIECES.filter((p) => p.id === "tent-card")) {
      const [mockup] = await measured(mockups.pages.find((f) => f.endsWith(`/${piece.id}.html`)));
      assert.ok(mockup.parts.length >= 15 && mockup.parts.some((p) => p.key.startsWith("text in ")), `${piece.id}: the parts are measured (control)`);
      for (const variant of VARIANTS) {
        const page = join(stage, `${piece.id}-${variant}.html`);
        await writeFile(page, printPage(piece, inputs, printCss, variant));
        const faces = await measured(page);
        assert.equal(faces.length, piece.faces, `${piece.id} ${variant}: ${piece.faces} face(s)`);
        assert.ok(Math.abs(faces.at(-1).height / faces.at(-1).width - mockup.height / mockup.width) < 1e-6, `${piece.id}: the mock-up's proportions`);
        const rules = expected(variant);
        assertSameBoxes(`${piece.id} ${variant}, ${piece.faces > 1 ? "the lower face" : "the face"}`, faces.at(-1), mockup, rules);
        if (piece.faces > 1) assertSameBoxes(`${piece.id} ${variant}, the upper face, turned back`, turnedBack(faces[0]), mockup, rules);
      }
    }
  });
});

test("Q9 control: a part moved by a hair more than the tolerance is caught, as is a part said to move that did not", () => {
  const mockup = { width: 480, height: 720, parts: [{ key: "src h", box: [0.05, 0.4, 0.5, 0.06] }, { key: "src o", box: [0.05, 0.6, 0.5, 0.06] }] };
  assert.doesNotThrow(() => assertSameBoxes("same", mockup, mockup));
  const nudged = { ...mockup, parts: [{ key: "src h", box: [0.05 + 0.6 / 480, 0.4, 0.5, 0.06] }, mockup.parts[1]] };
  assert.throws(() => assertSameBoxes("moved", nudged, mockup), /src h \(0\.60 mock-up px\)/);
  assert.doesNotThrow(() => assertSameBoxes("moved, as said", nudged, mockup, { moved: ["src h"] }));
  assert.throws(() => assertSameBoxes("said to move", mockup, mockup, { moved: ["src o"] }), /found unmoved/);
  assert.throws(() => assertSameBoxes("missing", { ...mockup, parts: [mockup.parts[1]] }, mockup), /the parts dropped/);
  assert.doesNotThrow(() => assertSameBoxes("dropped, as said", { ...mockup, parts: [mockup.parts[1]] }, mockup, { dropped: ["src h"] }));
  assert.throws(() => assertSameBoxes("added", { ...mockup, parts: [...mockup.parts, { key: "b.new", box: [0, 0, 0.1, 0.1] }] }, mockup), /the parts added/);
});
