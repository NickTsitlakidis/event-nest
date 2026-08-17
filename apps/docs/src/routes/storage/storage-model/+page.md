---
title: Storage Model
description: Understand how Event Nest stores aggregate versions, immutable events, and optional snapshots across adapters.
---

<script lang="ts">
    import StorageRelationship from "$lib/diagrams/storage-relationship.svelte";
</script>

Every Event Nest adapter persists the same three logical record types. The physical names and database types are adapter configuration, but their roles do not change.

<StorageRelationship />

| Record | Required data | Purpose |
| --- | --- | --- |
| Aggregate | Aggregate id and current version | Tracks the head of an aggregate's event stream for optimistic concurrency checks. |
| Event | Event id, aggregate id, aggregate version, aggregate name, event name, payload, and creation time | Preserves the immutable history used to reconstitute an aggregate. |
| Snapshot | Snapshot id, aggregate id, aggregate version, payload, and snapshot revision | Optionally provides a recent state from which only later events need to be replayed. |

An aggregate record is created with version `0`. A successful commit assigns consecutive versions to the new events and advances the aggregate record to the resulting version. The adapter checks the persisted aggregate version against the caller's expected version inside the write transaction; a mismatch raises `EventConcurrencyException`.

Events retain both the aggregate id and aggregate name. The id identifies one stream, while the name identifies the aggregate class used when reading that stream. Event payloads and snapshot payloads are JSON values, represented as native JSON in PostgreSQL and MongoDB and as serialized JSON text in SQL Server.

## Commit boundary

The aggregate record, event rows or documents, and final aggregate version are written atomically by each adapter. MongoDB therefore requires a deployment that supports multi-document transactions: a replica set or sharded cluster, not a standalone server.

Snapshot creation is evaluated before the event write but, when selected, the snapshot is persisted after the event transaction has committed. It is not part of that transaction. A snapshot write failure can therefore reject the commit call after the aggregate and events are already durable. Domain subscriptions run after event persistence and after any selected snapshot write.

## Snapshots are a pair

Snapshots are disabled when neither snapshot option is supplied. Enabling them always requires both a `snapshotStrategy` and an adapter-specific storage location:

| Adapter | Required storage option |
| --- | --- |
| PostgreSQL | `snapshotTableName` |
| Microsoft SQL Server | `snapshotTableName` |
| MongoDB | `snapshotCollection` |

Supplying only one member of the pair fails provider creation. The adapter uses a no-op snapshot store when both are absent.

## Choose an adapter

- [PostgreSQL configuration and operations](/storage/postgresql/)
- [Microsoft SQL Server configuration and operations](/storage/microsoft-sql-server/)
- [MongoDB configuration and operations](/storage/mongodb/)
- [PostgreSQL generated schema](/storage/postgresql-schema/)
- [SQL Server generated schema](/storage/sql-server-schema/)

For destructive removal behavior, see [Purging aggregates](/capabilities/purging-aggregates/).
