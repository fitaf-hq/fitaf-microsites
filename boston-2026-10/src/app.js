(function () {
  "use strict";
  var data = JSON.parse(document.getElementById("plan-data").textContent);
  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
  var CAROUSEL_MS = 4000; // one photo every 4 s (SPEC-plan-page-refinement § 2 item 1)
  // The fragment's answer part (SPEC-meal-selection § 3): Q1, Q2's days, then breakfast and snacks, in that order.
  var ANSWERS = /^(or|and)-(7d|5d)(-b)?(-s)?$/;

  function findGoal(id) {
    for (var i = 0; i < data.plans.length; i++) if (data.plans[i].id === id) return data.plans[i];
    return null;
  }

  // The answer set's key, a row of data.answers ("or-5d", "and-7d-b"); with "-s" when snacks are chosen, the fragment's
  // answer part, which the result card carries as data-selection (§ 8 item 2).
  function answerKey(s) { return s.ld + "-" + (s.weekends ? "7d" : "5d") + (s.breakfast ? "-b" : ""); }
  function answerPart(s) { return answerKey(s) + (s.snacks ? "-s" : ""); }

  // Nothing chosen: no size, Q1 not answered, Q2–Q4 at their defaults (data/plans.json's selection_defaults).
  function start() {
    return { tab: "individual", goal: null, ld: null, weekends: data.defaults.weekends, breakfast: data.defaults.breakfast, snacks: data.defaults.snacks };
  }
  function copy(s) {
    var next = {};
    for (var k in s) next[k] = s[k];
    return next;
  }

  // "or-5d-b-s" (or today's "7" / "14") -> the answers into `s`; false when it is not an answer set the page offers.
  function readAnswers(part, s) {
    var m = ANSWERS.exec(Object.prototype.hasOwnProperty.call(data.legacy, part) ? data.legacy[part] : part);
    if (!m || (m[4] && !data.snacks)) return false;
    var a = { ld: m[1], weekends: m[2] === "7d", breakfast: !!m[3], snacks: !!m[4] };
    if (!data.answers[answerKey(a)]) return false;
    for (var k in a) s[k] = a[k];
    return true;
  }

  // "#family" | "#lean" | "#lean-or-5d-b" | "#meals-and-7d" | "#lean-7" (today's) | "#individual" | "" -> state. A part
  // the page does not know is dropped, as today's "#lean-9" kept the size alone.
  function parse(hash) {
    var h = hash.replace(/^#/, "");
    if (h === "family") return { tab: "family" };
    var s = start();
    var m = /^([a-z]+)(?:-(.+))?$/.exec(h);
    if (!m) return s;
    if (findGoal(m[1])) s.goal = m[1];
    if (m[2]) readAnswers(m[2], s); // answers it does not know leave the size alone, if any
    return s;
  }
  function serialise(s) {
    if (s.tab === "family") return "family";
    var a = s.ld ? answerPart(s) : null;
    if (s.goal && a) return s.goal + "-" + a;
    if (s.goal) return s.goal;
    if (a) return "meals-" + a;
    return "individual";
  }

  var state = parse(location.hash);
  var lastIndividual = state.tab === "individual" ? state : start();
  function go(next) {
    var h = "#" + serialise(next);
    if (h === location.hash) render(next);
    else location.hash = h; // pushes a history entry; hashchange renders
  }

  // Whether an answer button is the state's answer (Q1 "or"/"and"; Q2–Q4 "yes"/"no").
  function pressed(s, q, a) {
    if (q === "lunch_dinner") return s.ld === a;
    return s.ld !== null && (s[q] ? "yes" : "no") === a;
  }
  function answered(s, q, a) {
    var next = copy(s);
    if (q === "lunch_dinner") next.ld = a;
    else next[q] = a === "yes";
    return next;
  }

  function render(s) {
    state = s;
    if (s.tab === "individual") lastIndividual = s;
    $$(".tab").forEach(function (t) {
      var on = t.getAttribute("data-tab") === s.tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    $("#panel-individual").hidden = s.tab !== "individual";
    $("#panel-family").hidden = s.tab !== "family";
    $$("[data-goal]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-goal") === s.goal));
    });
    $$("[data-q]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(s.tab === "individual" && pressed(s, b.getAttribute("data-q"), b.getAttribute("data-a"))));
    });
    $("#more").hidden = !s.ld;
    var plan = s.goal && findGoal(s.goal);
    var row = plan && s.ld && data.answers[answerKey(s)];
    var cell = row && plan.cells[row.plan];
    var result = $("#result");
    result.hidden = !cell;
    if (plan) result.setAttribute("data-accent", plan.id);
    result.setAttribute("data-selection", cell ? answerPart(s) : "");
    $("#all-link").hidden = s.tab !== "individual";
    if (cell) {
      $("#result-per-meal").textContent = cell.per_meal;
      $("#result-total").textContent = cell.total;
      $("#result-meals").textContent = String(row.plan);
      $("#result-rounded").textContent = row.rounded;
      $("#result-rounded").hidden = !row.rounded;
      $("#result-cta").href = data.base + "?mpid=" + cell.mpid;
    }
  }

  $$("[data-goal]").forEach(function (b) {
    b.addEventListener("click", function () {
      var next = copy(state.tab === "individual" ? state : lastIndividual);
      next.goal = b.getAttribute("data-goal");
      go(next);
    });
  });
  $$("[data-q]").forEach(function (b) {
    b.addEventListener("click", function () {
      go(answered(state.tab === "individual" ? state : lastIndividual, b.getAttribute("data-q"), b.getAttribute("data-a")));
    });
  });
  var tabs = $$(".tab");
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () {
      go(t.getAttribute("data-tab") === "family" ? { tab: "family" } : lastIndividual);
    });
    t.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      var n = tabs[(i + d + tabs.length) % tabs.length];
      n.focus();
      n.click();
    });
  });
  // See all plans: the grid in a modal dialog. Esc closes it (the browser's own); so do its close button and a press on
  // the backdrop (the dialog itself, outside its box); focus goes back to the link.
  var all = $("#all"), allLink = $("#all-link");
  allLink.addEventListener("click", function () { all.showModal(); });
  $("#all-close").addEventListener("click", function () { all.close(); });
  all.addEventListener("click", function (e) { if (e.target === all) all.close(); });
  all.addEventListener("close", function () { allLink.focus(); });

  // The carousel: one photo shown, the next every CAROUSEL_MS, never under reduced motion (no dots: § 8 item 1).
  var slides = $$("#carousel .slide"), shown = 0;
  if (slides.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setInterval(function () {
      shown = (shown + 1) % slides.length;
      slides.forEach(function (s, j) { s.className = j === shown ? "slide on" : "slide"; });
    }, CAROUSEL_MS);
  }

  window.addEventListener("hashchange", function () { render(parse(location.hash)); });
  render(state);
})();
