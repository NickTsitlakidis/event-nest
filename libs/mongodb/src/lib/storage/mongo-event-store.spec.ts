import {
    AggregateRoot,
    AggregateRootConfig,
    AggregateRootName,
    DomainEvent,
    DomainEventEmitter,
    EventConcurrencyException,
    MissingAggregateRootNameException,
    SnapshotAware,
    SnapshotRevisionMismatchException,
    StoredAggregateRoot,
    StoredEvent,
    StoredSnapshot
} from "@event-nest/core";
import { createMock } from "@golevelup/ts-jest";
import { Collection, MongoClient, ObjectId } from "mongodb";

import { MongoEventStore } from "./mongo-event-store";
import { MongoSnapshotStore } from "./mongo-snapshot-store";

let eventStore: MongoEventStore;
let eventsCollection: Collection<any>;
let aggregatesCollection: Collection<any>;
let mongoClient: MongoClient;
const snapshotStore = createMock<MongoSnapshotStore>();

interface TestSnapshot {
    someData: string;
}

beforeEach(async () => {
    mongoClient = new MongoClient(process.env["MONGO_URL"] as string);
    eventsCollection = mongoClient.db().collection("events");
    await eventsCollection.deleteMany({});
    aggregatesCollection = mongoClient.db().collection("aggregates");
    await aggregatesCollection.deleteMany({});
    eventStore = new MongoEventStore(
        createMock<DomainEventEmitter>(),
        snapshotStore,
        mongoClient,
        "aggregates",
        "events"
    );
});

afterEach(async () => {
    await mongoClient.close(true);
});

@AggregateRootName("test-aggregate")
class DecoratedAggregateRoot extends AggregateRoot {
    constructor(id: string) {
        super(id);
    }
}

const snapshotRevision = 3;
@AggregateRootConfig({ name: "snapshot-aggregate", snapshotRevision })
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

@DomainEvent("test-event-1")
class TestEvent1 {}

@DomainEvent("test-event-2")
class TestEvent2 {}

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

describe("findByAggregateRootIds tests", () => {
    test("returns empty object when no events found", async () => {
        const events = await eventStore.findByAggregateRootIds(DecoratedAggregateRoot, [
            new ObjectId().toHexString(),
            new ObjectId().toHexString(),
            new ObjectId().toHexString()
        ]);
        expect(events).toEqual({});
    });

    test("returns mapped events when they are found and matched", async () => {
        const aggregateRootId1 = new ObjectId().toHexString();
        const aggregateRootId2 = new ObjectId().toHexString();
        const aggregateRootId3 = new ObjectId().toHexString();
        const ev1Id = new ObjectId().toHexString();
        const ev2Id = new ObjectId().toHexString();
        const ev3Id = new ObjectId().toHexString();
        const ev4Id = new ObjectId().toHexString();

        const ev1Date = new Date();
        const ev2Date = new Date();
        const ev3Date = new Date();
        const ev4Date = new Date();

        await eventsCollection.insertOne({
            _id: new ObjectId(ev1Id),
            aggregateRootId: aggregateRootId1,
            aggregateRootName: "test-aggregate",
            aggregateRootVersion: 1,
            createdAt: ev1Date,
            eventName: "test-event-1",
            payload: {}
        });

        await eventsCollection.insertOne({
            _id: new ObjectId(ev2Id),
            aggregateRootId: aggregateRootId2,
            aggregateRootName: "test-aggregate",
            aggregateRootVersion: 2,
            createdAt: ev2Date,
            eventName: "test-event-2",
            payload: {}
        });

        await eventsCollection.insertOne({
            _id: new ObjectId(ev3Id),
            aggregateRootId: aggregateRootId2,
            aggregateRootName: "test-aggregate",
            aggregateRootVersion: 2,
            createdAt: ev3Date,
            eventName: "test-event-2-2",
            payload: {}
        });

        await eventsCollection.insertOne({
            _id: new ObjectId(ev4Id),
            aggregateRootId: aggregateRootId3,
            aggregateRootName: "test-aggregate",
            aggregateRootVersion: 2,
            createdAt: ev4Date,
            eventName: "test-event-3",
            payload: {}
        });

        await eventsCollection.insertOne({
            _id: new ObjectId(),
            aggregateRootId: "other",
            aggregateRootName: "other",
            aggregateRootVersion: 2,
            createdAt: ev4Date,
            eventName: "other-event",
            payload: {}
        });

        const events = await eventStore.findByAggregateRootIds(DecoratedAggregateRoot, [
            aggregateRootId1,
            aggregateRootId2,
            aggregateRootId3
        ]);
        expect(Object.keys(events).length).toBe(3);

        expect(events[aggregateRootId1].length).toBe(1);
        expect(events[aggregateRootId1][0].id).toBe(ev1Id);
        expect(events[aggregateRootId1][0].aggregateRootVersion).toBe(1);
        expect(events[aggregateRootId1][0].eventName).toBe("test-event-1");
        expect(events[aggregateRootId1][0].aggregateRootId).toBe(aggregateRootId1);
        expect(events[aggregateRootId1][0].aggregateRootName).toBe("test-aggregate");
        expect(events[aggregateRootId1][0].payload).toEqual({});
        expect(events[aggregateRootId1][0].createdAt).toEqual(ev1Date);

        expect(events[aggregateRootId2].length).toBe(2);
        expect(events[aggregateRootId2][0].id).toBe(ev2Id);
        expect(events[aggregateRootId2][0].aggregateRootVersion).toBe(2);
        expect(events[aggregateRootId2][0].eventName).toBe("test-event-2");
        expect(events[aggregateRootId2][0].aggregateRootId).toBe(aggregateRootId2);
        expect(events[aggregateRootId2][0].aggregateRootName).toBe("test-aggregate");
        expect(events[aggregateRootId2][0].payload).toEqual({});
        expect(events[aggregateRootId2][0].createdAt).toEqual(ev2Date);

        expect(events[aggregateRootId2][1].id).toBe(ev3Id);
        expect(events[aggregateRootId2][1].aggregateRootVersion).toBe(2);
        expect(events[aggregateRootId2][1].eventName).toBe("test-event-2-2");
        expect(events[aggregateRootId2][1].aggregateRootId).toBe(aggregateRootId2);
        expect(events[aggregateRootId2][1].aggregateRootName).toBe("test-aggregate");
        expect(events[aggregateRootId2][1].payload).toEqual({});
        expect(events[aggregateRootId2][1].createdAt).toEqual(ev3Date);

        expect(events[aggregateRootId3].length).toBe(1);
        expect(events[aggregateRootId3][0].id).toBe(ev4Id);
        expect(events[aggregateRootId3][0].aggregateRootVersion).toBe(2);
        expect(events[aggregateRootId3][0].eventName).toBe("test-event-3");
        expect(events[aggregateRootId3][0].aggregateRootId).toBe(aggregateRootId3);
        expect(events[aggregateRootId3][0].aggregateRootName).toBe("test-aggregate");
        expect(events[aggregateRootId3][0].payload).toEqual({});
        expect(events[aggregateRootId3][0].createdAt).toEqual(ev4Date);
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
            createdAt: ev1Date,
            eventName: "test-event-1",
            payload: {}
        });

        await eventsCollection.insertOne({
            _id: new ObjectId(ev2Id),
            aggregateRootId: id,
            aggregateRootName: "test-aggregate",
            aggregateRootVersion: 2,
            createdAt: ev2Date,
            eventName: "test-event-2",
            payload: {}
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
            createdAt: new Date(),
            eventName: "test-event-1",
            payload: {}
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
            createdAt: new Date(),
            eventName: "test-event-1",
            payload: {}
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

describe("findWithSnapshot tests", () => {
    test("returns no snpashot when no snapshot created", async () => {
        const aggregateRootId = new ObjectId().toHexString();
        await aggregatesCollection.insertOne({
            _id: new ObjectId(aggregateRootId),
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
        const aggregateRootId = new ObjectId().toHexString();
        const snapshotId = new ObjectId().toHexString();

        await aggregatesCollection.insertOne({
            _id: new ObjectId(aggregateRootId),
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
        const aggregateRootId = new ObjectId().toHexString();

        await expect(eventStore.findWithSnapshot(UndecoratedAggregateRoot as any, aggregateRootId)).rejects.toThrow(
            MissingAggregateRootNameException
        );
    });

    test("returns snapshot and empty events array when no events exist after snapshot", async () => {
        const aggregateRootId = new ObjectId().toHexString();
        const ev0Id = new ObjectId().toHexString();
        const ev1Id = new ObjectId().toHexString();
        const ev2Id = new ObjectId().toHexString();
        const ev3Id = new ObjectId().toHexString();
        const ev4Id = new ObjectId().toHexString();

        const ev0Date = new Date();
        const ev1Date = new Date();
        const ev2Date = new Date();
        const ev3Date = new Date();
        const ev4Date = new Date();

        await aggregatesCollection.insertOne({
            _id: new ObjectId(aggregateRootId),
            version: 15
        });

        await eventsCollection.insertOne({
            _id: new ObjectId(ev0Id),
            aggregateRootId: aggregateRootId,
            aggregateRootName: "snapshot-aggregate",
            aggregateRootVersion: 3,
            createdAt: ev0Date,
            eventName: "test-event-0",
            payload: { data: "event0" }
        });
        await eventsCollection.insertOne({
            _id: new ObjectId(ev1Id),
            aggregateRootId: aggregateRootId,
            aggregateRootName: "snapshot-aggregate",
            aggregateRootVersion: 5,
            createdAt: ev1Date,
            eventName: "test-event-1",
            payload: { data: "event1" }
        });
        await eventsCollection.insertOne({
            _id: new ObjectId(ev2Id),
            aggregateRootId: aggregateRootId,
            aggregateRootName: "snapshot-aggregate",
            aggregateRootVersion: 10,
            createdAt: ev2Date,
            eventName: "test-event-2",
            payload: { data: "event2" }
        });

        await eventsCollection.insertOne({
            _id: new ObjectId(ev3Id),
            aggregateRootId: aggregateRootId,
            aggregateRootName: "snapshot-aggregate",
            aggregateRootVersion: 11,
            createdAt: ev3Date,
            eventName: "test-event-3",
            payload: { data: "event3" }
        });
        await eventsCollection.insertOne({
            _id: new ObjectId(ev4Id),
            aggregateRootId: aggregateRootId,
            aggregateRootName: "snapshot-aggregate",
            aggregateRootVersion: 15,
            createdAt: ev4Date,
            eventName: "test-event-4",
            payload: { data: "event4" }
        });

        snapshotStore.findLatestSnapshotByAggregateId.mockResolvedValue(void 0);
        const result = await eventStore.findWithSnapshot(SnapshotAwareAggregateRoot, aggregateRootId);
        expect(result.events.length).toBe(5);
        expect(result.snapshot).toBeUndefined();
    });

    test("returns events from the beginning if no snapshot exists", async () => {
        const aggregateRootId = new ObjectId().toHexString();
        const snapshotId = new ObjectId().toHexString();

        await aggregatesCollection.insertOne({
            _id: new ObjectId(aggregateRootId),
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
        const aggregateRootId = new ObjectId().toHexString();
        const snapshotId = new ObjectId().toHexString();
        const ev0Id = new ObjectId().toHexString();
        const ev1Id = new ObjectId().toHexString();
        const ev2Id = new ObjectId().toHexString();
        const ev3Id = new ObjectId().toHexString();
        const ev4Id = new ObjectId().toHexString();

        const ev0Date = new Date();
        const ev1Date = new Date();
        const ev2Date = new Date();
        const ev3Date = new Date();
        const ev4Date = new Date();

        await aggregatesCollection.insertOne({
            _id: new ObjectId(aggregateRootId),
            version: 15
        });

        await eventsCollection.insertOne({
            _id: new ObjectId(ev0Id),
            aggregateRootId: aggregateRootId,
            aggregateRootName: "snapshot-aggregate",
            aggregateRootVersion: 3,
            createdAt: ev0Date,
            eventName: "test-event-0",
            payload: { data: "event0" }
        });
        await eventsCollection.insertOne({
            _id: new ObjectId(ev1Id),
            aggregateRootId: aggregateRootId,
            aggregateRootName: "snapshot-aggregate",
            aggregateRootVersion: 5,
            createdAt: ev1Date,
            eventName: "test-event-1",
            payload: { data: "event1" }
        });
        await eventsCollection.insertOne({
            _id: new ObjectId(ev2Id),
            aggregateRootId: aggregateRootId,
            aggregateRootName: "snapshot-aggregate",
            aggregateRootVersion: 10,
            createdAt: ev2Date,
            eventName: "test-event-2",
            payload: { data: "event2" }
        });

        await eventsCollection.insertOne({
            _id: new ObjectId(ev3Id),
            aggregateRootId: aggregateRootId,
            aggregateRootName: "snapshot-aggregate",
            aggregateRootVersion: 11,
            createdAt: ev3Date,
            eventName: "test-event-3",
            payload: { data: "event3" }
        });
        await eventsCollection.insertOne({
            _id: new ObjectId(ev4Id),
            aggregateRootId: aggregateRootId,
            aggregateRootName: "snapshot-aggregate",
            aggregateRootVersion: 15,
            createdAt: ev4Date,
            eventName: "test-event-4",
            payload: { data: "event4" }
        });

        const snapshotPayload: TestSnapshot = { someData: "snapshot-data" };
        const snapshot = StoredSnapshot.create(snapshotId, 10, snapshotRevision, snapshotPayload, aggregateRootId);

        snapshotStore.findLatestSnapshotByAggregateId.mockResolvedValue(snapshot);

        const result = await eventStore.findWithSnapshot(SnapshotAwareAggregateRoot, aggregateRootId);

        expect(result.snapshot).toEqual(snapshotPayload);
        expect(result.events.length).toBe(2);

        expect(result.events[0].id).toBe(ev3Id);
        expect(result.events[0].aggregateRootVersion).toBe(11);
        expect(result.events[0].eventName).toBe("test-event-3");
        expect(result.events[0].aggregateRootId).toBe(aggregateRootId);
        expect(result.events[0].aggregateRootName).toBe("snapshot-aggregate");
        expect(result.events[0].payload).toEqual({ data: "event3" });
        expect(result.events[0].createdAt).toEqual(ev3Date);

        expect(result.events[1].id).toBe(ev4Id);
        expect(result.events[1].aggregateRootVersion).toBe(15);
        expect(result.events[1].eventName).toBe("test-event-4");
        expect(result.events[1].aggregateRootId).toBe(aggregateRootId);
        expect(result.events[1].aggregateRootName).toBe("snapshot-aggregate");
        expect(result.events[1].payload).toEqual({ data: "event4" });
        expect(result.events[1].createdAt).toEqual(ev4Date);
    });

    test("returns snapshot and all events when snapshot version is at the beginning", async () => {
        const aggregateRootId = new ObjectId().toHexString();
        const snapshotId = new ObjectId().toHexString();
        const ev1Id = new ObjectId().toHexString();
        const ev2Id = new ObjectId().toHexString();

        const ev1Date = new Date();
        const ev2Date = new Date();

        await aggregatesCollection.insertOne({
            _id: new ObjectId(aggregateRootId),
            version: 10
        });

        await eventsCollection.insertOne({
            _id: new ObjectId(ev1Id),
            aggregateRootId: aggregateRootId,
            aggregateRootName: "snapshot-aggregate",
            aggregateRootVersion: 5,
            createdAt: ev1Date,
            eventName: "test-event-1",
            payload: { data: "event1" }
        });

        await eventsCollection.insertOne({
            _id: new ObjectId(ev2Id),
            aggregateRootId: aggregateRootId,
            aggregateRootName: "snapshot-aggregate",
            aggregateRootVersion: 10,
            createdAt: ev2Date,
            eventName: "test-event-2",
            payload: { data: "event2" }
        });

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
