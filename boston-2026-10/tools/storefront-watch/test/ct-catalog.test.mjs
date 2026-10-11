// CT-1–CT-6 (SPEC-storefront-watch § 13): `npm run catalog -- --out <dir> [--mpid 26] [--every <minutes>] [--max
// <minutes>]` saves the page's OWN /catalog/products response, byte for byte, as products.json, with visit.json beside it
// (the page's URL, when it loaded and when the response arrived, the status, the content type, the body's bytes and
// SHA-256, the request's host, path and parameter NAMES, the browser's agent, and each read's counts); with --every, only
// once two consecutive reads carry the same all-meals and snacks names, and then the LAST read.
// In headless Chrome against test/browser-store.mjs on 127.0.0.1, whose order page requests its catalog from the synthetic
// backend reached as `localhost` (another host), its `replies` answering the page's requests in turn and its `served`
// keeping the bytes it sent. The command's clock is scaled (`minuteMs`) so that `--every 2` does not take two minutes.
// The cases decided before any visit (usage, --out) and the edges of the reading run on recorded visits, no browser.
// ⭐ Mutants, each in a MIRROR (a copy of lib/ with the one site file the visit imports, in a temporary directory; no
// file in the repository is edited): the settle rule writing the first read (CT-2), the sk_ check that always passes
// (CT-4), a visit.json that keeps the query string (CT-1); and the unmutated mirror as their control.
// Never the live store. The planted values are assembled at run time: no key-shaped literal is committed (as W27's).
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { cp, mkdir, mkdtemp, readdir, readFile, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { chromePath } from "../lib/browser.mjs";
import { CATALOG_PATH, MEALS, startBackend, startStore } from "./browser-store.mjs";

const LIB = new URL("../lib/", import.meta.url);
/** The package, the site it sits in, and the repository's root (the checkout this file is in). */
const TOOL = fileURLToPath(new URL("../", import.meta.url));
const SITE = join(TOOL, "..", "..");
const REPO = join(SITE, "..");
/** A minute of the command's clock in the tests: `--every 2` is 10 ms, so the reads run back to back. */
const MINUTE_MS = 5;

const chrome = (() => {
  try {
    return chromePath();
  } catch {
    return null;
  }
})();
const skip = chrome ? false : "no Chrome found (set CHROME_PATH)";

const planted = () => `v${randomBytes(8).toString("hex")}`;
/** The request's parameters, as the live page's carries them (names from the 2026-10-09 capture), every value planted. */
const PARAMS = {
  paginate: planted(),
  meal_plan_id: planted(),
  limit: planted(),
  store_api_key: ["sk", "live", randomBytes(16).toString("hex")].join("_"),
  tenant: planted(),
  device_type: planted(),
};
/** A key-shaped value for a body that must be refused, assembled at run time. */
const BODY_KEY = ["sk", "live", randomBytes(12).toString("hex")].join("_");

const SNACKS = ["Protein Brownie", "Golden Oreo Protein Sand"];
const MENU_B = ["Lemon Herb Chicken", MEALS[3], "Pork Carnitas Bowl", "Teriyaki Salmon", MEALS[7], "Mediterranean Quinoa", "BBQ Brisket", "Garlic Shrimp Pasta", "Thai Basil Beef", "Jalapeño Turkey Burger"];
const SNACKS_B = [...SNACKS, "Peanut Butter Bites"];
const MENU_C = ["Cajun Chicken Pasta", "Steak Fajita Bowl", "Honey Garlic Pork"];

/**
 * A catalog body shaped as the live one (`{status, message, data, errors}`), each product `{ name, categories: [{ slug }],
 * effective_price }`, written so that a JSON round trip would change its bytes (its spacing, `12.50`, an escaped `\/`), and
 * one product in `upsells` that neither count includes. `note` makes two bodies of the same names differ in bytes.
 */
function catalogText({ menu, snacks, note = "" }) {
  const product = (slug) => (name) => `{"name": ${JSON.stringify(name)}, "categories": [ {"slug":"${slug}"} ], "effective_price": 12.50}`;
  const data = [...menu.map(product("all-meals")), ...snacks.map(product("snacks")), product("upsells")("Extra Rice")];
  return `{"status":true,  "message":"ok${note} \\/ synthetic",\n "data":[${data.join(",\n  ")}],"errors":null}\n`;
}
const ok = (body) => ({ status: 200, contentType: "application/json", body });

let store;
let backend;
before(async () => {
  if (skip) return;
  store = await startStore();
  backend = await startBackend();
});
after(async () => {
  await store?.close();
  await backend?.close();
});

/** A fresh directory outside the repository for `--out`, removed afterwards. */
async function withOut(fn) {
  const dir = await mkdtemp(join(tmpdir(), "storefront-watch-ct-out-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** The command of `lib` against the synthetic store, its visit `lib`'s own in Chrome; what it printed and what was served. */
async function runCatalog(lib, argv, { replies = null, catalog = true, cwd } = {}) {
  const { catalogCommand } = await import(new URL("catalog-command.mjs", lib).href);
  const { ordinaryVisit } = await import(new URL("visit.mjs", lib).href);
  backend.set({ replies });
  store.set({ catalog: catalog ? backend.url(PARAMS) : null });
  const requests = backend.requests.length;
  const served = backend.served.length;
  const out = [];
  const err = [];
  const visits = [];
  const code = await catalogCommand(argv, {
    origin: store.origin,
    visit: (opts) => {
      visits.push(opts);
      return ordinaryVisit({ executablePath: chrome, renderMs: 10_000, settleMs: 300, ...opts });
    },
    out: (l) => out.push(l),
    err: (l) => err.push(l),
    minuteMs: MINUTE_MS,
    ...(cwd ? { cwd } : {}),
  });
  return { code, out, err, visits, requests: backend.requests.slice(requests), served: backend.served.slice(served) };
}

/** No planted parameter value (nor the key's own random part) in `text`. */
function noValues(text, where) {
  for (const [name, value] of Object.entries(PARAMS)) assert.ok(!text.includes(value), `${where} carries ${name}'s value`);
  assert.ok(!text.includes(PARAMS.store_api_key.split("_").at(-1)), `${where} carries the key's characters`);
}

const ISO_UTC = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const listing = async (dir) => (await readdir(dir)).sort();

// ── CT-1: one read, products.json byte for byte, visit.json with no parameter value ───────────────────────────────────

async function ct1(lib) {
  await withOut(async (dir) => {
    const body = catalogText({ menu: MEALS, snacks: SNACKS });
    const r = await runCatalog(lib, ["--out", dir], { replies: [ok(body)] });
    assert.equal(r.code, 0, r.err.join("\n"));
    assert.deepEqual(r.visits, [{ page: `${store.origin}/order?mpid=26`, capture: true }], "one visit of the plan page, mpid 26 by default");
    assert.equal(r.served.length, 1, "one read");
    assert.deepEqual(await listing(dir), ["products.json", "visit.json"]);
    const saved = await readFile(join(dir, "products.json"));
    assert.ok(saved.equals(r.served[0]), "products.json is the body the backend sent, byte for byte");
    assert.ok(saved.equals(Buffer.from(body)), "and that is the text the test wrote (a JSON round trip would have changed it)");

    const text = await readFile(join(dir, "visit.json"), "utf8");
    noValues(text, "visit.json");
    noValues([...r.out, ...r.err].join("\n"), "the printed lines");
    const v = JSON.parse(text);
    assert.deepEqual(Object.keys(v).sort(), ["bytes", "contentType", "loadedAt", "page", "reads", "receivedAt", "request", "sha256", "status", "userAgent"]);
    assert.equal(v.page, `${store.origin}/order?mpid=26`);
    assert.match(v.loadedAt, ISO_UTC);
    assert.match(v.receivedAt, ISO_UTC);
    assert.equal(v.status, 200);
    assert.equal(v.contentType, "application/json");
    assert.equal(v.bytes, saved.length);
    assert.equal(v.sha256, sha256(saved));
    assert.deepEqual(v.request, { at: `${new URL(backend.origin).host}${CATALOG_PATH}`, params: Object.keys(PARAMS) }, "host, path and the parameters' names only");
    assert.match(v.userAgent, /HeadlessChrome/);
    assert.deepEqual(v.reads, [{ loadedAt: v.loadedAt, allMeals: MEALS.length, snacks: SNACKS.length }]);
    assert.ok(r.out.some((l) => l.includes(`${MEALS.length} all-meals, ${SNACKS.length} snacks`)), r.out.join("\n"));
  });
}

test("CT-1: one read: products.json byte for byte as the backend served it; visit.json carries no parameter value", { skip }, () => ct1(LIB));

// ── CT-2: --every, a store serving A, then B, then B (the same names, other bytes): B's second read written ──────────

/** A, B, then B again with its names in another order and other bytes: the reads agree as sets of names. */
const SETTLING = () => [
  ok(catalogText({ menu: MEALS, snacks: SNACKS })),
  ok(catalogText({ menu: MENU_B, snacks: SNACKS_B, note: " (B, first)" })),
  ok(catalogText({ menu: [...MENU_B].reverse(), snacks: [...SNACKS_B].reverse(), note: " (B, second)" })),
];

async function ct2(lib) {
  await withOut(async (dir) => {
    const r = await runCatalog(lib, ["--out", dir, "--every", "2", "--max", "20"], { replies: SETTLING() });
    assert.equal(r.code, 0, r.err.join("\n"));
    assert.equal(r.served.length, 3, "settled at the third read; no fourth");
    assert.equal(r.visits.length, 3);
    assert.ok(!r.served[1].equals(r.served[2]), "the control: the two agreeing reads differ in bytes");
    const saved = await readFile(join(dir, "products.json"));
    assert.ok(saved.equals(r.served[2]), "the LAST read is written, byte for byte");
    const v = JSON.parse(await readFile(join(dir, "visit.json"), "utf8"));
    assert.equal(v.sha256, sha256(r.served[2]));
    assert.deepEqual(v.reads.map(({ allMeals, snacks }) => [allMeals, snacks]), [[MEALS.length, SNACKS.length], [MENU_B.length, SNACKS_B.length], [MENU_B.length, SNACKS_B.length]]);
    for (const read of v.reads) assert.match(read.loadedAt, ISO_UTC);
    assert.equal(v.loadedAt, v.reads[2].loadedAt, "the sidecar's times are the written read's");
    const printed = r.out.join("\n");
    for (const [n, counts] of [[1, `${MEALS.length} all-meals, ${SNACKS.length} snacks`], [2, `${MENU_B.length} all-meals, ${SNACKS_B.length} snacks`], [3, `${MENU_B.length} all-meals, ${SNACKS_B.length} snacks`]]) {
      assert.ok(r.out.some((l) => l.startsWith(`read ${n} `) && l.includes(counts)), `read ${n}'s counts printed:\n${printed}`);
    }
  });
}

test("CT-2: --every: A, then B, then B (same names, other order, other bytes): the third read is written, all three counted", { skip }, () => ct2(LIB));

// ── CT-3: A, B, C until --max: nothing written, non-zero ──────────────────────────────────────────────────────────────

test("CT-3: --every 2 --max 4: A, B, C (three reads, none agreeing): nothing written, non-zero, each read's counts printed", { skip }, async () => {
  await withOut(async (dir) => {
    // The last reply repeats: a fourth read would agree with the third and be written, so this also pins --max's bound.
    const replies = [ok(catalogText({ menu: MEALS, snacks: SNACKS })), ok(catalogText({ menu: MENU_B, snacks: SNACKS_B })), ok(catalogText({ menu: MENU_C, snacks: [] }))];
    const r = await runCatalog(LIB, ["--out", dir, "--every", "2", "--max", "4"], { replies });
    assert.equal(r.code, 1, r.err.join("\n"));
    assert.equal(r.served.length, 3, "reads at 0, 2 and 4 minutes, and no other");
    assert.deepEqual(await listing(dir), [], "nothing written");
    const said = r.err.join("\n");
    assert.match(said, /nothing written/i);
    for (const counts of [`${MEALS.length} all-meals, ${SNACKS.length} snacks`, `${MENU_B.length} all-meals, ${SNACKS_B.length} snacks`, `${MENU_C.length} all-meals, 0 snacks`]) {
      assert.ok(said.includes(counts), `the refusal prints ${counts}:\n${said}`);
    }
  });
});

// ── CT-4: each refusal of item 4, nothing written ─────────────────────────────────────────────────────────────────────

/** One read of `replies` refused: non-zero, nothing written, the reason said, no planted value printed. */
async function refused(lib, replies, reason, { catalog = true, argv = [] } = {}) {
  return withOut(async (dir) => {
    const r = await runCatalog(lib, ["--out", dir, ...argv], { replies, catalog });
    assert.notEqual(r.code, 0, `refused (${reason}): ${r.out.join("\n")}`);
    assert.deepEqual(await listing(dir), [], "nothing written");
    assert.match(r.err.join("\n"), reason);
    noValues([...r.out, ...r.err].join("\n"), "the printed lines");
    return r;
  });
}

/** A body holding the storefront's key's shape: as a meal's name, and JSON-escaped (`sk\u005f…`, `_` escaped). */
const keyBodies = () => [
  ok(catalogText({ menu: [...MEALS.slice(0, 3), `Tuna Melt ${BODY_KEY}`], snacks: SNACKS })),
  ok(catalogText({ menu: MEALS, snacks: SNACKS }).replace('"errors":null', `"errors":"${BODY_KEY.replace("sk_", "sk\\u005f")}"`)),
];

async function ct4Key(lib) {
  for (const reply of keyBodies()) {
    const r = await refused(lib, [reply], /sk_/);
    assert.equal(r.code, 1);
    const printed = [...r.out, ...r.err].join("\n");
    assert.ok(!printed.includes(BODY_KEY.split("_").at(-1)), "the refusal never quotes the key");
  }
  // The rule's edge: `sk_` followed by neither a letter nor a digit is not the key's shape, and is written.
  await withOut(async (dir) => {
    const body = catalogText({ menu: MEALS, snacks: SNACKS }).replace('"errors":null', '"errors":"sk_ -"');
    const r = await runCatalog(lib, ["--out", dir], { replies: [ok(body)] });
    assert.equal(r.code, 0, r.err.join("\n"));
    assert.ok((await readFile(join(dir, "products.json"))).equals(Buffer.from(body)));
  });
}

test("CT-4: a body holding sk_ and a letter or digit (as a name, or JSON-escaped) is refused, nothing written, the key never printed", { skip }, () => ct4Key(LIB));

test("CT-4: no catalog response within the visit's deadline; a status other than 200; a body not JSON with a data array", { skip }, async () => {
  const r0 = await refused(LIB, null, /no catalog response/, { catalog: false });
  assert.equal(r0.requests.length, 0, "the page asked nothing of the backend");
  await refused(LIB, [{ status: 503, contentType: "application/json", body: catalogText({ menu: MEALS, snacks: SNACKS }) }], /HTTP 503/);
  await refused(LIB, [{ status: 200, contentType: "text/html", body: "<html><body>Down for maintenance</body></html>" }], /not JSON/);
  await refused(LIB, [ok('{"status":false,"message":"none","data":null}')], /no data array/);
  await refused(LIB, [ok("[1, 2, 3]")], /no data array/);
});

test("CT-4 with --every: a refused read agrees with nothing and the reads go on; a key in a body stops them at once", { skip }, async () => {
  await withOut(async (dir) => {
    const [, b1, b2] = SETTLING();
    const r = await runCatalog(LIB, ["--out", dir, "--every", "2", "--max", "20"], { replies: [{ ...b1, status: 503 }, b1, b2] });
    assert.equal(r.code, 0, r.err.join("\n"));
    assert.equal(r.served.length, 3);
    assert.ok((await readFile(join(dir, "products.json"))).equals(r.served[2]));
    const v = JSON.parse(await readFile(join(dir, "visit.json"), "utf8"));
    assert.match(v.reads[0].refused, /HTTP 503/);
    assert.equal(v.reads[0].allMeals, undefined);
  });
  const r = await refused(LIB, [ok(catalogText({ menu: MEALS, snacks: SNACKS })), keyBodies()[0]], /sk_/, { argv: ["--every", "2", "--max", "20"] });
  assert.equal(r.code, 1);
  assert.equal(r.served.length, 2, "stopped at the read that held the key: no third read");
});

// ── CT-5: the backend's host requested by the page, never by the command's code ──────────────────────────────────────

test("CT-5: the backend is requested by the page (Chrome's agent, the store page's Origin), never by the command's code", { skip }, async () => {
  const fetches = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (...args) => {
    fetches.push(String(args[0]));
    return realFetch(...args);
  };
  let r;
  try {
    r = await withOut((dir) => runCatalog(LIB, ["--out", dir], { replies: [ok(catalogText({ menu: MEALS, snacks: SNACKS }))] }));
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(r.code, 0, r.err.join("\n"));
  assert.deepEqual(fetches, [], "no fetch of the command's own");
  assert.equal(r.requests.length, 1, JSON.stringify(r.requests));
  const [req] = r.requests;
  assert.equal(new URL(req.url, "http://localhost").pathname, CATALOG_PATH);
  assert.equal(req.method, "GET");
  assert.match(req.userAgent, /HeadlessChrome/);
  assert.ok(!req.userAgent.includes("fitaf-storefront-watch"), "not the watch's own agent");
  assert.equal(req.origin, store.origin, "sent by the store's page");
});

// ── CT-6 and the cases decided before any visit: no browser; a visit that is never to be made ────────────────────────

/** The command with a visit that records its calls and answers `outcome` (or throws it when it is an Error). */
async function command(argv, { outcome = null, cwd } = {}) {
  const { catalogCommand } = await import(new URL("catalog-command.mjs", LIB).href);
  const out = [];
  const err = [];
  const visits = [];
  const code = await catalogCommand(argv, {
    origin: "http://127.0.0.1:9",
    visit: async (opts) => {
      visits.push(opts);
      if (outcome instanceof Error) throw outcome;
      if (!outcome) throw new Error("this case must not visit");
      return outcome;
    },
    out: (l) => out.push(l),
    err: (l) => err.push(l),
    minuteMs: MINUTE_MS,
    ...(cwd ? { cwd } : {}),
  });
  return { code, out, err, visits };
}

/** What lib/visit.mjs returns for `capture: true`: the page's catalog response(s) as received, bodies untouched. */
function recorded(bodies, { page = "http://127.0.0.1:9/order?mpid=26" } = {}) {
  return {
    rendered: true,
    cards: 9,
    scripts: [],
    console: [],
    errors: [],
    capture: {
      page,
      loadedAt: "2026-10-16T16:00:00.000Z",
      userAgent: "Mozilla/5.0 HeadlessChrome/0",
      responses: bodies.map((body) => ({
        request: { at: "backend.synthetic/api/v1/tenant/catalog/products", params: ["paginate", "store_api_key"] },
        receivedAt: "2026-10-16T16:00:01.000Z",
        status: 200,
        contentType: "application/json",
        body: Buffer.from(body),
      })),
    },
  };
}

test("CT-6: an --out inside the repository is refused (absolute, relative, through a symlink), before any visit, nothing written", async () => {
  const inside = join(SITE, "storefront");
  const before = await listing(inside);
  for (const [argv, cwd] of [[["--out", inside]], [["--out", "storefront"], SITE], [["--out", "."], REPO]]) {
    const r = await command(argv, { cwd });
    assert.equal(r.code, 2, `${argv.join(" ")}: ${r.out.join("\n")}`);
    assert.deepEqual(r.visits, [], "refused before any visit");
    assert.match(r.err.join("\n"), /inside this repository/);
  }
  await withOut(async (dir) => {
    await symlink(inside, join(dir, "into-the-repo"), "dir");
    const r = await command(["--out", join(dir, "into-the-repo")]);
    assert.equal(r.code, 2);
    assert.deepEqual(r.visits, []);
    assert.match(r.err.join("\n"), /inside this repository/);
  });
  assert.deepEqual(await listing(inside), before, "nothing written inside the repository");
  // The control: the same command with an --out outside the repository visits and writes.
  await withOut(async (dir) => {
    const r = await command(["--out", dir], { outcome: recorded([catalogText({ menu: MEALS, snacks: SNACKS })]) });
    assert.equal(r.code, 0, r.err.join("\n"));
    assert.deepEqual(await listing(dir), ["products.json", "visit.json"]);
  });
});

test("CT-6 through bin/catalog.mjs (npm run catalog's file): an --out inside the repository refused, exit 2, nothing written", async () => {
  const inside = join(SITE, "storefront");
  const before = await listing(inside);
  // A Chrome that does not exist: were the refusal ever to fail, the command could not reach any store.
  const env = { ...process.env, CHROME_PATH: join(tmpdir(), "storefront-watch-ct-no-chrome", "chrome") };
  const run = promisify(execFile);
  const r = await run(process.execPath, [join(TOOL, "bin", "catalog.mjs"), "--out", inside], { env }).then(
    () => ({ code: 0 }),
    (e) => e,
  );
  assert.equal(r.code, 2, `${r.stdout ?? ""}${r.stderr ?? ""}`);
  assert.match(r.stderr, /inside this repository/);
  assert.deepEqual(await listing(inside), before);
  const scripts = JSON.parse(await readFile(join(TOOL, "package.json"), "utf8")).scripts;
  assert.equal(scripts.catalog, "node bin/catalog.mjs");
});

test("CT-4: --out absent, not a directory, or already holding products.json or visit.json: refused before any visit, nothing written", async () => {
  await withOut(async (dir) => {
    const absent = join(dir, "absent");
    let r = await command(["--out", absent]);
    assert.equal(r.code, 2);
    assert.deepEqual(r.visits, []);
    assert.match(r.err.join("\n"), /does not exist/);
    assert.deepEqual(await listing(dir), []);

    await writeFile(join(dir, "a-file"), "x");
    r = await command(["--out", join(dir, "a-file")]);
    assert.equal(r.code, 2);
    assert.match(r.err.join("\n"), /not a directory/);

    for (const name of ["products.json", "visit.json"]) {
      const held = join(dir, `holds-${name}`);
      await mkdir(held);
      await writeFile(join(held, name), "kept");
      r = await command(["--out", held], { outcome: recorded([catalogText({ menu: MEALS, snacks: SNACKS })]) });
      assert.equal(r.code, 2, name);
      assert.deepEqual(r.visits, [], "refused before any visit");
      assert.match(r.err.join("\n"), new RegExp(`already holds ${name.replace(".", "\\.")}`));
      assert.deepEqual(await listing(held), [name], "nothing added");
      assert.equal(await readFile(join(held, name), "utf8"), "kept", "nothing overwritten");
    }
  });
});

test("usage: --out required; --every 2 or more; --max only with --every and not below it; --mpid a whole number; nothing else", async () => {
  await withOut(async (dir) => {
    for (const argv of [
      [],
      ["--every", "2"],
      ["--out", dir, "--every", "1"],
      ["--out", dir, "--every", "soon"],
      ["--out", dir, "--max", "30"],
      ["--out", dir, "--every", "10", "--max", "5"],
      ["--out", dir, "--mpid", "0"],
      ["--out", dir, "--mpid", "2.5"],
      ["--out", dir, "--origin", "http://127.0.0.1:1"],
      ["--out", dir, "extra"],
    ]) {
      const r = await command(argv);
      assert.equal(r.code, 2, argv.join(" "));
      assert.deepEqual(r.visits, [], `${argv.join(" ")}: no visit`);
      assert.ok(r.err.some((l) => l.startsWith("usage: npm run catalog")), `${argv.join(" ")}:\n${r.err.join("\n")}`);
    }
    assert.deepEqual(await listing(dir), []);
  });
});

test("--mpid 21 visits /order?mpid=21; the visit failing is the command's failure (exit 2), nothing written", async () => {
  await withOut(async (dir) => {
    const r = await command(["--out", dir, "--mpid", "21"], { outcome: recorded([catalogText({ menu: MEALS, snacks: SNACKS })]) });
    assert.equal(r.code, 0, r.err.join("\n"));
    assert.deepEqual(r.visits, [{ page: "http://127.0.0.1:9/order?mpid=21", capture: true }]);
  });
  await withOut(async (dir) => {
    const r = await command(["--out", dir], { outcome: new Error("no Chrome found") });
    assert.equal(r.code, 2);
    assert.match(r.err.join("\n"), /no Chrome found/);
    assert.deepEqual(await listing(dir), []);
  });
});

test("two catalog responses in one visit (a paged catalog, or asked twice): refused, one file holds one response", async () => {
  await withOut(async (dir) => {
    const body = catalogText({ menu: MEALS, snacks: SNACKS });
    const r = await command(["--out", dir], { outcome: recorded([body, body]) });
    assert.equal(r.code, 1);
    assert.match(r.err.join("\n"), /2 catalog responses/);
    assert.deepEqual(await listing(dir), []);
  });
});

// ── ⭐ Mutants, each in a mirror; no file in the repository is edited ─────────────────────────────────────────────────

/**
 * A mirror of the package's lib/ in a temporary directory, laid out as in the repository so that lib/visit.mjs finds the
 * one site file it imports (src/storefront/meal-key.js, with the site's package.json for its module type) and puppeteer-
 * core (the package's node_modules, linked, never copied or written); `file`'s `check` replaced by `replacement`.
 */
async function mirror(file, check, replacement, fn) {
  const dir = await mkdtemp(join(tmpdir(), "storefront-watch-ct-mirror-"));
  const tool = join(dir, "boston-2026-10", "tools", "storefront-watch");
  const modules = join(tool, "node_modules");
  try {
    await cp(fileURLToPath(LIB), join(tool, "lib"), { recursive: true });
    await symlink(join(TOOL, "node_modules"), modules, "dir");
    await mkdir(join(dir, "boston-2026-10", "src", "storefront"), { recursive: true });
    await cp(join(SITE, "src", "storefront", "meal-key.js"), join(dir, "boston-2026-10", "src", "storefront", "meal-key.js"));
    await cp(join(SITE, "package.json"), join(dir, "boston-2026-10", "package.json"));
    const source = await readFile(join(tool, "lib", file), "utf8");
    assert.equal(source.split(check).length, 2, `${file}: the check appears exactly once`);
    await writeFile(join(tool, "lib", file), source.replace(check, replacement));
    await fn(pathToFileURL(join(tool, "lib", "/")));
  } finally {
    await unlink(modules).catch(() => {});
    await rm(dir, { recursive: true, force: true });
  }
}

const caught = (err) => {
  assert.ok(err instanceof assert.AssertionError, String(err?.stack ?? err));
  return true;
};

/** The settle rule's choice of the read it writes (lib/catalog-command.mjs). */
const WRITES_LAST = "const written = reads.at(-1);";

test("mutant: the settle rule writing the run's first read fails CT-2", { skip }, async () => {
  await mirror("catalog-command.mjs", WRITES_LAST, "const written = reads[0];", (lib) => assert.rejects(ct2(lib), caught));
});

test("mutant: the settle rule writing the first of the two agreeing reads fails CT-2", { skip }, async () => {
  await mirror("catalog-command.mjs", WRITES_LAST, "const written = reads.at(-2);", (lib) => assert.rejects(ct2(lib), caught));
});

test("mutant: the sk_ check that always passes fails CT-4", { skip }, async () => {
  await mirror("catalog-command.mjs", "const holdsKey = (text) => KEY.test(text);", "const holdsKey = (text) => false;", (lib) => assert.rejects(ct4Key(lib), caught));
});

test("mutant: a visit.json that keeps the query string fails CT-1", { skip }, async () => {
  await mirror("catalog-response.mjs", "params: [...u.searchParams.keys()] }", "params: [...u.searchParams.keys()], query: u.search }", (lib) =>
    assert.rejects(ct1(lib), caught),
  );
});

test("mutant control: the unmutated mirror passes CT-1, CT-2 and CT-4's key case (the mirror itself is sound)", { skip }, async () => {
  await mirror("catalog-command.mjs", WRITES_LAST, WRITES_LAST, async (lib) => {
    await ct1(lib);
    await ct2(lib);
    await ct4Key(lib);
  });
});
