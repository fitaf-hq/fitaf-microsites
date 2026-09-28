(function () {
  "use strict";
  // Flow 2's share panel (flows/02 § 2): "What share of my day is that?" Development build only.
  // ⛔ The two targets live in this closure and nowhere else: not sent, not stored, not in the URL or the
  // fragment. `shareLines` and `parseTarget` are inlined by the build from src/save/calculator.js.
  var sizes = JSON.parse(document.getElementById("save-data").textContent).sizes;
  var el = function (id) { return document.getElementById(id); };

  // The size and count are Flow 2's, read from its fragment (#signature-14); never written here.
  function chosen() {
    var m = /^#([a-z]+)-(\d+)$/.exec(location.hash);
    if (!m) return { size: null, count: null };
    for (var i = 0; i < sizes.length; i++) if (sizes[i].id === m[1]) return { size: sizes[i], count: +m[2] };
    return { size: null, count: null };
  }

  var state = { protein: null, calories: null, size: null, count: null };

  function render(s) {
    var lines = s.size && s.count ? shareLines(s.size, s.count, { protein: s.protein, calories: s.calories }) : null;
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
    var next = { protein: state.protein, calories: state.calories, size: state.size, count: state.count };
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
