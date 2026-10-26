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

  // The individual plan with nothing chosen: no size, Q1 not answered, Q2–Q4 at their defaults (data/plans.json's
  // selection_defaults). `who` is the first question's answer (SPEC-ui-and-copy-pass § 2 item 2: until it, the tab):
  // "individual" or "family", the panel shown. Since § 4.2 item 1 (the Advisor, 2026-10-26: "let's start with just the
  // question") the page's start is NOBODY's: the first question with neither answer, no panel.
  var NOBODY = { who: null };
  function start() {
    return { who: "individual", goal: null, ld: null, weekends: data.defaults.weekends, breakfast: data.defaults.breakfast, snacks: data.defaults.snacks };
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

  // "#family" | "#family-or" | "#lean" | "#lean-or-5d-b" | "#meals-and-7d" | "#lean-7" (today's) | "#individual" | "" ->
  // state. A part the page does not know is dropped, as today's "#lean-9" kept the size alone. SPEC-ui-and-copy-pass
  // § 2.2: Family's one answer (`fld`, Q1's: "or" or "and") follows "family-". § 4.2 items 1–2: "#individual" (or a size,
  // or a meal answer) is the individual plan; a fragment carrying no answer ("", or one the page does not know) the start.
  function parse(hash) {
    var h = hash.replace(/^#/, "");
    if (h === "family") return { who: "family", fld: null };
    var fm = /^family-(or|and)$/.exec(h);
    if (fm && data.family[fm[1]]) return { who: "family", fld: fm[1] };
    var s = start();
    if (h === "individual") return s;
    var m = /^([a-z]+)(?:-(.+))?$/.exec(h);
    if (!m) return NOBODY;
    if (findGoal(m[1])) s.goal = m[1];
    if (m[2]) readAnswers(m[2], s); // answers it does not know leave the size alone, if any
    return s.goal || s.ld ? s : NOBODY;
  }
  // The start writes no fragment of its own (no tap makes it: every press answers the first question or one below it).
  function serialise(s) {
    if (!s.who) return "";
    if (s.who === "family") return s.fld ? "family-" + s.fld : "family";
    var a = s.ld ? answerPart(s) : null;
    if (s.goal && a) return s.goal + "-" + a;
    if (s.goal) return s.goal;
    if (a) return "meals-" + a;
    return "individual";
  }

  var state = parse(location.hash);
  var lastIndividual = state.who === "individual" ? state : start();
  var lastFamily = state.who === "family" ? state : { who: "family", fld: null };
  // The fragments this page view has been at (§ 4 A, below): its own, written by go(), and the one it opened at.
  var written = {};
  written[location.hash] = true;
  function go(next) {
    var h = "#" + serialise(next);
    written[h] = true;
    if (h === location.hash) render(next);
    else location.hash = h; // pushes a history entry; hashchange renders
  }

  // SPEC-ui-and-copy-pass § 4 A (the Advisor, 2026-10-26: "The questions should progressively reveal"): each panel's
  // questions are shown one at a time, in the page's order: the individual plan's (lunch or dinner, weekends, breakfast,
  // snacks, the meal size last) and Family's one. `reached` counts a panel's questions answered by a tap in this page
  // view: the questions up to the next one are shown, the next with no answer pressed (item 4), and once all are
  // answered the result card. It only grows (item 3: whatever is tapped after, back and forward too). `all`: every
  // question of both panels shown, each with its answer (item 5, a link carrying answers or a size; item 6, the other
  // answer to the first question once a question below it was answered). The page view's own (item 7): not in the
  // fragment, not stored. While snacks are carted, Q4 is the Chef's Choice card's to show, beside a result alone
  // (SPEC-snacks-in-the-cart § 4), so it is no step of the sequence and its `hidden` is the card's.
  var cardSnacks = data.snacks && data.snacks_carted;
  function stepsOf(panel) {
    return $$("#panel-" + panel + " .step").filter(function (step) { return !(cardSnacks && step.querySelector("#q-snacks")); });
  }
  var steps = { individual: stepsOf("individual"), family: stepsOf("family") };
  var reached = { individual: 0, family: 0 };
  function carries(s) { return s.who === "family" ? !!s.fld : !!(s.goal || s.ld); }
  // The first question's answer last chosen in this page view (§ 4.2: the start has none; a return to it keeps the last).
  var chosen = state.who;
  var all = carries(state);
  // A fragment this page view never wrote nor opened at (a link followed within the page, the address bar) is a link
  // too (item 5): carrying answers or a size, it shows every question. Back and forward land on fragments it has been
  // at, and change nothing shown (item 3).
  function arrived(s) {
    if (!written[location.hash] && carries(s)) all = true;
    written[location.hash] = true;
    return s;
  }
  function complete(panel) { return all || reached[panel] >= steps[panel].length; }
  // Whether a question shows its answer: one above the newest (answered by a tap), or every question revealed. Q4 out of
  // the sequence (the card's) shows it once the panel is complete, as every question does.
  function answeredAt(panel, button) {
    var i = steps[panel].indexOf(button.closest(".step"));
    return i < 0 ? complete(panel) : all || i < reached[panel];
  }
  // A tap answers its question (either answer, the one already pressed included: item 3), so the next one shows.
  function tapped(panel, button) {
    var i = steps[panel].indexOf(button.closest(".step"));
    if (i >= 0) reached[panel] = Math.max(reached[panel], i + 1);
  }

  // Whether an answer button is the state's answer (Q1 "or"/"and"; Q2–Q4 "yes"/"no"; since § 4 A item 5, a question
  // with no answer given shows its default, as a revealed question does).
  function pressed(s, q, a) {
    if (q === "lunch_dinner") return s.ld === a;
    return (s[q] ? "yes" : "no") === a;
  }
  function answered(s, q, a) {
    var next = copy(s);
    if (q === "lunch_dinner") next.ld = a;
    else next[q] = a === "yes";
    return next;
  }

  function render(s) {
    state = s;
    if (s.who === "individual") lastIndividual = s;
    else if (s.who === "family") lastFamily = s;
    if (s.who) chosen = s.who;
    // The first question (SPEC-ui-and-copy-pass § 2 item 2): its answer pressed, and its panel the one shown below it.
    $$("[data-who]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-who") === s.who));
    });
    $("#panel-individual").hidden = s.who !== "individual";
    $("#panel-family").hidden = s.who !== "family";
    // § 4 A: the questions shown so far, each panel's; the newest with no answer pressed.
    ["individual", "family"].forEach(function (panel) {
      steps[panel].forEach(function (step, i) { step.hidden = !(all || i <= reached[panel]); });
    });
    $("#more").hidden = !(all || reached.individual > 0);
    $$("[data-goal]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(answeredAt("individual", b) && b.getAttribute("data-goal") === s.goal));
    });
    $$("[data-q]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(s.who === "individual" && answeredAt("individual", b) && pressed(s, b.getAttribute("data-q"), b.getAttribute("data-a"))));
    });
    $$("[data-family]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(s.who === "family" && answeredAt("family", b) && s.fld === b.getAttribute("data-family")));
    });
    // The result card is the step after the last question (§ 4 A item 1).
    var shown = !s.who || !complete(s.who) ? null : s.who === "family" ? familyResult(s) : individualResult(s);
    var result = $("#result");
    result.hidden = !shown;
    var accent = s.who === "family" ? "family" : s.goal && findGoal(s.goal) ? s.goal : null;
    if (accent) result.setAttribute("data-accent", accent);
    result.setAttribute("data-selection", shown ? shown.selection : "");
    $("#all-link").hidden = s.who === "family"; // § 4.2 item 4: the foot shows at the start too
    if (shown) {
      $("#result-per-meal").textContent = shown.per_meal;
      $("#result-total").textContent = shown.total;
      $("#result-meals").textContent = String(shown.meals);
      $("#result-rounded").textContent = shown.rounded;
      $("#result-rounded").hidden = !shown.rounded;
      $("#result-cta").href = data.base + "?mpid=" + shown.mpid;
    }
  }
  // What the result card shows for an individual plan: SPEC-ui-and-copy-pass § 1.2 item 1, the meals the card lists and its
  // weekly total those meals at the plan's price a meal (the build's, for an answer set above its plan); a set of the
  // plan's own count shows the plan's total. null until the goal and Q1 are answered.
  function individualResult(s) {
    var plan = s.goal && findGoal(s.goal);
    var row = plan && s.ld && data.answers[answerKey(s)];
    var cell = row && plan.cells[row.plan];
    if (!cell) return null;
    var total = row.meals === row.plan ? cell.total : plan.totals[answerKey(s)];
    return { selection: answerPart(s), per_meal: cell.per_meal, total: total, meals: row.meals, rounded: row.rounded, mpid: cell.mpid };
  }
  // § 2.2: Family's, once its one question is answered: its meals a week at its price a meal, and the answer set whose cart
  // the Chef's Choice card shows for it (the card's checkout link is that cart's to Family's mpid, when the week has one).
  function familyResult(s) {
    var f = s.fld && data.family[s.fld];
    return f ? { selection: f.key, per_meal: f.per_meal, total: f.total, meals: f.meals, rounded: "", mpid: f.mpid } : null;
  }

  $$("[data-goal]").forEach(function (b) {
    b.addEventListener("click", function () {
      tapped("individual", b);
      var next = copy(state.who === "individual" ? state : lastIndividual);
      next.goal = b.getAttribute("data-goal");
      go(next);
    });
  });
  $$("[data-q]").forEach(function (b) {
    b.addEventListener("click", function () {
      tapped("individual", b);
      go(answered(state.who === "individual" ? state : lastIndividual, b.getAttribute("data-q"), b.getAttribute("data-a")));
    });
  });
  // Family shows its panel, the individual plan its own: each returns to the answers it was left with (every answer kept).
  // § 4 A item 6 (the Advisor's fallback): once a question below this one was answered, the other answer shows every
  // question of both panels; before that, it changes the panel alone. "The other" is the other than the answer last chosen
  // (`chosen`), so a return to the start keeps it; from a fresh start there is no other.
  $$("[data-who]").forEach(function (b) {
    b.addEventListener("click", function () {
      var to = b.getAttribute("data-who");
      if (chosen && to !== chosen && (reached.individual > 0 || reached.family > 0)) all = true;
      go(to === "family" ? lastFamily : lastIndividual);
    });
  });
  // § 2.2: Family's one question.
  $$("[data-family]").forEach(function (b) {
    b.addEventListener("click", function () {
      tapped("family", b);
      go({ who: "family", fld: b.getAttribute("data-family") });
    });
  });
  // § 2.2: the Family card's own door is a visitor's without script; with it, the result card's links are Family's door.
  var familyDoor = $("#family-door");
  if (familyDoor) familyDoor.hidden = true;
  // See all plans (the grid) and Why Fit AF? (the /why/ page in a frame, SPEC-why-fit-af § 2 item 3): each a modal dialog
  // its button opens. Esc closes it (the browser's own); so do its close button and a press on the backdrop (the dialog
  // itself, outside its box); focus goes back to the button.
  function modal(dialog, button, close) {
    button.addEventListener("click", function () { dialog.showModal(); });
    close.addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener("close", function () { button.focus(); });
  }
  modal($("#all"), $("#all-link"), $("#all-close"));
  // SPEC-ui-and-copy-pass § 4 B: Not ready? opens the save step in a modal dialog of its own, on the pages carrying it.
  if ($("#not-ready")) modal($("#save-dialog"), $("#not-ready"), $("#save-close"));
  modal($("#why"), $("#why-link"), $("#why-close"));
  // A key pressed with focus inside the frame (after a click or a scroll in it) goes to the frame's document, not the
  // dialog's, so Esc there would not close it: the /why/ page is this site's own, and its Esc closes the dialog too.
  // So does its link back to this site's plan page (SPEC-why-fit-af § 6), which would open the plan page inside its own
  // dialog: pressed, the dialog closes and the frame stays. Any other link in the frame is a link.
  var whyFrame = $("#why-frame");
  function toPlanPage(el) {
    var a = el && el.closest ? el.closest("a[href]") : null;
    return !!a && a.origin === location.origin && a.pathname === "/";
  }
  whyFrame.addEventListener("load", function () {
    var doc = whyFrame.contentDocument;
    if (doc) doc.addEventListener("keydown", function (e) { if (e.key === "Escape") $("#why").close(); });
    if (doc) doc.addEventListener("click", function (e) { if (toPlanPage(e.target)) { e.preventDefault(); $("#why").close(); } });
  });

  // The carousel: one photo shown, the next every CAROUSEL_MS, never under reduced motion (no dots: § 8 item 1).
  var slides = $$("#carousel .slide"), shown = 0;
  if (slides.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setInterval(function () {
      shown = (shown + 1) % slides.length;
      slides.forEach(function (s, j) { s.className = j === shown ? "slide on" : "slide"; });
    }, CAROUSEL_MS);
  }

  window.addEventListener("hashchange", function () { render(arrived(parse(location.hash))); });
  render(state);
})();
