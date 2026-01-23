import { createMock } from "@golevelup/ts-jest";

import { AggregateRoot } from "../../aggregate-root/aggregate-root";
import { AggregateRootName } from "../../aggregate-root/aggregate-root-name";
import { SnapshotAware } from "../../aggregate-root/snapshot-aware";
import { SnapshotStrategy } from "../../snapshot-strategy/snapshot-strategy";
import { AbstractSnapshotStore } from "./abstract-snapshot-store";
import { StoredSnapshot } from "./stored-snapshot";

interface TestSnapshot {
    count: number;
    value: string;
}

@AggregateRootName("NoSnapshotMethodsAggregate")
class NoSnapshotMethodsAggregate extends AggregateRoot {
    static snapshotRevision = 1;

    constructor(id: string) {
        super(id);
    }
}

@AggregateRootName("NoSnapshotRevisionAggregate")
class NoSnapshotRevisionAggregate extends AggregateRoot<TestSnapshot> implements SnapshotAware<TestSnapshot> {
    constructor(id: string) {
        super(id);
    }

    override applySnapshot(): void {}

    override toSnapshot(): TestSnapshot {
        return { count: 0, value: "" };
    }
}

@AggregateRootName("RegularAggregate")
class RegularAggregate extends AggregateRoot {
    constructor(id: string) {
        super(id);
    }
}

@AggregateRootName("SnapshotAwareAggregate")
class SnapshotAwareAggregate extends AggregateRoot<TestSnapshot> implements SnapshotAware<TestSnapshot> {
    static snapshotRevision = 1;
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

    override applySnapshot(snapshot: TestSnapshot): void {
        this._value = snapshot.value;
        this._count = snapshot.count;
    }

    setCount(count: number) {
        this._count = count;
    }

    setValue(value: string) {
        this._value = value;
    }

    override toSnapshot(): TestSnapshot {
        return {
            count: this._count,
            value: this._value
        };
    }
}

class TestSnapshotStore extends AbstractSnapshotStore {
    private snapshots: StoredSnapshot[] = [];

    async findLatestSnapshotByAggregateId(id: string): Promise<StoredSnapshot | undefined> {
        return this.snapshots.at(-1);
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

    describe("when snapshot should be created", () => {
        beforeEach(() => {
            mockStrategy.shouldCreateSnapshot.mockResolvedValue(true);
            SnapshotAwareAggregate.snapshotRevision = 1;
        });

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

            jest.spyOn(store, "generateEntityId").mockReturnValue(Promise.resolve(entityId));

            await store.maybeCreate(aggregate);
            const snapshot = await store.findLatestSnapshotByAggregateId(aggregate.id);

            expect(mockStrategy.shouldCreateSnapshot).toHaveBeenCalledWith(aggregate);
            expect(snapshot).toBeDefined();
            expect(snapshot?.id).toBe(entityId);
            expect(snapshot?.aggregateRootId).toBe(aggregateRootId);
            expect(snapshot?.aggregateRootVersion).toBe(aggregateRootVersion);
            expect(snapshot?.revision).toBe(SnapshotAwareAggregate.snapshotRevision);
            expect(snapshot?.payload).toEqual({
                count,
                value
            });
        });

        test("calls generateEntityId to create snapshot id", async () => {
            const aggregateRootId = "test-id";
            const entityId = "generated-snapshot-id";
            const aggregate = new SnapshotAwareAggregate(aggregateRootId);
            const generateIdSpy = jest.spyOn(store, "generateEntityId").mockReturnValue(Promise.resolve(entityId));

            await store.maybeCreate(aggregate);
            const snapshot = await store.findLatestSnapshotByAggregateId(aggregate.id);

            expect(generateIdSpy).toHaveBeenCalledTimes(1);
            expect(snapshot?.id).toEqual(entityId);
        });

        test("calls save with created snapshot", async () => {
            const aggregateRootId = "test-id";
            const aggregate = new SnapshotAwareAggregate(aggregateRootId);
            const saveSpy = jest.spyOn(store, "save");

            await store.maybeCreate(aggregate);

            expect(saveSpy).toHaveBeenCalledTimes(1);
            expect(saveSpy).toHaveBeenCalledWith(expect.any(StoredSnapshot));
        });

        test("handles async .toSnapshot method", async () => {
            const aggregateRootId = "test-id";
            const value = "async-value";
            const count = 100;
            const aggregate = new SnapshotAwareAggregate(aggregateRootId);
            aggregate.setValue(value);

            //@ts-expect-error jest inherits from SnapshotAwareAggregate concrete toSnapshot()
            jest.spyOn(aggregate, "toSnapshot").mockImplementation(async () => {
                return {
                    count,
                    value
                };
            });

            await store.maybeCreate(aggregate);
            const snapshot = await store.findLatestSnapshotByAggregateId(aggregate.id);

            expect(snapshot?.payload).toEqual({
                count,
                value
            });
        });

        test("uses correct snapshot revision from aggregate class", async () => {
            const snapshotRevision = 5;
            const aggregate = new SnapshotAwareAggregate("test-id");
            SnapshotAwareAggregate.snapshotRevision = snapshotRevision;

            await store.maybeCreate(aggregate);
            const snapshot = await store.findLatestSnapshotByAggregateId(aggregate.id);

            expect(snapshot?.revision).toBe(snapshotRevision);
        });

        test("uses current aggregate version for snapshot", async () => {
            const aggregateRootId = "test-id";
            const aggregateVersion = 25;
            const aggregate = new SnapshotAwareAggregate(aggregateRootId);
            (aggregate as any)._version = aggregateVersion;

            await store.maybeCreate(aggregate);
            const snapshot = await store.findLatestSnapshotByAggregateId(aggregate.id);

            expect(snapshot?.aggregateRootVersion).toBe(aggregateVersion);
        });
    });

    describe("when snapshot should not be created", () => {
        test("does not create snapshot when strategy returns false", async () => {
            mockStrategy.shouldCreateSnapshot.mockResolvedValue(false);
            const aggregate = new SnapshotAwareAggregate("test-id");

            await store.maybeCreate(aggregate);

            const snapshot = await store.findLatestSnapshotByAggregateId(aggregate.id);
            const saveSpy = jest.spyOn(store, "save");

            expect(mockStrategy.shouldCreateSnapshot).toHaveBeenCalledWith(aggregate);
            expect(snapshot).toBeUndefined();
            expect(saveSpy).not.toHaveBeenCalled();
        });

        test("does not create snapshot for aggregate without snapshot methods", async () => {
            mockStrategy.shouldCreateSnapshot.mockResolvedValue(true);
            const aggregate = new NoSnapshotMethodsAggregate("test-id");

            await store.maybeCreate(aggregate);

            const snapshot = await store.findLatestSnapshotByAggregateId(aggregate.id);
            const saveSpy = jest.spyOn(store, "save");

            expect(mockStrategy.shouldCreateSnapshot).toHaveBeenCalledWith(aggregate);
            expect(snapshot).toBeUndefined();
            expect(saveSpy).not.toHaveBeenCalled();
        });

        test("does not create snapshot for aggregate class without snapshotRevision", async () => {
            mockStrategy.shouldCreateSnapshot.mockResolvedValue(true);
            const aggregate = new NoSnapshotRevisionAggregate("test-id");

            await store.maybeCreate(aggregate);

            const snapshot = await store.findLatestSnapshotByAggregateId(aggregate.id);
            const saveSpy = jest.spyOn(store, "save");

            expect(mockStrategy.shouldCreateSnapshot).toHaveBeenCalledWith(aggregate);
            expect(snapshot).toBeUndefined();
            expect(saveSpy).not.toHaveBeenCalled();
        });

        test("does not create snapshot for regular aggregate", async () => {
            mockStrategy.shouldCreateSnapshot.mockResolvedValue(true);
            const aggregate = new RegularAggregate("test-id");

            await store.maybeCreate(aggregate);

            const snapshot = await store.findLatestSnapshotByAggregateId(aggregate.id);
            const saveSpy = jest.spyOn(store, "save");

            expect(mockStrategy.shouldCreateSnapshot).toHaveBeenCalledWith(aggregate);
            expect(snapshot).toBeUndefined();
            expect(saveSpy).not.toHaveBeenCalled();
        });
    });
});
