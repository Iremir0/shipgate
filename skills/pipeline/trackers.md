# Tracker operations

`/pipeline` never talks to a tracker directly. It uses the five operations below; this table says how each one is done
for `tracker.type` in `.claude/pipeline.json`.

Pipeline stages and their names:

| Stage | GitHub label (`<prefix>` = `tracker.github.labelPrefix`, default `status:`) | Jira status (`tracker.jira.statuses.*`) |
|---|---|---|
| todo | `<prefix>todo` | `todo` (default "To Do") |
| inProgress | `<prefix>in-progress` | `inProgress` (default "In Progress") |
| review | `<prefix>code-review` | `review` (default "Code Review") |
| testing | `<prefix>testing` | `testing` (default "Testing") |
| ready | `<prefix>ready-for-release` | `ready` (default "Waiting for Release") |
| done | issue closed by a human | `done` — **human only** |

Every stage excludes tickets labelled `blocked`. Only a human removes `blocked`.

## GitHub Issues (`gh`)
Use `--repo <tracker.github.repo>` when it is set.

| Operation | Command |
|---|---|
| `listQueue(stage)` | `gh issue list --state open --label "<label>" --search "-label:blocked sort:created-asc" --json number,title,labels` (todo: also sort by a `priority:*` label if present, `priority:high` first) |
| `readTicket(n)` | `gh issue view <n> --json number,title,body,labels,comments` |
| `move(n, from, to)` | `gh issue edit <n> --remove-label "<from label>" --add-label "<to label>"` (one call, so the issue is never in two stages) |
| `comment(n, text)` | write the text to a temp file, then `gh issue comment <n> --body-file <file>` |
| `block(n, reason)` | `gh issue edit <n> --add-label blocked` then `comment(n, reason)` |

Branch/commit key: `#<n>`, branch `<n>-<slug>`. PR body includes `Refs #<n>` (not `Closes`: closing is the human's
release step).

Preflight (run once per session): `gh label list --json name` must contain every stage label and `blocked`. If any
is missing, stop and tell the user to run `/pipeline-init`.

## Jira (Atlassian MCP)
Site `tracker.jira.site`, project `tracker.jira.project`. Get the `cloudId` once with
`getAccessibleAtlassianResources`. If the Atlassian MCP server is not connected, stop and tell the user to connect it
(`/mcp`).

| Operation | Tool |
|---|---|
| `listQueue(stage)` | `searchJiraIssuesUsingJql`: `project = <KEY> AND status = "<status>" AND (labels IS EMPTY OR labels NOT IN (blocked))` — todo adds `ORDER BY priority DESC, rank ASC` |
| `readTicket(key)` | `getJiraIssue` + `listJiraIssueComments` |
| `move(key, from, to)` | `transitionJiraIssue` to the transition whose target is the `to` status |
| `comment(key, text)` | `addOrEditJiraIssueComment` |
| `block(key, reason)` | `editJiraIssue` adding label `blocked`, then `comment` |

Branch/commit key: `<KEY>-<n>`, branch `<KEY>-<n>-<slug>`. PR body includes the issue link.

Preflight: the project's workflow must contain every configured status. If not, stop and list the missing ones.
