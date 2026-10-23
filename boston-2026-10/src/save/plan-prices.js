(function () {
  "use strict";
  // See all plans as discounts (SPEC-ui-and-copy-pass § 1 item 7, the Advisor's note f-meal-count: "the See All Plans
  // modal should show this all as discounts"; the contract's default until he says what he meant): while an offer is
  // current, each plan's weekly price in the grid (#all) is struck through, its price after the offer beside it. The offer
  // is the Worker's own choice, on the date in its send time zone (offerForSave and zonedDate, inlined as Flow 1 has
  // them); the prices after it are the build's (save-data's offers[].after, by the grid's cell: money in one place).
  // Written once, as text; an offer without them, or none current, leaves the grid as built.
  var cfg = JSON.parse(document.getElementById("save-data").textContent);
  var offer = null;
  try {
    offer = offerForSave(zonedDate(Date.now(), cfg.send_time_zone), cfg.offers);
  } catch (e) {
    offer = null; // the file breaks its at-most-one rule: Flow 1 shows no offer, so no price after one
  }
  if (!offer || !offer.after) return;
  var cells = document.querySelectorAll("#all [data-cell]");
  for (var i = 0; cells.length > i; i++) {
    var after = offer.after[cells[i].getAttribute("data-cell")];
    var total = cells[i].querySelector("small");
    if (!after || !total) continue;
    var was = document.createElement("s");
    was.textContent = total.textContent;
    var now = document.createElement("span");
    now.className = "cell-after";
    now.textContent = after;
    total.textContent = "";
    total.appendChild(was);
    total.appendChild(document.createTextNode(" "));
    total.appendChild(now);
  }
})();
