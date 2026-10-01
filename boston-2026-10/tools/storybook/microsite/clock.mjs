// The one script a story adds to a page (SPEC-storybook-microsite.md § 2 item 4): placed before the page's own first
// script, it starts the frame's clock at a fixed instant, so the page chooses the week's Chef's Choice, in the browser,
// on zonedDate(Date.now(), zone), SPEC-chefs-choice § 2, as it would on that date. The page's bytes are otherwise the
// build's (SM-3). The clock runs on from the instant; a Date given a value is untouched.
export const CLOCK_ATTRIBUTE = "data-storybook-clock";

/** Runs in the frame (its source is inlined): Date.now() and new Date() start at `fixedMs` and run on from there. */
export function fixClock(fixedMs) {
  var RealDate = window.Date;
  var offset = fixedMs - RealDate.now();
  var now = function () {
    return RealDate.now() + offset;
  };
  window.Date = new Proxy(RealDate, {
    construct: function (target, args, newTarget) {
      return Reflect.construct(target, args.length ? args : [now()], newTarget);
    },
    apply: function () {
      return new RealDate(now()).toString();
    },
    get: function (target, key, receiver) {
      return key === "now" ? now : Reflect.get(target, key, receiver);
    },
  });
}

/** The script for `instant` (an ISO string), with its own line after it. */
export function clockScript(instant) {
  const ms = Date.parse(instant);
  if (!Number.isFinite(ms)) throw new Error(`the clock needs an instant, got ${instant}`);
  const source = String(fixClock);
  if (source.includes("<")) throw new Error("the clock's source must not hold a '<' (it is inlined in a <script>)");
  return `<script ${CLOCK_ATTRIBUTE}="${new Date(ms).toISOString()}">(${source})(${ms});</script>\n`;
}

/** `html` with the clock script for `instant` placed immediately before its first script. */
export function withClock(html, instant) {
  const at = html.indexOf("<script");
  if (at === -1) throw new Error("the page has no script to place the clock before");
  return html.slice(0, at) + clockScript(instant) + html.slice(at);
}
