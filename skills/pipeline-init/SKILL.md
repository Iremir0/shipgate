---
name: pipeline-init
description: Sets up shipgate in the current repo - detects the stack, writes .claude/pipeline.json, creates GitHub status labels or checks Jira statuses, and suggests CLAUDE.md invariants and permissions. Run once per repo before /pipeline.
argument-hint: "[github | jira]"
---

# /pipeline-init $ARGUMENTS

Goal: a repo where `/pipeline` can run. Show the user each file before writing it; never overwrite an existing
`.claude/pipeline.json` without asking. This plugin's templates live in `../../templates/` relative to this skill's
base directory.

1. **Detect the stack.** Read `package.json` scripts (or `Makefile`, `pyproject.toml`, `go.mod`, `Cargo.toml`...) and
   CI workflows. Propose `commands.install`, `commands.quick` (typecheck + unit tests), `commands.build`, and
   `commands.suites` for slower suites (integration, e2e) with `when` globs and `needs: "services"` where a server is
   required. Propose `verifyOnStop` rules that map source folders to the quick checks.
2. **Tracker.** Use `$ARGUMENTS` if given, otherwise ask: GitHub Issues or Jira.
   - GitHub: confirm `gh auth status` (retry with `env -u GITHUB_TOKEN` on a token error). Create the labels with
     `gh label create <name> --color <hex> --force`:
     `status:todo` (ededed), `status:in-progress` (fbca04), `status:code-review` (1d76db), `status:testing` (5319e7),
     `status:ready-for-release` (0e8a16), `blocked` (b60205), `priority:high` (d93f0b).
   - Jira: ask for site and project key; check the Atlassian MCP is connected; read the project's statuses and map them
     to the six stages. Report any stage with no matching status.
3. **Risk areas.** Ask which parts of the code are risky (money, payments, auth, data migrations...). Fill
   `risk.paths` and `risk.keywords`.
4. **Write** `.claude/pipeline.json` from this plugin's `templates/pipeline.json`, keeping the `$schema` line.
5. **CLAUDE.md invariants.** If `CLAUDE.md` has no rules section, suggest 3–6 project invariants (e.g. "money is an
   integer number of minor units", "every customer record is read with an ownership check"). Explain that reviewers
   treat these as Critical. Write them only after the user agrees.
6. **Permissions.** Offer to merge `templates/settings.permissions.json` into `.claude/settings.json` so the pipeline
   does not stop at routine prompts, while force push, hard reset and secret files stay denied. Show the diff first.
7. **Worktrees.** Make sure `worktreeDir` (default `.claude/worktrees/`) and `.claude/.cache/` are in `.gitignore`.
8. Finish with: "Create tickets with `/new-ticket`, then run `/pipeline`."
