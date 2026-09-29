// `npm run preview:emails`: E1 and E-X exactly as the dev Worker would send them, written for a screen share
// to dist-dev/email-preview/e1.html and ex.html (git-ignored). ⛔ Nothing is sent, stored or requested: the
// HTML parts are rendered by src/worker/messages.js from the data files as they stand (the offer
// placeholders included), a sample code and token, and the dev environment's SITE_URL (so the logo and the
// links point at the dev Worker, as a sent email's would). E1 has the marketing box ticked, so every line
// shows. `npm run build:dev` empties dist-dev/, so run this after it (SPEC-rung5 § 9).
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { devConfig, DIST_DEV, EVENTS_PATH, loadJson, SAVE_PATH } from "../build.mjs";
import { e1, ex } from "../src/worker/messages.js";
import { offerForSave } from "../src/worker/offers.js";
import { zonedDate } from "../src/worker/zoned-time.js";

export const PREVIEW_DIR = join(DIST_DEV, "email-preview");
/** Sample values: a code in the offer-code alphabet and a token no /confirm link will ever accept. */
export const SAMPLE_CODE = "SAMPLE23";
export const SAMPLE_TOKEN = "SAMPLE-TOKEN-FOR-A-PREVIEW-ONLY";
const SAMPLE_TO = "delivered@resend.dev";
const SAMPLE_ZIP = "01602";

/** The two previews, as { name: html }, and the values they were rendered from. */
export async function previews({ nowMs = Date.now() } = {}) {
  const save = await loadJson(SAVE_PATH);
  const [event] = await loadJson(EVENTS_PATH);
  const siteUrl = (await devConfig()).vars.SITE_URL;
  const offer = offerForSave(zonedDate(nowMs, save.send_time_zone)); // what a save made today would get
  const token = SAMPLE_TOKEN;
  const html = {
    "e1.html": e1({ to: SAMPLE_TO, code: SAMPLE_CODE, offer, event, siteUrl, token }).html,
    "ex.html": ex({ to: SAMPLE_TO, zip: SAMPLE_ZIP, siteUrl, token, unconfirmedDays: save.unconfirmed_expansion_days }).html,
  };
  return { html, used: { siteUrl, event: event.name, offer: offer.id, valid_to: offer.valid_to, code: SAMPLE_CODE, zip: SAMPLE_ZIP } };
}

export async function writePreviews(outDir = PREVIEW_DIR, options) {
  const { html, used } = await previews(options);
  await mkdir(outDir, { recursive: true });
  const written = [];
  for (const [name, content] of Object.entries(html)) {
    await writeFile(join(outDir, name), content);
    written.push(join(outDir, name));
  }
  return { written, used };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { written, used } = await writePreviews();
  for (const path of written) console.log(`wrote ${path}`);
  console.log(`rendered from: ${JSON.stringify(used)}`);
}
