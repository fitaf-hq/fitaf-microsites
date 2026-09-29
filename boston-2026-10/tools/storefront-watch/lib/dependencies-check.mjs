// SPEC-storefront-watch § 3, F2: each literal of storefront/dependencies.json found, exactly and case-sensitively,
// in at least one fetched file. Self-contained (no imports), so test W3 can run a mutated copy of it.

/** `texts`: Map(file name -> text), every file F1 fetched. */
export function checkDependencies(dependencies, texts) {
  const names = [...texts.keys()];
  const found = [];
  const missing = [];
  for (const dep of dependencies.literals) {
    const where = names.filter((name) => texts.get(name).includes(dep.literal));
    if (where.length) found.push({ id: dep.id, literal: dep.literal, files: where });
    else missing.push(dep);
  }
  return { ran: true, flag: missing.length > 0, found: found.length, total: dependencies.literals.length, missing, where: found };
}
