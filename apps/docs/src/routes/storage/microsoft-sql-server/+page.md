---
title: Microsoft SQL Server
description: Configure the Event Nest SQL Server adapter, secure connection defaults, schemas, transactions, and pool shutdown.
---

The `@event-nest/mssql` adapter stores aggregate versions, events, and optional snapshots in Microsoft SQL Server through Knex and Tedious.

```bash
pnpm add @event-nest/core @event-nest/mssql tedious
```

## Configure the module

`forRoot` registers a global module and exports `EVENT_STORE` application-wide.

```ts
import { EventNestMSSQLModule } from "@event-nest/mssql";
import { Module } from "@nestjs/common";

@Module({
    imports: [
        EventNestMSSQLModule.forRoot({
            aggregatesTableName: "aggregates",
            connection: {
                database: "event_nest",
                password: process.env.SQL_SERVER_PASSWORD!,
                port: 1433,
                server: "localhost",
                user: "event_nest"
            },
            ensureTablesExist: true,
            eventsTableName: "events",
            schemaName: "dbo"
        })
    ]
})
export class AppModule {}
```

`register` accepts the same options and creates a non-global module whose `EVENT_STORE` export remains scoped to the importing module.

```ts
EventNestMSSQLModule.register({
    aggregatesTableName: "aggregates",
    connection: {
        database: "event_nest",
        password: process.env.SQL_SERVER_PASSWORD!,
        server: "sql.example.test",
        user: "event_nest"
    },
    eventsTableName: "events",
    schemaName: "event_nest"
})
```

The asynchronous variants accept only `inject` and `useFactory`. The factory may return `MSSQLModuleOptions` or `Promise<MSSQLModuleOptions>`. `forRootAsync` is global; `registerAsync` is scoped.

```ts
EventNestMSSQLModule.forRootAsync({
    inject: [DatabaseSettings],
    useFactory: async (settings: DatabaseSettings) => ({
        aggregatesTableName: "aggregates",
        connection: await settings.sqlServerConnection(),
        eventsTableName: "events",
        schemaName: "event_nest"
    })
})

EventNestMSSQLModule.registerAsync({
    inject: [DatabaseSettings],
    useFactory: (settings: DatabaseSettings) => ({
        aggregatesTableName: "aggregates",
        connection: settings.sqlServerConnectionSync(),
        eventsTableName: "events",
        schemaName: "event_nest"
    })
})
```

The async options type does not provide `imports`; injected providers must already be visible in the module context.

## Module options

| Option | Required | Default | Behavior and validation |
| --- | --- | --- | --- |
| `connection` | Yes | None | Structured Tedious connection settings described below. |
| `schemaName` | Yes | None | Existing SQL Server schema containing all tables. Must pass identifier validation. |
| `aggregatesTableName` | Yes | None | Aggregate-version table. Must pass identifier validation. |
| `eventsTableName` | Yes | None | Event table. Must pass identifier validation. |
| `ensureTablesExist` | No | `false` | Creates missing configured tables during application bootstrap. |
| `connectionPool` | No | `min: 0`, other Knex/Tarn defaults | Merged into the Knex pool after `min: 0`, so an explicit `min` overrides it. Supported keys are `acquireTimeoutMillis`, `afterCreate`, `createRetryIntervalMillis`, `createTimeoutMillis`, `destroyTimeoutMillis`, `idleTimeoutMillis`, `log`, `max`, `min`, `name`, `priorityRange`, `propagateCreateError`, `reapIntervalMillis`, `refreshIdle`, and `returnToHead`. |
| `concurrentSubscriptions` | No | `false` | Processes emitted events concurrently instead of sequentially. It does not change transaction behavior. |
| `snapshotStrategy` | No | Snapshots disabled | Must be supplied together with `snapshotTableName`. |
| `snapshotTableName` | No | Snapshots disabled | Must pass identifier validation and be supplied with `snapshotStrategy`. |

`schemaName`, `aggregatesTableName`, `eventsTableName`, and a configured `snapshotTableName` must be non-empty, at most 128 characters, and contain no dot. Invalid values fail provider creation. Pass the schema separately rather than using a qualified table name.

An incomplete snapshot pair causes provider creation to fail.

## Connection options

| `connection` field | Required | Adapter default | Notes |
| --- | --- | --- | --- |
| `server` | Yes | None | SQL Server host passed to Tedious. |
| `database` | Yes | None | Database name. |
| `user` | Yes | None | Login user. |
| `password` | Yes | None | Login password. |
| `port` | No | Driver behavior | Mutually exclusive with `instanceName`. |
| `instanceName` | No | Driver behavior | Mutually exclusive with `port`. Both together throw during provider creation. |
| `connectionTimeout` | No | Driver behavior | Passed through to the connection. |
| `requestTimeout` | No | Driver behavior | Passed through to the connection. |
| `encrypt` | No | `true` | Secure adapter default; may be explicitly overridden. |
| `trustServerCertificate` | No | `false` | Secure adapter default; may be explicitly overridden. |
| `serverName` | No | Driver behavior | Passed to Tedious TLS options. |

The adapter also fixes `lowerCaseGuids: true` and `useUTC: true`, and binds JavaScript `Date` values as `DateTime2`.

## Tables and bootstrap

`ensureTablesExist` checks and creates tables in order: aggregates, events, then the optional snapshots table. The configured schema must already exist. Unlike PostgreSQL, a SQL Server initialization error is logged and rethrown, so Nest application bootstrap fails.

See the [exact SQL Server schema](/storage/sql-server-schema/) for migrations and generated indexes.

## Transactions and lifecycle

Every non-empty save is a Knex transaction. The aggregate lookup uses `UPDLOCK, HOLDLOCK`; event inserts are sent in chunks of 250; and the aggregate version update includes the previously read version. The generated unique event-stream index also turns competing duplicate versions into a concurrency signal. Aggregate metadata, event rows, and the version advance are committed atomically.

Snapshot creation, when selected, occurs after that transaction. It is not rolled back with the event write. See [Storage model](/storage/storage-model/) for the shared commit boundary.

For aggregate deletion semantics, see [Purging aggregates](/capabilities/purging-aggregates/).
