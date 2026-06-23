import {
    AggregateRoot,
    AggregateRootConfig,
    AggregateRootName,
    DomainEvent,
    DomainEventEmitter,
    EventConcurrencyException,
    getAggregateRootName,
    MissingAggregateRootNameException,
    NoOpSnapshotStore,
    SnapshotAware,
    SnapshotRevisionMismatchException,
    StoredAggregateRoot,
    StoredEvent,
    StoredSnapshot
} from "@event-nest/core";
import { createMock } from "@golevelup/ts-jest";
import { ClientSession, Collection, MongoClient, ObjectId } from "mongodb";

import { MongoEventStore } from "./mongo-event-store";
import { MongoSnapshotStore } from "./mongo-snapshot-store";

interface TestSnapshot {
    someData: string;
}

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
describe("MongoEventStore", () => {
    let eventStore: MongoEventStore;
    let eventsCollection: Collection<any>;
    let aggregatesCollection: Collection<any>;
    let mongoClient: MongoClient;
    const snapshotStore = createMock<MongoSnapshotStore>();

    beforeEach(async () => {
        mongoClient = new MongoClient(process.env["MONGO_URL"] as string);
        eventsCollection = mongoClient.db().collection("events");
        await eventsCollection.deleteMany({});
        aggregatesCollection = mongoClient.db().collection("aggregates");
        await aggregatesCollection.deleteMany({});
        snapshotStore.deleteByAggregateId.mockReturnValue(Promise.resolve());
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

    describe("save", () => {
        test("throws when there's a concurrency issue", async () => {
            const ag = new StoredAggregateRoot(new ObjectId().toHexString(), 5);

            await aggregatesCollection.insertOne({
                _id: new ObjectId(ag.id),
                version: 6
            });

            const stored = StoredEvent.fromPublishedEvent(
                ag.id,
                new ObjectId().toHexString(),
                "Test",
                new TestEvent1(),
                new Date()
            );
            await expect(eventStore.save([stored], ag)).rejects.toThrow(EventConcurrencyException);

            const eventsCount = await eventsCollection.countDocuments();
            expect(eventsCount).toBe(0);

            const storedAggregates = await aggregatesCollection.find({ _id: new ObjectId(ag.id) }).toArray();
            expect(storedAggregates[0].version).toBe(6);

            expect(ag.version).toBe(5);
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
                StoredEvent.fromPublishedEvent(
                    new ObjectId().toHexString(),
                    ag.id,
                    "Test",
                    new TestEvent2(),
                    new Date()
                ),
                StoredEvent.fromPublishedEvent(
                    new ObjectId().toHexString(),
                    ag.id,
                    "Test",
                    new TestEvent1(),
                    new Date()
                )
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

            expect(ag.version).toBe(7);
        });

        test("saves new aggregate with its event", async () => {
            const ag = new StoredAggregateRoot(new ObjectId().toHexString(), 1);

            const events = [
                StoredEvent.fromPublishedEvent(
                    new ObjectId().toHexString(),
                    ag.id,
                    "Test",
                    new TestEvent2(),
                    new Date()
                )
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

        test("two concurrent saves on the same aggregate: one wins, the other throws", async () => {
            const aggregateId = new ObjectId().toHexString();
            await aggregatesCollection.insertOne({ _id: new ObjectId(aggregateId), version: 5 });

            const ag1 = new StoredAggregateRoot(aggregateId, 5);
            const ag2 = new StoredAggregateRoot(aggregateId, 5);

            const event1 = StoredEvent.fromPublishedEvent(
                new ObjectId().toHexString(),
                aggregateId,
                "Test",
                new TestEvent1(),
                new Date()
            );
            const event2 = StoredEvent.fromPublishedEvent(
                new ObjectId().toHexString(),
                aggregateId,
                "Test",
                new TestEvent2(),
                new Date()
            );

            const results = await Promise.allSettled([eventStore.save([event1], ag1), eventStore.save([event2], ag2)]);

            const fulfilled = results.filter((r) => r.status === "fulfilled");
            const rejected = results.filter((r) => r.status === "rejected");

            expect(fulfilled).toHaveLength(1);
            expect(rejected).toHaveLength(1);
            expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(EventConcurrencyException);

            const storedAggregate = await aggregatesCollection.findOne({ _id: new ObjectId(aggregateId) });
            expect(storedAggregate?.version).toBe(6);

            expect([ag1.version, ag2.version].toSorted((a, b) => a - b)).toEqual([5, 6]);

            const storedEvents = await eventsCollection.find({ aggregateRootId: aggregateId }).toArray();
            expect(storedEvents).toHaveLength(1);
            expect(storedEvents[0].aggregateRootVersion).toBe(6);
        });
    });

    describe("findByAggregateRootIds", () => {
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
            const event1Id = new ObjectId().toHexString();
            const event2Id = new ObjectId().toHexString();
            const event3Id = new ObjectId().toHexString();
            const event4Id = new ObjectId().toHexString();

            const event1Date = new Date();
            const event2Date = new Date();
            const event3Date = new Date();
            const event4Date = new Date();

            await eventsCollection.insertOne({
                _id: new ObjectId(event1Id),
                aggregateRootId: aggregateRootId1,
                aggregateRootName: "test-aggregate",
                aggregateRootVersion: 1,
                createdAt: event1Date,
                eventName: "test-event-1",
                payload: {}
            });

            await eventsCollection.insertOne({
                _id: new ObjectId(event2Id),
                aggregateRootId: aggregateRootId2,
                aggregateRootName: "test-aggregate",
                aggregateRootVersion: 2,
                createdAt: event2Date,
                eventName: "test-event-2",
                payload: {}
            });

            await eventsCollection.insertOne({
                _id: new ObjectId(event3Id),
                aggregateRootId: aggregateRootId2,
                aggregateRootName: "test-aggregate",
                aggregateRootVersion: 2,
                createdAt: event3Date,
                eventName: "test-event-2-2",
                payload: {}
            });

            await eventsCollection.insertOne({
                _id: new ObjectId(event4Id),
                aggregateRootId: aggregateRootId3,
                aggregateRootName: "test-aggregate",
                aggregateRootVersion: 2,
                createdAt: event4Date,
                eventName: "test-event-3",
                payload: {}
            });

            await eventsCollection.insertOne({
                _id: new ObjectId(),
                aggregateRootId: "other",
                aggregateRootName: "other",
                aggregateRootVersion: 2,
                createdAt: event4Date,
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
            expect(events[aggregateRootId1][0].id).toBe(event1Id);
            expect(events[aggregateRootId1][0].aggregateRootVersion).toBe(1);
            expect(events[aggregateRootId1][0].eventName).toBe("test-event-1");
            expect(events[aggregateRootId1][0].aggregateRootId).toBe(aggregateRootId1);
            expect(events[aggregateRootId1][0].aggregateRootName).toBe("test-aggregate");
            expect(events[aggregateRootId1][0].payload).toEqual({});
            expect(events[aggregateRootId1][0].createdAt).toEqual(event1Date);

            expect(events[aggregateRootId2].length).toBe(2);
            expect(events[aggregateRootId2][0].id).toBe(event2Id);
            expect(events[aggregateRootId2][0].aggregateRootVersion).toBe(2);
            expect(events[aggregateRootId2][0].eventName).toBe("test-event-2");
            expect(events[aggregateRootId2][0].aggregateRootId).toBe(aggregateRootId2);
            expect(events[aggregateRootId2][0].aggregateRootName).toBe("test-aggregate");
            expect(events[aggregateRootId2][0].payload).toEqual({});
            expect(events[aggregateRootId2][0].createdAt).toEqual(event2Date);

            expect(events[aggregateRootId2][1].id).toBe(event3Id);
            expect(events[aggregateRootId2][1].aggregateRootVersion).toBe(2);
            expect(events[aggregateRootId2][1].eventName).toBe("test-event-2-2");
            expect(events[aggregateRootId2][1].aggregateRootId).toBe(aggregateRootId2);
            expect(events[aggregateRootId2][1].aggregateRootName).toBe("test-aggregate");
            expect(events[aggregateRootId2][1].payload).toEqual({});
            expect(events[aggregateRootId2][1].createdAt).toEqual(event3Date);

            expect(events[aggregateRootId3].length).toBe(1);
            expect(events[aggregateRootId3][0].id).toBe(event4Id);
            expect(events[aggregateRootId3][0].aggregateRootVersion).toBe(2);
            expect(events[aggregateRootId3][0].eventName).toBe("test-event-3");
            expect(events[aggregateRootId3][0].aggregateRootId).toBe(aggregateRootId3);
            expect(events[aggregateRootId3][0].aggregateRootName).toBe("test-aggregate");
            expect(events[aggregateRootId3][0].payload).toEqual({});
            expect(events[aggregateRootId3][0].createdAt).toEqual(event4Date);
        });
    });

    describe("findByAggregateRootId", () => {
        test("returns empty array when no events found", async () => {
            const events = await eventStore.findByAggregateRootId(DecoratedAggregateRoot, new ObjectId().toHexString());
            expect(events).toEqual([]);
        });

        test("returns mapped events when they are found and matched", async () => {
            const id = new ObjectId().toHexString();
            const event1Id = new ObjectId().toHexString();
            const event2Id = new ObjectId().toHexString();

            const event1Date = new Date();
            const event2Date = new Date();

            await eventsCollection.insertOne({
                _id: new ObjectId(event1Id),
                aggregateRootId: id,
                aggregateRootName: "test-aggregate",
                aggregateRootVersion: 1,
                createdAt: event1Date,
                eventName: "test-event-1",
                payload: {}
            });

            await eventsCollection.insertOne({
                _id: new ObjectId(event2Id),
                aggregateRootId: id,
                aggregateRootName: "test-aggregate",
                aggregateRootVersion: 2,
                createdAt: event2Date,
                eventName: "test-event-2",
                payload: {}
            });

            const events = await eventStore.findByAggregateRootId(DecoratedAggregateRoot, id);
            expect(events.length).toBe(2);
            expect(events[0].id).toBe(event1Id);
            expect(events[0].aggregateRootVersion).toBe(1);
            expect(events[0].eventName).toBe("test-event-1");
            expect(events[0].aggregateRootId).toBe(id);
            expect(events[0].aggregateRootName).toBe("test-aggregate");
            expect(events[0].payload).toEqual({});
            expect(events[0].createdAt).toEqual(event1Date);

            expect(events[1].id).toBe(event2Id);
            expect(events[1].aggregateRootVersion).toBe(2);
            expect(events[1].eventName).toBe("test-event-2");
            expect(events[1].aggregateRootId).toBe(id);
            expect(events[1].aggregateRootName).toBe("test-aggregate");
            expect(events[1].payload).toEqual({});
            expect(events[1].createdAt).toEqual(event2Date);
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

    describe("findAggregateRootVersion", () => {
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

    describe("purgeAggregate", () => {
        test("deletes events and aggregate while keeping unrelated data and delegates snapshot deletion to snapshot store", async () => {
            let snapshotSession: ClientSession | undefined;
            let snapshotInTransaction: boolean | undefined;
            snapshotStore.deleteByAggregateId.mockImplementation((_id, session) => {
                snapshotSession = session;
                snapshotInTransaction = session?.inTransaction();
                return Promise.resolve();
            });

            const aggregateId = new ObjectId().toHexString();
            const otherAggregateId = new ObjectId().toHexString();

            await aggregatesCollection.insertMany([
                { _id: new ObjectId(aggregateId), version: 2 },
                { _id: new ObjectId(otherAggregateId), version: 4 }
            ]);

            await eventsCollection.insertMany([
                {
                    _id: new ObjectId(),
                    aggregateRootId: aggregateId,
                    aggregateRootName: "test-aggregate",
                    aggregateRootVersion: 1,
                    createdAt: new Date(),
                    eventName: "test-event-1",
                    payload: {}
                },
                {
                    _id: new ObjectId(),
                    aggregateRootId: otherAggregateId,
                    aggregateRootName: "test-aggregate",
                    aggregateRootVersion: 1,
                    createdAt: new Date(),
                    eventName: "test-event-2",
                    payload: {}
                }
            ]);

            await eventStore.purgeAggregate(aggregateId);

            expect(await aggregatesCollection.findOne({ _id: new ObjectId(aggregateId) })).toBeNull();
            expect(await aggregatesCollection.findOne({ _id: new ObjectId(otherAggregateId) })).toBeDefined();
            expect(await eventsCollection.countDocuments({ aggregateRootId: aggregateId })).toBe(0);
            expect(await eventsCollection.countDocuments({ aggregateRootId: otherAggregateId })).toBe(1);

            expect(snapshotStore.deleteByAggregateId).toHaveBeenCalledTimes(1);
            expect(snapshotStore.deleteByAggregateId).toHaveBeenCalledWith(aggregateId, expect.any(ClientSession));
            expect(snapshotInTransaction).toBe(true);
            expect(snapshotSession?.hasEnded).toBe(true);
        });

        test("is a no-op for unknown aggregate id", async () => {
            snapshotStore.deleteByAggregateId.mockReturnValue(Promise.resolve());

            const aggregateId = new ObjectId().toHexString();
            const otherAggregateId = new ObjectId().toHexString();

            await aggregatesCollection.insertOne({ _id: new ObjectId(otherAggregateId), version: 1 });
            await eventsCollection.insertOne({
                _id: new ObjectId(),
                aggregateRootId: otherAggregateId,
                aggregateRootName: "test-aggregate",
                aggregateRootVersion: 1,
                createdAt: new Date(),
                eventName: "test-event-1",
                payload: {}
            });

            await expect(eventStore.purgeAggregate(aggregateId)).resolves.toBeUndefined();

            expect(await aggregatesCollection.countDocuments()).toBe(1);
            expect(await eventsCollection.countDocuments()).toBe(1);

            expect(snapshotStore.deleteByAggregateId).toHaveBeenCalledTimes(1);
            expect(snapshotStore.deleteByAggregateId).toHaveBeenCalledWith(aggregateId, expect.any(ClientSession));
        });

        test("succeeds when snapshots are disabled (NoOpSnapshotStore)", async () => {
            const storeWithoutSnapshots = new MongoEventStore(
                createMock<DomainEventEmitter>(),
                new NoOpSnapshotStore(),
                mongoClient,
                "aggregates",
                "events"
            );

            const aggregateId = new ObjectId().toHexString();
            await aggregatesCollection.insertOne({ _id: new ObjectId(aggregateId), version: 1 });
            await eventsCollection.insertOne({
                _id: new ObjectId(),
                aggregateRootId: aggregateId,
                aggregateRootName: "test-aggregate",
                aggregateRootVersion: 1,
                createdAt: new Date(),
                eventName: "test-event-1",
                payload: {}
            });

            await expect(storeWithoutSnapshots.purgeAggregate(aggregateId)).resolves.toBeUndefined();

            expect(await aggregatesCollection.findOne({ _id: new ObjectId(aggregateId) })).toBeNull();
            expect(await eventsCollection.countDocuments({ aggregateRootId: aggregateId })).toBe(0);
        });
    });

    test("generateEntityId - returns string with ObjectId format", async () => {
        const id = await eventStore.generateEntityId();
        expect(ObjectId.isValid(id)).toBe(true);
    });

    describe("findWithSnapshot", () => {
        test("returns no snapshot when no snapshot created", async () => {
            const aggregateRootId = new ObjectId().toHexString();
            await aggregatesCollection.insertOne({
                _id: new ObjectId(aggregateRootId),
                version: 10
            });
            const event0Id = new ObjectId().toHexString();
            const event1Id = new ObjectId().toHexString();

            const event0Date = new Date();
            const event1Date = new Date();

            const aggregateRootName = getAggregateRootName(SnapshotAwareAggregateRoot);
            await eventsCollection.insertOne({
                _id: new ObjectId(event0Id),
                aggregateRootId: aggregateRootId,
                aggregateRootName,
                aggregateRootVersion: 3,
                createdAt: event0Date,
                eventName: "test-event-0",
                payload: { data: "event0" }
            });
            await eventsCollection.insertOne({
                _id: new ObjectId(event1Id),
                aggregateRootId: aggregateRootId,
                aggregateRootName,
                aggregateRootVersion: 5,
                createdAt: event1Date,
                eventName: "test-event-1",
                payload: { data: "event1" }
            });

            const latestSnapshot = undefined;
            snapshotStore.findLatestSnapshotByAggregateId.mockResolvedValue(latestSnapshot);

            const res = await eventStore.findWithSnapshot(SnapshotAwareAggregateRoot, aggregateRootId);
            expect(res.snapshot).toBeUndefined();
            expect(res.events.length).toEqual(2);
            expect(res.events[0].id).toBe(event0Id);
            expect(res.events[0].aggregateRootVersion).toBe(3);
            expect(res.events[0].eventName).toBe("test-event-0");
            expect(res.events[0].aggregateRootId).toBe(aggregateRootId);
            expect(res.events[0].aggregateRootName).toBe(aggregateRootName);
            expect(res.events[0].payload).toEqual({ data: "event0" });
            expect(res.events[0].createdAt).toEqual(event0Date);

            expect(res.events[1].id).toBe(event1Id);
            expect(res.events[1].aggregateRootVersion).toBe(5);
            expect(res.events[1].eventName).toBe("test-event-1");
            expect(res.events[1].aggregateRootId).toBe(aggregateRootId);
            expect(res.events[1].aggregateRootName).toBe(aggregateRootName);
            expect(res.events[1].payload).toEqual({ data: "event1" });
            expect(res.events[1].createdAt).toEqual(event1Date);
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
            const event0Id = new ObjectId().toHexString();
            const event1Id = new ObjectId().toHexString();
            const event2Id = new ObjectId().toHexString();
            const event3Id = new ObjectId().toHexString();
            const event4Id = new ObjectId().toHexString();

            const event0Date = new Date();
            const event1Date = new Date();
            const event2Date = new Date();
            const event3Date = new Date();
            const event4Date = new Date();

            await aggregatesCollection.insertOne({
                _id: new ObjectId(aggregateRootId),
                version: 15
            });

            await eventsCollection.insertOne({
                _id: new ObjectId(event0Id),
                aggregateRootId: aggregateRootId,
                aggregateRootName: "snapshot-aggregate",
                aggregateRootVersion: 3,
                createdAt: event0Date,
                eventName: "test-event-0",
                payload: { data: "event0" }
            });
            await eventsCollection.insertOne({
                _id: new ObjectId(event1Id),
                aggregateRootId: aggregateRootId,
                aggregateRootName: "snapshot-aggregate",
                aggregateRootVersion: 5,
                createdAt: event1Date,
                eventName: "test-event-1",
                payload: { data: "event1" }
            });
            await eventsCollection.insertOne({
                _id: new ObjectId(event2Id),
                aggregateRootId: aggregateRootId,
                aggregateRootName: "snapshot-aggregate",
                aggregateRootVersion: 10,
                createdAt: event2Date,
                eventName: "test-event-2",
                payload: { data: "event2" }
            });

            await eventsCollection.insertOne({
                _id: new ObjectId(event3Id),
                aggregateRootId: aggregateRootId,
                aggregateRootName: "snapshot-aggregate",
                aggregateRootVersion: 11,
                createdAt: event3Date,
                eventName: "test-event-3",
                payload: { data: "event3" }
            });
            await eventsCollection.insertOne({
                _id: new ObjectId(event4Id),
                aggregateRootId: aggregateRootId,
                aggregateRootName: "snapshot-aggregate",
                aggregateRootVersion: 15,
                createdAt: event4Date,
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
            const event0Id = new ObjectId().toHexString();
            const event1Id = new ObjectId().toHexString();
            const event2Id = new ObjectId().toHexString();
            const event3Id = new ObjectId().toHexString();
            const event4Id = new ObjectId().toHexString();

            const event0Date = new Date();
            const event1Date = new Date();
            const event2Date = new Date();
            const event3Date = new Date();
            const event4Date = new Date();

            await aggregatesCollection.insertOne({
                _id: new ObjectId(aggregateRootId),
                version: 15
            });

            await eventsCollection.insertOne({
                _id: new ObjectId(event0Id),
                aggregateRootId: aggregateRootId,
                aggregateRootName: "snapshot-aggregate",
                aggregateRootVersion: 3,
                createdAt: event0Date,
                eventName: "test-event-0",
                payload: { data: "event0" }
            });
            await eventsCollection.insertOne({
                _id: new ObjectId(event1Id),
                aggregateRootId: aggregateRootId,
                aggregateRootName: "snapshot-aggregate",
                aggregateRootVersion: 5,
                createdAt: event1Date,
                eventName: "test-event-1",
                payload: { data: "event1" }
            });
            await eventsCollection.insertOne({
                _id: new ObjectId(event2Id),
                aggregateRootId: aggregateRootId,
                aggregateRootName: "snapshot-aggregate",
                aggregateRootVersion: 10,
                createdAt: event2Date,
                eventName: "test-event-2",
                payload: { data: "event2" }
            });

            await eventsCollection.insertOne({
                _id: new ObjectId(event3Id),
                aggregateRootId: aggregateRootId,
                aggregateRootName: "snapshot-aggregate",
                aggregateRootVersion: 11,
                createdAt: event3Date,
                eventName: "test-event-3",
                payload: { data: "event3" }
            });
            await eventsCollection.insertOne({
                _id: new ObjectId(event4Id),
                aggregateRootId: aggregateRootId,
                aggregateRootName: "snapshot-aggregate",
                aggregateRootVersion: 15,
                createdAt: event4Date,
                eventName: "test-event-4",
                payload: { data: "event4" }
            });

            const snapshotPayload: TestSnapshot = { someData: "snapshot-data" };
            const snapshot = StoredSnapshot.create(snapshotId, 10, snapshotRevision, snapshotPayload, aggregateRootId);

            snapshotStore.findLatestSnapshotByAggregateId.mockResolvedValue(snapshot);

            const result = await eventStore.findWithSnapshot(SnapshotAwareAggregateRoot, aggregateRootId);

            expect(result.snapshot).toEqual(snapshotPayload);
            expect(result.events.length).toBe(2);

            expect(result.events[0].id).toBe(event3Id);
            expect(result.events[0].aggregateRootVersion).toBe(11);
            expect(result.events[0].eventName).toBe("test-event-3");
            expect(result.events[0].aggregateRootId).toBe(aggregateRootId);
            expect(result.events[0].aggregateRootName).toBe("snapshot-aggregate");
            expect(result.events[0].payload).toEqual({ data: "event3" });
            expect(result.events[0].createdAt).toEqual(event3Date);

            expect(result.events[1].id).toBe(event4Id);
            expect(result.events[1].aggregateRootVersion).toBe(15);
            expect(result.events[1].eventName).toBe("test-event-4");
            expect(result.events[1].aggregateRootId).toBe(aggregateRootId);
            expect(result.events[1].aggregateRootName).toBe("snapshot-aggregate");
            expect(result.events[1].payload).toEqual({ data: "event4" });
            expect(result.events[1].createdAt).toEqual(event4Date);
        });

        test("returns snapshot and all events when snapshot version is at the beginning", async () => {
            const aggregateRootId = new ObjectId().toHexString();
            const snapshotId = new ObjectId().toHexString();
            const event1Id = new ObjectId().toHexString();
            const event2Id = new ObjectId().toHexString();

            const event1Date = new Date();
            const event2Date = new Date();

            await aggregatesCollection.insertOne({
                _id: new ObjectId(aggregateRootId),
                version: 10
            });

            await eventsCollection.insertOne({
                _id: new ObjectId(event1Id),
                aggregateRootId: aggregateRootId,
                aggregateRootName: "snapshot-aggregate",
                aggregateRootVersion: 5,
                createdAt: event1Date,
                eventName: "test-event-1",
                payload: { data: "event1" }
            });

            await eventsCollection.insertOne({
                _id: new ObjectId(event2Id),
                aggregateRootId: aggregateRootId,
                aggregateRootName: "snapshot-aggregate",
                aggregateRootVersion: 10,
                createdAt: event2Date,
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
});
