// One Hand-off story (SPEC-storybook-microsite.md § 8): the watch's synthetic store in a frame exactly the viewport's
// size, opened at the story's store with its link (scripts/handoff-link.mjs's, built when Storybook started), the
// shipped block running as the store's Custom Scripts Footer runs it. Above the frame, a caption: the state named as
// feedback names it (group · story · width), what it shows, how it is held, for the checkout § 8.2's limit, and the
// block's version line. The story waits for the block to reach the state and presses the block's own Continue where the
// state needs it, as a visitor would (§ 8.3: never the pay button); a state not reached turns the caption red with the
// reason, never silently showing another.
//
// The root element carries data-story-state (loading, ready, failed) and, on a failure, data-story-problem, as
// frame.js's do: what the cases read (SM-10).
import store from "virtual:handoff-store";
import { VIEWPORTS } from "../microsite/layout.js";
import { CHECKOUT_PATH, ORDER_PATH, storeUrl } from "../handoff/layout.js";
import { CAPTION_STYLE, FAILED_STYLE, shown, viewportWidth } from "./frame.js";
import { BAR, barPercent, CARDS, CONTINUE, ENTRIES, LINES, SCREEN, SLIDES, STEP_BAR, stepClass, WHY } from "./handoff-states.js";

/** A whole hand-off on the synthetic store takes about 5 s here; far longer under load. */
const HANDOFF_TIMEOUT_MS = 60_000;
const PRESS_TIMEOUT_MS = 15_000;
const POLL_MS = 50;
/** After a hold is reached, how long the story watches that it holds: several of the block's polls (200 ms) and gaps (300 ms). */
const SETTLE_MS = 1_000;
/** The bar's width is read back as the browser serializes it (rounded): equal within this, in %. */
const BAR_SLACK = 0.01;
const NOTE_STYLE = "margin:4px 0 0;font-size:12px;color:#3f3f46";
const RELEASE_STYLE = "margin-top:6px;font:inherit;padding:2px 10px;cursor:pointer";

class Unreachable extends Error {}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(test, why, timeoutMs) {
  const end = Date.now() + timeoutMs;
  while (!test()) {
    if (Date.now() > end) throw new Unreachable(why);
    await sleep(POLL_MS);
  }
}

/** The viewport's size: the frame is exactly it, so the block lays out as on that screen (its 32vh, its centring). */
function viewportSize(globals) {
  const width = viewportWidth(globals);
  const v = Object.values(VIEWPORTS).find((x) => x.width === width);
  return v ? { width: v.width, height: v.height } : null;
}

/** The frame's address for a state: its store, at /order with the link of `t` meals, or at /checkout with none. */
function addressOf(state, args) {
  if (!state.link) return storeUrl({ path: CHECKOUT_PATH, store: state.store(args) });
  const link = store.links[args.t ?? store.defaultCount];
  return storeUrl({ path: ORDER_PATH, search: link.search, store: state.store(args), hash: link.hash });
}

/** In the frame: a step-2 field given `value`, as typing does (an input event the store's form listens for). */
function type(win, el, value) {
  el.value = value;
  el.dispatchEvent(new win.Event("input", { bubbles: true }));
}

/** Reach `state` in the frame (wait, check, press); throws Unreachable with the reason. `onHeld()`: Screen · C's release. */
async function reach(frame, state, args, onHeld) {
  const doc = () => frame.contentDocument;
  const win = () => frame.contentWindow;
  const el = (sel) => doc()?.querySelector(sel);
  const count = (sel) => doc()?.querySelectorAll(sel).length ?? 0;
  const atStep = (n) => doc()?.documentElement.classList.contains(stepClass(n));
  const bar = () => parseFloat(el(BAR)?.style.width);
  if (state.kind === "screen-a") {
    await until(() => shown(el(SCREEN)), WHY.screen(), HANDOFF_TIMEOUT_MS);
    await until(() => count(CARDS) > 0, WHY.cards(), HANDOFF_TIMEOUT_MS);
    await sleep(SETTLE_MS);
    if (count(SLIDES) > 0) throw new Unreachable(WHY.pressed(count(SLIDES)));
  } else if (state.kind === "screen-b") {
    const [k, t] = [Number(args.k), Number(args.t)];
    const at = () => Math.abs(bar() - barPercent(k, t)) < BAR_SLACK;
    await until(() => shown(el(SCREEN)), WHY.screen(), HANDOFF_TIMEOUT_MS);
    await until(at, WHY.bar(k, t, el(BAR)?.style.width), HANDOFF_TIMEOUT_MS);
    await sleep(SETTLE_MS);
    if (!at()) throw new Unreachable(WHY.movedOn(k));
  } else if (state.kind === "screen-c") {
    await until(() => shown(el(SCREEN)) && typeof win()?.__fixtureRoute === "function", WHY.held(), HANDOFF_TIMEOUT_MS);
    onHeld(() => win().__fixtureRoute?.());
  } else if (state.kind === "checkout") {
    await until(() => atStep(1) && shown(el(STEP_BAR)), WHY.step(1), HANDOFF_TIMEOUT_MS);
    for (let now = 1; now < state.step; now++) {
      if (now === 2) {
        for (const [name, value] of ENTRIES) {
          const field = el(`app-checkout [name=${name}]`);
          if (!field) throw new Unreachable(WHY.field(name));
          if (!field.value) type(win(), field, value);
        }
      }
      if (!el(CONTINUE)) throw new Unreachable(WHY.noContinue(now));
      el(CONTINUE).click();
      await until(() => atStep(now + 1), WHY.step(now + 1), PRESS_TIMEOUT_MS);
    }
  } else if (state.kind === "ordinary") {
    await until(() => shown(el(LINES)), WHY.lines(), HANDOFF_TIMEOUT_MS);
    if (el(STEP_BAR)) throw new Unreachable(WHY.stepBar());
  }
}

function paragraph(text, style) {
  const p = document.createElement("p");
  p.style.cssText = style;
  p.textContent = text;
  return p;
}

/**
 * The story's element. `context` is Storybook's (the story's title and name, the viewport global); `state` one of
 * HANDOFF; `args` its controls (Screen · B's k and t).
 */
export function showHandoff({ context, state, args }) {
  const group = context.title.split("/").at(-1);
  const size = viewportSize(context.globals);
  const name = `${group} · ${context.name} · ${size ? size.width : "full width"}`;
  const root = document.createElement("div");
  root.dataset.storyState = "loading";
  const caption = document.createElement("div");
  caption.style.cssText = CAPTION_STYLE;
  const head = paragraph(`${name}. ${state.what(args)}`, "margin:0;font-weight:600");
  caption.append(head, paragraph(state.held(args), "margin:4px 0 0"));
  if (state.limit) caption.append(paragraph(state.limit, "margin:4px 0 0;font-style:italic"));
  // The rest on request: at 390 the caption stands above a frame the phone's full height, and the canvas scrolls.
  const more = document.createElement("details");
  more.style.cssText = NOTE_STYLE;
  const summary = document.createElement("summary");
  summary.textContent = "The photographs and the block";
  more.append(summary, ...state.notes.map((note) => paragraph(note, NOTE_STYLE)));
  more.append(paragraph(`The block: ${store.block.file.versionLine.replace(/(sha256:\w{12})\w+/, "$1…")}, as scripts/build-storefront.mjs built it at Storybook's start.`, NOTE_STYLE));
  caption.append(more);
  const frame = document.createElement("iframe");
  frame.title = `${name}: the synthetic store with the hand-off block`;
  frame.style.cssText = `display:block;border:0;width:${size ? `${size.width}px` : "100%"};height:${size ? `${size.height}px` : "100vh"}`;
  root.append(caption, frame);

  const fail = (why) => {
    root.dataset.storyState = "failed";
    root.dataset.storyProblem = why;
    caption.style.cssText = `${CAPTION_STYLE};${FAILED_STYLE}`;
    head.textContent = `⚠ This state cannot be shown: ${why}. (${head.textContent})`;
  };
  const onHeld = (release) => {
    const button = document.createElement("button");
    button.type = "button";
    button.style.cssText = RELEASE_STYLE;
    button.textContent = "Release: let the store go to /checkout";
    button.addEventListener("click", () => {
      button.disabled = true;
      release();
    }, { once: true });
    caption.append(button);
  };
  if (state.kind === "screen-b" && Number(args.k) > Number(args.t)) {
    fail(WHY.k(args.k, args.t));
    return root;
  }
  frame.addEventListener("load", () => {
    reach(frame, state, args, onHeld)
      .then(() => {
        root.dataset.storyState = "ready";
      })
      .catch((err) => fail(err instanceof Unreachable ? err.message : `the story broke: ${err}`));
  }, { once: true });
  frame.src = addressOf(state, args);
  return root;
}
