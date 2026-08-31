---
title: Meet Event Nest
description: Understand Event Nest's aggregate model, event lifecycle, persistence adapters, and place inside a NestJS application.
---

Event Nest is a collection of NestJS libraries for one focused job: persisting event streams and using them to rebuild aggregate state. It supplies the event-sourcing mechanics while leaving your application's domain boundaries and use cases in application code.

## The problem it addresses

An event-sourced aggregate does not store only its latest shape. It records the business facts that changed it, such as `OrderOpened` or `PaymentCaptured`, and reconstructs current state by applying those facts in stream order.

That model creates recurring infrastructure work:

- Give event classes stable persisted names and serialize their payloads.
- Associate an event stream with an aggregate type and identifier.
- Replay stored events through the correct state-changing methods.
- Append new events and persist them with sequential aggregate versions.
- Detect when two writers try to commit from the same aggregate version.
- Optionally start replay from a compatible snapshot.
- Notify application code after persistence succeeds.

Event Nest implements those mechanics behind a shared core API and database-specific adapters.

## The programming model

### Domain events

A class decorated with `@DomainEvent("stable-name")` is a persistable event type. Its configured name, not the TypeScript class name, identifies it in storage. Event payloads are serialized and restored with [`class-transformer`](https://github.com/typestack/class-transformer), so payload classes must remain compatible with that serialization model.

Aliases can map older persisted event names to a renamed event class. New events are always written under the current name; aliases do not transform an old payload into a new schema.

### Aggregate roots

An aggregate extends `AggregateRoot` and declares a persisted name with `@AggregateRootConfig`. A business method normally follows four steps:

1. Check an invariant using current aggregate state.
2. Construct a domain event describing the accepted change.
3. Apply the event to current in-memory state.
4. Call `append` to add it to the uncommitted event list.

`append` does not write to a database. Persistence happens when the aggregate is connected to an `EventStore` and committed, either directly or through `AggregateRepository.save`.

### Replay

Methods decorated with `@ApplyEvent(EventClass)` are used during `reconstitute`. Stored events are sorted by aggregate version, restored to their registered classes, and passed to the matching appliers. Replay changes state without appending or republishing those historical events.

Every event in the stream must have a registered event class and a matching applier on the aggregate. Missing registrations or appliers stop reconstitution rather than silently producing partial state.

### Persistence and versions

Each built-in adapter stores an aggregate's current version alongside its events. A commit checks the version read by the aggregate against the version in storage, assigns the next versions to new events, and updates the stored aggregate version in a transaction. A mismatch raises `EventConcurrencyException`; conflict retries and business-level conflict resolution remain application concerns.

### Snapshots

Snapshots are optional replay optimizations. A snapshot-aware aggregate declares a `snapshotRevision`, implements `toSnapshot` and `applySnapshot`, and forwards the authoritative aggregate version when reconstituting. Configured strategies decide when a snapshot should be created. The complete event history remains stored.

`AggregateRepository.load` uses snapshots automatically for snapshot-aware aggregate classes. If a stored snapshot revision differs from the class revision, the repository falls back to replaying the complete stream.

### Domain subscriptions

Classes decorated with `@DomainEventSubscription` are discovered among NestJS providers. Event Nest dispatches persisted events to their `onDomainEvent` methods after the event save and optional snapshot step.

These subscriptions run **inside the current application process**. They do not publish to Kafka, RabbitMQ, cloud queues, or another service, and they do not provide durable redelivery. See [Scope and Limitations](/overview/scope-and-limitations/) before using them for reliability-sensitive work.

## Packages and adapters

| Package | Responsibility |
| --- | --- |
| `@event-nest/core` | Aggregate base class, decorators, event store contracts, repository helper, subscriptions, snapshots, and exceptions |
| `@event-nest/mongodb` | MongoDB event and snapshot stores plus NestJS module configuration |
| `@event-nest/postgresql` | PostgreSQL event and snapshot stores plus NestJS module configuration |
| `@event-nest/mssql` | Microsoft SQL Server event and snapshot stores plus NestJS module configuration |

The adapter module registers an `EventStore` under the `EVENT_STORE` injection token. Applications may use that contract directly, but `AggregateRepository` is the shorter path for loading and saving one aggregate type.

## Where it fits

Event Nest sits inside a NestJS application, below domain services and above one supported database:

1. A controller, command handler, or service invokes an aggregate business method.
2. The aggregate applies and appends one or more events.
3. The repository or event store commits those events with an expected stream version.
4. A future load replays the stream, or a snapshot followed by newer events.
5. Process-local domain subscriptions can react after persistence.

It can be used alongside CQRS and Domain-Driven Design patterns, but it does not require or replace the NestJS CQRS module. It also does not generate your commands, queries, projections, or API.

Next, evaluate [When to Use It](/overview/when-to-use-it/) or [build your first aggregate](/build-your-first-aggregate/installation/).
