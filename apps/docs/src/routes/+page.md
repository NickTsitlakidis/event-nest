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
features:
  - title: Aggregate-first model
    description: Define named domain events, apply them to aggregate state, and replay persisted streams.
    icon:
      type: svg
      value: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--en-accent)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="2.2"/><circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="19" r="2.2"/><path d="M12 7.2v4.3M7.2 17.2 10.8 11M16.8 17.2 13.2 11"/></svg>'
  - title: Versioned commits
    description: Persist events with aggregate versions and reject conflicting writes through the storage adapter.
    icon:
      type: svg
      value: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--en-accent)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v6M12 15v6"/></svg>'
  - title: Optional snapshots
    description: Reduce replay work with snapshot-aware aggregates and composable snapshot strategies.
    icon:
      type: svg
      value: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--en-accent)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="7" width="16" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><circle cx="12" cy="13.5" r="3.2"/></svg>'
  - title: Persistence adapters
    description: MongoDB, PostgreSQL, and Microsoft SQL Server adapters expose the same EventStore contract.
    icon:
      type: svg
      value: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--en-accent)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="5.5" rx="7" ry="2.8"/><path d="M5 5.5v13c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8v-13"/><path d="M5 12c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8"/></svg>'
---

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
