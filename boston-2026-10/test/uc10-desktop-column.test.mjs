// UC10 (SPEC-ui-and-copy-pass.md § 3, the Advisor 2026-10-25: "force the entire site into a maximum width column (and
// put it on a matching or cooordinating background) as a workaround"): above 480 px the whole page sits in one centred
// 480 px column on --navy, the carousel's 4:3 window at the column's width; at 480 and narrower nothing changes. Read
// off the page's own style sheet on both builds that carry the page. Its look at 1280 and 390 is a render's, not this
// file's.
import test from "node:test";
import assert from "node:assert/strict";
import { approvedWeekPage, weekPage } from "./uc-harness.mjs";

/** § 3 item 1: the column's width, and the breakpoint written beside it (the column plus one). */
const COLUMN_PX = 480;
const BREAKPOINT = `@media (min-width: ${COLUMN_PX + 1}px)`;
/** The carousel's rule outside the media query, as it was before this contract (SPEC-plan-page-refinement § 8). */
const SLIDES_RULE = ".slides { position: relative; height: min(75vw, 640px); overflow: hidden; background: var(--ice); }";

const pages = async () => [
  ["the development page", await weekPage()],
  ["the production page (production true)", (await approvedWeekPage()).html],
];

/** The page's own style sheet: the first <style> in the head. */
function styleSheet(html) {
  const m = html.match(/<style>([\s\S]*?)<\/style>/);
  assert.ok(m, "the page has a style sheet");
  return m[1];
}

/** The body of every block opened by `opener` (brace-matched), in order. */
function blocks(css, opener) {
  const found = [];
  for (let at = css.indexOf(opener); at !== -1; at = css.indexOf(opener, at + 1)) {
    const open = css.indexOf("{", at);
    let depth = 0;
    for (let i = open; i < css.length; i++) {
      if (css[i] === "{") depth++;
      if (css[i] === "}" && --depth === 0) { found.push(css.slice(open + 1, i)); break; }
    }
  }
  return found;
}

/** A rule's declarations inside `css`, as a map: the first rule whose selector is exactly `selector`. */
function declarations(css, selector) {
  const m = css.match(new RegExp(`(?:^|[}\\s])${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`));
  assert.ok(m, `a rule for ${selector}`);
  return Object.fromEntries(m[1].split(";").map((d) => d.trim()).filter(Boolean).map((d) => {
    const i = d.indexOf(":");
    return [d.slice(0, i).trim(), d.slice(i + 1).trim()];
  }));
}

test("UC10a: the column's media query exists once, at the column plus one", async () => {
  for (const [name, html] of await pages()) {
    const css = styleSheet(html);
    assert.equal(blocks(css, BREAKPOINT).length, 1, `${name}: one ${BREAKPOINT}`);
    assert.equal(css.match(/@media \(min-width:/g)?.length, 1, `${name}: no other min-width query`);
  }
});

// § 3.1: the token is declared on html inside the block, never in :root, whose tokens are copied into the emails
// (email-tokens.json, M17), the Worker's pages (page-style.json, SP15) and the privacy page.
test("UC10b: the token is the column's width, 480 px, inside the block and not in :root", async () => {
  for (const [name, html] of await pages()) {
    const css = styleSheet(html);
    const [inside] = blocks(css, BREAKPOINT);
    assert.ok(inside, `${name}: the block`);
    assert.equal(declarations(inside, "html")["--column"], `${COLUMN_PX}px`, name);
    assert.equal(declarations(css, ":root")["--column"], undefined, `${name}: :root carries no --column`);
  }
});

test("UC10c: inside it, navy outside the column, the page centred in it at least the screen's height", async () => {
  for (const [name, html] of await pages()) {
    const [inside] = blocks(styleSheet(html), BREAKPOINT);
    assert.ok(inside, `${name}: the block`);
    assert.equal(declarations(inside, "html").background, "var(--navy)", `${name}: html's background`);
    const body = declarations(inside, "body");
    assert.equal(body["max-width"], "var(--column)", `${name}: body's maximum width`);
    assert.equal(body.margin, "0 auto", `${name}: centred`);
    assert.equal(body["min-height"], "100vh", `${name}: the column fills the screen's height`);
    assert.equal(declarations(inside, ".slides").height, "calc(var(--column) * 3 / 4)", `${name}: the 4:3 window`);
  }
});

test("UC10d: no raw colour in the block; every colour a token", async () => {
  for (const [name, html] of await pages()) {
    const [inside] = blocks(styleSheet(html), BREAKPOINT);
    assert.doesNotMatch(inside, /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i, name);
  }
});

test("UC10e: at 480 and narrower nothing changes: the carousel's own rule is as it was", async () => {
  for (const [name, html] of await pages()) {
    assert.ok(styleSheet(html).includes(SLIDES_RULE), `${name}: ${SLIDES_RULE}`);
  }
});
