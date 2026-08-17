---
title: Event Aliases
description: Rename persisted domain event types safely while retaining access to historical event streams.
---

An event's `@DomainEvent` name is persisted in every event record. Renaming only the class or replacing its registered name would leave historical records unresolved. Aliases let old persisted names resolve to the current event class without rewriting the event store.

```ts
import { DomainEvent } from "@event-nest/core";

@DomainEvent("user-renamed", {
    aliases: ["user-name-changed"]
})
export class UserRenamedEvent {
    constructor(public readonly name: string) {}
}
```

After this change:

- Stored events named `user-name-changed` resolve to `UserRenamedEvent` during replay.
- New `UserRenamedEvent` instances are persisted as `user-renamed`.
- An `@ApplyEvent(UserRenamedEvent)` method handles records stored under either name.
- Existing rows are not renamed or otherwise migrated.

## Multiple Renames

Keep every historical persisted name that may still exist:

```ts
@DomainEvent("user-renamed", {
    aliases: ["user-name-updated", "user-name-changed"]
})
export class UserRenamedEvent {
    // ...
}
```

Aliases are effectively part of the persisted-data contract. Remove an alias only after you know no retained event, backup, or imported stream uses that name. Systems that read event storage directly will continue to see a mixture of historical and canonical names.

## Global Uniqueness

Canonical names and aliases share one global namespace in the running application. Registration throws `EventNameConflictException` when:

- Two event classes use the same canonical name.
- A canonical name matches another event's alias.
- An alias matches another canonical name or alias.
- A registration repeats its own canonical name as an alias.
- A registration contains the same alias more than once.

Decorators register event classes when their modules are evaluated, so these conflicts normally surface during application startup.

## Payload Compatibility

An alias changes name-to-class resolution only. It does not transform historical payloads.

The current event class must remain compatible with data stored under every alias. Renaming a field, changing its type, adding a required invariant, or changing class-transformer behavior can still break replay even though the event name resolves correctly. Preserve a compatible event shape or migrate the stored payloads before depending on the new shape.

Aliases solve event type renames. They are not snapshot revisions, payload upcasters, or database migrations. For snapshot payload changes, use the revision mechanism described in [Snapshots](/capabilities/snapshots/).

## Safe Rename Checklist

1. Choose the new canonical name.
2. Add every retained old name to `aliases` in the same deployment.
3. Keep the event payload compatible with historical records.
4. Verify replay against a stream containing the old name.
5. Treat alias removal as a data migration and retention decision.
