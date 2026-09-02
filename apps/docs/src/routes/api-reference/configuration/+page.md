---
title: Configuration
description: Complete module registration and adapter option reference for Event Nest.
---

Event Nest has one persistence module per adapter. Each module builds and exports an event store under the `EVENT_STORE` injection token. Snapshot storage is configured by each adapter; there is no shared public snapshot module-options type.

## Registration methods

All adapters expose the same four static methods.

| Method | Scope | Options resolution | Result |
| --- | --- | --- | --- |
| `forRoot(options)` | Global | Synchronous object | `EVENT_STORE` is available application-wide after one import. |
| `forRootAsync(options)` | Global | Factory returning an object or promise | Same global export, after the factory resolves. |
| `register(options)` | Scoped | Synchronous object | `EVENT_STORE` is available only to the importing module and modules that re-export it. |
| `registerAsync(options)` | Scoped | Factory returning an object or promise | Same scoped export, after the factory resolves. |

The corresponding modules are `EventNestMongoDbModule`, `EventNestPostgreSQLModule`, and `EventNestMSSQLModule`. Registration exports only `EVENT_STORE`; adapter clients, snapshot stores, schema configuration, and emitters are implementation providers, not module exports.

Each asynchronous options type has this shape:

| Adapter | Async type | Factory result |
| --- | --- | --- |
| MongoDB | `MongoDbModuleAsyncOptions` | `MongodbModuleOptions \| Promise<MongodbModuleOptions>` |
| PostgreSQL | `PostgreSQLModuleAsyncOptions` | `PostgreSQLModuleOptions \| Promise<PostgreSQLModuleOptions>` |
| Microsoft SQL Server | `MSSQLModuleAsyncOptions` | `MSSQLModuleOptions \| Promise<MSSQLModuleOptions>` |

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `useFactory` | `(...parameters: any[]) => Options \| Promise<Options>` | Yes | None | Produces that adapter's complete module options. |
| `inject` | `any[]` | No | `undefined` | Tokens passed to `useFactory` in order. The async options types do not have an `imports` property, so dependencies must already be visible in the module context. |

```ts
EventNestPostgreSQLModule.forRootAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
        aggregatesTableName: "aggregates",
        connectionUri: config.getOrThrow("DATABASE_URL"),
        eventsTableName: "events",
        schemaName: "event_nest"
    })
})
```

## Shared option

`CoreModuleOptions` contributes one option to every adapter.

| Option | Type | Required | Event Nest default | Description |
| --- | --- | --- | --- | --- |
| `concurrentSubscriptions` | `boolean` | No | `false` | `false` dispatches emitted events in order. `true` dispatches event-handler work concurrently. See [subscription behavior](/how-event-nest-works/subscription-dispatch/). |

## MongoDB

Install `@event-nest/core`, `@event-nest/mongodb`, and its `mongodb` 7.x peer dependency.

### `MongodbModuleOptions`

| Option | Type | Required | Event Nest default | Description |
| --- | --- | --- | --- | --- |
| `aggregatesCollection` | `string` | Yes | None | Collection holding aggregate IDs and current versions. |
| `connectionUri` | `string` | Yes | None | URI passed as the first `MongoClient` constructor argument. |
| `eventsCollection` | `string` | Yes | None | Collection holding persisted events. |
| `mongoClientConfiguration` | `MongoClientOptions` | No | `undefined` | Passed unchanged as the second `MongoClient` constructor argument. Driver defaults apply when omitted. |
| `concurrentSubscriptions` | `boolean` | No | `false` | Shared subscription dispatch option. |
| `snapshotCollection` | `string` | Conditional | Snapshots disabled | Snapshot collection. Must be supplied together with `snapshotStrategy`. |
| `snapshotStrategy` | `SnapshotStrategy` | Conditional | Snapshots disabled | Snapshot creation policy. Must be supplied together with `snapshotCollection`. |

The options type is a union: omit both snapshot fields to use `NoOpSnapshotStore`, or provide both. The provider repeats this check at runtime and throws `To use snapshots, both 'snapshotStrategy' and 'snapshotCollection' must be provided.` for an incomplete pair.

MongoDB saves and purges with transactions. Use a deployment that supports transactions, such as a replica set or sharded cluster; a standalone server cannot complete those operations.

## PostgreSQL

Install `@event-nest/core`, `@event-nest/postgresql`, and its `pg` peer dependency (`^8.14.1`).

### `PostgreSQLModuleOptions`

| Option | Type | Required | Event Nest default | Description |
| --- | --- | --- | --- | --- |
| `aggregatesTableName` | `string` | Yes | None | Aggregate-version table name. |
| `connectionUri` | `string` | Yes | None | PostgreSQL connection string passed to Knex. |
| `eventsTableName` | `string` | Yes | None | Event table name. |
| `schemaName` | `string` | Yes | None | Schema prepended to configured table names. The schema itself is not created. |
| `connectionPool` | `ConnectionPoolOptions` | No | `undefined` | Passed to Knex as `pool`; Knex/Tarn defaults apply when omitted. |
| `ensureTablesExist` | `boolean` | No | `false` | Checks for and creates missing aggregate, event, and configured snapshot tables during application bootstrap. Requires DDL permission. |
| `ssl` | `SslOptions` | No | SSL object omitted | When supplied, maps `certificate` to `ssl.ca` and forwards `rejectUnauthorized`. |
| `concurrentSubscriptions` | `boolean` | No | `false` | Shared subscription dispatch option. |
| `snapshotTableName` | `string` | Conditional | Snapshots disabled | Snapshot table name. Must be supplied together with `snapshotStrategy`. |
| `snapshotStrategy` | `SnapshotStrategy` | Conditional | Snapshots disabled | Snapshot creation policy. Must be supplied together with `snapshotTableName`. |

An incomplete snapshot pair throws `To use snapshots, both 'snapshotStrategy' and 'snapshotTableName' must be provided.` When both fields are absent, Event Nest installs `NoOpSnapshotStore`.

### `SslOptions`

| Option | Type | Required | Event Nest default | Description |
| --- | --- | --- | --- | --- |
| `rejectUnauthorized` | `boolean` | Yes | None | Forwarded to the PostgreSQL driver's SSL configuration. |
| `certificate` | `string` | No | `undefined` | CA certificate text forwarded as `ssl.ca`. |

Omitting `ssl` does not force an SSL setting; the connection consists only of `connectionString`. Supplying `ssl` creates an SSL object even when `certificate` is omitted.

### PostgreSQL `ConnectionPoolOptions`

All fields are optional and passed through to Knex/Tarn. Event Nest assigns no PostgreSQL pool defaults.

| Option | Type | Description |
| --- | --- | --- |
| `acquireTimeoutMillis` | `number` | Maximum wait when acquiring a resource. |
| `afterCreate` | `Function` | Hook run after a connection is created. |
| `createRetryIntervalMillis` | `number` | Delay between create retries. |
| `createTimeoutMillis` | `number` | Connection creation timeout. |
| `destroyTimeoutMillis` | `number` | Resource destruction timeout. |
| `idleTimeoutMillis` | `number` | Idle lifetime before reaping. |
| `log` | `(message: string, logLevel: string) => void` | Pool log callback. |
| `max` | `number` | Maximum pool size. |
| `min` | `number` | Minimum pool size. |
| `name` | `string` | Pool name. |
| `priorityRange` | `number` | Number of priority levels. |
| `propagateCreateError` | `boolean` | Whether creation errors are propagated immediately. |
| `reapIntervalMillis` | `number` | Interval between idle-resource checks. |
| `refreshIdle` | `boolean` | Whether idle resources are refreshed. |
| `returnToHead` | `boolean` | Whether released resources return to the head of the free list. |

## Microsoft SQL Server

Install `@event-nest/core`, `@event-nest/mssql`, and its `tedious` 20.x peer dependency. Event Nest uses Knex's `mssql` client internally.

### `MSSQLModuleOptions`

| Option | Type | Required | Event Nest default | Description |
| --- | --- | --- | --- | --- |
| `aggregatesTableName` | `string` | Yes | None | Aggregate-version table name. |
| `connection` | `MSSQLConnectionOptions` | Yes | None | Structured SQL Server connection settings. |
| `eventsTableName` | `string` | Yes | None | Event table name. |
| `schemaName` | `string` | Yes | None | SQL Server schema, commonly `dbo`. The schema itself is not created. |
| `connectionPool` | `ConnectionPoolOptions` | No | `{ min: 0 }` plus Knex/Tarn defaults | Pool settings merged over Event Nest's `min: 0`. |
| `ensureTablesExist` | `boolean` | No | `false` | Creates missing aggregate, event, and configured snapshot tables at bootstrap. Requires DDL permission. |
| `concurrentSubscriptions` | `boolean` | No | `false` | Shared subscription dispatch option. |
| `snapshotTableName` | `string` | Conditional | Snapshots disabled | Snapshot table name. Must be supplied together with `snapshotStrategy`. |
| `snapshotStrategy` | `SnapshotStrategy` | Conditional | Snapshots disabled | Snapshot creation policy. Must be supplied together with `snapshotTableName`. |

SQL Server validates `schemaName`, `aggregatesTableName`, `eventsTableName`, and, when present, `snapshotTableName`. Each must be non-empty, at most 128 characters, and contain no dot. Supply schema and table separately.

### `MSSQLConnectionOptions`

| Option | Type | Required | Event Nest default | Description |
| --- | --- | --- | --- | --- |
| `database` | `string` | Yes | None | Database name. |
| `password` | `string` | Yes | None | Login password. |
| `server` | `string` | Yes | None | SQL Server host. |
| `user` | `string` | Yes | None | Login user. |
| `connectionTimeout` | `number` | No | Driver default | Forwarded to the connection. |
| `encrypt` | `boolean` | No | `true` | Tedious encryption option. |
| `instanceName` | `string` | No | `undefined` | Named instance. Mutually exclusive with `port`. |
| `port` | `number` | No | Driver default | TCP port. Mutually exclusive with `instanceName`. |
| `requestTimeout` | `number` | No | Driver default | Request timeout. |
| `serverName` | `string` | No | `undefined` | TLS server name forwarded to Tedious. |
| `trustServerCertificate` | `boolean` | No | `false` | Whether to trust the server certificate without validation. |

Event Nest also fixes `lowerCaseGuids: true` and `useUTC: true`, and binds JavaScript `Date` values as `DateTime2`. Configuring both `port` and `instanceName` throws `MSSQL connection options cannot provide both 'port' and 'instanceName'.`

### SQL Server `ConnectionPoolOptions`

Every field is optional. Event Nest merges this object over `{ min: 0 }`; a provided `min` overrides it, and all remaining defaults belong to Knex/Tarn.

| Option | Type | Description |
| --- | --- | --- |
| `acquireTimeoutMillis` | `number` | Maximum wait when acquiring a resource. |
| `afterCreate` | `Function` | Hook run after a connection is created. |
| `createRetryIntervalMillis` | `number` | Delay between create retries. |
| `createTimeoutMillis` | `number` | Connection creation timeout. |
| `destroyTimeoutMillis` | `number` | Resource destruction timeout. |
| `idleTimeoutMillis` | `number` | Idle lifetime before reaping. |
| `log` | `(message: string, logLevel: string) => void` | Pool log callback. |
| `max` | `number` | Maximum pool size. |
| `min` | `number` | Minimum pool size; Event Nest defaults this field to `0`. |
| `name` | `string` | Pool name. |
| `priorityRange` | `number` | Number of priority levels. |
| `propagateCreateError` | `boolean` | Whether creation errors are propagated immediately. |
| `reapIntervalMillis` | `number` | Interval between idle-resource checks. |
| `refreshIdle` | `boolean` | Whether idle resources are refreshed. |
| `returnToHead` | `boolean` | Whether released resources return to the head of the free list. |

## Snapshot option dependency

Snapshot support always has three independent requirements:

1. Configure the adapter's strategy and storage location as a pair.
2. Add `snapshotRevision` to `@AggregateRootConfig` on every aggregate that can match the strategy.
3. Implement callable `toSnapshot()` and `applySnapshot()` methods on those aggregate instances.

The adapter-specific location field is part of its public options. No shared `SnapshotsEnabled` or `SnapshotsDisabled` type is exported. See [decorators](/api-reference/decorators/) and [common snapshot problems](/help/common-problems/).

## Sources

- [MongoDB options](https://github.com/NickTsitlakidis/event-nest/blob/main/libs/mongodb/src/lib/mongodb-module-options.ts)
- [PostgreSQL options](https://github.com/NickTsitlakidis/event-nest/blob/main/libs/postgresql/src/lib/postgresql-module-options.ts)
- [SQL Server options](https://github.com/NickTsitlakidis/event-nest/blob/main/libs/mssql/src/lib/mssql-module-options.ts)
- [Module provider behavior](https://github.com/NickTsitlakidis/event-nest/tree/main/libs)
