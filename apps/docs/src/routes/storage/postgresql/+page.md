---
title: PostgreSQL
description: Configure the Event Nest PostgreSQL adapter, table initialization, transactions, snapshots, and connection behavior.
---

The `@event-nest/postgresql` adapter stores aggregate versions, events, and optional snapshots in PostgreSQL tables through Knex.

```bash
pnpm add @event-nest/core @event-nest/postgresql pg
```

## Configure the module

`forRoot` registers a global module. The exported `EVENT_STORE` provider is available application-wide.

```ts
import { EventNestPostgreSQLModule } from "@event-nest/postgresql";
import { Module } from "@nestjs/common";

@Module({
    imports: [
        EventNestPostgreSQLModule.forRoot({
            aggregatesTableName: "aggregates",
            connectionUri: "postgresql://event_nest:password@localhost:5432/event_nest",
            ensureTablesExist: true,
            eventsTableName: "events",
            schemaName: "event_nest"
        })
    ]
})
export class AppModule {}
```

`register` has the same options but is not global. Its `EVENT_STORE` export is available to the Nest module that imports it and to modules that explicitly re-export it.

```ts
EventNestPostgreSQLModule.register({
    aggregatesTableName: "aggregates",
    connectionUri: process.env.DATABASE_URL!,
    eventsTableName: "events",
    schemaName: "event_nest"
})
```

The asynchronous variants accept only `inject` and `useFactory`. The factory may return `PostgreSQLModuleOptions` directly or as a promise. `forRootAsync` is global; `registerAsync` is scoped.

```ts
EventNestPostgreSQLModule.forRootAsync({
    inject: [DatabaseSettings],
    useFactory: async (settings: DatabaseSettings) => ({
        aggregatesTableName: "aggregates",
        connectionUri: await settings.postgresUri(),
        eventsTableName: "events",
        schemaName: "event_nest"
    })
})

EventNestPostgreSQLModule.registerAsync({
    inject: [DatabaseSettings],
    useFactory: (settings: DatabaseSettings) => ({
        aggregatesTableName: "aggregates",
        connectionUri: settings.postgresUriSync(),
        eventsTableName: "events",
        schemaName: "event_nest"
    })
})
```

The async options type does not have an `imports` property. Injected providers must already be visible in the module context.

## Options

| Option | Required | Default | Behavior and validation |
| --- | --- | --- | --- |
| `connectionUri` | Yes | None | Passed to Knex as the PostgreSQL `connectionString`. |
| `schemaName` | Yes | None | Schema containing all configured tables. The adapter does not create or validate the schema. |
| `aggregatesTableName` | Yes | None | Aggregate-version table name. No adapter-level identifier validation is performed. |
| `eventsTableName` | Yes | None | Event table name. No adapter-level identifier validation is performed. |
| `ensureTablesExist` | No | `false` | Checks for and creates missing configured tables during application bootstrap. |
| `connectionPool` | No | Knex/Tarn defaults | Passed to Knex as `pool`. Supported keys are `acquireTimeoutMillis`, `afterCreate`, `createRetryIntervalMillis`, `createTimeoutMillis`, `destroyTimeoutMillis`, `idleTimeoutMillis`, `log`, `max`, `min`, `name`, `priorityRange`, `propagateCreateError`, `reapIntervalMillis`, `refreshIdle`, and `returnToHead`. |
| `ssl` | No | SSL configuration omitted | When present, maps `certificate` to the CA and passes the required `rejectUnauthorized` boolean. `certificate` is optional. |
| `concurrentSubscriptions` | No | `false` | Processes emitted events concurrently instead of sequentially. This affects subscriptions, not database writes. |
| `snapshotStrategy` | No | Snapshots disabled | Must be supplied together with `snapshotTableName`. |
| `snapshotTableName` | No | Snapshots disabled | Must be supplied together with `snapshotStrategy`. |

An incomplete snapshot pair fails provider creation with: `To use snapshots, both 'snapshotStrategy' and 'snapshotTableName' must be provided.`

```ts
import { ForCountSnapshotStrategy } from "@event-nest/core";

EventNestPostgreSQLModule.forRoot({
    aggregatesTableName: "aggregates",
    connectionUri: process.env.DATABASE_URL!,
    eventsTableName: "events",
    schemaName: "event_nest",
    snapshotStrategy: new ForCountSnapshotStrategy({ count: 100 }),
    snapshotTableName: "snapshots"
})
```

## Table initialization

`ensureTablesExist` defaults to `false`. When enabled, the bootstrap initializer checks each configured table and creates only tables that are missing. It never creates `schemaName`, so that schema must exist before the Nest application starts. The connection user needs schema access and table-creation privileges.

PostgreSQL initialization failures are logged as `Event Nest table initialization has failed. Tables will have to be created manually.` and then swallowed. Application bootstrap can continue with missing tables; the first storage operation will then fail. Use migrations or verify startup logs rather than treating successful bootstrap as proof that initialization succeeded.

See the [exact PostgreSQL schema](/storage/postgresql-schema/) for manual creation and the constraints the initializer does and does not add.

## Transactions and lifecycle

Each non-empty event save opens a Knex transaction. Existing aggregate rows are selected `FOR UPDATE`; the aggregate row, new event rows, and updated version commit or roll back together. The PostgreSQL initializer and stores use the same Knex pool.

The module constructs the Knex connection during provider creation and lets Knex acquire physical connections as needed. Unlike the SQL Server adapter, the PostgreSQL module does not implement an application-shutdown hook to call `destroy()` on that pool. If deterministic pool cleanup is required by the process hosting the module, account for that lifecycle difference.

Selected snapshots are inserted after the event transaction rather than inside it. See [Storage model](/storage/storage-model/) for the commit boundary.

For aggregate deletion semantics, see [Purging aggregates](/capabilities/purging-aggregates/).
