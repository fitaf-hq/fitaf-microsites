// This week's Chef's Choice on the result card (SPEC-chefs-choice § 3). The build runs this text inside one function.
// SPEC-week-content § 2.2: the week is the one #picks-data holds (the build's, or the bucket's, which the Worker puts in
// that element); NO DATE DECIDES IT (no clock, no window: valid_from and valid_to may be in the data and are not read).
// More than one week, or none, or none for the chosen answers: the card stays as rung 1 left it.
// Every word shown is data: the card's markup, and #picks-data's heading and lists. This reads what app.js rendered and
// follows its hashchange: whether the card is shown, the ANSWER SET it carries (#result's data-selection: SPEC-meal-
// selection § 8 item 2, "or-5d-b-s"), which names the cart, and the mpid of Choose your meals, which names the size's
// link within it. ⛔ Never the cart by the mpid: one plan is the plan of several answer sets (the 14 of three).
// SPEC-snacks-in-the-cart § 4: while snacks are carted (#picks-data's `carted`), *Add snacks* takes the answer set's
// snack link (its cart's meals, then the week's snack list for its days), and Q4 is shown only where the week has a
// snack list for the chosen days: never an answer the cart cannot hold. With no week live, Q4 is hidden.
// SPEC-week-content § 8: a week whose data says `updating` shows the updating card (#cc-updating, its words the build's)
// in the list's place; an updating week is no week for everything below: no cart, no link, Choose your meals as it is.
// SPEC-every-menu-and-nutrition § 2: a week of more than one list (`menus`) offers, above the list, a radio group of the
// menus with a cart for the answers (#cc-menus), Chef's Choice first; the chosen menu's cart, snacks and links are the
// card's, by the same reading as Chef's Choice's. § 3 and § 11 (the Advisor's review, 2026-10-22): a meal with numbers
// for the chosen size (#result's data-accent, the plan app.js rendered) or ingredients (`facts`) is a row of its tile and
// its name, the whole row a button (§ 10) marked with a circled "i", opening beneath it the size's rings, then the
// ingredients and Contains. What the Worker's shape check does not read (`menus`, `facts`, `rings`) is read here only in
// the shape the content writes.
// SPEC-every-menu-and-nutrition § 11 item 4 (the Advisor's review, 2026-10-22): the store's own rings, as Fit AF's
// Shopify theme copies them from the live order page's meal dialog (fitaf scripts/commerce/theme/snippets/
// fitaf-ring.liquid; assets/fitaf.css .fam-macros). One ring per number, in this order; each arc is the number over its
// daily amount: the store catalogue's recommended_daily_intake (protein 50 g, carbs 275 g, fat 77 g, fiber 28 g) and,
// for calories, the 2,000 the live meal dialog states; `grams` marks the rings whose value is grams. The snippet's
// geometry: a 40-unit square, radius 17 (so the circle's length 2π × 17, the snippet's 106.8), stroke 2.5, the arc
// clamped to 0.06–1 of it. The colours are the style's (style.css), by number.
var RINGS = [
  { fact: "cal", daily: 2000, grams: false },
  { fact: "protein", daily: 50, grams: true },
  { fact: "carbs", daily: 275, grams: true },
  { fact: "fat", daily: 77, grams: true },
  { fact: "fiber", daily: 28, grams: true }
];
var RING_VIEWBOX = 40;
var RING_CENTRE = RING_VIEWBOX / 2;
var RING_RADIUS = 17;
var RING_STROKE = 2.5;
var RING_LENGTH = 2 * Math.PI * RING_RADIUS;
var RING_SHARE_LEAST = 0.06;
var RING_SHARE_MOST = 1;
var SVG_NS = "http://www.w3.org/2000/svg";

var picks = JSON.parse(document.getElementById("picks-data").textContent);
var week = picks.weeks.length === 1 ? picks.weeks[0] : null;
var updatingCard = document.getElementById("cc-updating");
if (week && week.updating === true) { if (updatingCard) updatingCard.hidden = false; week = null; }
var snackQuestion = document.getElementById("q-snacks");
snackQuestion = snackQuestion && snackQuestion.parentNode;
if (week) start(week);
else if (picks.carted && snackQuestion) snackQuestion.hidden = true;

function start(week) {
  var $ = function (id) { return document.getElementById(id); };
  var result = $("result"), choose = $("result-cta"), list = $("cc-list"), own = $("cc-own");
  var snackBox = $("cc-snacks"); // only while Q4 is on the page (§ 9 item 3)
  var group = $("cc-menus"); // SPEC-every-menu-and-nutrition § 2: the chooser
  var has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  var isList = Array.isArray;
  var isMap = function (v) { return v !== null && typeof v === "object" && !isList(v); };
  var isText = function (v) { return typeof v === "string"; };

  // § 2: the week's menus in the words' order, Chef's Choice first (its carts and snacks the week's own); a week of one
  // list carries none, and the card is as it was. Read only in the shape the content writes (each other menu's carts and
  // snacks as the Worker checks the week's: lines, tiles and links), else as one list.
  var isLines = function (v) { return isMap(v) && isList(v.meals) && isList(v.thumbs); };
  var isCart = function (c) { return isLines(c) && isMap(c.links) && (c.snack_links === undefined || isMap(c.snack_links)); };
  var each = function (o, ok) { return isMap(o) && Object.keys(o).every(function (k) { return ok(o[k]); }); };
  var menus = (function (m) {
    if (!isList(m) || 2 > m.length) return [];
    for (var i = 0; m.length > i; i++) {
      if (!isMap(m[i]) || !isText(m[i].list) || !isText(m[i].name)) return [];
      if (i && (!each(m[i].carts, isCart) || (m[i].snacks !== undefined && !each(m[i].snacks, isLines)))) return [];
    }
    return m;
  })(week.menus);
  var picked = menus.length ? menus[0].list : null; // the menu chosen: Chef's Choice first (§ 2 item 2)
  var cartsOf = function (menu) { return menu && menu.carts ? menu.carts : week.carts; };
  var snacksOf = function (menu) { return menu && menu.carts ? menu.snacks : week.snacks; };
  function menuNamed(id) {
    for (var i = 0; menus.length > i; i++) if (menus[i].list === id) return menus[i];
    return null;
  }
  // § 3: the week's nutrition entries; a cart's `facts` names each meal's entry, or null. § 11: the rings' words (a label
  // per number, and the value of grams), without which no ring is drawn.
  var entries = isList(week.facts) ? week.facts : [];
  var ringWords = (function (w) {
    var ok = isMap(w) && isMap(w.labels) && isText(w.grams) && RINGS.every(function (r) { return isText(w.labels[r.fact]); });
    return ok ? w : null;
  })(week.rings);
  var opened = {}; // the meals left open, by menu, answers and place: kept while only the size changes

  // The answer set the card shows ("" when it is hidden): the fragment's answer part, snacks mark and all.
  function selection() {
    return result.hidden ? "" : result.getAttribute("data-selection") || "";
  }

  // The chosen answers' cart in `menu` (the selection without its snacks mark), and in it the chosen size's link (by its
  // mpid): with snacks chosen and carted, the cart's snack link (SPEC-snacks-in-the-cart § 4.2), else today's.
  function chosen(sel, menu) {
    var key = sel.replace(/-s$/, "");
    var carts = cartsOf(menu);
    var cart = has(carts, key) ? carts[key] : null;
    var m = cart && /[?&]mpid=(\d+)$/.exec(choose.getAttribute("href") || "");
    var links = cart && ((/-s$/.test(sel) && cart.snack_links) || cart.links);
    return m && has(links, m[1]) ? { menu: cart, link: links[m[1]] } : null;
  }

  // § 3 item 3, § 11 item 4.2: a meal's numbers for the chosen size only (all five, each a number), never another size's.
  function numbersFor(all, size) {
    return isMap(all) && has(all, size) && isNumbers(all[size]) ? all[size] : null;
  }
  function isNumbers(n) {
    return isMap(n) && RINGS.every(function (r) { return typeof n[r.fact] === "number"; });
  }

  function appendAll(parent, children) {
    children.forEach(function (child) { parent.appendChild(child); });
  }
  function svgOf(tag, attributes) {
    var el = document.createElementNS(SVG_NS, tag);
    for (var name in attributes) el.setAttribute(name, String(attributes[name]));
    return el;
  }

  // § 11 item 3: the mark, a circled "i" (a circle, the i's dot and its stem) in currentColor, hidden from assistive
  // technology, the same whether the meal is open or closed (the open state is the panel and aria-expanded). It says
  // "more", never the + of adding a meal (§ 10 item 2).
  function infoMark() {
    var mark = svgOf("svg", { "class": "cc-mark", viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" });
    appendAll(mark, [
      svgOf("circle", { cx: 12, cy: 12, r: 10.5, fill: "none", stroke: "currentColor", "stroke-width": 1.75 }),
      svgOf("circle", { cx: 12, cy: 7.25, r: 1.4, fill: "currentColor" }),
      svgOf("line", { x1: 12, y1: 10.75, x2: 12, y2: 17.25, stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round" })
    ]);
    return mark;
  }

  // § 11 item 4.3: one ring (the store's, fitaf-ring.liquid): a track and an arc in a 40-unit square, the arc the number
  // over its daily amount (clamped), from 12 o'clock with round caps, its colour the style's by `spec.fact`; the value in
  // the middle (the words' grams after all but calories) and the label beneath, each text in the page's text colour.
  // The circle is hidden from assistive technology: the value and the label are its words.
  function ring(spec, n) {
    var share = Math.min(RING_SHARE_MOST, Math.max(RING_SHARE_LEAST, n / spec.daily));
    var box = document.createElement("div");
    box.className = "cc-ring cc-ring-" + spec.fact;
    var circle = { cx: RING_CENTRE, cy: RING_CENTRE, r: RING_RADIUS, fill: "none", "stroke-width": RING_STROKE };
    var svg = svgOf("svg", { viewBox: "0 0 " + RING_VIEWBOX + " " + RING_VIEWBOX, "aria-hidden": "true", focusable: "false" });
    var track = svgOf("circle", circle);
    track.setAttribute("class", "cc-track");
    var arc = svgOf("circle", circle);
    arc.setAttribute("class", "cc-arc");
    arc.setAttribute("stroke-dasharray", (share * RING_LENGTH).toFixed(2) + " " + RING_LENGTH.toFixed(2));
    arc.setAttribute("stroke-linecap", "round");
    arc.setAttribute("transform", "rotate(-90 " + RING_CENTRE + " " + RING_CENTRE + ")");
    appendAll(svg, [track, arc]);
    var value = document.createElement("span");
    value.className = "cc-ring-value";
    value.textContent = spec.grams ? ringWords.grams.replace("{n}", String(n)) : String(n);
    var label = document.createElement("span");
    label.className = "cc-ring-label";
    label.textContent = ringWords.labels[spec.fact];
    appendAll(box, [svg, value, label]);
    return box;
  }
  // § 11 item 4.1: the five rings in their order, in one row the style wraps.
  function ringsOf(numbers) {
    var row = document.createElement("div");
    row.className = "cc-rings";
    RINGS.forEach(function (spec) { row.appendChild(ring(spec, numbers[spec.fact])); });
    return row;
  }

  // A meal with its entry (§ 3, § 11): with numbers for the chosen size or ingredients, § 10 item 1 and § 11 item 2: the
  // WHOLE ROW (its tile and its name) is the button opening the panel beneath it (aria-expanded, aria-controls), a second
  // press closing it, each meal on its own, its mark a circled "i"; the panel the size's rings, then the ingredients and
  // Contains (§ 11 item 4). A meal with neither keeps the row it always had: no panel, no mark.
  function detail(li, tile, name, entry, place) {
    var numbers = ringWords ? numbersFor(entry.nutrition, result.getAttribute("data-accent")) : null;
    var more = isText(entry.ingredients) ? entry.ingredients : null;
    if (!numbers && !more) return appendAll(li, [tile, name]);
    li.className = "cc-control";
    var meal = document.createElement("button");
    meal.type = "button";
    meal.className = "cc-meal";
    var mark = infoMark();
    appendAll(meal, [tile, name, mark]);
    li.appendChild(meal);
    var panel = document.createElement("div");
    panel.className = "cc-more";
    panel.id = "cc-more-" + place.split("|").pop();
    if (numbers) panel.appendChild(ringsOf(numbers));
    if (more) {
      var ingredients = document.createElement("p");
      ingredients.textContent = more;
      panel.appendChild(ingredients);
    }
    if (more && isText(entry.contains)) {
      var contains = document.createElement("p");
      contains.textContent = entry.contains;
      panel.appendChild(contains);
    }
    li.appendChild(panel);
    meal.setAttribute("aria-controls", panel.id);
    var show = function (open) {
      meal.setAttribute("aria-expanded", String(open));
      panel.hidden = !open;
    };
    show(!!opened[place]);
    meal.addEventListener("click", function () {
      opened[place] = meal.getAttribute("aria-expanded") !== "true";
      show(opened[place]);
    });
  }

  // A list of meals, each with a tile to the left of its name: its cell of the week's photo sheet (the build's style,
  // from the manifest), or plain, so the rows align (SPEC-plan-page-refinement § 2 item 5). `facts` (a cart's, § 3)
  // gives a meal its nutrition; `id` names the list for the meals left open.
  function fill(ul, lines, thumbs, facts, id) {
    while (ul.firstChild) ul.removeChild(ul.firstChild);
    for (var j = 0; lines.length > j; j++) {
      var li = document.createElement("li");
      var tile = document.createElement("span");
      tile.className = thumbs[j] ? "cc-thumb cc-photo" : "cc-thumb";
      if (thumbs[j]) tile.setAttribute("style", thumbs[j]);
      var name = document.createElement("span");
      name.className = "cc-name";
      name.textContent = lines[j];
      var at = isList(facts) && typeof facts[j] === "number" ? entries[facts[j]] : null;
      if (isMap(at)) detail(li, tile, name, at, id + "|" + j);
      else appendAll(li, [tile, name]);
      ul.appendChild(li);
    }
  }

  // Add snacks (§ 9 item 3): the chosen menu's snacks for the chosen days under their heading, and the not-carted line;
  // with no list for those days, the line alone. While not carted, snacks are shown, never in a link. While carted
  // (SPEC-snacks-in-the-cart § 4.3–4.5) the line is not on the page, the list is in the link, and Q4 is hidden for days
  // with no list (so is the box, whatever the fragment says).
  function renderSnacks(sel, menu) {
    if (!snackBox) return;
    var days = /-(\d+d)(?:-|$)/.exec(sel);
    var all = snacksOf(menu);
    var snacks = days && isMap(all) && has(all, days[1]) ? all[days[1]] : null;
    if (picks.carted && snackQuestion) snackQuestion.hidden = !snacks;
    var on = /-s$/.test(sel) && !(picks.carted && !snacks);
    snackBox.hidden = !on;
    if (!on) return;
    $("cc-snacks-heading").hidden = $("cc-snack-list").hidden = !snacks;
    if (snacks) fill($("cc-snack-list"), snacks.meals, snacks.thumbs);
  }

  // § 2 item 1: the radios of the menus offered, in their order, the chosen one checked; shown when there are two or
  // more. Rebuilt only when the menus offered change, so a radio keeps the focus the arrow keys gave it. A week of one
  // list never touches the group (item 4: the card as it was).
  var offeredShown = "", radios = [];
  function renderMenus(offered) {
    if (!group || !menus.length) return;
    group.hidden = 2 > offered.length;
    var ids = offered.map(function (m) { return m.list; }).join("\n");
    if (ids !== offeredShown) {
      offeredShown = ids;
      while (group.firstChild) group.removeChild(group.firstChild);
      radios = group.hidden ? [] : offered.map(function (m) {
        var label = document.createElement("label");
        label.className = "cc-menu";
        var radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "cc-menu";
        radio.value = m.list;
        var name = document.createElement("span");
        name.textContent = m.name;
        label.appendChild(radio);
        label.appendChild(name);
        group.appendChild(label);
        return radio;
      });
    }
    radios.forEach(function (radio) { radio.checked = radio.value === picked; });
  }
  if (group && menus.length) {
    group.addEventListener("change", function (e) {
      if (!e.target || e.target.name !== "cc-menu") return;
      picked = e.target.value;
      render();
    });
  }

  // The list is always open (SPEC-plan-page-refinement § 2 item 5): shown whenever the week has a cart for the answers.
  // § 2 item 3: an answer change keeps the chosen menu when it has a cart for the new answers, else Chef's Choice.
  function render() {
    var sel = selection();
    var key = sel.replace(/-s$/, "");
    var offered = menus.filter(function (m) { return sel && has(cartsOf(m), key); });
    if (sel && menus.length && !offered.some(function (m) { return m.list === picked; })) picked = menus[0].list;
    var menu = menuNamed(picked);
    var c = sel ? chosen(sel, menu) : null;
    choose.hidden = !!c;
    list.hidden = own.hidden = !c;
    renderMenus(c ? offered : []);
    renderSnacks(sel, menu);
    if (!c) return;
    $("cc-heading").textContent = c.menu.heading;
    fill($("cc-meals"), c.menu.meals, c.menu.thumbs, c.menu.facts, picked + "|" + key);
    $("cc-checkout").href = c.link;
    own.href = choose.getAttribute("href");
  }
  window.addEventListener("hashchange", render);
  render();
}
