// W5 (SPEC-storefront-watch § 5, § 6): the issue logic. No open issue for this entry: open one. An open one for the
// same entry with the same flags: add nothing. With different flags: a comment. `gh` is a fake that records its calls.
import test from "node:test";
import assert from "node:assert/strict";
import { decideIssue, fileIssue, issueTitle, LABEL, marker } from "../lib/issue.mjs";

const ENTRY = "main-SYNTH001.js";
const REPORT = "# the report\n\nF1: chunk-BBBB0099.js added\n";

function fakeGh(openIssues) {
  const calls = [];
  const gh = async (args, input) => {
    calls.push({ args, input });
    if (args[0] === "issue" && args[1] === "list") return JSON.stringify(openIssues);
    return "";
  };
  return { gh, calls };
}

const issue = (number, entry, flags, comments = []) => ({
  number,
  title: issueTitle(entry, flags),
  body: `${REPORT}\n${marker(entry, flags)}\n`,
  comments: comments.map((c) => ({ body: `${REPORT}\n${marker(entry, c)}\n` })),
});

const called = (calls, a, b) => calls.filter((c) => c.args[0] === a && c.args[1] === b);

test("W5: no open issue: one is opened, labelled, titled with the flags and the entry, its body the report", async () => {
  const { gh, calls } = fakeGh([]);
  const done = await fileIssue({ gh, entry: ENTRY, flags: ["F1", "F2"], report: REPORT });
  assert.deepEqual(done, { action: "open" });
  const list = called(calls, "issue", "list");
  assert.equal(list.length, 1);
  assert.deepEqual(list[0].args.slice(0, 6), ["issue", "list", "--state", "open", "--label", LABEL]);
  const [create] = called(calls, "issue", "create");
  assert.ok(create, "an issue is created");
  const title = create.args[create.args.indexOf("--title") + 1];
  assert.equal(title, issueTitle(ENTRY, ["F1", "F2"]));
  assert.match(title, /F1 F2/);
  assert.ok(title.includes(ENTRY));
  assert.equal(create.args[create.args.indexOf("--label") + 1], LABEL);
  assert.equal(create.args[create.args.indexOf("--body-file") + 1], "-", "the body goes by stdin");
  assert.ok(create.input.startsWith(REPORT));
  assert.ok(create.input.includes(marker(ENTRY, ["F1", "F2"])));
  assert.equal(called(calls, "issue", "comment").length, 0);
  assert.equal(called(calls, "label", "create").length, 1, "the label is made if it does not exist");
});

test("W5: an open issue for the same entry, same flags: nothing is added", async () => {
  const { gh, calls } = fakeGh([issue(7, ENTRY, ["F1", "F2"])]);
  const done = await fileIssue({ gh, entry: ENTRY, flags: ["F2", "F1"], report: REPORT });
  assert.deepEqual(done, { action: "none", number: 7 });
  assert.deepEqual(calls.map((c) => c.args.slice(0, 2).join(" ")), ["issue list"]);
});

test("W5: an open issue for the same entry, different flags: one comment on it, nothing opened", async () => {
  const { gh, calls } = fakeGh([issue(7, ENTRY, ["F1"])]);
  const done = await fileIssue({ gh, entry: ENTRY, flags: ["F1", "F5"], report: REPORT });
  assert.deepEqual(done, { action: "comment", number: 7 });
  const [comment] = called(calls, "issue", "comment");
  assert.equal(comment.args[2], "7");
  assert.ok(comment.input.includes(marker(ENTRY, ["F1", "F5"])));
  assert.equal(called(calls, "issue", "create").length, 0);
});

test("W5: the latest flags are the issue's last comment's, not its body's", () => {
  const open = [issue(7, ENTRY, ["F1"], [["F1", "F5"]])];
  assert.deepEqual(decideIssue(open, { entry: ENTRY, flags: ["F1", "F5"] }), { action: "none", number: 7 });
  assert.deepEqual(decideIssue(open, { entry: ENTRY, flags: ["F1"] }), { action: "comment", number: 7 });
});

test("W5: an open issue for another entry does not count: a new release opens its own", () => {
  const open = [issue(7, "main-OLDER001.js", ["F1"])];
  assert.deepEqual(decideIssue(open, { entry: ENTRY, flags: ["F1"] }), { action: "open" });
});
