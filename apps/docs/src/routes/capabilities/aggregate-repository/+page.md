---
title: AggregateRepository
description: Load, reconstitute, connect, and save one aggregate type with Event Nest's AggregateRepository helper.
---

<script lang="ts">
    import SnapshotReplay from "$lib/diagrams/snapshot-replay.svelte";
</script>

`AggregateRepository<T>` is a small wrapper around an `EventStore` for the usual load, mutate, and commit workflow. A repository is bound to one aggregate class and one factory function. It is a plain class, not a NestJS provider created automatically by Event Nest.

```ts
import { AggregateRepository, EVENT_STORE, type EventStore } from "@event-nest/core";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class UserService {
    private readonly users: AggregateRepository<User>;

    constructor(@Inject(EVENT_STORE) eventStore: EventStore) {
        this.users = new AggregateRepository(eventStore, User, User.fromEvents);
    }

    async changeName(id: string, name: string): Promise<void> {
        const user = await this.users.load(id);
        if (!user) {
            throw new NotFoundException();
        }

        user.changeName(name);
        await this.users.save(user);
    }
}
```

## The Factory Contract

The third constructor argument is a four-argument factory:

```ts
type AggregateRootFactory<T extends AggregateRoot> = (
    id: string,
    events: StoredEvent[],
    snapshot?: AggregateRootSnapshot<T>,
    aggregateRootVersion?: number
) => T;
```

Snapshot-aware factories should forward all persisted state to `reconstitute`:

```ts
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
```

The fourth argument is the authoritative stream-head version returned by `findWithSnapshot`. It matters when the latest snapshot is at the head of the stream and there are no later events. Without it, replaying an empty event list would leave the aggregate at version `0`, and its next commit could fail with an `EventConcurrencyException`.

A non-snapshot-aware aggregate can ignore the optional arguments:

```ts
static fromEvents(id: string, events: StoredEvent[]): User {
    const user = new User(id);
    user.reconstitute(events);
    return user;
}
```

If a factory needs a bound `this`, wrap the call: `(id, events, snapshot, version) => User.fromEvents(id, events, snapshot, version)`.

## Loading

`load(id)` selects the read path from the aggregate class metadata:

| Aggregate configuration | Repository read |
| --- | --- |
| No `snapshotRevision` | `findByAggregateRootId(AggregateClass, id)` and full event replay |
| Has `snapshotRevision` | `findWithSnapshot(AggregateClass, id)`, then snapshot plus later events |

<SnapshotReplay />

If both the event list and snapshot are absent, `load` returns `undefined`; it does not construct an empty aggregate and does not throw a not-found exception. A snapshot with no later events is persisted state, so it still produces an aggregate.

The loaded aggregate is passed through `eventStore.addPublisher` before it is returned. It is therefore connected to the store and can use either of these equivalent commit styles:

```ts
user.changeName("New name");
await user.commit();

// Or, when service code consistently works through the repository:
user.changeName("Another name");
await users.save(user);
```

## Snapshot Revision Fallback

For a snapshot-aware aggregate, the repository falls back to `findByAggregateRootId` only when `findWithSnapshot` throws `SnapshotRevisionMismatchException`. This lets a changed snapshot format recover through the complete event history.

Other errors are not treated as stale snapshots. Storage failures, configuration errors, missing aggregate metadata, and any other exception propagate to the caller.

See [Snapshots](/capabilities/snapshots/) for revision and replay details.

## Saving New Aggregates

`save(aggregate)` connects the publisher and calls `commit()`, so it also works for newly created aggregate instances:

```ts
async function createUser(id: string): Promise<User> {
    const user = User.create(id, "Initial name", "user@example.com");
    return users.save(user);
}
```

The application owns aggregate ID generation and must supply an ID compatible with its configured adapter. UUIDs work with the built-in PostgreSQL and SQL Server schemas, but not with MongoDB; the MongoDB adapter expects a 24-character hexadecimal `ObjectId` string. Event Nest uses `generateEntityId()` internally rather than as the recommended application-facing ID API.

The returned promise resolves to the same aggregate after a successful commit. If there are no uncommitted events, `commit()` returns without writing anything.
