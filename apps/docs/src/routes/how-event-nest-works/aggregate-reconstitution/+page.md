---
title: Aggregate Reconstitution
description: How Event Nest validates, orders, deserializes, applies, and versions stored events when rebuilding an aggregate.
---

`AggregateRoot.reconstitute(events, snapshot?, aggregateRootVersion?)` rebuilds one aggregate instance. It does not append replayed events to the uncommitted buffer and does not invoke subscriptions.

## Runtime sequence

1. If a snapshot is provided, verify that the instance has valid snapshot metadata and implements `applySnapshot()` and `toSnapshot()`, then call `applySnapshot(snapshot)`.
2. Sort all supplied events in ascending `aggregateRootVersion` order without mutating the caller's array.
3. Prevalidate the complete sorted batch. Resolve each persisted event name to a registered event class, find its `@ApplyEvent` method, and deserialize known payloads.
4. If any event class is unregistered or any registered class lacks an apply method, throw one `UnknownEventException` before invoking any event apply method.
5. Invoke each resolved apply method in version order with its class instance payload.
6. Set the aggregate version from the explicit `aggregateRootVersion` when supplied. Otherwise, use the greatest supplied event version; with no events, the constructor's initial version remains `0`.

The snapshot is deliberately first. Therefore, an unknown event prevents all event application, but it does not undo a snapshot that has already been applied to the new instance.

## Unknown events are prevalidated

Reconstitution distinguishes two forms of unknown input:

| Category | Meaning |
| --- | --- |
| Unregistered event | The stored `eventName`, including any alias, cannot be resolved to a registered domain-event class. |
| Missing processor | The class is registered, but this aggregate has no method decorated with `@ApplyEvent(EventClass)`. |

`UnknownEventException` reports the unique names in both categories and the aggregate ID. Event Nest scans the whole batch first, so a valid earlier event is not applied before a later unknown event is discovered.

Event application itself is not transactional. If an apply method throws, any snapshot and earlier event methods have already mutated this newly constructed instance. The error is logged and rethrown.

## Ordering and deserialization

Storage query order is not trusted. `reconstitute()` sorts by the persisted numeric aggregate version before validation and replay. Equal versions retain the ordering supplied by JavaScript's stable array sort, but a valid stream should assign one consecutive version to each event.

For each known event, `StoredEvent.getPayloadAs(EventClass)` uses class-transformer's `plainToClass()` before the apply method runs. Decorator aliases participate in class lookup, so rows stored under an old event name can resolve to the current event class. New persistence uses the canonical name.

Because serialization and deserialization use class-transformer, payload classes must follow its transformation rules. Reconstitution does not pass the adapter's raw plain payload directly to an apply method.

## Version resolution

The optional third argument is authoritative:

```ts
aggregate.reconstitute(events, snapshot, aggregateRootVersion);
```

When it is present, Event Nest uses it even when it is `0` or differs from event versions. It must be a non-negative safe integer. Validation occurs after snapshot and event application, so callers should pass the version obtained from storage rather than untrusted input.

Without an explicit version, Event Nest resolves the maximum supplied event version. This is enough for a full replay. It is not enough for a snapshot sitting at the stream head: when there are no later events, the event array is empty and the aggregate would remain at version `0`. Pass `aggregateRootVersion` from `findWithSnapshot()` to avoid a false concurrency conflict on the next commit.

For how snapshot and event slices are selected, see [Snapshot Loading](/how-event-nest-works/snapshot-loading/). For version assignment during writes, see [Commit Pipeline](/how-event-nest-works/commit-pipeline/).
