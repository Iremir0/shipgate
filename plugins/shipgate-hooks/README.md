# shipgate-hooks

Optional companion to [shipgate](../shipgate). It adds one **Stop hook**: before Claude ends a turn, it looks at the
uncommitted files, runs the commands that `verifyOnStop` in your `.claude/pipeline.json` maps to them, and blocks the
turn with the failing output if one fails. Results are cached by a fingerprint of the relevant files, an unchanged
failure is not re-blocked in a loop, and a missing or malformed config never blocks anything.

It runs only `node`, `git status` and the commands you list yourself. Disable it for a session with
`PIPELINE_SKIP_VERIFY=1`.

Install from the shipgate marketplace:

```text
/plugin marketplace add Iremir0/shipgate
/plugin install shipgate-hooks@shipgate
```
