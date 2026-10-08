// The development server's additions (SPEC-storybook-microsite.md § 2 item 5, § 8.1): the pages under /microsite/ are
// sent with the policy that refuses any request to another host (microsite/serve.mjs says why); and the Hand-off stories'
// synthetic store is served at its own paths, /order, /checkout and /img/, from the files handoff/store.mjs wrote, by
// handoff/serve.mjs's rule (the one the cases' static server applies), the store's pages with the same policy.
// Nothing else is changed.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pageHeaders } from "../microsite/serve.mjs";
import { STORE_DIR } from "../handoff/paths.mjs";
import { storeRoute } from "../handoff/serve.mjs";

export default function pagePolicy(router) {
  router.use(async (req, res, next) => {
    const { pathname, search } = new URL(req.url, "http://localhost");
    const route = storeRoute(pathname, search);
    if (route) {
      try {
        const body = await readFile(join(STORE_DIR, route.file));
        res.writeHead(200, { "Content-Type": route.type, ...route.headers });
        res.end(body);
      } catch {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("not in the store");
      }
      return;
    }
    for (const [name, value] of Object.entries(pageHeaders(pathname))) res.setHeader(name, value);
    next();
  });
}
