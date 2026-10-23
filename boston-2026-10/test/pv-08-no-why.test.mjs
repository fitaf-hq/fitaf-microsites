// PV8 (SPEC-preview-sites.md § 8, the orchestrator's ruling of 2026-10-22): a preview build leaves out "Why Fit AF?",
// the button, its dialog and its no-script /why/ link, as it leaves out the save step and /privacy/ (§ 7 items 3 and 8:
// no link holds an address on a preview, and the preview Worker serves /fonts/ and /assets/ only). The page
// `npm run build -- --env preview` writes carries no Why button, dialog or link markup and no "/why/" anywhere, and the
// build writes no why/. The production and development builds still carry SPEC-every-menu-and-nutrition § 11 item 5's
// button above the tabs, its dialog and frame, and its no-script link to /why/, with why/ built beside the page (W1 holds
// them in full; PV5 holds every file of both builds byte-identical to the tree before the preview build).
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { parseHTML } from "linkedom";
import { build } from "../build.mjs";
import events from "../data/events.json" with { type: "json" };
import { previewBuild } from "./pv-harness.mjs";

const WHY_PATH = "/why/";
/** Any origin: an address is checked by the path it resolves to on the page's own origin. */
const ORIGIN = "https://site.invalid";
/** Every element of "Why Fit AF?" on a page (SPEC-why-fit-af §§ 2 and 6; SPEC-every-menu-and-nutrition § 11 item 5). */
const WHY_ELEMENTS = ".why-link, #why-link, #why, #why-close, #why-frame, dialog.why, iframe.why-frame";

/** The pages a build writes, by the path the Worker serves each at (dist/ and dist-dev/ are the site's root). */
const PAGES = {
  prod: { "/": "index.html" },
  dev: { "/": "index.html", ...Object.fromEntries(events.map((e) => [`/${e.id}/`, `${e.id}/index.html`])) },
};

test("PV8 (preview): the page carries no Why Fit AF? button, dialog or link and no /why/ anywhere; the build writes no why/", async () => {
  const { html, result } = await previewBuild();
  const { document } = parseHTML(html);
  assert.ok(document.getElementById("preview-date"), "control: the page is the preview's (its banner's date)");
  assert.ok(document.getElementById("all-link"), "control: the page carries See all plans");
  assert.deepEqual([...document.querySelectorAll(WHY_ELEMENTS)].map((el) => el.outerHTML.slice(0, 80)), [], "no Why element");
  const noscripts = [...document.querySelectorAll("noscript")].map((n) => n.innerHTML).filter((h) => /why/i.test(h) && !/^<style>/.test(h.trim()));
  assert.deepEqual(noscripts, [], "no no-script Why link");
  const at = html.split(WHY_PATH).length - 1;
  assert.equal(at, 0, `the page holds "${WHY_PATH}" ${at} time(s)`);
  const outDir = result.indexPath.slice(0, -"index.html".length);
  const why = result.files.map((f) => relative(outDir, f)).filter((f) => f.split(sep)[0] === "why");
  assert.deepEqual(why, [], "the build writes no why/");
});

for (const target of ["prod", "dev"]) {
  test(`PV8 (${target}): the ${target === "prod" ? "production" : "development"} build still carries § 11 item 5's button, dialog and no-script /why/ link, and why/`, async () => {
    const out = await mkdtemp(join(tmpdir(), `boston-pv8-${target}-`));
    try {
      const result = await build({ target, outDir: out });
      assert.ok(result.files.some((f) => relative(out, f) === join("why", "index.html")), "why/index.html built beside the page");
      for (const [servedAt, file] of Object.entries(PAGES[target])) {
        const { document } = parseHTML(await readFile(join(out, file), "utf8"));
        const button = document.getElementById("why-link");
        assert.ok(button?.tagName === "BUTTON" && button.classList.contains("why-link"), `${servedAt}: the button #why-link`);
        const fallback = parseHTML(`<div>${button.nextElementSibling?.innerHTML ?? ""}</div>`).document.querySelector("a.why-link");
        assert.ok(fallback, `${servedAt}: the no-script link directly after the button`);
        assert.equal(new URL(fallback.getAttribute("href"), `${ORIGIN}${servedAt}`).pathname, WHY_PATH, `${servedAt}: the no-script link leads to /why/`);
        const frame = document.querySelector("dialog#why iframe#why-frame");
        assert.ok(frame, `${servedAt}: the dialog #why and its frame`);
        assert.equal(new URL(frame.getAttribute("src"), `${ORIGIN}${servedAt}`).pathname, WHY_PATH, `${servedAt}: the frame shows /why/`);
      }
    } finally {
      await rm(out, { recursive: true, force: true });
    }
  });
}
