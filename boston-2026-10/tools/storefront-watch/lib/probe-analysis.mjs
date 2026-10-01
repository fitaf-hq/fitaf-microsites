// SPEC-rung2-fill-c § 2: the probe's reading of one run's change log (lib/probe-counts.mjs records it). Pure: no browser.
// Times are on the page's own clock; in the run's file they are relative to the FIRST press (ms, to 0.1), and each
// press's latencies relative to ITS press. The recorder reads every 50 ms and logs a value only when it changes, so a
// time "until X" is the first read that showed X: good to the next read, never earlier than it was. One exception: a
// card that already showed its count when the press's .click() returned is acknowledged at that return.

/** A card (or the phone card, or a sidebar row) acknowledges with a count of 1 or more and no Add to Cart beside it. */
export const isCount = (v) => typeof v === "string" && /^count [1-9]\d*$/.test(v);
const countOf = (v) => (typeof v === "string" && /^count \d+$/.test(v) ? Number(v.slice(6)) : null);
/** "2 items" → 2, "2" → 2; absent (null) or "absent" → 0; anything else null. */
export function numberOf(v) {
  if (v === null || v === undefined || v === "absent") return 0;
  const m = /^(\d+)/.exec(v);
  return m ? Number(m[1]) : null;
}
const round1 = (ms) => Math.round(ms * 10) / 10;
const KEYS = { card: "card", mcard: "mobile", row: "row" };

function timelines(changes) {
  const tl = new Map();
  for (const [t, k, v] of changes) {
    if (!tl.has(k)) tl.set(k, []);
    tl.get(k).push([t, v]);
  }
  return tl;
}
function valueAt(tl, k, t) {
  let v = null;
  for (const [ct, cv] of tl.get(k) ?? []) {
    if (ct > t) break;
    v = cv;
  }
  return v;
}
/** The first read at or after `t` whose value satisfies `ok` (the value already showing at `t` counts, at `t`). */
function firstFrom(tl, k, t, ok) {
  if (ok(valueAt(tl, k, t))) return t;
  for (const [ct, cv] of tl.get(k) ?? []) if (ct > t && ok(cv)) return ct;
  return null;
}
export function parseButton(v) {
  if (v === null || v === undefined) return null;
  const [text, enabled, shown] = v.split("|");
  return { text, disabled: enabled === "disabled", shown: shown === "shown" };
}

/** A count that went DOWN, per meal (card, phone card, sidebar row) and for the plan (items, phoneItems, pending). */
function lookForTakeBacks(tl, chosen, presses, ackAt, T0) {
  const takeBacks = [];
  const glitches = [];
  chosen.forEach((meal, i) => {
    for (const [prefix, key] of Object.entries(KEYS)) {
      let best = 0;
      let prev = null;
      for (const [t, v] of tl.get(`${prefix}.${i}`) ?? []) {
        const c = countOf(v);
        const at = { key, index: i, meal, t: round1(t - T0), sincePressMs: presses[i] ? round1(t - presses[i].t0) : null, sinceAckMs: ackAt[i] === null ? null : round1(t - ackAt[i]), from: prev, to: v };
        if (c !== null) {
          if (c < best) takeBacks.push(at);
          best = Math.max(best, c);
        } else if (best >= 1) {
          if (v === "add" || v === "absent") {
            takeBacks.push(at);
            best = 0;
          } else glitches.push(at);
        }
        prev = v;
      }
    }
  });
  for (const key of ["items", "phoneItems", "pending"]) {
    let prev = null;
    for (const [t, v] of tl.get(key) ?? []) {
      const n = numberOf(v);
      if (t >= T0 && prev !== null && n !== null && numberOf(prev) !== null && n < numberOf(prev)) {
        takeBacks.push({ key, index: null, meal: null, t: round1(t - T0), sincePressMs: null, sinceAckMs: null, from: prev, to: v });
      }
      prev = v;
    }
  }
  return { takeBacks, glitches };
}

/**
 * `log` is the recorder's: { changes: [[t, key, value]], presses: [{ pressed, t0, t1, immediate }], last }. Returns the
 * run file's presses, takeBacks, glitches (a counted meal's card read as neither a count nor Add to Cart, for one read
 * or more), overCounts (a card above 1), final, and the change log relative to the first press.
 */
export function analyse({ log, chosen, need, ackWindowMs }) {
  const tl = timelines(log.changes);
  const made = log.presses.filter(Boolean);
  const T0 = made.length ? made[0].t0 : 0;
  const ackAt = [];
  const presses = chosen.map((meal, i) => {
    const p = log.presses[i];
    if (!p) {
      ackAt[i] = null;
      return { index: i, meal, pressed: false };
    }
    const k = `card.${i}`;
    // The read that first showed the count; a count shown when .click() returned is acknowledged at that return.
    const shownAt = firstFrom(tl, k, p.t0, isCount);
    const ackT = isCount(p.immediate) ? p.t1 : shownAt;
    ackAt[i] = ackT;
    const since = (t) => (t === null ? null : round1(t - p.t0));
    const readAt = shownAt ?? ackT;
    const ackMs = since(ackT);
    return {
      index: i,
      meal,
      pressed: true,
      at: round1(p.t0 - T0),
      gapMs: i && log.presses[i - 1] ? round1(p.t0 - log.presses[i - 1].t0) : null,
      clickMs: round1(p.t1 - p.t0),
      immediate: p.immediate,
      acknowledged: ackMs !== null && ackMs <= ackWindowMs,
      card: {
        ackMs,
        stepperMs: since(isCount(p.immediate) ? p.t1 : firstFrom(tl, k, p.t0, (v) => /count/.test(v ?? ""))),
        addGoneMs: since(firstFrom(tl, k, p.t0, (v) => v !== null && !/^add/.test(v))),
      },
      mobile: { ackMs: since(firstFrom(tl, `mcard.${i}`, p.t0, isCount)) },
      row: { ackMs: since(firstFrom(tl, `row.${i}`, p.t0, isCount)) },
      items: {
        reachedMs: since(firstFrom(tl, "items", p.t0, (v) => numberOf(v) >= i + 1)),
        textAtAck: readAt === null ? null : valueAt(tl, "items", readAt),
      },
      phoneItems: {
        reachedMs: since(firstFrom(tl, "phoneItems", p.t0, (v) => numberOf(v) >= i + 1)),
        textAtAck: readAt === null ? null : valueAt(tl, "phoneItems", readAt),
      },
      sideAtAck: readAt === null ? null : parseButton(valueAt(tl, "side", readAt)),
      barAtAck: readAt === null ? null : parseButton(valueAt(tl, "bar", readAt)),
    };
  });
  const { takeBacks, glitches } = lookForTakeBacks(tl, chosen, log.presses, ackAt, T0);
  const overCounts = [];
  chosen.forEach((meal, i) => {
    for (const [t, v] of tl.get(`card.${i}`) ?? []) if ((countOf(v) ?? 0) > 1) overCounts.push({ index: i, meal, t: round1(t - T0), value: v });
  });
  const last = log.last;
  const final = {
    path: last.path ?? null,
    items: last.items ?? null,
    phoneItems: last.phoneItems ?? null,
    progressLabel: last.progressLabel ?? null,
    side: parseButton(last.side),
    bar: parseButton(last.bar),
    pending: last.pending ?? null,
    counted: chosen.filter((_, i) => isCount(last[`card.${i}`])).length,
    countedMobile: chosen.filter((_, i) => isCount(last[`mcard.${i}`])).length,
    countedRows: chosen.filter((_, i) => isCount(last[`row.${i}`])).length,
    need,
  };
  return {
    presses,
    takeBacks,
    glitches,
    overCounts,
    final,
    changes: log.changes.map(([t, k, v]) => ({ t: round1(t - T0), k, v })),
  };
}

/** Nearest-rank percentile of a list of numbers (null for none). */
export function percentile(values, p) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.max(0, Math.ceil((p / 100) * s.length) - 1)];
}
