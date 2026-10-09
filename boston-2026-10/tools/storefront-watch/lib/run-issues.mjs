// A flagged run's issues (SPEC-storefront-watch § 5, § 12 item 4): the release's flags (F1–F5) go to the release's
// issue (lib/issue.mjs: one per entry), and a flagged F6 to the menu's own (lib/menu-issue.mjs: one per Friday). F6
// alone opens no release issue; a run with both files both.
import { fileIssue } from "./issue.mjs";
import { fileMenuIssue } from "./menu-issue.mjs";

/** -> { release?: decision, menu?: decision }, each { action: "open" | "comment" | "none", number? }. */
export async function fileRunIssues({ gh, result, report }) {
  const done = {};
  const release = result.flags.filter((f) => f !== "F6");
  if (release.length) done.release = await fileIssue({ gh, entry: result.entry ?? "(no entry)", flags: release, report });
  if (result.f6?.flag) done.menu = await fileMenuIssue({ gh, f6: result.f6, report });
  return done;
}
