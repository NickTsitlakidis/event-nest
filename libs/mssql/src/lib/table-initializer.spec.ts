import { MSSQLServerContainer, StartedMSSQLServerContainer } from "@testcontainers/mssqlserver";
import { knex, Knex } from "knex";

import { SchemaConfiguration } from "./schema-configuration";
import { TableInitializer } from "./table-initializer";

describe("TableInitializer", () => {
    let container: StartedMSSQLServerContainer;
    let knexConnection: Knex;
    const schema = "dbo";

    beforeAll(async () => {
        container = await new MSSQLServerContainer("mcr.microsoft.com/mssql/server:2019-latest")
            .acceptLicense()
            .withPassword("EventNest!Password123")
            .start();
        knexConnection = knex({
            client: "mssql",
            connection: {
                database: container.getDatabase(),
                options: {
                    encrypt: true,
                    trustServerCertificate: true
                },
                password: container.getPassword(),
                port: container.getPort(),
                server: container.getHost(),
                user: container.getUsername()
            }
        });
    }, 180_000);

    afterEach(async () => {
        await knexConnection.schema.withSchema(schema).dropTableIfExists("es_snapshots");
        await knexConnection.schema.withSchema(schema).dropTableIfExists("es_events");
        await knexConnection.schema.withSchema(schema).dropTableIfExists("es_aggregates");
    });

    afterAll(async () => {
        await knexConnection.destroy();
        await container.stop();
    });

    describe("onApplicationBootstrap", () => {
        test("skips table initialization when ensureTablesExist is false", async () => {
            const tableInitializer = new TableInitializer(
                new SchemaConfiguration(schema, "es_aggregates", "es_events", "es_snapshots"),
                false,
                knexConnection
            );

            await tableInitializer.onApplicationBootstrap();

            const [hasAggregatesTable, hasEventsTable, hasSnapshotsTable] = await Promise.all([
                knexConnection.schema.withSchema(schema).hasTable("es_aggregates"),
                knexConnection.schema.withSchema(schema).hasTable("es_events"),
                knexConnection.schema.withSchema(schema).hasTable("es_snapshots")
            ]);

            expect(hasAggregatesTable).toBe(false);
            expect(hasEventsTable).toBe(false);
            expect(hasSnapshotsTable).toBe(false);
        });

        test("creates events table when it's missing", async () => {
            const tableInitializer = new TableInitializer(
                new SchemaConfiguration(schema, "es_aggregates", "es_events", "es_snapshots"),
                true,
                knexConnection
            );

            await tableInitializer.onApplicationBootstrap();

            const [hasAggregatesTable, hasEventsTable, hasSnapshotsTable] = await Promise.all([
                knexConnection.schema.withSchema(schema).hasTable("es_aggregates"),
                knexConnection.schema.withSchema(schema).hasTable("es_events"),
                knexConnection.schema.withSchema(schema).hasTable("es_snapshots")
            ]);

            expect(hasAggregatesTable).toBe(true);
            expect(hasEventsTable).toBe(true);
            expect(hasSnapshotsTable).toBe(true);

            const columnChecks = await Promise.all([
                knexConnection.schema.withSchema(schema).hasColumn("es_events", "id"),
                knexConnection.schema.withSchema(schema).hasColumn("es_events", "aggregate_root_id"),
                knexConnection.schema.withSchema(schema).hasColumn("es_events", "aggregate_root_version"),
                knexConnection.schema.withSchema(schema).hasColumn("es_events", "aggregate_root_name"),
                knexConnection.schema.withSchema(schema).hasColumn("es_events", "event_name"),
                knexConnection.schema.withSchema(schema).hasColumn("es_events", "payload"),
                knexConnection.schema.withSchema(schema).hasColumn("es_events", "created_at")
            ]);

            expect(columnChecks.every(Boolean)).toBe(true);
        });

        test("creates aggregates table when it's missing", async () => {
            const tableInitializer = new TableInitializer(
                new SchemaConfiguration(schema, "es_aggregates", "es_events", "es_snapshots"),
                true,
                knexConnection
            );

            await tableInitializer.onApplicationBootstrap();

            const [hasAggregatesTable, hasEventsTable, hasSnapshotsTable] = await Promise.all([
                knexConnection.schema.withSchema(schema).hasTable("es_aggregates"),
                knexConnection.schema.withSchema(schema).hasTable("es_events"),
                knexConnection.schema.withSchema(schema).hasTable("es_snapshots")
            ]);

            expect(hasAggregatesTable).toBe(true);
            expect(hasEventsTable).toBe(true);
            expect(hasSnapshotsTable).toBe(true);

            const columnChecks = await Promise.all([
                knexConnection.schema.withSchema(schema).hasColumn("es_aggregates", "id"),
                knexConnection.schema.withSchema(schema).hasColumn("es_aggregates", "version")
            ]);

            expect(columnChecks.every(Boolean)).toBe(true);
        });

        test("creates snapshots table when it's missing", async () => {
            const tableInitializer = new TableInitializer(
                new SchemaConfiguration(schema, "es_aggregates", "es_events", "es_snapshots"),
                true,
                knexConnection
            );

            await tableInitializer.onApplicationBootstrap();

            const [hasAggregatesTable, hasEventsTable, hasSnapshotsTable] = await Promise.all([
                knexConnection.schema.withSchema(schema).hasTable("es_aggregates"),
                knexConnection.schema.withSchema(schema).hasTable("es_events"),
                knexConnection.schema.withSchema(schema).hasTable("es_snapshots")
            ]);

            expect(hasAggregatesTable).toBe(true);
            expect(hasEventsTable).toBe(true);
            expect(hasSnapshotsTable).toBe(true);

            const columnChecks = await Promise.all([
                knexConnection.schema.withSchema(schema).hasColumn("es_snapshots", "aggregate_root_id"),
                knexConnection.schema.withSchema(schema).hasColumn("es_snapshots", "aggregate_root_version"),
                knexConnection.schema.withSchema(schema).hasColumn("es_snapshots", "id"),
                knexConnection.schema.withSchema(schema).hasColumn("es_snapshots", "payload"),
                knexConnection.schema.withSchema(schema).hasColumn("es_snapshots", "revision")
            ]);

            expect(columnChecks.every(Boolean)).toBe(true);
        });

        test("should allow for optional snapshots table creation", async () => {
            const tableInitializer = new TableInitializer(
                new SchemaConfiguration(schema, "es_aggregates", "es_events"),
                true,
                knexConnection
            );

            await tableInitializer.onApplicationBootstrap();

            const [hasAggregatesTable, hasEventsTable, hasSnapshotsTable] = await Promise.all([
                knexConnection.schema.withSchema(schema).hasTable("es_aggregates"),
                knexConnection.schema.withSchema(schema).hasTable("es_events"),
                knexConnection.schema.withSchema(schema).hasTable("es_snapshots")
            ]);

            expect(hasAggregatesTable).toBe(true);
            expect(hasEventsTable).toBe(true);
            expect(hasSnapshotsTable).toBe(false);
        });

        test("does not recreate tables when they already exist", async () => {
            const tableInitializer = new TableInitializer(
                new SchemaConfiguration(schema, "es_aggregates", "es_events", "es_snapshots"),
                true,
                knexConnection
            );

            await tableInitializer.onApplicationBootstrap();
            await tableInitializer.onApplicationBootstrap();

            const [hasAggregatesTable, hasEventsTable, hasSnapshotsTable] = await Promise.all([
                knexConnection.schema.withSchema(schema).hasTable("es_aggregates"),
                knexConnection.schema.withSchema(schema).hasTable("es_events"),
                knexConnection.schema.withSchema(schema).hasTable("es_snapshots")
            ]);

            expect(hasAggregatesTable).toBe(true);
            expect(hasEventsTable).toBe(true);
            expect(hasSnapshotsTable).toBe(true);
        });

        test("fails when the configured schema is missing", async () => {
            const tableInitializer = new TableInitializer(
                new SchemaConfiguration("missing_schema", "missing_aggregates", "missing_events"),
                true,
                knexConnection
            );

            await expect(tableInitializer.onApplicationBootstrap()).rejects.toThrow();
        });
    });
});
