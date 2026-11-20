# Trackers

The pipeline uses five tracker operations — list a stage, read a ticket, move it, comment, block — defined once in
[`skills/pipeline/trackers.md`](../skills/pipeline/trackers.md). Adding another tracker means adding one column there.

## GitHub Issues
Stages are labels; the issue stays open until **you** close it as the release.

| Stage | Label |
|---|---|
| To Do | `status:todo` |
| In Progress | `status:in-progress` |
| Code Review | `status:code-review` |
| Testing | `status:testing` |
| Ready for Release | `status:ready-for-release` |
| skipped by the pipeline | `blocked` |

Setup: `gh auth login`, then `/pipeline-init github` creates the labels. A GitHub Project board grouped by these
labels gives you the kanban view.

## Jira
Stages are workflow statuses on a kanban board. Setup:
1. Connect the Atlassian MCP server in Claude Code (`/mcp` → atlassian → sign in).
2. Make sure your workflow has a status for every stage (names are configurable in `tracker.jira.statuses`).
3. `/pipeline-init jira` asks for the site and project key and checks the statuses.

Jira is how the pipeline runs in production (see the [case study](case-study.md)).
