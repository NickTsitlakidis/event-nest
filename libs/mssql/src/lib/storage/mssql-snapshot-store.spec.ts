import { SnapshotStrategy, StoredSnapshot } from "@event-nest/core";
import { createMock } from "@golevelup/ts-jest";
import { MSSQLServerContainer, StartedMSSQLServerContainer } from "@testcontainers/mssqlserver";
import { knex, Knex } from "knex";
import { randomUUID } from "node:crypto";

import { AggregateRootRow } from "./aggregate-root-row";
import { MSSQLSnapshotStore } from "./mssql-snapshot-store";
import { SnapshotRow } from "./snapshot-row";

const AGGREGATES_TABLE = "event_nest_snapshot_test_aggregates";
const SNAPSHOTS_TABLE = "event_nest_snapshot_test_snapshots";
const SCHEMA = "dbo";

describe("MSSQLSnapshotStore", () => {
    let container: StartedMSSQLServerContainer;
    let knexConnection: Knex;
    let store: MSSQLSnapshotStore;
    const snapshotStrategy = createMock<SnapshotStrategy>();

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
                    lowerCaseGuids: true,
                    trustServerCertificate: true
                } as any,
                password: container.getPassword(),
                port: container.getPort(),
                server: container.getHost(),
                user: container.getUsername()
            },
            pool: { min: 0 }
        });
        await knexConnection.schema.withSchema(SCHEMA).createTable(AGGREGATES_TABLE, (table) => {
            table.uuid("id").primary();
            table.integer("version").notNullable();
        });
        await knexConnection.schema.withSchema(SCHEMA).createTable(SNAPSHOTS_TABLE, (table) => {
            table.uuid("id").primary();
            table.uuid("aggregate_root_id").notNullable();
            table.integer("aggregate_root_version").notNullable();
            table.specificType("payload", "nvarchar(max)").notNullable();
            table.integer("revision").notNullable();
            table.foreign("aggregate_root_id").references("id").inTable(`${SCHEMA}.${AGGREGATES_TABLE}`);
        });
    }, 180_000);

    beforeEach(() => {
        store = new MSSQLSnapshotStore(snapshotStrategy, `${SCHEMA}.${SNAPSHOTS_TABLE}`, knexConnection);
    });

    afterEach(async () => {
        await knexConnection(SNAPSHOTS_TABLE).withSchema(SCHEMA).delete();
        await knexConnection(AGGREGATES_TABLE).withSchema(SCHEMA).delete();
        jest.clearAllMocks();
    });

    afterAll(async () => {
        if (knexConnection) {
            await knexConnection.schema.withSchema(SCHEMA).dropTableIfExists(SNAPSHOTS_TABLE);
            await knexConnection.schema.withSchema(SCHEMA).dropTableIfExists(AGGREGATES_TABLE);
            await knexConnection.destroy();
        }
        if (container) {
            await container.stop();
        }
    });

    describe("findLatestSnapshotByAggregateId", () => {
        test("returns undefined when a snapshot is not found", async () => {
            const aggregateRootId = randomUUID();
            await knexConnection<AggregateRootRow>(AGGREGATES_TABLE)
                .withSchema(SCHEMA)
                .insert({ id: aggregateRootId, version: 10 });

            await expect(store.findLatestSnapshotByAggregateId(aggregateRootId)).resolves.toBeUndefined();
        });

        test("returns the latest snapshot when multiple snapshots exist", async () => {
            const aggregateRootId = randomUUID();
            const oldSnapshotId = randomUUID();
            const latestSnapshotId = randomUUID();
            await knexConnection<AggregateRootRow>(AGGREGATES_TABLE)
                .withSchema(SCHEMA)
                .insert({ id: aggregateRootId, version: 20 });
            await knexConnection<SnapshotRow>(SNAPSHOTS_TABLE)
                .withSchema(SCHEMA)
                .insert([
                    {
                        aggregate_root_id: aggregateRootId,
                        aggregate_root_version: 5,
                        id: oldSnapshotId,
                        payload: JSON.stringify({ someData: "old" }),
                        revision: 1
                    },
                    {
                        aggregate_root_id: aggregateRootId,
                        aggregate_root_version: 10,
                        id: latestSnapshotId,
                        payload: JSON.stringify({ someData: "latest" }),
                        revision: 2
                    }
                ]);

            const snapshot = await store.findLatestSnapshotByAggregateId(aggregateRootId);

            expect(snapshot?.id).toBe(latestSnapshotId);
            expect(snapshot?.aggregateRootId).toBe(aggregateRootId);
            expect(snapshot?.aggregateRootVersion).toBe(10);
            expect(snapshot?.revision).toBe(2);
            expect(snapshot?.payload).toEqual({ someData: "latest" });
        });

        test("returns undefined when snapshots exist for another aggregate id", async () => {
            const aggregateRootId = randomUUID();
            const otherAggregateRootId = randomUUID();
            await knexConnection<AggregateRootRow>(AGGREGATES_TABLE)
                .withSchema(SCHEMA)
                .insert([
                    { id: aggregateRootId, version: 10 },
                    { id: otherAggregateRootId, version: 10 }
                ]);
            await knexConnection<SnapshotRow>(SNAPSHOTS_TABLE)
                .withSchema(SCHEMA)
                .insert({
                    aggregate_root_id: otherAggregateRootId,
                    aggregate_root_version: 10,
                    id: randomUUID(),
                    payload: JSON.stringify({ someData: "other" }),
                    revision: 1
                });

            await expect(store.findLatestSnapshotByAggregateId(aggregateRootId)).resolves.toBeUndefined();
        });
    });

    describe("deleteByAggregateId", () => {
        test("deletes all snapshots for the target aggregate id", async () => {
            const aggregateRootId = randomUUID();
            const otherAggregateRootId = randomUUID();
            await knexConnection<AggregateRootRow>(AGGREGATES_TABLE)
                .withSchema(SCHEMA)
                .insert([
                    { id: aggregateRootId, version: 2 },
                    { id: otherAggregateRootId, version: 1 }
                ]);
            await knexConnection<SnapshotRow>(SNAPSHOTS_TABLE)
                .withSchema(SCHEMA)
                .insert([
                    {
                        aggregate_root_id: aggregateRootId,
                        aggregate_root_version: 1,
                        id: randomUUID(),
                        payload: JSON.stringify({ target: 1 }),
                        revision: 1
                    },
                    {
                        aggregate_root_id: aggregateRootId,
                        aggregate_root_version: 2,
                        id: randomUUID(),
                        payload: JSON.stringify({ target: 2 }),
                        revision: 1
                    },
                    {
                        aggregate_root_id: otherAggregateRootId,
                        aggregate_root_version: 1,
                        id: randomUUID(),
                        payload: JSON.stringify({ target: 3 }),
                        revision: 1
                    }
                ]);

            await store.deleteByAggregateId(aggregateRootId);

            await expect(
                knexConnection<SnapshotRow>(SNAPSHOTS_TABLE)
                    .withSchema(SCHEMA)
                    .where("aggregate_root_id", aggregateRootId)
            ).resolves.toHaveLength(0);
            await expect(
                knexConnection<SnapshotRow>(SNAPSHOTS_TABLE)
                    .withSchema(SCHEMA)
                    .where("aggregate_root_id", otherAggregateRootId)
            ).resolves.toHaveLength(1);
        });

        test("is a no-op for an unknown aggregate id", async () => {
            const otherAggregateRootId = randomUUID();
            await knexConnection<AggregateRootRow>(AGGREGATES_TABLE)
                .withSchema(SCHEMA)
                .insert({ id: otherAggregateRootId, version: 1 });
            await knexConnection<SnapshotRow>(SNAPSHOTS_TABLE)
                .withSchema(SCHEMA)
                .insert({
                    aggregate_root_id: otherAggregateRootId,
                    aggregate_root_version: 1,
                    id: randomUUID(),
                    payload: JSON.stringify({ other: true }),
                    revision: 1
                });

            await expect(store.deleteByAggregateId(randomUUID())).resolves.toBeUndefined();
            await expect(
                knexConnection<SnapshotRow>(SNAPSHOTS_TABLE).withSchema(SCHEMA).select("*")
            ).resolves.toHaveLength(1);
        });
    });

    describe("save", () => {
        test("saves the snapshot row and returns the snapshot", async () => {
            const aggregateRootId = randomUUID();
            const snapshotId = randomUUID();
            const version = 10;
            const revision = 3;
            await knexConnection<AggregateRootRow>(AGGREGATES_TABLE)
                .withSchema(SCHEMA)
                .insert({ id: aggregateRootId, version });
            const snapshot = StoredSnapshot.create(
                snapshotId,
                version,
                revision,
                { someData: "snapshot-data" },
                aggregateRootId
            );

            const saved = await store.save(snapshot);

            const rows = await knexConnection<SnapshotRow>(SNAPSHOTS_TABLE).withSchema(SCHEMA).select("*");
            expect(rows).toHaveLength(1);
            expect(rows[0].id).toBe(snapshotId);
            expect(rows[0].aggregate_root_id).toBe(aggregateRootId);
            expect(rows[0].aggregate_root_version).toBe(version);
            expect(rows[0].revision).toBe(revision);
            expect(JSON.parse(rows[0].payload)).toEqual({ someData: "snapshot-data" });
            expect(saved).toEqual(snapshot);
        });
    });

    describe("generateEntityId", () => {
        test("returns a UUID", async () => {
            await expect(store.generateEntityId()).resolves.toMatch(/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/);
        });
    });
});
