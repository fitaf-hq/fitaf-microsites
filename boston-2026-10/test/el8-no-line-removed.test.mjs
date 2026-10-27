// EL8 (SPEC-ui-and-copy-pass.md § 8, "no line removed above anywhere in either part"): every line E1 said before § 8's
// code (test/el-golden.json `before`, 6e0d86f's own renderer over the same inputs), in its text part and in its HTML
// part, is still one of E1's lines, unless § 8 removes or replaces it, each by the item that does: item 7's two lines,
// the footer's old line (item 6: its new words, the address on its own line), and See my offer (item 3: Claim my offer;
// item 4 keeps it once the offer has ended). The list names nothing it does not remove (each rule matches a line before
// and none after).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { lineTexts } from "./email-html.mjs";
import { sampleE1s } from "./email-fixture.mjs";

const golden = JSON.parse(await readFile(new URL("./el-golden.json", import.meta.url), "utf8"));

/** § 8's removals and replacements, each by its item. `ended`: whether it applies to an E1 sent after its offer. */
const GONE = [
  { by: "item 7 (removed)", re: /^You saved this offer at .+ yesterday — here it is\.$/ },
  { by: "item 7 (removed; ⬜ its consequence put to the Advisor)", re: /^You asked to hear about Fit AF menus and offers\. Yes, keep me posted(: https:\/\/\S+)?$/ },
  { by: "item 6 (the footer's new words; the address on its own line)", re: /^You're getting this one email because you saved an offer\. Fit AF Nutrition, 10 Enterprise, Carbondale, PA 18407\.$/ },
  { by: "item 3 (Claim my offer; item 4 keeps See my offer once ended)", re: /^See my offer(: https:\/\/\S+)?$/, ended: false },
];
const goneBy = (line, ended) => GONE.find((g) => g.re.test(line) && (g.ended === undefined || g.ended === ended));

const partsOf = (m) => ({ text: m.text.split("\n").filter(Boolean), html: lineTexts(m.html) });

test("EL8: every line of E1 before § 8, in either part, is still E1's, or is one § 8 removes or replaces", () => {
  assert.equal(golden.before?.recorded_at, "6e0d86f", "control: the record before § 8's code");
  const now = sampleE1s();
  for (const [name, m] of Object.entries(now)) {
    const was = golden.before.messages[name];
    assert.ok(was, `control: ${name} was recorded before`);
    const ended = name === "e1_held_ended";
    const [before, after] = [partsOf(was), partsOf(m)];
    for (const part of ["text", "html"]) {
      assert.ok(before[part].length >= 4, `control: ${name}'s ${part} part before had its lines`);
      for (const line of before[part]) {
        if (goneBy(line, ended)) continue;
        assert.ok(after[part].includes(line), `${name} (${part}): "${line}" was removed, and § 8 does not remove it`);
      }
    }
  }
});

test("EL8: each removal names a line that was there before and is not there now (the list is not stale)", () => {
  const now = sampleE1s();
  for (const g of GONE) {
    const before = Object.entries(golden.before.messages).filter(([n]) => n.startsWith("e1_"));
    const matched = before.some(([name, m]) => Object.values(partsOf(m)).flat().some((l) => goneBy(l, name === "e1_held_ended") === g));
    assert.ok(matched, `${g.by}: matches a line before § 8`);
    for (const [name, m] of Object.entries(now)) {
      const ended = name === "e1_held_ended";
      if (g.ended !== undefined && g.ended !== ended) continue;
      for (const line of Object.values(partsOf(m)).flat()) assert.ok(!g.re.test(line), `${name}: ${g.by} still says "${line}"`);
    }
  }
});
