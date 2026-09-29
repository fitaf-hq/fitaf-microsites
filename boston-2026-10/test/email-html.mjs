// Reading an email's HTML part in the tests (M8, M14–M20). Not a test file itself. Plain string functions: the
// renderer's markup is small and regular, and a parser dependency would be the only one the tests carry.
const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
export const decode = (s) => s.replace(/&[a-z#0-9]+;/g, (e) => ENTITIES[e] ?? e);

/** The <body> element's inner HTML. */
export function bodyOf(html) {
  const m = /<body\b[^>]*>([\s\S]*)<\/body>/.exec(html);
  if (!m) throw new Error("no <body> in the HTML part");
  return m[1];
}

/** What a reader sees of a fragment: its tags removed and its entities decoded. */
export const visibleText = (fragment) => decode(fragment.replace(/<[^>]*>/g, ""));
export const collapse = (s) => s.replace(/\s+/g, " ").trim();

/** Every opening tag: its lower-case name and its attributes (values decoded). */
export function tagsOf(html) {
  return [...html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)].map((m) => ({
    name: m[1].toLowerCase(),
    raw: m[0],
    index: m.index,
    attrs: Object.fromEntries([...m[2].matchAll(/([a-z-]+)="([^"]*)"/gi)].map((a) => [a[1].toLowerCase(), decode(a[2])])),
  }));
}

/** A style attribute as { property: value }. */
export function declarations(style = "") {
  return Object.fromEntries(
    style
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const i = d.indexOf(":");
        return [d.slice(0, i).trim().toLowerCase(), d.slice(i + 1).trim()];
      }),
  );
}

/** The tables directly under <body> (nesting-aware): each one's opening tag. */
export function topLevelTables(html) {
  const body = bodyOf(html);
  const found = [];
  let depth = 0;
  for (const m of body.matchAll(/<(\/?)table\b[^>]*>/gi)) {
    if (m[1] !== "/" && depth === 0) found.push(m[0]);
    depth += m[1] === "/" ? -1 : 1;
  }
  return found;
}

/** The rows of the layout table (not of a button's table nested in one): each row's inner HTML, in order. */
export function layoutRows(html) {
  const body = bodyOf(html);
  const rows = [];
  let depth = 0;
  let start = null;
  for (const m of body.matchAll(/<(\/?)(table|tr)\b[^>]*>/gi)) {
    const closing = m[1] === "/";
    if (m[2].toLowerCase() === "table") depth += closing ? -1 : 1;
    else if (depth === 1 && !closing) start = m.index + m[0].length;
    else if (depth === 1 && closing) rows.push(body.slice(start, m.index));
  }
  return rows;
}

/** Each line of the message as the HTML shows it: one layout row per line; the logo's row has no text. */
export const lineTexts = (html) => layoutRows(html).map(visibleText).filter((t) => t !== "");

/** The <a href> values, in order, decoded. */
export const hrefsOf = (html) => tagsOf(bodyOf(html)).filter((t) => t.name === "a").map((t) => t.attrs.href);

/** A text part's wording: each link's ": URL" removed (renderText writes a button as "label: href"). */
export const wordingOf = (text) => text.replace(/: https?:\/\/\S+/g, "");
export const linksOfText = (text) => [...text.matchAll(/https?:\/\/\S+/g)].map((m) => m[0]);
