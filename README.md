# Design docs example — CityCycle

A filled-in example of the [engineering design playbook](https://openmove.github.io/engineering-design-playbook/). The product is fictional. The documents are the point.

Reading view: [openmove.github.io/design-docs-example](https://openmove.github.io/design-docs-example/).

**CityCycle** is a bike-sharing service for a mid-size city. Riders unlock a bike from a station, ride, and return it. Operators restock stations. A later change adds electric bikes.

This repository has no application code. It shows how architecture documentation, ADRs, and RFCs look when they are used together on a small, concrete system.

## Read in this order

1. [Architecture, section 1](docs/architecture/01_introduction_and_goals.md) — what CityCycle is for, and the three quality goals that drive the design.
2. [Context diagram](docs/architecture/diagrams/c4-context.md) and [section 3](docs/architecture/03_context_and_scope.md) — who touches the system.
3. [Solution strategy](docs/architecture/04_solution_strategy.md) — how those quality goals become technical choices.
4. [Container diagram](docs/architecture/diagrams/c4-containers.md) and [building blocks](docs/architecture/05_building_block_view.md) — the deployable pieces.
5. The ADRs, in order:
   - [0000 — use MADR](docs/adr/0000-use-markdown-architectural-decision-records.md)
   - [0001 — PostgreSQL for trips and inventory](docs/adr/0001-postgresql-for-trips-and-inventory.md)
   - [0002 — Redis for station availability](docs/adr/0002-redis-for-station-availability.md)
6. [RFC 0001 — add electric bikes](docs/rfc/0001-add-electric-bikes.md) — a later change with real trade-offs.
7. [ADR 0003](docs/adr/0003-battery-telemetry-separate-from-trip-store.md) — the decision that RFC produced.

That sequence is the practice: map the system first, record durable choices as ADRs, propose ambiguous work as an RFC, and let an approved RFC leave new ADRs behind.

## What this is not

- Not a product for Riverside, and not related to any real operator.
- Not a complete arc42 fill-in. Sections that would be empty noise are left short on purpose.
- Not a substitute for the template. New projects should start from [engineering-design-playbook](https://github.com/openmove/engineering-design-playbook), not from this example.
