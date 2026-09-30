// The progress screen's inputs, read and checked: its words (data/messages.json's `handoff`) and the page's colours it
// uses (src/template.html's :root tokens). SPEC-rung2-progress-and-checkout § 1; § 14 and SPEC-storybook.md § 3.
// The build's own readers: scripts/build-storefront.mjs takes them from here and re-exports them, and inlines their
// output into the Footer block; tools/storybook's config imports them from here, so a story shows the words and colours
// the block ships. Kept apart from the build so that a tool can import them without the site's install (this file
// needs node's own modules and ./flow-theme.mjs only).
import { pageTokens } from "./flow-theme.mjs";

/** The words the screen uses, each required; `step`'s placeholders, each required in it. */
const UI_WORDS = ["title", "step", "checkout"];
const STEP_PLACEHOLDERS = ["{meal}", "{n}", "{total}"];
/** The page's tokens the screen uses (src/template.html :root), each required to be a hex colour. */
export const SCREEN_TOKENS = ["--navy", "--cta", "--ice", "--white"];

/** § 1: data/messages.json's `handoff` words, checked: a missing word or placeholder refuses the build. */
export function screenWords(messages) {
  const words = messages.handoff ?? {};
  for (const key of UI_WORDS) {
    if (typeof words[key] !== "string" || !words[key].trim()) throw new Error(`data/messages.json: handoff.${key} is missing`);
  }
  for (const p of STEP_PLACEHOLDERS) {
    if (!words.step.includes(p)) throw new Error(`data/messages.json: handoff.step has no ${p}`);
  }
  return Object.fromEntries(UI_WORDS.map((key) => [key, words[key]]));
}

/** § 1: the page's tokens the screen uses, as declarations (`--navy:#1b2360;…`), each a hex colour or the build refuses. */
export function screenTokens(templateHtml) {
  const tokens = pageTokens(templateHtml);
  return SCREEN_TOKENS.map((name) => {
    if (!/^#[0-9a-f]{3,8}$/i.test(tokens[name] ?? "")) throw new Error(`src/template.html: ${name} is not a hex colour (${tokens[name]})`);
    return `${name}:${tokens[name]}`;
  }).join(";");
}
