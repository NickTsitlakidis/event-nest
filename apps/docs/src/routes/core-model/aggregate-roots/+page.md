---
title: Aggregate Roots
description: Model consistency boundaries that decide, record, load, and commit domain events.
---

An aggregate root is the consistency boundary for a set of domain rules. Callers ask it to perform behavior; the aggregate checks its current state, applies the accepted change, and records a domain event. Callers do not set its internal state directly.

Every Event Nest aggregate:

- extends `AggregateRoot` and passes its ID to `super(id)`;
- uses `@AggregateRootConfig({ name })` so stored events can be associated with its type;
- exposes command methods that enforce invariants;
- defines an `@ApplyEvent(EventClass)` method for every event in its stream;
- provides a factory that can reconstitute persisted state.

```ts
import { AggregateRoot, AggregateRootConfig, ApplyEvent, StoredEvent } from "@event-nest/core";

import { UserCreatedEvent, UserNameChangedEvent } from "./user.events";

@AggregateRootConfig({ name: "User" })
export class User extends AggregateRoot {
    private _email = "";
    private _name = "";

    private constructor(id: string) {
        super(id);
    }

    static create(id: string, name: string, email: string): User {
        const user = new User(id);
        const event = new UserCreatedEvent(name, email);
        user.applyUserCreated(event);
        user.append(event);
        return user;
    }

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

    changeName(name: string): void {
        if (name.trim().length === 0) {
            throw new Error("A user name is required");
        }

        const event = new UserNameChangedEvent(name);
        this.applyUserNameChanged(event);
        this.append(event);
    }

    @ApplyEvent(UserCreatedEvent)
    private applyUserCreated(event: UserCreatedEvent): void {
        this._name = event.name;
        this._email = event.email;
    }

    @ApplyEvent(UserNameChangedEvent)
    private applyUserNameChanged(event: UserNameChangedEvent): void {
        this._name = event.name;
    }
}
```

The name you pass to the decorator is persisted with the events and used when retrieving a stream. Keep it stable just like an event name.

Aggregate classes such as `User` are not Nest providers and should not inject infrastructure. The repository and application service form the boundary between Nest dependency injection and the domain object. See [Applying and Replaying Events](/core-model/applying-and-replaying-events/) for the state-transition rules.
