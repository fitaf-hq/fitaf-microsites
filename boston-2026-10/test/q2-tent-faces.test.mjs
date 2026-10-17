// Q2 (SPEC-print-pieces.md § 2, § 5): the tent card's two faces. On its one flat sheet the upper face is the lower face
// turned 180° (the same content, rotated), so that folded on the centre line into an A-frame both read upright: in the
// page's markup (one face's markup twice, the first turned), in the measured page (the fold on the sheet's centre line),
// and in the rendered proof (its upper half, turned 180°, is its lower half).
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { loadInputs, MOCKUPS_DIR } from "../mockups/build-mockups.mjs";
import { PRINT_DIR } from "../print/build-print.mjs";
import { printPage } from "../print/pages.mjs";
import { PRINT_PIECES } from "../print/sizes.mjs";
import { placedElements } from "./mockup-html.mjs";
import { lockedBuild, NO_CHROME } from "./print-fixtures.mjs";

const tent = PRINT_PIECES.find((p) => p.id === "tent-card");
const printCss = await readFile(join(PRINT_DIR, "print.css"), "utf8");
const inputs = await loadInputs({ photosDir: join(MOCKUPS_DIR, "no-such-folder"), today: "2026-10-20" });
const tmp = await mkdtemp(join(tmpdir(), "boston-q2-"));
after(() => rm(tmp, { recursive: true, force: true }));

/** Each face's element, and the markup inside each face's board (to its matching </div>), as written. */
function facesOf(html) {
  const faces = placedElements(html).filter((e) => (e.attrs.class ?? "").split(/\s+/).includes("print-face"));
  const inner = [];
  for (const m of html.matchAll(/<div class="board board-tent-card">/g)) {
    const tags = /<div\b|<\/div>/g;
    tags.lastIndex = m.index + m[0].length;
    let depth = 1;
    let tag;
    while (depth > 0 && (tag = tags.exec(html))) depth += tag[0] === "</div>" ? -1 : 1;
    inner.push(html.slice(m.index + m[0].length, tag.index));
  }
  return { faces, inner };
}

test("Q2: the tent's page holds two faces, one face's markup twice, the first (the upper) turned", () => {
  const html = printPage(tent, inputs, printCss);
  const { faces, inner } = facesOf(html);
  assert.equal(faces.length, 2, "two faces");
  assert.deepEqual(faces.map((f) => f.attrs.class), ["print-face print-face-turned", "print-face"]);
  assert.equal(inner.length, 2, "both faces' markup is read (control)");
  assert.ok(inner[0].includes('data-slot="tent-large"') && inner[0].includes('class="headline"'), "a face holds the tent's parts (control)");
  assert.equal(inner[0], inner[1], "the same content");
});

test("Q2: the turned face is turned 180°, and nothing else is", () => {
  const rules = [...printCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1].trim().split("\n").at(-1).trim(), body: m[2] }));
  const turned = rules.filter((r) => /\btransform\s*:/.test(r.body));
  assert.deepEqual(turned.map((r) => [r.selector, r.body.trim()]), [[".print-face-turned", "transform: rotate(180deg);"]]);
});

test("Q2: rendered, the upper face is the lower face turned 180°; the fold is the sheet's centre line", { skip: NO_CHROME }, async () => {
  const out = join(tmp, "dist-print");
  const built = await lockedBuild({ outDir: out, today: "2026-10-20" });
  const planned = built.planned.find((p) => p.piece.id === "tent-card");
  const [upper, lower] = planned.measured.faces.map((f) => f.trim);
  const fold = planned.measured.page.h / 2;
  assert.ok(Math.abs(upper.y + upper.h - fold) < 0.01 && Math.abs(lower.y - fold) < 0.01, `the faces meet at the fold (${upper.y + upper.h}, ${lower.y}, ${fold})`);
  assert.ok(Math.abs(upper.x - lower.x) < 0.01, "one above the other");

  const png = PNG.sync.read(await readFile(join(out, `${planned.stem}.png`)));
  const { width, height, data } = png;
  assert.equal(height % 2, 0);
  const half = height / 2;
  const at = (x, y) => (y * width + x) * 4;
  // How alike the lower half is to the upper half, read turned (x, y) -> (width-1-x, height-1-y) or as it is.
  const alike = (turned) => {
    let same = 0;
    for (let y = half; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const a = at(x, y);
        const b = turned ? at(width - 1 - x, height - 1 - y) : at(x, y - half);
        const diff = Math.max(Math.abs(data[a] - data[b]), Math.abs(data[a + 1] - data[b + 1]), Math.abs(data[a + 2] - data[b + 2]));
        if (diff <= 48) same += 1;
      }
    }
    return same / (width * half);
  };
  const turned = alike(true);
  const unturned = alike(false);
  assert.ok(turned >= 0.99, `the upper half turned matches the lower half at ${(turned * 100).toFixed(2)}% of pixels`);
  assert.ok(unturned < 0.9, `control: unturned, it matches at only ${(unturned * 100).toFixed(2)}%`);
});
