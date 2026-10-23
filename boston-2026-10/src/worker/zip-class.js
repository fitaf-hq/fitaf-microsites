// The ZIP check of flows/01 § 5: "in" (on the delivery list), "near" (the ring just outside it), or "far".
// The list (data/delivery-zips.json) is the store's official one since SPEC-save-offer-production § 10: five-digit codes,
// "match": "exact". ⚠ Its near ring is still a MOCK, by three-digit prefix whatever the list's match. This one function
// runs in the Worker AND in the page: build.mjs inlines its source, so the page's check and the Worker's cannot drift apart.
// Self-contained on purpose (no imports, no helpers outside it) so its source can be inlined.
export function classifyZip(zip, zips) {
  var has = function (list, key) {
    for (var i = 0; i < list.length; i++) if (list[i].prefix === key || list[i].zip === key) return true;
    return false;
  };
  if (has(zips.prefixes, zips.match === "exact" ? zip : zip.slice(0, 3))) return "in";
  if (has(zips.near_ring || [], zip.slice(0, 3))) return "near";
  return "far";
}
