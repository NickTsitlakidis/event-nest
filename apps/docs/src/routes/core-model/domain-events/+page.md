---
title: Domain Events
description: Define immutable, serializable facts with stable Event Nest event names.
---

A domain event is an immutable fact that the domain decided has happened. In Event Nest, the event class carries the payload and `@DomainEvent()` supplies the durable name used in storage and during replay.

```ts
import { DomainEvent } from "@event-nest/core";

@DomainEvent("user-created")
export class UserCreatedEvent {
    constructor(
        public readonly name: string,
        public readonly email: string
    ) {}
}

@DomainEvent("user-name-changed")
export class UserNameChangedEvent {
    constructor(public readonly name: string) {}
}
```

## Name events as facts

Use past-tense names that describe what happened, not instructions such as `CreateUser`. Event Nest stores `user-created` or `user-name-changed` with every event row. The decorator name must be unique across all registered events.

The persisted name is a schema contract:

- Renaming only the TypeScript class does not change stored data if the decorator name stays the same.
- Changing the decorator name without an alias makes older rows unresolvable.
- Duplicate canonical names or aliases fail during event registration.

If a persisted name must change, retain the old name as an alias:

```ts
@DomainEvent("user-created", { aliases: ["user-registered"] })
export class UserCreatedEvent {
    constructor(
        public readonly name: string,
        public readonly email: string
    ) {}
}
```

New rows use only `user-created`; a stored `user-registered` row resolves to `UserCreatedEvent` during replay. Keep aliases until no stored history uses them.

## Design the payload for history

Event payloads are serialized and deserialized with `class-transformer`. Prefer constructor data made of stable, JSON-compatible values. `readonly` prevents accidental mutation in application code, but you must still treat the persisted payload as permanent.

Good events contain the information needed to understand and apply that fact. They should not contain services, open database objects, callbacks, or behavior that depends on current external state. If an event's meaning changes, introduce a new event or preserve compatibility rather than rewriting history.

Event Nest adds storage metadata separately. A committed event exposed to a subscription is a `PublishedDomainEvent<T>` with:

| Field | Meaning |
| --- | --- |
| `payload` | The domain event instance. |
| `eventId` | Store-generated ID for this event. |
| `aggregateRootId` | ID of the aggregate stream. |
| `version` | Aggregate version assigned to this event. |
| `occurredAt` | Time recorded when the aggregate appended the event. |

An event only becomes an uncommitted aggregate change after `append()`, and only becomes durable after a successful `commit()`. Continue with [Aggregate Roots](/core-model/aggregate-roots/) and [Applying and Replaying Events](/core-model/applying-and-replaying-events/).
