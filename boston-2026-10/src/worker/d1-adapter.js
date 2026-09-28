// A D1 binding as the { all(sql), batch(sqls) } adapter that purge.js, lapse.js and erase.js take — the
// same shape scripts/d1-cli.mjs gives over the wrangler CLI, so one module serves the Worker and a CLI.
export function d1Adapter(d1) {
  return {
    all: async (sql) => (await d1.prepare(sql).all()).results,
    batch: async (sqls) => d1.batch(sqls.map((s) => d1.prepare(s))),
  };
}
