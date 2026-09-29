// P3: the photo manifest (mockups/photos.json) and the pieces agree. Every slot the manifest names is used,
// every slot a piece uses is in the manifest, a slot whose file is absent shows a labelled placeholder, a
// present file is shown, and changing one slot's file changes every piece that uses it.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadInputs, MANIFEST_PATH, renderMockups } from "../mockups/build-mockups.mjs";
import { elements, getPointer, hasClass, textRuns } from "./mockup-html.mjs";

const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
const slots = Object.keys(manifest.slots).sort();
const empty = await mkdtemp(join(tmpdir(), "boston-photos-empty-"));
const full = await mkdtemp(join(tmpdir(), "boston-photos-full-"));
after(async () => {
  await rm(empty, { recursive: true, force: true });
  await rm(full, { recursive: true, force: true });
});
// A stand-in file per slot: the renderer asks only whether the file is there, never what it shows.
for (const file of Object.values(manifest.slots)) await writeFile(join(full, file), "");

const slotsOn = (html) => new Set(elements(html).filter((e) => e.attrs["data-slot"]).map((e) => e.attrs["data-slot"]));
const photoImgs = (html) => elements(html).filter((e) => e.tag === "img" && hasClass(e, "photo"));
const placeholders = (html) => elements(html).filter((e) => hasClass(e, "placeholder") || hasClass(e, "slot-label"));

test("P3: the manifest names a file for every slot; names are plain file names", () => {
  assert.ok(slots.length >= 4);
  for (const [slot, file] of Object.entries(manifest.slots)) {
    assert.match(slot, /^[a-z0-9-]+$/);
    assert.match(file, /^[A-Za-z0-9][A-Za-z0-9 ._()&'-]*\.(jpe?g|png|webp)$/i, `${slot}: ${file}`);
    assert.ok(!file.includes("/") && !file.includes(".."), `${slot}: a file name, not a path`);
  }
});

test("P3: every manifest slot is used by some piece, and every slot a piece uses is in the manifest", async () => {
  const pages = renderMockups(await loadInputs({ photosDir: empty }));
  const used = new Set(Object.values(pages).flatMap((html) => [...slotsOn(html)]));
  assert.deepEqual([...used].sort(), slots);
});

test("P3: without the photos, every slot shows a labelled placeholder and no photo is referenced", async () => {
  const pages = renderMockups(await loadInputs({ photosDir: empty }));
  for (const [id, html] of Object.entries(pages)) {
    assert.deepEqual(photoImgs(html), [], `${id} references no photo file`);
    const slotElements = elements(html).filter((e) => e.attrs["data-slot"]);
    assert.ok(slotElements.length >= 1, `${id} has a photo slot`);
    assert.ok(slotElements.every((e) => hasClass(e, "placeholder")), `${id}: every slot element is a placeholder`);
    const labels = textRuns(html).filter((r) => r.path.some((el) => hasClass(el, "slot-label")));
    for (const slot of slotsOn(html)) {
      assert.ok(labels.some((r) => r.text.includes(slot)), `${id}: the placeholder for ${slot} names its slot`);
      assert.ok(labels.some((r) => r.text.includes(manifest.slots[slot])), `${id}: and the file it waits for`);
    }
  }
});

test("P3: with the photos present, each slot shows its file and no placeholder is left", async () => {
  const inputs = await loadInputs({ photosDir: full });
  for (const [id, html] of Object.entries(renderMockups(inputs))) {
    assert.deepEqual(placeholders(html), [], `${id} has no placeholder`);
    for (const img of photoImgs(html)) {
      const slot = img.attrs["data-slot"];
      assert.equal(img.attrs.src, `photos/${encodeURIComponent(manifest.slots[slot])}`, `${id}: ${slot}`);
      assert.equal(getPointer(inputs.manifest, img.attrs["data-src"].split("#")[1]), manifest.slots[slot]);
    }
  }
});

test("P3: one changed photo in the manifest changes every piece that uses its slot", async () => {
  const inputs = await loadInputs({ photosDir: full });
  const hero = structuredClone(inputs);
  hero.manifest.slots.hero = "P3 changed hero.jpg";
  hero.photos.hero = { file: "P3 changed hero.jpg", present: true };
  const pages = renderMockups(hero);
  const users = Object.keys(pages).filter((id) => slotsOn(pages[id]).has("hero"));
  assert.equal(users.length, 4, "the hero photo is on all four pieces");
  for (const id of users) assert.ok(pages[id].includes('src="photos/P3%20changed%20hero.jpg"'), id);
});

test("P3: a manifest naming a path, not a file, is refused", async () => {
  const bad = join(empty, "bad-manifest.json");
  await writeFile(bad, JSON.stringify({ ...manifest, slots: { ...manifest.slots, hero: "../../secret.jpg" } }));
  await assert.rejects(loadInputs({ manifestPath: bad, photosDir: empty }), /not a plain file name/);
});
