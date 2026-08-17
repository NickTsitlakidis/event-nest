---
title: Add a Projection
description: Project committed User events into an in-process read model with a domain subscription.
---

The aggregate from [Your First Aggregate](/build-your-first-aggregate/your-first-aggregate/) is optimized for decisions, not queries. A projection consumes committed events and maintains a read-oriented model. This example uses an in-memory store so the subscription mechanics remain visible; a real application should persist the projection in its query database.

## 1. Create the read-model store

```ts title="src/users/user-view.store.ts"
import { Injectable } from "@nestjs/common";

export interface UserView {
    email: string;
    id: string;
    name: string;
}

@Injectable()
export class UserViewStore {
    private readonly processedEventIds = new Set<string>();
    private readonly users = new Map<string, UserView>();

    applyCreated(eventId: string, user: UserView): void {
        if (this.processedEventIds.has(eventId)) {
            return;
        }

        this.users.set(user.id, { ...user });
        this.processedEventIds.add(eventId);
    }

    applyNameChanged(eventId: string, id: string, name: string): void {
        if (this.processedEventIds.has(eventId)) {
            return;
        }

        const current = this.users.get(id);
        if (!current) {
            throw new Error(`Cannot project a name change for missing user ${id}`);
        }

        this.users.set(id, { ...current, name });
        this.processedEventIds.add(eventId);
    }

    findById(id: string): UserView | undefined {
        const user = this.users.get(id);
        return user ? { ...user } : undefined;
    }
}
```

The event ID is a useful idempotency key. Persist both the read-model update and the processed ID atomically in a production projection so retries cannot apply an event twice.

## 2. Subscribe to committed events

```ts title="src/users/user.projection.ts"
import {
    DomainEventSubscription,
    type OnDomainEvent,
    type PublishedDomainEvent
} from "@event-nest/core";
import { Injectable } from "@nestjs/common";

import { UserCreatedEvent, UserNameChangedEvent } from "./user.events";
import { UserViewStore } from "./user-view.store";

@Injectable()
@DomainEventSubscription({
    eventClasses: [UserCreatedEvent, UserNameChangedEvent],
    isAsync: false
})
export class UserProjection implements OnDomainEvent<UserCreatedEvent | UserNameChangedEvent> {
    constructor(private readonly views: UserViewStore) {}

    onDomainEvent(event: PublishedDomainEvent<UserCreatedEvent | UserNameChangedEvent>): Promise<unknown> {
        if (event.payload instanceof UserCreatedEvent) {
            this.views.applyCreated(event.eventId, {
                email: event.payload.email,
                id: event.aggregateRootId,
                name: event.payload.name
            });
        } else {
            this.views.applyNameChanged(event.eventId, event.aggregateRootId, event.payload.name);
        }

        return Promise.resolve();
    }
}
```

`PublishedDomainEvent` wraps the domain payload with `eventId`, `aggregateRootId`, `occurredAt`, and the committed aggregate `version`. The projection uses the aggregate ID as the read-model ID and the event ID for deduplication.

`isAsync: false` means `commit()` waits for this handler. The name is easy to misread: the handler still returns a promise, but Event Nest includes that promise in the commit result. This makes a tutorial query immediately after the service call deterministic.

## 3. Register the providers

Subscriptions are discovered from Nest's provider container during application bootstrap. Decorating a class is not enough; it must also be instantiated as a provider.

```ts title="src/users/user.module.ts"
import { Module } from "@nestjs/common";

import { userRepositoryProvider } from "./user.repository";
import { UserProjection } from "./user.projection";
import { UserService } from "./user.service";
import { UserViewStore } from "./user-view.store";

@Module({
    exports: [UserService, UserViewStore],
    providers: [userRepositoryProvider, UserService, UserViewStore, UserProjection]
})
export class UserModule {}
```

No change is needed in `AppModule`; it already imports `UserModule` and the PostgreSQL adapter.

## Persistence comes first

Event Nest invokes subscriptions only after the event store transaction succeeds and the aggregate version has been updated. If this waiting projection rejects, `commit()` rejects with `SubscriptionException`, but the events are already stored and are **not** rolled back. Event Nest clears the aggregate's uncommitted events in that case so the same instance does not recommit them.

Do not blindly retry the original command after a subscription failure: that could make a new domain decision against already-changed state. Recover or replay the projection from persisted events instead. Also remember that this in-memory example disappears on restart and is not an automatic historical replay facility.

For the complete scheduling and failure rules, see [Domain Subscriptions](/core-model/domain-subscriptions/).
