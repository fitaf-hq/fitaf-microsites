// CC-5 (SPEC-chefs-choice § 1, § 4): refusals. A picks file breaking any rule, or carrying any other field, is refused,
// naming the file, before anything is written: a wrong list must never reach a customer. Since SPEC-week-content § 7's
// ruling (no build embeds a week) the build reads no picks file, so the refusal is the CONTENT command's
// (scripts/week-content.mjs: weekContent, then writeContent, as the program runs them), which reads every file in the
// directory, the build's own checks. The rules on the menus
// are the link tool's own (scripts/handoff-link.mjs: qty 1..MAX_QTY, names distinct and no two sharing a key, the
// counts making the plan's count), so each refusal carries the tool's own words. Every case changes ONE thing in the
// fixture, which builds (the control), so each fails for its own reason. § 7 (extended): a meal's `display` missing,
// blank, or not text.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MAX_QTY } from "../scripts/handoff-link.mjs";
import { weekContent, writeContent } from "../scripts/week-content.mjs";
import { FIXTURE, mirror, picksDir } from "./cc-harness.mjs";
import { COLLIDING } from "./r2-harness.mjs";

const FILE = "2026-10-04.json";
const changed = (change) => {
  const week = structuredClone(FIXTURE);
  change(week);
  return week;
};

/** The content of week `week` from a picks directory holding `files` (name: body), made and written as the program
 *  makes and writes it; resolves to the error (or null), and whether the output directory was written. */
async function attempt(name, body, { week = "2026-10-04", more = {} } = {}) {
  const dir = await picksDir({ [name]: body, ...more });
  const outDir = join(await mkdtemp(join(tmpdir(), "boston-cc-05-")), "out");
  try {
    let error = null;
    try {
      await writeContent((await weekContent({ week, picksDir: dir })).files, outDir);
    } catch (err) {
      error = err;
    }
    return { error, wrote: existsSync(outDir) };
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(join(outDir, ".."), { recursive: true, force: true });
  }
}

test("CC-5 (control): the fixture itself makes its content", async () => {
  const { error, wrote } = await attempt(FILE, FIXTURE);
  assert.equal(error, null);
  assert.ok(wrote);
});

const CASES = [
  ["qty not adding up to the count", FILE, changed((w) => (w.menus["7"][0].qty = 1)), /the plan needs 7 meals; the link has 6/],
  ["a repeated name", FILE, changed((w) => (w.menus["7"][1].name = w.menus["7"][0].name)), /named twice/],
  [
    "a repeated name, spaced differently (the key is over the name as the page shows it)",
    FILE,
    changed((w) => (w.menus["7"][1].name = ` ${w.menus["7"][0].name.replace(" ", "   ")} `)),
    /named twice/,
  ],
  [
    "two names sharing a key (a planted collision)",
    FILE,
    changed((w) => {
      w.menus["7"][0].name = COLLIDING[0];
      w.menus["7"][1].name = COLLIDING[1];
    }),
    /share a key/,
  ],
  [
    `qty over MAX_QTY (${MAX_QTY})`,
    FILE,
    changed((w) => (w.menus["14"] = [{ name: "Garden Pesto Penne", display: "Garden Pesto Penne", qty: MAX_QTY + 1 }])),
    new RegExp(`must be 1\\.\\.${MAX_QTY}, got ${MAX_QTY + 1}`),
  ],
  ["qty 0", FILE, changed((w) => (w.menus["7"][0].qty = 0)), /must be 1\.\.21, got 0/],
  ["qty not a whole number", FILE, changed((w) => (w.menus["7"][0].qty = 1.5)), /qty/],
  ["qty written as text", FILE, changed((w) => (w.menus["7"][0].qty = "2")), /qty/],
  ["an unknown field on the file (a price)", FILE, changed((w) => (w.price_cents = 1250)), /unknown field "price_cents"/],
  ["an unknown field on a meal (an internal id)", FILE, changed((w) => (w.menus["7"][0].slug = "x")), /unknown field "slug"/],
  ["a missing field (no menus)", FILE, changed((w) => delete w.menus), /missing field "menus"/],
  ["a meal with no name", FILE, changed((w) => delete w.menus["7"][0].name), /missing field "name"/],
  ["a count the page does not show", FILE, changed((w) => (w.menus["10"] = w.menus["7"])), /count "10"/],
  ["no menu at all", FILE, changed((w) => (w.menus = {})), /no menu/],
  ["a delivery date that is not the file's", FILE, changed((w) => (w.delivery = "2026-10-11")), /delivery "2026-10-11"/],
  ["a file name not a Sunday", "2026-10-05.json", changed((w) => (w.delivery = "2026-10-05")), /not a Sunday/],
  ["a file name not a date", "week-b.json", FIXTURE, /not a Sunday/],
  ["a file that is not JSON", FILE, "{ delivery: 2026-10-04 }", /not JSON/],
];

for (const [label, name, body, reason] of CASES) {
  test(`CC-5: ${label}: refused, naming the file, and nothing written`, async () => {
    const { error, wrote } = await attempt(name, body);
    assert.ok(error, "refused");
    assert.ok(error.message.includes(name), `the message names the file: ${error.message}`);
    assert.match(error.message, reason);
    assert.equal(wrote, false, "nothing is written");
  });
}

// § 7.1 (extended): each meal's `display`, the name the page shows, is required, text, and not blank (blank as the link
// tool reads a name: whitespace collapsed and trimmed). Each refusal names the file AND the meal (its `name`, the key).
// The meal changed is the fixture's tagged one, whose display differs from its name.
const TAGGED = FIXTURE.menus["7"].findIndex((m) => m.name.startsWith("🟠NEW:"));
const DISPLAY_CASES = [
  ["display missing", (meal) => delete meal.display, /missing field "display"/],
  ["display empty", (meal) => (meal.display = ""), /display is blank/],
  ["display blank (whitespace only)", (meal) => (meal.display = " \t\n "), /display is blank/],
  ["display not text (a number)", (meal) => (meal.display = 42), /display must be text, got 42/],
  ["display not text (null)", (meal) => (meal.display = null), /display must be text, got null/],
];

for (const [label, change, reason] of DISPLAY_CASES) {
  test(`CC-5 (§ 7): ${label}: refused, naming the file and the meal, and nothing written`, async () => {
    assert.ok(TAGGED >= 0, "fixture control: menus.7 has a tagged meal");
    const meal = FIXTURE.menus["7"][TAGGED];
    assert.notEqual(meal.display, meal.name, "fixture control: its display is not its name");
    const { error, wrote } = await attempt(FILE, changed((w) => change(w.menus["7"][TAGGED])));
    assert.ok(error, "refused");
    assert.ok(error.message.includes(FILE), `the message names the file: ${error.message}`);
    assert.ok(error.message.includes(meal.name), `the message names the meal: ${error.message}`);
    assert.match(error.message, reason);
    assert.equal(wrote, false, "nothing is written");
  });
}

test("CC-5: a broken file is refused when another week's content is asked for (every file is checked)", async () => {
  const next = structuredClone(FIXTURE);
  next.delivery = "2026-10-11";
  const { error, wrote } = await attempt(FILE, changed((w) => (w.menus["7"][0].qty = 1)), { week: "2026-10-11", more: { "2026-10-11.json": next } });
  assert.ok(error, "refused");
  assert.match(error.message, /2026-10-04\.json: .*the plan needs 7 meals; the link has 6/);
  assert.equal(wrote, false);
});

test("CC-5: with a broken data/picks/ file, `npm run build` builds (it reads no picks) and `npm run content` refuses, naming it", async () => {
  const dir = await mirror();
  const out = join(await mkdtemp(join(tmpdir(), "boston-cc-05-content-")), "out");
  try {
    await mkdir(join(dir, "data", "picks"), { recursive: true });
    await writeFile(join(dir, "data", "picks", FILE), JSON.stringify(changed((w) => (w.menus["7"][0].qty = 1))));
    execFileSync(process.execPath, [join(dir, "build.mjs")], { cwd: dir, stdio: "pipe" });
    assert.ok(existsSync(join(dir, "dist", "index.html")), "the build does not read data/picks/ (SPEC-week-content § 7's ruling)");
    const r = spawnSync(process.execPath, [join(dir, "scripts", "week-content.mjs"), "--week", "2026-10-04", "--out", out], { cwd: dir, encoding: "utf8" });
    assert.notEqual(r.status, 0, "the content command exits non-zero");
    assert.match(r.stderr, /data\/picks\/2026-10-04\.json: .*the plan needs 7 meals; the link has 6/);
    assert.equal(existsSync(out), false, "nothing written");
    // Control: the same mirror with the file mended makes its content.
    await writeFile(join(dir, "data", "picks", FILE), JSON.stringify(FIXTURE));
    execFileSync(process.execPath, [join(dir, "scripts", "week-content.mjs"), "--week", "2026-10-04", "--out", out], { cwd: dir, stdio: "pipe" });
    assert.ok(existsSync(join(out, "week", "picks-data.json")), "control: the mended file makes its content");
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(join(out, ".."), { recursive: true, force: true });
  }
});
