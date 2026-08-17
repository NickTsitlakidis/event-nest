---
title: Decorators
description: Reference for Event Nest domain event, aggregate, replay, and subscription decorators.
---

<script>
    import ApiSymbol from "$lib/components/api-symbol.svelte";
</script>

All decorators are exported from `@event-nest/core`. Import `reflect-metadata` as required by NestJS; decorator metadata drives persistence, replay, and subscription discovery.

## `@DomainEvent`

<ApiSymbol kind="decorator" name="DomainEvent" packageName="@event-nest/core" source="libs/core/src/lib/domain-event.ts" />

```ts
function DomainEvent(eventName: string, options?: { aliases?: string[] }): ClassDecorator
```

Registers the decorated class under a persisted canonical name. `AggregateRoot.append()` accepts only registered event instances, and stored payloads are serialized and reconstructed with `class-transformer`.

```ts
@DomainEvent("user-renamed", { aliases: ["user-name-changed"] })
export class UserRenamed {
    constructor(readonly name: string) {}
}
```

- `eventName` must be unique across every canonical name and alias loaded in the process.
- `aliases` defaults to `[]`; duplicates within one registration also conflict.
- Reads resolve either the canonical name or an alias to this class.
- New writes always persist the canonical `eventName`.
- Because registration occurs when the decorator runs, conflicts normally fail during module evaluation/application startup.
- Keep an alias until no persisted event uses it. Removing it makes those historical events unknown during replay.

## `@AggregateRootConfig`

<ApiSymbol kind="decorator" name="AggregateRootConfig" packageName="@event-nest/core" source="libs/core/src/lib/aggregate-root/aggregate-root-config.ts" />

```ts
function AggregateRootConfig(parameters: {
    name: string;
    snapshotRevision?: number;
}): ClassDecorator
```

Attaches the aggregate name used in event writes and queries, plus optional snapshot-format metadata.

```ts
@AggregateRootConfig({ name: "User", snapshotRevision: 2 })
export class User extends AggregateRoot implements SnapshotAware<UserSnapshot> {
    // ...
}
```

| Parameter | Required | Meaning |
| --- | --- | --- |
| `name` | Yes | Persisted with every event and used to filter reads for the aggregate class. Treat it as durable storage identity. |
| `snapshotRevision` | No | Marks the class as snapshot-aware and identifies its snapshot payload format. Increment it when an existing stored snapshot is no longer compatible. |

`snapshotRevision` metadata alone is not enough: a matching snapshot strategy also requires callable `toSnapshot()` and `applySnapshot()` methods. Conversely, implementing those methods without a numeric revision does not make the class snapshot-aware to Event Nest.

The exported `getAggregateRootName()` and `getAggregateRootSnapshotRevision()` helpers read this metadata. The metadata keys themselves are internal and are not public barrel exports.

## `@AggregateRootName` (deprecated)

<ApiSymbol kind="decorator" name="AggregateRootName" packageName="@event-nest/core" source="libs/core/src/lib/aggregate-root/aggregate-root-name.ts" status="deprecated" />

```ts
function AggregateRootName(name: string): ClassDecorator
```

This older decorator sets only the aggregate name. It remains exported in 6.0.0 for migration, but is deprecated in favor of `@AggregateRootConfig({ name })` and is planned for removal in 7.x.

```ts
// Before
@AggregateRootName("User")

// Current form
@AggregateRootConfig({ name: "User" })
```

The name stored in existing events does not need to change for this decorator-only migration.

## `@ApplyEvent`

<ApiSymbol kind="decorator" name="ApplyEvent" packageName="@event-nest/core" source="libs/core/src/lib/aggregate-root/apply-event.decorator.ts" />

```ts
function ApplyEvent(eventClass: Class<unknown>): PropertyDecorator
```

Marks an aggregate method as the replay handler for exactly one event class.

```ts
@ApplyEvent(UserRenamed)
private applyUserRenamed(event: UserRenamed): void {
    this.name = event.name;
}
```

- Replay sorts stored events by `aggregateRootVersion`, resolves each stored event name to its registered class, and invokes the method whose metadata references that class.
- The method may be non-public, but it must exist and be callable at runtime.
- A stored name with no `@DomainEvent` registration, or a registered event with no matching `@ApplyEvent` method, produces `UnknownEventException`.
- Passing `null` or `undefined` as the class throws an internal `MissingEventClassException`, commonly caused by a circular or incorrect import. That exception is not exported from the package barrel.
- Application code must apply state changes when creating a new event as well as append it. `@ApplyEvent` is used automatically during reconstitution, not automatically by `append()`.

## `@DomainEventSubscription`

<ApiSymbol kind="decorator" name="DomainEventSubscription" packageName="@event-nest/core" source="libs/core/src/lib/domain-event-subscription.ts" />

```ts
function DomainEventSubscription(...eventClasses: Class<unknown>[]): ClassDecorator
function DomainEventSubscription(config: {
    eventClasses: Class<unknown>[];
    isAsync?: boolean;
}): ClassDecorator
```

Marks a Nest provider for discovery at application bootstrap. The instance must also have an `onDomainEvent(event): Promise<unknown>` method; implementing `OnDomainEvent<T>` provides compile-time checking.

```ts
@Injectable()
@DomainEventSubscription({ eventClasses: [UserRenamed], isAsync: false })
export class UserProjection implements OnDomainEvent<UserRenamed> {
    async onDomainEvent(event: PublishedDomainEvent<UserRenamed>): Promise<void> {
        // update projection
    }
}
```

| Setting | Default | Behavior |
| --- | --- | --- |
| `eventClasses` | None | Classes to subscribe to. Duplicate class references are removed while preserving first occurrence order. |
| `isAsync` | `true` | `true` normally detaches the handler from `commit()`; failures are logged. `false` makes dispatch wait and wraps failures in public `SubscriptionException`. |

Subscription providers are bound when the adapter module runs `onApplicationBootstrap`. A decorated class that is not registered as a Nest provider, or one without a callable `onDomainEvent`, is not bound.

Persistence happens before dispatch. A `SubscriptionException` never means that event storage was rolled back, and `AggregateRoot.commit()` clears uncommitted events for that exception to prevent accidental duplicate persistence.

Dispatch details also depend on `concurrentSubscriptions`:

- With the default `false`, events in a commit are dispatched sequentially; matching handlers for one event run concurrently. If any event in that batch has a synchronous (`isAsync: false`) subscription, the dispatcher waits for the whole filtered event sequence, including its asynchronous handlers.
- With `true`, all matching event-handler pairs are started concurrently. Synchronous handlers are awaited; asynchronous handlers are launched without delaying the commit.

See [configuration](/api-reference/configuration/), [exceptions](/api-reference/exceptions/), and [common problems](/help/common-problems/).
