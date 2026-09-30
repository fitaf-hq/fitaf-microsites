// R2-63, R2-64 and R2-65 (SPEC-rung2-progress-and-checkout § 14, the Advisor's "Extract the screen"): the progress
// screen lives in its own module, src/storefront/progress-screen.js, which the build inlines into the Footer block and
// the console file (as it inlines the key function) and Storybook imports. One source.
//   R2-63  the built files carry the module's text, once each; no import or export in either; no `<` but the block's
//          own two (§ 11, R2-58).
//   R2-64  the module imported ALONE (no #fitaf= page, no store, no fill B): given a document, the screen's words and
//          the page's colours (the build's own readers), it makes the screen, adds meals from stand-in cards, shows
//          the last step and removes it; at each step its screen is the same, element for element and text for text,
//          as the one the block draws on the synthetic order page for the same presses.
//   R2-65  ⭐ one source: a rule of the module's style changed in a COPY changes the built text and what R2-64 renders;
//          and no line of the module's code is left in fitaf-handoff.js (⭐ mutant, in the suite: a copy of the source
//          with one of them put back fails). Copies are made in a temporary directory; nothing in the repository is
//          edited.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseHTML } from "linkedom";
import { loadJson, MESSAGES_PATH, ROOT } from "../build.mjs";
import * as build from "../scripts/build-storefront.mjs";
import { TEMPLATE_PATH } from "../scripts/flow-theme.mjs";
import { CHECKOUT_PAYLOAD, fakeWindow, fragmentFor, MEALS, orderPage, run, script } from "./r2-harness.mjs";

const MODULE_PATH = join(ROOT, "src", "storefront", "progress-screen.js");
const FOOTER = "fitaf-handoff.html";
const CONSOLE = "fitaf-handoff.fill-B.console.js";
/** CHECKOUT_PAYLOAD's presses in fill B's order (every meal's first press before any second): 1 + 2 + 4. */
const ORDER = [MEALS[0], MEALS[1], MEALS[2], MEALS[1], MEALS[2], MEALS[2], MEALS[2]];

const loadModule = (path = MODULE_PATH) => import(`${pathToFileURL(path).href}?v=${Math.random()}`);
const inputs = async () => ({
  words: build.screenWords(await loadJson(MESSAGES_PATH)),
  tokens: build.screenTokens(await readFile(TEMPLATE_PATH, "utf8")),
});

/** A generated image (never a photograph), as a data: URI. */
const PIXEL = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"><rect width="4" height="3" fill="#48aeee"/></svg>')}`;

/** Give `card` an img in the state a browser reports for a photo the page has loaded (linkedom loads nothing). */
function loadedPhoto(document, card) {
  const img = document.createElement("img");
  Object.defineProperties(img, { complete: { value: true }, naturalWidth: { value: 640 }, currentSrc: { value: PIXEL } });
  card.prepend(img);
}

/** A stand-in meal card, as the screen reads one: a .product__content-title, and for the first meal a loaded photo. */
function standIn(document, name) {
  const card = document.createElement("div");
  card.innerHTML = `<div class="product__content-title">  ${name} </div>`;
  if (name === MEALS[0]) loadedPhoto(document, card);
  return card;
}

/** The block's screen, as the synthetic order page shows it after each press and at the store's route. */
async function blockScreens() {
  const page = await orderPage();
  const first = [...page.document.querySelectorAll("app-product-card")].find((c) => c.textContent.includes(MEALS[0]));
  loadedPhoto(page.document, first);
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page });
  const shots = [];
  const outer = () => page.document.getElementById("fitaf-screen")?.outerHTML ?? null;
  page.document.addEventListener("click", () => shots.push(outer()));
  const pushState = h.window.history.pushState;
  h.window.history.pushState = (...args) => {
    shots.push(outer());
    pushState(...args);
  };
  run(await script(), h.window);
  h.timers.drain();
  shots.push(outer());
  // At each of the 8 presses the screen as it was before that press (made; after meal 1 … meal 7), then at the store's
  // route (after CHECKOUT's last step), then after done.
  return shots;
}

/** The module's screen, driven alone through the same moments. */
async function moduleScreens(mod) {
  const { document } = parseHTML("<!doctype html><html><head></head><body></body></html>");
  const { words, tokens } = await inputs();
  const cards = Object.fromEntries(MEALS.map((name) => [name, standIn(document, name)]));
  const outer = () => document.getElementById("fitaf-screen")?.outerHTML ?? null;
  const shots = [];
  const screen = mod.progressScreen(document, words, tokens);
  shots.push(outer());
  ORDER.forEach((name, i) => {
    screen.added(name, cards[name], i + 1, ORDER.length);
    shots.push(outer());
  });
  screen.last();
  shots.push(outer());
  screen.remove();
  shots.push(outer());
  return shots;
}

test("R2-63: the built files carry the module's text once each; no import or export; no '<' but the block's two", async () => {
  const mod = await loadModule();
  const fn = mod.progressScreen.toString();
  assert.ok(fn.startsWith("function progressScreen("), "the module's one function");
  const files = await build.storefrontFiles({ commit: "0000000" });
  for (const name of [FOOTER, CONSOLE]) {
    const content = files.find((f) => f.name === name).content;
    assert.equal(content.split(fn).length - 1, 1, `${name}: the module's text, once`);
    assert.doesNotMatch(content, /\b(import|export)\b/, `${name}: no module syntax`);
  }
  assert.equal((files.find((f) => f.name === FOOTER).content.match(/</g) ?? []).length, 2, "no '<' but the block's own two");
  assert.equal((files.find((f) => f.name === CONSOLE).content.match(/</g) ?? []).length, 0);
});

test("R2-64: the module alone makes, fills, finishes and removes the same screen as the block draws", async () => {
  const block = await blockScreens();
  const alone = await moduleScreens(await loadModule());
  assert.equal(block.length, 10, "fixture control: 8 presses, the route, and after done");
  assert.ok(block[8].includes(PIXEL) && block[8].includes("100%"), "fixture control: a photo on a slide, the bar full");
  assert.deepEqual(alone, block, "made, each meal added, the last step, removed: element for element, text for text");
  assert.equal(alone.at(-1), null, "removed whole");
});

async function withCopy(path, name, edit, fn) {
  const dir = await mkdtemp(join(tmpdir(), "boston-r2-65-"));
  try {
    const copy = join(dir, name);
    await writeFile(copy, edit(await readFile(path, "utf8")));
    return await fn(copy);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("R2-65: one source — a rule changed in a copy of the module changes the built text and what the module renders", async () => {
  const RULE = ["#fitaf-screen .b{height:8px", "#fitaf-screen .b{height:9px"];
  const source = await readFile(MODULE_PATH, "utf8");
  assert.equal(source.split(RULE[0]).length, 2, "fixture control: the rule is in the module, once");
  await withCopy(MODULE_PATH, "progress-screen.js", (s) => s.replace(...RULE), async (copy) => {
    const text = await build.storefrontText({ screenPath: copy });
    assert.ok(text.includes(RULE[1]) && !text.includes(RULE[0]), "the built text carries the changed rule");
    const { document } = parseHTML("<!doctype html><html><head></head><body></body></html>");
    const { words, tokens } = await inputs();
    (await loadModule(copy)).progressScreen(document, words, tokens);
    assert.ok(document.querySelector("#fitaf-screen style").textContent.includes(RULE[1]), "and the module renders it");
  });
});

/** The module's code lines (its function's own, trimmed, long enough to be code and not a brace). */
async function moduleLines(path = MODULE_PATH) {
  const fn = (await loadModule(path)).progressScreen.toString();
  return fn.split("\n").map((l) => l.trim()).filter((l) => l.length >= 24);
}

/** R2-65's check: no line of the module's code in the source of fill B. Throws an AssertionError naming them. */
async function noCopyLeft(sourcePath) {
  const source = await readFile(sourcePath, "utf8");
  const left = (await moduleLines()).filter((line) => source.includes(line));
  assert.deepEqual(left, [], "no line of the screen's code left in fitaf-handoff.js");
}

test("R2-65: no line of the module's code is left in fitaf-handoff.js", async () => {
  assert.ok((await moduleLines()).length > 20, "fixture control: the module has its code");
  await noCopyLeft(build.STOREFRONT_SOURCE);
});

test("R2-65 (mutant): a copy of one of the screen's lines left in fitaf-handoff.js — R2-65 fails", async () => {
  const line = (await moduleLines()).find((l) => l.includes("#fitaf-screen"));
  assert.ok(line, "fixture control: a line of the screen's style");
  await withCopy(build.STOREFRONT_SOURCE, "fitaf-handoff.js", (s) => `${s}\n${line}\n`, (copy) =>
    assert.rejects(noCopyLeft(copy), (err) => {
      assert.ok(err instanceof assert.AssertionError, String(err));
      return true;
    }),
  );
});
