// A module resolve hook, registered by lib/site-code.mjs. The smoke imports the site's own payload code
// (scripts/handoff-link.mjs), which imports build.mjs, which imports `qrcode`, the site's one runtime dependency. The
// watch installs only THIS package (the site's install never runs in CI), so a bare specifier imported by a site
// module that the site cannot resolve is resolved from this package instead, which pins the same version. A site
// that has its own install resolves as it always does; nothing else is touched.

const SITE = new URL("../../../", import.meta.url).href;
const TOOLS = new URL("../../", import.meta.url).href;
const THIS_PACKAGE = new URL("../package.json", import.meta.url).href;
/** Not a relative or absolute path, not a URL, not node:… */
const BARE = /^(?![./]|[a-z][a-z0-9+.-]*:)/i;

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    const parent = context.parentURL ?? "";
    if (err?.code !== "ERR_MODULE_NOT_FOUND" || !BARE.test(specifier) || !parent.startsWith(SITE) || parent.startsWith(TOOLS)) {
      throw err;
    }
    return nextResolve(specifier, { ...context, parentURL: THIS_PACKAGE });
  }
}
