---
title: Your First Aggregate
description: Build and persist an event-sourced User aggregate with AggregateRepository.
---

<script lang="ts">
    import LoadCommitLifecycle from "$lib/diagrams/load-commit-lifecycle.svelte";
</script>

This page completes a standalone `UserModule` on top of the PostgreSQL setup described in [Installation](/build-your-first-aggregate/installation/). The module defines immutable events, the aggregate, an `AggregateRepository` provider, and a service that creates and changes users.

## 1. Define the events

Domain events describe facts in the past tense. Keep their payloads immutable because they become permanent history.

```ts title="src/users/user.events.ts"
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

The decorator names, not the TypeScript class names, are persisted. Treat `user-created` and `user-name-changed` as durable schema identifiers.

## 2. Implement the aggregate

The aggregate owns the write-side rules and state transitions. A command method applies its new event to current state and then appends it for a future commit. Reconstitution calls the same decorated apply methods for stored events.

```ts title="src/users/user.ts"
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
        if (name.trim().length === 0) {
            throw new Error("A user name is required");
        }

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

    get email(): string {
        return this._email;
    }

    get name(): string {
        return this._name;
    }

    changeName(name: string): void {
        if (name.trim().length === 0) {
            throw new Error("A user name is required");
        }
        if (name === this._name) {
            return;
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

The factory deliberately forwards `id`, `events`, `snapshot`, and `aggregateRootVersion` to `reconstitute()`. This is the factory contract required by the `AggregateRepository` in the next step.

> `append()` does not apply or save an event. Only `commit()` persists uncommitted events.

## 3. Provide the repository

`AggregateRepository` is a plain helper rather than an automatically injectable class. Expose one repository instance through a Nest provider:

```ts title="src/users/user.repository.ts"
import { AggregateRepository, EVENT_STORE, type EventStore } from "@event-nest/core";
import { type Provider } from "@nestjs/common";

import { User } from "./user";

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

export const userRepositoryProvider: Provider = {
    inject: [EVENT_STORE],
    provide: USER_REPOSITORY,
    useFactory: (eventStore: EventStore): AggregateRepository<User> => {
        return new AggregateRepository(eventStore, User, User.fromEvents);
    }
};
```

The repository is the recommended path for the usual load, mutate, and save workflow. It loads the correct stream, calls `User.fromEvents`, connects loaded aggregates to the event store, and commits aggregates passed to `save()`.

## 4. Add the application service

This guide uses PostgreSQL, so the application can create aggregate IDs with Node's `randomUUID()`. UUIDs also fit the built-in SQL Server schema, but they do **not** work with the MongoDB adapter, which expects aggregate IDs to be 24-character hexadecimal `ObjectId` strings.

Aggregate ID generation belongs to the application. Event Nest uses `EventStore.generateEntityId()` internally in its persistence pipeline; it is not the recommended application-facing ID API.

```ts title="src/users/user.service.ts"
import { AggregateRepository } from "@event-nest/core";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { User } from "./user";
import { USER_REPOSITORY } from "./user.repository";

@Injectable()
export class UserService {
    constructor(
        @Inject(USER_REPOSITORY) private readonly _userRepository: AggregateRepository<User>
    ) {}

    async createUser(name: string, email: string): Promise<string> {
        const id = randomUUID();
        const user = User.create(id, name, email);
        await this._userRepository.save(user);
        return user.id;
    }

    async changeUserName(id: string, name: string): Promise<void> {
        const user = await this._userRepository.load(id);
        if (!user) {
            throw new NotFoundException(`User ${id} was not found`);
        }

        user.changeName(name);
        await this._userRepository.save(user);
    }

    async getUser(id: string): Promise<{ email: string; id: string; name: string }> {
        const user = await this._userRepository.load(id);
        if (!user) {
            throw new NotFoundException(`User ${id} was not found`);
        }

        return { email: user.email, id: user.id, name: user.name };
    }
}
```

For lower-level control, use the event store directly and manage the model lifecycle explicitly.

```ts title="src/users/user.service.ts"
import { EVENT_STORE, type EventStore } from "@event-nest/core";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { User } from "./user";

@Injectable()
export class UserService {
    constructor(@Inject(EVENT_STORE) private readonly _eventStore: EventStore) {}

    async createUser(name: string, email: string): Promise<string> {
        const id = randomUUID();
        const user = User.create(id, name, email);
        const userWithPublisher = this._eventStore.addPublisher(user);
        await userWithPublisher.commit();
        return user.id;
    }

    async changeUserName(id: string, name: string): Promise<void> {
        const events = await this._eventStore.findByAggregateRootId(User, id);
        if (events.length === 0) {
            throw new NotFoundException(`User ${id} was not found`);
        }

        const user = this._eventStore.addPublisher(User.fromEvents(id, events));
        user.changeName(name);
        await user.commit();
    }

    async getUser(id: string): Promise<{ email: string; id: string; name: string }> {
        const events = await this._eventStore.findByAggregateRootId(User, id);
        if (events.length === 0) {
            throw new NotFoundException(`User ${id} was not found`);
        }

        const user = User.fromEvents(id, events);
        return { email: user.email, id: user.id, name: user.name };
    }
}
```

## 5. Assemble the module

Register both the factory provider and the service:

```ts title="src/users/user.module.ts"
import { Module } from "@nestjs/common";

import { userRepositoryProvider } from "./user.repository";
import { UserService } from "./user.service";

@Module({
    exports: [UserService],
    providers: [userRepositoryProvider, UserService]
})
export class UserModule {}
```

Then import it beside the globally configured PostgreSQL adapter:

```ts title="src/app.module.ts"
import { EventNestPostgreSQLModule } from "@event-nest/postgresql";
import { Module } from "@nestjs/common";

import { UserModule } from "./users/user.module";

@Module({
    imports: [
        EventNestPostgreSQLModule.forRoot({
            aggregatesTableName: "aggregates",
            connectionUri: process.env.DATABASE_URL ?? "postgresql://postgres:password@localhost:5432/event_nest",
            ensureTablesExist: true,
            eventsTableName: "events",
            schemaName: "event_nest"
        }),
        UserModule
    ]
})
export class AppModule {}
```

<LoadCommitLifecycle />

Creating a user commits stream version 1. Loading that user replays `UserCreatedEvent`; changing the name appends and commits `UserNameChangedEvent` as version 2. The event rows are the source of truth, while the aggregate's fields are reconstructed state.

The next step is to build a query-side view in [Add a Projection](/build-your-first-aggregate/add-a-projection/).
