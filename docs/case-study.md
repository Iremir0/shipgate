# Case study: a production e-commerce codebase

The pipeline was not designed in the abstract. It grew out of building a real store, and this plugin is the
project-independent version of it.

## The project

An online jewellery store in Türkiye whose prices follow the **live gold price**. That makes nearly every feature
touch something that hurts when it is wrong: price quotes with expiry, stock reservations, a payment provider in
sandbox, admin and content roles.

- **Stack:** Medusa 2 (Node/TypeScript) + PostgreSQL + Redis backend, Next.js 16 / React 19 storefront, an Expo mobile
  app, all in one npm-workspace monorepo.
- **Tracker:** Jira kanban, To Do → In Progress → Code Review → Testing → Waiting for Release → Done.
- **Tests:** unit, integration against a real database, reservation and payment suites, Playwright e2e for the
  storefront and admin. The service-backed suites share one database and fixed ports, which is why Testing is a single
  queue.
- **Team:** one product owner/architect (me) and one more developer using the same pipeline on their own tickets.

## Results (25 Oct – 16 Nov 2026)

Counted from the pipeline log that every ticket carries when it reaches *Waiting for Release*.

| | |
|---|---|
| Tickets delivered through the pipeline | **30** |
| Routed to `dev-critical` (Opus) / `dev-standard` (Sonnet) | 14 / 10 (6 early tooling tickets unlabelled) |
| Approved on the **first** code review | **76 %** (22 of 29) |
| Review rejects per ticket | 0.34 on average (10 in total) |
| Passed Testing on the **first** run | **81.5 %** (22 of 27) |
| Testing failures per ticket | 0.19 on average (5 in total) |
| Testing runs reported **BLOCKED** (environment, not code) and not counted as passes | 3 |
| Test-first skipped (one-sentence changes) | 7 of 28 |
| Tickets that hit the loop limit | 1 |

What the numbers say:

- **Roughly one ticket in four was rejected by the cross-model reviewer** before any human saw it, and one in five
  failed when it was merged with the latest `main` and run against real services. Without those two gates, those
  defects would have reached the release check (or production).
- **BLOCKED ≠ PASS was hit for real.** Three times Docker or the environment was down. The pipeline reported BLOCKED
  and waited instead of merging untested code.
- **Most work went to the expensive route**, which is expected for a store where most features touch money, stock or
  payments. Copy and small UI work stayed on Sonnet.
- **Asking only real decisions** shows up as `blocked` tickets: work that needs a business decision, a provider
  account or API documentation is parked with a comment instead of being guessed. The backlog of parked tickets is a
  list of questions for the owner, not of bugs.

## Why the rules look like this here

- **Locked tests:** an agent that cannot make a test pass has an easy way out: change the test. In a codebase where a
  rounding error is a pricing bug, that way out has to be closed mechanically, not by trust.
- **Different-model review:** a model shares its own blind spots, so the reviewer is always the other model.
- **Single testing queue:** the reservation, payment and e2e suites share one database and fixed ports; two tickets
  tested at once would corrupt each other's state.
- **Loop limit:** an underspecified ticket makes agents grind. After three rounds a human looks; once, that meant
  deliberately extending the limit.

## My role

I write and prioritise tickets (with `/new-ticket`), answer the architecture questions the pipeline raises, and do the
release check in *Waiting for Release*. Every problem found there becomes a new ticket. I don't merge by hand, and I
don't let the agents release.
