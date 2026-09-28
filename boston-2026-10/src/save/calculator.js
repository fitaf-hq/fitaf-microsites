// The share calculator's arithmetic (flows/02 § 2) — the ONE place the page does arithmetic on the
// person's numbers. For each target given, independently: range ÷ target per meal and per day, and for
// calories the remainder "from the rest of your day" (target − the day's meals, never below 0). Rounded
// to whole numbers and shown as ranges. No advice, no validation against anything, no reaction.
//
// Self-contained (no imports, every helper inside) because build.mjs inlines its source into the page;
// the tests import it from here.
export function shareLines(size, mealsPerWeek, targets) {
  var DAYS_PER_WEEK = 7;
  var perDay = mealsPerWeek / DAYS_PER_WEEK;
  var n = function (x) { return Math.round(x).toLocaleString("en-US"); };
  var pct = function (part, whole) { return Math.round((part / whole) * 100); };
  var range = function (lo, hi, unit) { return n(lo) + "–" + n(hi) + unit; };
  var meals = perDay === 1 ? "your 1 meal" : "your " + perDay + " meals";

  var given = [];
  if (targets.protein) given.push(n(targets.protein) + " g protein");
  if (targets.calories) given.push(n(targets.calories) + " cal");
  if (!given.length) return null;

  var out = {
    targets: "Your targets: " + given.join(" · ") + " a day · " + size.name + ", " + mealsPerWeek +
      " meals a week (" + perDay + " a day)",
    protein: null,
    calories: null,
  };
  if (targets.protein) {
    var p = size.protein_g, tp = targets.protein;
    out.protein = "Protein: each meal " + range(pct(p.min, tp), pct(p.max, tp), " %") + " · " + meals + " " +
      range(pct(p.min * perDay, tp), pct(p.max * perDay, tp), " %") + " of the day";
  }
  if (targets.calories) {
    var c = size.calories, tc = targets.calories;
    out.calories = "Calories: each meal " + range(pct(c.min, tc), pct(c.max, tc), " %") + " · " + meals + " " +
      range(pct(c.min * perDay, tc), pct(c.max * perDay, tc), " %") + " · " +
      range(Math.max(0, tc - c.max * perDay), Math.max(0, tc - c.min * perDay), " cal") + " from the rest of your day";
  }
  return out;
}

/** A typed target -> a positive number, or null (empty or not a number: nothing to compute). */
export function parseTarget(text) {
  var t = String(text).replace(/,/g, "").trim();
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  var v = Number(t);
  return v > 0 ? v : null;
}
