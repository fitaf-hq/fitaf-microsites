(function () {
  "use strict";
  // See all plans as discounts (SPEC-ui-and-copy-pass § 1 item 7, the Advisor's note f-meal-count: "the See All Plans
  // modal should show this all as discounts"; § 1.2 item 2, his ruling: "The HMP storefront *effectively* has the
  // discount applied. The microsite shows the un-discounted price struck through"): while an offer is current, each
  // plan's weekly price in the grid (#all) is the store's, the price paid, and beside it, struck through, that price
  // before the offer's share, the higher one. The offer is the Worker's own choice, on the date in its send time zone
  // (offerForSave and zonedDate, inlined as Flow 1 has them); the struck prices are the build's (save-data's
  // offers[].struck, by the grid's cell: money in one place). Written once, as text; an offer without them, or none
  // current, leaves the grid as built.
  var cfg = JSON.parse(document.getElementById("save-data").textContent);
  var offer = null;
  try {
    offer = offerForSave(zonedDate(Date.now(), cfg.send_time_zone), cfg.offers);
  } catch (e) {
    offer = null; // the file breaks its at-most-one rule: Flow 1 shows no offer, so no price after one
  }
  if (!offer || !offer.struck) return;
  var cells = document.querySelectorAll("#all [data-cell]");
  for (var i = 0; cells.length > i; i++) {
    var struck = offer.struck[cells[i].getAttribute("data-cell")];
    var total = cells[i].querySelector("small");
    if (!struck || !total) continue;
    var was = document.createElement("s");
    was.textContent = struck;
    var now = document.createElement("span");
    now.className = "cell-now";
    now.textContent = total.textContent;
    total.textContent = "";
    total.appendChild(was);
    total.appendChild(document.createTextNode(" "));
    total.appendChild(now);
  }
  // SPEC-ui-and-copy-pass § 7 (the Advisor, 2026-10-26: "Let's do B2 and drop the meal count please"): while the same
  // offer is current, the result card's price carries, on a line of its own above the store's, its weekly total before
  // the offer's share, struck through (#result-struck, hidden as built). Its figure is the build's (save-data's
  // offers[].struck_result, by the card's plan, #result's data-accent, and its answer set, data-selection without its
  // snacks mark); this script only shows it, on the page and on each hashchange, after app.js has drawn the card (its
  // listener runs first).
  var result = document.getElementById("result");
  var line = document.getElementById("result-struck");
  var figure = document.getElementById("result-struck-total");
  var byPlan = offer.struck_result;
  var has = function (o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); };
  if (!result || !line || !figure || !byPlan) return;
  function showStruck() {
    var plan = result.getAttribute("data-accent");
    var key = (result.getAttribute("data-selection") || "").replace(/-s$/, "");
    var value = !result.hidden && has(byPlan, plan) && has(byPlan[plan], key) ? byPlan[plan][key] : "";
    figure.textContent = value;
    line.hidden = !value;
  }
  window.addEventListener("hashchange", showStruck);
  showStruck();
})();
