// A preview site's page (SPEC-preview-sites.md § 1 item 2): the production page with a planned week's Chef's Choice in
// it, and ORDERING OFF. The build runs this text inside one function, LAST on the page (after app.js and the card's
// script), so its listeners run after theirs.
// - The banner names the week #picks-data holds (its delivery, as the preview's address names it) and keeps "Not yet
//   approved." unless the week's data says `approved: true`: a week whose approval is not known is not called approved.
// - No link leads anywhere: every <a> loses its href and is shown disabled, at once and after every change of the
//   fragment and every click. app.js writes Choose your meals' href at each, and the card's script reads it (the mpid
//   names the size's list) and writes its own two; both run before this. The page holds no store address to begin with:
//   the build writes the grid and Family without one, plan-data's base is empty, and a preview's content has no link.
var picks = JSON.parse(document.getElementById("picks-data").textContent);
var week = picks.weeks.length === 1 ? picks.weeks[0] : null;
if (week) {
  document.getElementById("preview-date").textContent = week.delivery;
  document.getElementById("preview-unapproved").hidden = week.approved === true;
}

function off() {
  var links = document.querySelectorAll("a");
  for (var i = 0; links.length > i; i++) {
    links[i].removeAttribute("href");
    links[i].setAttribute("role", "link");
    links[i].setAttribute("aria-disabled", "true");
  }
}
window.addEventListener("hashchange", off);
document.addEventListener("click", off);
off();
