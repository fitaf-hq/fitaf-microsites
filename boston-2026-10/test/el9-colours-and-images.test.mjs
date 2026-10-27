// EL9 (SPEC-ui-and-copy-pass.md § 8, "the colour pairs"; and item 1's images, "made by a committed script from committed
// sources"): every colour pair E1's band, button and footer draw is declared ("build": "email") at the role its size
// asks for, and the halftone's dots are declared as what they are; and the images E1 needs (the two halftone tiles and the
// reversed logo at twice its width) are exactly what `npm run email:images` makes from the tokens
// (src/worker/email-tokens.json) and the logo's drawing (print/assets/fitaf-logo-reversed.png), pixel for pixel.
import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { DEFAULTS } from "../scripts/contrast.mjs";
import { declarations, layoutRows, tagsOf } from "./email-html.mjs";
import { pageTokens, sampleE1s } from "./email-fixture.mjs";
import { LOGO_FILE_PX, PRINT_CSS_PATH } from "./el-fixtures.mjs";

const { PNG } = createRequire(import.meta.url)("pngjs");
const { colours } = await pageTokens();
const tokenOf = Object.fromEntries(Object.entries(colours).map(([name, hex]) => [hex, name]));
const pairs = JSON.parse(await readFile(DEFAULTS.pairs, "utf8"));
const EMAIL_DIR = join(ROOT, "src", "assets", "email");
/** The package's roles, strictest first (src/contrast-pairs.json): body text, large text, a large heading. */
const ROLE_ORDER = ["body", "large-text", "ui-or-heading"];
function loosestRole(sizePx, weight) {
  if (sizePx >= 30 && weight >= 700) return "ui-or-heading";
  if (sizePx >= 24 || (sizePx >= 18.66 && weight >= 700)) return "large-text";
  return "body";
}

/** Each coloured run of text in a row: its colour token, its ground, its size and weight (a <span> takes its block's). */
function textRuns(row, ground) {
  const runs = [];
  const blocks = [...row.matchAll(/<(h1|p|a)\b[^>]*style="([^"]*)"[^>]*>([\s\S]*?)<\/\1>/g)];
  for (const [, , style, inner] of blocks) {
    const d = declarations(style);
    const size = Number.parseFloat(d["font-size"]);
    const weight = Number(d["font-weight"] ?? 400);
    if (d.color) runs.push({ fg: tokenOf[d.color], bg: ground, size, weight });
    for (const t of tagsOf(inner).filter((x) => declarations(x.attrs.style).color)) {
      const s = declarations(t.attrs.style);
      runs.push({ fg: tokenOf[s.color], bg: ground, size: Number.parseFloat(s["font-size"] ?? size), weight: Number(s["font-weight"] ?? weight) });
    }
  }
  return runs;
}

test("EL9: every text colour on the band, the button and the footer is a declared email pair at the role its size asks for", () => {
  const declared = pairs.pairs.filter((p) => p.build === "email");
  for (const [name, m] of Object.entries(sampleE1s())) {
    const rows = layoutRows(m.html);
    const panel = rows.find((r) => /<a\b[^>]*display:block/.test(r));
    assert.ok(panel, `${name}: the button's panel row (a link that fills its cell)`);
    const runs = [...textRuns(rows[0], "--ink"), ...textRuns(panel, "--cta"), ...textRuns(rows.at(-1), "--ink")];
    assert.ok(runs.length >= 6, `control: ${name}'s runs were read (${runs.length})`);
    for (const r of runs) {
      assert.ok(r.fg, `${name}: a text colour that is a token`);
      const allowed = ROLE_ORDER.slice(0, ROLE_ORDER.indexOf(loosestRole(r.size, r.weight)) + 1);
      const pair = declared.find((p) => p.fg === r.fg && p.bg === r.bg && allowed.includes(p.role));
      assert.ok(pair, `${name}: ${r.fg} on ${r.bg} at ${r.size}px/${r.weight} is declared as ${allowed.join(" or ")}`);
    }
  }
});

test("EL9: the halftone's dots are declared as a texture (not_measured), the band's the flyer's own colour", async () => {
  const css = await readFile(PRINT_CSS_PATH, "utf8");
  const flyerDots = /\.print-flyer \.fb-dots \{[^}]*color: var\((--[a-z-]+)\)/.exec(css)?.[1];
  assert.equal(flyerDots, "--muted", "control: the flyer's band draws its halftone in --muted");
  for (const token of [flyerDots, "--cta-hover"]) {
    assert.ok(pairs.not_measured.some((n) => n.token === token && /halftone/.test(n.as ?? "")), `${token}: declared as the halftone's dots`);
  }
});

test("EL9: src/assets/email/ is exactly what `npm run email:images` makes, pixel for pixel", async () => {
  const { emailImages } = await import("../scripts/email-images.mjs");
  const made = await emailImages();
  assert.deepEqual(Object.keys(made).sort(), ["fitaf-logo-reversed.png", "halftone-cta.png", "halftone-ink.png"]);
  assert.deepEqual((await readdir(EMAIL_DIR)).filter((n) => !n.startsWith(".")).sort(), Object.keys(made).sort(), "nothing else in the directory");
  for (const [file, bytes] of Object.entries(made)) {
    const [want, got] = [PNG.sync.read(bytes), PNG.sync.read(await readFile(join(EMAIL_DIR, file)))];
    assert.deepEqual([got.width, got.height], [want.width, want.height], `${file}: its size`);
    assert.ok(Buffer.from(got.data).equals(Buffer.from(want.data)), `${file}: its pixels (regenerate with npm run email:images)`);
  }
});

test("EL9: each tile is its ground with dots between it and the dots' token; the logo is 240 x 104, opaque, on --ink", async () => {
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const onSegment = (px, a, b) => {
    const [ga, gb] = [hex(a), hex(b)];
    const t = [0, 1, 2].map((k) => (ga[k] === gb[k] ? null : (px[k] - ga[k]) / (gb[k] - ga[k]))).filter((x) => x !== null);
    return t.every((x) => x >= -0.01 && x <= 1.01 && Math.abs(x - t[0]) <= 0.02) && [0, 1, 2].every((k) => ga[k] !== gb[k] || px[k] === ga[k]);
  };
  for (const [file, ground, dot] of [["halftone-ink.png", "--ink", "--muted"], ["halftone-cta.png", "--cta", "--cta-hover"]]) {
    const png = PNG.sync.read(await readFile(join(EMAIL_DIR, file)));
    const px = (x, y) => [...png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 4)];
    assert.deepEqual(px(0, 0).slice(0, 3), hex(colours[ground]), `${file}: its corner is ${ground}, the cell's bgcolor`);
    let dots = 0;
    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        const p = px(x, y);
        assert.equal(p[3], 255, `${file}: opaque`);
        assert.ok(onSegment(p, colours[ground], colours[dot]), `${file} (${x},${y}): between ${ground} and ${dot}`);
        if (p.slice(0, 3).join() === hex(colours[dot]).join()) dots++;
      }
    }
    assert.ok(dots >= 1, `${file}: a dot's core is ${dot}`);
  }
  const logo = PNG.sync.read(await readFile(join(EMAIL_DIR, "fitaf-logo-reversed.png")));
  assert.deepEqual([logo.width, logo.height], [LOGO_FILE_PX.width, LOGO_FILE_PX.height], "twice the band's 120 x 52");
  for (let i = 3; i < logo.data.length; i += 4) assert.equal(logo.data[i], 255, "opaque: the logo on the band's own ink");
  assert.deepEqual([...logo.data.subarray(0, 3)], hex(colours["--ink"]), "its field --ink");
});
