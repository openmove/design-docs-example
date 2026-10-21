# Building Block View

See the [container diagram](diagrams/c4-containers.md).

## Whitebox Overall System

Motivation  
Keep the first release as one deployable backend plus two clients. Split only what the quality goals force: a hot cache for station availability, separate from the trip ledger.

Contained Building Blocks

| Building block | Responsibility | Main interfaces |
|----------------|----------------|-----------------|
| Mobile app | Rider unlock, map, trip history | HTTPS → API |
| Operator console | Station fill view, alerts, trip lookup | HTTPS → API |
| CityCycle API | One Node.js process on Fastify: unlock, return, billing, inventory | HTTPS JSON; MQTT to docks; Redis; PostgreSQL; payment provider |
| PostgreSQL | System of record for stations, bikes, trips, payments | Used only by the API |
| Redis | Station availability snapshot and short-lived unlock locks | Used only by the API |

Important Interfaces  
- `GET /stations?near=lat,lng` — map. Reads Redis.  
- `POST /trips/unlock` — rider unlock; returns when the dock acks or times out.  
- `POST /trips/{id}/return` — dock-confirmed return; starts payment capture.  
- `GET /trips/{id}` — rider or support looks up one trip.  
- `GET /operator/stations` — city-wide fill levels for redistribution.  
- MQTT `station/{id}/events` — dock and undock events from hardware.  
- MQTT `station/{id}/commands` — unlock commands to hardware.

Every JSON route declares a Fastify schema. A payload that fails the schema never reaches PostgreSQL.

### Mobile app

Purpose: let a rider find a bike, unlock it, and see the open trip.  
Interfaces: CityCycle API over HTTPS.  
Quality: unlock latency is dominated by the API and the dock, not by the app.  
Open issues: offline mode is not supported in v1.

### Operator console

Purpose: show live fill levels and support trip lookup.  
Interfaces: CityCycle API over HTTPS.  
Quality: city-wide list under 2 s (reads Redis via the API).

### CityCycle API

Purpose: all domain behavior, in one Node.js 22 process.  
Interfaces: HTTPS for clients; MQTT for docks; Redis; PostgreSQL; payment provider.  
See [ADR 0004](../adr/0004-nodejs-fastify-for-the-api.md).  
Directory: `services/api` (not present in this docs-only example).  
Risks: a single deployable unit means a bad release affects unlock and billing together. Mitigated by a small surface and a fast rollback.

### PostgreSQL

Purpose: durable trips, inventory, and payment records.  
See [ADR 0001](../adr/0001-postgresql-for-trips-and-inventory.md) and [ADR 0005](../adr/0005-postgresql-network-and-roles.md).

Tables in the `app` schema: `riders`, `stations`, `docks`, `bikes`, `trips`, `payments`. A trip row points at a bike, a start dock, an end dock, and a rider. Payment rows store the provider reference and the state (`pending`, `captured`, `refunded`), not the card number.

The Fastify process connects as `citycycle_app`. Schema changes are a migration job using `citycycle_migrator`.

### Redis

Purpose: availability counts and unlock locks.  
See [ADR 0002](../adr/0002-redis-for-station-availability.md).  
Risk: if Redis is down, unlock falls back to PostgreSQL with higher latency; the map may show a degraded banner.

## Level 2

Inside the one Fastify process, five modules. They are folders, not deployable units.

| Module | Does | Talks to |
|--------|------|----------|
| `http` | Routes, schema, auth hook, idempotency key | The other modules |
| `trips` | Trip state: unlock requested, started, returned, pending payment, closed | PostgreSQL |
| `stations` | Station, dock, and bike records | PostgreSQL, Redis for the map read |
| `docks` | MQTT commands and events | Dock broker |
| `billing` | Capture and refund after return | Payment provider, PostgreSQL |

Battery samples from [ADR 0003](../adr/0003-battery-telemetry-separate-from-trip-store.md) get a sixth module, `telemetry`, which writes the time-series store and updates `bikes.battery_percent`. It does not write a row per sample into `trips`.
