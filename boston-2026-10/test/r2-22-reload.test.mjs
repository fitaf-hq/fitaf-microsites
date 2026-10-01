// R2-22 (SPEC-rung2 § 10): a RELOAD of the same link after a first run's meals were pressed adds nothing. The reload is
// a new page load: a fresh window (no once-per-load marker) over a page whose store kept the first run's pending list
// (as the store's own storage does), on the same address — B removes the fragment only just before it presses
// CHECKOUT, so a reload before that carries the link again. A second tab is the same case. The second run stops at
// § 10 item 1 with nothing pressed, and the pending meals stay exactly the first run's.
// ⭐ "counter" is the store's own case (§ 10's build note, and SPEC-rung2-fill-c § 2a's names): a meal already chosen
// shows the store's counter in place of its Add to Cart, so on the reload the link's meals are never all "found" by
// their Add to Cart. The fill must still stop with § 10's line, at once — not wait out its 10 s and stop as "not on this
// page". ("stays", a store that shows no count, was the other shape: fill C cannot fill such a store at all, since it
// waits for each press's count, so it never reaches seven presses there; FC-2e pins what it does instead.)
// The whole case is reloadCase() in r2-harness.mjs, which R2-23 also runs against a mutant.
import test from "node:test";
import { reloadCase, script } from "./r2-harness.mjs";

for (const width of ["bar", "sidebar"]) {
  for (const afterFirstPress of ["counter"]) {
    test(`R2-22a ${width}, ${afterFirstPress}: reloaded after all seven meals, before CHECKOUT — the reload adds nothing`, async () => {
      await reloadCase(await script(), { width, afterFirstPress, after: 7 });
    });

    test(`R2-22b ${width}, ${afterFirstPress}: reloaded in the middle of the fill, after 3 meals — the same`, async () => {
      await reloadCase(await script(), { width, afterFirstPress, after: 3 });
    });
  }
}
