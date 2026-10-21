# Architecture decision records

Format: [MADR 4.0.0](https://adr.github.io/madr/). This example uses the full template for decisions with real trade-offs.

## Index

| ID | Title | Status |
|----|-------|--------|
| [0000](0000-use-markdown-architectural-decision-records.md) | Use Markdown Architectural Decision Records | accepted |
| [0001](0001-postgresql-for-trips-and-inventory.md) | PostgreSQL for trips and inventory | accepted |
| [0002](0002-redis-for-station-availability.md) | Redis for station availability | accepted |
| [0003](0003-battery-telemetry-separate-from-trip-store.md) | TimescaleDB for battery samples, not the trip store | accepted |
| [0004](0004-nodejs-fastify-for-the-api.md) | Node.js and Fastify for the API | accepted |
| [0005](0005-postgresql-network-and-roles.md) | PostgreSQL reachable only from the API, with two roles | accepted |
| [0006](0006-short-hold-in-redis.md) | Short bike hold in Redis, not a trip | proposed |

`0001`, `0002`, `0004`, and `0005` are the foundation of the first release. The numbers follow the order the files were added, not the calendar: `0004` and `0005` are dated March, with the other founding decisions. `0003` is the decision left behind by [RFC 0001](../rfc/0001-add-electric-bikes.md) when electric bikes were added.
