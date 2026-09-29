// SPEC-storefront-watch § 4: the smoke test's pass rule, over what one run recorded (lib/smoke.mjs), so that it is
// tested without a browser (W6). Pass: the console shows `[fitaf-handoff] done: /checkout` and no `stopped:` line;
// the page is /checkout; it lists exactly the chosen names and "<need> items"; and its total is the sum of the
// line prices the order page showed for them (7 × the line price, when the meals cost the same).

export const DONE_LINE = "[fitaf-handoff] done: /checkout";
const STOPPED = "[fitaf-handoff] stopped:";

const money = (cents) => `$${(cents / 100).toFixed(2)}`;

/**
 * `outcome`: { need, chosen: [{ name, priceCents }], console: [lines],
 *              checkout: { path, names: [listed menu names], itemCounts: [N of each "N items"], totalCents } }
 */
export function smokeVerdict(outcome) {
  const { need } = outcome;
  const reasons = [];
  const chosen = outcome.chosen.map((c) => c.name);
  if (chosen.length < need) reasons.push(`only ${chosen.length} of ${need} meals could be chosen from the order page`);

  for (const line of outcome.console) if (line.startsWith(STOPPED)) reasons.push(`the console says "${line}"`);
  if (!outcome.console.includes(DONE_LINE)) reasons.push(`the console never says "${DONE_LINE}"`);

  const c = outcome.checkout ?? {};
  if (c.path !== "/checkout") reasons.push(`the page ended on ${c.path ?? "(unknown)"}, not /checkout`);
  const listed = new Set(c.names ?? []);
  const missing = chosen.filter((n) => !listed.has(n));
  const extra = [...listed].filter((n) => !chosen.includes(n));
  if (missing.length) reasons.push(`chosen but not listed on /checkout: ${missing.join(", ")}`);
  if (extra.length) reasons.push(`listed on /checkout but not chosen: ${extra.join(", ")}`);
  if (!(c.itemCounts ?? []).includes(need)) {
    reasons.push(`/checkout does not say "${need} items" (it says: ${(c.itemCounts ?? []).map((n) => `${n} items`).join(", ") || "nothing"})`);
  }

  const prices = outcome.chosen.map((m) => m.priceCents);
  const unpriced = outcome.chosen.filter((m) => typeof m.priceCents !== "number").map((m) => m.name);
  if (unpriced.length) {
    reasons.push(`the order page showed no line price for: ${unpriced.join(", ")}`);
  } else if (prices.length) {
    const expected = prices.reduce((sum, p) => sum + p, 0);
    const how = new Set(prices).size === 1 ? `${prices.length} × ${money(prices[0])} = ${money(expected)}` : `the chosen meals' prices add to ${money(expected)}`;
    if (c.totalCents !== expected) {
      reasons.push(`/checkout's total is ${typeof c.totalCents === "number" ? money(c.totalCents) : "not found"}; expected ${how}`);
    }
  }
  return { pass: reasons.length === 0, reasons };
}
