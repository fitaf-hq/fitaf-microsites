// The QR event a page was opened with (SPEC-analytics.md § 9 item 2; SPEC-save-offer-production.md § 9 item 2): the `?e=`
// code of its URL when that code is one of `ids` (data/events.json's), else "". ONE reading: the analytics beacon's
// `open` (src/analytics.js) and the save step's event (src/save/flow1.js) both call it. Self-contained (no imports): the
// build inlines its source at the head of the page's analytics script, before either reads it.
export function qrEvent(search, ids) {
  var m = /(?:^|[?&])e=([^&#]*)/.exec(search || "");
  return m && ids.indexOf(m[1]) >= 0 ? m[1] : "";
}
