---
title: Snapshot Policies
description: Choose, compose, or implement synchronous and asynchronous policies for snapshot creation.
---

A `SnapshotStrategy` decides whether the current commit should create a snapshot. The decision sees the aggregate's committed version before this commit and its complete list of uncommitted events.

```ts
abstract class SnapshotStrategy {
    abstract shouldCreateSnapshot(
        aggregateRoot: AggregateRoot
    ): boolean | Promise<boolean>;
}
```

The configured strategy applies globally to commits handled by that adapter module. Use aggregate filters or composite strategies when only selected aggregate types should produce snapshots.

## Built-In Strategies

### `NoSnapshotStrategy`

Always returns `false`. It is useful when an explicit strategy object is required but snapshot creation must remain disabled.

```ts
new NoSnapshotStrategy();
```

### `ForCountSnapshotStrategy`

Matches when the projected version crosses a multiple of `count`:

```ts
new ForCountSnapshotStrategy({ count: 100 });
```

At version `99`, one new event crosses the `100` boundary. At version `100`, one new event does not. A batch can cross one or several boundaries, but the commit creates only one snapshot containing the state after the whole batch. `count` must be at least `1`.

### `ForEventsSnapshotStrategy`

Matches when at least one uncommitted event payload is an instance of one of the configured classes:

```ts
new ForEventsSnapshotStrategy({
    eventClasses: [UserImportedEvent, UserSuspendedEvent]
});
```

The check uses `instanceof`; pass the event classes, not their persisted names.

### `ForAggregateRootsStrategy`

Matches aggregate types by their configured aggregate root names:

```ts
new ForAggregateRootsStrategy({
    aggregates: [User]
});
```

This strategy is commonly combined with `AllOfSnapshotStrategy` as a type filter. Aggregate classes without name metadata are ignored, and an evaluated aggregate without a name does not match.

### `AllOfSnapshotStrategy`

Matches only when every child strategy resolves to `true`:

```ts
new AllOfSnapshotStrategy([
    new ForAggregateRootsStrategy({ aggregates: [User] }),
    new ForCountSnapshotStrategy({ count: 100 })
]);
```

### `AnyOfSnapshotStrategy`

Matches when at least one child strategy resolves to `true`:

```ts
new AnyOfSnapshotStrategy([
    new ForCountSnapshotStrategy({ count: 100 }),
    new ForEventsSnapshotStrategy({ eventClasses: [UserSuspendedEvent] })
]);
```

Both composite constructors require at least one strategy and can be nested.

## Composite Evaluation

`AllOfSnapshotStrategy` and `AnyOfSnapshotStrategy` call every child and await them together with `Promise.all`. They do not short-circuit:

- `AllOfSnapshotStrategy` still evaluates later children after one returns `false`.
- `AnyOfSnapshotStrategy` still evaluates later children after one returns `true`.
- Synchronous and asynchronous children can be mixed.
- If any child throws or rejects, the composite rejects.

Keep custom policies free of side effects. Concurrent composite evaluation and the absence of short-circuiting make side-effect-dependent policies unreliable.

## Custom Policies

Extend `SnapshotStrategy` and return either a boolean or `Promise<boolean>`:

```ts
import { SnapshotStrategy, type AggregateRoot } from "@event-nest/core";

export class ForLargeStreamsStrategy extends SnapshotStrategy {
    constructor(private readonly minimumVersion: number) {
        super();
    }

    shouldCreateSnapshot(aggregate: AggregateRoot): boolean {
        return aggregate.version + aggregate.uncommittedEvents.length >= this.minimumVersion;
    }
}
```

Asynchronous checks are supported when the decision genuinely needs them:

```ts
shouldCreateSnapshot(aggregate: AggregateRoot): Promise<boolean> {
    return this.featureFlags.isEnabled("user-snapshots", aggregate.id);
}
```

Event Nest awaits the policy before persisting events. If a strategy throws or its promise rejects, event persistence, snapshot creation, and subscription dispatch do not start. Once a policy resolves `true`, Event Nest also validates that the aggregate has a name, a snapshot revision, `toSnapshot`, and `applySnapshot`; failed validation likewise happens before event persistence.

Snapshot payload creation itself happens later, after event persistence. See [Snapshots](/capabilities/snapshots/) for the full ordering and failure boundary.
