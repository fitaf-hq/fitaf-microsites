import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DEFAULTS, measure } from "../scripts/contrast.mjs";
import { DRAWN_PAIRS } from "../src/worker/email-style.js";
import { bodyOf, declarations, tagsOf } from "./email-html.mjs";
import { pageTokens, sampleMessages } from "./email-fixture.mjs";

const EMAIL = "email";
const same = (a, b) => a.fg === b.fg && a.bg === b.bg && a.role === b.role;

test("M20: every pair the email draws is declared in contrast-pairs.json (build \"email\"), none stale, and each passes", async () => {
  const spec = JSON.parse(await readFile(DEFAULTS.pairs, "utf8"));
  const declared = spec.pairs.filter((p) => p.build === EMAIL);
  assert.ok(DRAWN_PAIRS.length >= 4, "control: the renderer names what it draws");
  for (const pair of DRAWN_PAIRS) assert.ok(declared.some((d) => same(d, pair)), `declared: ${pair.fg} on ${pair.bg} (${pair.role})`);
  for (const d of declared) assert.ok(DRAWN_PAIRS.some((pair) => same(d, pair)), `drawn: ${d.fg} on ${d.bg} (${d.role}), ${d.where}`);

  const { rows, problems } = await measure();
  assert.deepEqual(problems, []);
  const emailRows = rows.filter((r) => r.build === EMAIL);
  assert.equal(emailRows.length, declared.length);
  for (const r of emailRows) assert.ok(r.pass, `${r.fg} on ${r.bg}: Lc ${r.lc.toFixed(1)} under ${r.min} (${r.where})`);
});

test("M20: each text colour in the HTML is the foreground of a declared text pair", async () => {
  const { colours } = await pageTokens();
  const foregrounds = new Set(DRAWN_PAIRS.filter((p) => p.text).map((p) => colours[p.fg]));
  for (const [name, message] of Object.entries(sampleMessages())) {
    const coloured = tagsOf(bodyOf(message.html)).filter((t) => declarations(t.attrs.style).color);
    assert.ok(coloured.length >= 3, `control: ${name} colours its text`);
    for (const t of coloured) {
      assert.ok(foregrounds.has(declarations(t.attrs.style).color), `${name}: <${t.name}> text colour is a declared pair's foreground`);
    }
  }
});
