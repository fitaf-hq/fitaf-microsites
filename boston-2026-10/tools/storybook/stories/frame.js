// One story: the page in a frame (SPEC-storybook-microsite.md § 2 item 2), at a fragment, the width of the chosen
// viewport, with a caption naming the state as feedback names it (group · story · width · build) and the date. Where
// the state needs a press, the story waits for the page's own script to have rendered and presses the page's own
// control in the frame; a state it cannot reach says so in its caption, never silently showing another (§ 3).
//
// The root element carries data-story-state (loading, ready, failed) and, on a failure, data-story-problem: what the
// cases read (SM-5).
import pages from "virtual:microsite-pages";
import { pageUrl, VIEWPORTS } from "../microsite/layout.js";
import { WHY } from "./states.js";

const READY_TIMEOUT_MS = 10_000;
const POLL_MS = 50;
export const CAPTION_STYLE = "margin:0;padding:6px 10px;font:13px/1.4 system-ui,sans-serif;background:#f4f4f5;color:#18181b;border-bottom:1px solid #d4d4d8";
export const FAILED_STYLE = "background:#fef2f2;color:#7f1d1d";

class Unreachable extends Error {}

/** The viewport's width in px, or null when none of § 3's is chosen (the frame then fills the canvas). */
export function viewportWidth(globals) {
  const v = globals?.viewport;
  return VIEWPORTS[typeof v === "string" ? v : v?.value]?.width ?? null;
}

export const shown = (el) => Boolean(el && el.getClientRects().length > 0);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(test, why) {
  const end = Date.now() + READY_TIMEOUT_MS;
  while (!test()) {
    if (Date.now() > end) throw new Unreachable(why);
    await sleep(POLL_MS);
  }
}

/** The date's line in the caption: the real clock, or the fixed one in the enterprise's zone. */
function dateLine(date) {
  if (!date.instant) return `Date: ${date.label}, the page built --on ${date.on}`;
  const wall = new Intl.DateTimeFormat("en-CA", {
    timeZone: pages.zone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(date.instant));
  return `Date: ${date.label}: the frame's clock starts at ${wall} ${pages.zone} (the page built --on ${date.on})`;
}

/** Reach `state` in the frame's page: wait, check, press. Throws Unreachable with the reason. A pressed control is
 *  scrolled to the frame's top, where the visitor who pressed it is looking (`keepTop`: not, for the whole page). */
async function reach(frame, state, { keepTop }) {
  const doc = () => frame.contentDocument;
  const el = (sel) => doc()?.querySelector(sel);
  await until(() => shown(el(state.waits)), WHY.waits(state.waits));
  if (state.needs && !shown(el(state.needs))) throw new Unreachable(WHY.needs(state.needs));
  if (state.lacks && shown(el(state.lacks))) throw new Unreachable(WHY.lacks(state.lacks));
  if (state.press) {
    if (!shown(el(state.press))) throw new Unreachable(WHY.press(state.press));
    el(state.press).click();
    await until(() => shown(el(state.opens)), WHY.opens(state.opens));
    if (!keepTop) el(state.press).scrollIntoView({ block: "start" });
  }
  // SPEC-meal-selection § 9's stories: where the state's subject is (the questions, the snacks), at the frame's top.
  if (state.scrollTo && !keepTop) el(state.scrollTo)?.scrollIntoView({ block: "start" });
}

/** Make the frame as tall as its page, and keep it so (the Scroll story: no inner scroll). */
function fitToPage(frame) {
  const page = frame.contentDocument.documentElement;
  const fit = () => {
    frame.style.height = `${page.scrollHeight}px`;
  };
  fit();
  new frame.contentWindow.ResizeObserver(fit).observe(page);
}

/**
 * The story's element. `context` is Storybook's (the story's title and name, the viewport global); `state` one of
 * STATES; `args` the controls (build, date, goal, meals); `whole`, the frame as tall as the page (the state named too).
 */
export function showPage({ context, state, args, whole = false }) {
  const group = context.title.split("/").at(-1);
  const story = whole ? `${context.name} (${state.name})` : context.name;
  const width = viewportWidth(context.globals);
  const build = pages.builds.find((b) => b.id === args.build) ?? pages.builds[0];
  const date = pages.dates.find((d) => d.id === args.date) ?? pages.dates[0];
  const root = document.createElement("div");
  root.dataset.storyState = "loading";
  root.style.cssText = whole ? "" : "display:flex;flex-direction:column;height:100vh";
  const caption = document.createElement("p");
  caption.style.cssText = CAPTION_STYLE;
  caption.textContent = `${group} · ${story} · ${width ?? "full width"} · ${build.id}. ${dateLine(date)}`;
  const frame = document.createElement("iframe");
  frame.title = `${group} · ${story}: the page, ${build.label}`;
  frame.style.cssText = `display:block;border:0;width:${width ? `${width}px` : "100%"};${whole ? "" : "flex:1 1 auto;min-height:0"}`;
  root.append(caption, frame);

  const fail = (why) => {
    root.dataset.storyState = "failed";
    root.dataset.storyProblem = why;
    caption.style.cssText = `${CAPTION_STYLE};${FAILED_STYLE}`;
    caption.textContent = `⚠ This state cannot be shown: ${why}. (${caption.textContent})`;
  };
  if (!date.on) {
    fail(`there is no committed week in data/picks/ for the date "${date.label}"`);
    return root;
  }
  frame.addEventListener("load", () => {
    reach(frame, state, { keepTop: whole })
      .then(() => {
        if (whole) fitToPage(frame);
        root.dataset.storyState = "ready";
      })
      .catch((err) => fail(err instanceof Unreachable ? err.message : `the story broke: ${err}`));
  }, { once: true });
  frame.src = pageUrl(build.id, date.id) + state.fragment(args);
  return root;
}

/** The controls every story has (§ 3): Build and Date; and Goal and Meals where the state is a chosen plan (Meals not
 *  where the story's own answers are the state: SPEC-meal-selection's stories). */
export function controls({ plan, meals = plan }) {
  const radio = (labels) => ({ type: "inline-radio", labels });
  const byId = (list, label) => Object.fromEntries(list.map((x) => [x.id, x[label]]));
  const hidden = { table: { disable: true } };
  return {
    build: { name: "Build", options: pages.builds.map((b) => b.id), control: radio(byId(pages.builds, "label")) },
    date: { name: "Date", options: pages.dates.map((d) => d.id), control: radio(byId(pages.dates, "label")) },
    goal: plan ? { name: "Goal", options: pages.goals.map((g) => g.id), control: radio(byId(pages.goals, "name")) } : hidden,
    meals: meals ? { name: "Meals", options: pages.counts, control: radio({}) } : hidden,
  };
}

/** The controls' first values: production, the given date, the first goal and count of data/plans.json. */
export const defaults = (date) => ({ build: pages.builds[0].id, date, goal: pages.goals[0].id, meals: pages.counts[0] });
