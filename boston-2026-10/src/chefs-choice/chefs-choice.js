// This week's Chef's Choice on the result card (SPEC-chefs-choice § 2, § 3). The build runs this text inside one
// function, after the offer's own zoned-date helpers (zonedDate, isLive). The week is the one whose window holds
// today's date in the enterprise's zone; with none, or none for the chosen answers, the card stays as rung 1 left it.
// Every word shown is data: the card's markup, and #picks-data's heading and lists. This reads what app.js rendered and
// follows its hashchange: whether the card is shown, the ANSWER SET it carries (#result's data-selection: SPEC-meal-
// selection § 8 item 2, "or-5d-b-s"), which names the cart, and the mpid of Choose your meals, which names the size's
// link within it. ⛔ Never the cart by the mpid: one plan is the plan of several answer sets (the 14 of three).
var picks = JSON.parse(document.getElementById("picks-data").textContent);
var today = zonedDate(Date.now(), picks.zone);
var week = null;
for (var i = 0; !week && picks.weeks.length > i; i++) if (isLive(picks.weeks[i], today)) week = picks.weeks[i];
if (week) start(week);

function start(week) {
  var $ = function (id) { return document.getElementById(id); };
  var result = $("result"), choose = $("result-cta"), list = $("cc-list"), own = $("cc-own");
  var snackBox = $("cc-snacks"); // only while Q4 is on the page (§ 9 item 3)
  var has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  // The answer set the card shows ("" when it is hidden): the fragment's answer part, snacks mark and all.
  function selection() {
    return result.hidden ? "" : result.getAttribute("data-selection") || "";
  }

  // The chosen answers' cart (the selection without its snacks mark), and in it the chosen size's link (by its mpid).
  function chosen(sel) {
    var key = sel.replace(/-s$/, "");
    var cart = has(week.carts, key) ? week.carts[key] : null;
    var m = cart && /[?&]mpid=(\d+)$/.exec(choose.getAttribute("href") || "");
    return m && has(cart.links, m[1]) ? { menu: cart, link: cart.links[m[1]] } : null;
  }

  // A list of meals, each with a tile to the left of its name: its cell of the week's photo sheet (the build's style,
  // from the manifest), or plain, so the rows align (SPEC-plan-page-refinement § 2 item 5).
  function fill(ul, lines, thumbs) {
    while (ul.firstChild) ul.removeChild(ul.firstChild);
    for (var j = 0; lines.length > j; j++) {
      var li = document.createElement("li");
      var tile = document.createElement("span");
      tile.className = thumbs[j] ? "cc-thumb cc-photo" : "cc-thumb";
      if (thumbs[j]) tile.setAttribute("style", thumbs[j]);
      var name = document.createElement("span");
      name.className = "cc-name";
      name.textContent = lines[j];
      li.appendChild(tile);
      li.appendChild(name);
      ul.appendChild(li);
    }
  }

  // Add snacks (§ 9 item 3): the week's snacks for the chosen days under their heading, and the not-carted line; with no
  // list for those days, the line alone. Snacks are shown, never in a link.
  function renderSnacks(sel) {
    if (!snackBox) return;
    var on = /-s$/.test(sel);
    snackBox.hidden = !on;
    if (!on) return;
    var days = /-(\d+d)(?:-|$)/.exec(sel)[1];
    var snacks = week.snacks && has(week.snacks, days) ? week.snacks[days] : null;
    $("cc-snacks-heading").hidden = $("cc-snack-list").hidden = !snacks;
    if (snacks) fill($("cc-snack-list"), snacks.meals, snacks.thumbs);
  }

  // The list is always open (SPEC-plan-page-refinement § 2 item 5): shown whenever the week has a cart for the answers.
  function render() {
    var sel = selection();
    var c = sel ? chosen(sel) : null;
    choose.hidden = !!c;
    list.hidden = own.hidden = !c;
    renderSnacks(sel);
    if (!c) return;
    $("cc-heading").textContent = c.menu.heading;
    fill($("cc-meals"), c.menu.meals, c.menu.thumbs);
    $("cc-checkout").href = c.link;
    own.href = choose.getAttribute("href");
  }
  window.addEventListener("hashchange", render);
  render();
}
