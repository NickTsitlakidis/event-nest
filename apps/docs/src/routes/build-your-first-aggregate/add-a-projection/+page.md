---
title: Add a Projection
description: Project committed User events into an in-process read model with a domain subscription.
---

The aggregate from [Your First Aggregate](/build-your-first-aggregate/your-first-aggregate/) is optimized for decisions, not queries. A projection consumes committed events and maintains a read-oriented model. This example uses an in-memory store to keep the subscription mechanics visible. A real application should persist the projection in its query database instead.

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
    private readonly users = new Map<string, UserView>();

    applyCreated(user: UserView): void {
        this.users.set(user.id, { ...user });
    }

    applyNameChanged(id: string, name: string): void {
        const current = this.users.get(id);
        if (!current) {
            throw new Error(`Cannot project a name change for missing user ${id}`);
        }

        this.users.set(id, { ...current, name });
    }

    findById(id: string): UserView | undefined {
        const user = this.users.get(id);
        return user ? { ...user } : undefined;
    }
}
```

## 2. Subscribe to committed events

```ts title="src/users/user.projector.ts"
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
export class UserProjector implements OnDomainEvent<UserCreatedEvent | UserNameChangedEvent> {
    constructor(private readonly views: UserViewStore) {}

    onDomainEvent(event: PublishedDomainEvent<UserCreatedEvent | UserNameChangedEvent>): Promise<unknown> {
        if (event.payload instanceof UserCreatedEvent) {
            this.views.applyCreated({
                email: event.payload.email,
                id: event.aggregateRootId,
                name: event.payload.name
            });
        } else {
            this.views.applyNameChanged(event.aggregateRootId, event.payload.name);
        }

        return Promise.resolve();
    }
}
```

`PublishedDomainEvent` wraps the domain payload with `eventId`, `aggregateRootId`, `occurredAt`, and the committed aggregate `version`.

The projector is configured with `isAsync: false`, so `commit()` waits for the handler's promise to settle.

## 3. Register the providers

Subscriptions are discovered from Nest's provider container during application bootstrap. Decorating a class is not enough; it must also be instantiated as a provider.

```ts title="src/users/user.module.ts"
import { Module } from "@nestjs/common";

import { userRepositoryProvider } from "./user.repository";
import { UserProjector } from "./user.projector";
import { UserService } from "./user.service";
import { UserViewStore } from "./user-view.store";

@Module({
    exports: [UserService, UserViewStore],
    providers: [userRepositoryProvider, UserService, UserViewStore, UserProjector]
})
export class UserModule {}
```

No change is needed in `AppModule`; it already imports `UserModule` and the PostgreSQL adapter.

## Persistence comes first

Event Nest invokes subscriptions only after the event-store transaction succeeds and the aggregate version is updated. If this waiting projection rejects, `commit()` rejects with a `SubscriptionException`, but the events are already stored and are **not** rolled back. Event Nest clears the aggregate's uncommitted events in that case so the same instance does not recommit them.

Do not blindly retry the original command after a subscription failure: that could make a new domain decision against already-changed state. Recover or replay the projection from persisted events instead. Also remember that this in-memory example disappears on restart and is not an automatic historical replay facility.

For the complete scheduling and failure rules, see [Domain Subscriptions](/core-model/domain-subscriptions/).
