// Q8 (SPEC-print-pieces.md § 1, § 5): no legend. "Where each part comes from" is a screen-share device: the printed
// pieces carry no legend, no switch, no caption and no script (the page each PDF and PNG is printed from is exactly this
// markup), while the mock-ups of the same pieces do (the control).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { LEGEND_PATH, loadInputs, MOCKUPS_DIR, renderMockups } from "../mockups/build-mockups.mjs";
import { PRINT_DIR } from "../print/build-print.mjs";
import { printPage } from "../print/pages.mjs";
import { PRINT_PIECES } from "../print/sizes.mjs";
import { elements, hasClass, textRuns } from "./mockup-html.mjs";

const legend = JSON.parse(await readFile(LEGEND_PATH, "utf8"));
const printCss = await readFile(join(PRINT_DIR, "print.css"), "utf8");
const inputs = await loadInputs({ photosDir: join(MOCKUPS_DIR, "no-such-folder"), today: "2026-10-20" });
const mockups = renderMockups(inputs);
const LEGEND_WORDS = [legend.title, legend.note, legend.files_note, legend.files_toggle, ...Object.values(legend.sources).map((s) => s.from)];

/** Every sign of a legend in a page: its elements, its words, the sheet's caption, and any script. */
function legendSigns(html) {
  const els = elements(html);
  const text = textRuns(html).map((r) => r.text).join(" ");
  return [
    ...els.filter((e) => hasClass(e, "legend") || hasClass(e, "aside") || hasClass(e, "caption") || hasClass(e, "files-toggle")).map((e) => `.${e.attrs.class}`),
    ...els.filter((e) => e.attrs["data-file"] !== undefined).map((e) => `[data-file=${e.attrs["data-file"]}]`),
    ...els.filter((e) => e.tag === "script" || e.tag === "input").map((e) => `<${e.tag}>`),
    ...LEGEND_WORDS.filter((w) => text.includes(w)).map((w) => `"${w}"`),
  ];
}

test("Q8: the printed pieces carry no legend, no switch, no caption and no script", () => {
  for (const p of PRINT_PIECES) assert.deepEqual(legendSigns(printPage(p, inputs, printCss)), [], p.id);
});

test("Q8 control: the mock-ups of the same pieces carry every sign the check looks for", () => {
  for (const p of PRINT_PIECES) {
    const signs = legendSigns(mockups[p.id]);
    for (const expected of [".legend", ".aside", "<script>", "<input>", `"${legend.title}"`, `"${legend.note}"`, "[data-file=data/messages.json]"]) {
      assert.ok(signs.some((s) => s.startsWith(expected)), `${p.id}: ${expected} (${signs.join(", ")})`);
    }
  }
});
