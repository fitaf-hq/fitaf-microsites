// SPEC-storefront-watch § 12 item 4: a flagged F6 opens ITS OWN issue, labelled `storefront-watch`, titled "storefront-
// watch: the menu switched (N of M keys new)", its body the new names in the page's order (then the run's report). It is
// a signal to start the next week's release, not a fault. One issue per Friday: the body's marker names the Friday of
// the run's week in New York, and
//   - a scheduled Friday run first asks for it (`switchSeen`, open or closed: a switch accepted the same day was still
//     seen) and stops if it is there (item 2);
//   - filing adds nothing while an open issue carries that Friday's marker (a dispatch after the switch).
// A menu that could not be read is flagged too, under its own title and marker, which the Friday gate does not read: a
// visit that failed must never stop the watch for the rest of the day.
import { clip, ensureLabel, LABEL } from "./issue.mjs";
import { redact } from "./redact.mjs";

export const SWITCHED = "menu-switched";
export const UNREAD = "menu-unread";
export const menuMarker = (kind, friday) => `<!-- storefront-watch ${kind} friday=${friday} -->`;

const list = (gh, state) => gh(["issue", "list", "--state", state, "--label", LABEL, "--json", "number,title,body,state", "--limit", "100"]).then(JSON.parse);
const carrying = (issues, mark) => issues.find((i) => (i.body ?? "").includes(mark)) ?? null;

export function menuIssueTitle(f6) {
  if (f6.unread) return `storefront-watch: the menu could not be read (Friday ${f6.friday})`;
  return `storefront-watch: the menu switched (${f6.added.length} of ${f6.live.length} keys new)`;
}

/** item 2: (friday) -> the number of the issue that recorded that Friday's switch, or null. One `gh issue list`. */
export function switchSeen({ gh }) {
  return async (friday) => carrying(await list(gh, "all"), menuMarker(SWITCHED, friday))?.number ?? null;
}

/** The body: the new names in the page's order (the page's own text, redacted as every quoted page string), then the report. */
export function menuIssueBody(f6, report) {
  const head = f6.unread
    ? [`## The week's menu could not be read (Friday ${f6.friday}, ${f6.timeZone})`, "", f6.summary, ""]
    : [
        `## The menu switched: ${f6.added.length} of ${f6.live.length} keys new (Friday ${f6.friday}, ${f6.timeZone})`,
        "",
        "The new names, in the page's order:",
        "",
        ...f6.added.map((m, i) => `${i + 1}. ${redact(m.name)}`),
        "",
        "A signal to start the next week's release, not a fault (SPEC-storefront-watch § 12). Accept the new week with " +
          "`npm --prefix boston-2026-10/tools/storefront-watch run accept -- --menu`, in the commit that releases it, naming this issue.",
        "",
      ];
  return `${head.join("\n")}\n---\n\n${clip(report)}\n${menuMarker(f6.unread ? UNREAD : SWITCHED, f6.friday)}\n`;
}

/** Opens the menu's issue unless an open one already carries this Friday's marker of the same kind. */
export async function fileMenuIssue({ gh, f6, report }) {
  const found = carrying(await list(gh, "open"), menuMarker(f6.unread ? UNREAD : SWITCHED, f6.friday));
  if (found) return { action: "none", number: found.number };
  await ensureLabel(gh);
  await gh(["issue", "create", "--title", menuIssueTitle(f6), "--label", LABEL, "--body-file", "-"], menuIssueBody(f6, report));
  return { action: "open" };
}
