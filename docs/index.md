---
title: CityCycle
description: A worked example of the design docs method, on a fictional bike-sharing service.
template: splash
hero:
  tagline: From the first architecture decisions to a later change, on a system small enough to read in one sitting.
  actions:
    - text: Start with the goals
      link: architecture/01_introduction_and_goals/
      icon: right-arrow
    - text: Back to the template
      link: https://openmove.github.io/engineering-design-playbook/
      icon: external
      variant: minimal
---

CityCycle is a fictional docked bike-sharing service for the city of Riverside. Riders unlock a bike, ride, and return it. Operators restock stations. Months later, the city adds electric bikes.

There is no application code here. The documents are the point. This is what the [template](https://github.com/openmove/engineering-design-playbook) looks like once a project has used it. New projects should start from the template, which is empty.

## Read in this order

1. [Goals](architecture/01_introduction_and_goals.md) — what CityCycle is for, and the three quality goals that drive the design.
2. [Context diagram](architecture/diagrams/c4-context.md) and [section 3](architecture/03_context_and_scope.md) — who touches the system.
3. [Solution strategy](architecture/04_solution_strategy.md) — how those quality goals become technical choices.
4. [Container diagram](architecture/diagrams/c4-containers.md) and [building blocks](architecture/05_building_block_view.md) — the deployable pieces.
5. The ADRs, in order:
   - [0000 — use MADR](adr/0000-use-markdown-architectural-decision-records.md)
   - [0004 — Node.js and Fastify](adr/0004-nodejs-fastify-for-the-api.md)
   - [0001 — PostgreSQL for trips and inventory](adr/0001-postgresql-for-trips-and-inventory.md)
   - [0005 — who can reach PostgreSQL](adr/0005-postgresql-network-and-roles.md)
   - [0002 — Redis for station availability](adr/0002-redis-for-station-availability.md)
6. [RFC 0001 — add electric bikes](rfc/0001-add-electric-bikes.md) — a later change with real trade-offs.
7. [ADR 0003](adr/0003-battery-telemetry-separate-from-trip-store.md) — the decision that RFC produced.

That sequence is the practice: map the system first, record durable choices as ADRs, propose ambiguous work as an RFC, and let an approved RFC leave new ADRs behind.
