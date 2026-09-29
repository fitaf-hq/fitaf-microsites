// The parts the mock-ups are made of. A part that shows a value carries data-src: where the value comes
// from, as a JSON pointer into its file ("data/plans.json#/individual/0/name"). Each piece's legend is
// built from those same records, so it cannot name a file the piece does not use, or miss one (test P5).
import { money, shownCounts } from "../build.mjs";
import { offerForSave } from "../src/worker/offers.js";
import { LEGEND_SOURCES, LOGO_SOURCE, MANIFEST_SOURCE, SOURCES, TOKENS_SOURCE } from "./inputs.mjs";

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

const at = (file, pointer) => `${file}#${pointer}`;
const LOGO_PATH = "assets/fitaf-logo.png";

/** The lowest price per meal among the cells the page shows (its 3 × 2 grid), with where it is. */
function lowestShownPrice(plans) {
  let low = null;
  plans.individual.forEach((plan, i) => {
    for (const count of shownCounts(plans)) {
      const j = plan.counts.findIndex((c) => c.meals_per_week === count);
      if (j === -1) throw new Error(`plan ${plan.id} has no ${count}-meal cell`);
      const cents = plan.counts[j].price_per_meal_cents;
      if (low === null || cents < low.cents) low = { cents, pointer: `/individual/${i}/counts/${j}/price_per_meal_cents` };
    }
  });
  return low;
}

/** What every piece says, each value with where it comes from. */
export function campaign(inputs) {
  const { data, today, eventIndex } = inputs;
  const message = (key) => ({ value: data.messages[key], src: [at(SOURCES.messages, `/${key}`)] });
  const offers = data.offers.offers;
  const offer = offerForSave(today, offers);
  const event = data.events[eventIndex];
  const eventUrl = [at(SOURCES.events, `/${eventIndex}/url`)];
  const plan = (p, base) => ({
    id: p.id,
    name: { value: p.name, src: [at(SOURCES.plans, `${base}/name`)] },
    promise: { value: p.promise, src: [at(SOURCES.plans, `${base}/promise`)] },
  });
  const low = lowestShownPrice(data.plans);
  return {
    tagline: message("tagline"),
    headline: message("headline"),
    subhead: message("subhead"),
    scan: message("scan_prompt"),
    eventLine: data.messages.event_line.map((value, i) => ({ value, src: [at(SOURCES.messages, `/event_line/${i}`)] })),
    offer: { value: offer.label, src: [at(SOURCES.offers, `/offers/${offers.indexOf(offer)}/label`)], id: offer.id },
    fromPrice: {
      value: data.messages.from_price.replaceAll("{price}", money(low.cents)),
      src: [at(SOURCES.messages, "/from_price"), at(SOURCES.plans, low.pointer)],
    },
    // The address as people type it: the event URL without its scheme or trailing slash.
    address: { value: event.url.replace(/^https?:\/\//, "").replace(/\/$/, ""), src: eventUrl },
    qr: { path: `qr/${event.id}.svg`, url: event.url, src: eventUrl },
    plans: [...data.plans.individual.map((p, i) => plan(p, `/individual/${i}`)), plan(data.plans.family, "/family")],
  };
}

/** One piece's parts. Every part notes its sources; legend() lists them. */
export function makeParts(inputs) {
  const used = new Map();
  const note = (sources, label) => {
    for (const source of sources) {
      const file = source.split("#")[0];
      if (!LEGEND_SOURCES.includes(file)) throw new Error(`${file} is not a known source`);
      if (!used.has(file)) used.set(file, []);
      if (!used.get(file).includes(label)) used.get(file).push(label);
    }
  };
  const cite = (sources) => `data-src="${esc(sources.join(" "))}"`;
  note([TOKENS_SOURCE], "colours and fonts (:root)");

  return {
    /** An element whose whole text is one value. */
    text(tag, cls, value, label) {
      note(value.src, label);
      return `<${tag} class="${cls}" ${cite(value.src)}>${esc(value.value)}</${tag}>`;
    },
    /** A line of values; the separating dot is drawn by the stylesheet, so it is not text. */
    line(tag, cls, values, label) {
      note(values.flatMap((v) => v.src), label);
      return `<${tag} class="parts ${cls}">${values.map((v) => `<span ${cite(v.src)}>${esc(v.value)}</span>`).join("")}</${tag}>`;
    },
    /** The plan names as the page's cards: each with its plan colour as a top bar (an accent, never behind text). */
    planNames(plans, label) {
      note(plans.flatMap((p) => p.name.src), label);
      const items = plans.map((p) => `<li data-accent="${esc(p.id)}" ${cite(p.name.src)}>${esc(p.name.value)}</li>`);
      return `<ul class="plan-names">${items.join("")}</ul>`;
    },
    logo(cls = "") {
      note([LOGO_SOURCE], "logo");
      return `<img class="logo ${cls}" src="${LOGO_PATH}" alt="Fit AF" width="330" height="210" data-src="${LOGO_SOURCE}">`;
    },
    /** The event's QR code: the file build.mjs writeQrCodes writes, never a second generator (test P4). */
    qr(c, cls = "") {
      note(c.qr.src, "QR code (written by build.mjs)");
      return `<img class="qr ${cls}" src="${esc(c.qr.path)}" alt="QR code: ${esc(c.qr.url)}" ${cite(c.qr.src)}>`;
    },
    /** A photo slot: the manifest's file when it is in the photos folder, else a labelled placeholder. */
    photo(slot, cls = "") {
      const photo = inputs.photos[slot];
      if (!photo) throw new Error(`photo slot "${slot}" is not in ${MANIFEST_SOURCE}`);
      const sources = [at(MANIFEST_SOURCE, `/slots/${slot}`)];
      note(sources, `photo: ${slot}`);
      const attrs = `data-slot="${esc(slot)}" ${cite(sources)}`;
      if (photo.present) return `<img class="photo ${cls}" src="photos/${esc(encodeURIComponent(photo.file))}" alt="" ${attrs}>`;
      return (
        `<div class="photo placeholder ${cls}" ${attrs}>` +
        `<p class="slot-label" data-annotation><b>Photo to come</b><span>slot ${esc(slot)}</span><span>${esc(photo.file)}</span></p></div>`
      );
    },
    /**
     * Where each part comes from, one row per source in a fixed order. The viewer sees each source's plain
     * label (mockups/legend.json); its file name and the parts it fills sit behind the switch (.legend-files).
     */
    legend() {
      const words = inputs.legend;
      const rows = LEGEND_SOURCES.filter((file) => used.has(file)).map((file) => {
        const { what, from } = words.sources[file];
        return (
          `<li data-file="${esc(file)}"><span class="legend-plain"><b>${esc(what)}:</b> ${esc(from)}</span>` +
          `<span class="legend-files"><code>${esc(file)}</code><span>${esc(used.get(file).join(" · "))}</span></span></li>`
        );
      });
      return (
        `<section class="legend" data-annotation aria-label="${esc(words.title)}">` +
        `<p class="legend-title">${esc(words.title)}</p>` +
        `<ul class="legend-list">${rows.join("")}</ul>` +
        `<p class="legend-note">${esc(words.note)}</p>` +
        `<p class="legend-note legend-files">${esc(words.files_note)}</p>` +
        `<label class="files-toggle"><input type="checkbox"> ${esc(words.files_toggle)}</label>` +
        `</section>`
      );
    },
  };
}
