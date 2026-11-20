# Changelog

## 0.1.0 — 2026-11-20
- First public release: `/pipeline`, `/new-ticket`, `/pipeline-init`, six agents, config-driven Stop hook.
- Trackers: GitHub Issues (labels) and Jira (Atlassian MCP).
- Fixes from the first demo run: auth-error retry, verdict-less reports are sent back, label listing without search,
  `--no-track` worktrees, defined pipeline log, re-review after merges that touch the branch's files.
- `/pipeline-init` uses the same auth-error retry rule; every agent's final message must be its finished report.
