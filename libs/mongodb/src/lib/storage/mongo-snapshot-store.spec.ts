import { SnapshotStrategy, StoredSnapshot } from "@event-nest/core";
import { createMock } from "@golevelup/ts-jest";
import { Collection, MongoClient, ObjectId } from "mongodb";

import { MongoSnapshotStore } from "./mongo-snapshot-store";
import { SnapshotDocument } from "./snapshot-document";

let snapshotStore: MongoSnapshotStore;
let snapshotsCollection: Collection<SnapshotDocument>;
let mongoClient: MongoClient;
let snapshotStrategy: SnapshotStrategy;

beforeEach(async () => {
    mongoClient = new MongoClient(process.env["MONGO_URL"] as string);
    snapshotsCollection = mongoClient.db().collection("snapshots");
    await snapshotsCollection.deleteMany({});
    snapshotStrategy = createMock<SnapshotStrategy>();
    snapshotStore = new MongoSnapshotStore(snapshotStrategy, mongoClient, "snapshots");
});

afterEach(async () => {
    await mongoClient.close(true);
});

describe("findLatestSnapshotByAggregateId tests", () => {
    test("returns undefined when collection name is not configured", async () => {
        const storeWithoutCollection = new MongoSnapshotStore(snapshotStrategy, mongoClient);
        const result = await storeWithoutCollection.findLatestSnapshotByAggregateId(new ObjectId().toHexString());

        expect(result).toBeUndefined();
    });

    test("returns undefined when no snapshot is found", async () => {
        const aggregateId = new ObjectId().toHexString();
        const result = await snapshotStore.findLatestSnapshotByAggregateId(aggregateId);

        expect(result).toBeUndefined();
    });

    test("returns the latest snapshot when multiple snapshots exist", async () => {
        const aggregateId = new ObjectId().toHexString();
        const snapshot1Id = new ObjectId();
        const snapshot2Id = new ObjectId();
        const snapshot3Id = new ObjectId();

        const payload1 = { data: "snapshot1" };
        const payload2 = { data: "snapshot2" };
        const payload3 = { data: "snapshot3" };

        await snapshotsCollection.insertOne({
            _id: snapshot1Id,
            aggregateRootId: aggregateId,
            aggregateRootVersion: 5,
            payload: payload1,
            revision: 1
        });

        await snapshotsCollection.insertOne({
            _id: snapshot2Id,
            aggregateRootId: aggregateId,
            aggregateRootVersion: 10,
            payload: payload2,
            revision: 1
        });

        await snapshotsCollection.insertOne({
            _id: snapshot3Id,
            aggregateRootId: aggregateId,
            aggregateRootVersion: 15,
            payload: payload3,
            revision: 1
        });

        const result = await snapshotStore.findLatestSnapshotByAggregateId(aggregateId);

        expect(result).toBeDefined();
        expect(result?.id).toBe(snapshot3Id.toHexString());
        expect(result?.aggregateRootId).toBe(aggregateId);
        expect(result?.aggregateRootVersion).toBe(15);
        expect(result?.revision).toBe(1);
        expect(result?.payload).toEqual(payload3);
    });

    test("returns the correct snapshot when multiple aggregates have snapshots", async () => {
        const aggregateId1 = new ObjectId().toHexString();
        const aggregateId2 = new ObjectId().toHexString();
        const snapshot1Id = new ObjectId();
        const snapshot2Id = new ObjectId();

        const payload1 = { data: "aggregate1" };
        const payload2 = { data: "aggregate2" };

        await snapshotsCollection.insertOne({
            _id: snapshot1Id,
            aggregateRootId: aggregateId1,
            aggregateRootVersion: 5,
            payload: payload1,
            revision: 1
        });

        await snapshotsCollection.insertOne({
            _id: snapshot2Id,
            aggregateRootId: aggregateId2,
            aggregateRootVersion: 10,
            payload: payload2,
            revision: 1
        });

        const result = await snapshotStore.findLatestSnapshotByAggregateId(aggregateId1);

        expect(result).toBeDefined();
        expect(result?.id).toBe(snapshot1Id.toHexString());
        expect(result?.aggregateRootId).toBe(aggregateId1);
        expect(result?.aggregateRootVersion).toBe(5);
        expect(result?.revision).toBe(1);
        expect(result?.payload).toEqual(payload1);
    });

    test("returns snapshot with correct structure", async () => {
        const aggregateId = new ObjectId().toHexString();
        const snapshotId = new ObjectId();
        const payload = { name: "test", nested: { key: "value" }, value: 42 };

        await snapshotsCollection.insertOne({
            _id: snapshotId,
            aggregateRootId: aggregateId,
            aggregateRootVersion: 7,
            payload,
            revision: 2
        });

        const result = await snapshotStore.findLatestSnapshotByAggregateId(aggregateId);

        expect(result).toBeDefined();
        expect(result).toBeInstanceOf(StoredSnapshot);
        expect(result?.id).toBe(snapshotId.toHexString());
        expect(result?.aggregateRootId).toBe(aggregateId);
        expect(result?.aggregateRootVersion).toBe(7);
        expect(result?.revision).toBe(2);
        expect(result?.payload).toEqual(payload);
    });
});

describe("save tests", () => {
    test("returns undefined when collection name is not configured", async () => {
        const storeWithoutCollection = new MongoSnapshotStore(snapshotStrategy, mongoClient);

        const snapshot = StoredSnapshot.create(
            new ObjectId().toHexString(),
            5,
            1,
            { data: "test" },
            new ObjectId().toHexString()
        );

        const result = await storeWithoutCollection.save(snapshot);

        expect(result).toBeUndefined();

        const count = await snapshotsCollection.countDocuments();
        expect(count).toBe(0);
    });

    test("saves snapshot successfully", async () => {
        const snapshotId = new ObjectId().toHexString();
        const aggregateId = new ObjectId().toHexString();
        const payload = { data: "test", value: 123 };

        const snapshot = StoredSnapshot.create(snapshotId, 10, 1, payload, aggregateId);

        const result = await snapshotStore.save(snapshot);

        expect(result).toBe(snapshot);

        const storedSnapshot = await snapshotsCollection.findOne({ _id: new ObjectId(snapshotId) });
        expect(storedSnapshot).toBeDefined();
        expect(storedSnapshot?._id.toHexString()).toBe(snapshotId);
        expect(storedSnapshot?.aggregateRootId).toBe(aggregateId);
        expect(storedSnapshot?.aggregateRootVersion).toBe(10);
        expect(storedSnapshot?.revision).toBe(1);
        expect(storedSnapshot?.payload).toEqual(payload);
    });

    test("saves multiple snapshots for the same aggregate", async () => {
        const aggregateId = new ObjectId().toHexString();
        const snapshot1Id = new ObjectId().toHexString();
        const snapshot2Id = new ObjectId().toHexString();

        const payload1 = { data: "snapshot1" };
        const payload2 = { data: "snapshot2" };

        const snapshot1 = StoredSnapshot.create(snapshot1Id, 5, 1, payload1, aggregateId);
        const snapshot2 = StoredSnapshot.create(snapshot2Id, 10, 1, payload2, aggregateId);

        await snapshotStore.save(snapshot1);
        await snapshotStore.save(snapshot2);

        const count = await snapshotsCollection.countDocuments({ aggregateRootId: aggregateId });
        expect(count).toBe(2);

        const snapshots = await snapshotsCollection.find({ aggregateRootId: aggregateId }).toArray();
        expect(snapshots.length).toBe(2);
    });

    test("saves snapshot with complex payload", async () => {
        const snapshotId = new ObjectId().toHexString();
        const aggregateId = new ObjectId().toHexString();
        const payload = {
            boolean: true,
            name: "complex",
            nested: {
                array: [1, 2, 3],
                object: { key: "value" }
            },
            number: 42.5
        };

        const snapshot = StoredSnapshot.create(snapshotId, 15, 2, payload, aggregateId);

        const result = await snapshotStore.save(snapshot);

        expect(result).toBe(snapshot);

        const storedSnapshot = await snapshotsCollection.findOne({ _id: new ObjectId(snapshotId) });
        expect(storedSnapshot).toBeDefined();
        expect(storedSnapshot?.payload).toEqual(payload);
        expect(storedSnapshot!.payload).toEqual(payload);
    });

    test("saves snapshots for different aggregates", async () => {
        const aggregateId1 = new ObjectId().toHexString();
        const aggregateId2 = new ObjectId().toHexString();
        const snapshot1Id = new ObjectId().toHexString();
        const snapshot2Id = new ObjectId().toHexString();

        const snapshot1 = StoredSnapshot.create(snapshot1Id, 5, 1, { data: "aggregate1" }, aggregateId1);
        const snapshot2 = StoredSnapshot.create(snapshot2Id, 10, 1, { data: "aggregate2" }, aggregateId2);

        await snapshotStore.save(snapshot1);
        await snapshotStore.save(snapshot2);

        const count = await snapshotsCollection.countDocuments();
        expect(count).toBe(2);

        const stored1 = await snapshotsCollection.findOne({ aggregateRootId: aggregateId1 });
        expect(stored1).toBeDefined();
        expect(stored1?._id.toHexString()).toBe(snapshot1Id);

        const stored2 = await snapshotsCollection.findOne({ aggregateRootId: aggregateId2 });
        expect(stored2).toBeDefined();
        expect(stored2?._id.toHexString()).toBe(snapshot2Id);
    });

    test("saves snapshot with different revision numbers", async () => {
        const snapshotId = new ObjectId().toHexString();
        const aggregateId = new ObjectId().toHexString();
        const payload = { data: "test" };

        const snapshot = StoredSnapshot.create(snapshotId, 5, 3, payload, aggregateId);

        await snapshotStore.save(snapshot);

        const storedSnapshot = await snapshotsCollection.findOne({ _id: new ObjectId(snapshotId) });
        expect(storedSnapshot).toBeDefined();
        expect(storedSnapshot?.revision).toBe(3);
    });
});

describe("generateEntityId tests", () => {
    test("returns string with ObjectId format", async () => {
        const id = await snapshotStore.generateEntityId();

        expect(typeof id).toBe("string");
        expect(ObjectId.isValid(id)).toBe(true);
    });

    test("generated id can be used to create ObjectId", async () => {
        const id = await snapshotStore.generateEntityId();

        expect(() => new ObjectId(id)).not.toThrow();

        const objectId = new ObjectId(id);
        expect(objectId.toHexString()).toBe(id);
    });
});
