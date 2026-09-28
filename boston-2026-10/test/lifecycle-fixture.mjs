// Shared by S14, S15 and the purge cases. Not a test file itself.
import assert from "node:assert/strict";
import { join } from "node:path";
import { lapseInputs } from "../src/worker/scheduled.js";
import { validateSave } from "../src/worker/validate-save.js";
import { insertRows, saveRows } from "../scripts/dummy-saves.mjs";
import { d1Adapter, count, FAR_ZIP, NEAR_ZIP, PAST_OFFER_ID, rows, validSave, WORKER_DIR } from "./worker-harness.mjs";

export const LAPSE_PATH = join(WORKER_DIR, "lapse.js");
export const PURGE_PATH = join(WORKER_DIR, "purge.js");
/** LAPSE_MODULE / PURGE_MODULE may point at a mutant COPY, to show S14 / the purge case failing. */
export const lapseModulePath = () => process.env.LAPSE_MODULE || LAPSE_PATH;
export const purgeModulePath = () => process.env.PURGE_MODULE || PURGE_PATH;

export const NOW_MS = Date.parse("2026-09-27T16:00:00.000Z"); // fixed: the case does not drift with the clock
const DAY = 86_400_000;
const iso = (ms) => new Date(ms).toISOString();

function row(name, body, opts) {
  const r = saveRows(validateSave(validSave({ email: `dummy-${name}@example.com`, ...body })), opts);
  return { name, ...r };
}

/** One save per rule and per near miss. `lapses` names the three rules' victims. */
export function lapseFixture() {
  const past = { offer_id: PAST_OFFER_ID };
  const fixture = [
    // Rule A: an offer save without confirmed marketing, 30 days after its offer's valid_to.
    row("a-sent", {}, { nowMs: NOW_MS, state: "messaged", saveOverrides: { ...past, message_state: "sent" } }),
    row("a-unsent", { consent_marketing: true }, { nowMs: NOW_MS, saveOverrides: past }), // ticked, never confirmed
    row("a-withdrawn", { consent_marketing: true }, {
      nowMs: NOW_MS, state: "confirmed", saveOverrides: { ...past, message_state: "sent" },
      contactOverrides: { confirmed_at: iso(NOW_MS - 90 * DAY), withdrawn_at: iso(NOW_MS - 80 * DAY) },
    }),
    // Kept: confirmed marketing; an offer still live; an exported save (the purge's, not the lapse's).
    row("a-confirmed", { consent_marketing: true }, {
      nowMs: NOW_MS, state: "confirmed", saveOverrides: { ...past, message_state: "sent" },
      contactOverrides: { confirmed_at: iso(NOW_MS - 90 * DAY) },
    }),
    row("a-live", {}, { nowMs: NOW_MS, state: "messaged", saveOverrides: { message_state: "sent" } }),
    row("a-exported", { consent_marketing: true }, { nowMs: NOW_MS, state: "exported", saveOverrides: { ...past, message_state: "sent" } }),
    // Rule B: an expansion save unconfirmed after 7 days (and the near miss at 6).
    row("b-8d", { kind: "expansion", zip: NEAR_ZIP }, { nowMs: NOW_MS - 8 * DAY }),
    row("b-6d", { kind: "expansion", zip: FAR_ZIP }, { nowMs: NOW_MS - 6 * DAY }),
    // Rule C: a confirmed expansion save after expansion_retention_days (365), and the near miss.
    row("c-366d", { kind: "expansion", zip: NEAR_ZIP }, {
      nowMs: NOW_MS - 400 * DAY, state: "confirmed", saveOverrides: { message_state: "sent" },
      contactOverrides: { confirmed_at: iso(NOW_MS - 366 * DAY) },
    }),
    row("c-364d", { kind: "expansion", zip: FAR_ZIP }, {
      nowMs: NOW_MS - 400 * DAY, state: "confirmed", saveOverrides: { message_state: "sent" },
      contactOverrides: { confirmed_at: iso(NOW_MS - 364 * DAY) },
    }),
  ];
  return { fixture, lapses: ["a-sent", "a-unsent", "a-withdrawn", "b-8d", "c-366d"] };
}

const one = async (db, table, id) => (await rows(db, `SELECT * FROM ${table} WHERE save_id = ?`, id))[0] ?? null;

/** S14: each rule deletes the contact and sets `lapsed`; nothing else is touched. */
export async function assertLapseIsCorrect(lapseModule, db) {
  const { fixture, lapses } = lapseFixture();
  await insertRows(db, fixture);
  const before = new Map();
  for (const f of fixture) before.set(f.name, { save: await one(db, "saves", f.saveRow.save_id), contact: await one(db, "save_contacts", f.saveRow.save_id) });

  const inputs = lapseInputs(NOW_MS);
  const result = await lapseModule.lapse(d1Adapter(db), inputs, { dryRun: false });
  assert.deepEqual(result, { dry_run: false, offer: 3, expansion_unconfirmed: 1, expansion_retention: 1 });

  assert.equal(await count(db, "saves"), fixture.length, "every save row remains");
  for (const f of fixture) {
    const id = f.saveRow.save_id;
    const was = before.get(f.name);
    const save = await one(db, "saves", id);
    const contact = await one(db, "save_contacts", id);
    if (lapses.includes(f.name)) {
      assert.ok(save, `a lapsed save row remains (${f.name})`);
      assert.equal(save.state, "lapsed", f.name);
      assert.equal(save.state_at, inputs.now, f.name);
      assert.equal(contact, null, `its contact is deleted (${f.name})`);
      const cancelled = was.save.message_state === "scheduled" ? "cancelled" : was.save.message_state;
      assert.deepEqual(save, { ...was.save, state: "lapsed", state_at: inputs.now, message_state: cancelled }, `only state, state_at, message_state change (${f.name})`);
    } else {
      assert.deepEqual(save, was.save, `untouched: ${f.name}`);
      assert.deepEqual(contact, was.contact, `contact untouched: ${f.name}`);
    }
  }
}

/** The purge's fixture: 3 exported + 3 not, each with a contact. */
export async function seedPurgeFixture(db) {
  const { dummySaves } = await import("../scripts/dummy-saves.mjs");
  const saves = dummySaves(6, { exported: 3, nowMs: NOW_MS });
  await insertRows(db, saves);
  const ids = (s) => saves.filter((x) => x.saveRow.state === s).map((x) => x.saveRow.save_id);
  return { exported: ids("exported"), other: ids("saved") };
}

/** The purge case (carries rung 3's C8): exported saves lose their contact; save rows remain 'purged'. */
export async function assertPurgeIsCorrect(purgeModule, db) {
  const fixture = await seedPurgeFixture(db);
  const otherBefore = await rows(db, "SELECT * FROM save_contacts WHERE save_id IN (?, ?, ?) ORDER BY save_id", ...fixture.other);
  const result = await purgeModule.purge(d1Adapter(db), { dryRun: false, now: iso(NOW_MS) });
  assert.deepEqual(result, { dry_run: false, exported_saves: 3, contacts_to_delete: 3 });
  assert.equal(await count(db, "saves"), 6, "every save row remains");
  for (const id of fixture.exported) {
    assert.equal((await one(db, "saves", id)).state, "purged");
    assert.equal(await one(db, "save_contacts", id), null, "an exported save's contact is deleted");
  }
  for (const id of fixture.other) assert.equal((await one(db, "saves", id)).state, "saved", "a non-exported save is untouched");
  const otherAfter = await rows(db, "SELECT * FROM save_contacts WHERE save_id IN (?, ?, ?) ORDER BY save_id", ...fixture.other);
  assert.deepEqual(otherAfter, otherBefore, "non-exported contacts are byte-identical");
}
