---
title: SQL Server Schema
description: Create the exact Microsoft SQL Server tables, keys, and indexes produced by the Event Nest initializer.
---

This DDL matches the Knex statements produced by the SQL Server `TableInitializer` for this example configuration:

```ts
{
    aggregatesTableName: "aggregates",
    eventsTableName: "events",
    schemaName: "event_nest",
    snapshotTableName: "snapshots"
}
```

The initializer does not create `event_nest`. Create the schema separately before using this DDL or setting `ensureTablesExist: true`. Configured identifiers must be non-empty, contain no dots, and be at most 128 characters.

## Aggregates table

```sql
CREATE TABLE [event_nest].[aggregates] (
    [id] uniqueidentifier,
    [version] int NOT NULL,
    CONSTRAINT [aggregates_pkey] PRIMARY KEY ([id])
);
```

The primary key makes `id` non-null and creates the aggregate table's only initializer-defined index.

## Events table

```sql
CREATE TABLE [event_nest].[events] (
    [id] uniqueidentifier,
    [aggregate_root_id] uniqueidentifier NOT NULL,
    [aggregate_root_version] int NOT NULL,
    [aggregate_root_name] nvarchar(max) NOT NULL,
    [event_name] nvarchar(max) NOT NULL,
    [payload] nvarchar(max) NOT NULL,
    [created_at] datetime2(3) NOT NULL,
    CONSTRAINT [events_pkey] PRIMARY KEY ([id]),
    CONSTRAINT [events_aggregate_root_id_foreign]
        FOREIGN KEY ([aggregate_root_id])
        REFERENCES [event_nest].[aggregates] ([id])
);

CREATE UNIQUE INDEX [events_aggregate_root_id_aggregate_root_version_unique]
    ON [event_nest].[events] ([aggregate_root_id], [aggregate_root_version])
    WHERE [aggregate_root_id] IS NOT NULL
      AND [aggregate_root_version] IS NOT NULL;
```

Knex emits the unique declaration as the filtered unique index shown above, even though both indexed columns are non-null. It enforces one event row per aggregate version and provides the initializer's only secondary event index. There is no separate index including `aggregate_root_name`, no JSON check constraint on `payload`, and no cascading foreign-key action.

## Snapshots table

Create this table and index only when both `snapshotTableName` and `snapshotStrategy` are configured.

```sql
CREATE TABLE [event_nest].[snapshots] (
    [id] uniqueidentifier,
    [aggregate_root_id] uniqueidentifier NOT NULL,
    [aggregate_root_version] int NOT NULL,
    [payload] nvarchar(max) NOT NULL,
    [revision] int NOT NULL,
    CONSTRAINT [snapshots_pkey] PRIMARY KEY ([id]),
    CONSTRAINT [snapshots_aggregate_root_id_foreign]
        FOREIGN KEY ([aggregate_root_id])
        REFERENCES [event_nest].[aggregates] ([id])
);

CREATE INDEX [snapshots_aggregate_root_id_aggregate_root_version_index]
    ON [event_nest].[snapshots] ([aggregate_root_id], [aggregate_root_version]);
```

The snapshot index supports filtering by aggregate id and ordering by version. It is not unique: the initializer adds no uniqueness constraint for snapshot aggregate id, version, or revision. It also adds no JSON check constraint or cascading foreign-key action.

The initializer checks table existence before issuing DDL, so its bootstrap path does not use `IF NOT EXISTS`. It creates aggregates, events, and then snapshots. Any initialization error is rethrown and fails application bootstrap.

Return to [Microsoft SQL Server configuration](/storage/microsoft-sql-server/) or review the shared [Storage model](/storage/storage-model/).
