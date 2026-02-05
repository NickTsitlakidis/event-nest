import {
    AggregateRoot,
    AggregateRootConfig,
    AggregateRootName,
    DomainEvent,
    DomainEventEmitter,
    EventConcurrencyException,
    getAggregateRootName,
    MissingAggregateRootNameException,
    SnapshotAware,
    SnapshotRevisionMismatchException,
    StoredAggregateRoot,
    StoredEvent,
    StoredSnapshot
} from "@event-nest/core";
import { createMock } from "@golevelup/ts-jest";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { knex } from "knex";
import { randomUUID } from "node:crypto";

import { SchemaConfiguration } from "../schema-configuration";
import { AggregateRootRow } from "./aggregate-root-row";
import { EventRow } from "./event-row";
import { PostgreSQLEventStore } from "./postgresql-event-store";
import { PostgreSQLSnapshotStore } from "./postgresql-snapshot-store";

let eventStore: PostgreSQLEventStore;
let container: StartedPostgreSqlContainer;
let connectionUri: string;
let knexConnection: knex.Knex;
const schema = "event_nest_tests";
const snapshotStore = createMock<PostgreSQLSnapshotStore>();

interface TestSnapshot {
    someData: string;
}

@AggregateRootName("test-aggregate")
class DecoratedAggregateRoot extends AggregateRoot {
    constructor(id: string) {
        super(id);
    }
}

const snapshotRevision = 2;
@AggregateRootConfig({ name: "aggregate_root_name", snapshotRevision })
class SnapshotAwareAggregateRoot extends AggregateRoot implements SnapshotAware<TestSnapshot> {
    someData = "";

    constructor(id: string) {
        super(id);
    }

    applySnapshot(snapshot: TestSnapshot): void {
        this.someData = snapshot.someData;
    }

    toSnapshot(): TestSnapshot {
        return {
            someData: this.someData
        };
    }
}

@DomainEvent("sql-event-1")
class SqlEvent1 {}

@DomainEvent("sql-event-2")
class SqlEvent2 {}

class UndecoratedAggregateRoot extends AggregateRoot {
    constructor(id: string) {
        super(id);
    }
}

describe("PostgreSQLEventStore", () => {
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
        eventStore = new PostgreSQLEventStore(
            createMock<DomainEventEmitter>(),
            snapshotStore,
            new SchemaConfiguration(schema, "es-aggregates", "es-events", "es-snapshots"),
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
    });

    describe("findAggregateRootVersion tests", () => {
        test("returns -1 when the aggregate root is not found", async () => {
            await knexConnection(schema + ".es-aggregates").insert({
                id: randomUUID(),
                version: 33
            });
            const version = await eventStore.findAggregateRootVersion(randomUUID());
            expect(version).toBe(-1);
        });

        test("returns version when aggregate root is found", async () => {
            const id = randomUUID();
            await knexConnection(schema + ".es-aggregates").insert({
                id: id,
                version: 88
            });
            const version = await eventStore.findAggregateRootVersion(id);
            expect(version).toBe(88);
        });
    });

    describe("findByAggregateRootIds tests", () => {
        test("returns empty array when no events found", async () => {
            const events = await eventStore.findByAggregateRootIds(DecoratedAggregateRoot, [
                randomUUID(),
                randomUUID(),
                randomUUID()
            ]);
            expect(events).toEqual({});
        });

        test("returns mapped events when they are found and matched", async () => {
            const aggregateRootId1 = randomUUID();
            const aggregateRootId2 = randomUUID();
            const aggregateRootId3 = randomUUID();
            const otherId = randomUUID();

            const ev1Id = randomUUID();
            const ev2Id = randomUUID();
            const ev3Id = randomUUID();
            const ev4Id = randomUUID();

            const ev1Date = new Date();
            const ev2Date = new Date();
            const ev3Date = new Date();
            const ev4Date = new Date();

            await knexConnection(schema + ".es-aggregates").insert({
                id: aggregateRootId1,
                version: 11
            });

            await knexConnection(schema + ".es-aggregates").insert({
                id: aggregateRootId2,
                version: 11
            });

            await knexConnection(schema + ".es-aggregates").insert({
                id: aggregateRootId3,
                version: 11
            });

            await knexConnection(schema + ".es-aggregates").insert({
                id: otherId,
                version: 110
            });

            await knexConnection<EventRow>(schema + ".es-events").insert({
                aggregate_root_id: aggregateRootId1,
                aggregate_root_name: "test-aggregate",
                aggregate_root_version: 34,
                created_at: ev1Date,
                event_name: "sql-event-1",
                id: ev1Id,
                payload: "{}"
            });

            await knexConnection<EventRow>(schema + ".es-events").insert({
                aggregate_root_id: aggregateRootId2,
                aggregate_root_name: "test-aggregate",
                aggregate_root_version: 35,
                created_at: ev2Date,
                event_name: "sql-event-2",
                id: ev2Id,
                payload: "{}"
            });

            await knexConnection<EventRow>(schema + ".es-events").insert({
                aggregate_root_id: aggregateRootId2,
                aggregate_root_name: "test-aggregate",
                aggregate_root_version: 12,
                created_at: ev3Date,
                event_name: "sql-event-2-2",
                id: ev3Id,
                payload: "{}"
            });

            await knexConnection<EventRow>(schema + ".es-events").insert({
                aggregate_root_id: aggregateRootId3,
                aggregate_root_name: "test-aggregate",
                aggregate_root_version: 36,
                created_at: ev4Date,
                event_name: "sql-event-3",
                id: ev4Id,
                payload: "{}"
            });

            await knexConnection<EventRow>(schema + ".es-events").insert({
                aggregate_root_id: otherId,
                aggregate_root_name: "other",
                aggregate_root_version: 36,
                created_at: ev4Date,
                event_name: "other-event",
                id: randomUUID(),
                payload: "{}"
            });

            const events = await eventStore.findByAggregateRootIds(DecoratedAggregateRoot, [
                aggregateRootId1,
                aggregateRootId2,
                aggregateRootId3,
                randomUUID()
            ]);

            expect(Object.keys(events).length).toBe(3);
            expect(events[aggregateRootId1].length).toBe(1);
            expect(events[aggregateRootId1][0].id).toBe(ev1Id);
            expect(events[aggregateRootId1][0].aggregateRootVersion).toBe(34);
            expect(events[aggregateRootId1][0].eventName).toBe("sql-event-1");
            expect(events[aggregateRootId1][0].aggregateRootId).toBe(aggregateRootId1);
            expect(events[aggregateRootId1][0].aggregateRootName).toBe("test-aggregate");
            expect(events[aggregateRootId1][0].payload).toEqual({});
            expect(events[aggregateRootId1][0].createdAt).toEqual(ev1Date);

            expect(events[aggregateRootId2].length).toBe(2);
            expect(events[aggregateRootId2][0].id).toBe(ev2Id);
            expect(events[aggregateRootId2][0].aggregateRootVersion).toBe(35);
            expect(events[aggregateRootId2][0].eventName).toBe("sql-event-2");
            expect(events[aggregateRootId2][0].aggregateRootId).toBe(aggregateRootId2);
            expect(events[aggregateRootId2][0].aggregateRootName).toBe("test-aggregate");
            expect(events[aggregateRootId2][0].payload).toEqual({});
            expect(events[aggregateRootId2][0].createdAt).toEqual(ev2Date);

            expect(events[aggregateRootId2][1].id).toBe(ev3Id);
            expect(events[aggregateRootId2][1].aggregateRootVersion).toBe(12);
            expect(events[aggregateRootId2][1].eventName).toBe("sql-event-2-2");
            expect(events[aggregateRootId2][1].aggregateRootId).toBe(aggregateRootId2);
            expect(events[aggregateRootId2][1].aggregateRootName).toBe("test-aggregate");
            expect(events[aggregateRootId2][1].payload).toEqual({});
            expect(events[aggregateRootId2][1].createdAt).toEqual(ev3Date);

            expect(events[aggregateRootId3].length).toBe(1);
            expect(events[aggregateRootId3][0].id).toBe(ev4Id);
            expect(events[aggregateRootId3][0].aggregateRootVersion).toBe(36);
            expect(events[aggregateRootId3][0].eventName).toBe("sql-event-3");
            expect(events[aggregateRootId3][0].aggregateRootId).toBe(aggregateRootId3);
            expect(events[aggregateRootId3][0].aggregateRootName).toBe("test-aggregate");
            expect(events[aggregateRootId3][0].payload).toEqual({});
            expect(events[aggregateRootId3][0].createdAt).toEqual(ev4Date);
        });
    });

    describe("findByAggregateRootId tests", () => {
        test("returns empty array when no events found", async () => {
            const events = await eventStore.findByAggregateRootId(DecoratedAggregateRoot, randomUUID());
            expect(events).toEqual([]);
        });

        test("returns mapped events when they are found and matched", async () => {
            const aggregateRootId = randomUUID();
            const ev1Id = randomUUID();
            const ev2Id = randomUUID();

            const ev1Date = new Date();
            const ev2Date = new Date();

            await knexConnection(schema + ".es-aggregates").insert({
                id: aggregateRootId,
                version: 33
            });

            await knexConnection<EventRow>(schema + ".es-events").insert({
                aggregate_root_id: aggregateRootId,
                aggregate_root_name: "test-aggregate",
                aggregate_root_version: 34,
                created_at: ev1Date,
                event_name: "sql-event-1",
                id: ev1Id,
                payload: "{}"
            });

            await knexConnection<EventRow>(schema + ".es-events").insert({
                aggregate_root_id: aggregateRootId,
                aggregate_root_name: "test-aggregate",
                aggregate_root_version: 35,
                created_at: ev2Date,
                event_name: "sql-event-2",
                id: ev2Id,
                payload: "{}"
            });

            const events = await eventStore.findByAggregateRootId(DecoratedAggregateRoot, aggregateRootId);

            expect(events.length).toBe(2);
            expect(events[0].id).toBe(ev1Id);
            expect(events[0].aggregateRootVersion).toBe(34);
            expect(events[0].eventName).toBe("sql-event-1");
            expect(events[0].aggregateRootId).toBe(aggregateRootId);
            expect(events[0].aggregateRootName).toBe("test-aggregate");
            expect(events[0].payload).toEqual({});
            expect(events[0].createdAt).toEqual(ev1Date);

            expect(events[1].id).toBe(ev2Id);
            expect(events[1].aggregateRootVersion).toBe(35);
            expect(events[1].eventName).toBe("sql-event-2");
            expect(events[1].aggregateRootId).toBe(aggregateRootId);
            expect(events[1].aggregateRootName).toBe("test-aggregate");
            expect(events[1].payload).toEqual({});
            expect(events[1].createdAt).toEqual(ev2Date);
        });

        test("returns empty array when events don't match the aggregate", async () => {
            const aggregateRootId = randomUUID();
            const ev1Id = randomUUID();

            const ev1Date = new Date();

            await knexConnection(schema + ".es-aggregates").insert({
                id: aggregateRootId,
                version: 33
            });

            await knexConnection<EventRow>(schema + ".es-events").insert({
                aggregate_root_id: aggregateRootId,
                aggregate_root_name: "test-aggregate",
                aggregate_root_version: 34,
                created_at: ev1Date,
                event_name: "sql-event-1",
                id: ev1Id,
                payload: "{}"
            });

            const events = await eventStore.findByAggregateRootId(DecoratedAggregateRoot, randomUUID());

            expect(events.length).toBe(0);
        });

        test("throws when aggregate is not decorated", async () => {
            const aggregateRootId = randomUUID();
            const ev1Id = randomUUID();

            const ev1Date = new Date();

            await knexConnection(schema + ".es-aggregates").insert({
                id: aggregateRootId,
                version: 33
            });

            await knexConnection<EventRow>(schema + ".es-events").insert({
                aggregate_root_id: aggregateRootId,
                aggregate_root_name: "test-aggregate",
                aggregate_root_version: 34,
                created_at: ev1Date,
                event_name: "sql-event-1",
                id: ev1Id,
                payload: "{}"
            });

            await expect(eventStore.findByAggregateRootId(UndecoratedAggregateRoot, aggregateRootId)).rejects.toThrow(
                MissingAggregateRootNameException
            );
        });
    });

    describe("save tests", () => {
        test("does nothing for empty events array", async () => {
            const ag = new StoredAggregateRoot(randomUUID(), 5);

            await eventStore.save([], ag);

            const events = await knexConnection(schema + ".es-events").select("*");
            expect(events.length).toBe(0);

            const aggregates = await knexConnection(schema + ".es-aggregates").select("*");
            expect(aggregates.length).toBe(0);
        });

        test("throws when there's a concurrency issue", async () => {
            const id = randomUUID();
            const root = new StoredAggregateRoot(id, 5);

            await knexConnection<AggregateRootRow>(schema + ".es-aggregates").insert({ id: id, version: 6 });

            await expect(
                eventStore.save(
                    [StoredEvent.fromPublishedEvent(randomUUID(), root.id, "Test", new SqlEvent1(), new Date())],
                    root
                )
            ).rejects.toThrow(EventConcurrencyException);

            const events = await knexConnection(schema + ".es-events").select("*");
            expect(events.length).toBe(0);

            const aggregate = await knexConnection<AggregateRootRow>(schema + ".es-aggregates")
                .select("*")
                .where("id", id)
                .first();
            expect(aggregate!.version).toBe(6);
        });

        test("saves new aggregate with its event", async () => {
            const rootId = randomUUID();
            const root = new StoredAggregateRoot(rootId, 1);

            const events = [StoredEvent.fromPublishedEvent(randomUUID(), rootId, "Test", new SqlEvent2(), new Date())];

            const saved = await eventStore.save(events, root);

            const aggregate = await knexConnection<AggregateRootRow>(schema + ".es-aggregates")
                .select("*")
                .where("id", rootId)
                .first();
            expect(aggregate!.version).toBe(1);

            const storedEvents = await knexConnection<EventRow>(schema + ".es-events").select("*");
            expect(storedEvents.length).toBe(1);

            expect(storedEvents[0].event_name).toBe("sql-event-2");
            expect(storedEvents[0].aggregate_root_id).toBe(rootId);
            expect(storedEvents[0].aggregate_root_version).toBe(1);
            expect(storedEvents[0].aggregate_root_name).toBe("Test");
            expect(storedEvents[0].payload).toEqual(events[0].payload);
            expect(storedEvents[0].created_at).toEqual(events[0].createdAt);
            expect(storedEvents[0].id).toBe(events[0].id);

            expect(saved).toEqual(events);
            expect(saved[0].aggregateRootVersion).toBe(1);
        });

        test("increases version and stores events and aggregate", async () => {
            const rootId = randomUUID();
            const root = new StoredAggregateRoot(rootId, 38);

            await knexConnection<AggregateRootRow>(schema + ".es-aggregates").insert({
                id: rootId,
                version: 38
            });

            const events = [
                StoredEvent.fromPublishedEvent(randomUUID(), rootId, "Test", new SqlEvent2(), new Date()),
                StoredEvent.fromPublishedEvent(randomUUID(), rootId, "Test", new SqlEvent1(), new Date())
            ];

            const saved = await eventStore.save(events, root);

            const storedAggregates = await knexConnection<AggregateRootRow>(schema + ".es-aggregates").select("*");
            expect(storedAggregates[0].version).toBe(40);

            const storedEvents = await knexConnection<EventRow>(schema + ".es-events").select("*");
            expect(storedEvents.length).toBe(2);

            expect(storedEvents[0].event_name).toBe("sql-event-2");
            expect(storedEvents[0].aggregate_root_id).toBe(rootId);
            expect(storedEvents[0].aggregate_root_version).toBe(39);
            expect(storedEvents[0].aggregate_root_name).toBe("Test");
            expect(storedEvents[0].payload).toEqual(events[0].payload);
            expect(storedEvents[0].created_at).toEqual(events[0].createdAt);
            expect(storedEvents[0].id).toBe(events[0].id);

            expect(storedEvents[1].event_name).toBe("sql-event-1");
            expect(storedEvents[1].aggregate_root_id).toBe(rootId);
            expect(storedEvents[1].aggregate_root_version).toBe(40);
            expect(storedEvents[1].aggregate_root_name).toBe("Test");
            expect(storedEvents[1].payload).toEqual(events[1].payload);
            expect(storedEvents[1].created_at).toEqual(events[1].createdAt);
            expect(storedEvents[1].id).toBe(events[1].id);

            expect(saved).toEqual(events);
            expect(saved[0].aggregateRootVersion).toBe(39);
            expect(saved[1].aggregateRootVersion).toBe(40);
        });
    });

    test("generateEntityId - returns string with UUID format", async () => {
        const id = await eventStore.generateEntityId();
        expect(/^[a-z,0-9-]{36}$/.test(id)).toBe(true);
    });

    describe("findWithSnapshot tests", () => {
        test("returns no snapshot and all events when no snapshot exists", async () => {
            const aggregateRootId = randomUUID();
            await knexConnection(schema + ".es-aggregates").insert({
                id: aggregateRootId,
                version: 10
            });

            const latestSnapshot = undefined;
            snapshotStore.findLatestSnapshotByAggregateId.mockResolvedValue(latestSnapshot);

            await expect(eventStore.findWithSnapshot(SnapshotAwareAggregateRoot, aggregateRootId)).resolves.toEqual({
                events: [],
                snapshot: undefined
            });
        });

        test("throws SnapshotRevisionMismatchException when snapshot revision doesn't match", async () => {
            const aggregateRootId = randomUUID();
            const snapshotId = randomUUID();

            await knexConnection(schema + ".es-aggregates").insert({
                id: aggregateRootId,
                version: 10
            });

            const snapshot = StoredSnapshot.create(
                snapshotId,
                5,
                snapshotRevision - 1,
                { someData: "test" },
                aggregateRootId
            );

            snapshotStore.findLatestSnapshotByAggregateId.mockResolvedValue(snapshot);

            await expect(eventStore.findWithSnapshot(SnapshotAwareAggregateRoot, aggregateRootId)).rejects.toThrow(
                SnapshotRevisionMismatchException
            );
        });

        test("throws MissingAggregateRootNameException when aggregate is not decorated", async () => {
            const aggregateRootId = randomUUID();

            await expect(eventStore.findWithSnapshot(UndecoratedAggregateRoot as any, aggregateRootId)).rejects.toThrow(
                MissingAggregateRootNameException
            );
        });

        test("returns snapshot and empty events array when no events exist after snapshot", async () => {
            const aggregateRootId = randomUUID();
            const snapshotId = randomUUID();

            await knexConnection(schema + ".es-aggregates").insert({
                id: aggregateRootId,
                version: 10
            });

            const snapshotPayload: TestSnapshot = { someData: "test-data" };
            const snapshot = StoredSnapshot.create(snapshotId, 10, snapshotRevision, snapshotPayload, aggregateRootId);

            snapshotStore.findLatestSnapshotByAggregateId.mockResolvedValue(snapshot);

            const result = await eventStore.findWithSnapshot(SnapshotAwareAggregateRoot, aggregateRootId);

            expect(result.snapshot).toEqual(snapshotPayload);
            expect(result.events).toEqual([]);
        });

        test("returns snapshot and events that occurred after the snapshot version", async () => {
            const aggregateRootId = randomUUID();
            const snapshotId = randomUUID();
            const ev0Id = randomUUID();
            const ev1Id = randomUUID();
            const ev2Id = randomUUID();
            const ev3Id = randomUUID();
            const ev4Id = randomUUID();

            const ev0Date = new Date();
            const ev1Date = new Date();
            const ev2Date = new Date();
            const ev3Date = new Date();
            const ev4Date = new Date();

            await knexConnection(schema + ".es-aggregates").insert({
                id: aggregateRootId,
                version: 15
            });
            const aggregate_root_name = getAggregateRootName(SnapshotAwareAggregateRoot);

            await knexConnection<EventRow>(schema + ".es-events").insert([
                {
                    aggregate_root_id: aggregateRootId,
                    aggregate_root_name,
                    aggregate_root_version: 3,
                    created_at: ev0Date,
                    event_name: "sql-event-0",
                    id: ev0Id,
                    payload: JSON.stringify({ data: "event0" })
                },
                {
                    aggregate_root_id: aggregateRootId,
                    aggregate_root_name,
                    aggregate_root_version: 5,
                    created_at: ev1Date,
                    event_name: "sql-event-1",
                    id: ev1Id,
                    payload: JSON.stringify({ data: "event1" })
                },
                // should not be included due to strict aggregate_root_version query ">"
                {
                    aggregate_root_id: aggregateRootId,
                    aggregate_root_name,
                    aggregate_root_version: 10,
                    created_at: ev2Date,
                    event_name: "sql-event-2",
                    id: ev2Id,
                    payload: JSON.stringify({ data: "event2" })
                },
                {
                    aggregate_root_id: aggregateRootId,
                    aggregate_root_name,
                    aggregate_root_version: 11,
                    created_at: ev3Date,
                    event_name: "sql-event-3",
                    id: ev3Id,
                    payload: JSON.stringify({ data: "event3" })
                },
                {
                    aggregate_root_id: aggregateRootId,
                    aggregate_root_name,
                    aggregate_root_version: 15,
                    created_at: ev4Date,
                    event_name: "sql-event-4",
                    id: ev4Id,
                    payload: JSON.stringify({ data: "event4" })
                }
            ]);

            const snapshotPayload: TestSnapshot = { someData: "snapshot-data" };
            const snapshot = StoredSnapshot.create(snapshotId, 10, snapshotRevision, snapshotPayload, aggregateRootId);
            snapshotStore.findLatestSnapshotByAggregateId.mockResolvedValue(snapshot);

            const result = await eventStore.findWithSnapshot(SnapshotAwareAggregateRoot, aggregateRootId);

            // snapshot was created on 10th version -> should return events with 11 & 15 versions
            expect(result.snapshot).toEqual(snapshotPayload);
            expect(result.events.length).toBe(2);

            expect(result.events[0].id).toBe(ev3Id);
            expect(result.events[0].aggregateRootVersion).toBe(11);
            expect(result.events[0].eventName).toBe("sql-event-3");
            expect(result.events[0].aggregateRootId).toBe(aggregateRootId);
            expect(result.events[0].aggregateRootName).toBe(aggregate_root_name);
            expect(result.events[0].payload).toEqual({ data: "event3" });
            expect(result.events[0].createdAt).toEqual(ev3Date);

            expect(result.events[1].id).toBe(ev4Id);
            expect(result.events[1].aggregateRootVersion).toBe(15);
            expect(result.events[1].eventName).toBe("sql-event-4");
            expect(result.events[1].aggregateRootId).toBe(aggregateRootId);
            expect(result.events[1].aggregateRootName).toBe(aggregate_root_name);
            expect(result.events[1].payload).toEqual({ data: "event4" });
            expect(result.events[1].createdAt).toEqual(ev4Date);
        });

        test("returns snapshot and all events when snapshot version is at the beginning", async () => {
            const aggregateRootId = randomUUID();
            const snapshotId = randomUUID();
            const ev1Id = randomUUID();
            const ev2Id = randomUUID();
            const aggregate_root_name = getAggregateRootName(SnapshotAwareAggregateRoot);
            const ev1Date = new Date();
            const ev2Date = new Date();

            await knexConnection(schema + ".es-aggregates").insert({
                id: aggregateRootId,
                version: 10
            });

            await knexConnection<EventRow>(schema + ".es-events").insert([
                {
                    aggregate_root_id: aggregateRootId,
                    aggregate_root_name: aggregate_root_name,
                    aggregate_root_version: 5,
                    created_at: ev1Date,
                    event_name: "sql-event-1",
                    id: ev1Id,
                    payload: JSON.stringify({ data: "event1" })
                },
                {
                    aggregate_root_id: aggregateRootId,
                    aggregate_root_name: aggregate_root_name,
                    aggregate_root_version: 10,
                    created_at: ev2Date,
                    event_name: "sql-event-2",
                    id: ev2Id,
                    payload: JSON.stringify({ data: "event2" })
                }
            ]);

            const snapshotPayload: TestSnapshot = { someData: "initial-snapshot" };
            const snapshot = StoredSnapshot.create(snapshotId, 0, snapshotRevision, snapshotPayload, aggregateRootId);

            snapshotStore.findLatestSnapshotByAggregateId.mockResolvedValue(snapshot);

            const result = await eventStore.findWithSnapshot(SnapshotAwareAggregateRoot, aggregateRootId);

            expect(result.snapshot).toEqual(snapshotPayload);
            expect(result.events.length).toBe(2);
            expect(result.events[0].aggregateRootVersion).toBe(5);
            expect(result.events[1].aggregateRootVersion).toBe(10);
        });
    });
});
