// Shared by r2-40 … r2-52 (SPEC-rung2-progress-and-checkout.md, rung 2's two faces). Not a test file itself.
// The shipped text runs as the other rung 2 cases run it (r2-harness.mjs: a fresh V8 context whose only global is a
// fake `window`, on the synthetic order page). These cases read what the contract adds: the progress screen (§ 2) and
// the checkout's mark and style (§ 3). The browser-level cases (`:has()`, what is displayed, motion, the 90 s clock,
// real photographs' loading) need Chrome and run in the watch package (tools/storefront-watch/test/r2-*.test.mjs).
//
// The screen's shape, as these cases read it: ONE element of ours, `#fitaf-screen`, in <body>, holding its own <style>,
// the title (an <h2>), the progress bar (`.b`, whose one child's inline width is the progress), the carousel (`.c`,
// one child per meal; the one shown carries the class `on`), and the step line (the one `[role=status]`).
import assert from "node:assert/strict";
import { loadJson, MESSAGES_PATH } from "../build.mjs";

export const SCREEN_ID = "fitaf-screen";
export const DEEP = "fitaf-deep";
/** SPEC-rung2-progress-and-checkout § 1: the screen's words are data/messages.json's `handoff`. */
export const WORDS = (await loadJson(MESSAGES_PATH)).handoff ?? {};

export const screenOf = (document) => document.getElementById(SCREEN_ID);
const clean = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : null);

/** What the screen shows now, or null when it is not on the page. */
export function screenState(document) {
  const s = screenOf(document);
  if (!s) return null;
  const bar = s.querySelector(".b > *");
  const slides = [...(s.querySelector(".c")?.children ?? [])];
  return {
    title: clean(s.querySelector("h2")),
    progress: bar ? bar.style.width || "0%" : null,
    step: clean(s.querySelector('[role="status"]')),
    slides: slides.map((el) => ({ name: clean(el.querySelector("b")), img: el.querySelector("img")?.getAttribute("src") ?? null })),
    shown: slides.findIndex((el) => el.classList.contains("on")),
  };
}

/** The step line § 2 item 2 names: the meal as its card shows it, and "<n> of <total> meals", from WORDS.step. */
export const stepLine = (meal, n, total) =>
  WORDS.step.replace("{meal}", meal).replace("{n}", String(n)).replace("{total}", String(total));

/** Progress `k` of `steps`, as the bar's inline width: k / steps as a percentage. */
export const percent = (k, steps) => `${(k / steps) * 100}%`;

/** § 3 item 1: the mark and the style fill B sets at `done`. */
export function deepState(document) {
  const styles = [...document.querySelectorAll(`style#${DEEP}`)];
  return {
    mark: document.documentElement.classList.contains(DEEP),
    styles: styles.length,
    inHead: styles.every((s) => s.parentElement === document.head),
    css: styles.map((s) => s.textContent).join("\n"),
  };
}

/**
 * Every console line the text writes, each with whether the screen and the style were on the page AT THAT MOMENT, so
 * "before the stop's console line" (§ 2 item 4) is observed, not inferred. Wraps the fake window's console.info.
 */
export function watchLines(h, document) {
  const lines = [];
  const info = h.window.console.info;
  h.window.console.info = (...parts) => {
    lines.push({ line: parts.join(" "), screen: Boolean(screenOf(document)), style: Boolean(document.getElementById(DEEP)) });
    info(...parts);
  };
  return lines;
}

/**
 * Every press on the page, in order, with the screen's state at the moment of the press (before fill B updates it for
 * that press): a capture of the store's own click, as a person watching would see it. Registered after the page's own
 * listener, so it runs after the store has taken the press.
 */
export function watchPresses(document) {
  const presses = [];
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    // The store's "+" has no text, only its aria-label (SPEC-rung2-fill-c § 2a).
    presses.push({ label: button.getAttribute("aria-label") || clean(button), state: screenState(document) });
  });
  return presses;
}

/**
 * The mutation records of the whole document, in order: [added|removed, id] for the screen and the style, and
 * [class, <html's class>] for the mark. linkedom's own MutationObserver (the document's window), not the fake window's.
 */
export function watchMutations(document) {
  const events = [];
  const mo = new document.defaultView.MutationObserver((records) => {
    for (const r of records) {
      for (const n of r.addedNodes ?? []) if (n.id === SCREEN_ID || n.id === DEEP) events.push(["added", n.id]);
      for (const n of r.removedNodes ?? []) if (n.id === SCREEN_ID || n.id === DEEP) events.push(["removed", n.id]);
      if (r.type === "attributes" && r.target === document.documentElement && r.attributeName === "class") {
        events.push(["class", document.documentElement.className]);
      }
    }
  });
  mo.observe(document, { childList: true, subtree: true, attributes: true });
  return {
    events,
    /** The observer delivers after a task; wait one, then read. */
    async settle() {
      await new Promise((resolve) => setTimeout(resolve, 0));
      mo.disconnect();
      return events;
    },
  };
}

/**
 * § 2 item 3: nothing a person can act on or focus. Every element of the screen is checked: no control element, no
 * link, no tabindex, no editable, and no role but the step line's `status`.
 */
export function focusableIn(screen) {
  const CONTROL = "a,button,input,select,textarea,iframe,summary,details,label,option,audio,video,object,embed,area";
  return [...screen.querySelectorAll("*")].filter(
    (el) =>
      el.matches(CONTROL) ||
      el.hasAttribute("tabindex") ||
      el.hasAttribute("contenteditable") ||
      el.hasAttribute("href") ||
      (el.hasAttribute("role") && el.getAttribute("role") !== "status"),
  );
}

/** The page's displayed buttons outside every meal card, as fill B's own § 10 scan reads them (control()). */
export const displayedButtonsOutsideCards = (document) =>
  [...document.querySelectorAll("button")].filter(
    (b) => b.getClientRects().length && !b.closest("app-product-card,app-product-card-mobile"),
  );

export function assertWords() {
  for (const key of ["title", "step", "checkout", "stopped"]) assert.equal(typeof WORDS[key], "string", `data/messages.json handoff.${key}`);
}
