import test from "node:test";
import assert from "node:assert/strict";
import { bodyOf, declarations, linksOf, tagsOf, topLevelTables } from "./email-html.mjs";
import { inlineStack, pageTokens, sampleMessages } from "./email-fixture.mjs";

const MAX_WIDTH_PX = 600;
const { colours, all } = await pageTokens();

/** Every width the HTML declares, in px (attributes and width / min-width / max-width declarations). */
function widthsPx(html) {
  const out = [];
  for (const t of tagsOf(html)) {
    if (t.attrs.width !== undefined && !t.attrs.width.endsWith("%")) out.push({ where: t.raw, px: Number(t.attrs.width) });
    for (const [prop, value] of Object.entries(declarations(t.attrs.style))) {
      const px = /^(\d+(?:\.\d+)?)px$/.exec(value);
      if (/^(min-|max-)?width$/.test(prop) && px) out.push({ where: `${t.name} ${prop}`, px: Number(px[1]) });
    }
  }
  return out;
}

test("M19: one centred layout table, at most 600 px, and nothing wider", () => {
  for (const [name, message] of Object.entries(sampleMessages())) {
    const tables = topLevelTables(message.html);
    assert.equal(tables.length, 1, `${name}: a single layout table under <body>`);
    const [layout] = tagsOf(tables[0]);
    assert.equal(layout.attrs.align, "center", `${name}: centred`);
    assert.ok(Number(layout.attrs.width) <= MAX_WIDTH_PX, `${name}: width attribute ${layout.attrs.width}`);
    const style = declarations(layout.attrs.style);
    assert.equal(style["max-width"], `${MAX_WIDTH_PX}px`, `${name}: max-width`);
    assert.equal(style.margin, "0 auto", `${name}: centred where align is ignored`);
    const widths = widthsPx(message.html);
    assert.ok(widths.length >= 2, `control: ${name} declares its widths`);
    for (const w of widths) assert.ok(w.px <= MAX_WIDTH_PX, `${name}: ${w.px}px at ${w.where}`);
  }
});

test("M19: each button-styled link is a bulletproof button on --cta (the colour on its table cell, the padding on the link)", () => {
  for (const [name, message] of Object.entries(sampleMessages())) {
    const buttons = linksOf(message.html).filter((l) => l.buttonStyled);
    assert.ok(buttons.length >= 1, `control: ${name} has a button`);
    for (const { a, before: cell } of buttons) {
      assert.equal(cell.name, "td", `${name}: ${a.attrs.href} sits alone in a table cell`);
      assert.equal(cell.attrs.bgcolor, colours["--cta"], `${name}: the cell's bgcolor is --cta (Outlook draws it)`);
      assert.equal(declarations(cell.attrs.style)["background-color"], colours["--cta"]);
      const style = declarations(a.attrs.style);
      assert.equal(style["background-color"], colours["--cta"]);
      assert.equal(style.color, colours["--on-cta"], `${name}: the label is --on-cta`);
      assert.equal(style.display, "inline-block", `${name}: the whole button is the link`);
      assert.match(style.padding ?? "", /px/, `${name}: padded`);
      assert.equal(style["text-decoration"], "none");
    }
  }
});

test("M19: the font stacks are the page's --head (buttons) and --body (text), system fallbacks included", () => {
  const head = inlineStack(all["--head"]);
  const body = inlineStack(all["--body"]);
  assert.match(body, /sans-serif$/, "control: the page's stack ends in a generic family");
  for (const [name, message] of Object.entries(sampleMessages())) {
    const tags = tagsOf(bodyOf(message.html));
    const fonts = tags.map((t) => [t.name, declarations(t.attrs.style)["font-family"]]).filter(([, f]) => f);
    assert.ok(fonts.some(([n]) => n === "p") && fonts.some(([n]) => n === "a"), `control: ${name} sets its fonts`);
    for (const [tag, font] of fonts) assert.equal(font, tag === "a" ? head : body, `${name}: <${tag}> font-family`);
  }
});
