import {
    AggregateRoot,
    AggregateRootConfig,
    DomainEventEmitter,
    EventConcurrencyException,
    ForCountSnapshotStrategy,
    MissingAggregateRootNameException,
    NoOpSnapshotStore,
    SnapshotRevisionMismatchException,
    StoredAggregateRoot,
    StoredEvent,
    StoredSnapshot
} from "@event-nest/core";
import { MSSQLServerContainer, StartedMSSQLServerContainer } from "@testcontainers/mssqlserver";
import { knex, Knex } from "knex";
import { randomUUID } from "node:crypto";
import { TYPES } from "tedious";

import { SchemaConfiguration } from "../schema-configuration";
import { MSSQLEventStore } from "./mssql-event-store";
import { MSSQLSnapshotStore } from "./mssql-snapshot-store";

const AGGREGATES_TABLE = "event_nest_test_aggregates";
const EVENTS_TABLE = "event_nest_test_events";
const SNAPSHOTS_TABLE = "event_nest_test_snapshots";

@AggregateRootConfig({ name: "TestAggregate", snapshotRevision: 1 })
class TestAggregate extends AggregateRoot {
    constructor(id: string) {
        super(id);
    }
}

class UndecoratedAggregateRoot extends AggregateRoot {
    constructor(id: string) {
        super(id);
    }
}

function createEvent(aggregateRootId: string, payload?: unknown): StoredEvent {
    return StoredEvent.fromStorage(
        randomUUID(),
        aggregateRootId,
        "test-event",
        new Date("2026-08-09T12:34:56.789Z"),
        0,
        "TestAggregate",
        payload ?? { value: true }
    );
}

describe("MSSQLEventStore", () => {
    let connection: Knex;
    let container: StartedMSSQLServerContainer;
    let eventStore: MSSQLEventStore;
    let snapshotStore: MSSQLSnapshotStore;
    const schema = new SchemaConfiguration("dbo", AGGREGATES_TABLE, EVENTS_TABLE, SNAPSHOTS_TABLE);

    beforeAll(async () => {
        container = await new MSSQLServerContainer("mcr.microsoft.com/mssql/server:2019-latest")
            .acceptLicense()
            .withPassword("EventNest!Password123")
            .start();
        connection = knex({
            client: "mssql",
            connection: {
                database: container.getDatabase(),
                options: {
                    encrypt: true,
                    lowerCaseGuids: true,
                    mapBinding: (value: unknown) =>
                        value instanceof Date ? { type: TYPES.DateTime2, value } : undefined,
                    trustServerCertificate: true,
                    useUTC: true
                } as any,
                password: container.getPassword(),
                port: container.getPort(),
                server: container.getHost(),
                user: container.getUsername()
            },
            pool: { min: 0 }
        });
        await connection.schema.withSchema("dbo").createTable(AGGREGATES_TABLE, (table) => {
            table.uuid("id").primary();
            table.integer("version").notNullable();
        });
        await connection.schema.withSchema("dbo").createTable(EVENTS_TABLE, (table) => {
            table.uuid("id").primary();
            table.uuid("aggregate_root_id").notNullable();
            table.integer("aggregate_root_version").notNullable();
            table.specificType("aggregate_root_name", "nvarchar(max)").notNullable();
            table.specificType("event_name", "nvarchar(max)").notNullable();
            table.specificType("payload", "nvarchar(max)").notNullable();
            table.specificType("created_at", "datetime2(3)").notNullable();
            table.foreign("aggregate_root_id").references("id").inTable(`dbo.${AGGREGATES_TABLE}`);
            table.unique(["aggregate_root_id", "aggregate_root_version"]);
        });
        await connection.schema.withSchema("dbo").createTable(SNAPSHOTS_TABLE, (table) => {
            table.uuid("id").primary();
            table.uuid("aggregate_root_id").notNullable();
            table.integer("aggregate_root_version").notNullable();
            table.specificType("payload", "nvarchar(max)").notNullable();
            table.integer("revision").notNullable();
            table.foreign("aggregate_root_id").references("id").inTable(`dbo.${AGGREGATES_TABLE}`);
            table.index(["aggregate_root_id", "aggregate_root_version"]);
        });
        snapshotStore = new MSSQLSnapshotStore(
            new ForCountSnapshotStrategy({ count: 5 }),
            schema.schemaAwareSnapshotTable!,
            connection
        );
        eventStore = new MSSQLEventStore(new DomainEventEmitter(), snapshotStore, schema, connection);
    }, 180_000);

    beforeEach(async () => {
        await connection(SNAPSHOTS_TABLE).withSchema("dbo").delete();
        await connection(EVENTS_TABLE).withSchema("dbo").delete();
        await connection(AGGREGATES_TABLE).withSchema("dbo").delete();
    });

    afterAll(async () => {
        if (connection) {
            await connection.schema.withSchema("dbo").dropTableIfExists(SNAPSHOTS_TABLE);
            await connection.schema.withSchema("dbo").dropTableIfExists(EVENTS_TABLE);
            await connection.schema.withSchema("dbo").dropTableIfExists(AGGREGATES_TABLE);
            await connection.destroy();
        }
        if (container) {
            await container.stop();
        }
    });

    describe("findAggregateRootVersion", () => {
        test("returns -1 when the aggregate root is not found", async () => {
            await expect(eventStore.findAggregateRootVersion(randomUUID())).resolves.toBe(-1);
        });

        test("returns the stored aggregate root version", async () => {
            const aggregateId = randomUUID();
            await connection(AGGREGATES_TABLE).withSchema("dbo").insert({ id: aggregateId, version: 2 });

            await expect(eventStore.findAggregateRootVersion(aggregateId)).resolves.toBe(2);
        });
    });

    describe("findByAggregateRootId", () => {
        test("returns an empty array when no events are found", async () => {
            await expect(eventStore.findByAggregateRootId(TestAggregate, randomUUID())).resolves.toEqual([]);
        });

        test("returns an ordered Unicode event stream", async () => {
            const aggregateId = randomUUID();
            const events = [createEvent(aggregateId, { name: "πρώτο" }), createEvent(aggregateId, { name: "第二" })];
            await eventStore.save(events, new StoredAggregateRoot(aggregateId, 0));

            const stored = await eventStore.findByAggregateRootId(TestAggregate, aggregateId);

            expect(stored.map((event) => event.aggregateRootVersion)).toEqual([1, 2]);
            expect(stored.map((event) => event.payload)).toEqual([{ name: "πρώτο" }, { name: "第二" }]);
            expect(stored.map((event) => event.createdAt.toISOString())).toEqual([
                "2026-08-09T12:34:56.789Z",
                "2026-08-09T12:34:56.789Z"
            ]);
        });

        test("returns an empty array when events belong to a different aggregate root name", async () => {
            const aggregateId = randomUUID();
            await connection(AGGREGATES_TABLE).withSchema("dbo").insert({ id: aggregateId, version: 1 });
            await connection(EVENTS_TABLE)
                .withSchema("dbo")
                .insert({
                    aggregate_root_id: aggregateId,
                    aggregate_root_name: "OtherAggregate",
                    aggregate_root_version: 1,
                    created_at: new Date("2026-08-09T12:34:56.789Z"),
                    event_name: "test-event",
                    id: randomUUID(),
                    payload: JSON.stringify({ value: true })
                });

            await expect(eventStore.findByAggregateRootId(TestAggregate, aggregateId)).resolves.toEqual([]);
        });

        test("throws when the aggregate root is not decorated", async () => {
            await expect(
                eventStore.findByAggregateRootId(UndecoratedAggregateRoot, randomUUID())
            ).rejects.toBeInstanceOf(MissingAggregateRootNameException);
        });
    });

    describe("findByAggregateRootIds", () => {
        test("returns an empty object when no ids are provided", async () => {
            await expect(eventStore.findByAggregateRootIds(TestAggregate, [])).resolves.toEqual({});
        });

        test("returns an empty object when no events are found", async () => {
            await expect(
                eventStore.findByAggregateRootIds(TestAggregate, [randomUUID(), randomUUID()])
            ).resolves.toEqual({});
        });

        test("returns mapped and ordered events grouped by aggregate root id", async () => {
            const firstAggregateId = randomUUID();
            const secondAggregateId = randomUUID();
            const firstEvents = [
                createEvent(firstAggregateId, { index: 1 }),
                createEvent(firstAggregateId, { index: 2 })
            ];
            const secondEvent = createEvent(secondAggregateId, { index: 1 });
            await eventStore.save(firstEvents, new StoredAggregateRoot(firstAggregateId, 0));
            await eventStore.save([secondEvent], new StoredAggregateRoot(secondAggregateId, 0));
            await connection(EVENTS_TABLE)
                .withSchema("dbo")
                .insert({
                    aggregate_root_id: firstAggregateId,
                    aggregate_root_name: "OtherAggregate",
                    aggregate_root_version: 3,
                    created_at: new Date("2026-08-09T12:34:56.789Z"),
                    event_name: "other-event",
                    id: randomUUID(),
                    payload: JSON.stringify({ index: 3 })
                });

            const grouped = await eventStore.findByAggregateRootIds(TestAggregate, [
                secondAggregateId,
                randomUUID(),
                firstAggregateId
            ]);

            expect(Object.keys(grouped).toSorted((left, right) => left.localeCompare(right))).toEqual(
                [firstAggregateId, secondAggregateId].toSorted((left, right) => left.localeCompare(right))
            );
            expect(grouped[firstAggregateId].map((event) => event.aggregateRootVersion)).toEqual([1, 2]);
            expect(grouped[firstAggregateId].map((event) => event.payload)).toEqual([{ index: 1 }, { index: 2 }]);
            expect(grouped[secondAggregateId]).toHaveLength(1);
            expect(grouped[secondAggregateId][0].id).toBe(secondEvent.id);
        });

        test("throws when the aggregate root is not decorated", async () => {
            await expect(
                eventStore.findByAggregateRootIds(UndecoratedAggregateRoot, [randomUUID()])
            ).rejects.toBeInstanceOf(MissingAggregateRootNameException);
        });

        test("chunks and merges more than 2,100 requested aggregate IDs", async () => {
            const aggregateId = randomUUID();
            await eventStore.save([createEvent(aggregateId)], new StoredAggregateRoot(aggregateId, 0));
            const ids = [aggregateId, ...Array.from({ length: 2100 }, () => randomUUID()), aggregateId];

            const grouped = await eventStore.findByAggregateRootIds(TestAggregate, ids);

            expect(Object.keys(grouped)).toEqual([aggregateId]);
            expect(grouped[aggregateId]).toHaveLength(1);
        });
    });

    describe("save", () => {
        test("does nothing for an empty events array", async () => {
            const aggregate = new StoredAggregateRoot(randomUUID(), 5);

            await expect(eventStore.save([], aggregate)).resolves.toEqual([]);

            expect(aggregate.version).toBe(5);
            await expect(connection(AGGREGATES_TABLE).withSchema("dbo").select("*")).resolves.toEqual([]);
            await expect(connection(EVENTS_TABLE).withSchema("dbo").select("*")).resolves.toEqual([]);
        });

        test("saves a new aggregate and its event", async () => {
            const aggregateId = randomUUID();
            const aggregate = new StoredAggregateRoot(aggregateId, 0);
            const event = createEvent(aggregateId, { value: "new" });

            const saved = await eventStore.save([event], aggregate);

            const storedAggregate = await connection(AGGREGATES_TABLE)
                .withSchema("dbo")
                .where("id", aggregateId)
                .first();
            const storedEvent = await connection(EVENTS_TABLE)
                .withSchema("dbo")
                .where("aggregate_root_id", aggregateId)
                .first();
            expect(storedAggregate.version).toBe(1);
            expect(storedEvent).toMatchObject({
                aggregate_root_id: aggregateId,
                aggregate_root_name: "TestAggregate",
                aggregate_root_version: 1,
                event_name: "test-event",
                id: event.id,
                payload: JSON.stringify({ value: "new" })
            });
            expect(storedEvent.created_at).toEqual(event.createdAt);
            expect(saved).toEqual([event]);
            expect(event.aggregateRootVersion).toBe(1);
            expect(aggregate.version).toBe(1);
        });

        test("increases the version and stores multiple events for an existing aggregate", async () => {
            const aggregateId = randomUUID();
            const aggregate = new StoredAggregateRoot(aggregateId, 38);
            const events = [createEvent(aggregateId, { index: 1 }), createEvent(aggregateId, { index: 2 })];
            await connection(AGGREGATES_TABLE).withSchema("dbo").insert({ id: aggregateId, version: 38 });

            const saved = await eventStore.save(events, aggregate);

            const storedAggregate = await connection(AGGREGATES_TABLE)
                .withSchema("dbo")
                .where("id", aggregateId)
                .first();
            const storedEvents = await connection(EVENTS_TABLE)
                .withSchema("dbo")
                .where("aggregate_root_id", aggregateId)
                .orderBy("aggregate_root_version", "asc");
            expect(storedAggregate.version).toBe(40);
            expect(storedEvents).toHaveLength(2);
            expect(storedEvents.map((event) => event.aggregate_root_version)).toEqual([39, 40]);
            expect(storedEvents.map((event) => JSON.parse(event.payload))).toEqual([{ index: 1 }, { index: 2 }]);
            expect(saved).toEqual(events);
            expect(aggregate.version).toBe(40);
        });

        test("rejects stale writes and nonzero versions for missing aggregates", async () => {
            const aggregateId = randomUUID();
            const missingAggregateId = randomUUID();
            await eventStore.save([createEvent(aggregateId)], new StoredAggregateRoot(aggregateId, 0));

            await expect(
                eventStore.save([createEvent(aggregateId)], new StoredAggregateRoot(aggregateId, 0))
            ).rejects.toBeInstanceOf(EventConcurrencyException);
            await expect(
                eventStore.save([createEvent(missingAggregateId)], new StoredAggregateRoot(missingAggregateId, 4))
            ).rejects.toBeInstanceOf(EventConcurrencyException);
            await expect(eventStore.findAggregateRootVersion(aggregateId)).resolves.toBe(1);
            await expect(eventStore.findAggregateRootVersion(missingAggregateId)).resolves.toBe(-1);
            await expect(
                connection(EVENTS_TABLE).withSchema("dbo").where("aggregate_root_id", aggregateId)
            ).resolves.toHaveLength(1);
        });

        test("serializes concurrent first writes", async () => {
            const aggregateId = randomUUID();
            const results = await Promise.allSettled([
                eventStore.save([createEvent(aggregateId)], new StoredAggregateRoot(aggregateId, 0)),
                eventStore.save([createEvent(aggregateId)], new StoredAggregateRoot(aggregateId, 0))
            ]);

            expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
            const rejected = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
            expect(rejected?.reason).toBeInstanceOf(EventConcurrencyException);
            await expect(eventStore.findAggregateRootVersion(aggregateId)).resolves.toBe(1);
        });

        test("serializes concurrent writes to an existing aggregate", async () => {
            const aggregateId = randomUUID();
            await connection(AGGREGATES_TABLE).withSchema("dbo").insert({ id: aggregateId, version: 5 });
            const firstAggregate = new StoredAggregateRoot(aggregateId, 5);
            const secondAggregate = new StoredAggregateRoot(aggregateId, 5);

            const results = await Promise.allSettled([
                eventStore.save([createEvent(aggregateId)], firstAggregate),
                eventStore.save([createEvent(aggregateId)], secondAggregate)
            ]);

            expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
            const rejected = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
            expect(rejected?.reason).toBeInstanceOf(EventConcurrencyException);
            expect([firstAggregate.version, secondAggregate.version].toSorted((left, right) => left - right)).toEqual([
                5, 6
            ]);
            await expect(
                connection(EVENTS_TABLE).withSchema("dbo").where("aggregate_root_id", aggregateId)
            ).resolves.toHaveLength(1);
        });

        test("chunks a commit that exceeds one SQL Server parameterized statement", async () => {
            const aggregateId = randomUUID();
            const aggregate = new StoredAggregateRoot(aggregateId, 0);
            const events = Array.from({ length: 301 }, (_, index) => createEvent(aggregateId, { index }));

            await eventStore.save(events, aggregate);

            expect(aggregate.version).toBe(301);
            expect(events[300].aggregateRootVersion).toBe(301);
            await expect(
                connection(EVENTS_TABLE).withSchema("dbo").where("aggregate_root_id", aggregateId)
            ).resolves.toHaveLength(301);
        });

        test("rolls back earlier chunks when a later chunk fails", async () => {
            const aggregateId = randomUUID();
            const events = Array.from({ length: 301 }, (_, index) => createEvent(aggregateId, { index }));
            const duplicateIdEvent = StoredEvent.fromStorage(
                events[0].id,
                aggregateId,
                "test-event",
                new Date("2026-08-09T12:34:56.789Z"),
                0,
                "TestAggregate",
                { index: 300 }
            );
            events[300] = duplicateIdEvent;

            await expect(eventStore.save(events, new StoredAggregateRoot(aggregateId, 0))).rejects.toThrow();

            await expect(connection(AGGREGATES_TABLE).withSchema("dbo").where("id", aggregateId)).resolves.toEqual([]);
            await expect(
                connection(EVENTS_TABLE).withSchema("dbo").where("aggregate_root_id", aggregateId)
            ).resolves.toEqual([]);
            expect(events.every((event) => event.aggregateRootVersion === 0)).toBe(true);
        });
    });

    describe("purgeAggregate", () => {
        test("purges aggregate state, events, and snapshots while keeping unrelated data", async () => {
            const aggregateId = randomUUID();
            const otherAggregateId = randomUUID();
            await eventStore.save([createEvent(aggregateId)], new StoredAggregateRoot(aggregateId, 0));
            await eventStore.save([createEvent(otherAggregateId)], new StoredAggregateRoot(otherAggregateId, 0));
            await snapshotStore.save(StoredSnapshot.create(randomUUID(), 1, 1, { total: 10 }, aggregateId));

            await eventStore.purgeAggregate(aggregateId);

            await expect(eventStore.findAggregateRootVersion(aggregateId)).resolves.toBe(-1);
            await expect(eventStore.findByAggregateRootId(TestAggregate, aggregateId)).resolves.toEqual([]);
            await expect(snapshotStore.findLatestSnapshotByAggregateId(aggregateId)).resolves.toBeUndefined();
            await expect(eventStore.findAggregateRootVersion(otherAggregateId)).resolves.toBe(1);
            await expect(eventStore.findByAggregateRootId(TestAggregate, otherAggregateId)).resolves.toHaveLength(1);
        });

        test("is a no-op for an unknown aggregate id", async () => {
            const existingAggregateId = randomUUID();
            await eventStore.save([createEvent(existingAggregateId)], new StoredAggregateRoot(existingAggregateId, 0));

            await expect(eventStore.purgeAggregate(randomUUID())).resolves.toBeUndefined();

            await expect(eventStore.findAggregateRootVersion(existingAggregateId)).resolves.toBe(1);
            await expect(eventStore.findByAggregateRootId(TestAggregate, existingAggregateId)).resolves.toHaveLength(1);
        });

        test("supports snapshots-disabled purge", async () => {
            const aggregateId = randomUUID();
            const store = new MSSQLEventStore(new DomainEventEmitter(), new NoOpSnapshotStore(), schema, connection);
            await store.save([createEvent(aggregateId)], new StoredAggregateRoot(aggregateId, 0));

            await store.purgeAggregate(aggregateId);

            await expect(store.findAggregateRootVersion(aggregateId)).resolves.toBe(-1);
        });
    });

    describe("generateEntityId", () => {
        test("returns a UUID", async () => {
            await expect(eventStore.generateEntityId()).resolves.toMatch(/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/);
        });
    });

    describe("findWithSnapshot", () => {
        test("returns no snapshot and all events when no snapshot exists", async () => {
            const aggregateId = randomUUID();
            await eventStore.save(
                [createEvent(aggregateId, { index: 1 }), createEvent(aggregateId, { index: 2 })],
                new StoredAggregateRoot(aggregateId, 0)
            );

            const result = await eventStore.findWithSnapshot(TestAggregate, aggregateId);

            expect(result.snapshot).toBeUndefined();
            expect(result.aggregateRootVersion).toBe(2);
            expect(result.events.map((event) => event.aggregateRootVersion)).toEqual([1, 2]);
            expect(result.events.map((event) => event.payload)).toEqual([{ index: 1 }, { index: 2 }]);
        });

        test("throws when the snapshot revision does not match", async () => {
            const aggregateId = randomUUID();
            await eventStore.save([createEvent(aggregateId)], new StoredAggregateRoot(aggregateId, 0));
            await snapshotStore.save(StoredSnapshot.create(randomUUID(), 1, 2, { total: 10 }, aggregateId));

            await expect(eventStore.findWithSnapshot(TestAggregate, aggregateId)).rejects.toBeInstanceOf(
                SnapshotRevisionMismatchException
            );
        });

        test("throws when the aggregate root is not decorated", async () => {
            await expect(eventStore.findWithSnapshot(UndecoratedAggregateRoot, randomUUID())).rejects.toBeInstanceOf(
                MissingAggregateRootNameException
            );
        });

        test("returns the snapshot and no events when the snapshot is at the stream head", async () => {
            const aggregateId = randomUUID();
            await eventStore.save(
                [createEvent(aggregateId, { index: 1 }), createEvent(aggregateId, { index: 2 })],
                new StoredAggregateRoot(aggregateId, 0)
            );
            await snapshotStore.save(StoredSnapshot.create(randomUUID(), 2, 1, { total: 20 }, aggregateId));

            const result = await eventStore.findWithSnapshot(TestAggregate, aggregateId);

            expect(result.snapshot).toEqual({ total: 20 });
            expect(result.events).toEqual([]);
            expect(result.aggregateRootVersion).toBe(2);
        });

        test("returns version 0 when the aggregate does not exist", async () => {
            const result = await eventStore.findWithSnapshot(TestAggregate, randomUUID());

            expect(result.snapshot).toBeUndefined();
            expect(result.events).toEqual([]);
            expect(result.aggregateRootVersion).toBe(0);
        });

        test("returns the latest snapshot and only newer events", async () => {
            const aggregateId = randomUUID();
            await eventStore.save(
                [createEvent(aggregateId, { index: 1 }), createEvent(aggregateId, { index: 2 })],
                new StoredAggregateRoot(aggregateId, 0)
            );
            await snapshotStore.save(StoredSnapshot.create(randomUUID(), 1, 1, { total: 10 }, aggregateId));

            const result = await eventStore.findWithSnapshot(TestAggregate, aggregateId);

            expect(result.snapshot).toEqual({ total: 10 });
            expect(result.events.map((event) => event.aggregateRootVersion)).toEqual([2]);
            expect(result.aggregateRootVersion).toBe(2);
        });

        test("returns all events when the snapshot version is at the beginning", async () => {
            const aggregateId = randomUUID();
            await eventStore.save(
                [createEvent(aggregateId, { index: 1 }), createEvent(aggregateId, { index: 2 })],
                new StoredAggregateRoot(aggregateId, 0)
            );
            await snapshotStore.save(StoredSnapshot.create(randomUUID(), 0, 1, { total: 0 }, aggregateId));

            const result = await eventStore.findWithSnapshot(TestAggregate, aggregateId);

            expect(result.snapshot).toEqual({ total: 0 });
            expect(result.events.map((event) => event.aggregateRootVersion)).toEqual([1, 2]);
            expect(result.aggregateRootVersion).toBe(2);
        });
    });
});
