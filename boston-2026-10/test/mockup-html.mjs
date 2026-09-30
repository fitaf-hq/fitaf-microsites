// Shared by the P*.test.mjs files (the mock-ups). Not a test file itself.
// A small reader for the HTML the mock-up renderer writes: the text a viewer sees, and the elements
// around each piece of it. It reads only markup this package generates, so a tag stack is enough.
const VOID = new Set(["img", "br", "meta", "link", "input", "source", "hr", "wbr"]);
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " ", middot: "·" };

export const decode = (s) =>
  s.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (whole, name) => {
    if (name in ENTITIES) return ENTITIES[name];
    if (/^#x/i.test(name)) return String.fromCodePoint(parseInt(name.slice(2), 16));
    if (name.startsWith("#")) return String.fromCodePoint(Number(name.slice(1)));
    return whole;
  });

export function attrsOf(raw) {
  const out = {};
  for (const m of raw.matchAll(/([a-z][a-z0-9-]*)(?:="([^"]*)")?/gi)) out[m[1]] = m[2] === undefined ? "" : decode(m[2]);
  return out;
}

/** Every non-blank text run in <body>, with the chain of elements that encloses it (outermost first). */
export function textRuns(html) {
  const body = /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(html);
  if (!body) throw new Error("no <body>");
  const markup = body[1].replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "");
  const stack = [];
  const runs = [];
  for (const m of markup.matchAll(/<(\/?)([a-z][a-z0-9]*)\b([^>]*)>|([^<]+)/gi)) {
    if (m[4] !== undefined) {
      const text = decode(m[4]);
      if (text.trim()) runs.push({ text, path: [...stack] });
      continue;
    }
    const tag = m[2].toLowerCase();
    if (m[1]) {
      const top = stack.pop();
      if (!top || top.tag !== tag) throw new Error(`unbalanced </${tag}> (open: ${top?.tag})`);
    } else if (!VOID.has(tag) && !m[3].trimEnd().endsWith("/")) {
      stack.push({ tag, attrs: attrsOf(m[3]) });
    }
  }
  if (stack.length) throw new Error(`unclosed <${stack.at(-1).tag}>`);
  return runs;
}

/** An annotation (the legend, a photo slot's placeholder label) is about the mock-up, not on it. */
export const isAnnotation = (run) => run.path.some((el) => "data-annotation" in el.attrs);

/** The text the mock-up itself carries: every run outside an annotation. */
export const pieceRuns = (html) => textRuns(html).filter((r) => !isAnnotation(r));

/** Whether an element carries a class, as a whole token ("slide-photo" does not carry "photo"). */
export const hasClass = (el, name) => (el.attrs.class ?? "").split(/\s+/).includes(name);

/** Every opening tag with its attributes (for data-src, data-slot, src, class). */
export function elements(html) {
  return [...html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)].map((m) => ({ tag: m[1].toLowerCase(), attrs: attrsOf(m[2]) }));
}

/**
 * Every opening tag in <body>, with the chain of elements that encloses it (outermost first), its index among its
 * parent's element children (`nth`), and its markup as written. The chain holds the same objects the list does,
 * so `el.path.includes(other)` asks whether `el` is inside `other`.
 */
export function placedElements(html) {
  const body = /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(html);
  if (!body) throw new Error("no <body>");
  const markup = body[1].replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "");
  const stack = [{ tag: "body", children: 0 }];
  const out = [];
  for (const m of markup.matchAll(/<(\/?)([a-z][a-z0-9]*)\b([^>]*)>/gi)) {
    const tag = m[2].toLowerCase();
    if (m[1]) {
      if (stack.length === 1 || stack.at(-1).tag !== tag) throw new Error(`unbalanced </${tag}> (open: ${stack.at(-1).tag})`);
      stack.pop();
      continue;
    }
    const parent = stack.at(-1);
    const el = { tag, attrs: attrsOf(m[3]), markup: m[0], nth: parent.children, path: stack.slice(1), children: 0 };
    parent.children += 1;
    out.push(el);
    if (!VOID.has(tag) && !m[3].trimEnd().endsWith("/")) stack.push(el);
  }
  if (stack.length > 1) throw new Error(`unclosed <${stack.at(-1).tag}>`);
  return out;
}

/** The data-src references on a page, split into their sources ("data/plans.json#/individual/0/name"). */
export const dataSources = (html) =>
  elements(html).flatMap((el) => (el.attrs["data-src"] ? el.attrs["data-src"].split(" ") : []));

/** RFC 6901 JSON pointer, read and write. */
const unescapeToken = (t) => t.replace(/~1/g, "/").replace(/~0/g, "~");
export function getPointer(obj, pointer) {
  if (pointer === "") return obj;
  return pointer
    .slice(1)
    .split("/")
    .map(unescapeToken)
    .reduce((node, key) => {
      if (node === undefined || node === null || !(key in Object(node))) throw new Error(`pointer ${pointer} does not resolve`);
      return node[key];
    }, obj);
}
export function setPointer(obj, pointer, value) {
  const keys = pointer.slice(1).split("/").map(unescapeToken);
  const last = keys.pop();
  const parent = keys.reduce((node, key) => node[key], obj);
  if (!(last in Object(parent))) throw new Error(`pointer ${pointer} does not resolve`);
  parent[last] = value;
}
