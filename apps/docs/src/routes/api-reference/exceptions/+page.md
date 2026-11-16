---
title: Exceptions
description: Event Nest exception classes, their stable error codes, exposed fields, triggers, causes, and recovery guidance.
---

<script lang="ts">
    import ExceptionReference from "#lib/components/exception-reference.svelte";

    // The entries live here instead of in markup because a Svelte component tag that spans several lines is
    // wrapped in a <p> by the markdown pipeline. An <article> inside a <p> is invalid HTML, the browser repairs
    // it, and hydration then fails for the whole page. A single-line component tag is treated as an HTML block.
    const exceptions = [
        {
            name: "AggregateClassNotSnapshotAwareException",
            code: "en_1003",
            fields: "aggregateRootName?: string",
            trigger: "Snapshot lookup or creation needs snapshot revision metadata, but the aggregate class has none.",
            cause: "The aggregate can match a snapshot path while @AggregateRootConfig omits snapshotRevision, or the metadata is not numeric.",
            resolution: "Add a numeric snapshotRevision and implement SnapshotAware, or exclude the aggregate from the configured snapshot strategy."
        },
        {
            name: "AggregateInstanceNotSnapshotAwareException",
            code: "en_1004",
            fields: "aggregateRootName?: string",
            trigger: "A snapshot is applied or a matching strategy requests creation, but the instance does not expose callable toSnapshot and applySnapshot methods.",
            cause: "SnapshotAware was implemented incompletely, a method was renamed, or a snapshot was passed to a non-snapshot aggregate.",
            resolution: "Implement both methods and add snapshotRevision metadata, or do not pass/configure snapshots for this aggregate."
        },
        {
            name: "EventConcurrencyException",
            code: "en_1002",
            fields: "aggregateRootId: string, storedVersion: number, expectedVersion: number",
            trigger: "The version expected by a save differs from the persisted aggregate version.",
            cause: "Another writer committed first, a stale instance was reused, or a snapshot-only load failed to pass aggregateRootVersion into reconstitute.",
            resolution: "Reload and re-run the command under domain-safe retry rules. Snapshot factories must forward the version returned by findWithSnapshot."
        },
        {
            name: "EventNameConflictException",
            code: "en_1005",
            fields: "eventName: string",
            trigger: "@DomainEvent registers a canonical name or alias already present in the process, including duplicates within one registration.",
            cause: "Two event classes share storage identity or an alias collides with another canonical name/alias.",
            resolution: "Assign globally unique names and aliases. Do not remove an old alias until its persisted rows have been migrated or retired."
        },
        {
            name: "IdGenerationException",
            code: "en_1006",
            fields: "idsLength: number, expectedLength: number",
            trigger: "Publishing generates one ID per event, but the number of IDs returned does not match the number of events, or an ID is missing.",
            cause: "A custom event store's generateEntityId resolved to null or undefined, or returned inconsistently.",
            resolution: "Make generateEntityId always resolve to a non-empty string. The official adapters do not trigger this exception."
        },
        {
            name: "InvalidAggregateRootVersionException",
            code: "en_1013",
            fields: "aggregateRootVersion: number",
            trigger: "AggregateRoot.reconstitute receives an explicit aggregateRootVersion that is not a non-negative safe integer.",
            cause: "A factory forwarded a corrupted or computed value instead of the aggregateRootVersion returned by findWithSnapshot.",
            resolution: "Forward the version exactly as returned by the store, or omit it and let reconstitute resolve the version from the events."
        },
        {
            name: "MissingAggregateRootNameException",
            code: "en_1007",
            fields: "aggregateRootClassName: string",
            trigger: "Publishing, reading, or snapshot lookup cannot resolve aggregate-name metadata.",
            cause: "The aggregate class lacks @AggregateRootConfig (or the deprecated @AggregateRootName), or the wrong class was supplied to a read.",
            resolution: "Decorate the aggregate with @AggregateRootConfig and its name property, then preserve the durable name used by existing events. The message still names the deprecated @AggregateRootName decorator; @AggregateRootConfig is the replacement."
        },
        {
            name: "MissingEventClassException",
            code: "en_1008",
            trigger: "@ApplyEvent is evaluated with null or undefined as the event class.",
            cause: "A circular or incorrect import leaves the event class undefined when the aggregate class is declared.",
            resolution: "Correct the import or break the cycle while retaining the same event class identity. This fails when the decorator runs, not during replay."
        },
        {
            name: "SnapshotRevisionMismatchException",
            code: "en_1001",
            fields: "aggregateRootName: string",
            trigger: "findWithSnapshot finds a stored snapshot whose revision differs from the aggregate class revision.",
            cause: "The snapshot payload format/revision changed or deployments disagree on aggregate metadata.",
            resolution: "Replay the complete event stream and write a new compatible snapshot. AggregateRepository.load performs this fallback automatically; direct findWithSnapshot callers must handle it."
        },
        {
            name: "SubscriptionException",
            code: "en_1009",
            fields: "caughtError: Error, eventClassName: string, eventId: string",
            trigger: "An awaited subscription rejects after events have been persisted.",
            cause: "An isAsync: false handler failed; in default sequential dispatch, a mixed batch that contains a synchronous subscription waits for the entire sequence, so any handler in that sequence can surface this exception.",
            resolution: "Inspect caughtError, eventClassName, and eventId. Repair/retry the projection or side effect idempotently; do not commit the domain events again. AggregateRoot.commit() clears its uncommitted events when this exception is thrown because persistence already happened."
        },
        {
            name: "UnknownEventException",
            code: "en_1010",
            fields: "unregisteredEventNames: ReadonlyArray<string>, missingApplyEventNames: ReadonlyArray<string>, aggregateRootId: string",
            trigger: "AggregateRoot.reconstitute finds an unregistered stored event name or no @ApplyEvent method for its resolved class. The whole batch is checked before any event is applied, and the two name lists are frozen copies of unique names.",
            cause: "An event class was not imported/registered, a persisted name changed without an alias, or the aggregate lacks the matching replay method.",
            resolution: "Ensure startup imports every @DomainEvent class, preserve old names as aliases, and add an @ApplyEvent handler for every event in that aggregate stream."
        },
        {
            name: "UnknownEventVersionException",
            code: "en_1011",
            fields: "eventId: string, aggregateRootId: string",
            trigger: "After a save, a published event cannot be matched to a returned stored event to receive its assigned version.",
            cause: "A custom event store's save did not return every event it was given, or returned events with different IDs.",
            resolution: "Return every stored event with its original ID and assigned aggregateRootVersion from save. The official adapters do not trigger this exception."
        },
        {
            name: "UnregisteredEventException",
            code: "en_1012",
            fields: "eventClassName: string",
            trigger: "AggregateRoot.append receives an event whose class is not registered with @DomainEvent.",
            cause: "The decorator is missing, or the module that declares the event was not imported before the aggregate used it.",
            resolution: "Decorate the event with a globally unique persisted name and import its defining module before using it."
        }
    ];
</script>

Every exception class exported by `@event-nest/core` extends `EventNestException`, which itself extends `Error`. Module option validation and snapshot strategy validation throw plain `Error` at bootstrap, before any command is handled; those are not covered by the guard below. Catch the narrow exception you can recover from; let invalid model/configuration errors fail fast.

## Common shape

Each exception carries:

- `name`: the concrete class name, so loggers and stack traces print `EventConcurrencyException: ...` instead of `Error: ...`.
- `errorCode`: a stable string code from the `CoreErrorCodes` enum. Codes are the contract to match on; messages may be reworded between releases.
- Public readonly fields with the data behind the message, listed per exception below. Only those fields, `name`, and `errorCode` are enumerable, so `JSON.stringify(error)` and logger serializers emit clean keys.
- A static `code` property on the class, equal to the `errorCode` of its instances.

Each class is also branded with a global symbol, so Event Nest exceptions can be recognised even when more than one copy of `@event-nest/core` is installed.

## Matching exceptions

Use `isEventNestException` instead of `instanceof`. It accepts an optional second argument and narrows the type:

```typescript
import { CoreErrorCodes, EventConcurrencyException, isEventNestException } from "@event-nest/core";

try {
    await repository.save(user);
} catch (error) {
    if (isEventNestException(error, EventConcurrencyException)) {
        // Narrowed to EventConcurrencyException without instanceof.
        throw new ConflictException(
            `Expected version ${error.expectedVersion} but the stored version is ${error.storedVersion}`
        );
    }

    if (isEventNestException(error, CoreErrorCodes.SNAPSHOT_REVISION_MISMATCH)) {
        // Matched by code only; the type is EventNestException.
    }

    if (isEventNestException(error)) {
        // Any Event Nest exception.
        logger.error({ code: error.errorCode }, error.message);
    }

    throw error;
}
```

All three forms first check the symbol brand and then compare the instance's `errorCode`. The class form reads the static `code` of the class you pass, so it never relies on `instanceof` and still narrows to that class.

A NestJS exception filter can map codes to HTTP responses the same way:

```typescript
import { EventConcurrencyException, isEventNestException } from "@event-nest/core";
import { ArgumentsHost, Catch, ConflictException } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";

@Catch()
export class EventNestExceptionFilter extends BaseExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        if (isEventNestException(exception, EventConcurrencyException)) {
            exception = new ConflictException({
                aggregateRootId: exception.aggregateRootId,
                code: exception.errorCode,
                expectedVersion: exception.expectedVersion,
                storedVersion: exception.storedVersion
            });
        }
        super.catch(exception, host);
    }
}
```

The filter replaces the matched exception and delegates to Nest's base filter, which writes the HTTP response for any adapter. Exceptions thrown from inside a filter are not routed back through the filter chain, so a filter must respond rather than rethrow. Register it with `app.useGlobalFilters(new EventNestExceptionFilter(app.get(HttpAdapterHost).httpAdapter))`.

## Error codes

| `CoreErrorCodes` member | Value | Exception |
| --- | --- | --- |
| `SNAPSHOT_REVISION_MISMATCH` | `en_1001` | `SnapshotRevisionMismatchException` |
| `EVENT_CONCURRENCY_ISSUE` | `en_1002` | `EventConcurrencyException` |
| `AGGREGATE_CLASS_NOT_SNAPSHOT_AWARE` | `en_1003` | `AggregateClassNotSnapshotAwareException` |
| `AGGREGATE_INSTANCE_NOT_SNAPSHOT_AWARE` | `en_1004` | `AggregateInstanceNotSnapshotAwareException` |
| `EVENT_NAME_CONFLICT` | `en_1005` | `EventNameConflictException` |
| `ID_GENERATION_FAILURE` | `en_1006` | `IdGenerationException` |
| `MISSING_AGGREGATE_ROOT_NAME` | `en_1007` | `MissingAggregateRootNameException` |
| `MISSING_EVENT_CLASS` | `en_1008` | `MissingEventClassException` |
| `SUBSCRIPTION_FAILURE` | `en_1009` | `SubscriptionException` |
| `UNKNOWN_EVENT` | `en_1010` | `UnknownEventException` |
| `UNKNOWN_EVENT_VERSION` | `en_1011` | `UnknownEventVersionException` |
| `UNREGISTERED_EVENT` | `en_1012` | `UnregisteredEventException` |
| `INVALID_AGGREGATE_ROOT_VERSION` | `en_1013` | `InvalidAggregateRootVersionException` |

The numeric part carries no meaning. Treat codes as opaque identifiers and look them up here.

## Exception reference

<ExceptionReference items={exceptions} />

See [common problems](/help/common-problems/) for diagnostic steps and [public API](/api-reference/public-api/) for the authoritative barrel inventory.
