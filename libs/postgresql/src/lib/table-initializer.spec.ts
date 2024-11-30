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
                new SchemaConfiguration(schema, "es_aggregates", "es_events"),
                false,
                knexConnection
            );

            await tableInitializer.onApplicationBootstrap();

            const [hasAggregatesTable, hasEventsTable] = await Promise.all([
                knexConnection.schema.hasTable("es_aggregates"),
                knexConnection.schema.hasTable("es_events")
            ]);

            expect(hasAggregatesTable).toBe(false);
            expect(hasEventsTable).toBe(false);
        });

        test("creates events table when it's missing", async () => {
            const tableInitializer = new TableInitializer(
                new SchemaConfiguration(schema, "es_aggregates", "es_events"),
                true,
                knexConnection
            );

            await tableInitializer.onApplicationBootstrap();

            const [hasAggregatesTable, hasEventsTable] = await Promise.all([
                knexConnection.schema.hasTable("es_aggregates"),
                knexConnection.schema.hasTable("es_events")
            ]);

            expect(hasAggregatesTable).toBe(true);
            expect(hasEventsTable).toBe(true);

            const columnChecks = await Promise.all([
                knexConnection.schema.hasColumn("es_events", "id"),
                knexConnection.schema.hasColumn("es_events", "aggregate_root_id"),
                knexConnection.schema.hasColumn("es_events", "aggregate_root_version"),
                knexConnection.schema.hasColumn("es_events", "aggregate_root_name"),
                knexConnection.schema.hasColumn("es_events", "event_name"),
                knexConnection.schema.hasColumn("es_events", "payload"),
                knexConnection.schema.hasColumn("es_events", "created_at")
            ]);

            expect(columnChecks.every(Boolean)).toBe(true);

            await knexConnection.schema.dropTable("es_events");
            await knexConnection.schema.dropTable("es_aggregates");
        });

        test("creates aggregates table when it's missing", async () => {
            const tableInitializer = new TableInitializer(
                new SchemaConfiguration(schema, "es_aggregates", "es_events"),
                true,
                knexConnection
            );

            await tableInitializer.onApplicationBootstrap();

            const [hasAggregatesTable, hasEventsTable] = await Promise.all([
                knexConnection.schema.hasTable("es_aggregates"),
                knexConnection.schema.hasTable("es_events")
            ]);

            expect(hasAggregatesTable).toBe(true);
            expect(hasEventsTable).toBe(true);

            const columnChecks = await Promise.all([
                knexConnection.schema.hasColumn("es_aggregates", "id"),
                knexConnection.schema.hasColumn("es_aggregates", "version")
            ]);

            expect(columnChecks.every(Boolean)).toBe(true);

            await knexConnection.schema.dropTable("es_events");
            await knexConnection.schema.dropTable("es_aggregates");
        });

        test("does not recreate tables when they already exist", async () => {
            const tableInitializer = new TableInitializer(
                new SchemaConfiguration(schema, "es_aggregates", "es_events"),
                true,
                knexConnection
            );

            await tableInitializer.onApplicationBootstrap();
            await tableInitializer.onApplicationBootstrap();

            const [hasAggregatesTable, hasEventsTable] = await Promise.all([
                knexConnection.schema.hasTable("es_aggregates"),
                knexConnection.schema.hasTable("es_events")
            ]);

            expect(hasAggregatesTable).toBe(true);
            expect(hasEventsTable).toBe(true);

            await knexConnection.schema.dropTable("es_events");
            await knexConnection.schema.dropTable("es_aggregates");
        });
    });
});
