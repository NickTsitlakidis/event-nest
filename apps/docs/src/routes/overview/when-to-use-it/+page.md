---
title: When to Use Event Nest
description: Decide whether Event Nest and event sourcing fit your NestJS application's domain, storage, and operational needs.
---

Event Nest is useful when event sourcing is already a good fit for part of your domain. It removes repeated persistence and replay plumbing; it does not remove the modeling, migration, and operational costs of keeping an event history.

## A strong fit

Consider Event Nest when most of these conditions are true:

- The application uses NestJS and can run on Node.js 22 or newer.
- A business capability has meaningful behavior and invariants that belong inside an aggregate boundary.
- The history of accepted changes is valuable for audit, explanation, temporal analysis, or rebuilding derived state.
- Commands naturally target one aggregate stream and can use optimistic concurrency.
- MongoDB, PostgreSQL, or Microsoft SQL Server is an acceptable event store.
- The team is prepared to treat persisted event names and payloads as long-lived data contracts.
- The team can design, rebuild, monitor, and repair projections when necessary.

Examples often include order lifecycles, reservations, approvals, account state, and other workflows where the sequence of business facts matters. Domain complexity, not table count or traffic alone, is the useful signal.

## A weak fit

A conventional state model will usually be simpler when:

- The application is mostly CRUD with little behavior beyond validation and access control.
- Only current state matters and change history has no clear business or operational value.
- Most operations must atomically update many unrelated aggregate streams.
- The required database is not one of the three built-in adapters and you do not intend to implement and maintain an `EventStore` adapter.
- The team cannot commit to event compatibility, projection recovery, and event-store operations over the lifetime of the data.
- The primary goal is service-to-service event delivery rather than aggregate persistence and replay.

For the last case, use a message broker or other distributed messaging infrastructure. Event Nest's domain subscriptions are local callbacks after persistence, not remotely consumable integration events.

## Questions to answer first

### What is the aggregate boundary?

Event Nest's concurrency check is per aggregate identifier. A useful aggregate boundary protects a set of invariants that can be changed and committed together. If every command needs a transaction across many unrelated streams, the model and this persistence API are working against the requirement.

### Which events are durable domain facts?

Persist events that explain accepted domain changes, not framework notifications or transient implementation details. Their configured names and serialized payloads become historical data. Renaming support through aliases preserves name lookup, but changing payload shape still needs an application-owned compatibility or migration strategy.

### How will reads work?

An aggregate is optimized for enforcing rules, not for serving every query. Event Nest can call in-process subscriptions after a commit, but the application owns projection schemas, update logic, query APIs, rebuild procedures, and lag monitoring.

### What delivery guarantees are required?

By default, domain subscriptions do not delay `commit`. A subscription configured with `isAsync: false` does delay the return, but it still runs after storage has committed. If it fails, the event is not rolled back. If a reaction must survive process crashes and be retried across services, design a durable outbox or messaging solution outside Event Nest.

### Will streams become long?

Full replay is the simplest option and preserves one source of truth. For streams where replay cost becomes material, all three adapters support optional snapshots. Snapshot format, revision changes, creation policy, and recovery behavior still need deliberate design and testing.

## Adoption approach

Use event sourcing selectively rather than making it an application-wide default:

1. Choose one bounded capability with valuable history and clear invariants.
2. Define the aggregate boundary and a small event vocabulary.
3. Prove load, commit, conflict, and replay behavior with production-shaped data.
4. Build at least one projection and test how it is rebuilt.
5. Exercise backup, restore, snapshot fallback, and failed-subscription scenarios.
6. Expand only if the benefits justify the additional data and operational model.

## Compatibility and maturity

The packages in this repository are currently version `6.0.0`. `@event-nest/core` declares support for NestJS 10 and 11 and requires Node.js 22 or newer. The repository includes unit and adapter integration tests.

The project also states that it has **not been widely tested in production**. Version number and test coverage should not be interpreted as evidence of broad production adoption. Evaluate failure behavior, database requirements, observability, throughput, and recovery against your own workload before relying on it for critical systems.

Review the exact [Scope and Limitations](/overview/scope-and-limitations/), then [build your first aggregate](/build-your-first-aggregate/installation/) if the fit is sound.
