// The flow diagrams' theme, derived from the page's own CSS: every colour and both font stacks are
// read from the :root tokens of src/template.html, and the fonts are the page's own @font-face rules
// and files. Nothing here needs a browser, so test F1 can recompute the theme's hash and tell a render
// made under older tokens from a current one.
//
// Colour pairs are ones src/contrast-pairs.json already measures on the page: navy on ice, ink on white
// and white on navy (text: names, labels, the sequence numbers), navy on white (lines), and orange on
// white (a non-text accent: the start and end dots).
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";

export const TEMPLATE_PATH = join(ROOT, "src", "template.html");
export const FONTS_DIR = join(ROOT, "src", "fonts");

const ROOT_BLOCK = /:root\s*\{([^{}]*)\}/;
const DECLARATION = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
/** A rule body may hold the build's `{{ASSET_PREFIX}}` slot, whose braces are not CSS. */
const FONT_FACE = /@font-face\s*\{((?:\{\{\w+\}\}|[^{}])*)\}/g;
const ASSET_PREFIX = "{{ASSET_PREFIX}}";

/** Every custom property in the template's :root block, by name (`--navy` → `#1b2360`). */
export function pageTokens(templateHtml) {
  const block = templateHtml.match(ROOT_BLOCK);
  if (!block) throw new Error("src/template.html has no :root block");
  const tokens = {};
  for (const [, name, value] of block[1].matchAll(DECLARATION)) tokens[name] = value.trim();
  return tokens;
}

/** The first family of a font stack, unquoted: `"Open Sans", system-ui` → `Open Sans`. */
export const firstFamily = (stack) => stack.split(",")[0].trim().replace(/^["']|["']$/g, "");

/** The page's @font-face rules: family, weight, style and the font file's name. */
export function pageFontFaces(templateHtml) {
  return [...templateHtml.matchAll(FONT_FACE)].map(([, body]) => {
    const prop = (name) => body.match(new RegExp(`${name}\\s*:\\s*([^;]+);`))?.[1].trim();
    const src = prop("src").match(/url\("([^"]+)"\)/)[1].replace(ASSET_PREFIX, "");
    return {
      family: firstFamily(prop("font-family")),
      weight: Number(prop("font-weight")),
      style: prop("font-style"),
      file: src.replace(/^fonts\//, ""),
    };
  });
}

/** Which text uses which face. Mermaid's own CSS sets no weight, so everything else is `text`. */
export const TEXT_ROLES = {
  text: { token: "--body", weight: 400 },
  label: { token: "--head", weight: 600 },
  // Sequence participants are sized from mermaid's config, not the CSS, and mermaid 12 copies the
  // top-level fontFamily over the actor font — so they are the body face, at the page's 600.
  actor: { token: "--body", weight: 600 },
};

/** The roles each kind of diagram draws with; an SVG carries only these faces. */
const ROLES_BY_KIND = { sequenceDiagram: ["text", "actor"] };
const DEFAULT_ROLES = ["text", "label"];

/** A block's diagram kind: its first word (`stateDiagram-v2`, `flowchart`, `sequenceDiagram` …). */
export const diagramKind = (source) => source.trim().split(/\s+/)[0];

/** Flowchart node and state names: the store's heading face, as on the page's plan names. */
const LABEL_SELECTORS = [".nodeLabel", ".node .label", ".cluster-label", ".statediagram-state .label"];

const FLOWCHART_WRAP_PX = 200;

/** The mermaid configuration: the base theme, coloured and set from the tokens. */
export function mermaidConfig(tokens) {
  const t = (name) => {
    if (!(name in tokens)) throw new Error(`the flow theme names ${name}, which :root does not declare`);
    return tokens[name];
  };
  const label = TEXT_ROLES.label;
  return {
    theme: "base",
    // Mermaid 12's default here ends in ";", which the sequence renderer copies onto every text element,
    // where Chrome rejects it: the text falls back to another face and outgrows the box sized for it.
    fontFamily: t(TEXT_ROLES.text.token),
    themeVariables: {
      fontFamily: t(TEXT_ROLES.text.token),
      fontSize: "16px",
      background: t("--white"),
      textColor: t("--ink"),
      lineColor: t("--navy"),
      primaryColor: t("--ice"),
      primaryTextColor: t("--navy"),
      primaryBorderColor: t("--navy"),
      secondaryColor: t("--white"),
      tertiaryColor: t("--white"),
      edgeLabelBackground: t("--white"),
      clusterBkg: t("--white"),
      clusterBorder: t("--navy"),
      titleColor: t("--navy"),
      stateBkg: t("--ice"),
      stateBorder: t("--navy"),
      stateLabelColor: t("--navy"),
      transitionColor: t("--navy"),
      transitionLabelColor: t("--ink"),
      labelBackgroundColor: t("--white"),
      compositeBackground: t("--white"),
      compositeTitleBackground: t("--ice"),
      compositeBorder: t("--navy"),
      altBackground: t("--white"),
      specialStateColor: t("--orange"),
      innerEndBackground: t("--orange"),
      actorBkg: t("--ice"),
      actorBorder: t("--navy"),
      actorTextColor: t("--navy"),
      actorLineColor: t("--navy"),
      signalColor: t("--navy"),
      signalTextColor: t("--ink"),
      sequenceNumberColor: t("--white"),
      labelBoxBkgColor: t("--ice"),
      labelBoxBorderColor: t("--navy"),
      labelTextColor: t("--navy"),
      loopTextColor: t("--ink"),
      noteBkgColor: t("--ice"),
      noteTextColor: t("--ink"),
      noteBorderColor: t("--navy"),
    },
    themeCSS: `${LABEL_SELECTORS.join(", ")} { font-family: ${t(label.token)}; font-weight: ${label.weight}; }`,
    // Flowchart labels wrap at mermaid's long-standing 200px rather than 12's narrower default, so a
    // node reads as a phrase, not a column of words.
    flowchart: { wrappingWidth: FLOWCHART_WRAP_PX },
    // A sequence diagram sizes its boxes from these, not from the CSS (the family is the top-level one).
    sequence: { actorFontWeight: String(TEXT_ROLES.actor.weight) },
  };
}

/** The face each text role draws with, by role, from the page's own @font-face rules. */
export function themeFaces(tokens, faces) {
  const byRole = {};
  for (const [role, { token, weight }] of Object.entries(TEXT_ROLES)) {
    const family = firstFamily(tokens[token]);
    const face = faces.find((f) => f.family === family && f.weight === weight && f.style === "normal");
    if (!face) throw new Error(`the page has no @font-face for ${family} ${weight} (flow role "${role}")`);
    byRole[role] = face;
  }
  return byRole;
}

/** The faces one block's diagram draws with (each face once). */
export function facesFor(source, byRole) {
  const roles = ROLES_BY_KIND[diagramKind(source)] ?? DEFAULT_ROLES;
  return [...new Set(roles.map((r) => byRole[r]))];
}

/** @font-face CSS for the given faces, each font file inlined as a data: URI. */
export async function fontFaceCss(faces, fontsDir = FONTS_DIR) {
  const rules = await Promise.all(
    faces.map(async (f) => {
      const b64 = (await readFile(join(fontsDir, f.file))).toString("base64");
      return `@font-face { font-family: "${f.family}"; font-style: ${f.style}; font-weight: ${f.weight}; src: url("data:font/woff2;base64,${b64}") format("woff2"); }`;
    }),
  );
  return rules.join("\n");
}

/** Everything a render depends on besides the block itself: the config and the faces (names, not bytes). */
export async function flowTheme(templatePath = TEMPLATE_PATH) {
  const html = await readFile(templatePath, "utf8");
  const tokens = pageTokens(html);
  const config = mermaidConfig(tokens);
  const faces = themeFaces(tokens, pageFontFaces(html));
  const hash = createHash("sha256").update(JSON.stringify({ config, faces })).digest("hex");
  return { tokens, config, faces, hash, background: tokens["--white"] };
}
