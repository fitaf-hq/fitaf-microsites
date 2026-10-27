// The page's analytics (SPEC-analytics.md §§ 1–4): seven events from a closed list (since § 14, `save`), each one beacon
// to the page's own /a. The build inlines this text BEFORE app.js (so the error listener is there first), with its whole-line `//`
// comments, its blank lines and each line's indentation removed (build.mjs analyticsSlot: the dev page is near T5's
// 60 KB), and data/events.json's ids written into QR_IDS below.
//
// ⛔ Nothing is stored on the device (§ 1.1): no cookie, no storage API. The visit id `s` is made here, in memory, at
// load (crypto.getRandomValues), and is gone with the page; a reload is a new visit (§ 2).
// ⛔ Every value sent is from § 3's vocabulary or a number: the page's own ids for the goal and Q1–Q4 (data-goal,
// data-q, data-a) and, since § 13, for the first question and Family's own (data-who, data-family); the answer set's key
// (#result's data-selection without its snacks mark); an mpid from the link's own href (every link on the page with an
// `?mpid=` is the store's order page: the grid, Family, the result card's, the Chef's Choice card's two). Never text the
// visitor typed, never an error's message or stack.
// ⭐ ONE call site, navigator.sendBeacon("/a", …) (T5 amended, § 4); at most 20 events a visit, the last kept for the
// leave. A browser without Web Crypto or performance.now sends nothing; one without the beacon's API throws inside the
// try, and nothing is sent either.
// It reads what app.js and the Chef's Choice card render and changes nothing: no listener here prevents a press, and
// no href is touched (the hand-off's links and fragment are exactly as today: § 3, A9).
// The QR events an `?e=` may name (§ 9): data/events.json's ids, which the build writes in place of this empty list. A
// global of the page, read with qrEvent (src/qr-event.js, inlined before this script's first line) here and by the save
// step (SPEC-save-offer-production § 9 item 2): one list, one reading.
var QR_IDS = /*QR_IDS*/[];
(function () {
  "use strict";
  var w = window, d = document, perf = w.performance, rnd = w.crypto;
  if (!perf || !rnd || !rnd.getRandomValues) return;
  // The funnel's steps in order: `leave` carries the deepest reached (§ 3).
  var STEPS = ["open", "answer", "result", "click"];
  var left = 20, deepest = 0, gone = 0, failed = 0, shown = "";
  // 16 hex digits: 64 random bits.
  function visitId() {
    var b = rnd.getRandomValues(new Uint8Array(8)), id = "";
    for (var i = 0; i < 8; i++) id += (b[i] + 256).toString(16).slice(1);
    return id;
  }
  var s = visitId();
  // A time since the page began, in whole ms; above a day it is sent as a day (the Worker refuses more).
  function ms() {
    return Math.min(864e5, Math.max(0, Math.round(perf.now())));
  }
  // One event, one beacon; the 20th is kept for the leave.
  function send(event, fields) {
    deepest = Math.max(deepest, STEPS.indexOf(event));
    if (event == "leave" ? gone : left < 2) return;
    if (event == "leave") gone = 1;
    left--;
    var body = { event: event, s: s };
    for (var k in fields) body[k] = fields[k];
    try {
      navigator.sendBeacon("/a", JSON.stringify(body));
    } catch (e) {}
  }
  // `error`: the first uncaught script error, `s` only (§ 3).
  w.addEventListener("error", function () {
    if (!failed) send("error", {});
    failed = 1;
  });
  // `open`: the viewport's band (§ 1.4), the load time, the QR event if the URL names one data/events.json has (§ 9).
  var x = w.innerWidth || 0;
  send("open", {
    viewport: x < 400 ? "<400" : x < 768 ? "400-767" : x < 1200 ? "768-1199" : ">=1200",
    load_ms: ms(),
    qr: qrEvent(w.location.search, QR_IDS)
  });
  // `answer` and `click`, read off the pressed element (in the capture phase, before the page's own handlers). Since § 13
  // the first question (`who`, its data-who) and Family's own (`family`, its data-family) are answers as the others are.
  d.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-goal],[data-q],[data-who],[data-family],[href],#all-link");
    if (!t) return;
    var a = function (n) { return t.getAttribute(n) || ""; }, m = /\?mpid=(\d+)(#|$)/.exec(a("href"));
    if (a("data-goal")) send("answer", { question: "goal", answer: a("data-goal") });
    else if (a("data-q")) send("answer", { question: a("data-q"), answer: a("data-a") });
    else if (a("data-who")) send("answer", { question: "who", answer: a("data-who") });
    else if (a("data-family")) send("answer", { question: "family", answer: a("data-family") });
    else if (t.id == "all-link") send("click", { link: "all-plans" });
    else if (m) send("click", { link: t.id == "cc-checkout" ? "chefs-choice" : "order", mpid: +m[1] });
  }, true);
  // `result`: whenever the result card shows a plan it was not showing, after app.js has rendered (a timer, since this
  // script's hashchange listener runs before app.js's).
  function result() {
    var r = d.getElementById("result"), cta = d.getElementById("result-cta");
    var key = r && cta && !r.hidden ? (r.getAttribute("data-selection") || "").replace(/-s$/, "") : "";
    var m = key && /[?&]mpid=(\d+)/.exec(cta.getAttribute("href") || ""), now = m ? key + " " + m[1] : "";
    if (now && now != shown) send("result", { key: key, mpid: +m[1] });
    shown = now;
  }
  w.addEventListener("hashchange", function () { w.setTimeout(result, 0); });
  w.setTimeout(result, 0);
  // § 15 item 4: once more after every inline script has run, app.js included. A page opened at a whole answer set shows
  // its plan as app.js runs, and the timer above can run before that, while the parser is paused before app.js.
  d.addEventListener("DOMContentLoaded", result);
  // `save` (§ 14): the save step (src/save/flow1.js) tells this script, by `fitaf:saved` on document with no detail, that
  // its Worker answered an offer save as stored. `s` only; not a step of the funnel, so `leave`'s deepest is unchanged.
  d.addEventListener("fitaf:saved", function () {
    send("save", {});
  });
  // `leave`, once: the page hidden or left, whichever is first.
  function leave() {
    send("leave", { length_ms: ms(), step: STEPS[deepest] });
  }
  w.addEventListener("pagehide", leave);
  d.addEventListener("visibilitychange", function () {
    if (d.visibilityState == "hidden") leave();
  });
})();
