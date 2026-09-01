---
title: Purging Aggregates
description: Permanently delete an aggregate, its events, and its snapshots with each supported storage adapter.
---

<script lang="ts">
    import Callout from "$lib/components/callout.svelte";
</script>

<Callout variant="danger" title="Permanent deletion">
    <p><code>purgeAggregate</code> hard-deletes the event history. The aggregate cannot be reconstituted afterward. This is not an archive, soft delete, domain event, or reversible operation.</p>
</Callout>

All three storage adapters implement the same API:

```ts
interface EventStore {
    purgeAggregate(id: string): Promise<void>;
}
```

The method accepts only the aggregate ID. It does not accept an aggregate class or aggregate name, and event deletion matches the ID across the adapter's event storage.

```ts
import { EVENT_STORE, type EventStore } from "@event-nest/core";
import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class PrivacyService {
    constructor(@Inject(EVENT_STORE) private readonly eventStore: EventStore) {}

    async eraseAccount(accountId: string): Promise<void> {
        await this.eventStore.purgeAggregate(accountId);
    }
}
```

## Deleted State

Each adapter deletes, in order, the aggregate's:

1. Snapshots, when snapshot storage is enabled.
2. Events.
3. Aggregate version record.

Those deletions run in one adapter transaction. If a deletion fails, the transaction rejects instead of intentionally leaving a partially purged stream.

| Adapter | Transaction used | Deleted records |
| --- | --- | --- |
| MongoDB | MongoDB client session with `withTransaction` | Snapshot documents, event documents, aggregate document |
| PostgreSQL | Knex database transaction | Snapshot rows, event rows, aggregate row |
| Microsoft SQL Server | Knex database transaction | Snapshot rows, event rows, aggregate row |

MongoDB deployments must support transactions for this operation, as required by MongoDB client sessions. Snapshot-disabled configurations are supported: the no-op snapshot store participates without requiring snapshot storage.

## Idempotent Absence

Purging an unknown, adapter-valid ID succeeds and resolves to `undefined`. It does not affect unrelated aggregates. This makes repeated purge requests safe with respect to already-absent event-store data.

An invalid ID representation can still fail adapter validation. For example, the MongoDB adapter converts the supplied value to an `ObjectId`; it requires a 24-character hexadecimal `ObjectId` string and does not accept UUIDs.
