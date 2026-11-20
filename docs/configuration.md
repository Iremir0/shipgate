# Configuration — `.claude/pipeline.json`

`/pipeline-init` writes this file for you. The schema (`schema/pipeline.schema.json`) gives editor autocomplete via
the `$schema` line. Project rules that are not commands — money representation, ownership checks, naming — belong in
your `CLAUDE.md`; reviewers treat every invariant there as **Critical**.

| Field | Default | Meaning |
|---|---|---|
| `tracker.type` | — | `"github"` or `"jira"` |
| `tracker.github.repo` | current repo | `owner/name` |
| `tracker.github.labelPrefix` | `status:` | Prefix of the stage labels |
| `tracker.jira.site` / `.project` | — | `your-site.atlassian.net`, project key |
| `tracker.jira.statuses.*` | To Do, In Progress, Code Review, Testing, Waiting for Release, Done | Your column names per stage |
| `keyPattern` | `#{n}` | How tickets appear in commits/branches (`ABC-{n}` for Jira) |
| `commands.install` | — | Clean install (`npm ci`) |
| `commands.quick` | — | Fast checks every dev agent must run green |
| `commands.build` | — | Build commands run in Testing |
| `commands.suites[]` | — | `{name, run, when?, needs?}` slower suites; `when` = globs that trigger them; `needs: "services"` starts services first |
| `commands.services` | — | `{start, stop?, health[]}` how to bring the app up for suites |
| `verifyOnStop[]` | — | `{paths (regex), run[]}` Stop-hook rules |
| `risk.paths` / `risk.keywords` | — | What makes a ticket risky |
| `models.devStandard` / `devCritical` | sonnet / opus | Dev model per route |
| `models.reviewerFor` | `{sonnet: opus, opus: sonnet}` | Reviewer model for each dev model |
| `parallel` | 2 | Tickets in development/review at once |
| `loopLimit` | 3 | Rejects + fails before `blocked` |
| `autoMerge` | true | `false` stops at an approved, tested PR |
| `baseBranch` | main | |
| `worktreeDir` | `.claude/worktrees` | One git worktree per ticket |

See [`templates/pipeline.json`](../plugins/shipgate/templates/pipeline.json) for a full example and the
[demo repo](https://github.com/Iremir0/shipgate-demo/blob/main/.claude/pipeline.json) for a minimal one.

## Permissions and branch protection

`/pipeline-init` offers [`templates/settings.permissions.json`](../plugins/shipgate/templates/settings.permissions.json): routine git, `gh issue`,
`gh pr` and `npm run` commands are allowed so the pipeline doesn't stop at every prompt; other `git push` and `gh`
calls ask first; force pushes, `+refspec` pushes, hard resets, `gh repo delete`, `--admin` and `gh api` are denied.
Permission patterns are a convenience, not a security boundary: **turn on branch protection for your base branch**
(require a PR, block force pushes) so the rule "no direct push to main" is enforced by GitHub, not only by prompts.
