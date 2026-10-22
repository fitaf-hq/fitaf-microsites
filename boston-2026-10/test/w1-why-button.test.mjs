// W1 (SPEC-why-fit-af.md § 2 items 1-2, § 3): the built page, production's (`npm run build`) and every development page
// (`npm run build:dev`: `/` and `/<event-id>/`), carries the button in See all plans' style (the page's quieter button),
// and its dialog built as the plans dialog is: the box, the close button at its head, and ONE frame whose `src`,
// resolved against the address the page is served at, is the built /why/ page (the build's copy of src/why/index.html,
// beside the page). Each build into a temporary directory of its own; nothing is written in the package.
// ⚠ MOVED by SPEC-every-menu-and-nutrition.md § 11 item 5 (the Advisor's review of 2026-10-22: *"Let's try putting it in
// a button and then putting it above the Individual/Family chooser"*): the button sits directly above the tabs (no
// element between them but its no-script link and its dialog, neither drawn with script), and the footer carries no
// *Why Fit AF?* (one entry point): no button, no link, no dialog; its no-script link directly follows the button. Its
// height and its place as drawn are W2's (Chrome).
// The behaviour (opening, closing, focus, the frame loaded) is W2's and the page without script W3's, in Chrome:
// tools/storybook/test/w-why-chrome.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseHTML } from "linkedom";
import { build, ROOT } from "../build.mjs";
import events from "../data/events.json" with { type: "json" };

/** The button's label, the one phrase SPEC-why-fit-af § 2 names. */
const LABEL = "Why Fit AF?";
const WHY_PATH = "/why/";
/** Any origin: a frame's `src` is checked by the path it resolves to on the page's own origin. */
const ORIGIN = "https://site.invalid";
const WHY_SOURCE = await readFile(join(ROOT, "src", "why", "index.html"));

/** The pages a build writes, by the path the Worker serves each at (dist/ and dist-dev/ are the site's root). */
const PAGES = {
  prod: { "/": "index.html" },
  dev: { "/": "index.html", ...Object.fromEntries(events.map((e) => [`/${e.id}/`, `${e.id}/index.html`])) },
};

/** One line per thing W1 does not hold on the page served at `servedAt` from the build in `out`; [] when all do. */
function problemsOf(html, servedAt, out) {
  const problems = [];
  const fail = (what) => problems.push(`${servedAt}: ${what}`);
  const { document } = parseHTML(html);
  const button = document.getElementById("why-link");
  const plans = document.getElementById("all-link");
  if (!button) return [`${servedAt}: no #why-link`];
  if (button.tagName !== "BUTTON" || button.getAttribute("type") !== "button") fail(`#why-link is <${button.tagName.toLowerCase()} type="${button.getAttribute("type")}">, not a button`);
  if (button.textContent.trim() !== LABEL) fail(`#why-link reads "${button.textContent.trim()}"`);
  for (const name of ["all-link", "js-only"]) if (!button.classList.contains(name)) fail(`#why-link lacks the class ${name}`);
  if (button.getAttribute("aria-haspopup") !== "dialog") fail(`#why-link aria-haspopup="${button.getAttribute("aria-haspopup")}"`);
  if (button.getAttribute("aria-controls") !== "why") fail(`#why-link aria-controls="${button.getAttribute("aria-controls")}"`);
  // § 11 item 5: directly above the tabs, in the page's column; nothing of it in the footer.
  const tabs = document.querySelector('[role="tablist"]');
  if (!tabs || !tabs.querySelector("#tab-individual")) fail("fixture control: no tab list holding #tab-individual");
  if (button.closest("footer")) fail("#why-link is in the footer");
  if (!button.closest("main")) fail("#why-link is not in the page's column (main)");
  const between = [];
  let next = button.nextElementSibling;
  for (; next && next !== tabs; next = next.nextElementSibling) between.push(next);
  if (next !== tabs) fail("#why-link is not directly above the tabs (they are not its following sibling)");
  else if (between.some((el) => !(el.tagName === "NOSCRIPT" || el.id === "why"))) fail(`between #why-link and the tabs: ${between.map((el) => el.tagName.toLowerCase()).join(", ")}`);
  const noscript = button.nextElementSibling;
  const fallback = noscript?.tagName === "NOSCRIPT" ? parseHTML(`<div>${noscript.innerHTML}</div>`).document.querySelector("a") : null;
  if (!fallback || fallback.textContent.trim() !== LABEL || new URL(fallback.getAttribute("href"), `${ORIGIN}${servedAt}`).pathname !== WHY_PATH) fail("no no-script link to /why/, reading the label, directly after #why-link");
  const footer = document.querySelector("footer");
  if (!footer?.contains(plans)) fail("#all-link is not in the footer (it stays there)");
  if (footer && (footer.textContent.includes(LABEL) || footer.innerHTML.includes(WHY_PATH.slice(1)) || footer.querySelector("#why, #why-link"))) fail("the footer still carries Why Fit AF?");

  const dialog = document.getElementById("why");
  if (!dialog) return [...problems, `${servedAt}: no #why`];
  if (dialog.tagName !== "DIALOG") fail(`#why is <${dialog.tagName.toLowerCase()}>`);
  if (dialog.getAttribute("class") !== "all why") fail(`#why class="${dialog.getAttribute("class")}"`);
  if (dialog.getAttribute("aria-label") !== LABEL) fail(`#why aria-label="${dialog.getAttribute("aria-label")}"`);
  if (dialog.hasAttribute("open")) fail("#why is open in the markup");
  const close = dialog.querySelector(".all-box > .all-head > button.all-close");
  if (!close || close.id !== "why-close" || close.getAttribute("aria-label") !== "Close" || close.getAttribute("type") !== "button") {
    fail("no close button #why-close (aria-label Close) at the box's head");
  }
  if (close && !close.parentElement.classList.contains("js-only")) fail("the close button's head is not js-only, as #all's is");
  const frames = dialog.querySelectorAll("iframe");
  if (frames.length !== 1) return [...problems, `${servedAt}: ${frames.length} frames in #why`];
  const [frame] = frames;
  if (!frame.closest(".all-box")) fail("the frame is not in the box");
  if (frame.getAttribute("class") !== "why-frame") fail(`the frame's class="${frame.getAttribute("class")}"`);
  if (frame.getAttribute("title") !== LABEL) fail(`the frame's title="${frame.getAttribute("title")}"`);
  if (frame.getAttribute("loading") !== "lazy") fail(`the frame's loading="${frame.getAttribute("loading")}"`);
  const src = frame.getAttribute("src") ?? "";
  const resolved = new URL(src, `${ORIGIN}${servedAt}`);
  if (resolved.origin !== ORIGIN || resolved.pathname !== WHY_PATH || resolved.search || resolved.hash) fail(`the frame's src "${src}" resolves to ${resolved.href}`);
  const file = join(out, ...resolved.pathname.split("/").filter(Boolean), "index.html");
  if (!existsSync(file)) fail(`the frame's page ${file} was not built`);
  return problems;
}

for (const target of ["prod", "dev"]) {
  test(`W1 (${target}): the button directly above the tabs, none in the footer, and its dialog, the frame's src the built /why/ page`, async () => {
    const out = await mkdtemp(join(tmpdir(), `boston-w1-${target}-`));
    try {
      await build({ target, outDir: out });
      const built = await readFile(join(out, "why", "index.html"));
      assert.ok(built.equals(WHY_SOURCE), "control: the build copies src/why/index.html beside the page, byte for byte");
      for (const [servedAt, file] of Object.entries(PAGES[target])) {
        const html = await readFile(join(out, file), "utf8");
        assert.ok(html.includes('id="all-link"'), `${servedAt}: control: the page carries See all plans`);
        assert.deepEqual(problemsOf(html, servedAt, out), []);
      }
    } finally {
      await rm(out, { recursive: true, force: true });
    }
  });
}
