# Cross-cutting Concepts

## Authentication and roles

Riders, operators, and support use the same identity provider with different roles (`rider`, `operator`, `support`). A Fastify `onRequest` hook checks the token and rejects the call before the route handler. Dock devices authenticate to MQTT with per-station credentials issued at install time.

## Database access

PostgreSQL is on the private network, TLS only. The serving process uses the role `citycycle_app` and a small connection pool. Migrations run as `citycycle_migrator` from CI, before the new containers take traffic. See [ADR 0005](../adr/0005-postgresql-network-and-roles.md).

Redis requires a password and TLS. It is not a place for trip history.

## Idempotency of unlock

`POST /trips/unlock` accepts an `Idempotency-Key` from the app. Retries after a flaky mobile network must not create a second trip or a second MQTT unlock for the same key within the lock TTL.

## Observability

Every unlock and return carries a `trip_id` through logs, MQTT correlation, and payment calls. The SLO dashboards watch unlock latency p95, Redis hit rate for the station map, and `pending_payment` age.
