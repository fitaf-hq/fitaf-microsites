// Q13 and Q14 (SPEC-print-pieces.md § 8 items 1–3), over one build of the three logo variants (the four flyers are Q15's).
// Q13: eatfitaf.com's box is centred under the QR code's, directly under it, on every face of every page, as Chrome draws
// them (the build's measuring pass: the address's glyphs' box against the code's).
// Q14: three variants of the tent card, named: the variant is one named value (pages.mjs VARIANTS) and each tent card page
// is in one, named by its letter (tent-card-a-PROOF.pdf, …); (a) puts the logo in the navy bar at its left, (b) on a plate
// over the large photo's corner, (c) larger, above the headline; one logo per face. Since § 9 the flyer has none: one
// flyer, named flyer, and its four (its one logo is Q16's).
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadInputs, MOCKUPS_DIR } from "../mockups/build-mockups.mjs";
import { campaign } from "../mockups/parts.mjs";
import { PRINT_DIR } from "../print/build-print.mjs";
import { LOGO_VARIANTS, pagesToPrint, printPage, VARIANTS } from "../print/pages.mjs";
import { CSS_PX_PER_INCH, PRINT_PIECES } from "../print/sizes.mjs";
import { hasClass, placedElements } from "./mockup-html.mjs";
import { lockedBuild, NO_CHROME } from "./print-fixtures.mjs";

const tmp = await mkdtemp(join(tmpdir(), "boston-q13-"));
after(() => rm(tmp, { recursive: true, force: true }));
const inputs = await loadInputs({ photosDir: join(MOCKUPS_DIR, "no-such-folder"), today: "2026-10-20" });
const printCss = await readFile(join(PRINT_DIR, "print.css"), "utf8");
const HALF_PX_IN = 0.5 / CSS_PX_PER_INCH;
/** "Directly under": the address's glyphs start below the code, within this. */
const UNDER_IN = 0.1;
let built;
const build = async () => (built ??= await lockedBuild({ outDir: join(tmp, "dist-print"), today: "2026-10-20", fourFlyers: false }));

test("Q13: on every face of every page, eatfitaf.com is directly under the QR code and centred on it", { skip: NO_CHROME }, async () => {
  const { planned } = await build();
  const address = campaign(inputs).address.value;
  assert.equal(planned.length, 4, "the tent in three variants and the flyer (control)");
  for (const p of planned) {
    p.measured.faces.forEach((face, f) => {
      const label = `${p.stem}, face ${f + 1}`;
      const [qr] = face.qrs;
      const words = face.texts.filter((t) => t.text === address);
      assert.equal(words.length, 1, `${label}: the address once`);
      const [a] = words;
      const turned = p.piece.faces > 1 && f === 0; // the upper face is turned: "under" is above on the sheet
      assert.ok(Math.abs(a.x + a.w / 2 - (qr.x + qr.w / 2)) <= HALF_PX_IN, `${label}: centred (${a.x + a.w / 2} vs ${qr.x + qr.w / 2})`);
      const gap = turned ? qr.y - (a.y + a.h) : a.y - (qr.y + qr.h);
      assert.ok(gap >= -HALF_PX_IN && gap <= UNDER_IN, `${label}: directly under the code (gap ${gap.toFixed(3)} in)`);
    });
  }
});

test("Q14: three tent variants, one named value, each named by its letter; one flyer and its four, unlettered (§ 9)", () => {
  assert.deepEqual(VARIANTS, ["a", "b", "c"]);
  assert.deepEqual(LOGO_VARIANTS, { a: "bar", b: "photo", c: "large" });
  const flyers = ["flyer", "flyer-1", "flyer-2", "flyer-3", "flyer-4"];
  assert.deepEqual(pagesToPrint().map((p) => p.base), [...VARIANTS.map((v) => `tent-card-${v}`), ...flyers]);
  assert.ok(pagesToPrint().filter((p) => p.piece.id === "flyer").every((p) => p.variant === null), "a flyer has no variant");
  // The one change: the chosen variant alone
  assert.deepEqual(pagesToPrint({ variants: ["b"] }).map((p) => p.base), ["tent-card-b", ...flyers]);
  assert.throws(() => pagesToPrint({ variants: ["d"] }), /no logo variant "d"/);
});

/** Where a page's logos are: the classes of the element each sits in, outermost first. */
function logosOf(html) {
  return placedElements(html)
    .filter((e) => e.tag === "img" && hasClass(e, "logo"))
    .map((e) => ({ within: e.path.map((p) => p.attrs.class ?? "").filter(Boolean), large: hasClass(e, "logo-large"), next: e }));
}

test("Q14: on the tent, (a) the logo in the bar, (b) on a plate over the large photo's corner, (c) larger, above the headline", () => {
  for (const piece of PRINT_PIECES.filter((p) => p.id === "tent-card")) {
    const main = "tent-photos";
    const body = "tent-body";
    for (const variant of VARIANTS) {
      const html = printPage(piece, inputs, printCss, variant);
      const logos = logosOf(html);
      assert.equal(logos.length, piece.faces, `${piece.id} ${variant}: one logo per face`);
      for (const { within, large } of logos) {
        const inside = (cls) => within.some((c) => c.split(/\s+/).includes(cls));
        if (variant === "a") assert.ok(inside("event-bar") && inside("bar-plate") && !large, `${piece.id} a: ${within.join(" > ")}`);
        if (variant === "b") assert.ok(inside(main) && inside("logo-plate") && !inside(body) && !large, `${piece.id} b: ${within.join(" > ")}`);
        if (variant === "c") assert.ok(inside(body) && large && !inside("logo-plate"), `${piece.id} c: ${within.join(" > ")}`);
      }
      if (variant === "c") {
        // Above the headline (tent) or the offer (flyer): the logo comes first among the body's parts
        const els = placedElements(html);
        const [face] = els.filter((e) => hasClass(e, body));
        const kids = els.filter((e) => e.path.at(-1) === face && !hasClass(e, "rule"));
        assert.ok(hasClass(kids[0], "logo-large") && hasClass(kids[1], "headline"), `${piece.id} c: ${kids.map((k) => k.attrs.class).join(", ")}`);
      }
    }
  }
});

test("Q14: built, the tent in each variant is its own proof, named by its letter, and the flyer one, unlettered", { skip: NO_CHROME }, async () => {
  await build();
  const files = (await readdir(join(tmp, "dist-print"))).sort();
  const expected = ["assignment.json", "flyer-PROOF.pdf", "flyer-PROOF.png", ...VARIANTS.flatMap((v) => [`tent-card-${v}-PROOF.pdf`, `tent-card-${v}-PROOF.png`])].sort();
  assert.deepEqual(files, expected);
});
