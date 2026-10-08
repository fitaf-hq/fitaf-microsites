(function () {
  "use strict";
  // Flow 2's share panel (flows/02 § 2): "What share of my day is that?" Development build only.
  // ⛔ The two targets live in this closure and nowhere else: not sent, not stored, not in the URL or the
  // fragment. `shareLines`, `parseTarget` and `mealsADayOf` are inlined by the build from src/save/calculator.js.
  var sizes = JSON.parse(document.getElementById("save-data").textContent).sizes;
  var el = function (id) { return document.getElementById(id); };

  // The size and the answers are Flow 2's, read off the result card app.js renders (SPEC-meal-selection § 8 item 7: its
  // size, data-accent, and its answer set, data-selection, which today's #signature-14 and the new #signature-and-7d
  // both give); never written here. Nothing chosen while the card is hidden.
  function chosen() {
    var none = { size: null, day: null };
    var result = el("result");
    var day = result && !result.hidden ? mealsADayOf(result.getAttribute("data-selection")) : null;
    if (!day) return none;
    for (var i = 0; i < sizes.length; i++) if (sizes[i].id === result.getAttribute("data-accent")) return { size: sizes[i], day: day };
    return none;
  }

  var state = { protein: null, calories: null, size: null, day: null };

  function render(s) {
    var targets = { protein: s.protein, calories: s.calories };
    var lines = s.size && s.day ? shareLines(s.size, s.day.perDay, s.day.days, targets) : null;
    el("share-hint").hidden = !!lines;
    el("share-out").hidden = !lines;
    el("share-targets").textContent = lines ? lines.targets : "";
    el("share-protein-line").hidden = !(lines && lines.protein);
    el("share-protein-line").textContent = lines && lines.protein ? lines.protein : "";
    el("share-calories-line").hidden = !(lines && lines.calories);
    el("share-calories-line").textContent = lines && lines.calories ? lines.calories : "";
  }
  function go(next) {
    state = next;
    render(state);
  }
  function copy(extra) {
    var next = { protein: state.protein, calories: state.calories, size: state.size, day: state.day };
    for (var k in extra) next[k] = extra[k];
    return next;
  }

  // ---- transitions ----
  function enterProtein() { go(copy({ protein: parseTarget(el("share-protein").value) })); }
  function enterCalories() { go(copy({ calories: parseTarget(el("share-calories").value) })); }
  function choiceChanged() { go(copy(chosen())); }

  el("share-protein").addEventListener("input", enterProtein);
  el("share-calories").addEventListener("input", enterCalories);
  window.addEventListener("hashchange", choiceChanged);
  go(copy(chosen()));
})();
