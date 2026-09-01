---
title: Snapshot Loading
description: How Event Nest validates snapshot revisions, loads the post-snapshot event slice, and falls back in AggregateRepository.
---

`EventStore.findWithSnapshot(AggregateClass, id)` returns a compatible snapshot payload, only the events after it, and an authoritative aggregate version. `AggregateRepository.load()` uses that operation automatically for classes configured with a snapshot revision.

## Store-level loading

Before an adapter queries the post-snapshot event slice, core performs storage-independent validation:

1. Resolve the aggregate name from `@AggregateRootConfig` or throw `MissingAggregateRootNameException`.
2. Resolve `snapshotRevision` from the class or throw `AggregateClassNotSnapshotAwareException`.
3. Ask the snapshot store for the latest snapshot for the aggregate ID.
4. If a snapshot exists, compare its stored revision with the class revision. A mismatch throws `SnapshotRevisionMismatchException` before any event slice is returned.

The official adapters then return one of these shapes:

| Persisted state | `snapshot` | `events` | `aggregateRootVersion` |
| --- | --- | --- | --- |
| No snapshot | `undefined` | All events for the aggregate ID and aggregate name | Highest event version, or `0` when there are no events |
| Snapshot with later events | Snapshot payload | Events whose version is strictly greater than the snapshot version | Highest returned event version |
| Snapshot at stream head | Snapshot payload | Empty array | Snapshot version |

The returned snapshot is its payload, not the `StoredSnapshot` envelope. Snapshot ID, revision, and snapshot version are used by the loading process but are not passed to `applySnapshot()`.

Adapters can return events in storage-specific query order. `AggregateRoot.reconstitute()` sorts the supplied slice by `aggregateRootVersion`, so replay order does not depend on that query order.

## Correct factory forwarding

A snapshot-aware factory should forward all four values:

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

The explicit version matters when the snapshot is at the stream head. Without it, no event exists from which `reconstitute()` can infer the current version.

## AggregateRepository behavior

`AggregateRepository` chooses its loading path from aggregate class metadata:

| Class metadata | Repository operation |
| --- | --- |
| No `snapshotRevision` | Call `findByAggregateRootId()` and perform a full event replay. |
| Has `snapshotRevision` | Call `findWithSnapshot()` and pass snapshot, events, and aggregate version to the factory. |

After the factory returns, the repository installs the event publisher. The loaded aggregate can therefore call `commit()` directly. If neither events nor a snapshot exist, `load()` returns `undefined` and does not call the factory.

## Revision mismatch fallback

The repository catches `SnapshotRevisionMismatchException` only. It logs a warning, calls `findByAggregateRootId()`, and invokes the factory with the full stream and no snapshot. The aggregate version is then inferred from the full event list.

This fallback lets a new snapshot revision recover from older stored snapshot formats without deleting event history. It does not migrate or overwrite the incompatible snapshot during loading. A later successful commit may create a compatible snapshot if the configured policy selects that commit.

Other failures are not fallback signals. Missing aggregate metadata, a class without snapshot configuration, snapshot-store errors, and adapter read errors are rethrown. A direct call to `findWithSnapshot()` also exposes `SnapshotRevisionMismatchException`; only `AggregateRepository.load()` implements the automatic mismatch fallback.

Continue with [Aggregate Reconstitution](/how-event-nest-works/aggregate-reconstitution/) for replay semantics or [Failure Behaviour](/how-event-nest-works/failure-behaviour/) for write-side snapshot failures.
