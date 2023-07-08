import { MongoEventStore } from "./mongo-event-store";
import { Collection, MongoClient, ObjectId } from "mongodb";
import { createMock } from "@golevelup/ts-jest";
import { DomainEventEmitter, RegisteredEvent, StoredAggregateRoot, StoredEvent } from "@event-nest/core";
import { EventConcurrencyException } from "./event-concurrency-exception";

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

@RegisteredEvent("test-event-1")
class TestEvent1 {}

describe("save tests", () => {
    test("throws when there's a concurrency issue", async () => {
        const ag = new StoredAggregateRoot(new ObjectId().toHexString(), 5);

        await aggregatesCollection.insertOne({
            _id: ag.id,
            version: 6
        });

        const stored = await aggregatesCollection.find({}).toArray();

        await expect(
            eventStore.save(
                [StoredEvent.fromPublishedEvent(ag.id, new ObjectId().toHexString(), "Test", new TestEvent1())],
                ag
            )
        ).rejects.toThrow(EventConcurrencyException);

        const eventsCount = await eventsCollection.countDocuments();
        expect(eventsCount).toBe(0);

        const storedAggregates = await aggregatesCollection.find({ _id: new ObjectId(ag.id) }).toArray();
        expect(storedAggregates[0].version).toBe(6);
    });
});
