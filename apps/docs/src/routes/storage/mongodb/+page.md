---
title: MongoDB
description: Configure the Event Nest MongoDB adapter, transaction-capable topology, ObjectId identifiers, and collections.
---

The `@event-nest/mongodb` adapter stores aggregate versions, events, and optional snapshots in MongoDB collections using the official Node.js driver.

```bash
pnpm add @event-nest/core @event-nest/mongodb mongodb
```

## Configure the module

`forRoot` registers a global module and exports `EVENT_STORE` application-wide.

```ts
import { EventNestMongoDbModule } from "@event-nest/mongodb";
import { Module } from "@nestjs/common";

@Module({
    imports: [
        EventNestMongoDbModule.forRoot({
            aggregatesCollection: "aggregates",
            connectionUri: "mongodb://localhost:27017/event_nest?replicaSet=rs0",
            eventsCollection: "events"
        })
    ]
})
export class AppModule {}
```

`register` takes the same options but creates a non-global module. Its `EVENT_STORE` export is available only through the importing module's scope.

```ts
EventNestMongoDbModule.register({
    aggregatesCollection: "aggregates",
    connectionUri: process.env.MONGODB_URI!,
    eventsCollection: "events"
})
```

The asynchronous variants accept only `inject` and `useFactory`. The factory may return `MongodbModuleOptions` or `Promise<MongodbModuleOptions>`. `forRootAsync` is global; `registerAsync` is scoped.

```ts
EventNestMongoDbModule.forRootAsync({
    inject: [DatabaseSettings],
    useFactory: async (settings: DatabaseSettings) => ({
        aggregatesCollection: "aggregates",
        connectionUri: await settings.mongodbUri(),
        eventsCollection: "events"
    })
})

EventNestMongoDbModule.registerAsync({
    inject: [DatabaseSettings],
    useFactory: (settings: DatabaseSettings) => ({
        aggregatesCollection: "aggregates",
        connectionUri: settings.mongodbUriSync(),
        eventsCollection: "events"
    })
})
```

The async options type has no `imports` property. Injected providers must already be visible in the module context.

## Options

| Option | Required | Default | Behavior and validation |
| --- | --- | --- | --- |
| `connectionUri` | Yes | None | Passed to `MongoClient`. Include the target database because the stores call `client.db()` without a database argument. |
| `aggregatesCollection` | Yes | None | Collection containing aggregate `_id` and `version`. No adapter-level name validation is performed. |
| `eventsCollection` | Yes | None | Collection containing event documents. No adapter-level name validation is performed. |
| `mongoClientConfiguration` | No | MongoDB driver defaults | A `MongoClientOptions` object passed unchanged as the second `MongoClient` constructor argument. |
| `concurrentSubscriptions` | No | `false` | Processes emitted events concurrently instead of sequentially. It does not alter MongoDB transaction behavior. |
| `snapshotStrategy` | No | Snapshots disabled | Must be supplied together with `snapshotCollection`. |
| `snapshotCollection` | No | Snapshots disabled | Must be supplied together with `snapshotStrategy`. |

An incomplete snapshot pair fails provider creation with: `To use snapshots, both 'snapshotStrategy' and 'snapshotCollection' must be provided.`

```ts
import { ForCountSnapshotStrategy } from "@event-nest/core";

EventNestMongoDbModule.forRoot({
    aggregatesCollection: "aggregates",
    connectionUri: process.env.MONGODB_URI!,
    eventsCollection: "events",
    snapshotCollection: "snapshots",
    snapshotStrategy: new ForCountSnapshotStrategy({ count: 100 })
})
```

## Document shape

MongoDB stores generated entity identifiers as `ObjectId` values. `generateEntityId()` returns their 24-character hexadecimal string form to application code. Aggregate ids and generated event or snapshot ids passed back into the adapter must be valid `ObjectId` strings because the store constructs `new ObjectId(id)` for `_id` queries and writes.

| Collection | Fields |
| --- | --- |
| Aggregates | `_id: ObjectId`, `version: number` |
| Events | `_id: ObjectId`, `aggregateRootId: string`, `aggregateRootVersion: number`, `aggregateRootName: string`, `eventName: string`, `payload`, `createdAt: Date` |
| Snapshots | `_id: ObjectId`, `aggregateRootId: string`, `aggregateRootVersion: number`, `payload`, `revision: number` |

The adapter has no collection initializer. It does not create collection validators, secondary indexes, or uniqueness constraints. MongoDB can create collections on first write, but any operational collection or index management remains outside Event Nest.

## Transactions and topology

Every non-empty event save starts a client session and calls `withTransaction`. The aggregate document, event documents, and aggregate version update are in one multi-document transaction. Deploy MongoDB as a transaction-capable replica set or sharded cluster; a standalone MongoDB server cannot execute these operations.

The client is constructed during provider creation. The adapter does not explicitly call `connect()`, so the driver establishes connectivity when operations require it. The module also has no shutdown hook that calls `MongoClient.close()`. Applications that require deterministic client cleanup must account for that lifecycle behavior.

Snapshot insertion is outside the event transaction and occurs after it commits. See [Storage model](/storage/storage-model/) for the shared commit boundary.

For aggregate deletion semantics, see [Purging aggregates](/capabilities/purging-aggregates/).
