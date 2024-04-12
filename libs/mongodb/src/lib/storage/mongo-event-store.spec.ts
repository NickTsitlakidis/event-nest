import { MongoEventStore } from "./mongo-event-store";
import { Collection, MongoClient, ObjectId } from "mongodb";
import { createMock } from "@golevelup/ts-jest";
import {
    AggregateRoot,
    AggregateRootName,
    DomainEventEmitter,
    MissingAggregateRootNameException,
    DomainEvent,
    StoredAggregateRoot,
    StoredEvent,
    EventConcurrencyException
} from "@event-nest/core";

let eventStore: MongoEventStore;
let eventsCollection: Collection<any>;
let aggregatesCollection: Collection<any>;
let mongoClient: MongoClient;

beforeEach(async () => {
    mongoClient = new MongoClient(process.env["MONGO_URL"] as string);
    eventsCollection = mongoClient.db().collection("events");
    await eventsCollection.deleteMany({});
    aggregatesCollection = mongoClient.db().collection("aggregates");
    await aggregatesCollection.deleteMany({});
    eventStore = new MongoEventStore(createMock<DomainEventEmitter>(), mongoClient, "aggregates", "events");
});

afterEach(async () => {
    mongoClient.close(true);
});

@DomainEvent("test-event-1")
class TestEvent1 {}

@DomainEvent("test-event-2")
class TestEvent2 {}

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

describe("save tests", () => {
    test("throws when there's a concurrency issue", async () => {
        const ag = new StoredAggregateRoot(new ObjectId().toHexString(), 5);

        await aggregatesCollection.insertOne({
            _id: new ObjectId(ag.id),
            version: 6
        });

        await expect(
            eventStore.save(
                [
                    StoredEvent.fromPublishedEvent(
                        ag.id,
                        new ObjectId().toHexString(),
                        "Test",
                        new TestEvent1(),
                        new Date()
                    )
                ],
                ag
            )
        ).rejects.toThrow(EventConcurrencyException);

        const eventsCount = await eventsCollection.countDocuments();
        expect(eventsCount).toBe(0);

        const storedAggregates = await aggregatesCollection.find({ _id: new ObjectId(ag.id) }).toArray();
        expect(storedAggregates[0].version).toBe(6);
    });

    test("is no op for no events", async () => {
        const ag = new StoredAggregateRoot(new ObjectId().toHexString(), 5);

        await eventStore.save([], ag);

        const eventsCount = await eventsCollection.countDocuments();
        expect(eventsCount).toBe(0);

        const aggregatesCount = await aggregatesCollection.countDocuments();
        expect(aggregatesCount).toBe(0);
    });

    test("increases version and stores events and aggregate", async () => {
        const ag = new StoredAggregateRoot(new ObjectId().toHexString(), 5);

        await aggregatesCollection.insertOne({
            _id: new ObjectId(ag.id),
            version: 5
        });

        const events = [
            StoredEvent.fromPublishedEvent(new ObjectId().toHexString(), ag.id, "Test", new TestEvent2(), new Date()),
            StoredEvent.fromPublishedEvent(new ObjectId().toHexString(), ag.id, "Test", new TestEvent1(), new Date())
        ];

        const saved = await eventStore.save(events, ag);

        const storedAggregates = await aggregatesCollection.find({ _id: new ObjectId(ag.id) }).toArray();
        expect(storedAggregates[0].version).toBe(7);

        const storedEvents = await eventsCollection.find({}).toArray();
        expect(storedEvents.length).toBe(2);

        expect(storedEvents[0].eventName).toBe("test-event-2");
        expect(storedEvents[0].aggregateRootId).toBe(ag.id);
        expect(storedEvents[0].aggregateRootVersion).toBe(6);
        expect(storedEvents[0].aggregateRootName).toBe("Test");
        expect(storedEvents[0].payload).toEqual(events[0].payload);
        expect(storedEvents[0].createdAt).toEqual(events[0].createdAt);
        expect(storedEvents[0]._id.toHexString()).toBe(events[0].id);

        expect(storedEvents[1].eventName).toBe("test-event-1");
        expect(storedEvents[1].aggregateRootId).toBe(ag.id);
        expect(storedEvents[1].aggregateRootVersion).toBe(7);
        expect(storedEvents[1].aggregateRootName).toBe("Test");
        expect(storedEvents[1].payload).toEqual(events[1].payload);
        expect(storedEvents[1].createdAt).toEqual(events[1].createdAt);
        expect(storedEvents[1]._id.toHexString()).toBe(events[1].id);

        expect(saved).toEqual(events);
        expect(saved[0].aggregateRootVersion).toBe(6);
        expect(saved[1].aggregateRootVersion).toBe(7);
    });

    test("saves new aggregate with its event", async () => {
        const ag = new StoredAggregateRoot(new ObjectId().toHexString(), 1);

        const events = [
            StoredEvent.fromPublishedEvent(new ObjectId().toHexString(), ag.id, "Test", new TestEvent2(), new Date())
        ];

        const saved = await eventStore.save(events, ag);

        const storedAggregate = await aggregatesCollection.findOne({ _id: new ObjectId(ag.id) });
        expect(storedAggregate.version).toBe(1);

        const storedEvents = await eventsCollection.find({}).toArray();
        expect(storedEvents.length).toBe(1);

        expect(storedEvents[0].eventName).toBe("test-event-2");
        expect(storedEvents[0].aggregateRootId).toBe(ag.id);
        expect(storedEvents[0].aggregateRootVersion).toBe(1);
        expect(storedEvents[0].aggregateRootName).toBe("Test");
        expect(storedEvents[0].payload).toEqual(events[0].payload);
        expect(storedEvents[0].createdAt).toEqual(events[0].createdAt);
        expect(storedEvents[0]._id.toHexString()).toBe(events[0].id);

        expect(saved).toEqual(events);
        expect(saved[0].aggregateRootVersion).toBe(1);
    });
});

describe("findByAggregateRootId tests", () => {
    test("returns empty array when no events found", async () => {
        const events = await eventStore.findByAggregateRootId(DecoratedAggregateRoot, new ObjectId().toHexString());
        expect(events).toEqual([]);
    });

    test("returns mapped events when they are found and matched", async () => {
        const id = new ObjectId().toHexString();
        const ev1Id = new ObjectId().toHexString();
        const ev2Id = new ObjectId().toHexString();

        const ev1Date = new Date();
        const ev2Date = new Date();

        await eventsCollection.insertOne({
            _id: new ObjectId(ev1Id),
            aggregateRootId: id,
            aggregateRootName: "test-aggregate",
            aggregateRootVersion: 1,
            eventName: "test-event-1",
            payload: {},
            createdAt: ev1Date
        });

        await eventsCollection.insertOne({
            _id: new ObjectId(ev2Id),
            aggregateRootId: id,
            aggregateRootName: "test-aggregate",
            aggregateRootVersion: 2,
            eventName: "test-event-2",
            payload: {},
            createdAt: ev2Date
        });

        const events = await eventStore.findByAggregateRootId(DecoratedAggregateRoot, id);
        expect(events.length).toBe(2);
        expect(events[0].id).toBe(ev1Id);
        expect(events[0].aggregateRootVersion).toBe(1);
        expect(events[0].eventName).toBe("test-event-1");
        expect(events[0].aggregateRootId).toBe(id);
        expect(events[0].aggregateRootName).toBe("test-aggregate");
        expect(events[0].payload).toEqual({});
        expect(events[0].createdAt).toEqual(ev1Date);

        expect(events[1].id).toBe(ev2Id);
        expect(events[1].aggregateRootVersion).toBe(2);
        expect(events[1].eventName).toBe("test-event-2");
        expect(events[1].aggregateRootId).toBe(id);
        expect(events[1].aggregateRootName).toBe("test-aggregate");
        expect(events[1].payload).toEqual({});
        expect(events[1].createdAt).toEqual(ev2Date);
    });

    test("returns empty array when events don't match the aggregate", async () => {
        const id = new ObjectId().toHexString();

        await eventsCollection.insertOne({
            _id: new ObjectId(),
            aggregateRootId: id,
            aggregateRootName: "Other",
            aggregateRootVersion: 1,
            eventName: "test-event-1",
            payload: {},
            createdAt: new Date()
        });

        const events = await eventStore.findByAggregateRootId(DecoratedAggregateRoot, id);
        expect(events).toEqual([]);
    });

    test("throws when aggregate is not decorated", async () => {
        const id = new ObjectId().toHexString();

        await eventsCollection.insertOne({
            _id: new ObjectId(),
            aggregateRootId: id,
            aggregateRootName: "Other",
            aggregateRootVersion: 1,
            eventName: "test-event-1",
            payload: {},
            createdAt: new Date()
        });

        await expect(eventStore.findByAggregateRootId(UndecoratedAggregateRoot, id)).rejects.toThrow(
            MissingAggregateRootNameException
        );
    });
});

describe("findAggregateRootVersion tests", () => {
    test("return -1 when the document is not found", async () => {
        await aggregatesCollection.insertOne({
            _id: new ObjectId(),
            version: 5
        });
        const version = await eventStore.findAggregateRootVersion(new ObjectId().toHexString());
        expect(version).toBe(-1);
    });

    test("return -1 when the version is missing", async () => {
        const id = new ObjectId();
        await aggregatesCollection.insertOne({
            _id: id,
            other: 5
        });
        const version = await eventStore.findAggregateRootVersion(id.toHexString());
        expect(version).toBe(-1);
    });

    test("return version when document is found", async () => {
        const id = new ObjectId();
        await aggregatesCollection.insertOne({
            _id: id,
            version: 5
        });
        const version = await eventStore.findAggregateRootVersion(id.toHexString());
        expect(version).toBe(5);
    });
});

test("generateEntityId - returns string with ObjectId format", async () => {
    const id = await eventStore.generateEntityId();
    expect(ObjectId.isValid(id)).toBe(true);
});
