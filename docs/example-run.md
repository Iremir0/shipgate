# Example run

The first end-to-end run of shipgate 0.1.0, on the
[demo repo](https://github.com/Iremir0/shipgate-demo), on 20 November 2026. One `/pipeline` command, no human input
until the board was empty. Everything below can be checked on GitHub: the three issues, their comment threads (the
pipeline log), and the merged PRs.

## Result

| Issue | Route | Test-first | Review | Testing | PR |
|---|---|---|---|---|---|
| [#2 Add percentage discount codes](https://github.com/Iremir0/shipgate-demo/issues/2) `priority:high` | **risky** (path `src/pricing/**`, keyword "discount") → `dev-critical` (Opus) | yes, 15 locked tests | `code-reviewer` on **Sonnet** (dev was Opus): APPROVE · `security-reviewer`: no findings | PASS, 24/24 | [#5](https://github.com/Iremir0/shipgate-demo/pull/5) |
| [#1 Improve the invalid-quantity error](https://github.com/Iremir0/shipgate-demo/issues/1) | standard → `dev-standard` (Sonnet) | skipped (one-sentence change) | `code-reviewer` on **Opus**: APPROVE | PASS | [#4](https://github.com/Iremir0/shipgate-demo/pull/4) |
| [#3 Bug: subtotal ignores the last quantity](https://github.com/Iremir0/shipgate-demo/issues/3) | standard → `dev-standard` (Sonnet) | yes, a regression test that reproduced the bug first | `code-reviewer` on **Opus**: APPROVE | PASS, 27/27 | [#6](https://github.com/Iremir0/shipgate-demo/pull/6) |

All three ended at `status:ready-for-release` with a release note, **still open**: closing them is the human release
step. Zero review rejects, zero testing failures.

**Scheduling:** #2 (high priority) and #1 ran in parallel. #3 waited, because its plan touched `src/cart.ts`, the same
file as #1. Testing ran one ticket at a time, each merged with the latest `main` first: #2 was tested on top of #1's
merge.

## What a ticket's log looks like

Issue #2's comment thread, as the pipeline wrote it (abridged):

> **Pipeline plan**: new `src/pricing/discount.ts`, new `tests/discount.test.ts`; one test per criterion
> (`1005` + WELCOME10 → `904`, half-up of 100.5; unknown code; zero subtotal; integer result). Integer-only maths,
> one rounding step. **Risk: risky** (path `src/pricing/**`, keyword "discount"): dev-critical (opus), test-first
> mandatory, security-reviewer runs in review.

> Work started: branch `2-discount-codes`, dev agent `shipgate:dev-critical` (opus).

> test-author: failing tests committed as `5b96cb6`, locked file `tests/discount.test.ts` (15 tests; red: module not
> found, and all 15 fail against a throwing stub).

> Code review (sonnet; dev was opus): **APPROVE**. Security review: **no findings** (checked integer-only maths incl. a
> BigInt comparison near MAX_SAFE_INTEGER, single rounding step, input validation).

> ## Release note
> **What changed:** `applyDiscount(subtotalMinor, code)`; WELCOME10 = 10 %, VIP25 = 25 %, case-insensitive; half-up
> rounding (1005 + WELCOME10 → 904); unknown code throws.
> **Release requirements:** None. Nothing calls `applyDiscount` yet; wiring it into checkout is separate work.
> **Test evidence:** `npm run typecheck` ✅ · `npm test` ✅ 24/24
> **Pipeline log:** dev `shipgate:dev-critical` (opus) · reviewer `shipgate:code-reviewer` (sonnet) + security
> reviewer · REJECTs 0 · FAILs 0 · test-first yes (`5b96cb6`)

## What went wrong, and what changed in the plugin

The run's job was to find out. The manager session kept a list of every place the instructions were unclear or wrong:

| Found during the run | Fix |
|---|---|
| The first `gh` call failed with `401 Bad credentials`; the retry rule only looked for the text `GITHUB_TOKEN` | Retry on any auth error while `GITHUB_TOKEN` is set (skill and seed script) |
| One test-runner report came back with **no verdict**; the manager asked again and got PASS | New rule: a report without its verdict line is not a result; send it back, never infer one |
| `listQueue` via GitHub search returned a label from **before** the last move | List by label without `--search`, filter `blocked` locally, confirm every move |
| `git worktree add -b … origin/main` made ticket branches track `main` | `--no-track`, so a bare `git push` can never hit the base branch |
| "Write it to the pipeline log" didn't say where the log is | Defined: the ticket's comment thread |
| A clean merge of `main` could still change code under review | Re-review when the merge touches files the branch changed |
| A test-runner report said "13 tests" where there were 15 | Numbers in reports must be copied from command output |
| #3 changes money maths but matched no risk rule, so it got no security review | Not a plugin bug: a demo config gap. Your `risk` rules are as good as you make them |

The two that mattered most, the missing verdict and the stale board read, are exactly the failure modes the gates
exist for: the manager refused to treat an empty report as a pass, and re-checked the board instead of acting on it.
