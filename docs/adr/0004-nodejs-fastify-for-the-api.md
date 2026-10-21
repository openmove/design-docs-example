---
status: accepted
date: 2026-03-09
decision-makers: CityCycle engineering
---

# Node.js and Fastify for the API

## Context and Problem Statement

CityCycle needs one backend process that serves the rider app and the operator console, talks to PostgreSQL, Redis, MQTT, and the payment provider, and stays inside the 3 second unlock budget. Which runtime and HTTP framework should that process use?

## Decision Drivers

* A small team that should run one service, not a framework of services
* JSON APIs with validation at the boundary
* Short unlock path: little framework overhead before the Redis lock and the MQTT command
* Familiarity: the team already ships Node.js
* TypeScript for the domain types (trip state, bike type) without a separate compile-time stack

## Considered Options

* Node.js 22 with Fastify
* Node.js with Express
* Node.js with NestJS
* A JVM service (Spring)

## Decision Outcome

Chosen option: "Node.js 22 with Fastify", because the team already runs Node, Fastify gives schema validation and a plugin model without NestJS's module machinery, and one process is enough for Riverside.

### Consequences

* Good, because route schemas reject bad unlock and return payloads before they touch Redis or PostgreSQL
* Good, because auth, PostgreSQL, Redis, and MQTT are Fastify plugins in one process, sharing one request context
* Bad, because a CPU-heavy job in this process would stall unlocks; battery analytics stay out of it ([ADR 0003](0003-battery-telemetry-separate-from-trip-store.md))
* Bad, because Fastify's plugin encapsulation surprises people who expect Express middleware order

### Confirmation

A load test of `POST /trips/unlock` against two replicas shows the API's own time (excluding the dock ack) stays under 50 ms at p95. Schema failures return 400 without a database query.

## Pros and Cons of the Options

### Node.js 22 with Fastify (chosen)

* Good, because JSON Schema on the route is the contract, and Fastify compiles it
* Good, because the plugin model matches "one process, several adapters"
* Neutral, because the team must learn encapsulation (decorators and `fastify-plugin`)
* Bad, because the ecosystem of examples is smaller than Express

### Node.js with Express

* Good, because everyone on the team has used it
* Bad, because validation, typing, and error handling become libraries we wire by hand
* Bad, because it does not buy a lower unlock latency than Fastify

### Node.js with NestJS

* Good, because a module layout is documented for teams that want it
* Bad, because the decorator and module machinery is more than this codebase needs
* Bad, because a second abstraction over the HTTP layer makes the unlock path harder to trace

### JVM service

* Good, because a mature stack for long-running services
* Bad, because the team would operate a runtime they do not ship today
* Bad, because image size and cold start do not help a service we scale on unlock latency

## More Information

The process layout is in [section 5](../architecture/05_building_block_view.md). PostgreSQL is reached only through the pool plugin, with the rules in [ADR 0005](0005-postgresql-network-and-roles.md).
