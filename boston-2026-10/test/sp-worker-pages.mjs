// Shared by SP15 (SPEC-save-offer-production.md § 10.3: the Worker's pages in the site's look). Not a test file itself.
// Every page src/worker/pages.js page() draws, rendered by the Worker's own handlers over a FAKE database (each lookup
// answered by its SQL), from the package at `root`: this one, or another commit's tree extracted by `git archive`, so the
// words of the two can be compared. The dates are fixed, so nothing here depends on the day a case runs.
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, realpath, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../build.mjs";

/** A /confirm token's shape (TOKEN_RE): 43 base64url characters. Invented; no message carries it. */
const TOKEN = "SP15-confirm-token-0000000000000000000000000".slice(0, 43);
const LIVE = { today: "2026-10-25", now: "2026-10-25T13:00:00.000Z" };
const ENDED = { today: "2026-10-30", now: "2026-10-30T13:00:00.000Z" };

/** A D1 stand-in: `first()` answers by the statement's SQL; writes succeed and change nothing anyone reads. */
function fakeDb(answer) {
  const statement = (sql) => ({
    bind: () => statement(sql),
    first: async () => answer(sql),
    run: async () => ({ meta: { changes: 1 } }),
    all: async () => ({ results: [] }),
  });
  return { prepare: statement, batch: async () => [] };
}

const offerRow = (offerId) => (sql) =>
  /FROM saves WHERE offer_code/.test(sql)
    ? { save_id: "sp15", event_id: "boston", offer_id: offerId, ring: "in" }
    : /kind = 'reissue'/.test(sql)
      ? { offer_code: "SP15RE23" }
      : null;
const confirmRow = (kind) => () => ({ save_id: "sp15", kind, offer_id: "event-boston-2026-10-placeholder", offer_code: "SP15CODE", state: "messaged", zip: "03101" });

const text = async (response) => ({ status: response.status, html: await response.text() });
const post = (action) =>
  new Request("http://localhost/confirm/x", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: `action=${action}` });

/**
 * Every Worker page, as { name: { status, html } }, from the package at `root`: the saved offer (ORIGINAL, the Boston
 * offer live), the ended offer (WELCOME_BACK), an unknown code (CURRENT), the confirmation (an offer's and an expansion's
 * LANDING), CONFIRMED, DECLINED, GONE and TOO_MANY.
 */
export async function workerPages(root = ROOT) {
  const mod = (file) => import(pathToFileURL(join(root, "src", "worker", file)).href);
  const { handleOffer } = await mod("redeem.js");
  const { handleConfirm, GONE } = await mod("confirm.js");
  const { TOO_MANY } = await mod("pages.js");
  const offer = (row, code, at) => handleOffer({ DB: fakeDb(row) }, code, at).then(text);
  const confirm = (kind, request) => handleConfirm(request, { DB: fakeDb(confirmRow(kind)) }, TOKEN, LIVE).then(text);
  return {
    original: await offer(offerRow("event-boston-2026-10-placeholder"), "SP15CODE", LIVE),
    welcome_back: await offer(offerRow("event-past-placeholder"), "SP15CODE", ENDED),
    current: await offer(() => null, "ZZZZ9999", LIVE),
    landing_offer: await confirm("offer", new Request("http://localhost/confirm/x")),
    landing_expansion: await confirm("expansion", new Request("http://localhost/confirm/x")),
    confirmed: await confirm("offer", post("yes")),
    declined: await confirm("offer", post("no")),
    gone: { status: 404, html: GONE },
    too_many: { status: 429, html: TOO_MANY },
  };
}

/** A page's head without its <title>, and its <main> (or body) markup. */
export const headOf = (html) => /<head>([\s\S]*?)<\/head>/.exec(html)[1].replace(/<title>[^<]*<\/title>\n?/, "");

/** `commit`'s package, extracted by `git archive` into a temporary directory (read only), node_modules linked in. */
export async function packageAt(commit) {
  const scratch = await realpath(await mkdtemp(join(tmpdir(), "boston-sp15-base-")));
  const run = (cmd, args, input) => {
    const r = spawnSync(cmd, args, { input, maxBuffer: 256 * 1024 * 1024 });
    if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}: exit ${r.status}: ${r.stderr}`);
    return r.stdout;
  };
  const top = run("git", ["-C", ROOT, "rev-parse", "--show-toplevel"]).toString("utf8").trim();
  const prefix = relative(top, ROOT);
  await mkdir(join(scratch, "base"), { recursive: true });
  run("tar", ["-x", "-C", join(scratch, "base")], run("git", ["-C", top, "archive", "--format=tar", commit, prefix]));
  const pkg = join(scratch, "base", prefix);
  await symlink(join(ROOT, "node_modules"), join(pkg, "node_modules"));
  return { pkg, dispose: () => rm(scratch, { recursive: true, force: true }) };
}
