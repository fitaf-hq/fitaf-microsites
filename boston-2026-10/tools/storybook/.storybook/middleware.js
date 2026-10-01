// The development server's one addition (SPEC-storybook-microsite.md § 2 item 5): the pages under /microsite/ are sent
// with the policy that refuses any request to another host (microsite/serve.mjs says why). Nothing else is changed.
import { pageHeaders } from "../microsite/serve.mjs";

export default function pagePolicy(router) {
  router.use((req, res, next) => {
    const { pathname } = new URL(req.url, "http://localhost");
    for (const [name, value] of Object.entries(pageHeaders(pathname))) res.setHeader(name, value);
    next();
  });
}
