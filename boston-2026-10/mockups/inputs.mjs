// Everything the mock-ups are built from, read once: the page's own data (data/), the page's own look
// (src/template.html's :root tokens and font faces), and the photo manifest (mockups/photos.json). The
// pieces are an OUTPUT of these inputs; no word on a mock-up is typed in the renderer (test P2).
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EVENTS_PATH, loadJson, MESSAGES_PATH, PLANS_PATH, ROOT, SAVE_PATH } from "../build.mjs";
import { zonedDate } from "../src/worker/zoned-time.js";

export const MOCKUPS_DIR = dirname(fileURLToPath(import.meta.url));
export const MANIFEST_PATH = join(MOCKUPS_DIR, "photos.json");
/** ⛔ git-ignored: photographs are never committed (test P1). */
export const PHOTOS_DIR = join(MOCKUPS_DIR, "photos");
export const OFFERS_PATH = join(ROOT, "data", "offers.json");
export const TEMPLATE_PATH = join(ROOT, "src", "template.html");

/** Each input as the legend names it, relative to the package. */
export const SOURCES = {
  messages: "data/messages.json",
  offers: "data/offers.json",
  plans: "data/plans.json",
  events: "data/events.json",
};
export const MANIFEST_SOURCE = "mockups/photos.json";
export const LOGO_SOURCE = "src/assets/fitaf-logo.png";
export const TOKENS_SOURCE = "src/template.html";

/** A photo is named by a plain file name in the photos folder, never a path. */
const PLAIN_FILE = /^[A-Za-z0-9][A-Za-z0-9 ._()&'-]*\.(jpe?g|png|webp)$/i;
const SLOT_NAME = /^[a-z0-9-]+$/;

/**
 * The page's :root block and @font-face rules, verbatim. The fonts' {{ASSET_PREFIX}} slot is resolved to ""
 * (fonts/ beside the output, as in the production build) BEFORE the rules are found: its braces would
 * otherwise end a rule inside its url().
 */
export function siteStyle(template) {
  const css = template.replaceAll("{{ASSET_PREFIX}}", "");
  const root = /:root\s*\{[^{}]*\}/.exec(css);
  if (!root) throw new Error("the template has no :root block");
  const faces = [...css.matchAll(/@font-face\s*\{[^{}]*\}/g)].map((m) => m[0]);
  if (faces.length === 0) throw new Error("the template has no @font-face rule");
  return { root: root[0], fonts: faces.join("\n") };
}

export async function readManifest(path) {
  const manifest = await loadJson(path);
  const slots = manifest.slots;
  if (!slots || typeof slots !== "object" || Object.keys(slots).length === 0) throw new Error(`${path} names no photo slots`);
  for (const [slot, file] of Object.entries(slots)) {
    if (!SLOT_NAME.test(slot)) throw new Error(`photo slot "${slot}" is not a slot name (a-z, 0-9, -)`);
    if (typeof file !== "string" || !PLAIN_FILE.test(file) || file.includes("..")) {
      throw new Error(`photo slot "${slot}": ${JSON.stringify(file)} is not a plain file name (.jpg, .png or .webp, no folder)`);
    }
  }
  return manifest;
}

/**
 * Read every input. `today` (YYYY-MM-DD in the send time zone of data/save.json) picks the offer by the
 * Worker's own rule, offerForSave: the live event offer, else the current general one. `eventId` picks
 * the event whose QR code the pieces carry (default: the first in data/events.json).
 */
export async function loadInputs({
  plansPath = PLANS_PATH,
  offersPath = OFFERS_PATH,
  eventsPath = EVENTS_PATH,
  messagesPath = MESSAGES_PATH,
  templatePath = TEMPLATE_PATH,
  manifestPath = MANIFEST_PATH,
  photosDir = PHOTOS_DIR,
  today,
  eventId,
} = {}) {
  const data = {
    messages: await loadJson(messagesPath),
    offers: await loadJson(offersPath),
    plans: await loadJson(plansPath),
    events: await loadJson(eventsPath),
  };
  today ??= zonedDate(Date.now(), (await loadJson(SAVE_PATH)).send_time_zone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error(`today must be YYYY-MM-DD, got ${today}`);
  const eventIndex = eventId === undefined ? 0 : data.events.findIndex((e) => e.id === eventId);
  if (eventIndex === -1 || !data.events[eventIndex]) throw new Error(`no event ${eventId ?? "(first)"} in ${SOURCES.events}`);
  const manifest = await readManifest(manifestPath);
  const photos = Object.fromEntries(
    Object.entries(manifest.slots).map(([slot, file]) => [slot, { file, present: existsSync(join(photosDir, file)) }]),
  );
  const read = (name) => readFile(join(MOCKUPS_DIR, name), "utf8");
  return {
    data,
    today,
    eventIndex,
    manifest,
    photos,
    photosDir,
    site: siteStyle(await readFile(templatePath, "utf8")),
    css: await read("mockups.css"),
    scripts: { sheet: await read("sheet.js"), slideshow: await read("slideshow.js") },
  };
}
