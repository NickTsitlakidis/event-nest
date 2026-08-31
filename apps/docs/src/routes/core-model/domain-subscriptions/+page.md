---
title: Domain Subscriptions
description: React to persisted events with in-process NestJS providers and precise wait and ordering semantics.
---

A domain subscription is an in-process Nest provider that reacts after one or more domain events have been persisted. Typical uses include updating a read model, invalidating a cache, or scheduling follow-up work.

Subscriptions are not a durable message broker. They are discovered at application bootstrap, run in the committing application process, and do not automatically replay missed history after downtime.

## Define and register a subscription

```ts
import {
    DomainEventSubscription,
    type OnDomainEvent,
    type PublishedDomainEvent
} from "@event-nest/core";
import { Injectable, Module } from "@nestjs/common";

import { UserCreatedEvent, UserNameChangedEvent } from "./user.events";

@Injectable()
@DomainEventSubscription(UserCreatedEvent, UserNameChangedEvent)
export class UserSubscription implements OnDomainEvent<UserCreatedEvent | UserNameChangedEvent> {
    onDomainEvent(event: PublishedDomainEvent<UserCreatedEvent | UserNameChangedEvent>): Promise<unknown> {
        // Update a read model using event.payload and event.aggregateRootId.
        return Promise.resolve();
    }
}

@Module({
    providers: [UserSubscription]
})
export class UserModule {}
```

The class must have the decorator, implement an `onDomainEvent` function, and be instantiated in a Nest module's `providers`. Event Nest scans the Nest module container and binds matching providers during application bootstrap.

The handler receives the original domain payload plus committed metadata:

```ts
interface PublishedDomainEvent<T> {
    aggregateRootId: string;
    eventId: string;
    occurredAt: Date;
    payload: T;
    version: number;
}
```

## Post-persistence guarantee

Dispatch starts only after the event store has saved the event batch, resolved the aggregate's committed version, and created any selected snapshot. A handler can therefore use `eventId` and `version` as committed identifiers.

This ordering is not a distributed transaction. A subscription failure never rolls back event storage. Make projection handlers idempotent, normally by recording `eventId` with the read-model update.

## Waiting versus non-waiting subscriptions

The decorator defaults to `isAsync: true`:

```ts
@DomainEventSubscription(UserCreatedEvent, UserNameChangedEvent)
```

This is a **non-waiting** subscription. With the default dispatcher and no waiting subscriptions in the emitted batch, `commit()` returns after persistence and dispatch have been scheduled, not after the handlers' promises settle. Most applications do not need to wait for a subscription to finish, so the default is appropriate.

Set `isAsync: false` when the caller must wait:

```ts
@DomainEventSubscription({
    eventClasses: [UserCreatedEvent, UserNameChangedEvent],
    isAsync: false
})
```

This is a **waiting** subscription. A rejected handler promise is wrapped in `SubscriptionException` and rejects `commit()`. The events are still persisted, the aggregate has its committed version, and its uncommitted list is cleared.

A waiting subscription also guarantees that its read-model update has finished when `commit()` resolves. A client that reads that model immediately after the command can therefore avoid an eventual-consistency window.

## Ordering and concurrency

The adapter option `concurrentSubscriptions` controls event-batch scheduling. It defaults to `false`.

| Configuration | Event ordering | Handlers for one event | What `commit()` waits for |
| --- | --- | --- | --- |
| `concurrentSubscriptions: false` | Events with subscriptions are processed sequentially in emitted order. | All matching handlers for the current event run concurrently. | If the batch has any `isAsync: false` handler, the complete sequential batch, including matching non-waiting handlers. Otherwise dispatch is detached. |
| `concurrentSubscriptions: true` | No ordering guarantee across events. | Matching handlers run concurrently. | Only `isAsync: false` handlers; non-waiting handlers are launched independently. |

Enable concurrent scheduling in the storage module only when handlers do not depend on prior events finishing:

```ts
EventNestPostgreSQLModule.forRoot({
    aggregatesTableName: "aggregates",
    concurrentSubscriptions: true,
    connectionUri: process.env.DATABASE_URL!,
    eventsTableName: "events",
    schemaName: "event_nest"
})
```

With default sequential scheduling, failure stops the remaining subscribed events in that detached or awaited batch. A detached, non-waiting failure cannot reject a `commit()` that has already returned. With concurrent scheduling, non-waiting failures are logged and swallowed, while waiting failures reject `commit()`.

## Operational guidance

- Use `eventId` to make side effects idempotent.
- Preserve event order when one projection update depends on the preceding event.
- Do not retry the original command solely because a waiting subscription failed; the domain events are already stored.
- Use a durable outbox or external message infrastructure when delivery must survive process crashes or cross service boundaries.
- Build an explicit replay process for rebuilding projections from historical streams.

See the practical implementation in [Add a Projection](/build-your-first-aggregate/add-a-projection/) and the persistence boundary in [Event Streams and Versions](/core-model/event-streams-and-versions/).
