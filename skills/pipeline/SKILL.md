---
name: pipeline
description: Manager pipeline. With no argument it works the whole board; with a ticket key (#12 or ABC-12) it works one ticket. The main session writes no code - it hands each ticket to test-author, dev-standard/dev-critical, code-reviewer, security-reviewer and test-runner agents, moves it To Do → In Progress → Code Review → Testing → Ready for Release through gates, and merges after Testing passes. Asks the human only for system/architecture decisions.
argument-hint: "[#12 | ABC-12]"
---

# /pipeline $ARGUMENTS

## 0. Load the configuration
1. Read `.claude/pipeline.json`. Missing → stop and tell the user to run `/pipeline-init`. Read the repo's `CLAUDE.md`.
2. Read `trackers.md` (next to this file). Every tracker action below is one of its operations: `listQueue`,
   `readTicket`, `move`, `comment`, `block`. Run its preflight once.
3. Agents are called with the `Agent` tool as `subagent_type: "claude-code-pipeline:<agent>"`.
4. `gh` commands that fail with a `GITHUB_TOKEN` error: retry as `env -u GITHUB_TOKEN gh ...`.

## Ground rules
- **You are the manager; you write no product code and no tests.** Agents write code. You read tickets, plan, assign
  agents, enforce gates, and do git, PR and tracker work.
- Don't wait for approval. Ask the human only for **system/architecture decisions**: a new module, table or data
  model; where data lives; a new dependency; a customer-visible business rule with more than one reasonable answer.
- You move a ticket at most to **ready**. Done and the release belong to the human.
- No direct push to `baseBranch`. Never approve a change that loosens a gate or invariant from `CLAUDE.md`.

## 1. Ticket order
- If `$ARGUMENTS` is a ticket key, work only that ticket.
- Otherwise board mode. Unfinished work first (from an earlier session), then new work:
  `listQueue(testing)`, `listQueue(review)`, `listQueue(inProgress)`, then `listQueue(todo)`.
  An unfinished ticket's state is recovered from its branch, PR and the pipeline-log comments; resume at that stage.
- **Parallelism:** at most `parallel` (default 2) tickets in development and review at once. Tickets whose plans touch
  the same files never run in parallel. **Testing is a single queue:** one ticket at a time.

## 2. Ready? (todo)
`readTicket`: description, acceptance criteria, out of scope, links, comments.
- No acceptance criteria but the ticket is clear enough → write criteria in the `/new-ticket` format, `comment` them,
  continue.
- A criterion needs a business decision, or the ticket depends on outside input (provider account, API docs, a
  business call) → `block` with what is awaited, leave it in todo, collect the question for the final report, take the
  next ticket.

## 3. Plan and assignment
- Explore the code (use an `Explore` agent for wide searches).
- Short plan: files to change, data model/API/migration impact, a test for each criterion, docs to update, risks.
  `comment` the plan on the ticket and report it to the user for information.
- **Risk:** the ticket is risky when its plan touches a `risk.paths` glob or the ticket mentions a `risk.keywords`
  term, or it spans several areas, or adds a migration/data model. Unsure → risky.
- **Dev agent:** risky → `dev-critical` with `model: models.devCritical` (default opus); otherwise `dev-standard` with
  `model: models.devStandard` (default sonnet).
- **Test-first?** Skip test-author only when the diff can be described in one sentence (copy, typo, one-line fix).
  Never skip it for risky tickets.

## 4. In Progress
1. Worktree and branch: `git fetch origin`, `git worktree add <worktreeDir>/<key> -b <branch> origin/<baseBranch>`,
   then `commands.install` in the worktree. `move(todo → inProgress)`; `comment` "Work started: branch `<name>`, dev
   agent `<name>` (<model>)".
2. **test-author** (unless skipped): give the ticket, criteria, plan, worktree path. Its report must contain the test
   commit SHA, the locked test files and red evidence. No red evidence → send it back.
3. **Dev agent:** `Agent` with `subagent_type: claude-code-pipeline:dev-standard|dev-critical`, `name: dev-<key>` and
   the model above. Give: ticket, criteria, plan, test-author report, worktree path. Record the agent name/id in the
   pipeline log: rework goes back to **the same agent** via `SendMessage`. If it is unreachable (new session), start a
   new agent of the same type and give it the previous diff and the full findings history.
4. Dev says "the test is wrong" → judge the claim. If right, send it to test-author with the reasoning; the corrected
   tests become the new locked set.
5. Dev report without evidence that every `commands.quick` command passed → send it back.

## 5. Code Review
1. Push (`git -C <worktree> push -u origin <branch>`), `gh pr create --base <baseBranch>` using the repo's
   `.github/pull_request_template.md` if present (otherwise `../../templates/pull_request_template.md` relative to this skill's base directory).
   `move(inProgress → review)`; `comment` the PR link.
2. **code-reviewer** on a **different model** than the dev: `model: models.reviewerFor[<dev model>]` (defaults:
   sonnet → opus, opus → sonnet). If that model is unavailable and you must fall back to the dev's own model, continue
   but write **"⚠️ same-model review"** in the PR body and the release note. Give: criteria, plan, worktree, branch,
   test commit SHA and locked files, previous-round findings if any.
3. Risky ticket (see 3) → also run **security-reviewer**. A **Critical** or **High** finding counts as REJECT.
4. **APPROVE** → step 6. **REJECT** → `move(review → inProgress)`, `comment` the findings and send them to **the same
   dev agent**; when it finishes, repeat from 5.2.

## 6. Testing (single queue)
1. If another ticket is in Testing, wait. `move(review → testing)`.
2. In the dev worktree merge the latest base (`git -C <worktree> merge origin/<baseBranch>`). On conflict give the
   resolution to the dev agent, then review again (5.2). Push the updated branch.
3. **test-runner**: ticket, branch, touched areas, test list. The test bench is the main checkout; do nothing else
   there meanwhile.
4. Result:
   - **PASS** → step 7.
   - **FAIL** → `move(testing → inProgress)`, send failures to the ticket and the same dev agent; when done, continue
     from step 5 (review).
   - **BLOCKED** (services down, port busy...) → try to fix the environment (start services). If that fails, leave the
     ticket in Testing, write the reason on the ticket and in the final report; do not merge.

## 7. Merge and Ready for Release
1. Merge conditions, all required: test-runner PASS and the tested `origin/<baseBranch>` SHA is still current
   (otherwise back to step 6); code-reviewer APPROVE; no open Critical/High security finding; PR mergeable.
2. Add the test-runner table and review decisions to the PR body (`gh pr edit <no> --body-file ...`).
   - `autoMerge: true` (default) → `gh pr merge <no> --merge`, remove the worktree
     (`git worktree remove <worktreeDir>/<key>`) and delete the local branch.
   - `autoMerge: false` → leave the approved, tested PR open for the human; keep the worktree.
3. `move(testing → ready)` and `comment` a **release note**:
   - **What changed:** 2–4 bullets, user-visible effect
   - **PR:** link and merge commit SHA (or "awaiting human merge")
   - **Release requirements:** migration, new/changed environment variable, service restart. Otherwise "None"
   - **Test evidence:** test-runner table (command | result)
   - **Manual check (optional):** 2–3 steps
   - **Pipeline log:** dev agent and model, reviewer model (and "⚠️ same-model review" if so), review REJECT count,
     Testing FAIL count, whether test-first was skipped

## 8. Loop limit
When review REJECTs + Testing FAILs reach **`loopLimit`** (default 3), stop the ticket: `block` with a status summary,
leave it in inProgress, keep the worktree and PR, notify the user. Move on to the next ticket.

## 9. Final report
When the board is empty or every remaining ticket is blocked, give the user a short report:
- Tickets moved to ready (PR links, release requirements)
- Stuck tickets and why (blocked, loop limit, BLOCKED)
- Decisions needed from the user, in one list
