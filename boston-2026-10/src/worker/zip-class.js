// The ZIP check of flows/01 § 5: "in" (on the delivery list), "near" (the ring just outside it), or "far".
// ⚠ The list is a MOCK (data/delivery-zips.json). This one function runs in the Worker AND in the page:
// build.mjs inlines its source, so the page's check and the Worker's cannot drift apart.
// Self-contained on purpose (no imports, no helpers outside it) so its source can be inlined.
export function classifyZip(zip, zips) {
  var key = zips.match === "exact" ? zip : zip.slice(0, 3);
  var has = function (list) {
    for (var i = 0; i < list.length; i++) if (list[i].prefix === key || list[i].zip === key) return true;
    return false;
  };
  if (has(zips.prefixes)) return "in";
  if (has(zips.near_ring || [])) return "near";
  return "far";
}
