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
  var result = $("result"), choose = $("result-cta"), list = $("cc-list"), own = $("cc-own");

  // The chosen plan's mpid, as app.js wrote it into the card's link; the count is the menu that links it.
  function chosen() {
    var m = !result.hidden && /[?&]mpid=(\d+)$/.exec(choose.getAttribute("href") || "");
    if (!m) return null;
    for (var count in week.counts) {
      if (week.counts[count].links[m[1]]) return { menu: week.counts[count], link: week.counts[count].links[m[1]] };
    }
    return null;
  }

  // The list is always open (SPEC-plan-page-refinement § 2 item 5): shown whenever the week has picks for the count.
  // Each meal has a tile to the left of its name: its cell of the week's photo sheet (the build's style, from the
  // manifest), or plain, so the rows align.
  function render() {
    var c = chosen();
    choose.hidden = !!c;
    list.hidden = own.hidden = !c;
    if (!c) return;
    $("cc-heading").textContent = c.menu.heading;
    var meals = $("cc-meals");
    while (meals.firstChild) meals.removeChild(meals.firstChild);
    for (var j = 0; c.menu.meals.length > j; j++) {
      var li = document.createElement("li");
      var tile = document.createElement("span");
      tile.className = c.menu.thumbs[j] ? "cc-thumb cc-photo" : "cc-thumb";
      if (c.menu.thumbs[j]) tile.setAttribute("style", c.menu.thumbs[j]);
      var name = document.createElement("span");
      name.className = "cc-name";
      name.textContent = c.menu.meals[j];
      li.appendChild(tile);
      li.appendChild(name);
      meals.appendChild(li);
    }
    $("cc-checkout").href = c.link;
    own.href = choose.getAttribute("href");
  }
  window.addEventListener("hashchange", render);
  render();
}
