---
title: Scope and Limitations
description: Learn exactly what Event Nest provides, what remains application-owned, and the failure boundaries of storage, snapshots, and subscriptions.
---

Event Nest provides event-sourcing primitives and database adapters for NestJS. It is intentionally not a complete CQRS platform, ORM, distributed event bus, or hosted event store.

## Supported scope

### Core model

`@event-nest/core` provides:

- Named domain event registration with optional aliases for historical names.
- An `AggregateRoot` base class with uncommitted events, `append`, `commit`, ordered replay, and stream version state.
- `@AggregateRootConfig` and `@ApplyEvent` metadata for aggregate identity and event appliers.
- An `EventStore` contract and `AggregateRepository` helper for load and save workflows.
- Optimistic concurrency errors when the persisted aggregate version does not match the expected version.
- Optional snapshot contracts and built-in count, event, aggregate, all-of, and any-of policies.
- Provider-discovered domain subscriptions that run after persistence.
- Loading multiple aggregate streams by identifier and permanently purging one aggregate's stored state.

### Built-in storage

The repository contains adapters for these databases:

| Adapter | Required event storage | Optional snapshot storage |
| --- | --- | --- |
| MongoDB | Aggregate and event collections | A snapshot collection together with a snapshot strategy |
| PostgreSQL | Aggregate and event tables in a schema | A snapshot table together with a snapshot strategy |
| Microsoft SQL Server | Aggregate and event tables in a schema | A snapshot table together with a snapshot strategy |

Each adapter stores event payloads, event and aggregate names, timestamps, and per-aggregate versions. Event persistence and aggregate version advancement occur in an adapter transaction. Database setup, permissions, indexes, capacity, backups, and availability remain deployment responsibilities.

## Outside the scope

Event Nest does not provide:

- A command bus, query bus, command handlers, sagas, or process-manager framework.
- HTTP, GraphQL, or message-based application interfaces.
- An ORM or general-purpose entity repository.
- Projection schemas, query models, projection checkpoints, rebuild orchestration, or lag monitoring.
- Event payload upcasters or an automated event-data migration system. Event aliases resolve old names only.
- Cross-aggregate transaction orchestration or automatic retries after a concurrency conflict.
- Hosted storage, database migrations for application environments, backup management, or operational dashboards.
- A distributed message broker, outbox, inbox, durable consumer, retry queue, or dead-letter queue.

You can combine Event Nest with NestJS CQRS, your own projection stores, and messaging infrastructure, but those systems have separate contracts and failure modes.

## Subscriptions are not distributed messaging

This distinction is important. `@DomainEventSubscription` marks a NestJS provider that the adapter discovers in the **same running application process**. After a commit persists events, Event Nest invokes matching providers with `PublishedDomainEvent` objects.

It does not send those events over a network or retain a delivery cursor. Another process or service will not receive them unless application code explicitly publishes an integration message. There is no built-in durable retry after a crash, consumer acknowledgement, replay for a newly deployed subscriber, partitioning, or dead-letter handling.

Use these subscriptions for process-local reactions whose failure behavior you understand. Use durable messaging infrastructure when delivery must cross a process boundary or survive process loss.

## Commit and failure boundaries

The commit pipeline has distinct stages:

1. A snapshot strategy is evaluated, when snapshots are configured.
2. New events and the aggregate version are saved by the adapter.
3. The aggregate's in-memory version is updated.
4. A selected snapshot is written.
5. Domain subscriptions are dispatched.

Events are durable before subscriptions run. This has several consequences:

- Default asynchronous subscriptions do not delay the return from `commit`; their errors are logged rather than returned to the caller.
- A subscription configured with `isAsync: false` is awaited. Its error is wrapped in `SubscriptionException`, but already persisted events are not rolled back.
- A snapshot write also occurs after event persistence. If that write fails, the commit rejects even though the event save has already completed, and subscription dispatch is not reached.
- Application code must not assume that every rejected commit means no event was stored. Recovery and retry logic should inspect the failure type and persisted stream version.

This is not an atomic event-plus-side-effect or event-plus-snapshot boundary. Design idempotent projection updates and explicit recovery procedures for work that matters.

## Concurrency boundaries

Built-in stores compare one aggregate's expected version with its current stored version. On success, each new event receives the next version. On mismatch, `EventConcurrencyException` rejects the save.

Event Nest does not merge competing changes or retry the command. The application must reload, reconsider business rules, and decide whether retrying is valid. A single aggregate commit also does not create one transaction across unrelated aggregate streams or external side effects.

## Event compatibility

Persisted events are long-lived data:

- `@DomainEvent` names must be unique and stable.
- Aliases allow historical names to resolve to the current event class, while new writes use the current name.
- Aliases do not rewrite stored rows and do not adapt payload fields or semantics.
- Event classes must serialize and deserialize through `class-transformer` correctly.
- Every event replayed by an aggregate needs both a registered class and a matching `@ApplyEvent` method.

Plan compatibility before changing a name, payload, event meaning, or aggregate applier. Test replay against representative historical streams, not only newly created events.

## Snapshot limitations

Snapshots are optional and never replace event history. Enabling them requires both a strategy and an adapter-specific snapshot collection or table. The aggregate must also declare a snapshot revision and implement both snapshot methods.

The revision protects against loading an incompatible snapshot format. `AggregateRepository` falls back to full replay on a revision mismatch, so the complete event stream must remain usable. The application still owns snapshot payload design, revision changes, replay performance measurement, and validation that a snapshot plus newer events produces the same state as full replay.

## Adapter constraints

- MongoDB persistence and purge operations use transactions, so the MongoDB deployment must support transactions. Aggregate identifiers are interpreted as MongoDB `ObjectId` values by the built-in store.
- PostgreSQL and SQL Server use application-configured schemas and table names. Their built-in schemas use UUID-compatible aggregate and event identifiers.
- Automatic table creation for PostgreSQL and SQL Server is optional, disabled by default, and requires schema-creation permissions when enabled.
- Storage configuration is global to an adapter module registration. Multi-database routing, tenant placement, archival, and custom partitioning are not managed automatically.

Confirm database-specific behavior and operational requirements with production-like infrastructure before deployment.

## Maturity

The current repository packages are version `6.0.0`, include automated tests, and support NestJS 10 and 11 through the core package's peer dependencies. The project's own README says extensive production testing has not yet been conducted and advises use at your own risk.

Treat that statement as an engineering input: run workload, conflict, crash, replay, backup, restore, and upgrade tests for your environment. If you need a system with established large-scale production evidence or managed operational guarantees, Event Nest does not currently claim either.

Return to [When to Use It](/overview/when-to-use-it/) for a decision checklist or proceed to [Build Your First Aggregate](/build-your-first-aggregate/installation/).
