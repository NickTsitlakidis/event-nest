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
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { randomUUID } from "crypto";
import { knex } from "knex";

import { AggregateRootRow } from "./aggregate-root-row";
import { EventRow } from "./event-row";
import { PostgreSQLEventStore } from "./postgresql-event-store";

let eventStore: PostgreSQLEventStore;
let container: StartedPostgreSqlContainer;
let connectionUri: string;
let knexConnection: knex.Knex;
const schema = "event_nest_tests";

@DomainEvent("sql-event-1")
class SqlEvent1 {}

@DomainEvent("sql-event-2")
class SqlEvent2 {}

@AggregateRootName("test-aggregate")
class DecoratedAggregateRoot extends AggregateRoot {
    constructor(id: string) {
        super(id);
    }
}

class UndecoratedAggregateRoot extends AggregateRoot {
    constructor(id: string) {
        super(id);
    }
}

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
}, 30000);

beforeEach(async () => {
    eventStore = new PostgreSQLEventStore(
        createMock<DomainEventEmitter>(),
        schema,
        "es-aggregates",
        "es-events",
        knexConnection
    );
});

afterAll(async () => {
    await knexConnection.destroy();
    await container.stop();
});

afterEach(async () => {
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
    expect(/^[a-z,0-9,-]{36,36}$/.test(id)).toBe(true);
});
