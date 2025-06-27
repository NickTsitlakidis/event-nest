import {
    AggregateRoot,
    AggregateRootName,
    DomainEvent,
    DomainEventEmitter,
    EventConcurrencyException,
    MissingAggregateRootNameException,
    StoredAggregateRoot,
    StoredEvent
} from "@event-nest/core";
import { createMock } from "@golevelup/ts-jest";
import { MySqlContainer, StartedMySqlContainer } from "@testcontainers/mysql";
import { knex } from "knex";
import { randomUUID } from "node:crypto";

import { AggregateRootRow } from "./aggregate-root-row";
import { EventRow } from "./event-row";
import { MySQLEventStore } from "./mysql-event-store";
import "jest-extended";

let eventStore: MySQLEventStore;
let container: StartedMySqlContainer;
let connectionUri: string;
let knexConnection: knex.Knex;
const database = "event_nest_tests";
const aggregatesTable = "es_aggregates";
const eventsTable = "es_events";

@AggregateRootName("test-aggregate")
class DecoratedAggregateRoot extends AggregateRoot {
    constructor(id: string) {
        super(id);
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

describe("MySQLEventStore", () => {
    beforeAll(async () => {
        container = await new MySqlContainer("mysql:8.0").withDatabase(database).start();
        connectionUri = container.getConnectionUri();
        knexConnection = knex({
            client: "mysql2",
            connection: connectionUri
        });

        // Create tables
        await knexConnection.schema.createTable(aggregatesTable, (table) => {
            table.string("id", 36).primary();
            table.integer("version").notNullable();
        });

        await knexConnection.schema.createTable(eventsTable, (table) => {
            table.string("id", 36).primary();
            table.string("aggregate_root_id", 36).notNullable();
            table.integer("aggregate_root_version").notNullable();
            table.text("aggregate_root_name").notNullable();
            table.text("event_name").notNullable();
            table.json("payload").notNullable();
            table.specificType("created_at", "DATETIME(3)").notNullable();
            table.foreign("aggregate_root_id").references("id").inTable(aggregatesTable);
        });
    }, 90_000);

    beforeEach(async () => {
        eventStore = new MySQLEventStore(
            createMock<DomainEventEmitter>(),
            database,
            aggregatesTable,
            eventsTable,
            knexConnection
        );
    });

    afterAll(async () => {
        await knexConnection.destroy();
        await container.stop();
    });

    afterEach(async () => {
        await knexConnection(eventsTable).delete();
        await knexConnection(aggregatesTable).delete();
    });

    describe("findAggregateRootVersion", () => {
        test("returns -1 when the aggregate root is not found", async () => {
            await knexConnection(aggregatesTable).insert({
                id: randomUUID(),
                version: 33
            });
            const version = await eventStore.findAggregateRootVersion(randomUUID());
            expect(version).toBe(-1);
        });

        test("returns version when aggregate root is found", async () => {
            const id = randomUUID();
            await knexConnection(aggregatesTable).insert({
                id: id,
                version: 88
            });
            const version = await eventStore.findAggregateRootVersion(id);
            expect(version).toBe(88);
        });
    });

    describe("findByAggregateRootIds", () => {
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

            await knexConnection(aggregatesTable).insert({
                id: aggregateRootId1,
                version: 11
            });

            await knexConnection(aggregatesTable).insert({
                id: aggregateRootId2,
                version: 11
            });

            await knexConnection(aggregatesTable).insert({
                id: aggregateRootId3,
                version: 11
            });

            await knexConnection(aggregatesTable).insert({
                id: otherId,
                version: 110
            });

            await knexConnection<EventRow>(eventsTable).insert({
                aggregate_root_id: aggregateRootId1,
                aggregate_root_name: "test-aggregate",
                aggregate_root_version: 34,
                created_at: ev1Date,
                event_name: "sql-event-1",
                id: ev1Id,
                payload: "{}"
            });

            await knexConnection<EventRow>(eventsTable).insert({
                aggregate_root_id: aggregateRootId2,
                aggregate_root_name: "test-aggregate",
                aggregate_root_version: 35,
                created_at: ev2Date,
                event_name: "sql-event-2",
                id: ev2Id,
                payload: "{}"
            });

            await knexConnection<EventRow>(eventsTable).insert({
                aggregate_root_id: aggregateRootId2,
                aggregate_root_name: "test-aggregate",
                aggregate_root_version: 12,
                created_at: ev3Date,
                event_name: "sql-event-2-2",
                id: ev3Id,
                payload: "{}"
            });

            await knexConnection<EventRow>(eventsTable).insert({
                aggregate_root_id: aggregateRootId3,
                aggregate_root_name: "test-aggregate",
                aggregate_root_version: 36,
                created_at: ev4Date,
                event_name: "sql-event-3",
                id: ev4Id,
                payload: "{}"
            });

            await knexConnection<EventRow>(eventsTable).insert({
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
            const found2 = events[aggregateRootId2].find((e) => e.id === ev2Id);
            expect(found2).toBeDefined();
            expect(found2!.id).toBe(ev2Id);
            expect(found2!.aggregateRootVersion).toBe(35);
            expect(found2!.eventName).toBe("sql-event-2");
            expect(found2!.aggregateRootId).toBe(aggregateRootId2);
            expect(found2!.aggregateRootName).toBe("test-aggregate");
            expect(found2!.payload).toEqual({});
            expect(found2!.createdAt).toEqual(ev2Date);

            const found3 = events[aggregateRootId2].find((e) => e.id === ev3Id);
            expect(found3).toBeDefined();

            expect(found3!.id).toBe(ev3Id);
            expect(found3!.aggregateRootVersion).toBe(12);
            expect(found3!.eventName).toBe("sql-event-2-2");
            expect(found3!.aggregateRootId).toBe(aggregateRootId2);
            expect(found3!.aggregateRootName).toBe("test-aggregate");
            expect(found3!.payload).toEqual({});
            expect(found3!.createdAt).toEqual(ev3Date);

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

    describe("findByAggregateRootId", () => {
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

            await knexConnection(aggregatesTable).insert({
                id: aggregateRootId,
                version: 33
            });

            await knexConnection<EventRow>(eventsTable).insert({
                aggregate_root_id: aggregateRootId,
                aggregate_root_name: "test-aggregate",
                aggregate_root_version: 34,
                created_at: ev1Date,
                event_name: "sql-event-1",
                id: ev1Id,
                payload: "{}"
            });

            await knexConnection<EventRow>(eventsTable).insert({
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
            const found1 = events.find((e) => e.id === ev1Id);
            expect(found1).toBeDefined();
            expect(found1!.id).toBe(ev1Id);
            expect(found1!.aggregateRootVersion).toBe(34);
            expect(found1!.eventName).toBe("sql-event-1");
            expect(found1!.aggregateRootId).toBe(aggregateRootId);
            expect(found1!.aggregateRootName).toBe("test-aggregate");
            expect(found1!.payload).toEqual({});
            expect(found1!.createdAt).toEqual(ev1Date);

            const found2 = events.find((e) => e.id === ev2Id);
            expect(found2).toBeDefined();

            expect(found2!.id).toBe(ev2Id);
            expect(found2!.aggregateRootVersion).toBe(35);
            expect(found2!.eventName).toBe("sql-event-2");
            expect(found2!.aggregateRootId).toBe(aggregateRootId);
            expect(found2!.aggregateRootName).toBe("test-aggregate");
            expect(found2!.payload).toEqual({});
            expect(found2!.createdAt).toEqual(ev2Date);
        });

        test("returns empty array when events don't match the aggregate", async () => {
            const aggregateRootId = randomUUID();
            const ev1Id = randomUUID();

            const ev1Date = new Date();

            await knexConnection(aggregatesTable).insert({
                id: aggregateRootId,
                version: 33
            });

            await knexConnection<EventRow>(eventsTable).insert({
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

            await knexConnection(aggregatesTable).insert({
                id: aggregateRootId,
                version: 33
            });

            await knexConnection<EventRow>(eventsTable).insert({
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

    describe("save", () => {
        test("does nothing for empty events array", async () => {
            const ag = new StoredAggregateRoot(randomUUID(), 5);

            await eventStore.save([], ag);

            const events = await knexConnection(eventsTable).select("*");
            expect(events.length).toBe(0);

            const aggregates = await knexConnection(aggregatesTable).select("*");
            expect(aggregates.length).toBe(0);
        });

        test("throws when there's a concurrency issue", async () => {
            const id = randomUUID();
            const root = new StoredAggregateRoot(id, 5);

            await knexConnection<AggregateRootRow>(aggregatesTable).insert({ id: id, version: 6 });

            await expect(
                eventStore.save(
                    [StoredEvent.fromPublishedEvent(randomUUID(), root.id, "Test", new SqlEvent1(), new Date())],
                    root
                )
            ).rejects.toThrow(EventConcurrencyException);

            const events = await knexConnection(eventsTable).select("*");
            expect(events.length).toBe(0);

            const aggregate = await knexConnection<AggregateRootRow>(aggregatesTable)
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

            const aggregate = await knexConnection<AggregateRootRow>(aggregatesTable)
                .select("*")
                .where("id", rootId)
                .first();
            expect(aggregate!.version).toBe(1);

            const storedEvents = await knexConnection<EventRow>(eventsTable).select("*");
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

            await knexConnection<AggregateRootRow>(aggregatesTable).insert({
                id: rootId,
                version: 38
            });

            const events = [
                StoredEvent.fromPublishedEvent(randomUUID(), rootId, "Test", new SqlEvent2(), new Date()),
                StoredEvent.fromPublishedEvent(randomUUID(), rootId, "Test", new SqlEvent1(), new Date())
            ];

            const saved = await eventStore.save(events, root);

            const storedAggregates = await knexConnection<AggregateRootRow>(aggregatesTable).select("*");
            expect(storedAggregates[0].version).toBe(40);

            const storedEvents = await knexConnection<EventRow>(eventsTable).select("*");
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

    test("databaseConfiguration - returns correct configuration", () => {
        const config = eventStore.databaseConfiguration;
        expect(config.database).toBe(database);
        expect(config.aggregatesTable).toBe(aggregatesTable);
        expect(config.eventsTable).toBe(eventsTable);
        expect(config.databaseAwareAggregatesTable).toBe(`${database}.${aggregatesTable}`);
        expect(config.databaseAwareEventsTable).toBe(`${database}.${eventsTable}`);
    });
});
