---
status: accepted
date: 2026-03-13
decision-makers: CityCycle engineering
consulted: city transport office (retention)
---

# PostgreSQL reachable only from the API, with two roles

## Context and Problem Statement

[ADR 0001](0001-postgresql-for-trips-and-inventory.md) makes PostgreSQL the ledger for trips, inventory, and payments. That data includes rider identifiers and payment references. How do we keep the database from becoming a second public API?

## Decision Drivers

* Rider and payment data must not be reachable from the internet
* The running API must not be able to drop tables or read backups
* Migrations must still be possible from CI
* One region, managed PostgreSQL, same operational story as the rest of the first release
* A stolen application credential must have a narrow blast radius

## Considered Options

* Public database endpoint, TLS, one strong password for the app
* Private network only, TLS, separate roles for the app and for migrations
* PostgreSQL on the same virtual machine as the API

## Decision Outcome

Chosen option: "Private network only, TLS, separate roles for the app and for migrations", because the ledger stays off the internet and the process that serves riders cannot change the schema.

### Consequences

* Good, because the database accepts connections only from the API subnet, over TLS, with SCRAM authentication
* Good, because `citycycle_app` has `SELECT`, `INSERT`, and `UPDATE` on the application schema and nothing else
* Good, because `citycycle_migrator` is used by the migration job in CI, not by the Fastify process
* Bad, because a developer cannot point a local GUI at production; they use a bastion or a read-only replica with a time limit
* Bad, because connection limits must be sized for the pool (two replicas, a small pool each), not for ad-hoc clients

### Confirmation

A connection attempt from outside the subnet fails. The API container's environment has a connection string for `citycycle_app` and no superuser secret. A migration run from CI uses `citycycle_migrator` and refuses to start if pointed at a role that owns the tables.

## Pros and Cons of the Options

### Private network, TLS, two roles (chosen)

* Good, because network and privileges both have to fail before a rider table is exposed
* Good, because it matches a managed PostgreSQL service in the same region as the API
* Bad, because local debugging of production data needs an explicit, logged path

### Public endpoint and one password

* Good, because it is easy to connect dashboards and laptops
* Bad, because the ledger is on the internet with a single secret
* Bad, because that secret can also change the schema if it is the owner role

### PostgreSQL on the API machine

* Good, because there is no separate network path
* Bad, because a bad deploy and a database failure become the same incident
* Bad, because backups, failover, and the 24-month retention of trips are harder on a disk we manage

## More Information

Backups are encrypted, kept for 14 days, with point-in-time recovery. Trip rows themselves follow the 24-month retention in [section 2](../architecture/02_architecture_constraints.md), then anonymisation. The serving process never runs migrations; see [section 7](../architecture/07_deployment_view.md).
