---
title: Public API
description: Curated inventory of symbols exported by the Event Nest 6.0.0 package barrels.
---

This page lists symbols available from package-root imports in 6.0.0. It intentionally excludes implementation files that are not re-exported by a package's `src/index.ts`; importing those files by deep path is unsupported by each package's export map.

## `@event-nest/core`

### Aggregate model and decorators

| Export | Kind | Purpose |
| --- | --- | --- |
| `AggregateRoot` | Abstract class | Holds ID, version, and uncommitted events; provides `append()`, `commit()`, and `reconstitute()`. |
| `AggregateRootConfig` | Decorator | Configures durable aggregate name and optional snapshot revision. |
| `AggregateRootConfigParameters` | Interface | `{ name: string; snapshotRevision?: number }`. |
| `getAggregateRootName` | Function | Reads aggregate-name metadata from a class. |
| `getAggregateRootSnapshotRevision` | Function | Reads optional snapshot-revision metadata from a class. |
| `AggregateRootName` | Decorator | Deprecated name-only configuration; planned removal in 7.x. |
| `ApplyEvent` | Decorator | Associates an aggregate method with an event class for replay. |
| `SnapshotAware<Snapshot>` | Interface | Requires `applySnapshot()` and synchronous or asynchronous `toSnapshot()`. |
| `isAggregateInstanceSnapshotAware` | Type guard | Checks for callable snapshot methods. |
| `isAggregateClassSnapshotAware` | Function | Checks for numeric snapshot-revision metadata on an instance's class. |
| `assertIsSnapshotAwareAggregateRoot` | Assertion | Validates name, methods, and class revision or throws. |

See the [decorator reference](/api-reference/decorators/).

### Domain events and subscriptions

| Export | Kind | Purpose |
| --- | --- | --- |
| `DomainEvent` | Decorator | Registers an event's canonical persisted name and aliases. |
| `DomainEventOptions` | Type | Optional `{ aliases?: string[] }`. |
| `DomainEventEmitter` | Class | Discovers providers and dispatches persisted events. Usually adapter-managed. |
| `DomainEventSubscription` | Decorator | Registers a provider for event classes, optionally synchronously. |
| `getEventId` | Function | Reads the emitter's generated subscription ID for an event constructor. |
| `getEventsFromDomainEventSubscription` | Function | Reads subscribed classes from an instance's metadata. |
| `getSubscriptionAsyncType` | Function | Reads subscription async mode, defaulting to `true`. |
| `isDomainEventSubscription` | Function | Checks metadata and the presence of `onDomainEvent`. |
| `OnDomainEvent<T>` | Interface | Handler contract for subscription providers. |
| `PublishedDomainEvent<T>` | Interface | Payload plus aggregate ID, occurrence time, persisted event ID, and aggregate version. |
| `CoreModuleOptions` | Interface | Shared `concurrentSubscriptions?: boolean` adapter option. |

The helper functions are public because the barrel exports their source module, but normal applications need only the two decorators and `OnDomainEvent`/`PublishedDomainEvent` types.

### Event store and persisted records

| Export | Kind | Purpose |
| --- | --- | --- |
| `EVENT_STORE` | Symbol | Nest injection token for the configured event store. |
| `EventStore` | Interface | `addPublisher`, version/event/snapshot reads, ID generation, `save`, and `purgeAggregate`. |
| `AbstractEventStore` | Abstract class | Storage-independent publish pipeline for custom adapters. |
| `AggregateRepository<T>` | Class | Snapshot-aware load and publisher-connected save helper. |
| `AggregateRootFactory<T>` | Type | `(id, events, snapshot?, aggregateRootVersion?) => T`. |
| `AggregateRootClass<T>` | Type | Constructor/prototype representation that permits private aggregate constructors. |
| `AggregateRootSnapshot<T>` | Type | Infers the aggregate's snapshot payload type. |
| `SnapshotAwareAggregateRoot<T>` | Branded type | Internal-validation result used by snapshot store contracts. |
| `StoredEvent` | Class | Persisted event representation and payload reconstruction helper. |
| `StoredAggregateRoot` | Class | Persisted aggregate ID/version representation. |

`EventStore.findAggregateRootVersion()` returns `-1` when no aggregate/version is stored. `findByAggregateRootId()` returns `[]`; `findByAggregateRootIds()` returns only keys that have events. `findWithSnapshot()` returns all events when no snapshot exists and includes `aggregateRootVersion` in built-in adapters. `purgeAggregate()` permanently removes snapshots, events, and aggregate state and treats a missing ID as a no-op at the interface level.

### Snapshot stores and strategies

| Export | Kind | Purpose |
| --- | --- | --- |
| `SNAPSHOT_STORE` | Symbol | Snapshot-store injection token; adapter modules do not re-export the provider. |
| `SnapshotStore` | Interface | Snapshot creation, lookup, deletion, persistence, ID generation, and policy evaluation. |
| `AbstractSnapshotStore` | Abstract class | Implements policy checks and snapshot construction for custom stores. |
| `NoOpSnapshotStore` | Class | Store used when adapter snapshot settings are absent. |
| `StoredSnapshot<T>` | Class | Snapshot ID, aggregate ID/version, revision, and payload. |
| `SnapshotStrategy` | Abstract class | Base for synchronous or asynchronous snapshot policies. |
| `NoSnapshotStrategy` | Class | Always returns `false`. |
| `ForCountSnapshotStrategy` | Class | Snapshots when a commit crosses a positive event-count block. |
| `ForCountSnapshotStrategyConfig` | Interface | `{ count: number }`; values below 1 throw. |
| `ForEventsSnapshotStrategy` | Class | Matches when an uncommitted payload is an instance of a configured event class. |
| `ForEventsSnapshotStrategyConfig` | Interface | `{ eventClasses: Class<unknown>[] }`. |
| `ForAggregateRootsStrategy` | Class | Matches configured aggregate names. |
| `ForAggregateRootsStrategyConfig` | Interface | `{ aggregates: AggregateRootClass<unknown>[] }`. |
| `AllOfSnapshotStrategy` | Class | Awaits all child strategies and requires every result; an empty list throws. |
| `AnyOfSnapshotStrategy` | Class | Awaits all child strategies and requires any result; an empty list throws. |

`ForCountSnapshotStrategy` evaluates the aggregate's current version plus the whole uncommitted batch, so crossing one or more thresholds in one commit still creates one snapshot.

### Public exceptions

`AggregateClassNotSnapshotAwareException`, `AggregateInstanceNotSnapshotAwareException`, `EventConcurrencyException`, `EventNameConflictException`, `MissingAggregateRootNameException`, `SnapshotRevisionMismatchException`, `SubscriptionException`, and `UnknownEventException` are public. See [exceptions](/api-reference/exceptions/).

### Utility exports

| Export | Kind | Purpose |
| --- | --- | --- |
| `Class<T, Arguments>` | Type | Constructable class type used by event and strategy APIs. |
| `hasAllValues` | Type guard | Narrows an array after checking that no item is `null` or `undefined`. |

## `@event-nest/mongodb`

The MongoDB barrel exports only:

| Export | Kind | Purpose |
| --- | --- | --- |
| `EventNestMongoDbModule` | Nest dynamic module | Global/scoped, synchronous/asynchronous MongoDB registration. |
| `MongodbModuleOptions` | Type | MongoDB connection, collections, optional client settings, subscriptions, and paired snapshots. |
| `MongoDbModuleAsyncOptions` | Interface | `useFactory` plus optional `inject`. |
| `MongoEventStore` | Class | MongoDB `EventStore` implementation; adds aggregate/events collection getters. |

`MongoSnapshotStore`, provider tokens, and document types are not public barrel exports.

## `@event-nest/postgresql`

| Export | Kind | Purpose |
| --- | --- | --- |
| `EventNestPostgreSQLModule` | Nest dynamic module | Global/scoped, synchronous/asynchronous PostgreSQL registration. |
| `PostgreSQLModuleOptions` | Type | Connection, schema/tables, pool, SSL, initialization, subscriptions, and paired snapshots. |
| `PostgreSQLModuleAsyncOptions` | Interface | `useFactory` plus optional `inject`. |
| `ConnectionPoolOptions` | Interface | Knex/Tarn pool pass-through options. |
| `SslOptions` | Interface | CA certificate and required `rejectUnauthorized` flag. |
| `SchemaConfiguration` | Class | Configured and schema-qualified PostgreSQL table names. |
| `PostgreSQLEventStore` | Class | PostgreSQL `EventStore` implementation; exposes `schemaConfiguration`. |

The PostgreSQL snapshot store, table initializer, Knex token, and row types are not public barrel exports.

## `@event-nest/mssql`

| Export | Kind | Purpose |
| --- | --- | --- |
| `EventNestMSSQLModule` | Nest dynamic module | Global/scoped, synchronous/asynchronous SQL Server registration. |
| `MSSQLModuleOptions` | Type | Structured connection, schema/tables, pool, initialization, subscriptions, and paired snapshots. |
| `MSSQLModuleAsyncOptions` | Interface | `useFactory` plus optional `inject`. |
| `MSSQLConnectionOptions` | Interface | Required credentials/server/database and optional Tedious connection settings. |
| `ConnectionPoolOptions` | Interface | Knex/Tarn pool options; distinct from the same-named PostgreSQL export. |
| `SchemaConfiguration` | Class | Validated configured and schema-qualified SQL Server table names. |
| `MSSQLEventStore` | Class | SQL Server `EventStore` implementation; exposes `schemaConfiguration`. |

The SQL Server snapshot store, table initializer, Knex token, and row types are not public barrel exports.

## Sources

- [`@event-nest/core` barrel](https://github.com/NickTsitlakidis/event-nest/blob/main/libs/core/src/index.ts)
- [`@event-nest/mongodb` barrel](https://github.com/NickTsitlakidis/event-nest/blob/main/libs/mongodb/src/index.ts)
- [`@event-nest/postgresql` barrel](https://github.com/NickTsitlakidis/event-nest/blob/main/libs/postgresql/src/index.ts)
- [`@event-nest/mssql` barrel](https://github.com/NickTsitlakidis/event-nest/blob/main/libs/mssql/src/index.ts)
