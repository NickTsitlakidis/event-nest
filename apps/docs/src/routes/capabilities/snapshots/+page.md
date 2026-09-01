---
title: Snapshots
description: Configure, create, and replay optional aggregate snapshots without replacing the event history.
---

<script lang="ts">
    import SnapshotReplay from "$lib/diagrams/snapshot-replay.svelte";
</script>

Snapshots are an optional read-performance optimization. They capture an aggregate's state at a committed stream version so reconstitution can start there instead of replaying the entire stream. Events remain the source of truth: creating a snapshot does not remove or replace any event.

Use snapshots for streams whose replay cost is measurable. Aggregates with short or inexpensive streams do not need them.

## Enable Snapshot Storage

Snapshot configuration requires a policy and an adapter-specific storage location together:

| Adapter | Policy option | Storage option |
| --- | --- | --- |
| MongoDB | `snapshotStrategy` | `snapshotCollection` |
| PostgreSQL | `snapshotStrategy` | `snapshotTableName` |
| Microsoft SQL Server | `snapshotStrategy` | `snapshotTableName` |

Providing only one of the two options is a configuration error. Omitting both disables snapshot storage.

```ts
import { ForCountSnapshotStrategy } from "@event-nest/core";
import { EventNestPostgreSQLModule } from "@event-nest/postgresql";

EventNestPostgreSQLModule.forRoot({
    aggregatesTableName: "aggregates",
    connectionUri: process.env.DATABASE_URL,
    eventsTableName: "events",
    schemaName: "event_nest",
    snapshotStrategy: new ForCountSnapshotStrategy({ count: 100 }),
    snapshotTableName: "snapshots"
});
```

See [Snapshot Policies](/capabilities/snapshot-policies/) for every built-in strategy and custom strategies.

## Make an Aggregate Snapshot-Aware

A snapshot-aware aggregate needs a numeric `snapshotRevision` and both methods from `SnapshotAware<Snapshot>`:

```ts
import {
    AggregateRoot,
    AggregateRootConfig,
    type SnapshotAware,
    type StoredEvent
} from "@event-nest/core";

type UserSnapshot = {
    name: string;
    status: "active" | "suspended";
};

@AggregateRootConfig({ name: "User", snapshotRevision: 1 })
export class User extends AggregateRoot implements SnapshotAware<UserSnapshot> {
    private name = "";
    private status: "active" | "suspended" = "active";

    private constructor(id: string) {
        super(id);
    }

    static fromEvents(
        id: string,
        events: StoredEvent[],
        snapshot?: UserSnapshot,
        aggregateRootVersion?: number
    ): User {
        const user = new User(id);
        user.reconstitute(events, snapshot, aggregateRootVersion);
        return user;
    }

    applySnapshot(snapshot: UserSnapshot): void {
        this.name = snapshot.name;
        this.status = snapshot.status;
    }

    async toSnapshot(): Promise<UserSnapshot> {
        return {
            name: this.name,
            status: this.status
        };
    }
}
```

`toSnapshot()` may return either the snapshot value or `Promise<Snapshot>`; Event Nest awaits it. `applySnapshot()` restores the state represented by the payload. It should not append new events or perform business operations.

## Commit Ordering

When an aggregate commits events, Event Nest performs snapshot work in this order:

1. Evaluate and await the configured snapshot strategy against the current version and uncommitted events.
2. Persist the events and aggregate version using the adapter's normal concurrency checks.
3. Resolve the aggregate to the versions assigned by storage.
4. If the strategy matched, await `toSnapshot()` and persist the snapshot.
5. Dispatch domain subscriptions.

The snapshot record therefore uses the committed aggregate version, not the pre-commit version. Its payload already includes the state produced by the newly committed events, and later loading replays only events with a greater aggregate version.

Snapshot creation is after event persistence. If snapshot serialization or snapshot storage fails, the commit rejects, but the already-persisted events are not rolled back by snapshot creation. Check storage before retrying the command.

## Loading and Replay

`eventStore.findWithSnapshot(AggregateClass, id)` returns:

```ts
{
    snapshot?: UserSnapshot;
    events: StoredEvent[];
    aggregateRootVersion?: number;
}
```

If a snapshot exists, `events` contains only events after its version. If no snapshot exists, `snapshot` is `undefined` and `events` contains the complete stream.

<SnapshotReplay />

Always pass `aggregateRootVersion` to `reconstitute`. It is the stream head: the latest returned event version, the snapshot version when no later event exists, or `0` for an unknown aggregate. This prevents a stream-head snapshot from producing an aggregate with an incorrect version.

The [AggregateRepository](/capabilities/aggregate-repository/) performs this wiring automatically and connects the loaded aggregate to the event publisher.

## Snapshot Revisions

`snapshotRevision` versions the snapshot payload format, not the event stream. Increment it whenever old payloads are no longer safe for the current `applySnapshot` implementation.

```ts
// Snapshot payload: { name, status }
@AggregateRootConfig({ name: "User", snapshotRevision: 2 })
```

Direct `findWithSnapshot` calls throw `SnapshotRevisionMismatchException` when the stored and configured revisions differ. `AggregateRepository.load` catches exactly that exception and falls back to full event replay; unrelated errors still propagate. A later successful commit can then create a snapshot in the new format when the policy matches.
