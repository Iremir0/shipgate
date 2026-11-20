---
name: new-ticket
description: Drafts a ticket for the configured tracker (GitHub Issues or Jira) with testable acceptance criteria, test plan, out of scope, and security notes. Use when defining new work, a bug or an epic, or when a ticket is missing acceptance criteria.
argument-hint: short description of the work
---

# New ticket: $ARGUMENTS

Read `.claude/pipeline.json` for the tracker and `../pipeline/trackers.md` for how to create and label tickets.

## Flow
1. Read the repo and its docs as needed to understand the work. Write no code.
2. Ask the user about unclear points (at most 3–4 questions). Never invent business rules, money/tax decisions or
   provider choices; put them under "Open questions".
3. Show the draft using the template below.
4. **Do not create the ticket until the user approves.** Then create it (GitHub: `gh issue create --label
   "<prefix>todo"`; Jira: `createJiraIssue` in the configured project), link it to an epic if any, and report the key.

## Size rule
A story should be finishable in a few days and deliverable in one PR. If it is bigger, propose a split. Put external
dependencies in their own ticket.

## Template

**Title:** short, starts with a verb (e.g. "Add refund request model and admin review screen")
**Type / Epic / Priority:** Story | epic | P1–P3

### Context
Why it is needed and what value it brings to whom. Related docs.

### Acceptance criteria
Each one testable. Preferably Given/When/Then:
- [ ] **Given** ..., **when** ..., **then** ...
- [ ] Error, unauthorized access and concurrency cases are separate criteria.

### Test plan
- Unit: ...
- Integration / DB: ...
- E2E / visual: ...
- Human acceptance (during release): ...

### Out of scope
- ...

### Security and data notes
Payment, money, stock, personal data or permission impact; otherwise "None".

### Docs
Docs to update.

### Dependencies and open questions
- ...
