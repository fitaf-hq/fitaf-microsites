(function () {
  "use strict";
  var data = JSON.parse(document.getElementById("plan-data").textContent);
  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
  var CAROUSEL_MS = 4000; // one photo every 4 s (SPEC-plan-page-refinement § 2 item 1)

  function findGoal(id) {
    for (var i = 0; i < data.plans.length; i++) if (data.plans[i].id === id) return data.plans[i];
    return null;
  }
  function validCount(n) { return data.counts.indexOf(n) !== -1; }

  // "#family" | "#lean" | "#lean-7" | "#meals-7" | "" -> state
  function parse(hash) {
    var h = hash.replace(/^#/, "");
    if (h === "family") return { tab: "family" };
    var m = /^([a-z]+)(?:-(\d+))?$/.exec(h);
    var goal = m && findGoal(m[1]) ? m[1] : null;
    var count = m && m[2] && validCount(+m[2]) ? +m[2] : null;
    return { tab: "individual", goal: goal, count: count };
  }
  function serialise(s) {
    if (s.tab === "family") return "family";
    if (s.goal && s.count) return s.goal + "-" + s.count;
    if (s.goal) return s.goal;
    if (s.count) return "meals-" + s.count;
    return "individual";
  }

  var state = parse(location.hash);
  var lastIndividual = { tab: "individual", goal: null, count: null };
  function go(next) {
    var h = "#" + serialise(next);
    if (h === location.hash) render(next);
    else location.hash = h; // pushes a history entry; hashchange renders
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
    $$("[data-count]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(+b.getAttribute("data-count") === s.count));
    });
    var plan = s.goal && findGoal(s.goal);
    var cell = plan && s.count && plan.cells[s.count];
    $("#result").hidden = !cell;
    if (plan) $("#result").setAttribute("data-accent", plan.id);
    if (cell) {
      $("#result-title").textContent = plan.name + " · " + s.count + " meals a week";
      $("#result-per-meal").textContent = cell.per_meal;
      $("#result-total").textContent = cell.total;
      $("#result-cta").href = data.base + "?mpid=" + cell.mpid;
    }
  }

  $$("[data-goal]").forEach(function (b) {
    b.addEventListener("click", function () {
      go({ tab: "individual", goal: b.getAttribute("data-goal"), count: state.count });
    });
  });
  $$("[data-count]").forEach(function (b) {
    b.addEventListener("click", function () {
      go({ tab: "individual", goal: state.goal, count: +b.getAttribute("data-count") });
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

  // The carousel: one photo shown, the next every CAROUSEL_MS, never under reduced motion; a dot shows its photo and
  // stops the advance (the visitor has taken over).
  var slides = $$("#carousel .slide"), dots = $$("#carousel .dot"), shown = 0, timer = null;
  function show(i) {
    shown = i;
    slides.forEach(function (s, j) { s.className = j === i ? "slide on" : "slide"; });
    dots.forEach(function (d, j) { d.setAttribute("aria-pressed", String(j === i)); });
  }
  dots.forEach(function (d, j) {
    d.addEventListener("click", function () {
      if (timer !== null) clearInterval(timer);
      timer = null;
      show(j);
    });
  });
  if (slides.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    timer = setInterval(function () { show((shown + 1) % slides.length); }, CAROUSEL_MS);
  }

  window.addEventListener("hashchange", function () { render(parse(location.hash)); });
  render(state);
})();
