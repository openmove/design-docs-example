# RFC: Hold a bike while the rider walks to it

- Author(s): Alex Rivera
- Status: In review
- Created: 2026-08-04
- Updated: 2026-08-04
- Tracking: CITY-311
- Related ADRs: [0006](../adr/0006-short-hold-in-redis.md) (proposed, not accepted)

## Summary

When a rider selects a bike on the map, hold it for 90 seconds so the walk to the station does not lose it to someone else. The hold lives in Redis with a TTL. The trip, and therefore PostgreSQL, starts only when the dock confirms the unlock. This is not built yet.

## Motivation

CityCycle has been live for six weeks. Support sees the same complaint daily: the map showed a bike, the rider walked three minutes, and the unlock returned 409 because another rider took it. The Redis lock in [ADR 0002](../adr/0002-redis-for-station-availability.md) lasts 15 seconds and covers only `POST /trips/unlock`. It does not cover the walk.

Cases this design has to handle:

* A rider taps a bike and gets a 90 second hold. The map shows that bike as unavailable to everyone else.
* The rider unlocks within 90 seconds. The hold becomes the unlock lock, then a trip.
* The rider walks away. The hold expires on its own. No row is left in PostgreSQL.
* A rider already holding a bike taps a second one. The first hold is released.

## Goals and non-goals

**Goals**

* One hold per rider, 90 seconds, on the bike they tapped
* Other riders do not see that bike as free during the hold
* No trip and no payment until the dock acks the unlock
* The hold disappears without a cleanup job

**Non-goals**

* Reserving a bike for hours, or for a future time
* Holding a specific dock while the rider is still at home
* Changing the 3 second unlock goal

## Proposed design

`POST /holds` with `{ bike_id }` sets a Redis key `hold:{bike_id}` to the rider id, TTL 90 seconds, only if the bike is free and the rider has no other hold. `DELETE /holds/current` releases it. `POST /trips/unlock` requires a hold owned by that rider, or takes the existing 15 second lock if the rider is already at the dock and skipped the map tap.

PostgreSQL is unchanged. A hold is not a trip. Fastify validates the body and the rider role before Redis is touched.

The map reads the same availability snapshot as today, minus bikes with a live hold key.

## Alternatives considered

| Alternative | Why it is not the proposal |
|-------------|----------------------------|
| A `holds` table in PostgreSQL | A sweeper must expire rows, and the map would read the ledger on the hot path we moved to Redis |
| Stretch the unlock lock from 15 seconds to 5 minutes | The dock would stay reserved while the rider is still in another street, and a crashed app would block a bike for the whole TTL with no cancel |
| Do nothing | The complaint is already the top support topic. The 15 second lock solves a double-unlock, not the walk |

## Drawbacks and risks

- A rider can tap a bike and lock it for 90 seconds without going. One hold per rider limits this to a single bike.
- The map can be wrong for the TTL if Redis evicts the key early. The unlock then fails with a clear "hold expired".
- Two clients racing `POST /holds` on the last bike: Redis `SET` with `NX` makes one of them lose.

## Rollout

Feature flag `bike_holds_enabled`, off by default. Enable for one station cluster. Watch hold-expire rate and the 409 rate on unlock. Rollback is the flag: the 15 second unlock lock keeps working.

## Unresolved questions

- 90 seconds or 120. Product wants a number from the support tickets before this is accepted.
- Whether the app shows a countdown. Not required for the API.
