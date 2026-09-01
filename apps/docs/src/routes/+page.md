---
title: Event Nest
description: Event sourcing primitives and persistence adapters for building aggregate-based NestJS applications.
heroImage: /hero.svg
actions:
  - label: Build your first aggregate
    type: primary
    to: /build-your-first-aggregate/installation/
  - label: GitHub
    type: flat
    to: https://github.com/NickTsitlakidis/event-nest
    external: true
---

<script lang="ts">
    import HomeFeatures from "$lib/components/home-features.svelte";
</script>

<HomeFeatures />

Domain methods record events; Event Nest persists them and rebuilds aggregate state by replay:

```ts
import { AggregateRoot, AggregateRootConfig, ApplyEvent, DomainEvent } from "@event-nest/core";

@DomainEvent("user-created")
class UserCreatedEvent {
    constructor(public readonly name: string) {}
}

@AggregateRootConfig({ name: "User" })
class User extends AggregateRoot {
    private name = "";

    private constructor(id: string) {
        super(id);
    }

    static create(id: string, name: string): User {
        const user = new User(id);
        const event = new UserCreatedEvent(name);
        user.applyUserCreated(event);
        user.append(event);
        return user;
    }

    @ApplyEvent(UserCreatedEvent)
    private applyUserCreated(event: UserCreatedEvent): void {
        this.name = event.name;
    }
}
```

[Build your first aggregate](/build-your-first-aggregate/installation/) continues from installation through persistence and a projection.

Event Nest is a focused set of libraries — not an application framework, ORM, or distributed event bus. Review [Scope and Limitations](/overview/scope-and-limitations/) before adopting it.
