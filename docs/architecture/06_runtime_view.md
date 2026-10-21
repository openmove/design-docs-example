# Runtime View

## Unlock a bike

This is the system as it runs today. A hold that starts when the rider taps the bike, before this sequence, is under review in [RFC 0002](../rfc/0002-hold-a-bike-before-unlock.md). It is not part of this scenario until [ADR 0006](../adr/0006-short-hold-in-redis.md) is accepted.

```mermaid
sequenceDiagram
  actor Rider
  participant App as Mobile app
  participant API as CityCycle API
  participant Redis
  participant Dock as Dock controller
  participant PG as PostgreSQL

  Rider->>App: Unlock bike B at station S
  App->>API: POST /trips/unlock
  API->>Redis: Reserve bike B (lock TTL 15s)
  alt bike free
    Redis-->>API: ok
    API->>Dock: MQTT unlock B
    Dock-->>API: unlocked
    API->>PG: insert trip (async ok after ack)
    API-->>App: trip started
    App-->>Rider: bike unlocked
  else bike taken or lock fails
    Redis-->>API: conflict
    API-->>App: 409 try another bike
  end
```

Notable aspects: the rider waits for the dock ack, not for the PostgreSQL insert to finish. Redis holds a short lock so two riders cannot take the same bike. PostgreSQL remains the ledger once the trip exists.

## Return and charge

Omitted as a diagram. On dock-in, the dock emits an event; the API closes the trip in PostgreSQL, updates Redis counts, and captures payment. Failures in capture leave the trip in `pending_payment` for a retry job.
