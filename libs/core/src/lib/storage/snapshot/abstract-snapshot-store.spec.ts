import { createMock } from "@golevelup/ts-jest";
import "reflect-metadata";

import { AggregateRoot } from "../../aggregate-root/aggregate-root";
import { AggregateRootConfig } from "../../aggregate-root/aggregate-root-config";
import { SnapshotAware } from "../../aggregate-root/snapshot-aware";
import { AggregateClassNotSnapshotAwareException } from "../../exceptions/aggregate-class-not-snapshot-aware-exception";
import { AggregateInstanceNotSnapshotAwareException } from "../../exceptions/aggregate-instance-not-snapshot-aware-exception";
import { MissingAggregateRootNameException } from "../../exceptions/missing-aggregate-root-name-exception";
import { SnapshotStrategy } from "../../snapshot-strategy/snapshot-strategy";
import { AbstractSnapshotStore } from "./abstract-snapshot-store";
import { StoredSnapshot } from "./stored-snapshot";

interface TestSnapshot {
    count: number;
    value: string;
}

@AggregateRootConfig({ name: "SnapshotAwareAggregate", snapshotRevision: 1 })
class SnapshotAwareAggregate extends AggregateRoot implements SnapshotAware<TestSnapshot> {
    private _count = 0;
    private _value = "";

    constructor(id: string) {
        super(id);
    }

    get count() {
        return this._count;
    }

    get value() {
        return this._value;
    }

    applySnapshot(snapshot: TestSnapshot): void {
        this._value = snapshot.value;
        this._count = snapshot.count;
    }

    setCount(count: number) {
        this._count = count;
    }

    setValue(value: string) {
        this._value = value;
    }

    toSnapshot(): TestSnapshot {
        return {
            count: this._count,
            value: this._value
        };
    }
}

@AggregateRootConfig({ name: "CustomRevisionAggregate", snapshotRevision: 5 })
class CustomRevisionAggregate extends SnapshotAwareAggregate {
    constructor(id: string) {
        super(id);
    }
}

class NoNameAggregate extends AggregateRoot {
    constructor(id: string) {
        super(id);
    }
}

@AggregateRootConfig({ name: "NoSnapshotMethodsAggregate", snapshotRevision: 1 })
class NoSnapshotMethodsAggregate extends AggregateRoot {
    constructor(id: string) {
        super(id);
    }
}

@AggregateRootConfig({ name: "NoSnapshotRevisionAggregate" })
class NoSnapshotRevisionAggregate extends AggregateRoot implements SnapshotAware<TestSnapshot> {
    constructor(id: string) {
        super(id);
    }

    applySnapshot(): void {}

    toSnapshot(): TestSnapshot {
        return { count: 0, value: "" };
    }
}

class TestSnapshotStore extends AbstractSnapshotStore {
    private snapshots: StoredSnapshot[] = [];

    async findLatestSnapshotByAggregateId(id: string): Promise<StoredSnapshot | undefined> {
        return this.snapshots.find((snapshot) => snapshot.aggregateRootId === id);
    }

    async generateEntityId(): Promise<string> {
        return "generated-snapshot-id";
    }

    async save(snapshot: StoredSnapshot): Promise<StoredSnapshot | undefined> {
        this.snapshots.push(snapshot);
        return snapshot;
    }
}

describe("AbstractSnapshotStore", () => {
    let mockStrategy: jest.Mocked<SnapshotStrategy>;
    let store: TestSnapshotStore;

    beforeEach(() => {
        mockStrategy = createMock<SnapshotStrategy>();
        store = new TestSnapshotStore(mockStrategy);
    });

    describe("create", () => {
        test("creates and saves snapshot for snapshot-aware aggregate", async () => {
            const value = "test-value";
            const count = 5;
            const aggregateRootId = "test-id";
            const aggregateRootVersion = 10;
            const entityId = "generated-snapshot-id";
            const aggregate = new SnapshotAwareAggregate(aggregateRootId);
            aggregate.setValue(value);
            aggregate.setCount(count);
            (aggregate as any)._version = aggregateRootVersion;

            jest.spyOn(store, "generateEntityId").mockResolvedValue(entityId);

            const snapshot = await store.create(aggregate as any);

            expect(snapshot).toBeDefined();
            expect(snapshot?.id).toBe(entityId);
            expect(snapshot?.aggregateRootId).toBe(aggregateRootId);
            expect(snapshot?.aggregateRootVersion).toBe(aggregateRootVersion);
            expect(snapshot?.revision).toBe(1);
            expect(snapshot?.payload).toEqual({
                count,
                value
            });
        });

        test("calls generateEntityId to create snapshot id", async () => {
            const aggregateRootId = "test-id";
            const entityId = "generated-snapshot-id";
            const aggregate = new SnapshotAwareAggregate(aggregateRootId);
            const generateIdSpy = jest.spyOn(store, "generateEntityId").mockResolvedValue(entityId);

            const snapshot = await store.create(aggregate as any);

            expect(generateIdSpy).toHaveBeenCalledTimes(1);
            expect(snapshot?.id).toEqual(entityId);
        });

        test("calls save with created snapshot", async () => {
            const aggregateRootId = "test-id";
            const aggregate = new SnapshotAwareAggregate(aggregateRootId);
            const saveSpy = jest.spyOn(store, "save");

            await store.create(aggregate as any);

            expect(saveSpy).toHaveBeenCalledTimes(1);
            expect(saveSpy).toHaveBeenCalledWith(expect.any(StoredSnapshot));
        });

        test("handles async .toSnapshot method", async () => {
            const aggregateRootId = "test-id";
            const value = "async-value";
            const count = 100;
            const aggregate = new SnapshotAwareAggregate(aggregateRootId);

            jest.spyOn(aggregate, "toSnapshot").mockImplementation(() => ({
                count,
                value
            }));

            const snapshot = await store.create(aggregate as any);

            expect(snapshot?.payload).toEqual({
                count,
                value
            });
        });

        test("uses snapshot revision from aggregate class metadata", async () => {
            const aggregate = new CustomRevisionAggregate("test-id");

            const snapshot = await store.create(aggregate as any);

            expect(snapshot?.revision).toBe(5);
        });

        test("uses current aggregate version for snapshot", async () => {
            const aggregateRootId = "test-id";
            const aggregateVersion = 25;
            const aggregate = new SnapshotAwareAggregate(aggregateRootId);
            (aggregate as any)._version = aggregateVersion;

            const snapshot = await store.create(aggregate as any);

            expect(snapshot?.aggregateRootVersion).toBe(aggregateVersion);
        });
    });

    describe("shouldCreateSnapshot", () => {
        test("returns false when strategy returns false", () => {
            mockStrategy.shouldCreateSnapshot.mockReturnValue(false);
            const aggregate = new NoNameAggregate("test-id");

            const result = store.shouldCreateSnapshot(aggregate);

            expect(mockStrategy.shouldCreateSnapshot).toHaveBeenCalledTimes(1);
            expect(mockStrategy.shouldCreateSnapshot).toHaveBeenCalledWith(aggregate);
            expect(result).toBe(false);
        });

        test("throws when aggregate root name is missing", () => {
            mockStrategy.shouldCreateSnapshot.mockReturnValue(true);
            const aggregate = new NoNameAggregate("test-id");

            expect(() => store.shouldCreateSnapshot(aggregate)).toThrow(MissingAggregateRootNameException);
        });

        test("throws when aggregate instance is not snapshot aware", () => {
            mockStrategy.shouldCreateSnapshot.mockReturnValue(true);
            const aggregate = new NoSnapshotMethodsAggregate("test-id");

            expect(() => store.shouldCreateSnapshot(aggregate)).toThrow(AggregateInstanceNotSnapshotAwareException);
        });

        test("throws when aggregate class is not snapshot aware", () => {
            mockStrategy.shouldCreateSnapshot.mockReturnValue(true);
            const aggregate = new NoSnapshotRevisionAggregate("test-id");

            expect(() => store.shouldCreateSnapshot(aggregate)).toThrow(AggregateClassNotSnapshotAwareException);
        });

        test("returns true for snapshot-aware aggregate with snapshotRevision", () => {
            mockStrategy.shouldCreateSnapshot.mockReturnValue(true);
            const aggregate = new SnapshotAwareAggregate("test-id");

            const result = store.shouldCreateSnapshot(aggregate);

            expect(result).toBe(true);
        });
    });
});
