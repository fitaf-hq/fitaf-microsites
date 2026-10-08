// A static server over a Storybook build, on 127.0.0.1 only, for SM-3, SM-5, SM-8, SM-9 and SM-10. Not a test file
// itself.
//
// It sends the pages the headers Storybook's own development server sends them (microsite/serve.mjs, the one source),
// and serves the Hand-off stories' synthetic store at its own paths from the build's store/ (handoff/serve.mjs, the rule
// the development server applies), unless `policy: false` (SM-8's mutants: a server that forgets the policy).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { pageHeaders } from "../microsite/serve.mjs";
import { STORE_ROUTE } from "../handoff/layout.js";
import { storeRoute } from "../handoff/serve.mjs";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};
const LOOPBACK = "127.0.0.1";
const ANY_FREE_PORT = 0;

/** The file a request names under `root`, or null (outside it, or absent). A directory serves its index.html. */
async function fileFor(root, pathname) {
  const path = join(root, normalize(decodeURIComponent(pathname)));
  if (path !== root && !path.startsWith(root + sep)) return null;
  try {
    return (await stat(path)).isDirectory() ? join(path, "index.html") : path;
  } catch {
    return null;
  }
}

export async function serveStatic(root, { policy = true } = {}) {
  const server = createServer(async (req, res) => {
    const { pathname, search } = new URL(req.url, `http://${LOOPBACK}`);
    const route = storeRoute(pathname, search, { policy });
    if (route) {
      try {
        const body = await readFile(join(root, STORE_ROUTE, route.file));
        res.writeHead(200, { "content-type": route.type, ...route.headers });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end();
      }
      return;
    }
    const file = await fileFor(root, pathname);
    try {
      const body = await readFile(file);
      const headers = { "content-type": TYPES[extname(file)] ?? "application/octet-stream", ...(policy ? pageHeaders(pathname) : {}) };
      res.writeHead(200, headers);
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(ANY_FREE_PORT, LOOPBACK, resolve));
  return {
    base: `http://${LOOPBACK}:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
