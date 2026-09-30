// R2-50 (SPEC-rung2-progress-and-checkout § 1): the screen's words come from data/messages.json (its `handoff` key) and
// its colours from the page's own tokens (`--navy`, `--cta`, `--ice`, `--white` in src/template.html), both inlined by
// the build, as the plan counts are. So: no phrase and no colour in the source; change a phrase (or a token) in a COPY of
// its file and the built text changes, and the screen it draws shows the change. The copies are made in a temporary
// directory; no file in the repository is edited.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MESSAGES_PATH } from "../build.mjs";
import { STOREFRONT_SOURCE, storefrontText } from "../scripts/build-storefront.mjs";
import { pageTokens, TEMPLATE_PATH } from "../scripts/flow-theme.mjs";
import { CHECKOUT_PAYLOAD, fakeWindow, fragmentFor, orderPage, run } from "./r2-harness.mjs";
import { assertWords, screenOf, screenState, WORDS } from "./r2-screen.mjs";

const TOKENS = ["--navy", "--cta", "--ice", "--white"];

/** The screen the text draws on a valid link: its state, and its own style's text. */
async function drawn(text) {
  const page = await orderPage();
  page.hide(); // fill B waits for the cards: the screen is up, nothing pressed
  const h = fakeWindow({ fragment: fragmentFor(CHECKOUT_PAYLOAD), page });
  run(text, h.window);
  const s = screenOf(page.document);
  assert.ok(s, "the screen is drawn");
  return { state: screenState(page.document), css: s.querySelector("style")?.textContent ?? "" };
}

async function withCopy(path, edit, fn) {
  const dir = await mkdtemp(join(tmpdir(), "boston-r2-50-"));
  try {
    const copy = join(dir, path.split("/").at(-1));
    await writeFile(copy, edit(await readFile(path, "utf8")));
    return await fn(copy);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("R2-50a: no phrase in the source; the screen's title is data/messages.json's", async () => {
  assertWords();
  const source = await readFile(STOREFRONT_SOURCE, "utf8");
  for (const phrase of [WORDS.title, WORDS.checkout, WORDS.step]) {
    assert.ok(!source.includes(phrase), `the source carries a phrase: ${JSON.stringify(phrase)}`);
  }
  assert.doesNotMatch(source, /Assembling|Taking you/i, "no phrase of the screen in the source");
  assert.equal((await drawn(await storefrontText())).state.title, WORDS.title);
});

test("R2-50b: a phrase changed in a copy of data/messages.json changes the built text and the screen", async () => {
  const committed = await storefrontText();
  const changed = "R2-50 A CHANGED TITLE";
  await withCopy(MESSAGES_PATH, (json) => {
    const m = JSON.parse(json);
    m.handoff.title = changed;
    return JSON.stringify(m, null, 2);
  }, async (messagesPath) => {
    const text = await storefrontText({ messagesPath });
    assert.notEqual(text, committed, "the built text changed");
    assert.equal((await drawn(text)).state.title, changed, "and the screen shows it");
  });
});

test("R2-50c: the colours are the page's tokens: in the screen's style, none in the source; a changed token follows", async () => {
  const tokens = pageTokens(await readFile(TEMPLATE_PATH, "utf8"));
  const source = await readFile(STOREFRONT_SOURCE, "utf8");
  assert.doesNotMatch(source, /#[0-9a-f]{3,8}\b(?![\w-])/i, "no colour literal in the source");
  const { css } = await drawn(await storefrontText());
  for (const token of TOKENS) {
    assert.ok(tokens[token], `fixture control: src/template.html has ${token}`);
    assert.ok(css.toLowerCase().includes(tokens[token].toLowerCase()), `the screen's style carries ${token} (${tokens[token]})`);
  }
  await withCopy(TEMPLATE_PATH, (html) => html.replace(/--navy:\s*#[0-9a-f]+;/i, "--navy: #123456;"), async (templatePath) => {
    const text = await storefrontText({ templatePath });
    const again = await drawn(text);
    assert.ok(again.css.includes("#123456"), "a changed --navy reaches the screen");
    assert.ok(!again.css.toLowerCase().includes(tokens["--navy"].toLowerCase()), "and the old value is gone");
  });
});
