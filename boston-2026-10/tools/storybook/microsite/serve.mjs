// How Storybook serves the pages (SPEC-storybook-microsite.md § 2 item 5: ⛔ no request leaves the machine).
//
// The production page makes no request. The development page asks challenges.cloudflare.com for Turnstile's script
// (build.mjs's TURNSTILE_SCRIPT_URL, a <script src> in its rung 4 section). The page's bytes must stay the build's
// (§ 2 item 1, SM-3), so the refusal is the server's: every response under microsite/ carries a Content-Security-Policy
// allowing this origin, inline script and style (the page's own), and data: and blob: URLs, and nothing else.
// .storybook/middleware.js sends it from the development server; the cases' server sends the same.
import { PAGES_ROUTE } from "./layout.js";

export const PAGE_POLICY = "default-src 'self' 'unsafe-inline' data: blob:";

/** The headers for a response at `pathname`: the policy for the pages, none for anything else. */
export function pageHeaders(pathname) {
  return pathname.startsWith(`/${PAGES_ROUTE}/`) ? { "Content-Security-Policy": PAGE_POLICY } : {};
}
