import { SnapshotStrategy, StoredSnapshot } from "@event-nest/core";
import { createMock } from "@golevelup/ts-jest";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { knex } from "knex";
import { randomUUID } from "node:crypto";

import { SchemaConfiguration } from "../schema-configuration";
import { AggregateRootRow } from "./aggregate-root-row";
import { PostgreSQLSnapshotStore } from "./postgresql-snapshot-store";
import { SnapshotRow } from "./snapshot-row";

let store: PostgreSQLSnapshotStore;
let container: StartedPostgreSqlContainer;
let connectionUri: string;
let knexConnection: knex.Knex;
const schema = "event_nest_tests";
const snapshotStrategy = createMock<SnapshotStrategy>();

describe("PostgreSQLSnapshotStore", () => {
    beforeAll(async () => {
        container = await new PostgreSqlContainer("postgres:16.2").withDatabase("event-nest-tests").start();
        connectionUri = container.getConnectionUri();
        knexConnection = knex({
            client: "pg",
            connection: connectionUri
        });

        await knexConnection.schema.createSchema(schema);
        await knexConnection.schema.withSchema(schema).createTable("es-aggregates", (table) => {
            table.uuid("id", { primaryKey: true });
            table.integer("version");
        });
        await knexConnection.schema.withSchema(schema).createTable("es-events", (table) => {
            table.uuid("id", { primaryKey: true });
            table
                .uuid("aggregate_root_id")
                .references("id")
                .inTable(schema + ".es-aggregates");
            table.integer("aggregate_root_version");
            table.text("aggregate_root_name");
            table.text("event_name");
            table.jsonb("payload");
            table.timestamp("created_at");
        });
        await knexConnection.schema.withSchema(schema).createTable("es-snapshots", (table) => {
            table.uuid("id").primary();
            table.uuid("aggregate_root_id").notNullable();
            table.integer("aggregate_root_version").notNullable();
            table.jsonb("payload").notNullable();
            table.integer("revision").notNullable();
            table
                .foreign("aggregate_root_id")
                .references("id")
                .inTable(schema + ".es-aggregates");
        });
    }, 30_000);

    beforeEach(async () => {
        store = new PostgreSQLSnapshotStore(
            snapshotStrategy,
            new SchemaConfiguration(schema, "es-aggregates", "es-events", "es-snapshots").schemaAwareSnapshotTable!,
            knexConnection
        );
    });

    afterAll(async () => {
        await knexConnection.destroy();
        await container.stop();
    });

    afterEach(async () => {
        await knexConnection(schema + ".es-snapshots").delete();
        await knexConnection(schema + ".es-events").delete();
        await knexConnection(schema + ".es-aggregates").delete();
        jest.clearAllMocks();
    });

    describe("findLatestSnapshotByAggregateId", () => {
        test("returns undefined when snapshot is not found", async () => {
            const aggregateRootId = randomUUID();

            await knexConnection<AggregateRootRow>(schema + ".es-aggregates").insert({
                id: aggregateRootId,
                version: 10
            });

            const snapshot = await store.findLatestSnapshotByAggregateId(aggregateRootId);
            expect(snapshot).toBeUndefined();
        });

        test("returns latest snapshot when multiple exist", async () => {
            const aggregateRootId = randomUUID();
            const oldSnapshotId = randomUUID();
            const latestSnapshotId = randomUUID();

            await knexConnection<AggregateRootRow>(schema + ".es-aggregates").insert({
                id: aggregateRootId,
                version: 20
            });

            await knexConnection<SnapshotRow>(schema + ".es-snapshots").insert({
                aggregate_root_id: aggregateRootId,
                aggregate_root_version: 5,
                id: oldSnapshotId,
                payload: JSON.stringify({ someData: "old" }),
                revision: 1
            });

            await knexConnection<SnapshotRow>(schema + ".es-snapshots").insert({
                aggregate_root_id: aggregateRootId,
                aggregate_root_version: 10,
                id: latestSnapshotId,
                payload: JSON.stringify({ someData: "latest" }),
                revision: 2
            });

            const snapshot = await store.findLatestSnapshotByAggregateId(aggregateRootId);

            expect(snapshot!.id).toBe(latestSnapshotId);
            expect(snapshot!.aggregateRootId).toBe(aggregateRootId);
            expect(snapshot!.aggregateRootVersion).toBe(10);
            expect(snapshot!.revision).toBe(2);
            expect(snapshot!.payload).toEqual({ someData: "latest" });
        });

        test("returns undefined when snapshots exist for other aggregate id", async () => {
            const aggregateRootId = randomUUID();
            const otherAggregateRootId = randomUUID();

            await knexConnection<AggregateRootRow>(schema + ".es-aggregates").insert([
                { id: aggregateRootId, version: 10 },
                { id: otherAggregateRootId, version: 10 }
            ]);

            await knexConnection<SnapshotRow>(schema + ".es-snapshots").insert({
                aggregate_root_id: otherAggregateRootId,
                aggregate_root_version: 10,
                id: randomUUID(),
                payload: JSON.stringify({ someData: "other" }),
                revision: 1
            });

            const snapshot = await store.findLatestSnapshotByAggregateId(aggregateRootId);
            expect(snapshot).toBeUndefined();
        });
    });

    describe("save", () => {
        test("saves snapshot row and returns snapshot", async () => {
            const aggregateRootId = randomUUID();
            const version = 10;
            const snapshotId = randomUUID();
            const revision = 3;
            await knexConnection<AggregateRootRow>(schema + ".es-aggregates").insert({
                id: aggregateRootId,
                version
            });
            const snapshot = StoredSnapshot.create(
                snapshotId,
                version,
                revision,
                { someData: "snapshot-data" },
                aggregateRootId
            );
            const saved = await store.save(snapshot);
            const rows = await knexConnection<SnapshotRow>(schema + ".es-snapshots").select("*");
            expect(rows.length).toBe(1);
            expect(rows[0].id).toBe(snapshotId);
            expect(rows[0].aggregate_root_id).toBe(aggregateRootId);
            expect(rows[0].aggregate_root_version).toBe(version);
            expect(rows[0].revision).toBe(revision);
            expect(rows[0].payload).toEqual({ someData: "snapshot-data" });
            expect(saved).toEqual(snapshot);
        });
    });

    test("generateEntityId", async () => {
        const id = await store.generateEntityId();
        expect(/^[a-z,0-9-]{36}$/.test(id)).toBe(true);
    });
});
