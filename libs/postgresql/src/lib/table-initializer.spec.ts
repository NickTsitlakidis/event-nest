import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { knex } from "knex";

import { SchemaConfiguration } from "./schema-configuration";
import { TableInitializer } from "./table-initializer";

let container: StartedPostgreSqlContainer;
let connectionUri: string;
let knexConnection: knex.Knex;
const schema = "event_nest_tests";

describe("TableInitializer", () => {
    beforeAll(async () => {
        container = await new PostgreSqlContainer("postgres:16.2")
            .withDatabase("event-nest-table-initializer-tests")
            .start();
        connectionUri = container.getConnectionUri();
        knexConnection = knex({
            client: "pg",
            connection: connectionUri
        });
        await knexConnection.schema.createSchema(schema);
    }, 30_000);

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
                knexConnection.schema.withSchema("event_nest_tests").hasTable("es_aggregates"),
                knexConnection.schema.withSchema("event_nest_tests").hasTable("es_events"),
                knexConnection.schema.withSchema("event_nest_tests").hasTable("es_snapshots")
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
                knexConnection.schema.withSchema("event_nest_tests").hasTable("es_aggregates"),
                knexConnection.schema.withSchema("event_nest_tests").hasTable("es_events"),
                knexConnection.schema.withSchema("event_nest_tests").hasTable("es_snapshots")
            ]);

            expect(hasAggregatesTable).toBe(true);
            expect(hasEventsTable).toBe(true);
            expect(hasSnapshotsTable).toBe(true);

            const columnChecks = await Promise.all([
                knexConnection.schema.withSchema("event_nest_tests").hasColumn("es_events", "id"),
                knexConnection.schema.withSchema("event_nest_tests").hasColumn("es_events", "aggregate_root_id"),
                knexConnection.schema.withSchema("event_nest_tests").hasColumn("es_events", "aggregate_root_version"),
                knexConnection.schema.withSchema("event_nest_tests").hasColumn("es_events", "aggregate_root_name"),
                knexConnection.schema.withSchema("event_nest_tests").hasColumn("es_events", "event_name"),
                knexConnection.schema.withSchema("event_nest_tests").hasColumn("es_events", "payload"),
                knexConnection.schema.withSchema("event_nest_tests").hasColumn("es_events", "created_at")
            ]);

            expect(columnChecks.every(Boolean)).toBe(true);

            await knexConnection.schema.withSchema("event_nest_tests").dropTable("es_snapshots");
            await knexConnection.schema.withSchema("event_nest_tests").dropTable("es_events");
            await knexConnection.schema.withSchema("event_nest_tests").dropTable("es_aggregates");
        });

        test("creates aggregates table when it's missing", async () => {
            const tableInitializer = new TableInitializer(
                new SchemaConfiguration(schema, "es_aggregates", "es_events", "es_snapshots"),
                true,
                knexConnection
            );

            await tableInitializer.onApplicationBootstrap();

            const [hasAggregatesTable, hasEventsTable, hasSnapshotsTable] = await Promise.all([
                knexConnection.schema.withSchema("event_nest_tests").hasTable("es_aggregates"),
                knexConnection.schema.withSchema("event_nest_tests").hasTable("es_events"),
                knexConnection.schema.withSchema("event_nest_tests").hasTable("es_snapshots")
            ]);

            expect(hasAggregatesTable).toBe(true);
            expect(hasEventsTable).toBe(true);
            expect(hasSnapshotsTable).toBe(true);

            const columnChecks = await Promise.all([
                knexConnection.schema.withSchema("event_nest_tests").hasColumn("es_aggregates", "id"),
                knexConnection.schema.withSchema("event_nest_tests").hasColumn("es_aggregates", "version")
            ]);

            expect(columnChecks.every(Boolean)).toBe(true);

            await knexConnection.schema.withSchema("event_nest_tests").dropTable("es_snapshots");
            await knexConnection.schema.withSchema("event_nest_tests").dropTable("es_events");
            await knexConnection.schema.withSchema("event_nest_tests").dropTable("es_aggregates");
        });

        test("creates snapshots table when it's missing", async () => {
            const tableInitializer = new TableInitializer(
                new SchemaConfiguration(schema, "es_aggregates", "es_events", "es_snapshots"),
                true,
                knexConnection
            );

            await tableInitializer.onApplicationBootstrap();

            const [hasAggregatesTable, hasEventsTable, hasSnapshotsTable] = await Promise.all([
                knexConnection.schema.withSchema("event_nest_tests").hasTable("es_aggregates"),
                knexConnection.schema.withSchema("event_nest_tests").hasTable("es_events"),
                knexConnection.schema.withSchema("event_nest_tests").hasTable("es_snapshots")
            ]);

            expect(hasAggregatesTable).toBe(true);
            expect(hasEventsTable).toBe(true);
            expect(hasSnapshotsTable).toBe(true);

            const columnChecks = await Promise.all([
                knexConnection.schema.withSchema("event_nest_tests").hasColumn("es_snapshots", "aggregate_root_id"),
                knexConnection.schema
                    .withSchema("event_nest_tests")
                    .hasColumn("es_snapshots", "aggregate_root_version"),
                knexConnection.schema.withSchema("event_nest_tests").hasColumn("es_snapshots", "id"),
                knexConnection.schema.withSchema("event_nest_tests").hasColumn("es_snapshots", "payload"),
                knexConnection.schema.withSchema("event_nest_tests").hasColumn("es_snapshots", "revision")
            ]);

            expect(columnChecks.every(Boolean)).toBe(true);

            await knexConnection.schema.withSchema("event_nest_tests").dropTable("es_snapshots");
            await knexConnection.schema.withSchema("event_nest_tests").dropTable("es_events");
            await knexConnection.schema.withSchema("event_nest_tests").dropTable("es_aggregates");
        });

        test("should allow for optional snapshots table creation", async () => {
            const tableInitializer = new TableInitializer(
                new SchemaConfiguration(schema, "es_aggregates", "es_events"),
                true,
                knexConnection
            );

            await tableInitializer.onApplicationBootstrap();

            const [hasAggregatesTable, hasEventsTable, hasSnapshotsTable] = await Promise.all([
                knexConnection.schema.withSchema("event_nest_tests").hasTable("es_aggregates"),
                knexConnection.schema.withSchema("event_nest_tests").hasTable("es_events"),
                knexConnection.schema.withSchema("event_nest_tests").hasTable("es_snapshots")
            ]);

            expect(hasAggregatesTable).toBe(true);
            expect(hasEventsTable).toBe(true);
            expect(hasSnapshotsTable).toBe(false);

            await knexConnection.schema.withSchema("event_nest_tests").dropTable("es_events");
            await knexConnection.schema.withSchema("event_nest_tests").dropTable("es_aggregates");
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
                knexConnection.schema.withSchema("event_nest_tests").hasTable("es_aggregates"),
                knexConnection.schema.withSchema("event_nest_tests").hasTable("es_events"),
                knexConnection.schema.withSchema("event_nest_tests").hasTable("es_snapshots")
            ]);

            expect(hasAggregatesTable).toBe(true);
            expect(hasEventsTable).toBe(true);
            expect(hasSnapshotsTable).toBe(true);

            await knexConnection.schema.withSchema("event_nest_tests").dropTable("es_snapshots");
            await knexConnection.schema.withSchema("event_nest_tests").dropTable("es_events");
            await knexConnection.schema.withSchema("event_nest_tests").dropTable("es_aggregates");
        });
    });
});
