// R2-32 (SPEC-rung2 § 12 item 3): fill B's shipped text is pinned BYTE FOR BYTE. In both built files, the text after the
// version line has the SHA-256 below, and the version line declares that same hash. A change to the shipped text is a
// separate amendment, with the live smoke before its paste, and it moves this pin in the same commit.
// ⭐ Moved by SPEC-rung2-progress-and-checkout (rung 2's two faces): from 054e6be87aa3d690814be2b8165b29830d36f1503a5da418d4cc6b2a680bb2b8
// (8945de1's text, the Footer block placed on 2026-09-29, when fill A was retired) to 28ce3983… (7b0d74f), aa773aec…
// (ed422ad, the screen in the top layer), c87cb754… (9e67484, its § 10: the extras pop-up made invisible under the
// screen; H7–H10), 5eb8416e… (4697f19, its § 11: the screen built with createElement), c6775461… (d1f0e36, § 11 as
// amended: no `<` at all in the text; the block live in the store's Footer since 2026-09-29 ~22:04 PDT), c4ceb682… (its
// § 12, the store's own extras key set just before CHECKOUT; the block live in the store's Footer since 2026-09-29 ~23:45
// PDT), adf6024c… (d57a273, its § 15: the key ignores a leading marketing tag, fill B's 10 s counts from the first card,
// the Fit AF logo on the screen and the checkout) and, by § 15.3 as the Advisor ruled after seeing it (the screen's logo
// at the top, on a white plate), 914668de… (ac6c8e8; pasted by the Advisor 2026-10-01), and, by § 17 (the screen shows
// Fit AF's own photographs, carried by the link; the ceiling 15,360), 92ee18db… (d984a7e), and, by § 19 (each order
// line its photograph and name, no plan total), 7eadcbdb… (d6261da; pasted 2026-10-01), and, by § 21 (the plan's
// header and its return link hidden), b323ee55… (d8e5d4e; pasted 2026-10-01), and, by § 23 (one second between
// presses), cbc6d1ec… (6b5f19b; pasted 2026-10-01, live as 5d5fb72), and, by SPEC-rung2-fill-c (fill C: each press
// confirmed by the store's count; fill B's press loop replaced), 1e3802b8… (b5220b0; pasted 2026-10-01, live as
// e85b95a), and, by § 25 (the three-step checkout: a CSS state over the store's own sections on a deep-carted checkout;
// the ceiling 20,480), b65fb47f… (ba9eabc), and, by its § 27 (the steps by the live release's section modifiers),
// 76871ff9… (pasted by the Advisor; the watch's expectedFooter on 2026-10-08), and, by SPEC-snacks-in-the-cart § 3 (snack
// items after the meals, each pressed on its own card; CHECKOUT's count by the element the store displays), ad25f93d…
// (17c5693, pasted by the Advisor), and, by SPEC-rung2-fill-c § 8 (a plan carries the extra meal its selection row
// gives: the plans' allowed totals inlined, the decode taking them), efcbc570… (pasted; the watch's expectedFooter), and,
// by SPEC-ui-and-copy-pass § 2 item 5 (2026-10-25: data/plans.json's read_on 2026-10-25, every price re-read unchanged),
// the hash below: the plans table's comment, "/* data/plans.json, read_on 2026-10-25 */", is the one byte range that
// moved (both trees' built text compared), no code. The block live in the store's Footer is the old text until a new
// one is smoked and pasted (SPEC-ui-and-copy-pass § 2.2 item 4's block, one paste). And by § 2.2 itself (Family's own
// question: its one product takes 5 or 10 meals), the plans table's entry for mpid 35, [1] -> [5,10], the hash below.
// ⭐ The mutant: a copy of the source with ONE byte of fill B's code changed builds a text R2-32 refuses. The copy is
// made in a temporary directory; no file in the repository is edited. The control: an unmutated copy passes.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildStorefront, STOREFRONT_SOURCE, STRUCK_SOURCE } from "../scripts/build-storefront.mjs";

/** Fill C's text SHA-256 since SPEC-rung2-progress-and-checkout § 35 (2026-10-26: Save my offer on the Payment step),
 *  on boston/footer-save-offer; then, since SPEC-rung2-progress-and-checkout § 36 (2026-10-27, boston/footer-struck),
 *  the hand-off's text without § 35's save link, followed by the struck prices' own text (src/storefront/fitaf-struck.js,
 *  data/offers.json's offer inlined). Was 75e18ffa… (§ 35, pasted 2026-10-26, 0eb98fe), 86a83551… (§ 33, 2026-10-26: zero's discount row hidden, the link to customer
 *  service; boston/footer-zero-and-contact, not pasted), 3efc8112… (pasted, c31603d), the release line's
 *  (boston/release-c, 2026-10-25): SPEC-rung2-progress-and-checkout §§ 30–31.2
 *  (the photograph's box, the code zero, a coded link without it, the store's page held still) and SPEC-ui-and-copy-pass
 *  § 2 item 5 (the plans table's comment naming read_on 2026-10-25) and § 2.2 (Family's mpid 35 taking 5 or 10). Was
 *  ef5697aa… (round 2 alone, not pasted), 04e43ac0… (the hand-off alone, not pasted), b68257d5…, a8a5970d…, 0a6e9ef1…,
 *  6d36d4bf… (none pasted), efcbc570… (the extra meal, SPEC-rung2-fill-c § 8; pasted, 8b11e54), ad25f93d… (snacks;
 *  pasted, 17c5693), 76871ff9… (§ 27, pasted), b65fb47f… (§ 25), 1e3802b8… (fill C). */
const SHIPPED_SHA256 = "dd54dfc9deb834c461def83815dd200fdd936e81bf8d1d25cd98c669d3bce2c0";
/** The version line's commit is not part of the text; fixed, so a copy outside the repository builds too. */
const COMMIT = "0000000";
const VERSION_LINE = /^\/\* fitaf-handoff (\S+) sha256:([0-9a-f]{64}) \*\/\n/;
const CONSOLE = "fitaf-handoff.fill-B.console.js";
const FOOTER = "fitaf-handoff.html";
/** One byte of fill B's code: its wait before a press, 50 polls, becomes 51. */
const MUTATION = ["MAX_POLLS = 50", "MAX_POLLS = 51"];

const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");

/** The Footer block's script: what is between `<script>\n` and `</script>\n`. */
function unwrap(footer) {
  assert.ok(footer.startsWith("<script>\n") && footer.endsWith("</script>\n"), "the Footer block is one <script>");
  return footer.slice("<script>\n".length, -"</script>\n".length);
}

/**
 * R2-32's check over the build of `sourcePath`: each file's text hash, recomputed and as its version line declares. Since
 * SPEC-rung2-progress-and-checkout § 36 the shipped text is the hand-off's followed by the struck prices' (the build adds
 * them to its own source only), so a copy is built with them too: the case is about the hand-off's bytes.
 */
async function shippedTextCase(sourcePath) {
  const out = await mkdtemp(join(tmpdir(), "boston-storefront-r2-32-"));
  try {
    await buildStorefront({ outDir: out, sourcePath, struckPath: STRUCK_SOURCE, commit: COMMIT });
    const read = (name) => readFile(join(out, name), "utf8");
    for (const [name, script] of [
      [CONSOLE, await read(CONSOLE)],
      [FOOTER, unwrap(await read(FOOTER))],
    ]) {
      const m = VERSION_LINE.exec(script);
      assert.ok(m, `${name}: a version line`);
      assert.equal(sha256(script.slice(m[0].length)), SHIPPED_SHA256, `${name}: the text's SHA-256`);
      assert.equal(m[2], SHIPPED_SHA256, `${name}: the version line's own`);
    }
  } finally {
    await rm(out, { recursive: true, force: true });
  }
}

/** A copy of the source in a temporary directory, `edit`ed there. */
async function withCopy(edit, fn) {
  const dir = await mkdtemp(join(tmpdir(), "boston-storefront-r2-32-src-"));
  try {
    const copy = join(dir, "fitaf-handoff.js");
    await writeFile(copy, edit(await readFile(STOREFRONT_SOURCE, "utf8")));
    return await fn(copy);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("R2-32: both built files' text SHA-256 (the version line's own) is the release line's, fill C's with rung 2's two faces, the three steps, snacks, the extra meal, the photograph's box, the code zero, read_on 2026-10-25 and Family 5 or 10", async () => {
  await shippedTextCase(STOREFRONT_SOURCE);
});

test("R2-32 mutant: one byte of the source's fill B changed (MAX_POLLS 50 -> 51): R2-32 fails", async () => {
  await withCopy((source) => source, shippedTextCase); // control: an unmutated copy passes
  await withCopy(
    (source) => {
      assert.equal(source.split(MUTATION[0]).length, 2, "the mutated code appears exactly once");
      const mutant = source.replace(...MUTATION);
      const differing = [...source].filter((ch, i) => ch !== mutant[i]).length;
      assert.deepEqual([mutant.length, differing], [source.length, 1], "exactly one byte changed");
      return mutant;
    },
    (copy) =>
      assert.rejects(shippedTextCase(copy), (err) => {
        assert.ok(err instanceof assert.AssertionError, String(err));
        return true;
      }),
  );
});
