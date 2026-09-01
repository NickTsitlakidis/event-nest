---
title: Exceptions
description: Public Event Nest exception triggers, causes, and recovery guidance.
---

<script>
    import ExceptionReference from "$lib/components/exception-reference.svelte";
</script>

Only the exception classes re-exported by `@event-nest/core` are listed as public API. Catch the narrow exception you can recover from; let invalid model/configuration errors fail fast.

<ExceptionReference
    name="AggregateClassNotSnapshotAwareException"
    trigger="Snapshot lookup or creation needs snapshot revision metadata, but the aggregate class has none."
    cause="The aggregate can match a snapshot path while @AggregateRootConfig omits snapshotRevision, or the metadata is not numeric."
    resolution="Add a numeric snapshotRevision and implement SnapshotAware, or exclude the aggregate from the configured snapshot strategy."
/>

<ExceptionReference
    name="AggregateInstanceNotSnapshotAwareException"
    trigger="A snapshot is applied or a matching strategy requests creation, but the instance does not expose callable toSnapshot and applySnapshot methods."
    cause="SnapshotAware was implemented incompletely, a method was renamed, or a snapshot was passed to a non-snapshot aggregate."
    resolution="Implement both methods and add snapshotRevision metadata, or do not pass/configure snapshots for this aggregate."
/>

<ExceptionReference
    name="EventConcurrencyException"
    trigger="The version expected by a save differs from the persisted aggregate version."
    cause="Another writer committed first, a stale instance was reused, or a snapshot-only load failed to pass aggregateRootVersion into reconstitute."
    resolution="Reload and re-run the command under domain-safe retry rules. Snapshot factories must forward the version returned by findWithSnapshot."
/>

The exception exposes its information through its message only: `Concurrency issue for aggregate <id>. Expected <expected>. Stored <database>`.

<ExceptionReference
    name="EventNameConflictException"
    trigger="@DomainEvent registers a canonical name or alias already present in the process, including duplicates within one registration."
    cause="Two event classes share storage identity or an alias collides with another canonical name/alias."
    resolution="Assign globally unique names and aliases. Do not remove an old alias until its persisted rows have been migrated or retired."
/>

<ExceptionReference
    name="MissingAggregateRootNameException"
    trigger="Publishing, reading, or snapshot lookup cannot resolve aggregate-name metadata."
    cause="The aggregate class lacks @AggregateRootConfig (or the deprecated @AggregateRootName), or the wrong class was supplied to a read."
    resolution="Decorate the aggregate with @AggregateRootConfig and its name property, then preserve the durable name used by existing events."
/>

The current exception text still mentions `@AggregateRootName`; use `@AggregateRootConfig`, because the former is deprecated.

<ExceptionReference
    name="SnapshotRevisionMismatchException"
    trigger="findWithSnapshot finds a stored snapshot whose revision differs from the aggregate class revision."
    cause="The snapshot payload format/revision changed or deployments disagree on aggregate metadata."
    resolution="Replay the complete event stream and write a new compatible snapshot. AggregateRepository.load performs this fallback automatically; direct findWithSnapshot callers must handle it."
/>

<ExceptionReference
    name="SubscriptionException"
    trigger="An awaited subscription rejects after events have been persisted."
    cause="An isAsync: false handler failed; in default sequential dispatch, a mixed batch that contains a synchronous subscription waits for the entire sequence, so any handler in that sequence can surface this exception."
    resolution="Inspect caughtError, eventClassName, and eventId. Repair/retry the projection or side effect idempotently; do not commit the domain events again."
/>

`SubscriptionException` has public `caughtError`, `eventClassName`, and `eventId` getters. `AggregateRoot.commit()` clears its uncommitted events when this exception is caught because persistence already happened.

<ExceptionReference
    name="UnknownEventException"
    trigger="AggregateRoot.reconstitute finds an unregistered stored event name or no @ApplyEvent method for its resolved class."
    cause="An event class was not imported/registered, a persisted name changed without an alias, or the aggregate lacks the matching replay method."
    resolution="Ensure startup imports every @DomainEvent class, preserve old names as aliases, and add an @ApplyEvent handler for every event in that aggregate stream."
/>

Its message separates `Unregistered` persisted names from registered names with a `Missing apply method`.

## Internal and generic errors

Some actionable failures use classes that exist in source but are not exported by the public barrel. Do not deep-import them:

- Appending an undecorated event throws internal `UnregisteredEventException`.
- `@ApplyEvent(undefined)` throws internal `MissingEventClassException`.
- A custom event store returning the wrong number of generated IDs can trigger internal `IdGenerationException`.
- A custom store that does not return a saved event/version for every publication can trigger internal `UnknownEventVersionException`.

Configuration and strategy validation also uses plain `Error`, including incomplete snapshot option pairs, invalid strategy counts/empty composites, invalid SQL Server identifiers, mutually exclusive SQL Server `port`/`instanceName`, and invalid `aggregateRootVersion` passed to `reconstitute`.

See [common problems](/help/common-problems/) for diagnostic steps and [public API](/api-reference/public-api/) for the authoritative barrel inventory.
