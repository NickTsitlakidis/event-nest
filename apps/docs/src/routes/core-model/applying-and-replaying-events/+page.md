---
title: Applying and Replaying Events
description: Understand how new events change aggregate state and how stored events reconstruct it.
---

The same deterministic state transition should handle a fact whether it was just decided or loaded years later. Event Nest identifies those transitions with `@ApplyEvent`, but it invokes them automatically only during `reconstitute()`.

## Recording a new change

A command method has two distinct jobs:

```ts
changeName(name: string): void {
    if (name.trim().length === 0) {
        throw new Error("A user name is required");
    }

    const event = new UserNameChangedEvent(name);
    this.applyUserNameChanged(event); // Change in-memory state now.
    this.append(event);               // Queue the fact for a future commit.
}

@ApplyEvent(UserNameChangedEvent)
private applyUserNameChanged(event: UserNameChangedEvent): void {
    this._name = event.name;
}
```

`append(event)` validates that the event class has `@DomainEvent`, then adds the payload, aggregate ID, and occurrence time to `uncommittedEvents`.

It does **not**:

- call the `@ApplyEvent` method;
- change aggregate state;
- increment the aggregate version;
- write to storage;
- invoke subscriptions.

Calling the applier without `append()` changes state but loses the fact. Calling `append()` without the applier records a future state that the current object does not reflect. Keep both operations together inside the aggregate's command method.

## Replaying stored history

The repository calls the aggregate factory, which delegates to `reconstitute()`:

```ts
static fromEvents(
    id: string,
    events: Array<StoredEvent>,
    snapshot?: unknown,
    aggregateRootVersion?: number
): User {
    const user = new User(id);
    user.reconstitute(events, snapshot, aggregateRootVersion);
    return user;
}
```

Reconstitution performs these steps:

1. Applies a supplied snapshot first, if the aggregate is snapshot-aware.
2. Sorts stored events by `aggregateRootVersion`.
3. Resolves each stored event name to its registered class and finds the matching `@ApplyEvent` method.
4. Deserializes the payload as that event class and calls the apply method in version order.
5. Sets the aggregate version from `aggregateRootVersion` when supplied, otherwise from the highest replayed event version.

Before applying any event in a non-empty batch, Event Nest checks the whole batch for unregistered names and missing apply methods. An unknown event causes `UnknownEventException`; the aggregate is not partially replayed. An exception thrown by an apply method stops replay and propagates.

Replay does not append the historical events, leave uncommitted events, save anything, or invoke domain subscriptions. Apply methods therefore must be deterministic and side-effect free: update aggregate fields only. Do not send email, call another service, read the current clock, or query a database from an applier.

## Snapshots and the version argument

For a snapshot-aware aggregate, `reconstitute(events, snapshot, aggregateRootVersion)` applies the snapshot and then only events newer than it. The version argument is still required when the snapshot is exactly at the stream head, because the events array is empty and cannot reveal the current version. The `AggregateRepository` obtains and forwards that value automatically when the factory accepts it.

Continue with [Event Streams and Versions](/core-model/event-streams-and-versions/) for commit and concurrency behavior.
