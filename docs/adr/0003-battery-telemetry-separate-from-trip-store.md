---
status: accepted
date: 2026-06-18
decision-makers: CityCycle engineering
consulted: City transport office (retention), fleet operations
---

# TimescaleDB for battery samples, not the trip store

## Context and Problem Statement

[RFC 0001](../rfc/0001-add-electric-bikes.md) adds electric bikes that emit battery samples as often as every 10 seconds. PostgreSQL already holds trips and payments and must stay reliable for billing. Where do those samples live, and which product writes them?

## Decision Drivers

* Protect trip-store write latency, backup size, and restore time
* Keep latest battery percent available for unlock and map (≤ 30 s freshness still applies)
* Give operators enough history to plan depot charging (90 days)
* Stay within the small team's operational budget; prefer SQL they already know

## Considered Options

* Same PostgreSQL instance: a `battery_samples` table, or a Timescale hypertable next to `trips`
* Latest value only on the `bikes` row; no sample history
* Second managed TimescaleDB instance for samples; latest value denormalized on `bikes`
* InfluxDB Cloud for samples
* Object storage files of raw samples, queried ad hoc

## Decision Outcome

Chosen option: **"Second managed TimescaleDB instance; latest percent on `bikes`"**.

Samples never go into the trip database. A separate Timescale service in the same private network holds the history. Unlock and the map never read it. That is the technical split, not only "a time-series store somewhere".

### How it works

MQTT topic `bike/{id}/battery` delivers `{ observed_at, percent }`. The Fastify `telemetry` module does two writes, in this order:

1. `INSERT` into Timescale `battery_samples`.
2. `UPDATE bikes SET battery_percent = $1, battery_updated_at = $2 WHERE id = $3` on PostgreSQL.

Unlock and the map read only `bikes.battery_percent`. Operator drain charts read only Timescale. If the Timescale write fails, the consumer retries; it does not skip the Postgres update once the sample is accepted, and it does not write a trip row.

Schema on the Timescale instance:

```sql
CREATE TABLE battery_samples (
  bike_id      uuid        NOT NULL,
  observed_at  timestamptz NOT NULL,
  percent      smallint    NOT NULL CHECK (percent BETWEEN 0 AND 100)
);

SELECT create_hypertable('battery_samples', by_range('observed_at'));
SELECT add_retention_policy('battery_samples', INTERVAL '90 days');
SELECT add_compression_policy('battery_samples', INTERVAL '7 days');
```

The API connects as role `citycycle_telemetry` (INSERT/SELECT on `battery_samples` only), TLS, private subnet — the same lock-down pattern as [ADR 0005](0005-postgresql-network-and-roles.md), on a different instance. Trip backups do not include samples. Sample backups do not include payments.

### Consequences

* Good, because PostgreSQL write rate stays tied to trips, not to 200 bikes × 10 s
* Good, because the team queries history with SQL they already know
* Good, because 90-day retention and 7-day compression are Timescale policies, not a cron job
* Bad, because one more managed database to provision, secure, and monitor
* Bad, because latest value and history can briefly diverge; unlock trusts `bikes.battery_percent`

### Confirmation

In staging, publish 10 s samples from 200 simulated bikes for one hour. PostgreSQL TPS for trips stays comparable to baseline. Unlock still enforces the 15% rule from the `bikes` row. `SELECT count(*) FROM battery_samples` on Timescale grows; the `trips` table does not.

## Pros and Cons of the Options

### Second TimescaleDB instance (chosen)

* Good, because hypertables, retention, and compression match this write pattern
* Good, because the driver and SQL dialect are the ones from ADR 0001
* Good, because IOPS, backups, and restores are isolated from billing
* Bad, because a second instance costs more than a table on the existing Postgres

### Same PostgreSQL instance (plain table or hypertable)

* Good, because one cluster to operate
* Bad, because sample volume shares disks, WAL, and connection slots with billing
* Bad, because a trip restore would replay or skip 90 days of battery noise
* Bad, because a Timescale extension on the ledger couples two different lifecycles

### Latest value only on `bikes`

* Good, because simplest: one `UPDATE`, no new product
* Bad, because the city asked for charging diagnostics over time
* Bad, because debugging "bike died mid-trip" needs history

### InfluxDB Cloud

* Good, because it is built for this ingest shape
* Bad, because a new query language and client for one table
* Bad, because the team already runs Postgres and would add a second operational dialect

### Object storage dumps

* Good, because cheap
* Bad, because operator queries and alerts become batch jobs
* Bad, because poor fit for "list bikes under 20% now" (that read stays on `bikes` anyway, but drain charts would not)

## More Information

Produced by [RFC 0001](../rfc/0001-add-electric-bikes.md). Updates the [container diagram](../architecture/diagrams/c4-containers.md) and [section 5](../architecture/05_building_block_view.md).
