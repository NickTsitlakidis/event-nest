---
title: Installation
description: Install Event Nest and configure its PostgreSQL event store in a NestJS application.
---

<script lang="ts">
    import PackageInstall from "$lib/components/package-install.svelte";

    const tutorialPackages = ["@event-nest/core", "@event-nest/postgresql", "pg"];
</script>

This tutorial builds a small event-sourced `User` model backed by PostgreSQL. You need Node.js 22 or newer, a NestJS 10 or 11 application, and a PostgreSQL database that your application can reach.

## Install the packages

Install the core library, the PostgreSQL adapter, and the adapter's `pg` peer dependency:

<PackageInstall packages={tutorialPackages} />

Your application must also have these peer dependencies:

- `@nestjs/common`
- `@nestjs/core`
- `reflect-metadata`
- `rxjs`

A standard Nest application already includes them.

## Prepare PostgreSQL

The tutorial uses a schema named `event_nest`. Create the database and schema before starting the application. Event Nest can create its tables, but it does not create the schema itself.

```sql
CREATE DATABASE event_nest;
```

Connect to that database, then create the schema:

```sql
CREATE SCHEMA IF NOT EXISTS event_nest;
```

Set the connection string in your environment:

```bash
export DATABASE_URL="postgresql://postgres:password@localhost:5432/event_nest"
```

## Configure the adapter

Import `EventNestPostgreSQLModule` once in the application root:

```ts title="src/app.module.ts"
import { EventNestPostgreSQLModule } from "@event-nest/postgresql";
import { Module } from "@nestjs/common";

@Module({
    imports: [
        EventNestPostgreSQLModule.forRoot({
            aggregatesTableName: "aggregates",
            connectionUri: process.env.DATABASE_URL ?? "postgresql://postgres:password@localhost:5432/event_nest",
            ensureTablesExist: true,
            eventsTableName: "events",
            schemaName: "event_nest"
        })
    ]
})
export class AppModule {}
```

`forRoot()` registers a global module and exports the event store under the `EVENT_STORE` injection token. The important options are:

| Option | Purpose |
| --- | --- |
| `connectionUri` | PostgreSQL connection string. |
| `schemaName` | Existing schema that owns the Event Nest tables. |
| `aggregatesTableName` | Stores each aggregate ID and current version. |
| `eventsTableName` | Stores the ordered event history and payloads. |
| `ensureTablesExist` | Creates missing tables during application bootstrap when `true`. Defaults to `false`. |

Automatic initialization is convenient for this tutorial. For production, migrations are usually preferable because initialization errors are logged and the application must still be operated with a known schema.

Snapshots are intentionally disabled for this tutorial to keep things simple.

## Check the connection

Start the Nest application once. With `ensureTablesExist: true`, the `event_nest.aggregates` and `event_nest.events` tables should exist after bootstrap. No row is written until an aggregate commits an event.

Next, define the events, aggregate, repository provider, and application service in [Your First Aggregate](/build-your-first-aggregate/your-first-aggregate/).
