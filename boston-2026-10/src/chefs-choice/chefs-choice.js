// This week's Chef's Choice on the result card (SPEC-chefs-choice § 2, § 3). The build runs this text inside one
// function, after the offer's own zoned-date helpers (zonedDate, isLive). The week is the one whose window holds
// today's date in the enterprise's zone; with none, or none for the chosen count, the card stays as rung 1 left it.
// Every word shown is data: the card's markup, and #picks-data's heading and list. app.js is not changed: this reads
// what it rendered (the card shown or not, and the mpid it put in the card's link) and follows its hashchange.
var picks = JSON.parse(document.getElementById("picks-data").textContent);
var today = zonedDate(Date.now(), picks.zone);
var week = null;
for (var i = 0; !week && picks.weeks.length > i; i++) if (isLive(picks.weeks[i], today)) week = picks.weeks[i];
if (week) start(week);

function start(week) {
  var $ = function (id) { return document.getElementById(id); };
  var result = $("result"), choose = $("result-cta"), toggle = $("cc-toggle"), list = $("cc-list"), own = $("cc-own");

  // The chosen plan's mpid, as app.js wrote it into the card's link; the count is the menu that links it.
  function chosen() {
    var m = !result.hidden && /[?&]mpid=(\d+)$/.exec(choose.getAttribute("href") || "");
    if (!m) return null;
    for (var count in week.counts) {
      if (week.counts[count].links[m[1]]) return { menu: week.counts[count], link: week.counts[count].links[m[1]] };
    }
    return null;
  }

  function render() {
    var c = chosen();
    choose.hidden = !!c;
    toggle.hidden = own.hidden = !c;
    list.hidden = !c || toggle.getAttribute("aria-expanded") !== "true";
    if (!c) return;
    $("cc-heading").textContent = c.menu.heading;
    var meals = $("cc-meals");
    while (meals.firstChild) meals.removeChild(meals.firstChild);
    for (var j = 0; c.menu.meals.length > j; j++) {
      var li = document.createElement("li");
      li.textContent = c.menu.meals[j];
      meals.appendChild(li);
    }
    $("cc-checkout").href = c.link;
    own.href = choose.getAttribute("href");
  }

  toggle.addEventListener("click", function () {
    var open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    list.hidden = !open;
  });
  window.addEventListener("hashchange", render);
  render();
}
