---
title: PostgreSQL Schema
description: Create the exact PostgreSQL tables, columns, keys, and relationships produced by the Event Nest initializer.
---

This DDL matches the tables produced by the PostgreSQL `TableInitializer` for the example configuration below:

```ts
{
    aggregatesTableName: "aggregates",
    eventsTableName: "events",
    schemaName: "event_nest",
    snapshotTableName: "snapshots"
}
```

The initializer does not create the schema. Create `event_nest` separately before running this DDL or enabling `ensureTablesExist`. Replace the quoted schema and table names consistently if your configuration uses different names.

## Aggregates table

```sql
CREATE TABLE "event_nest"."aggregates" (
    "id" uuid,
    "version" integer NOT NULL,
    CONSTRAINT "aggregates_pkey" PRIMARY KEY ("id")
);
```

The primary key makes `id` non-null and provides the table's only initializer-created index.

## Events table

```sql
CREATE TABLE "event_nest"."events" (
    "id" uuid,
    "aggregate_root_id" uuid NOT NULL,
    "aggregate_root_version" integer NOT NULL,
    "aggregate_root_name" text NOT NULL,
    "event_name" text NOT NULL,
    "payload" jsonb NOT NULL,
    "created_at" timestamptz NOT NULL,
    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "event_nest"."events"
    ADD CONSTRAINT "events_aggregate_root_id_foreign"
    FOREIGN KEY ("aggregate_root_id")
    REFERENCES "event_nest"."aggregates" ("id");
```

The initializer does **not** create a unique constraint on `(aggregate_root_id, aggregate_root_version)` and does not create a secondary index for event-stream reads. It also does not add cascading foreign-key actions. The only event-table index created by this DDL is the primary-key index on `id`.

## Snapshots table

Create this table only when both `snapshotTableName` and `snapshotStrategy` are configured.

```sql
CREATE TABLE "event_nest"."snapshots" (
    "id" uuid,
    "aggregate_root_id" uuid NOT NULL,
    "aggregate_root_version" integer NOT NULL,
    "payload" jsonb NOT NULL,
    "revision" integer NOT NULL,
    CONSTRAINT "snapshots_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "event_nest"."snapshots"
    ADD CONSTRAINT "snapshots_aggregate_root_id_foreign"
    FOREIGN KEY ("aggregate_root_id")
    REFERENCES "event_nest"."aggregates" ("id");
```

The initializer creates no secondary snapshot index and no uniqueness constraint on aggregate id, version, or revision. Latest-snapshot reads filter by `aggregate_root_id` and order by `aggregate_root_version` descending, but matching the initializer means leaving those additional indexes and constraints absent.

The initializer first checks whether each table exists, so its normal bootstrap path does not use `IF NOT EXISTS`. It creates aggregates before events and snapshots so both foreign keys can reference the aggregate table.

Return to [PostgreSQL configuration](/storage/postgresql/) or review the shared [Storage model](/storage/storage-model/).
