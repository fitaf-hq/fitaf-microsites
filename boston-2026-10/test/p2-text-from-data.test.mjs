// P2: every word on every mock-up comes from data/. Three checks, each able to catch what the others miss:
//   (a) every text run sits directly in an element whose data-src names a JSON pointer into data/;
//   (b) a SENTINEL render: every data string the pieces cite is replaced with a marker that has no letters;
//       after removing the markers, no letter is left on any piece, so no word was typed in the renderer;
//   (c) one changed value in data/ shows on all four pieces.
// Annotations (the legend, a photo slot's placeholder label) are about a mock-up, not on it, and are excluded.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { renderPage } from "../build.mjs";
import { loadInputs, MOCKUPS_DIR, PIECES, renderMockups, SOURCES } from "../mockups/build-mockups.mjs";
import { loadPlans } from "./helpers.mjs";
import { dataSources, getPointer, pieceRuns, setPointer } from "./mockup-html.mjs";

/** A CSS string's escapes ("\\00b7") decoded, so the check reads the character drawn, not its hex. */
const cssString = (s) => s.slice(1, -1).replace(/\\([0-9a-f]{1,6})\s?/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));

const inputs = await loadInputs({ photosDir: join(MOCKUPS_DIR, "no-such-folder"), today: "2026-10-15" });
const pages = renderMockups(inputs);
const keyOf = Object.fromEntries(Object.entries(SOURCES).map(([key, file]) => [file, key]));
const LETTER = /\p{L}/u;
const SENTINEL = /⟦\d+⟧/g;

test("P2: the four pieces are rendered", () => {
  assert.deepEqual(Object.keys(pages).sort(), PIECES.map((p) => p.id).sort());
  assert.equal(PIECES.length, 4);
});

test("P2 (a): every text run is directly inside an element citing data/ by JSON pointer, and the pointer resolves", () => {
  for (const [id, html] of Object.entries(pages)) {
    const runs = pieceRuns(html);
    assert.ok(runs.length >= 5, `${id} has text`);
    for (const run of runs) {
      const parent = run.path.at(-1);
      const cited = (parent?.attrs["data-src"] ?? "").split(" ").filter((s) => s.startsWith("data/") && s.includes("#/"));
      assert.ok(cited.length > 0, `${id}: "${run.text.trim()}" is not inside an element citing data/`);
      for (const source of cited) {
        const [file, pointer] = source.split("#");
        assert.ok(file in keyOf, `${id}: ${file} is not a data file`);
        assert.doesNotThrow(() => getPointer(inputs.data[keyOf[file]], pointer), `${id}: ${source}`);
      }
    }
  }
});

test("P2 (b): with every cited data string replaced by a letterless marker, no letter is left on any piece", () => {
  const cited = new Set(Object.values(pages).flatMap((html) => dataSources(html).filter((s) => s.startsWith("data/"))));
  const data = structuredClone(inputs.data);
  const markers = [];
  for (const source of cited) {
    const [file, pointer] = source.split("#");
    if (typeof getPointer(data[keyOf[file]], pointer) !== "string") continue;
    const marker = `⟦${markers.length}⟧`;
    setPointer(data[keyOf[file]], pointer, marker);
    markers.push(marker);
  }
  assert.ok(markers.length >= 10, `the pieces cite ${markers.length} data strings`);
  const marked = renderMockups({ ...inputs, data });
  const seen = new Set();
  for (const [id, html] of Object.entries(marked)) {
    const text = pieceRuns(html).map((r) => r.text).join(" ");
    for (const m of text.match(SENTINEL) ?? []) seen.add(m);
    const left = text.replace(SENTINEL, "");
    assert.doesNotMatch(left, LETTER, `${id} carries letters that are not from data/: ${JSON.stringify(left.match(/\S*\p{L}\S*/gu))}`);
  }
  assert.deepEqual([...seen].sort(), [...markers].sort(), "every cited string is shown somewhere");
});

test("P2 (b) control: a word typed into a piece is caught", () => {
  const marked = renderMockups(inputs);
  const tampered = marked.flyer.replace('<h1 class="headline"', '<p class="kicker">Now open!</p><h1 class="headline"');
  assert.notEqual(tampered, marked.flyer, "the mutation anchor is present");
  const orphan = pieceRuns(tampered).find((r) => r.text === "Now open!");
  assert.ok(orphan, "the typed text is seen");
  assert.equal(orphan.path.at(-1).attrs["data-src"], undefined, "(a) would refuse it: its element cites nothing");
});

test("P2 (c): one changed value in data/ shows on all four pieces", () => {
  const cases = [
    ["offers", (d) => d.offers.offers.forEach((o) => (o.label = "P2 OFFER CHANGED")), "P2 OFFER CHANGED"],
    ["messages", (d) => (d.messages.headline = "P2 HEADLINE CHANGED"), "P2 HEADLINE CHANGED"],
    ["messages", (d) => (d.messages.scan_prompt = "P2 SCAN CHANGED"), "P2 SCAN CHANGED"],
    ["events", (d) => (d.events[0].url = "https://p2-changed.example/"), "p2-changed.example"],
  ];
  for (const [file, mutate, expected] of cases) {
    const data = structuredClone(inputs.data);
    mutate(data);
    for (const [id, html] of Object.entries(renderMockups({ ...inputs, data }))) {
      const text = pieceRuns(html).map((r) => r.text).join(" ");
      assert.ok(text.includes(expected), `${id} shows the changed ${file} value "${expected}"`);
    }
    for (const [id, html] of Object.entries(pages)) {
      assert.ok(!html.includes(expected), `control: ${id} does not show "${expected}" before the change`);
    }
  }
});

// Updated (SPEC-plan-page-refinement § 1 items 1–2): the page no longer shows the headline or the event line (the hero
// is the Advisor's rewrite), so the changed phrase reaches all four pieces and NOT the page; the page's own words
// since then are data/messages.json's `plan_page` (PR-5, PR-9).
test("P2 (c): one changed phrase in data/messages.json changes all four pieces (the page no longer shows it)", async () => {
  const messages = structuredClone(inputs.data.messages);
  messages.headline = "P2 ONE PLACE";
  messages.event_line = ["P2 EVENT", "P2 MONTH"];
  const page = await renderPage(await loadPlans(), undefined, messages);
  assert.ok(!page.includes("P2 ONE PLACE"), "the page carries no headline (§ 1 item 2)");
  assert.ok(!page.includes("P2 EVENT"), "the page carries no event line (§ 1 item 1)");
  const pieces = renderMockups({ ...inputs, data: { ...inputs.data, messages } });
  for (const [id, html] of Object.entries(pieces)) {
    const text = pieceRuns(html).map((r) => r.text).join(" ");
    assert.ok(text.includes("P2 ONE PLACE"), `${id} shows the changed headline`);
    assert.ok(text.includes("P2 EVENT") && text.includes("P2 MONTH"), `${id} shows the changed event line`);
  }
  const shipped = await renderPage(await loadPlans());
  assert.ok(!shipped.includes(inputs.data.messages.headline), "control: nor does the page as shipped");
});

test("P2 (c): a changed price reaches the pieces that quote one", () => {
  const data = structuredClone(inputs.data);
  for (const plan of data.plans.individual) for (const c of plan.counts) c.price_per_meal_cents += 1;
  const changed = renderMockups({ ...inputs, data });
  const quoting = Object.keys(pages).filter((id) => pages[id].includes("$12.00"));
  assert.ok(quoting.length >= 1, "a piece quotes the lowest price");
  for (const id of quoting) assert.ok(changed[id].includes("$12.01") && !changed[id].includes("$12.00"), id);
});

test("P2: no CSS content and no script writes a word", async () => {
  const css = await readFile(join(MOCKUPS_DIR, "mockups.css"), "utf8");
  const contents = [...css.matchAll(/content:\s*("[^"]*"|'[^']*')/g)].map((m) => m[1]);
  assert.ok(contents.length >= 1, "the stylesheet draws the line separator (control: the extractor sees it)");
  for (const value of contents) assert.doesNotMatch(cssString(value), LETTER, `CSS content ${value}`);
  assert.match(cssString('"\\0041"'), LETTER, "control: an escaped letter is still a letter");
  for (const name of ["sheet.js", "slideshow.js"]) {
    const js = await readFile(join(MOCKUPS_DIR, name), "utf8");
    assert.doesNotMatch(js, /textContent\s*=|innerText\s*=|innerHTML\s*=|insertAdjacent|document\.write/, name);
  }
});
