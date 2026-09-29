// SPEC-storefront-watch § 5: a flagged run opens an issue labelled `storefront-watch`, titled with the flags and the
// entry's name, its body the report. One issue per release: if an open issue already names this entry, the run
// comments only when the flags changed, else adds nothing. Every body and comment ends with a marker carrying the
// entry and the flags, which is how the next run reads what an issue last said. `gh` runs the GitHub CLI (in CI,
// with the runner's GITHUB_TOKEN); the tests pass a fake.
import { execFile } from "node:child_process";

export const LABEL = "storefront-watch";
/** GitHub refuses an issue body or comment over 65,536 characters. */
const MAX_BODY = 60_000;
const MARKER = /<!-- storefront-watch entry=(\S+) flags=(\S*) -->/g;

const sorted = (flags) => [...flags].sort();
export const marker = (entry, flags) => `<!-- storefront-watch entry=${entry} flags=${sorted(flags).join(",")} -->`;
export const issueTitle = (entry, flags) => `storefront-watch: ${sorted(flags).join(" ")} on ${entry}`;

function markers(text) {
  return [...(text ?? "").matchAll(MARKER)].map((m) => ({ entry: m[1], flags: m[2] ? m[2].split(",") : [] }));
}

/** `open`: the open issues with the label, each { number, title, body, comments: [{ body }] }, comments oldest first. */
export function decideIssue(open, { entry, flags }) {
  const own = (i) => markers(i.body).some((m) => m.entry === entry) || (i.title ?? "").includes(entry);
  const issue = open.find(own);
  if (!issue) return { action: "open" };
  const said = [...markers(issue.body), ...(issue.comments ?? []).flatMap((c) => markers(c.body))].filter((m) => m.entry === entry);
  const last = said.at(-1);
  if (last && sorted(last.flags).join(",") === sorted(flags).join(",")) return { action: "none", number: issue.number };
  return { action: "comment", number: issue.number };
}

function clip(report) {
  if (report.length <= MAX_BODY) return report;
  return `${report.slice(0, MAX_BODY)}\n\n… (the report is ${report.length} characters; the rest is in the run's log and job summary)\n`;
}

export async function fileIssue({ gh, entry, flags, report }) {
  const open = JSON.parse(
    await gh(["issue", "list", "--state", "open", "--label", LABEL, "--json", "number,title,body,comments", "--limit", "100"]),
  );
  const decision = decideIssue(open, { entry, flags });
  const body = `${clip(report)}\n${marker(entry, flags)}\n`;
  if (decision.action === "open") {
    await gh(["label", "create", LABEL, "--force", "--color", "B60205", "--description", "A store release or Footer change flagged by the storefront watch"]);
    await gh(["issue", "create", "--title", issueTitle(entry, flags), "--label", LABEL, "--body-file", "-"], body);
  } else if (decision.action === "comment") {
    await gh(["issue", "comment", String(decision.number), "--body-file", "-"], body);
  }
  return decision;
}

/** The real `gh`: its repository and token from the environment (GH_REPO, GH_TOKEN). `input` goes to its stdin. */
export function ghRunner() {
  return (args, input) =>
    new Promise((resolve, reject) => {
      const child = execFile("gh", args, { maxBuffer: 32 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) reject(new Error(`gh ${args.slice(0, 2).join(" ")}: ${(stderr || err.message).trim()}`));
        else resolve(stdout);
      });
      child.stdin.end(input ?? "");
    });
}
