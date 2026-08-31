---
title: Commit Pipeline
description: The exact runtime order Event Nest follows from AggregateRoot.commit() through persistence, snapshots, and subscriptions.
---

<script>
    import CommitPipeline from "$lib/diagrams/commit-pipeline.svelte";
</script>

`AggregateRoot.commit()` coordinates one batch of uncommitted events. Persistence is the boundary in the middle of the pipeline: policy evaluation happens before it, while snapshot creation and subscription dispatch happen after it.

<CommitPipeline />

## Exact execution order

1. **Copy the pending batch.** `commit()` shallow-copies `uncommittedEvents` into a local `toPublish` array. If the copy is empty, it returns the aggregate immediately. No publisher, adapter, snapshot policy, or subscription is called.
2. **Resolve aggregate metadata.** The publisher installed by `EventStore.addPublisher()` reads the aggregate name from `@AggregateRootConfig`. A missing name rejects the commit before IDs are generated or storage is called.
3. **Generate event IDs.** The store calls `generateEntityId()` once per event with `Promise.all`. A rejection, a missing value, or an unexpected result count rejects the commit.
4. **Await the snapshot policy.** `snapshotStore.shouldCreateSnapshot(aggregate)` runs against the aggregate's current version and still-present uncommitted events. Event Nest awaits synchronous and asynchronous strategies before any event persistence. A `true` result also validates that the class and instance are snapshot-aware.
5. **Build two event representations.** Each pending event becomes a `StoredEvent` for the adapter and a `PublishedDomainEvent` for subscriptions. Both receive the generated event ID and retain the aggregate ID and occurrence time.
6. **Call the adapter's `save`.** The store passes the `StoredEvent[]` and a `StoredAggregateRoot` carrying the aggregate ID and expected current version. Official adapters perform optimistic-concurrency checking, assign consecutive event versions, persist the events, and update the stored aggregate version.
7. **Resolve the committed aggregate version.** The highest version in the adapter's returned events becomes `aggregate.version`. This happens immediately after `save` resolves.
8. **Create the snapshot when selected.** Event Nest generates a snapshot ID, awaits `aggregate.toSnapshot()`, and saves a snapshot containing the now-committed aggregate version, configured revision, payload, and aggregate ID. This write is after event persistence, not part of the event adapter's `save` operation.
9. **Map committed event versions.** Each `PublishedDomainEvent` is matched to a returned `StoredEvent` by event ID and receives its assigned `aggregateRootVersion`. A missing match raises `UnknownEventVersionException`.
10. **Dispatch subscriptions.** The fully populated published events are passed to the `DomainEventEmitter`. Dispatch begins only after event persistence and any selected snapshot creation have completed.
11. **Clear or retain the aggregate buffer.** When publishing resolves, `commit()` clears all uncommitted events. It also clears them when publishing rejects with `SubscriptionException`, because storage has already succeeded. Every other rejection retains them.

The copied batch means subsequent appends are not added to the events already selected for this call. It is a shallow copy: payload objects themselves are not cloned.

## The two representations

`StoredEvent` is storage-facing. `StoredEvent.fromPublishedEvent()` resolves the canonical domain-event name and uses `instanceToPlain()` from [class-transformer](https://github.com/typestack/class-transformer) for its payload. The adapter later assigns `aggregateRootVersion`.

`PublishedDomainEvent` is subscription-facing:

```ts
interface PublishedDomainEvent<T> {
    aggregateRootId: string;
    eventId: string;
    occurredAt: Date;
    payload: T;
    version: number;
}
```

Its payload remains the original class instance. Its preliminary version is replaced by the committed version returned by the adapter before dispatch.

## Why policy evaluation is early

Policies such as `ForCountSnapshotStrategy` calculate a projected version from the current version plus `uncommittedEvents.length`. Resolving the aggregate to its committed version first would count the same events twice. Event Nest therefore awaits the decision before `save`, but creates the snapshot afterward so its metadata points at the committed stream head.

## Persistence boundary

The official MongoDB, PostgreSQL, and SQL Server adapters keep their aggregate-row/document update and event inserts together in the adapter's transaction. Core only depends on the `EventStore.save()` contract and cannot make a custom adapter atomic.

Snapshot storage is a later operation, and subscriptions are later still. Neither should be described as part of, or capable of rolling back, the event persistence transaction. See [Failure Behaviour](/how-event-nest-works/failure-behaviour/) for the observable state at each failure point and [Subscription Dispatch](/how-event-nest-works/subscription-dispatch/) for waiting rules.
