---
status: proposed
date: 2026-08-04
decision-makers: CityCycle engineering
consulted: support, product
---

# Short bike hold in Redis, not a trip

## Context and Problem Statement

[RFC 0002](../rfc/0002-hold-a-bike-before-unlock.md) asks to keep a bike for a rider who is walking to the station. [ADR 0002](0002-redis-for-station-availability.md) only locks a bike for 15 seconds during unlock. Where does the longer hold live, and does it create a trip?

## Decision Drivers

* The hold must expire even if the app is killed
* PostgreSQL remains the ledger of trips and payments, not of intentions
* The map must hide the held bike within the same 30 second freshness goal
* One rider must not be able to freeze several bikes

## Considered Options

* Redis key with a 90 second TTL, no PostgreSQL row
* A `holds` table in PostgreSQL
* Lengthen the existing 15 second unlock lock

## Decision Outcome

Chosen option: "Redis key with a 90 second TTL, no PostgreSQL row", because the hold is a temporary claim, not a trip, and Redis already owns the hot availability path.

This ADR is **proposed**. It is not accepted, and [section 6](../architecture/06_runtime_view.md) still describes the current unlock. The map changes only after this decision is accepted.

### Consequences

* Good, because an abandoned hold disappears with the TTL
* Good, because a failed hold writes nothing to the trip ledger
* Bad, because a Redis flush drops every live hold; riders retry
* Bad, because 90 seconds is a guess until support confirms the walk time

## Pros and Cons of the Options

### Redis TTL (proposed)

* Good, because it matches the availability cache already in production
* Bad, because the hold is gone if Redis is down; unlock falls back to the 15 second lock

### PostgreSQL `holds` table

* Good, because the claim survives a Redis restart
* Bad, because expiry needs a job, and the map read we tried to keep off PostgreSQL comes back

### Longer unlock lock

* Good, because no new route
* Bad, because it reserves the dock for someone who is not there yet

## More Information

Review is on [RFC 0002](../rfc/0002-hold-a-bike-before-unlock.md). Do not add `POST /holds` to section 5 until this status is `accepted`.
