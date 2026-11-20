# shipgate

A gated, multi-agent delivery pipeline for Claude Code. The main session becomes a manager that writes no code: it
moves tickets (GitHub Issues or Jira) from To Do to Ready for Release and hands the work to six agents —
test-author, dev-standard, dev-critical, code-reviewer, security-reviewer and test-runner. A ticket only moves forward
through gates: failing tests are written first and locked, a different model reviews the code, risky work gets a
security review, testing runs one ticket at a time against the latest main, a suite that could not run is never a
pass, and only a human releases.

## Commands
- `/pipeline-init` — one-time setup: writes `.claude/pipeline.json`, creates GitHub labels or checks Jira statuses.
- `/new-ticket <idea>` — drafts a ticket with testable acceptance criteria; creates it after you approve.
- `/pipeline [key]` — works the whole board, or one ticket.

## What it runs and fetches
No server, no telemetry, no bundled scripts. The skills and agents run `git`, the commands you list in
`.claude/pipeline.json`, and your tracker through tools you authorise yourself: the `gh` CLI with your login, or the
Atlassian MCP server you connect. Nothing is downloaded at runtime.

Full documentation, demo repo and a recorded run: https://github.com/Iremir0/shipgate
