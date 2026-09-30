// P3: the photo positions (SPEC-mockup-photos.md § 3). The manifest (mockups/photos.json) names nine positions,
// each used by exactly one place in one piece, so one photo never leads several pieces unless its chooser repeats
// it. A position whose file is absent shows a labelled placeholder, a present file is shown, one position's
// changed file changes exactly one element, two positions may share a file (copied once), and the committed
// manifest names only each position's own placeholder file, never a photo's name.
//
// No photograph is used here: the renderer asks only whether a file is there, never what it shows, so every
// "photo" is an empty stand-in written to a temporary folder, and every changed manifest is a mirror beside it.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import { buildMockups, loadInputs, MANIFEST_PATH, renderMockups } from "../mockups/build-mockups.mjs";
import { elements, getPointer, hasClass, placedElements, textRuns } from "./mockup-html.mjs";

/**
 * § 1: the nine positions, each with the one piece it is in and its place there. The tent card's photos are a
 * grid whose first child spans both rows on the left (mockups.css `.tent-photos > :first-child`), so the large
 * photo is the first child, then the top tile, then the bottom one. A slide is its photo-slide section, in
 * order, with the plan whose line it carries (Lean, Signature, Performance, Family).
 */
const PLACES = {
  banner: { piece: "banner", within: "banner-photo", nth: 0 },
  flyer: { piece: "flyer", within: "flyer-hero", nth: 0 },
  "tent-large": { piece: "tent-card", within: "tent-photos", nth: 0 },
  "tent-top": { piece: "tent-card", within: "tent-photos", nth: 1 },
  "tent-bottom": { piece: "tent-card", within: "tent-photos", nth: 2 },
  "slide-1": { piece: "slideshow", slide: 0, plan: "/individual/0" },
  "slide-2": { piece: "slideshow", slide: 1, plan: "/individual/1" },
  "slide-3": { piece: "slideshow", slide: 2, plan: "/individual/2" },
  "slide-4": { piece: "slideshow", slide: 3, plan: "/family" },
};
const POSITIONS = Object.keys(PLACES).sort();
const PLAIN_FILE = /^[A-Za-z0-9][A-Za-z0-9 ._()&'-]*\.(jpe?g|png|webp)$/i;
/** Stand-in file names for the cases that change a manifest: never a photo's own name. */
const OTHER = "P3 other.jpg";
const SHARED = "P3 shared.jpg";

const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
const empty = await mkdtemp(join(tmpdir(), "boston-photos-empty-"));
const full = await mkdtemp(join(tmpdir(), "boston-photos-full-"));
const scratch = await mkdtemp(join(tmpdir(), "boston-photos-mirror-"));
after(async () => {
  for (const dir of [empty, full, scratch]) await rm(dir, { recursive: true, force: true });
});
for (const file of new Set([...Object.values(manifest.slots), OTHER, SHARED])) await writeFile(join(full, file), "");

let mirrors = 0;
/** A mirror of the committed manifest with some positions' files changed; `undefined` drops a position. */
async function mirror(changes) {
  const slots = { ...manifest.slots };
  for (const [position, file] of Object.entries(changes)) {
    if (file === undefined) delete slots[position];
    else slots[position] = file;
  }
  mirrors += 1;
  const path = join(scratch, `photos-${mirrors}.json`);
  await writeFile(path, JSON.stringify({ ...manifest, slots }, null, 2));
  return path;
}

/**
 * Every photo element (it carries data-slot) across the pieces, keyed by piece and its order in the piece, with
 * its opening tag as written (for an img, the whole element).
 */
function photosOf(pages) {
  const out = new Map();
  for (const [id, html] of Object.entries(pages)) {
    placedElements(html)
      .filter((e) => e.attrs["data-slot"])
      .forEach((el, i) => out.set(`${id} #${i}`, { id, el, markup: el.markup }));
  }
  return out;
}

test("P3-1: the manifest names exactly the nine positions, each a plain file name", () => {
  assert.deepEqual(Object.keys(manifest.slots).sort(), POSITIONS);
  for (const [position, file] of Object.entries(manifest.slots)) {
    assert.match(file, PLAIN_FILE, `${position}: ${file}`);
    assert.ok(!file.includes("/") && !file.includes(".."), `${position}: a file name, not a path`);
  }
});

test("P3-1: a manifest naming a path, a folder or another extension is refused, as before", async () => {
  await loadInputs({ photosDir: empty }); // control: the committed manifest loads
  for (const bad of ["../../secret.jpg", "photos/banner.jpg", "/banner.jpg", "banner.gif", "banner.heic"]) {
    await assert.rejects(loadInputs({ manifestPath: await mirror({ banner: bad }), photosDir: empty }), /not a plain file name/, bad);
  }
});

test("P3-2: across the four pieces, each position is on exactly one element, in the piece and place § 1 gives it", async () => {
  for (const dir of [empty, full]) {
    const pages = renderMockups(await loadInputs({ photosDir: dir }));
    const found = {};
    for (const [id, html] of Object.entries(pages)) {
      const all = placedElements(html);
      for (const el of all.filter((e) => e.attrs["data-slot"])) (found[el.attrs["data-slot"]] ??= []).push({ id, el, all });
    }
    assert.deepEqual(Object.keys(found).sort(), POSITIONS, "the pieces use exactly the nine positions");
    for (const [position, place] of Object.entries(PLACES)) {
      const on = found[position];
      assert.equal(on.length, 1, `${position} is on ${on.length} elements (${on.map((o) => o.id).join(", ")})`);
      const [{ id, el, all }] = on;
      assert.equal(id, place.piece, `${position} is in the ${place.piece}`);
      assert.ok(hasClass(el, "photo"), `${position} is a photo`);
      if (place.within) {
        assert.ok(hasClass(el.path.at(-1), place.within), `${position} sits in .${place.within}`);
        assert.equal(el.nth, place.nth, `${position} is child ${place.nth} of .${place.within}`);
        continue;
      }
      const section = el.path.find((p) => hasClass(p, "slide-photo"));
      assert.ok(section, `${position} is on a photo slide`);
      assert.equal(section.nth, place.slide, `${position} is on slide ${place.slide + 1}`);
      const lines = all.filter((e) => e.path.includes(section) && hasClass(e, "slide-line"));
      assert.deepEqual(
        lines.map((e) => e.attrs["data-src"]),
        [`data/plans.json#${place.plan}/promise`],
        `${position}: its slide carries that plan's line`,
      );
    }
  }
});

test("P3-2: a piece using a position the manifest lacks is refused", async () => {
  for (const position of POSITIONS) {
    const inputs = await loadInputs({ manifestPath: await mirror({ [position]: undefined }), photosDir: empty });
    assert.throws(() => renderMockups(inputs), new RegExp(`"${position}" is not in mockups/photos\\.json`), position);
  }
});

test("P3-3: with no photos present, all nine show a labelled placeholder naming the position and its file; no image is referenced", async () => {
  const pages = renderMockups(await loadInputs({ photosDir: empty }));
  const shown = [];
  for (const [id, html] of Object.entries(pages)) {
    const els = elements(html);
    assert.deepEqual(els.filter((e) => e.tag === "img" && hasClass(e, "photo")), [], `${id}: no photo is shown`);
    assert.deepEqual(els.filter((e) => /(^|\/)photos\//.test(e.attrs.src ?? "")), [], `${id}: no file in photos/ is referenced`);
    const labels = textRuns(html).filter((r) => r.path.some((el) => hasClass(el, "slot-label")));
    for (const el of els.filter((e) => e.attrs["data-slot"])) {
      const position = el.attrs["data-slot"];
      const file = manifest.slots[position];
      assert.ok(hasClass(el, "placeholder"), `${id}: ${position} is a placeholder`);
      const mine = labels.filter((r) => r.path.some((p) => p.attrs["data-slot"] === position)).map((r) => r.text);
      assert.ok(mine.includes("Photo to come"), `${id}: ${position} is labelled`);
      assert.ok(mine.some((t) => t.includes(position) && !t.includes(file)), `${id}: the label names the position ${position}`);
      assert.ok(mine.includes(file), `${id}: and the file it waits for, ${file}`);
      shown.push(position);
    }
  }
  assert.deepEqual(shown.sort(), POSITIONS, "all nine");
});

test("P3-4: with all nine present, each shows its file and no placeholder is left", async () => {
  const inputs = await loadInputs({ photosDir: full });
  const shown = [];
  for (const [id, html] of Object.entries(renderMockups(inputs))) {
    const els = elements(html);
    assert.deepEqual(els.filter((e) => hasClass(e, "placeholder") || hasClass(e, "slot-label")), [], `${id} has no placeholder`);
    for (const el of els.filter((e) => e.attrs["data-slot"])) {
      const position = el.attrs["data-slot"];
      assert.ok(el.tag === "img" && hasClass(el, "photo"), `${id}: ${position} is a photo`);
      assert.equal(el.attrs.src, `photos/${encodeURIComponent(manifest.slots[position])}`, `${id}: ${position}`);
      assert.equal(el.attrs["data-src"], `mockups/photos.json#/slots/${position}`, `${id}: ${position} cites its position`);
      assert.equal(getPointer(inputs.manifest, el.attrs["data-src"].split("#")[1]), manifest.slots[position]);
      shown.push(position);
    }
  }
  assert.deepEqual(shown.sort(), POSITIONS, "all nine");
});

// This replaces the slots' case, "one changed photo changes every piece that uses its slot": a photo now leads
// only the place it was chosen for. Every position is changed in turn, so a position two places share is caught
// whichever it is.
test("P3-5: one position's file changed (in a mirror) changes exactly one element; every other photo is byte-for-byte as before", async () => {
  const before = photosOf(renderMockups(await loadInputs({ photosDir: full })));
  assert.equal(before.size, POSITIONS.length, "control: nine photos before");
  for (const position of POSITIONS) {
    const inputs = await loadInputs({ manifestPath: await mirror({ [position]: OTHER }), photosDir: full });
    const now = photosOf(renderMockups(inputs));
    assert.deepEqual([...now.keys()], [...before.keys()], `${position}: the same photo elements`);
    const changed = [...before.keys()].filter((k) => now.get(k).markup !== before.get(k).markup);
    assert.equal(changed.length, 1, `${position}: ${changed.length} elements changed (${changed.join(", ")})`);
    const { id, el } = now.get(changed[0]);
    assert.equal(el.attrs["data-slot"], position, `${position}: the changed element is its own`);
    assert.equal(id, PLACES[position].piece);
    assert.equal(el.attrs.src, `photos/${encodeURIComponent(OTHER)}`, `${position}: it shows the other file`);
  }
});

test("P3-6: two positions naming one file both show it, and the build copies it once", async () => {
  const shared = ["tent-top", "slide-3"];
  const manifestPath = await mirror(Object.fromEntries(shared.map((p) => [p, SHARED])));
  const out = join(scratch, "built");
  const built = await buildMockups({ outDir: out, png: false, manifestPath, photosDir: full });
  const pages = {};
  for (const page of built.pages) pages[page] = await readFile(page, "utf8");
  for (const position of shared) {
    const on = Object.values(pages).flatMap((html) => elements(html).filter((e) => e.attrs["data-slot"] === position));
    assert.deepEqual(on.map((e) => e.attrs.src), [`photos/${encodeURIComponent(SHARED)}`], `${position} shows the shared file`);
  }
  const files = built.inputs.manifest.slots;
  const distinct = [...new Set(Object.values(files))].sort();
  assert.equal(distinct.length, POSITIONS.length - 1, "control: nine positions, eight files");
  const copied = (await readdir(join(out, "photos"))).sort();
  assert.deepEqual(copied, distinct, "dist-mockups/photos/ holds each named file once");
  assert.equal(copied.filter((f) => f === SHARED).length, 1);
  assert.equal(built.photos.length, distinct.length, 'the build\'s "N photo(s) copied" counts distinct files');
});

/** The positions whose committed file is not the position's own placeholder name. */
const notOwnNames = (m) => Object.entries(m.slots).filter(([position, file]) => file !== `${position}.jpg`).map(([p]) => p);

test("P3-7: the committed manifest (git HEAD) names each position's own file, <position>.jpg, with status placeholder", () => {
  const res = spawnSync("git", ["-C", ROOT, "show", "HEAD:./mockups/photos.json"], { encoding: "utf8" });
  assert.equal(res.status, 0, res.stderr);
  const committed = JSON.parse(res.stdout);
  assert.equal(committed.status, "placeholder");
  assert.deepEqual(Object.keys(committed.slots).sort(), POSITIONS);
  assert.deepEqual(notOwnNames(committed), [], "a preview's photo names never reach a commit");
  // Control: the check flags a position set to a photo's own name.
  assert.deepEqual(notOwnNames({ slots: { ...committed.slots, "slide-2": "a chosen photo.jpg" } }), ["slide-2"]);
});
