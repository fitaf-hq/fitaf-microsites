// S23 (SPEC-rung4 § 2a): save-data carries each offer's id, label, applies_to, valid_from and valid_to, and
// no code of any kind — never shared_code, never code_mode.
import test from "node:test";
import assert from "node:assert/strict";
import offersFile from "../data/offers.json" with { type: "json" };
import { devPage } from "./dev-page.mjs";
import { FIXTURE_OFFERS } from "./offer-box-fixture.mjs";

const OFFER_FIELDS = ["id", "label", "applies_to", "valid_from", "valid_to"];
const saveData = (html) => JSON.parse(/<script type="application\/json" id="save-data">([\s\S]*?)<\/script>/.exec(html)[1]);
/** Every key at every depth of a JSON value. */
const keysDeep = (v) =>
  v && typeof v === "object" ? Object.entries(v).flatMap(([k, x]) => [...(Array.isArray(v) ? [] : [k]), ...keysDeep(x)]) : [];

for (const [name, file] of [
  ["data/offers.json", offersFile],
  ["the S21 fixture", FIXTURE_OFFERS],
]) {
  test(`S23: save-data in the built page (${name}) — the five fields per offer, no code of any kind`, async () => {
    assert.ok(file.offers.every((o) => "code_mode" in o), `control: ${name} has a code_mode on every offer`);
    const shared = file.offers.filter((o) => o.shared_code).map((o) => o.shared_code);
    assert.ok(shared.length > 0, `control: ${name} has a shared code to leak`);

    const html = await devPage({ offers: file });
    const data = saveData(html);
    assert.deepEqual(
      data.offers,
      file.offers.map((o) => Object.fromEntries(OFFER_FIELDS.map((k) => [k, o[k]]))),
      "each offer's id, label, applies_to, valid_from, valid_to — nothing more, in the file's order",
    );
    assert.deepEqual(keysDeep(data).filter((k) => /code/i.test(k)), [], "no key naming a code, anywhere in save-data");
    assert.doesNotMatch(html, /shared_code|code_mode/, "neither field name is anywhere in the page");
    for (const code of shared) assert.ok(!html.includes(code), `the shared code ${code} is nowhere in the page`);
  });
}
