# RFC: Add electric bikes

- Author(s): Alex Rivera
- Status: Implemented
- Created: 2026-06-02
- Updated: 2026-06-20
- Tracking: CITY-184
- Related ADRs: [0003](../adr/0003-battery-telemetry-separate-from-trip-store.md)

## Summary

Add docked electric bikes to CityCycle. Riders see battery level on the map, can only unlock an e-bike above a minimum charge, and pay a higher per-minute rate. Battery samples from the bike must not be written into the trip database at high frequency.

## Motivation

The city is deploying 200 e-bikes in Q3. Without product support, those bikes would sit unused or be tracked in a side spreadsheet. Riders already ask for assisted bikes on hills. Operators need to know which e-bikes need charging at the depot.

Cases this design must handle:

* A rider opens the map and sees which nearby bikes are e-bikes and their battery percent.
* A rider tries to unlock an e-bike at 12% battery and is refused with a clear error.
* An operator lists e-bikes below 20% to haul them for charging.
* A firmware update starts sending battery samples every 10 seconds while the bike is awake.

## Goals and non-goals

**Goals**

* Support a new bike type `electric` beside `mechanical`
* Show battery percent on map and unlock screens
* Block unlock under 15% charge
* Different price tariff for e-bike trips
* Operator filter for low-battery e-bikes

**Non-goals**

* Free-floating e-bikes
* In-station charging hardware control (stations stay dock-only; charging is at the depot)
* Rider-facing range estimation beyond battery percent
* Dynamic pricing beyond a fixed e-bike multiplier

## Proposed design

**Domain.** `Bike` gains `type` (`mechanical` | `electric`) and, for e-bikes, `battery_percent` (0–100) and `battery_updated_at`. Unlock checks `battery_percent >= 15` for electric bikes. Pricing reads type when the trip closes.

**Telemetry.** Dock firmware (or a bike gateway) publishes battery samples on MQTT `bike/{id}/battery`. The API updates `bikes.battery_percent` for map/unlock, and `INSERT`s the sample into a **second TimescaleDB instance**. Trip and payment rows stay in PostgreSQL without per-sample writes. Product and wiring are the durable decision in [ADR 0003](../adr/0003-battery-telemetry-separate-from-trip-store.md).

**API additions.**

* Map and station payloads include `bike.type` and `bike.battery_percent` when type is electric.
* `POST /trips/unlock` returns `409 battery_too_low` when under threshold.
* Operator list accepts `?type=electric&battery_max=20`.

**Rollout.** Feature flag `ebikes_enabled`. Mechanical flows unchanged when the flag is off. Enable per station cluster as hardware arrives.

## Alternatives considered

| Alternative | Why it was not chosen |
|-------------|------------------------|
| Store every battery sample in PostgreSQL | Sample volume would bloat the trip store and compete with billing writes |
| No history, only overwrite `battery_percent` on the bike row | Enough for unlock, but operators lose charging diagnostics the city asked for |
| Separate "e-bike service" | Team size; a new deployable unit is not justified for one bike type |
| Do nothing until next year | Hardware arrives in Q3; bikes would be useless |

## Drawbacks and risks

- Security and privacy: battery traces are not personal data by themselves; still retain samples 90 days only.
- Performance and scale: 200 bikes × sample every 10 s while awake is a Timescale hypertable problem; keep it off the trip primary.
- Operability: new MQTT topic and a second data store to monitor.
- Compatibility: older app versions ignore unknown fields; force-update only if we need the battery UI before launch.

## Rollout

1. Deploy API with flag off; migrate `bike.type` default `mechanical`.
2. Stand up the Timescale instance and `battery_samples` hypertable; consume `bike/{id}/battery` in staging with a hardware bench.
3. Enable flag for one station; verify unlock refusal under 15% and operator filter.
4. Expand station by station; watch unlock p95 and PostgreSQL write rate (must stay flat).

Rollback: disable `ebikes_enabled`. E-bikes become non-unlockable; mechanical fleet unaffected.

## Unresolved questions

* ~~Exact telemetry store product~~ → [ADR 0003](../adr/0003-battery-telemetry-separate-from-trip-store.md): managed TimescaleDB, second instance.
* Minimum battery threshold 15% vs 20%: product to confirm with the city before launch (default 15% in this RFC).
