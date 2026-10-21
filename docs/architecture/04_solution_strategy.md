# Solution Strategy

The three quality goals from [section 1](01_introduction_and_goals.md) drive a small set of choices. Details live in ADRs; this page is the half-page summary.

| Quality goal | Approach | ADR |
|--------------|----------|-----|
| Unlock under 3 s at p95 | Keep the unlock path short: API checks a hot availability cache, then sends MQTT unlock. Trip persistence is async to the unlock ack when the dock confirms. | [0002](../adr/0002-redis-for-station-availability.md) |
| Station counts ≤ 30 s stale | Dock events update Redis immediately and write through to PostgreSQL. The map reads Redis. | [0002](../adr/0002-redis-for-station-availability.md) |
| Operator city-wide view under 2 s | Same Redis snapshot feeds the operator list. No full table scan of trips for the fill view. | [0002](../adr/0002-redis-for-station-availability.md) |
| Billing integrity (constraint) | PostgreSQL is the system of record for trips, payments, and inventory. Redis is a cache and lock, not the ledger. The database is private and the API role cannot change the schema. | [0001](../adr/0001-postgresql-for-trips-and-inventory.md), [0005](../adr/0005-postgresql-network-and-roles.md) |
| One team, one service | A single Node.js process on Fastify serves riders and operators and holds the adapters. | [0004](../adr/0004-nodejs-fastify-for-the-api.md) |

**Structural idea.** One backend application owns the domain. A mobile app and an operator console are clients. Dock hardware and payments stay outside the boundary. We do not split unlock, billing, and inventory into separate deployable services in the first release; the team size does not justify that operational cost. The process is Node.js 22 and Fastify. PostgreSQL is in the same private network, and the serving process connects as `citycycle_app`.
