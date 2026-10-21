# Glossary

| Term | Definition |
|------|------------|
| Station | A docked location with a fixed number of slots |
| Dock / slot | One physical lock at a station |
| Unlock | Command that opens a dock so the rider can take the bike |
| Trip | One rental from unlock to return |
| Fill level | Ratio of bikes present to slots at a station |
| Availability snapshot | Cached free-bike and free-slot counts per station, held in Redis |
| `citycycle_app` | PostgreSQL role used by the Fastify process. Can read and write rows, cannot change the schema |
| `citycycle_migrator` | PostgreSQL role used by the CI migration job |
| TimescaleDB | Second managed database for e-bike battery samples. Not the trip ledger |
| `battery_samples` | Timescale hypertable: `bike_id`, `observed_at`, `percent` |
| `citycycle_telemetry` | Timescale role used by the Fastify `telemetry` module |
